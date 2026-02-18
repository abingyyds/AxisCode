import { Router, Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { projects, collaborators, users } from '../db/schema.js';
import { auth, optionalAuth } from '../middleware/auth.js';
import { AuthRequest } from '../types/index.js';
import { listRepos } from '../services/github.js';
import { upsertVariables, getEnvironments, getServices } from '../services/railway.js';

const router = Router();

router.get('/github-repos', auth, async (req: AuthRequest, res: Response) => {
  const [user] = await db.select().from(users).where(eq(users.id, req.userId!));
  if (!user?.githubToken) return res.status(400).json({ error: 'No GitHub token' });
  const repos = await listRepos(user.githubToken);
  res.json(repos);
});

router.get('/', auth, async (req: AuthRequest, res: Response) => {
  const result = await db.select({ project: projects })
    .from(collaborators)
    .innerJoin(projects, eq(collaborators.projectId, projects.id))
    .where(eq(collaborators.userId, req.userId!));
  res.json(result.map(r => r.project));
});

router.post('/', auth, async (req: AuthRequest, res: Response) => {
  const { name, githubRepoOwner, githubRepoName, githubRepoUrl, defaultBranch, isPublic, description, tags } = req.body;
  const [project] = await db.insert(projects).values({
    name,
    githubRepoOwner,
    githubRepoName,
    githubRepoUrl,
    defaultBranch: defaultBranch || 'main',
    ownerId: req.userId!,
    ...(isPublic !== undefined && { isPublic }),
    ...(description && { description }),
    ...(tags && { tags }),
  }).returning();
  await db.insert(collaborators).values({
    projectId: project.id,
    userId: req.userId!,
    role: 'owner',
    acceptedAt: new Date(),
  });
  res.status(201).json(project);
});

router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  const [project] = await db.select().from(projects).where(eq(projects.id, req.params.id as string));
  if (!project) return res.status(404).json({ error: 'Not found' });
  if (!project.isPublic && !req.userId) return res.status(401).json({ error: 'Unauthorized' });
  const [collab] = req.userId
    ? await db.select().from(collaborators)
        .where(and(eq(collaborators.projectId, project.id), eq(collaborators.userId, req.userId)))
    : [undefined];
  if (!project.isPublic && !collab) return res.status(403).json({ error: 'Forbidden' });
  res.json({ ...project, currentUserRole: collab?.role || null });
});

router.patch('/:id', auth, async (req: AuthRequest, res: Response) => {
  const { name, railwayProjectId, isPublic, description, tags } = req.body;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (name) updates.name = name;
  if (railwayProjectId) updates.railwayProjectId = railwayProjectId;
  if (isPublic !== undefined) updates.isPublic = isPublic;
  if (description !== undefined) updates.description = description;
  if (tags !== undefined) updates.tags = tags;
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
  const { railwayProjectId, railwayToken, railwayEnvironmentId, anthropicKey, anthropicBaseUrl, anthropicModel } = req.body;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (railwayProjectId !== undefined) updates.railwayProjectId = railwayProjectId;
  if (railwayToken !== undefined) updates.railwayToken = railwayToken;
  if (railwayEnvironmentId !== undefined) updates.railwayEnvironmentId = railwayEnvironmentId;
  if (anthropicKey !== undefined) updates.anthropicKey = anthropicKey;
  if (anthropicBaseUrl !== undefined) updates.anthropicBaseUrl = anthropicBaseUrl;
  if (anthropicModel !== undefined) updates.anthropicModel = anthropicModel;
  const [project] = await db.update(projects)
    .set(updates)
    .where(and(eq(projects.id, req.params.id as string), eq(projects.ownerId, req.userId!)))
    .returning();
  if (!project) return res.status(404).json({ error: 'Not found' });
  res.json(project);
});

router.post('/:id/env-vars', auth, async (req: AuthRequest, res: Response) => {
  const { variables, taskId } = req.body;
  if (!variables || typeof variables !== 'object') return res.status(400).json({ error: 'Missing variables' });
  const [project] = await db.select().from(projects).where(eq(projects.id, req.params.id as string));
  if (!project?.railwayToken || !project.railwayProjectId || !project.railwayEnvironmentId) {
    return res.status(400).json({ error: 'Railway not configured' });
  }
  const { tasks } = await import('../db/schema.js');
  const [task] = taskId ? await db.select().from(tasks).where(eq(tasks.id, taskId)) : [null];
  const serviceId = task?.railwayServiceId;
  if (taskId && !serviceId) return res.status(400).json({ error: 'Task has no Railway service' });
  await upsertVariables(project.railwayToken, project.railwayProjectId, project.railwayEnvironmentId, serviceId!, variables);
  res.json({ ok: true });
});

router.post('/:id/fetch-models', auth, async (req: AuthRequest, res: Response) => {
  const [project] = await db.select().from(projects).where(eq(projects.id, req.params.id as string));
  const apiKey = project?.anthropicKey;
  const baseUrl = project?.anthropicBaseUrl || 'https://api.anthropic.com';
  if (!apiKey) return res.status(400).json({ error: 'No API key configured' });
  try {
    const r = await fetch(`${baseUrl}/v1/models`, {
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    });
    const data = await r.json() as { data?: { id: string }[] };
    res.json(data.data?.map((m: { id: string }) => m.id) || []);
  } catch {
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

router.post('/:id/railway-environments', auth, async (req: AuthRequest, res: Response) => {
  const [project] = await db.select().from(projects).where(eq(projects.id, req.params.id as string));
  if (!project?.railwayToken || !project.railwayProjectId) return res.status(400).json({ error: 'Railway not configured' });
  try {
    const envs = await getEnvironments(project.railwayToken, project.railwayProjectId);
    res.json(envs);
  } catch { res.status(500).json({ error: 'Failed to fetch environments' }); }
});

router.post('/:id/railway-services', auth, async (req: AuthRequest, res: Response) => {
  const [project] = await db.select().from(projects).where(eq(projects.id, req.params.id as string));
  if (!project?.railwayToken || !project.railwayProjectId) return res.status(400).json({ error: 'Railway not configured' });
  try {
    const svcs = await getServices(project.railwayToken, project.railwayProjectId);
    res.json(svcs);
  } catch { res.status(500).json({ error: 'Failed to fetch services' }); }
});

export default router;
