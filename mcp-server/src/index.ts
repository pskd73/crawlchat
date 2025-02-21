import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import commandLineArgs from "command-line-args";

// const HOST = "https://shipshit.club";
const HOST = "http://localhost:3000";

const options = commandLineArgs([
  { name: "id", alias: "i", type: String },
  { name: "name", alias: "n", type: String },
]);

const server = new McpServer({
  name: "crawl-chat",
  version: "1.0.0",
});

server.tool(
  options.name,
  {
    query: z.string({
      description: "The query to search for. Keep it short and concise.",
    }),
  },
  async function ({ query }: { query: string }) {
    const res = await fetch(`${HOST}/mcp/${options.id}?query=${query}`);

    return {
      content: [{ type: "text", text: await res.text() }],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
