import { LinearClient, PaginationOrderBy } from "@linear/sdk";

export { LinearClient };

export async function getLinearIssues(
  client: LinearClient,
  skipStatuses: string[] = []
) {
  const issues = await client.issues({
    filter: {
      state: {
        id: {
          nin: skipStatuses,
        },
      },
    },
    orderBy: PaginationOrderBy.UpdatedAt,
    first: 250,
  });

  return issues.nodes;
}

export async function getLinearProjects(
  client: LinearClient,
  skipStatuses: string[] = []
) {
  const projects = await client.projects({
    filter: {
      status: {
        id: {
          nin: skipStatuses,
        },
      },
    },
    orderBy: PaginationOrderBy.UpdatedAt,
    first: 250,
  });
  return projects.nodes;
}

export async function getLinearIssueStatuses(client: LinearClient) {
  const states = await client.workflowStates();
  return states.nodes;
}

export async function getLinearProjectStatuses(client: LinearClient) {
  const states = await client.projectStatuses();
  return states.nodes;
}
