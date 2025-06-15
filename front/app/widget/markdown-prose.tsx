import { Prose } from "~/components/ui/prose";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import hljs from "highlight.js";
import "highlight.js/styles/vs.css";
import {
  Box,
  Center,
  Group,
  Image,
  Input,
  Link,
  Spinner,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { ClipboardIconButton, ClipboardRoot } from "~/components/ui/clipboard";
import { useState, type PropsWithChildren } from "react";
import { Tooltip } from "~/components/ui/tooltip";
import { Button } from "~/components/ui/button";
import { TbArrowRight } from "react-icons/tb";
import { jsonrepair } from "jsonrepair";
const linkifyRegex = require("remark-linkify-regex");

const RichCTA = ({
  title,
  description,
  link,
  ctaButtonLabel,
}: {
  title: string;
  description: string;
  link: string;
  ctaButtonLabel: string;
}) => {
  return (
    <Stack
      border="4px solid"
      borderColor={"brand.outline"}
      p={4}
      rounded={"2xl"}
      w="fit"
      maxW="500px"
      my={8}
    >
      <Text fontWeight={"bold"} m={0}>
        {title}
      </Text>
      <Text m={0}>{description}</Text>
      <Box>
        <Button
          asChild
          textDecoration={"none"}
          color={"brand.black"}
          variant={"subtle"}
        >
          <a href={link} target="_blank">
            {ctaButtonLabel || "Do it"}
            <TbArrowRight />
          </a>
        </Button>
      </Box>
    </Stack>
  );
};

const RichCreateTicket = ({
  title: initialTitle,
  message: initialMessage,
  onTicketCreate,
  loading,
  disabled,
}: {
  title: string;
  message: string;
  onTicketCreate: (email: string, title: string, message: string) => void;
  loading?: boolean;
  disabled?: boolean;
}) => {
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState(initialTitle);
  const [message, setMessage] = useState(initialMessage);

  function handleSubmit() {
    if (!email || !title || !message) {
      alert("Please fill in all fields");
      return;
    }

    onTicketCreate(email, title, message);
  }

  return (
    <Stack
      border="4px solid"
      borderColor={"brand.outline"}
      p={4}
      rounded={"2xl"}
      maxW="400px"
      w="full"
      my={8}
    >
      {!loading && (
        <>
          <Text fontWeight={"bold"} m={0}>
            Create a support ticket
          </Text>
          <Input
            placeholder="Title"
            defaultValue={title}
            onChange={(e) => setTitle(e.target.value)}
            size="xs"
            disabled={disabled}
          />
          <Textarea
            placeholder="Message"
            defaultValue={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            disabled={disabled}
          />
          <Input
            placeholder="Email"
            defaultValue={email}
            onChange={(e) => setEmail(e.target.value)}
            size="xs"
            disabled={disabled}
          />
          <Group justifyContent={"flex-end"}>
            <Button
              variant={"subtle"}
              size="xs"
              loading={loading}
              onClick={handleSubmit}
              disabled={disabled}
            >
              Create <TbArrowRight />
            </Button>
          </Group>
        </>
      )}
      {loading && (
        <Center>
          <Spinner />
        </Center>
      )}
    </Stack>
  );
};

export function MarkdownProse({
  children,
  noMarginCode,
  sources,
  size = "md",
  options,
}: PropsWithChildren<{
  noMarginCode?: boolean;
  sources?: Array<{ title: string; url?: string }>;
  size?: "md" | "lg";
  options?: {
    onTicketCreate?: (
      title: string,
      description: string,
      email: string
    ) => void;
    ticketCreateLoading?: boolean;
    disabled?: boolean;
  };
}>) {
  return (
    <Prose maxW="full" size={size}>
      <Markdown
        remarkPlugins={[remarkGfm, linkifyRegex(/\!\![0-9a-zA-Z]+!!/)]}
        components={{
          code: ({ node, ...props }) => {
            const { children, className, ...rest } = props;

            if (!className) {
              return <code {...rest}>{children}</code>;
            }

            let language = className?.replace("language-", "");

            if (language.startsWith("json|")) {
              try {
                const json = JSON.parse(jsonrepair(children as string));
                if (language === "json|cta") {
                  return <RichCTA {...json} />;
                }
                if (
                  language === "json|create-ticket" &&
                  options?.onTicketCreate
                ) {
                  return (
                    <RichCreateTicket
                      {...json}
                      onTicketCreate={options.onTicketCreate}
                      loading={options.ticketCreateLoading}
                      disabled={options.disabled}
                    />
                  );
                }
              } catch (e) {
                console.log(e);
                return null;
              }
            }

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

            if (
              (children as any).props.className?.startsWith("language-json|")
            ) {
              return <Box my={2}>{children}</Box>;
            }

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
            if (children.startsWith("!!") && !match) {
              return null;
            } else if (!match) {
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
                    bg="brand.emphasized"
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
