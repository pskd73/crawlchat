import { GroupForSource, Source, UpdateItemResponse } from "./interface";
import { GroupData, ItemData } from "./queue";
import { scheduleUrls } from "./schedule";

type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

type DiscussionListItem = {
  number: number;
  url: string;
};

type DiscussionNode = {
  id: string;
  number: number;
  title: string;
  url: string;
  body: string;
  bodyText: string;
  author: {
    login: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  isAnswered: boolean;
  answer: {
    id: string;
    body: string;
    bodyText: string;
    author: {
      login: string;
    } | null;
    createdAt: string;
  } | null;
  comments: {
    nodes: Array<{
      id: string;
      body: string;
      bodyText: string;
      author: {
        login: string;
      } | null;
      createdAt: string;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
  };
};

type RepositoryDiscussionsResponse = {
  repository: {
    discussions: {
      nodes: DiscussionListItem[];
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
      };
    };
  } | null;
};

type RepositoryDiscussionResponse = {
  repository: {
    discussion: DiscussionNode | null;
  } | null;
};

async function graphqlQuery<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.statusText}`);
  }

  const result: GraphQLResponse<T> = await response.json();

  if (result.errors) {
    throw new Error(
      `GraphQL errors: ${result.errors.map((e) => e.message).join(", ")}`
    );
  }

  if (!result.data) {
    throw new Error("No data returned from GraphQL query");
  }

  return result.data;
}

async function getDiscussions(
  owner: string,
  name: string,
  cursor?: string | null,
  answered?: boolean | null
): Promise<{
  discussions: DiscussionListItem[];
  nextCursor: string | null;
}> {
  const query = `
    query GetDiscussions(
      $owner: String!
      $name: String!
      $first: Int!
      $after: String
      $answered: Boolean
      $orderBy: DiscussionOrder
    ) {
      repository(owner: $owner, name: $name) {
        discussions(
          first: $first
          after: $after
          answered: $answered
          orderBy: $orderBy
        ) {
          nodes {
            number
            url
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  `;

  const response = await graphqlQuery<RepositoryDiscussionsResponse>(query, {
    owner,
    name,
    first: 10,
    after: cursor || null,
    answered: answered ?? null,
    orderBy: { field: "UPDATED_AT", direction: "DESC" },
  });

  if (!response.repository) {
    throw new Error(`Repository ${owner}/${name} not found`);
  }

  return {
    discussions: response.repository.discussions.nodes,
    nextCursor: response.repository.discussions.pageInfo.hasNextPage
      ? response.repository.discussions.pageInfo.endCursor
      : null,
  };
}

async function getDiscussion(
  owner: string,
  name: string,
  number: number
): Promise<DiscussionNode | null> {
  const query = `
    query GetDiscussion($owner: String!, $name: String!, $number: Int!) {
      repository(owner: $owner, name: $name) {
        discussion(number: $number) {
          id
          number
          title
          url
          body
          bodyText
          author {
            login
          }
          createdAt
          updatedAt
          isAnswered
          answer {
            id
            body
            bodyText
            author {
              login
            }
            createdAt
          }
          comments(first: 100) {
            nodes {
              id
              body
              bodyText
              author {
                login
              }
              createdAt
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      }
    }
  `;

  const response = await graphqlQuery<RepositoryDiscussionResponse>(query, {
    owner,
    name,
    number,
  });

  return response.repository?.discussion || null;
}

function getDiscussionMarkdown(discussion: DiscussionNode): string {
  const entries: string[] = [];

  const authorName = discussion.author?.login || "Unknown";
  entries.push(`${authorName}: ${discussion.bodyText}`);

  if (discussion.answer) {
    const answerAuthor = discussion.answer.author?.login || "Unknown";
    entries.push(`[ANSWER] ${answerAuthor}: ${discussion.answer.bodyText}`);
  }

  for (const comment of discussion.comments.nodes) {
    const commentAuthor = comment.author?.login || "Unknown";
    entries.push(`${commentAuthor}: ${comment.bodyText}`);
  }

  return entries.join("\n---\n");
}

export class GithubDiscussionsSource implements Source {
  async updateGroup(jobData: GroupData, group: GroupForSource): Promise<void> {
    const match = group.url!.match("https://(www.)?github.com/(.+)/(.+)");
    if (!match) {
      throw new Error("Invalid GitHub URL");
    }

    const [, , owner, name] = match;

    const onlyAnswered = (group as any).onlyAnsweredDiscussions ?? false;

    const { discussions, nextCursor } = await getDiscussions(
      owner,
      name,
      jobData.cursor || null,
      onlyAnswered ? true : null
    );

    await scheduleUrls(
      group,
      jobData.processId,
      discussions.map((discussion) => ({
        url: discussion.url,
        sourcePageId: discussion.number.toString(),
      })),
      nextCursor ?? undefined
    );
  }

  async updateItem(
    jobData: ItemData,
    group: GroupForSource
  ): Promise<UpdateItemResponse> {
    const match = group.url!.match("https://(www.)?github.com/(.+)/(.+)");
    if (!match) {
      throw new Error("Invalid GitHub URL");
    }
    const [, , owner, name] = match;
    const discussionNumber = parseInt(jobData.sourcePageId);

    const discussion = await getDiscussion(owner, name, discussionNumber);

    if (!discussion) {
      throw new Error(`Discussion #${discussionNumber} not found`);
    }

    return {
      page: {
        title: discussion.title || "Untitled",
        text: getDiscussionMarkdown(discussion),
      },
    };
  }
}
