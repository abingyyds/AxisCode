import { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { tasks, users, projects, contributions } from '../../db/schema.js';
import { ensureRepo, createWorktree, commitAndPush } from '../../services/workspace.js';
import { spawnAgent } from '../../services/agent.js';
import { createPR, getPRDiff } from '../../services/github.js';
import { scoreContribution } from '../../services/scoring.js';
import { createService, createDomain } from '../../services/railway.js';
import { broadcastToProject } from '../../ws/handler.js';

export async function agentWorkerProcessor(job: Job) {
  const { taskId, projectId, userId } = job.data;

  const updateTask = async (data: Record<string, unknown>) => {
    await db.update(tasks).set({ ...data, updatedAt: new Date() }).where(eq(tasks.id, taskId));
    broadcastToProject(projectId, { type: 'task_update', taskId, payload: data });
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
      taskId, userId, projectId, workspacePath: worktreePath,
      instruction: task.instruction,
      anthropicKey: user.anthropicKey || project.anthropicKey || undefined,
    });

    // Commit and push
    const pushed = await commitAndPush(worktreePath, branchName, `axiscode: ${task.instruction.slice(0, 72)}`);
    if (!pushed) throw new Error('No changes were made by the agent');

    // Create Railway service if configured
    if (project.railwayProjectId && project.railwayToken && project.railwayEnvironmentId) {
      try {
        const repo = `${project.githubRepoOwner}/${project.githubRepoName}`;
        const serviceId = await createService(project.railwayToken, project.railwayProjectId, `axi-${taskId.slice(0, 8)}`, repo, branchName);
        const domain = await createDomain(project.railwayToken, serviceId, project.railwayEnvironmentId);
        await updateTask({ railwayServiceId: serviceId, previewUrl: `https://${domain}` });
      } catch { /* Railway failure should not block PR */ }
    }

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

    // Score contribution for public projects
    if (project.isPublic) {
      try {
        const diff = await getPRDiff(user.githubToken!, project.githubRepoOwner, project.githubRepoName, pr.number);
        const apiKey = user.anthropicKey || project.anthropicKey;
        if (apiKey) {
          const { score, summary } = await scoreContribution(diff, apiKey);
          await db.insert(contributions).values({ projectId, userId, taskId, score, summary });
        }
      } catch { /* scoring is best-effort */ }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await updateTask({ status: 'failed', errorMessage: message });
    throw err;
  }
}
