import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { config } from '../config.js';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';

const router = Router();

router.get('/github', (_req: Request, res: Response) => {
  const params = new URLSearchParams({
    client_id: config.github.clientId,
    scope: 'repo user:email',
    redirect_uri: `${config.frontendUrl}/auth/callback`,
  });
  res.json({ url: `https://github.com/login/oauth/authorize?${params}` });
});

router.post('/github/callback', async (req: Request, res: Response) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Missing code' });

  // Exchange code for token
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: config.github.clientId,
      client_secret: config.github.clientSecret,
      code,
    }),
  });
  const tokenData = await tokenRes.json() as { access_token?: string };
  if (!tokenData.access_token) return res.status(400).json({ error: 'OAuth failed' });

  // Get GitHub user
  const ghRes = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const ghUser = await ghRes.json() as {
    id: number; login: string; email: string | null; avatar_url: string;
  };

  // Upsert user
  const existing = await db.select().from(users).where(eq(users.githubId, String(ghUser.id)));
  let userId: string;

  if (existing.length > 0) {
    userId = existing[0].id;
    await db.update(users).set({
      username: ghUser.login,
      avatarUrl: ghUser.avatar_url,
      githubToken: tokenData.access_token,
      updatedAt: new Date(),
    }).where(eq(users.id, userId));
  } else {
    const [newUser] = await db.insert(users).values({
      githubId: String(ghUser.id),
      username: ghUser.login,
      email: ghUser.email,
      avatarUrl: ghUser.avatar_url,
      githubToken: tokenData.access_token,
    }).returning();
    userId = newUser.id;
  }

  const token = jwt.sign({ userId }, config.jwtSecret, { expiresIn: '7d' });
  res.json({ token, user: { id: userId, username: ghUser.login, avatarUrl: ghUser.avatar_url } });
});

export default router;
