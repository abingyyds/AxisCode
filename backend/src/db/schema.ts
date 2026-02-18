import { pgTable, text, timestamp, uuid, varchar, boolean, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  githubId: varchar('github_id', { length: 50 }).notNull().unique(),
  username: varchar('username', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  avatarUrl: text('avatar_url'),
  githubToken: text('github_token'),
  anthropicKey: text('anthropic_key'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  githubRepoOwner: varchar('github_repo_owner', { length: 255 }).notNull(),
  githubRepoName: varchar('github_repo_name', { length: 255 }).notNull(),
  githubRepoUrl: text('github_repo_url').notNull(),
  defaultBranch: varchar('default_branch', { length: 100 }).default('main').notNull(),
  railwayProjectId: varchar('railway_project_id', { length: 255 }),
  railwayToken: text('railway_token'),
  railwayEnvironmentId: varchar('railway_environment_id', { length: 255 }),
  anthropicKey: text('anthropic_key'),
  isPublic: boolean('is_public').default(false).notNull(),
  description: text('description'),
  tags: varchar('tags', { length: 500 }),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const collaborators = pgTable('collaborators', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  role: varchar('role', { length: 20 }).notNull().default('worker'),
  invitedAt: timestamp('invited_at').defaultNow().notNull(),
  acceptedAt: timestamp('accepted_at'),
});

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  instruction: text('instruction').notNull(),
  status: varchar('status', { length: 30 }).notNull().default('pending'),
  branchName: varchar('branch_name', { length: 255 }),
  prNumber: varchar('pr_number', { length: 20 }),
  prUrl: text('pr_url'),
  previewUrl: text('preview_url'),
  agentType: varchar('agent_type', { length: 20 }).default('worker'),
  errorMessage: text('error_message'),
  railwayServiceId: varchar('railway_service_id', { length: 255 }),
  workspacePath: text('workspace_path'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const contributions = pgTable('contributions', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  taskId: uuid('task_id').notNull().references(() => tasks.id),
  score: integer('score'),
  summary: text('summary'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const agentLogs = pgTable('agent_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').notNull().references(() => tasks.id),
  content: text('content').notNull(),
  logType: varchar('log_type', { length: 20 }).notNull().default('stdout'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
