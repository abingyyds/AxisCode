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

export async function createService(token: string, projectId: string, name: string, repo: string, branch: string) {
  const data = await railwayGQL(token, `
    mutation($input: ServiceCreateInput!) {
      serviceCreate(input: $input) { id }
    }
  `, { input: { projectId, name, source: { repo, branch } } }) as { serviceCreate: { id: string } };
  return data.serviceCreate.id;
}

export async function deleteService(token: string, serviceId: string) {
  await railwayGQL(token, `
    mutation($id: String!) {
      serviceDelete(id: $id)
    }
  `, { id: serviceId });
}

export async function upsertVariables(token: string, projectId: string, environmentId: string, serviceId: string, variables: Record<string, string>) {
  await railwayGQL(token, `
    mutation($input: VariableCollectionUpsertInput!) {
      variableCollectionUpsert(input: $input)
    }
  `, { input: { projectId, environmentId, serviceId, variables } });
}

export async function createDomain(token: string, serviceId: string, environmentId: string) {
  const data = await railwayGQL(token, `
    mutation($input: ServiceDomainCreateInput!) {
      serviceDomainCreate(input: $input) { domain }
    }
  `, { input: { serviceId, environmentId } }) as { serviceDomainCreate: { domain: string } };
  return data.serviceDomainCreate.domain;
}

export async function getDeploymentStatus(token: string, projectId: string, serviceId: string) {
  const data = await railwayGQL(token, `
    query($input: DeploymentListInput!) {
      deployments(input: $input, first: 1) {
        edges { node { id status } }
      }
    }
  `, { input: { projectId, serviceId } }) as { deployments: { edges: { node: { id: string; status: string } }[] } };
  const node = data.deployments.edges[0]?.node;
  return node || null;
}

export async function getDeploymentLogs(token: string, deploymentId: string, type: 'build' | 'deploy', limit = 100) {
  if (type === 'build') {
    const data = await railwayGQL(token, `
      query($id: String!, $limit: Int) {
        buildLogs(deploymentId: $id, limit: $limit) { message timestamp }
      }
    `, { id: deploymentId, limit }) as { buildLogs: { message: string; timestamp: string }[] };
    return data.buildLogs;
  }
  const data = await railwayGQL(token, `
    query($id: String!, $limit: Int) {
      deploymentLogs(deploymentId: $id, limit: $limit) { message timestamp }
    }
  `, { id: deploymentId, limit }) as { deploymentLogs: { message: string; timestamp: string }[] };
  return data.deploymentLogs;
}

export async function redeployService(token: string, serviceId: string, environmentId: string) {
  await railwayGQL(token, `
    mutation($serviceId: String!, $environmentId: String!) {
      serviceInstanceRedeploy(serviceId: $serviceId, environmentId: $environmentId)
    }
  `, { serviceId, environmentId });
}
