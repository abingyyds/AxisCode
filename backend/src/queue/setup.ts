import { Queue, Worker, Processor } from 'bullmq';
import { config } from '../config.js';

const connection = { url: config.redisUrl };

export const taskQueue = new Queue('tasks', { connection });
export const cleanupQueue = new Queue('cleanup', { connection });

export function createWorker(name: string, processor: Processor) {
  return new Worker(name, processor, { connection, concurrency: 2 });
}
