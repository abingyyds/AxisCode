import { taskQueue, cleanupQueue } from './setup.js';

export async function enqueueTask(taskId: string, projectId: string, userId: string) {
  await taskQueue.add('run-agent', { taskId, projectId, userId }, {
    jobId: taskId,
    attempts: 2,
    backoff: { type: 'exponential', delay: 5000 },
  });
}

export async function enqueueCleanup(taskId: string, branchName: string, workspacePath: string) {
  await cleanupQueue.add('cleanup', { taskId, branchName, workspacePath });
}
