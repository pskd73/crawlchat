import { Tool } from "@packages/agentic";
import * as fs from "fs/promises";
import * as path from "path";
import z from "zod";
import { pickle } from "./pickle";

const LsSchema = z.object({
  path: z.string().optional().describe("The path to list"),
});

const ReadSchema = z.object({
  path: z.string().describe("The path to read"),
  startLine: z
    .number()
    .optional()
    .describe("The line number to start reading from"),
  lineCount: z.number().optional().describe("The number of lines to read"),
});

const PatchSchema = z.object({
  path: z.string().describe("The path to patch"),
  targetLine: z.number().describe("1-based line number to replace"),
  content: z.string().describe("New content that fully replaces targetLine"),
});

const CreateSchema = z.object({
  path: z.string().describe("The path to create"),
  content: z.string().describe("The content to create"),
});

const CreateDirectorySchema = z.object({
  path: z.string().describe("The directory path to create"),
});

const RemoveSchema = z.object({
  path: z.string().describe("The file or directory path to remove"),
});

function resolvePath(rootPath: string, relativePath?: string): string {
  if (!relativePath) return rootPath;
  return path.resolve(rootPath, relativePath);
}

export function makeEditorTools(
  rootPath: string,
  onUpdate: (pickle: string) => void
) {
  const lsTool: Tool<typeof LsSchema, {}> = {
    id: "editor-ls",
    description: "List files and directories in the current working directory",
    schema: LsSchema,
    execute: async ({ path }: { path?: string }) => {
      console.log("[lsTool] called with:", path);
      const targetPath = resolvePath(rootPath, path);
      const entries = await fs.readdir(targetPath, { withFileTypes: true });
      const result = entries
        .map((entry) => {
          const suffix = entry.isDirectory() ? "/" : "";
          return `${entry.name}${suffix}`;
        })
        .join("\n");
      onUpdate(await pickle(rootPath, {}));
      return { content: result };
    },
  };

  const readTool: Tool<typeof ReadSchema, {}> = {
    id: "editor-read",
    description: "Read the contents of a file",
    schema: ReadSchema,
    execute: async ({
      path,
      startLine,
      lineCount,
    }: {
      path: string;
      startLine?: number;
      lineCount?: number;
    }) => {
      console.log("[readTool] called with:", path);
      const targetPath = resolvePath(rootPath, path);
      const content = await fs.readFile(targetPath, "utf-8");
      const lines = content.split("\n");
      const startIndex = startLine ? startLine - 1 : 0;
      const endIndex = lineCount ? startIndex + lineCount : lines.length;
      const selected = lines.slice(startIndex, endIndex);
      onUpdate(await pickle(rootPath, {}));
      return { content: selected.join("\n") };
    },
  };

  const patchTool: Tool<typeof PatchSchema, {}> = {
    id: "editor-patch",
    description:
      "Replace exactly one existing line in a file. Pass the line number as targetLine and the text to replace with",
    schema: PatchSchema,
    execute: async ({
      path,
      targetLine,
      content,
    }: {
      path: string;
      targetLine: number;
      content: string;
    }) => {
      console.log("[patchTool] called with:", path);
      const targetPath = resolvePath(rootPath, path);
      const fileContent = await fs.readFile(targetPath, "utf-8");
      const lines = fileContent.split("\n");
      lines[targetLine - 1] = content;
      await fs.writeFile(targetPath, lines.join("\n"));
      onUpdate(await pickle(rootPath, {}));
      return {
        content: `Make sure the file contents is valid. Updated content: ${lines.join("\n")}`,
      };
    },
  };

  const createTool: Tool<typeof CreateSchema, {}> = {
    id: "editor-create",
    description: "Create a new file",
    schema: CreateSchema,
    execute: async ({ path, content }: { path: string; content: string }) => {
      console.log("[createTool] called with:", path);
      const targetPath = resolvePath(rootPath, path);
      await fs.writeFile(targetPath, content);
      onUpdate(await pickle(rootPath, {}));
      return { content: `File ${path} created successfully` };
    },
  };

  const createDirectoryTool: Tool<typeof CreateDirectorySchema, {}> = {
    id: "editor-create-directory",
    description:
      "Create a directory at path (including any missing parent directories)",
    schema: CreateDirectorySchema,
    execute: async ({ path }: { path: string }) => {
      console.log("[createDirectoryTool] called with:", path);
      const targetPath = resolvePath(rootPath, path);
      await fs.mkdir(targetPath, { recursive: true });
      onUpdate(await pickle(rootPath, {}));
      return { content: `Directory ${path} created successfully` };
    },
  };

  const removeTool: Tool<typeof RemoveSchema, {}> = {
    id: "editor-remove",
    description: "Remove a file or directory at path",
    schema: RemoveSchema,
    execute: async ({ path }: { path: string }) => {
      console.log("[removeTool] called with:", path);
      const targetPath = resolvePath(rootPath, path);
      await fs.rm(targetPath, { recursive: true, force: true });
      onUpdate(await pickle(rootPath, {}));
      return { content: `Removed ${path} successfully` };
    },
  };

  return [
    lsTool,
    readTool,
    patchTool,
    createTool,
    createDirectoryTool,
    removeTool,
  ];
}
