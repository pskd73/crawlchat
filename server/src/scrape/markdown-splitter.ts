const size = 7680;

type Heading = {
  level: number;
  text: string;
};

function isTableLine(line: string) {
  if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
    if (line.replace(/[\|\-:\s]/g, "").length === 0) {
      return true;
    }
    return line.includes("|");
  }
  return false;
}

function makeContextLines({
  headings,
  tableLines,
}: {
  headings: Heading[];
  tableLines: {
    header: string;
    separator: string;
  };
}) {
  const contextLines: string[] = [];

  for (const heading of headings) {
    contextLines.push(
      `${Array(heading.level).fill("#").join("")} ${heading.text}`
    );
  }

  if (tableLines.header && tableLines.separator) {
    contextLines.push(tableLines.header);
    contextLines.push(tableLines.separator);
  }

  return contextLines;
}

function getChunkSize(chunk: string[]) {
  return chunk.reduce((acc, line) => acc + line.length, 0) + chunk.length;
}

function plainChunk(line: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < line.length; i += chunkSize) {
    chunks.push(line.slice(i, i + chunkSize));
  }
  return chunks;
}

export async function splitMarkdown(markdown: string) {
  const originalLines: string[] = markdown.split("\n");
  const chunks: string[] = [];
  let currentChunk: string[] = [];

  const lines: string[] = [];
  for (let i = 0; i < originalLines.length; i++) {
    const chunks = plainChunk(originalLines[i], size / 3);
    for (const chunk of chunks) {
      lines.push(chunk);
    }
  }

  let headingsAtSplit: Heading[] | undefined = undefined;
  const headings: Heading[] = [];
  const tableLines = {
    header: "",
    separator: "",
  };

  function getFutureChunk(chunk?: string[]) {
    let chunksToPush = [...currentChunk, ...(chunk ?? [])];
    if (headingsAtSplit) {
      chunksToPush = [
        ...makeContextLines({ headings: headingsAtSplit, tableLines }),
        ...chunksToPush,
      ];
    }

    return chunksToPush;
  }

  function addChunk(size: number) {
    let chunksToPush = getFutureChunk();
    const chunkSize = getChunkSize(chunksToPush);

    if (chunkSize > size) {
      throw new Error(`Size exceeded. ${chunkSize} > ${size}`);
    }

    chunks.push(chunksToPush.join("\n"));
    currentChunk = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("#")) {
      const level = line.match(/^#+/)![0].length;
      const text = line.slice(level);

      const levelDiff = (headings[headings.length - 1]?.level ?? 0) - level;

      for (let j = 0; j < levelDiff + 1; j++) {
        headings.pop();
      }

      headings.push({ level, text });
    }

    if (isTableLine(lines[i])) {
      if (tableLines.header === "") {
        tableLines.header = line;
        tableLines.separator = lines[i + 1];
        i++;
      }
    } else {
      tableLines.header = "";
      tableLines.separator = "";
    }

    // console.log(
    //   getChunkSize(getFutureChunk()),
    //   getChunkSize(getFutureChunk([line])),
    //   line
    // );
    if (getChunkSize(getFutureChunk([line])) > size) {
      addChunk(size);
      headingsAtSplit = [...headings];
    }

    currentChunk.push(line);
  }

  if (currentChunk.length > 0) {
    addChunk(size);
  }

  return chunks;
}
