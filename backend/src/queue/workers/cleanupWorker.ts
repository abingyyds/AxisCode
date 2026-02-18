import { Job } from 'bullmq';
import path from 'path';
import { cleanupWorktree } from '../../services/workspace.js';

const WORKSPACES_DIR = path.resolve('workspaces');

export async function cleanupWorkerProcessor(job: Job) {
  const { branchName, workspacePath } = job.data;
  const repoDir = path.dirname(workspacePath).replace(/\/wt-.*$/, '');
  const parentDir = path.join(WORKSPACES_DIR, path.basename(repoDir));
  await cleanupWorktree(parentDir, workspacePath, branchName);
}
