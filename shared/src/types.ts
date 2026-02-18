export type TaskStatus =
  | 'pending'
  | 'queued'
  | 'agent_running'
  | 'preview_deploying'
  | 'review_pending'
  | 'merging'
  | 'completed'
  | 'failed';

export type AgentType = 'worker' | 'master';
export type CollaboratorRole = 'owner' | 'worker';
export type LogType = 'stdout' | 'stderr' | 'system';

export interface WSMessage {
  type: 'agent_log' | 'task_update' | 'deploy_status';
  taskId: string;
  payload: unknown;
}
