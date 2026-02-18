import { Router, Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { projects, collaborators } from '../db/schema.js';
import { auth } from '../middleware/auth.js';
import { AuthRequest } from '../types/index.js';

const router = Router();

router.get('/', auth, async (req: AuthRequest, res: Response) => {
  const owned = await db.select().from(projects).where(eq(projects.ownerId, req.userId!));
  const collabs = await db.select({ project: projects })
    .from(collaborators)
    .innerJoin(projects, eq(collaborators.projectId, projects.id))
    .where(eq(collaborators.userId, req.userId!));
  res.json([...owned, ...collabs.map(c => c.project)]);
});

router.post('/', auth, async (req: AuthRequest, res: Response) => {
  const { name, githubRepoOwner, githubRepoName, githubRepoUrl, defaultBranch } = req.body;
  const [project] = await db.insert(projects).values({
    name,
    githubRepoOwner,
    githubRepoName,
    githubRepoUrl,
    defaultBranch: defaultBranch || 'main',
    ownerId: req.userId!,
  }).returning();
  res.status(201).json(project);
});

router.get('/:id', auth, async (req: AuthRequest, res: Response) => {
  const [project] = await db.select().from(projects).where(eq(projects.id, req.params.id as string));
  if (!project) return res.status(404).json({ error: 'Not found' });
  res.json(project);
});

router.patch('/:id', auth, async (req: AuthRequest, res: Response) => {
  const { name, railwayProjectId } = req.body;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (name) updates.name = name;
  if (railwayProjectId) updates.railwayProjectId = railwayProjectId;
  const [project] = await db.update(projects).set(updates)
    .where(and(eq(projects.id, req.params.id as string), eq(projects.ownerId, req.userId!)))
    .returning();
  if (!project) return res.status(404).json({ error: 'Not found' });
  res.json(project);
});

router.delete('/:id', auth, async (req: AuthRequest, res: Response) => {
  await db.delete(projects)
    .where(and(eq(projects.id, req.params.id as string), eq(projects.ownerId, req.userId!)));
  res.status(204).end();
});

router.post('/:id/link-railway', auth, async (req: AuthRequest, res: Response) => {
  const { railwayProjectId } = req.body;
  const [project] = await db.update(projects)
    .set({ railwayProjectId, updatedAt: new Date() })
    .where(and(eq(projects.id, req.params.id as string), eq(projects.ownerId, req.userId!)))
    .returning();
  if (!project) return res.status(404).json({ error: 'Not found' });
  res.json(project);
});

export default router;
