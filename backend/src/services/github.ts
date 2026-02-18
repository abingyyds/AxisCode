import { Octokit } from '@octokit/rest';

export async function createPR(opts: {
  token: string;
  owner: string;
  repo: string;
  head: string;
  base: string;
  title: string;
  body: string;
}) {
  const octokit = new Octokit({ auth: opts.token });
  const { data } = await octokit.pulls.create({
    owner: opts.owner,
    repo: opts.repo,
    head: opts.head,
    base: opts.base,
    title: opts.title,
    body: opts.body,
  });
  return data;
}

export async function mergePR(token: string, owner: string, repo: string, prNumber: number) {
  const octokit = new Octokit({ auth: token });
  await octokit.pulls.merge({ owner, repo, pull_number: prNumber, merge_method: 'squash' });
}

export async function commentOnPR(token: string, owner: string, repo: string, prNumber: number, body: string) {
  const octokit = new Octokit({ auth: token });
  await octokit.issues.createComment({ owner, repo, issue_number: prNumber, body });
}

export async function getPRDiff(token: string, owner: string, repo: string, prNumber: number) {
  const octokit = new Octokit({ auth: token });
  const { data } = await octokit.pulls.get({
    owner, repo, pull_number: prNumber,
    mediaType: { format: 'diff' },
  });
  return data as unknown as string;
}

export async function listRepos(token: string) {
  const octokit = new Octokit({ auth: token });
  const { data } = await octokit.repos.listForAuthenticatedUser({ sort: 'updated', per_page: 50 });
  return data.map(r => ({ owner: r.owner.login, name: r.name, url: r.html_url, defaultBranch: r.default_branch }));
}
