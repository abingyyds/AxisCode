import { Job } from 'bullmq';
import path from 'path';
import { eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { tasks, projects } from '../../db/schema.js';
import { cleanupWorktree } from '../../services/workspace.js';
import { deleteService } from '../../services/railway.js';

const WORKSPACES_DIR = path.resolve('workspaces');

export async function cleanupWorkerProcessor(job: Job) {
  const { taskId, branchName, workspacePath } = job.data;
  const repoDir = path.dirname(workspacePath).replace(/\/wt-.*$/, '');
  const parentDir = path.join(WORKSPACES_DIR, path.basename(repoDir));
  await cleanupWorktree(parentDir, workspacePath, branchName);

  // Clean up Railway service if exists
  try {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
    if (task?.railwayServiceId) {
      const [project] = await db.select().from(projects).where(eq(projects.id, task.projectId));
      if (project?.railwayToken) {
        await deleteService(project.railwayToken, task.railwayServiceId);
      }
    }
  } catch { /* cleanup failure should not throw */ }
}
