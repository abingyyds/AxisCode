import { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { tasks, users, projects } from '../../db/schema.js';
import { ensureRepo, createWorktree, commitAndPush } from '../../services/workspace.js';
import { spawnAgent } from '../../services/agent.js';
import { createPR } from '../../services/github.js';
import { broadcast } from '../../ws/handler.js';

export async function agentWorkerProcessor(job: Job) {
  const { taskId, projectId, userId } = job.data;

  const updateTask = async (data: Record<string, unknown>) => {
    await db.update(tasks).set({ ...data, updatedAt: new Date() }).where(eq(tasks.id, taskId));
    broadcast(userId, { type: 'task_update', taskId, payload: data });
  };

  try {
    await updateTask({ status: 'agent_running' });

    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!project || !user) throw new Error('Project or user not found');

    // Clone/fetch repo
    const repoDir = await ensureRepo(
      project.githubRepoOwner, project.githubRepoName, user.githubToken!
    );

    // Create worktree branch
    const { worktreePath, branchName } = await createWorktree(repoDir, taskId, project.defaultBranch);
    await updateTask({ branchName, workspacePath: worktreePath });

    // Get task instruction
    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));

    // Run Claude Code CLI
    await spawnAgent({
      taskId, userId, workspacePath: worktreePath,
      instruction: task.instruction,
      anthropicKey: user.anthropicKey || undefined,
    });

    // Commit and push
    const pushed = await commitAndPush(worktreePath, branchName, `axiscode: ${task.instruction.slice(0, 72)}`);
    if (!pushed) throw new Error('No changes were made by the agent');

    // Create PR
    await updateTask({ status: 'preview_deploying' });
    const pr = await createPR({
      token: user.githubToken!,
      owner: project.githubRepoOwner,
      repo: project.githubRepoName,
      head: branchName,
      base: project.defaultBranch,
      title: `[AxiSCode] ${task.instruction.slice(0, 60)}`,
      body: `Automated by AxiSCode\n\nInstruction: ${task.instruction}`,
    });

    await updateTask({ status: 'review_pending', prNumber: String(pr.number), prUrl: pr.html_url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await updateTask({ status: 'failed', errorMessage: message });
    throw err;
  }
}
