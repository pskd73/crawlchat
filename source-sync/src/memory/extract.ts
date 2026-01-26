import { OpenRouter } from "@openrouter/sdk";
import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";

const openRouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

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

export async function extract(
  text: string,
  existingNodes: string[]
): Promise<{
  nodes: string[];
  relationships: { from: string; to: string; relationship: string }[];
}> {
  const response = await openRouter.chat.send({
    model: "openai/gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Extract memory nodes and edges from the given text. 
Identify key entities, concepts, or ideas as nodes. 
Identify relationships between these nodes as edges.

CRITICAL: REUSE EXISTING NODES - Do NOT create duplicate nodes!
- If an entity in the text matches an existing node name (case-insensitive), you MUST use the EXACT existing node name
- Only create NEW nodes for entities that do NOT already exist in the existing nodes list
- When reusing an existing node, use its exact name as provided in the existing nodes list
- Check the existing nodes list carefully before creating any new nodes

Existing nodes: ${existingNodes.length > 0 ? existingNodes.map((node) => `"${node}"`).join(", ") : "(none)"}

IMPORTANT: Relationship types must be prominent, single-word or hyphenated relationship verbs, NOT generic phrases.

Good relationship types: "owns", "created", "located_in", "works_for", "manages", "contains", "depends_on", "implements", "inherits_from", "causes", "prevents", "requires", "produces", "consumes", "connects_to", "derives_from"

BAD relationship types (DO NOT USE): "as a", "belongs to", "is a", "has a", "related to", "associated with", "part of", "member of"

Use specific, action-oriented relationship types that clearly describe the nature of the connection between nodes.
`,
      },
      {
        role: "user",
        content: `Extract nodes and edges from the following text:\n\n${text}`,
      },
    ],
    responseFormat: {
      type: "json_schema",
      jsonSchema: {
        name: "extract",
        description: "Extracted memory nodes and edges",
        schema: zodToJsonSchema(extractSchema as any),
        strict: true,
      },
    },
  });

  const content = response.choices[0]?.message?.content as string;
  if (!content) {
    return { nodes: [], relationships: [] };
  }

  const parsed = JSON.parse(content) as ExtractSchema;
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
