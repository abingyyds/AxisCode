import { Router, Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { collaborators, users, projects } from '../db/schema.js';
import { auth } from '../middleware/auth.js';
import { AuthRequest } from '../types/index.js';
import { broadcast } from '../ws/handler.js';

const router = Router();

router.get('/:projectId', auth, async (req: AuthRequest, res: Response) => {
  const result = await db.select({ collaborator: collaborators, user: users })
    .from(collaborators)
    .innerJoin(users, eq(collaborators.userId, users.id))
    .where(eq(collaborators.projectId, req.params.projectId as string));
  res.json(result.map(r => ({
    ...r.collaborator,
    username: r.user.username,
    avatarUrl: r.user.avatarUrl,
  })));
});

router.post('/:projectId', auth, async (req: AuthRequest, res: Response) => {
  const projectId = req.params.projectId as string;
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.ownerId !== req.userId) return res.status(403).json({ error: 'Only the owner can invite collaborators' });
  const { username, role } = req.body;
  const [user] = await db.select().from(users).where(eq(users.username, username));
  if (!user) return res.status(404).json({ error: 'User not found. They must sign in with GitHub first.' });
  const [existing] = await db.select().from(collaborators)
    .where(and(eq(collaborators.projectId, projectId), eq(collaborators.userId, user.id)));
  if (existing) return res.status(409).json({ error: 'User is already a collaborator' });
  const [collab] = await db.insert(collaborators).values({
    projectId,
    userId: user.id,
    role: role || 'worker',
  }).returning();
  broadcast(user.id, { type: 'invited', payload: { projectId, projectName: project.name } });
  res.status(201).json(collab);
});

router.delete('/:projectId/:userId', auth, async (req: AuthRequest, res: Response) => {
  const projectId = req.params.projectId as string;
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project || project.ownerId !== req.userId) return res.status(403).json({ error: 'Only the owner can remove collaborators' });
  await db.delete(collaborators).where(
    and(eq(collaborators.projectId, projectId), eq(collaborators.userId, req.params.userId as string))
  );
  res.status(204).end();
});

export default router;
