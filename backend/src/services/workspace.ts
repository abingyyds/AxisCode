import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const exec = promisify(execFile);
const WORKSPACES_DIR = path.resolve('workspaces');

async function git(cwd: string, ...args: string[]) {
  const { stdout } = await exec('git', args, { cwd });
  return stdout.trim();
}

export async function ensureRepo(owner: string, repo: string, token: string): Promise<string> {
  const repoDir = path.join(WORKSPACES_DIR, `${owner}--${repo}`);
  await fs.mkdir(WORKSPACES_DIR, { recursive: true });

  const url = `https://x-access-token:${token}@github.com/${owner}/${repo}.git`;

  try {
    await fs.access(repoDir);
    await git(repoDir, 'fetch', '--all');
  } catch {
    await exec('git', ['clone', url, repoDir]);
  }
  return repoDir;
}

export async function createWorktree(repoDir: string, taskId: string, baseBranch: string) {
  const branchName = `axiscode/${taskId}`;
  const worktreePath = path.join(WORKSPACES_DIR, `wt-${taskId}`);

  await git(repoDir, 'worktree', 'add', '-b', branchName, worktreePath, `origin/${baseBranch}`);
  return { worktreePath, branchName };
}

export async function commitAndPush(worktreePath: string, branchName: string, message: string) {
  await git(worktreePath, 'add', '-A');
  try {
    await git(worktreePath, 'commit', '-m', message);
  } catch {
    return false; // nothing to commit
  }
  await git(worktreePath, 'push', 'origin', branchName);
  return true;
}

export async function cleanupWorktree(repoDir: string, worktreePath: string, branchName: string) {
  try { await git(repoDir, 'worktree', 'remove', worktreePath, '--force'); } catch {}
  try { await git(repoDir, 'branch', '-D', branchName); } catch {}
}
