import { spawn, ChildProcess } from 'child_process';
import { broadcast } from '../ws/handler.js';
import { db } from '../db/client.js';
import { agentLogs } from '../db/schema.js';

const runningProcesses = new Map<string, ChildProcess>();

export function spawnAgent(opts: {
  taskId: string;
  userId: string;
  workspacePath: string;
  instruction: string;
  anthropicKey?: string;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const env = { ...process.env, ...(opts.anthropicKey ? { ANTHROPIC_API_KEY: opts.anthropicKey } : {}) };

    const proc = spawn('claude', [
      '--dangerously-skip-permissions',
      '--output-format', 'stream-json',
      '-p', opts.instruction,
    ], { cwd: opts.workspacePath, env });

    runningProcesses.set(opts.taskId, proc);

    const handleOutput = (logType: 'stdout' | 'stderr') => (data: Buffer) => {
      const content = data.toString();
      db.insert(agentLogs).values({ taskId: opts.taskId, content, logType }).catch(() => {});
      broadcast(opts.userId, { type: 'agent_log', taskId: opts.taskId, payload: { content, logType } });
    };

    proc.stdout?.on('data', handleOutput('stdout'));
    proc.stderr?.on('data', handleOutput('stderr'));

    proc.on('close', (code) => {
      runningProcesses.delete(opts.taskId);
      if (code === 0) resolve();
      else reject(new Error(`Agent exited with code ${code}`));
    });

    proc.on('error', (err) => {
      runningProcesses.delete(opts.taskId);
      reject(err);
    });
  });
}

export function cancelAgent(taskId: string) {
  const proc = runningProcesses.get(taskId);
  if (proc) { proc.kill('SIGTERM'); runningProcesses.delete(taskId); }
}
