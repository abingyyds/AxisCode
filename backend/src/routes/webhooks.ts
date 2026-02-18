import { Router, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { tasks, projects, users } from '../db/schema.js';
import { broadcast } from '../ws/handler.js';
import { enqueueCleanup } from '../queue/jobs.js';
import { spawnAgent } from '../services/agent.js';
import { getPRDiff, mergePR, commentOnPR } from '../services/github.js';

const router = Router();

router.post('/github', async (req: Request, res: Response) => {
  const event = req.headers['x-github-event'];
  const payload = req.body;

  if (event === 'pull_request' && payload.action === 'closed' && payload.pull_request?.merged) {
    // PR merged — trigger cleanup
    const prNumber = String(payload.pull_request.number);
    const [task] = await db.select().from(tasks).where(eq(tasks.prNumber, prNumber));
    if (task) {
      await db.update(tasks).set({ status: 'completed', updatedAt: new Date() }).where(eq(tasks.id, task.id));
      broadcast(task.userId, { type: 'task_update', taskId: task.id, payload: { status: 'completed' } });
      if (task.branchName && task.workspacePath) {
        await enqueueCleanup(task.id, task.branchName, task.workspacePath);
      }
    }
  }

  res.json({ ok: true });
});

router.post('/railway', async (req: Request, res: Response) => {
  const { type, deployment } = req.body;

  if (type === 'DEPLOY' && deployment?.meta?.branch) {
    // Find task by branch name and update preview URL
    const branch = deployment.meta.branch as string;
    const [task] = await db.select().from(tasks).where(eq(tasks.branchName, branch));
    if (task && deployment.staticUrl) {
      const previewUrl = `https://${deployment.staticUrl}`;
      await db.update(tasks).set({ previewUrl, updatedAt: new Date() }).where(eq(tasks.id, task.id));
      broadcast(task.userId, { type: 'deploy_status', taskId: task.id, payload: { previewUrl } });

      // Trigger Master Agent review
      await triggerMasterReview(task.id);
    }
  }

  res.json({ ok: true });
});

async function triggerMasterReview(taskId: string) {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
  if (!task || !task.prNumber) return;

  const [project] = await db.select().from(projects).where(eq(projects.id, task.projectId));
  const [user] = await db.select().from(users).where(eq(users.id, task.userId));
  if (!project || !user?.githubToken) return;

  await db.update(tasks).set({ status: 'review_pending', agentType: 'master', updatedAt: new Date() })
    .where(eq(tasks.id, taskId));

  try {
    const diff = await getPRDiff(user.githubToken, project.githubRepoOwner, project.githubRepoName, Number(task.prNumber));
    const instruction = `Review this PR diff for code quality and security issues. Respond with APPROVE if it looks good, or REJECT with specific issues.\n\n${diff}`;

    // Use a temp dir for master agent (read-only review)
    const os = await import('os');
    const tmpDir = os.tmpdir();

    await spawnAgent({
      taskId, userId: task.userId, workspacePath: tmpDir,
      instruction,
      anthropicKey: user.anthropicKey || undefined,
    });

    // Check agent output to decide merge or reject
    const { agentLogs } = await import('../db/schema.js');
    const logs = await db.select().from(agentLogs).where(eq(agentLogs.taskId, taskId));
    const output = logs.map(l => l.content).join('');

    if (output.includes('APPROVE')) {
      await db.update(tasks).set({ status: 'merging', updatedAt: new Date() }).where(eq(tasks.id, taskId));
      await mergePR(user.githubToken, project.githubRepoOwner, project.githubRepoName, Number(task.prNumber));
      await db.update(tasks).set({ status: 'completed', updatedAt: new Date() }).where(eq(tasks.id, taskId));
      broadcast(task.userId, { type: 'task_update', taskId, payload: { status: 'completed' } });
    } else {
      await commentOnPR(user.githubToken, project.githubRepoOwner, project.githubRepoName, Number(task.prNumber), `Master Agent Review:\n${output}`);
      await db.update(tasks).set({ status: 'failed', errorMessage: 'Review rejected', updatedAt: new Date() })
        .where(eq(tasks.id, taskId));
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Review failed';
    await db.update(tasks).set({ status: 'failed', errorMessage: msg, updatedAt: new Date() })
      .where(eq(tasks.id, taskId));
  }
}

export default router;
