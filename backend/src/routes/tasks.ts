import { Router, Response } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/client.js';
import { tasks, agentLogs } from '../db/schema.js';
import { auth } from '../middleware/auth.js';
import { AuthRequest } from '../types/index.js';
import { enqueueTask } from '../queue/jobs.js';
import { cancelAgent } from '../services/agent.js';

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
  const [task] = await db.insert(tasks).values({
    projectId,
    userId: req.userId!,
    instruction,
    status: 'pending',
  }).returning();
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

export default router;
