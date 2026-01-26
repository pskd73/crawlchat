import {
  getAllNodes,
  getNodes,
  getAllRelationships,
} from "@packages/graph/graph";
import { multiLinePrompt, SimpleTool } from "./agentic";
import { z } from "zod";

export function makeGraphTools(scrapeId: string) {
  const getAllNodesTool = new SimpleTool({
    id: "graph_get_all_nodes",
    description: multiLinePrompt([
      "Get all nodes from the graph.",
      "Good to use this tool when you are starting off.",
    ]),
    schema: z.object({}),
    execute: async () => {
      console.log("Getting all nodes from the graph...");
      const nodes = await getAllNodes(scrapeId);

      return {
        content: JSON.stringify(nodes),
        customMessage: {},
      };
    },
  });

  const getNodesTool = new SimpleTool({
    id: "graph_get_nodes",
    description: multiLinePrompt([
      "Get nodes from the graph.",
      "It provides the node incoming and outgoing relationships.",
      "Good to use this tool when you want to dive deep into the graph.",
    ]),
    schema: z.object({
      names: z.array(z.string()),
    }),
    execute: async ({ names }: { names: string[] }) => {
      console.log("Getting nodes from the graph...", names);
      const nodes = await getNodes(scrapeId, names);

      return {
        content: JSON.stringify(nodes),
        customMessage: {},
      };
    },
  });

  const getRelationshipsTool = new SimpleTool({
    id: "graph_get_relationships",
    description: multiLinePrompt([
      "Get all the relationships from the graph.",
      "Use this tool when you have the quality, relation or adjectives in the query.",
    ]),
    schema: z.object({}),
    execute: async () => {
      console.log("Getting all relationships from the graph...");
      const relationships = await getAllRelationships(scrapeId);
      return {
        content: JSON.stringify(relationships),
        customMessage: {},
      };
    },
  });

  return [getAllNodesTool, getNodesTool, getRelationshipsTool];
}
