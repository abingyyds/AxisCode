const RAILWAY_API = 'https://backboard.railway.com/graphql/v2';

async function railwayGQL(token: string, query: string, variables = {}) {
  const res = await fetch(RAILWAY_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json() as { data: unknown; errors?: unknown[] };
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

export async function getDeployments(token: string, projectId: string) {
  const data = await railwayGQL(token, `
    query($projectId: String!) {
      deployments(input: { projectId: $projectId }) {
        edges { node { id status staticUrl } }
      }
    }
  `, { projectId }) as { deployments: { edges: { node: { id: string; status: string; staticUrl: string } }[] } };
  return data.deployments.edges.map(e => e.node);
}

export async function getPreviewUrl(token: string, projectId: string, branch: string) {
  const deployments = await getDeployments(token, projectId);
  // Railway auto-deploys branches; find the matching preview
  return deployments.find(d => d.staticUrl?.includes(branch.replace('/', '-')))?.staticUrl || null;
}
