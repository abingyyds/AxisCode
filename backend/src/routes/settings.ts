import { Router, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { auth } from '../middleware/auth.js';
import { AuthRequest } from '../types/index.js';

const router = Router();

router.get('/', auth, async (req: AuthRequest, res: Response) => {
  const [user] = await db.select().from(users).where(eq(users.id, req.userId!));
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json({
    hasAnthropicKey: !!user.anthropicKey,
    hasRailwayToken: !!user.railwayToken,
  });
});

router.patch('/', auth, async (req: AuthRequest, res: Response) => {
  const { anthropicKey, railwayToken } = req.body;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (anthropicKey !== undefined) updates.anthropicKey = anthropicKey || null;
  if (railwayToken !== undefined) updates.railwayToken = railwayToken || null;
  await db.update(users).set(updates).where(eq(users.id, req.userId!));
  res.json({ success: true });
});

export default router;
