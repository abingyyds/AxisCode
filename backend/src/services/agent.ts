import { spawn, ChildProcess } from 'child_process';
import { broadcastToProject } from '../ws/handler.js';
import { db } from '../db/client.js';
import { agentLogs } from '../db/schema.js';

const runningProcesses = new Map<string, ChildProcess>();

export function spawnAgent(opts: {
  taskId: string;
  userId: string;
  projectId: string;
  workspacePath: string;
  instruction: string;
  anthropicKey?: string;
  anthropicBaseUrl?: string;
  anthropicModel?: string;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const env: Record<string, string | undefined> = { ...process.env };
    if (opts.anthropicKey) env.ANTHROPIC_API_KEY = opts.anthropicKey;
    if (opts.anthropicBaseUrl) env.ANTHROPIC_BASE_URL = opts.anthropicBaseUrl;

    const args = ['--dangerously-skip-permissions', '--output-format', 'stream-json'];
    if (opts.anthropicModel) args.push('--model', opts.anthropicModel);
    args.push('-p', opts.instruction);

    const log = (content: string, logType = 'system') => {
      db.insert(agentLogs).values({ taskId: opts.taskId, content, logType }).catch(() => {});
      broadcastToProject(opts.projectId, { type: 'agent_log', taskId: opts.taskId, payload: { content, logType } });
    };

    log(`Spawning agent in ${opts.workspacePath}... (key: ${opts.anthropicKey ? 'yes' : 'NO'})`);

    const proc = spawn('claude', args, { cwd: opts.workspacePath, env, stdio: ['ignore', 'pipe', 'pipe'] });

    runningProcesses.set(opts.taskId, proc);

    const timeout = setTimeout(() => {
      log('Agent timed out after 10 minutes');
      proc.kill('SIGTERM');
    }, 10 * 60 * 1000);

    const handleOutput = (logType: 'stdout' | 'stderr') => (data: Buffer) => {
      const content = data.toString();
      db.insert(agentLogs).values({ taskId: opts.taskId, content, logType }).catch(() => {});
      broadcastToProject(opts.projectId, { type: 'agent_log', taskId: opts.taskId, payload: { content, logType } });
    };

    proc.stdout?.on('data', handleOutput('stdout'));
    proc.stderr?.on('data', handleOutput('stderr'));

    proc.on('close', (code) => {
      clearTimeout(timeout);
      runningProcesses.delete(opts.taskId);
      log(`Agent exited with code ${code}`);
      if (code === 0) resolve();
      else reject(new Error(`Agent exited with code ${code}`));
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      runningProcesses.delete(opts.taskId);
      log(`Agent spawn error: ${err.message}`);
      reject(err);
    });
  });
}

export function cancelAgent(taskId: string) {
  const proc = runningProcesses.get(taskId);
  if (proc) { proc.kill('SIGTERM'); runningProcesses.delete(taskId); }
}
