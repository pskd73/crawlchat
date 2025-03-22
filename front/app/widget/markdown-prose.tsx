import { Prose } from "~/components/ui/prose";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import hljs from "highlight.js";
import "highlight.js/styles/vs.css";
import { Box, Image, Link, Text } from "@chakra-ui/react";
import { ClipboardIconButton, ClipboardRoot } from "~/components/ui/clipboard";
import type { PropsWithChildren } from "react";
import { Tooltip } from "~/components/ui/tooltip";
const linkifyRegex = require("remark-linkify-regex");

export function MarkdownProse({
  children,
  noMarginCode,
  sources,
}: PropsWithChildren<{
  noMarginCode?: boolean;
  sources?: Array<{ title: string; url?: string }>;
}>) {
  return (
    <Prose maxW="full">
      <Markdown
        remarkPlugins={[remarkGfm, linkifyRegex(/\!\![0-9]!!/)]}
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
              <Box className="group">
                <Box dangerouslySetInnerHTML={{ __html: highlighted }} />
                <Box
                  position={"absolute"}
                  top={1}
                  right={1}
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
          img: ({ node, ...props }) => {
            const { src, alt, ...rest } = props;
            return <Image src={src} alt={alt} boxShadow={"none"} {...rest} />;
          },
          pre: ({ node, ...props }) => {
            const { children, ...rest } = props;
            return (
              <pre
                {...rest}
                style={{
                  margin: noMarginCode ? 0 : undefined,
                  position: "relative",
                }}
              >
                {children}
              </pre>
            );
          },
          a: ({ node, ...props }) => {
            const { children, ...rest } = props;

            const defaultNode = <a {...rest}>{children}</a>;
            if (!sources || typeof children !== "string") {
              return defaultNode;
            }

            const match = children.match(/\!\!([0-9]*)!!/);
            if (!match) {
              return defaultNode;
            }

            const index = parseInt(match[1]);
            const source = sources[index];

            return (
              <Tooltip content={source?.title ?? "Loading..."} showArrow>
                <Text as="span">
                  <Link
                    variant={"plain"}
                    href={source?.url ?? "#"}
                    target="_blank"
                    bg="brand.fg"
                    color="brand.white"
                    fontSize={"10px"}
                    height={"16px"}
                    width={"14px"}
                    rounded={"md"}
                    textDecoration={"none"}
                    display={"inline-flex"}
                    alignItems={"center"}
                    justifyContent={"center"}
                    transform={"translateY(-6px)"}
                  >
                    {index + 1}
                  </Link>
                </Text>
              </Tooltip>
            );
          },
        }}
      >
        {children as string}
      </Markdown>
    </Prose>
  );
}
