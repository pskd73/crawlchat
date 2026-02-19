import { Agent, handleStream, Message } from "@packages/agentic";
import { z } from "zod";

const extractSchema = z.object({
  relationships: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      relationship: z.string(),
    })
  ),
});

type ExtractSchema = z.infer<typeof extractSchema>;

function getExtractPrompt(existingNodes: string[]) {
  return `Extract memory nodes and edges from the given text. 
Identify key entities, concepts, or ideas as nodes. 
Identify relationships between these nodes as edges.
Extract all meaningful facts, including properties, qualities, roles, classifications, quantities, and negations.
Do not collapse multiple facts into a single weak edge.

CRITICAL: REUSE EXISTING NODES - Do NOT create duplicate nodes!
- If an entity in the text matches an existing node name (case-insensitive), you MUST use the EXACT existing node name
- Only create NEW nodes for entities that do NOT already exist in the existing nodes list
- When reusing an existing node, use its exact name as provided in the existing nodes list
- Check the existing nodes list carefully before creating any new nodes

Existing nodes: ${existingNodes.length > 0 ? existingNodes.map((node) => `"${node}"`).join(", ") : "(none)"}

IMPORTANT: Relationship types must be prominent, single-word or hyphenated relationship verbs, NOT generic phrases.
Relationship types must be lowercase snake_case.

Good relationship types: "owns", "created", "located_in", "works_for", "manages", "contains", "depends_on", "implements", "inherits_from", "causes", "prevents", "requires", "produces", "consumes", "connects_to", "derives_from", "instance_of", "has_trait", "has_property", "has_role", "has_quantity", "not"

BAD relationship types (DO NOT USE): "as a", "belongs to", "is a", "has a", "related to", "associated with", "part of", "member of", "is", "has"

Use specific, action-oriented relationship types that clearly describe the nature of the connection between nodes.
Always prefer canonical types:
- For classification: use "instance_of"
- For adjectives/qualities: use "has_trait" or "has_property"
- For roles: use "has_role"
- For negation statements: use "not"

PRONOUN HANDLING (STRICT):
- Do NOT create nodes for pronouns.
- Pronouns include: "i", "me", "my", "mine", "myself", "you", "your", "yours", "yourself", "he", "him", "his", "himself", "she", "her", "hers", "herself", "it", "its", "itself", "we", "us", "our", "ours", "ourselves", "they", "them", "their", "theirs", "themselves", "this", "that", "these", "those".
- If a pronoun clearly refers to a named entity in context, replace the pronoun with that entity.
- If antecedent is ambiguous or missing, DROP that relationship instead of emitting a pronoun node.
- Never output pronouns in "from" or "to".

Examples:
- "Pramod is a good boy" => [{"from":"Pramod","to":"boy","relationship":"instance_of"},{"from":"Pramod","to":"good","relationship":"has_trait"}]
- "Server is not reachable" => [{"from":"server","to":"reachable","relationship":"not"}]
- "API rate limit is 100 requests/minute" => [{"from":"api_rate_limit","to":"100_requests_per_minute","relationship":"has_quantity"}]
- "Tom entered the room. He sat down." => [{"from":"Tom","to":"room","relationship":"entered"},{"from":"Tom","to":"sat_down","relationship":"did"}]
- "He sat down." => []

Return every distinct fact from the sentence, but avoid duplicates.

If the text is code, use technical relationship types. For example, "implements", "inherits_from", "depends_on", "uses", "requires", "produces", "consumes", "connects_to", "derives_from".`;
}

export async function extract(
  text: string,
  existingNodes: string[],
  contextText?: string
): Promise<{
  nodes: string[];
  relationships: { from: string; to: string; relationship: string }[];
}> {
  const agent = new Agent({
    id: "memory-extract-agent",
    prompt: getExtractPrompt(existingNodes),
    schema: extractSchema,
    model: process.env.MEMORY_EXTRACT_MODEL ?? "openai/gpt-4o-mini",
    baseURL: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    user: "memory-extract",
    maxTokens: 1200,
  });

  const messages: Message[] = [
    {
      role: "user",
      content:
        contextText && contextText.trim().length > 0
          ? `Extract nodes and edges from the following text.\nUse the provided context only to resolve references (especially pronouns). Do not extract unrelated facts from context.\n\nText:\n${text}\n\nContext:\n${contextText}`
          : `Extract nodes and edges from the following text:\n\n${text}`,
    },
  ];
  const result = await handleStream(await agent.stream(messages));
  const content = result.content;
  if (!content) {
    return { nodes: [], relationships: [] };
  }

  const parsed = extractSchema.parse(JSON.parse(content)) as ExtractSchema;
  const relationships = parsed.relationships;

  const nodes: string[] = [
    ...new Set(
      relationships.flatMap((relationship) => [
        relationship.from,
        relationship.to,
      ])
    ),
  ];

  return { nodes, relationships };
}
