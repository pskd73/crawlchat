import { prisma } from "@packages/common/prisma";
import * as fs from "fs/promises";
import * as path from "path";
import { unpickle } from "./pickle";

const EDITOR_DIR = "/tmp/editor";

export async function syncPickle(
  threadId: string,
  pickle: string | null
): Promise<string> {
  const rootPath = `${EDITOR_DIR}/${threadId}`;
  await fs.mkdir(rootPath, { recursive: true });
  if (pickle) {
    const snapshot = unpickle(pickle);
    for (const file of Object.keys(snapshot.files)) {
      const content = snapshot.files[file].content;
      const filePath = path.join(rootPath, file);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content);
    }
  }

  return rootPath;
}

export async function savePickle(threadId: string, pickle: string) {
  await prisma.thread.update({
    where: { id: threadId },
    data: { editorPickle: pickle },
  });
}
