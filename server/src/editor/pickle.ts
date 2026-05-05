import * as fs from "fs/promises";
import { join, relative, sep } from "path";

export type SnapshotFiles = {
  [path: string]: {
    content: string;
  };
};

export type EditorSnapshot = {
  files: SnapshotFiles;
};

export async function pickle(
  path: string,
  files: SnapshotFiles
): Promise<string> {
  const basePath = path;
  async function walk(currentPath: string): Promise<void> {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = join(currentPath, entry.name);
      if (entry.isDirectory()) {
        await walk(entryPath);
      } else {
        const key = relative(basePath, entryPath).split(sep).join("/");
        files[key] = { content: await fs.readFile(entryPath, "utf-8") };
      }
    }
  }

  await walk(path);

  return Buffer.from(JSON.stringify({ files })).toString("base64");
}

export function unpickle(pickle: string): EditorSnapshot {
  return JSON.parse(Buffer.from(pickle, "base64").toString("utf-8"));
}
