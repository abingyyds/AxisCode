import { Router, Request, Response } from 'express';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { projects, collaborators, users, contributions } from '../db/schema.js';
import { auth } from '../middleware/auth.js';
import { AuthRequest } from '../types/index.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const result = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      tags: projects.tags,
      githubRepoOwner: projects.githubRepoOwner,
      githubRepoName: projects.githubRepoName,
      ownerId: projects.ownerId,
      createdAt: projects.createdAt,
    })
    .from(projects)
    .where(eq(projects.isPublic, true));

  const enriched = await Promise.all(
    result.map(async (p) => {
      const [owner] = await db.select({ username: users.username, avatarUrl: users.avatarUrl })
        .from(users).where(eq(users.id, p.ownerId));
      const [{ count }] = await db.select({ count: sql<number>`count(*)::int` })
        .from(collaborators).where(eq(collaborators.projectId, p.id));
      return { ...p, ownerUsername: owner?.username, ownerAvatar: owner?.avatarUrl, collaboratorCount: count };
    })
  );

  res.json(enriched);
});

router.post('/:id/join', auth, async (req: AuthRequest, res: Response) => {
  const projectId = req.params.id as string;
  const [project] = await db.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.isPublic, true)));
  if (!project) return res.status(404).json({ error: 'Public project not found' });

  const [existing] = await db.select().from(collaborators)
    .where(and(eq(collaborators.projectId, projectId), eq(collaborators.userId, req.userId!)));
  if (existing) return res.status(400).json({ error: 'Already a collaborator' });

  const [collab] = await db.insert(collaborators).values({
    projectId,
    userId: req.userId!,
    role: 'worker',
    acceptedAt: new Date(),
  }).returning();
  res.status(201).json(collab);
});

router.get('/:id/contributions', async (req: Request, res: Response) => {
  const projectId = req.params.id as string;
  const result = await db
    .select({
      id: contributions.id,
      userId: contributions.userId,
      taskId: contributions.taskId,
      score: contributions.score,
      summary: contributions.summary,
      createdAt: contributions.createdAt,
      username: users.username,
      avatarUrl: users.avatarUrl,
    })
    .from(contributions)
    .innerJoin(users, eq(contributions.userId, users.id))
    .where(eq(contributions.projectId, projectId));
  res.json(result);
});

export default router;
