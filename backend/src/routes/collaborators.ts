import { Router, Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { collaborators, users } from '../db/schema.js';
import { auth } from '../middleware/auth.js';
import { AuthRequest } from '../types/index.js';

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
  const { username, role } = req.body;
  const [user] = await db.select().from(users).where(eq(users.username, username));
  if (!user) return res.status(404).json({ error: 'User not found' });
  const [collab] = await db.insert(collaborators).values({
    projectId: req.params.projectId as string,
    userId: user.id,
    role: role || 'worker',
  }).returning();
  res.status(201).json(collab);
});

router.delete('/:projectId/:userId', auth, async (req: AuthRequest, res: Response) => {
  await db.delete(collaborators).where(
    and(eq(collaborators.projectId, req.params.projectId as string), eq(collaborators.userId, req.params.userId as string))
  );
  res.status(204).end();
});

export default router;
