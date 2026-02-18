import { Router, Response } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/client.js';
import { tasks, agentLogs, collaborators } from '../db/schema.js';
import { auth } from '../middleware/auth.js';
import { AuthRequest } from '../types/index.js';
import { enqueueTask } from '../queue/jobs.js';
import { cancelAgent } from '../services/agent.js';
import { broadcastToProject } from '../ws/handler.js';
import { getDeploymentStatus, getDeploymentLogs, redeployService } from '../services/railway.js';
import { projects } from '../db/schema.js';

const router = Router();

router.get('/project/:projectId', auth, async (req: AuthRequest, res: Response) => {
  const result = await db.select().from(tasks)
    .where(eq(tasks.projectId, req.params.projectId as string))
    .orderBy(desc(tasks.createdAt));
  res.json(result);
});

router.post('/project/:projectId', auth, async (req: AuthRequest, res: Response) => {
  const { instruction } = req.body;
  if (!instruction) return res.status(400).json({ error: 'Missing instruction' });
  const projectId = req.params.projectId as string;
  const [collab] = await db.select().from(collaborators)
    .where(and(eq(collaborators.projectId, projectId), eq(collaborators.userId, req.userId!)));
  if (!collab) return res.status(403).json({ error: 'Not a collaborator on this project' });
  const [task] = await db.insert(tasks).values({
    projectId,
    userId: req.userId!,
    instruction,
    status: 'pending',
  }).returning();
  broadcastToProject(projectId, { type: 'task_created', payload: task });
  await enqueueTask(task.id, projectId, req.userId!);
  res.status(201).json(task);
});

router.get('/:id', auth, async (req: AuthRequest, res: Response) => {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, req.params.id as string));
  if (!task) return res.status(404).json({ error: 'Not found' });
  res.json(task);
});

router.get('/:id/logs', auth, async (req: AuthRequest, res: Response) => {
  const logs = await db.select().from(agentLogs)
    .where(eq(agentLogs.taskId, req.params.id as string))
    .orderBy(agentLogs.createdAt);
  res.json(logs);
});

router.post('/:id/retry', auth, async (req: AuthRequest, res: Response) => {
  const [task] = await db.update(tasks)
    .set({ status: 'pending', errorMessage: null, updatedAt: new Date() })
    .where(eq(tasks.id, req.params.id as string))
    .returning();
  if (!task) return res.status(404).json({ error: 'Not found' });
  await enqueueTask(task.id, task.projectId, req.userId!);
  res.json(task);
});

router.post('/:id/cancel', auth, async (req: AuthRequest, res: Response) => {
  cancelAgent(req.params.id as string);
  const [task] = await db.update(tasks)
    .set({ status: 'failed', errorMessage: 'Cancelled by user', updatedAt: new Date() })
    .where(eq(tasks.id, req.params.id as string))
    .returning();
  if (!task) return res.status(404).json({ error: 'Not found' });
  res.json(task);
});

router.get('/:id/deploy-status', auth, async (req: AuthRequest, res: Response) => {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, req.params.id as string));
  if (!task?.railwayServiceId) return res.status(404).json({ error: 'No Railway service' });
  const [project] = await db.select().from(projects).where(eq(projects.id, task.projectId));
  if (!project?.railwayToken || !project.railwayProjectId) return res.status(400).json({ error: 'Railway not configured' });
  const status = await getDeploymentStatus(project.railwayToken, project.railwayProjectId, task.railwayServiceId);
  res.json(status);
});

router.get('/:id/deploy-logs', auth, async (req: AuthRequest, res: Response) => {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, req.params.id as string));
  if (!task?.railwayServiceId) return res.status(404).json({ error: 'No Railway service' });
  const [project] = await db.select().from(projects).where(eq(projects.id, task.projectId));
  if (!project?.railwayToken || !project.railwayProjectId) return res.status(400).json({ error: 'Railway not configured' });
  const deployment = await getDeploymentStatus(project.railwayToken, project.railwayProjectId, task.railwayServiceId);
  if (!deployment) return res.json([]);
  const type = req.query.type === 'build' ? 'build' : 'deploy' as const;
  const logs = await getDeploymentLogs(project.railwayToken, deployment.id, type);
  res.json(logs);
});

router.post('/:id/redeploy', auth, async (req: AuthRequest, res: Response) => {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, req.params.id as string));
  if (!task?.railwayServiceId) return res.status(404).json({ error: 'No Railway service' });
  const [project] = await db.select().from(projects).where(eq(projects.id, task.projectId));
  if (!project?.railwayToken || !project.railwayEnvironmentId) return res.status(400).json({ error: 'Railway not configured' });
  await redeployService(project.railwayToken, task.railwayServiceId, project.railwayEnvironmentId);
  res.json({ ok: true });
});

export default router;
