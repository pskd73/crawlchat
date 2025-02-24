import { Prose } from "~/components/ui/prose";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import hljs from "highlight.js";
import "highlight.js/styles/vs.css";
import { Box } from "@chakra-ui/react";
import { ClipboardIconButton, ClipboardRoot } from "~/components/ui/clipboard";
import type { PropsWithChildren } from "react";

export function MarkdownProse({ children }: PropsWithChildren) {
  return (
    <Prose maxW="full">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          code: ({ node, ...props }) => {
            const { children, className, ...rest } = props;

            if (!className) {
              return <code {...rest}>{children}</code>;
            }

            let language = className?.replace("language-", "");
            if (!hljs.listLanguages().includes(language)) {
              language = "bash";
            }
            const code = children as string;

            const highlighted = hljs.highlight(code ?? "", {
              language: language ?? "javascript",
            }).value;

            return (
              <Box position={"relative"} className="group">
                <Box dangerouslySetInnerHTML={{ __html: highlighted }} />
                <Box
                  position={"absolute"}
                  top={0}
                  right={0}
                  opacity={0}
                  _groupHover={{ opacity: 1 }}
                  transition={"opacity 100ms ease-in-out"}
                >
                  <ClipboardRoot value={code}>
                    <ClipboardIconButton />
                  </ClipboardRoot>
                </Box>
              </Box>
            );
          },
        }}
      >
        {children as string}
      </Markdown>
    </Prose>
  );
}
