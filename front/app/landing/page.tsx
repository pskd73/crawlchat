import {
  Group,
  Stack,
  Text,
  Link as ChakraLink,
  Heading,
  Input,
  Spinner,
  Box,
  SimpleGrid,
  GridItem,
  Highlight,
  Center,
  List,
  Badge,
  Flex,
  Image,
  Icon,
} from "@chakra-ui/react";
import {
  useEffect,
  useMemo,
  useState,
  type ElementType,
  type PropsWithChildren,
} from "react";
import {
  TbArrowRight,
  TbBrandDiscord,
  TbBrandX,
  TbCheck,
  TbCircleCheck,
  TbCode,
  TbCrown,
  TbFileAi,
  TbFileX,
  TbMail,
  TbMessage,
  TbMessage2,
  TbRobotFace,
  TbSettings,
  TbStarFilled,
  TbWorld,
  TbX,
  TbFileInfo,
  TbLink,
  TbChartArea,
  TbPlug,
  TbBrandGithub,
  TbBolt,
  TbCodeCircle,
} from "react-icons/tb";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { useOpenScrape } from "./use-open-scrape";
import { Toaster } from "~/components/ui/toaster";
import { useColorMode } from "~/components/ui/color-mode";
import { prisma } from "~/prisma";
import type { Route } from "./+types/page";
import { Tooltip } from "~/components/ui/tooltip";

const maxW = "1200px";

export function meta() {
  return [
    {
      title: "CrawlChat - Your documentation with AI!",
      description: "AI Chatbot for your knowledge base and documentation",
    },
  ];
}

export function Container({ children }: PropsWithChildren) {
  return (
    <Group maxW={maxW} mx={"auto"} w="full" justifyContent={"space-between"}>
      {children}
    </Group>
  );
}

export function LogoText() {
  return (
    <Group>
      <Image src="/logo.png" alt="CrawlChat" w={8} h={8} />
      <Text
        fontSize={"xl"}
        fontWeight={"bold"}
        bgGradient={"to-r"}
        gradientFrom={"brand.500"}
        gradientTo={"brand.300"}
        bgClip="text"
        color={"transparent"}
        asChild
      >
        <Link to="/">CrawlChat</Link>
      </Text>
    </Group>
  );
}

export function Navbar() {
  return (
    <Stack
      as="nav"
      position={"sticky"}
      top={0}
      bg={"brand.white"}
      zIndex={1}
      borderBottom={"1px solid"}
      borderColor={"brand.outline-subtle"}
      p={4}
      px={8}
    >
      <Container>
        <Group>
          <LogoText />
        </Group>
        <Group gap={6}>
          <ChakraLink href={"/#use-cases"} display={["none", "flex"]}>
            Use cases
          </ChakraLink>
          <ChakraLink href={"/#features"} display={["none", "flex"]}>
            Features
          </ChakraLink>
          <ChakraLink href={"/#pricing"} display={["none", "flex"]}>
            Pricing
          </ChakraLink>
          <Button
            variant={"outline"}
            colorPalette={"brand"}
            size={"lg"}
            asChild
          >
            <Link to={"/login"}>
              Login
              <TbArrowRight />
            </Link>
          </Button>
        </Group>
      </Container>
    </Stack>
  );
}

function TryItOut() {
  const {
    scrapeFetcher,
    scraping,
    stage,
    roomId,
    mpcCmd,
    disable,
    openChat,
    downloadLlmTxt,
    copyMcpCmd,
  } = useOpenScrape();

  return (
    <Stack maxW={"500px"} w="full" gap={4} alignItems={"center"}>
      {stage === "idle" && (
        <scrapeFetcher.Form
          className="w-full"
          method="post"
          action="/open-scrape"
          style={{ width: "100%" }}
        >
          <Group w="full">
            <input type="hidden" name="intent" value="scrape" />
            <input type="hidden" name="roomId" value={roomId} />
            <Input
              name="url"
              placeholder="Enter your website URL"
              size={"2xl"}
              disabled={disable}
              flex={1}
            />
            <Button
              size={"2xl"}
              type="submit"
              loading={disable}
              colorPalette={"brand"}
            >
              Try it
              <TbArrowRight />
            </Button>
          </Group>
        </scrapeFetcher.Form>
      )}

      {stage !== "idle" && stage !== "saved" && (
        <Spinner size={"xl"} color={"brand.fg"} />
      )}
      {stage === "saved" && (
        <Text fontSize={"6xl"} color={"brand.fg"}>
          <TbCircleCheck />
        </Text>
      )}

      <Group justifyContent={"center"}>
        <Text
          fontSize={"sm"}
          opacity={0.5}
          truncate
          maxW={["300px", "500px", "600px"]}
        >
          {scrapeFetcher.data?.error ? (
            <span className="text-red-500">{scrapeFetcher.data?.error}</span>
          ) : stage === "scraping" ? (
            <span>Scraping {scraping?.url ?? "url..."}</span>
          ) : stage === "saved" ? (
            <span>Scraped and ready!</span>
          ) : (
            <span>Fetches 25 pages and makes it LLM ready!</span>
          )}
        </Text>
      </Group>

      <Stack w="full" direction={["column", "row"]}>
        <Box flex={1}>
          <Button
            variant={"subtle"}
            disabled={stage !== "saved"}
            size={"2xl"}
            onClick={openChat}
            w="full"
          >
            <TbMessage />
            Chat
          </Button>
        </Box>
        <Box flex={1}>
          <Button
            w="full"
            variant={"subtle"}
            disabled={stage !== "saved"}
            size={"2xl"}
            onClick={copyMcpCmd}
          >
            <TbRobotFace />
            MCP
          </Button>
        </Box>
      </Stack>
    </Stack>
  );
}

function AnimatedGradient({ children }: PropsWithChildren) {
  const [deg, setDeg] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDeg((deg) => deg + 1);
    }, 10);
    return () => clearInterval(interval);
  }, []);

  return (
    <Text
      as="span"
      className="gradient-text"
      style={{
        background: `linear-gradient(${deg}deg, var(--chakra-colors-brand-200), var(--chakra-colors-brand-300), var(--chakra-colors-brand-400), var(--chakra-colors-brand-500))`,
      }}
      fontWeight={"black"}
    >
      {children}
    </Text>
  );
}

function ChannelIcon({
  icon,
  rotate,
  tooltip,
}: {
  icon: ElementType;
  rotate: string;
  tooltip: string;
}) {
  return (
    <Tooltip content={tooltip} showArrow>
      <Text
        as={"span"}
        display={"inline-flex"}
        w={8}
        h={8}
        border={"1px solid"}
        borderColor="brand.muted"
        rounded={"xl"}
        fontSize={"2xl"}
        justifyContent={"center"}
        alignItems={"center"}
        bgGradient={"to-b"}
        gradientFrom={"brand.muted"}
        gradientTo={"brand.subtle"}
        rotate={rotate}
      >
        <Icon as={icon} fontSize={"18px"} />
      </Text>
    </Tooltip>
  );
}

function Hero() {
  return (
    <Stack w={"full"} px={8} py={12}>
      <Container>
        <Stack alignItems={"center"} w="full" gap={6}>
          <Text
            bg="brand.subtle"
            p={2}
            px={4}
            fontSize={"sm"}
            color={"brand.fg"}
            fontWeight={"medium"}
            rounded={"full"}
          >
            Connect documentation to MCP!
          </Text>

          <Heading
            as="h1"
            fontSize={["5xl", "6xl"]}
            fontWeight={"bolder"}
            lineHeight={1}
            textAlign={"center"}
          >
            Deliver your documentation with{" "}
            <AnimatedGradient>AI</AnimatedGradient>
          </Heading>

          <Text
            as="h2"
            fontSize={["lg", "xl"]}
            textAlign={"center"}
            maxW={"800px"}
            opacity={0.8}
          >
            Add your existing documentation as knowledge base and deliver it
            through multiple channels{" "}
            <ChannelIcon
              icon={TbMessage}
              rotate={"10deg"}
              tooltip="Embed chat widget"
            />{" "}
            <ChannelIcon
              icon={TbBrandDiscord}
              rotate={"-4deg"}
              tooltip="Discord bot"
            />{" "}
            <ChannelIcon
              icon={TbRobotFace}
              rotate={"4deg"}
              tooltip="MCP server"
            />{" "}
            for your community. Get visibility how your community consumes it
            and make your documentation better!
          </Text>

          <TryItOut />
        </Stack>
      </Container>
    </Stack>
  );
}

function LandingHeading({ children }: PropsWithChildren) {
  return (
    <Heading
      as="h2"
      fontSize={"2xl"}
      fontWeight={"bold"}
      textAlign={"center"}
      position={"relative"}
      mb={4}
    >
      {children}
      <Box
        position={"absolute"}
        bottom={-1.5}
        left={"50%"}
        w={6}
        h={1}
        bg="brand.fg"
        rounded={"full"}
        transform={"translateX(-50%)"}
      />
    </Heading>
  );
}

function Demo() {
  return (
    <Stack w={"full"} px={8} py={12}>
      <Container>
        <Box
          rounded={"2xl"}
          overflow={"hidden"}
          w={"full"}
          h={"full"}
          border="1px solid"
          borderColor={"brand.outline"}
        >
          <video
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            poster="/demo-poster.png"
            src="https://slickwid-public.s3.us-east-1.amazonaws.com/CrawlChat-Overview-2.mp4"
            controls
          >
            Your browser does not support the video tag.
          </video>
        </Box>
      </Container>
    </Stack>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: <TbWorld />,
      title: "Scrape",
      description:
        "Input your website URL and let CrawlChat crawl the content. We convert pages to markdown, create embeddings, and store them in a vector database.",
    },
    {
      icon: <TbSettings />,
      title: "Customise",
      description:
        "Once the content is scraped, you can customise how the content is to be used. Set custom rules, custom data, system prompts etc.",
    },
    {
      icon: <TbPlug />,
      title: "Integrate",
      description:
        "Deploy your documentation by integrating the Chat widget on your website, or add a Discord bot to your server, or share it with MCP server.",
    },
  ];
  return (
    <Stack w={"full"} px={8} py={12} bg="brand.gray.50">
      <Container>
        <Stack alignItems={"center"} w="full" gap={6}>
          <LandingHeading>How it works</LandingHeading>
          <SimpleGrid columns={[1, 2, 3]} gap={6} w={"full"}>
            {steps.map((step, i) => (
              <GridItem key={step.title}>
                <Stack
                  key={step.title}
                  gap={2}
                  bgGradient={"to-b"}
                  gradientFrom={"brand.subtle"}
                  gradientTo={"brand.muted"}
                  p={6}
                  px={8}
                  rounded={"2xl"}
                  h="full"
                >
                  <Text fontSize={"5xl"} color="brand.fg">
                    {step.icon}
                  </Text>
                  <Text fontSize={"2xl"} fontWeight={"medium"}>
                    {i + 1}. {step.title}
                  </Text>
                  <Text opacity={0.6}>{step.description}</Text>
                </Stack>
              </GridItem>
            ))}
          </SimpleGrid>
        </Stack>
      </Container>
    </Stack>
  );
}

function UseCases() {
  const useCases = [
    {
      icon: <TbCode />,
      title: "Embed Ask AI",
      titleHighlight: "Ask AI",
      description:
        "It is quite common to have a heavy documentation or content for your service. It quickly gets complicated to create a chat bot that learns from all your content and answers users queries. CrawlChat takes care of it and let's you embed the chatbot with few clicks!",
      points: [
        { text: "Show sources" },
        { text: "Embed or share URLs", highlight: ["Embed", "URLs"] },
        { text: "No hallucinations" },
      ],
      link: "/use-case/embed",
    },
    {
      icon: <TbRobotFace />,
      title: "Data on MCP server",
      titleHighlight: "MCP server",
      description:
        "Model Context Protocol (MCP) has been very well adopted by the LLM systems already. It is a way to connect external systems to the LLMs which are generic in nature and don't know much about your services and content. CrawlChat let's you get MCP server for your content without any extra effort!",
      points: [
        { text: "No extra setup" },
        {
          text: "Perfect for Cursor, Windsurf & Claude",
          highlight: ["Cursor", "Windsurf", "Claude"],
        },
      ],
      link: "/use-case/mcp",
    },
    {
      icon: <TbBrandDiscord />,
      title: "Connect Discord bot",
      titleHighlight: "Discord bot",
      description:
        "Running a community on Discord and want to use AI to answer questions and learn from the conversations? CrawlChat Bot lets you automate query resolutions on your server with ease!",
      points: [
        { text: "Just tag @crawlchat", highlight: ["@crawlchat"] },
        { text: "Answers repeated questions", highlight: ["Answers"] },
        { text: "Learns from the conversations", highlight: ["Learns"] },
      ],
      link: "/use-case/discord-bot",
    },
  ];

  return (
    <Stack w={"full"} px={8} py={12} id="use-cases">
      <Container>
        <Stack alignItems={"center"} w="full" gap={6}>
          <LandingHeading>Use cases</LandingHeading>

          <SimpleGrid columns={[1, 1, 3]} gap={6} w={"full"}>
            {useCases.map((useCase, i) => (
              <GridItem key={i}>
                <Stack
                  bg="brand.gray.50"
                  p={8}
                  rounded={"lg"}
                  borderTop={"6px solid"}
                  borderColor="brand.emphasized"
                  gap={8}
                  shadow={"xs"}
                  _hover={{
                    shadow: "md",
                  }}
                  transition={"all 0.2s ease-in-out"}
                  h="full"
                >
                  <Center
                    w={"60px"}
                    h={"60px"}
                    bgGradient={"to-b"}
                    gradientFrom={"brand.subtle"}
                    gradientTo={"brand.muted"}
                    rounded={"2xl"}
                    mb={4}
                    fontSize={"30px"}
                  >
                    {useCase.icon}
                  </Center>
                  <Heading size={"2xl"} color="brand.fg">
                    <Highlight
                      query={useCase.titleHighlight}
                      styles={{
                        bg: "brand.fg",
                        color: "brand.white",
                        px: 1,
                        fontWeight: "bold",
                      }}
                    >
                      {useCase.title}
                    </Highlight>
                  </Heading>
                  <Text>{useCase.description}</Text>
                  <List.Root gap="2" variant="plain" align="center">
                    {useCase.points.map((point, i) => (
                      <List.Item key={i} alignItems={"flex-start"}>
                        <List.Indicator asChild color="brand.fg">
                          <TbCircleCheck />
                        </List.Indicator>
                        <Text>
                          <Highlight
                            query={point.highlight ?? []}
                            styles={{
                              px: 1,
                              mx: 1,
                              bg: "brand.muted",
                              display: "inline",
                            }}
                          >
                            {point.text}
                          </Highlight>
                        </Text>
                      </List.Item>
                    ))}
                  </List.Root>

                  <Group>
                    <Button
                      colorPalette={"brand"}
                      size={"xl"}
                      variant={"outline"}
                      asChild
                    >
                      <Link to={useCase.link}>
                        Learn more
                        <TbArrowRight />
                      </Link>
                    </Button>
                  </Group>
                </Stack>
              </GridItem>
            ))}
          </SimpleGrid>
        </Stack>
      </Container>
    </Stack>
  );
}

type Feature = {
  label: string;
  excluded?: boolean;
  new?: boolean;
};

function PriceBox({
  price,
  title,
  description,
  features,
  popular,
  href,
  disabled,
  newTab = false,
}: {
  price: number;
  title: string;
  description: string;
  features: Feature[];
  href: string;
  popular?: boolean;
  disabled?: boolean;
  newTab?: boolean;
}) {
  return (
    <Stack
      flex={1}
      p={8}
      bg={popular ? "brand.subtle" : "brand.gray.50"}
      rounded={"2xl"}
      position={"relative"}
      border={"2px solid"}
      borderColor={popular ? "brand.emphasized" : "brand.subtle"}
    >
      {popular && (
        <Group
          position={"absolute"}
          top={0}
          left={"50%"}
          transform={"translate(-50%, -50%)"}
          bg="brand.fg"
          p={1}
          px={3}
          rounded={"full"}
          color="white"
          fontSize={"xs"}
          fontWeight={"bold"}
        >
          <TbCrown />
          <Text>Popular</Text>
        </Group>
      )}

      <Text fontSize={"2xl"} fontWeight={"bold"} lineHeight={1}>
        {title}
      </Text>
      <Text opacity={0.6}>{description}</Text>

      <Group alignItems={"flex-end"} gap={0} my={4}>
        <Text fontSize={"4xl"} fontWeight={"bold"} lineHeight={1}>
          ${price}
        </Text>
        <Text opacity={0.6}>/month</Text>
      </Group>

      <Stack>
        {features.map((feature) => (
          <Group
            key={feature.label}
            alignItems="center"
            gap={2}
            opacity={feature.excluded ? 0.5 : 1}
          >
            <Box color="brand.fg">
              {feature.excluded ? <TbX /> : <TbCheck />}
            </Box>
            <Text>{feature.label}</Text>
            {feature.new && (
              <Badge colorPalette={"black"} variant={"solid"} fontSize={"xs"}>
                <TbStarFilled />
                New
              </Badge>
            )}
          </Group>
        ))}
      </Stack>

      <Button
        w="full"
        mt={4}
        variant={price === 0 ? "outline" : "solid"}
        colorPalette={"brand"}
        asChild
        disabled={disabled}
      >
        <a href={href} target={newTab ? "_blank" : "_self"}>
          {price === 0 ? "Get started" : "Purchase"}
          <TbArrowRight />
        </a>
      </Button>
    </Stack>
  );
}

export function Pricing() {
  return (
    <Stack w={"full"} px={8} py={12} id="pricing">
      <Container>
        <Stack alignItems={"center"} w="full" gap={6}>
          <LandingHeading>Pricing</LandingHeading>
          <Stack w={"full"} gap={6} direction={["column", "row"]}>
            <PriceBox
              price={0}
              title="Free"
              description="For personal use"
              features={[
                { label: "100 page scrapes" },
                { label: "100 message credits" },
                { label: "API not available", excluded: true },
                { label: "MCP not available", excluded: true },
                { label: "Discord bot", excluded: true },
                { label: "Discord drafting", excluded: true },
                { label: "GitHub issues", excluded: true },
              ]}
              href="/login"
            />
            <PriceBox
              price={29}
              title="Starter"
              description="Start your journey with CrawlChat"
              features={[
                { label: "5000 site scrapes/month" },
                { label: "7000 message credits/month" },
                { label: "API available" },
                { label: "MCP available" },
                { label: "Discord bot" },
                { label: "Discord drafting", excluded: true },
                { label: "GitHub issues", excluded: true },
              ]}
              href="https://beestack.lemonsqueezy.com/buy/a13beb2a-f886-4a9a-a337-bd82e745396a"
              newTab
            />
            <PriceBox
              price={79}
              title="Pro"
              description="For power users and teams"
              features={[
                { label: "14,000 site scrapes per month" },
                { label: "20,000 messages per month" },
                { label: "API available" },
                { label: "MCP available" },
                { label: "Discord bot" },
                { label: "Discord drafting", new: true },
                { label: "GitHub issues", new: true },
              ]}
              href="https://beestack.lemonsqueezy.com/buy/3a487266-72de-492d-8884-335c576f89c0"
              newTab
              popular
            />
          </Stack>
        </Stack>
      </Container>
    </Stack>
  );
}

export function CTA() {
  return (
    <Stack w={"full"} px={8} py={12} bg="brand.subtle">
      <Container>
        <Stack alignItems={"center"} w="full" gap={6}>
          <Heading
            as="h2"
            fontSize={"4xl"}
            fontWeight={"bold"}
            textAlign={"center"}
            lineHeight={1.2}
          >
            Ready to make your documentation LLM ready?
          </Heading>
          <Text maxW={"500px"} textAlign={"center"} opacity={0.6}>
            Join users who are already having meaningful conversations with web
            content using CrawlChat.
          </Text>
          <Button colorPalette={"brand"} asChild size={"2xl"} rounded={"full"}>
            <Link to="/login">
              Get started
              <TbArrowRight />
            </Link>
          </Button>
        </Stack>
      </Container>
    </Stack>
  );
}

export function Footer() {
  return (
    <Stack w={"full"} px={8} py={12}>
      <Container>
        <Flex
          w="full"
          alignItems={"flex-start"}
          gap={[10, 10, 2]}
          flexDir={["column", "column", "row"]}
        >
          <Stack flex={2}>
            <LogoText />
            <Text>Deliver your documentation with AI!</Text>
            <Text fontSize={"sm"} opacity={0.5}>
              © 2025 CrawlChat
            </Text>
          </Stack>
          <Stack flex={2}>
            <ChakraLink href={"/blog/how-to-embed-ai-chatbot"}>
              How to add AI Chatbot for your docs
            </ChakraLink>
            <ChakraLink href={"/blog/how-remotion-uses-crawlchat"}>
              Documentation - Use case
            </ChakraLink>
            <ChakraLink href={"/blog/how-to-setup-mcp-for-your-documentation"}>
              Setup MCP server
            </ChakraLink>
            <ChakraLink href={"/blog/how-discord-bot-helps"}>
              How Discord Bot helps?
            </ChakraLink>
          </Stack>
          <Stack flex={1}>
            <ChakraLink href={"/"}>Home</ChakraLink>
            <ChakraLink href={"/#pricing"}>Pricing</ChakraLink>
            <ChakraLink href={"/#use-cases"}>Use cases</ChakraLink>
            <ChakraLink href={"/#features"}>Features</ChakraLink>
            <ChakraLink href={"https://guides.crawlchat.app"}>
              Guides
            </ChakraLink>
            <ChakraLink href={"https://crawlchat.features.vote/roadmap"}>
              Roadmap
            </ChakraLink>
            <ChakraLink href={"/blog"}>Blog</ChakraLink>
          </Stack>
          <Stack flex={1}>
            <ChakraLink href={"/terms"}>Terms</ChakraLink>
            <ChakraLink href={"/policy"}>Privacy policy</ChakraLink>
            <Group gap={4} fontSize={"xl"}>
              <ChakraLink href={"mailto:support@crawlchat.app"}>
                <TbMail />
              </ChakraLink>
              <ChakraLink href={"https://x.com/pramodk73"} target="_blank">
                <TbBrandX />
              </ChakraLink>
            </Group>
          </Stack>
        </Flex>
      </Container>
    </Stack>
  );
}

function MessagesCount({
  title,
  children,
}: PropsWithChildren<{ title: string }>) {
  return (
    <Stack alignItems={"center"} gap={2}>
      <Text fontSize={"7xl"} fontWeight={"bold"} lineHeight={1}>
        {children}
      </Text>
      <Text opacity={0.3} maxW={160} textAlign={"center"}>
        {title}
      </Text>
    </Stack>
  );
}

function UsedBy({
  messagesThisWeek,
  messagesDay,
  messagesMonth,
}: {
  messagesThisWeek: number;
  messagesDay: number;
  messagesMonth: number;
}) {
  const { colorMode } = useColorMode();
  const [updatedAt, setUpdatedAt] = useState(new Date());
  const companies = useMemo(() => {
    return [
      {
        name: "Remotion",
        image:
          colorMode === "dark"
            ? "/used-by/remotion-white.png"
            : "/used-by/remotion.png",
      },
      {
        name: "Konvajs",
        image: "/used-by/konvajs.png",
        text: "Konvajs",
      },
    ];
  }, [colorMode, updatedAt]);

  useEffect(() => {
    setUpdatedAt(new Date());
  }, []);

  return (
    <Stack w={"full"} px={8} py={12} key={updatedAt.getTime()}>
      <Container>
        <Stack alignItems={"center"} w="full" gap={20}>
          <Stack alignItems={"center"} w="full" gap={6}>
            <Text textAlign={"center"}>
              Already being used by awesome companies!
            </Text>
            <Flex gap={10} alignItems={"center"}>
              {companies.map((company) => (
                <Group key={company.image}>
                  <img
                    src={company.image}
                    alt={company.name}
                    style={{
                      maxWidth: "180px",
                      maxHeight: "40px",
                    }}
                  />
                  <Text fontWeight={"medium"}>{company.text}</Text>
                </Group>
              ))}
            </Flex>
          </Stack>

          <Stack>
            <Text textAlign={"center"}>Answering questions continuously</Text>
            <Flex direction={["column", "row"]} gap={20}>
              <MessagesCount title="Today">{messagesDay}</MessagesCount>
              <MessagesCount title="In the last week">
                {messagesThisWeek}
              </MessagesCount>
              <MessagesCount title="In the last month">
                {messagesMonth}
              </MessagesCount>
            </Flex>
          </Stack>
        </Stack>
      </Container>
    </Stack>
  );
}

function FeatureCard({ feature }: { feature: FeatureItem }) {
  return (
    <Stack
      bg="brand.white"
      p={3}
      px={4}
      rounded={"lg"}
      shadow={"sm"}
      outline={"2px solid"}
      outlineColor="brand.muted"
      shadowColor="brand.muted"
      flex={1}
      alignItems={"flex-start"}
      h="fit-content"
      position={"relative"}
    >
      <Text color="brand.fg" fontSize={"3xl"}>
        {feature.icon}
      </Text>
      <Stack gap={2}>
        <Text as="h4">{feature.title}</Text>
        <Text fontSize={"sm"} opacity={0.6}>
          {feature.description}
        </Text>
      </Stack>
      {feature.comingSoon && (
        <Box
          position={"absolute"}
          top={0}
          right={0}
          transform={"translate(14%, -40%)"}
        >
          <Badge variant={"solid"} fontSize={"xs"}>
            Coming!
          </Badge>
        </Box>
      )}
      {feature.new && (
        <Box
          position={"absolute"}
          top={0}
          right={0}
          transform={"translate(14%, -40%)"}
        >
          <Badge colorPalette={"brand"} variant={"solid"} fontSize={"xs"}>
            <TbStarFilled />
            New!
          </Badge>
        </Box>
      )}
    </Stack>
  );
}

type FeatureItem = {
  title: string;
  description: string;
  icon: React.ReactNode;
  comingSoon?: boolean;
  new?: boolean;
};

function Features() {
  const features = useMemo<FeatureItem[]>(
    () => [
      {
        title: "Embed Ask AI",
        icon: <TbCodeCircle />,
        description:
          "You can embed the popular Ask AI widget on your website without any hassle",
      },
      {
        title: "Scrape from any website",
        icon: <TbWorld />,
        description:
          "CrawlChat relies on scraping as a default way to fetch the content. So it supports anything on web by default!",
      },
      {
        title: "MCP server",
        icon: <TbRobotFace />,
        description:
          "Your technical documentation needs to be available through MCP in the AI era and CrawlChat gives that out of the box!",
      },
      {
        title: "Discord bot",
        icon: <TbBrandDiscord />,
        description:
          "Have a community on Discord? CrawlChat Discord Bot is here to answer all the questions for you.",
      },
      {
        title: "APIs to integrate",
        icon: <TbCode />,
        description:
          "Use the APIs to integrate the chat capabilitie into your own app.",
        comingSoon: true,
      },
      {
        title: "Sources of information",
        icon: <TbFileInfo />,
        description:
          "AI hallucinations are irritating and CrawlChat eliminates it by making AI only answer from your own documentation. Thanks to RAG!",
      },
      {
        title: "System prompts",
        icon: <TbMessage2 />,
        description:
          "Get full control over the LLMs by giving system prompts that match your product's style.",
      },
      {
        title: "Upload PDFs",
        icon: <TbFileAi />,
        comingSoon: true,
        description:
          "Also upload PDFs and other documents to your knowledge base.",
      },
      {
        title: "Widget customization",
        icon: <TbSettings />,
        description:
          "Customize the widget that matches your brand. Configure colors and welcome screens.",
      },
      {
        title: "View conversations",
        icon: <TbMessage />,
        description:
          "Get full visibility into the conversations happening on your website so that you can fine tune your documentation.",
      },
      {
        title: "Find data gaps",
        icon: <TbFileX />,
        description:
          "Find out what questions are not performing well using the scores. Use it to fill the gaps in your documentation.",
      },
      {
        title: "Email notifications",
        icon: <TbMail />,
        description:
          "Get notified about the conversations and stats regularly.",
      },
      {
        title: "Shareable links",
        icon: <TbLink />,
        description:
          "Quickly share the chat page links with your customers. Embedding the widget is not the only way to use CrawlChat!",
      },
      {
        title: "Analytics",
        icon: <TbChartArea />,
        description:
          "It's not a chatbot, it also provides you in-deep analytics to understand your customer queries and make your documentation better.",
      },
      {
        title: "Discord drafting",
        icon: <TbBrandDiscord />,
        description:
          "Use CrawlChat to draft answers manually yet taking help from AI!",
        new: true,
      },
      {
        title: "GitHub issues",
        icon: <TbBrandGithub />,
        description:
          "Fetch the Github issues and add them to your knowledge base instantly!",
        new: true,
      },
      {
        title: "Multiple AI models",
        icon: <TbBolt />,
        description:
          "Use different AI models that work better for your knowledge and requirement from 4o-mini, o3-mini, sonnet-3.5 and more.",
        new: true,
      },
    ],
    []
  );
  const [vw, setVw] = useState(1200);
  const grouped = useMemo(() => {
    const n = Math.max(1, Math.floor(vw / 400));
    const groups: FeatureItem[][] = [];
    for (let i = 0; i < n; i++) {
      groups.push([]);
    }

    let nextIndex = 0;
    for (let i = 0; i < features.length; i++) {
      groups[nextIndex].push(features[i]);
      nextIndex = (nextIndex + 1) % n;
    }

    return groups;
  }, [features, vw]);

  useEffect(() => {
    const handleResize = () => {
      setVw(window.innerWidth);
    };

    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <Stack w={"full"} px={8} py={12} bg="brand.gray.50" id="features">
      <Container>
        <Stack alignItems={"center"} w="full" gap={6}>
          <LandingHeading>Features</LandingHeading>
          <Group alignItems={"flex-start"} gap={6} w="full">
            {grouped.map((group, i) => (
              <Stack key={i} flex={1} w="full" gap={6}>
                {group.map((feature) => (
                  <FeatureCard key={feature.title} feature={feature} />
                ))}
              </Stack>
            ))}
          </Group>
        </Stack>
      </Container>
    </Stack>
  );
}

function Testimonials() {
  return (
    <Stack w={"full"} px={8} py={12} bg="brand.gray.50" id="features">
      <Container>
        <Stack alignItems={"center"} w="full" gap={6}>
          <LandingHeading>People love CrawlChat</LandingHeading>
          <Flex flexDir={["column", "row"]} gap={6}>
            <Stack>
              <Box>
                <blockquote className="twitter-tweet">
                  <p lang="en" dir="ltr">
                    MCP, llms.txt and{" "}
                    <a href="https://t.co/wvTaGlv99L">
                      https://t.co/wvTaGlv99L
                    </a>{" "}
                    are now live!
                    <br />
                    <br />
                    Thanks to{" "}
                    <a href="https://twitter.com/pramodk73?ref_src=twsrc%5Etfw">
                      @pramodk73
                    </a>{" "}
                    and{" "}
                    <a href="https://t.co/dv2PDLzt2V">
                      https://t.co/dv2PDLzt2V
                    </a>{" "}
                    for getting us up to speed with AI integrations.{" "}
                    <a href="https://t.co/Sornu9aIFi">
                      https://t.co/Sornu9aIFi
                    </a>
                  </p>
                  &mdash; Jonny Burger (@JNYBGR){" "}
                  <a href="https://twitter.com/JNYBGR/status/1899786274635927674?ref_src=twsrc%5Etfw">
                    March 12, 2025
                  </a>
                </blockquote>
                <script async src="https://platform.twitter.com/widgets.js" />
              </Box>
            </Stack>
            <Stack>
              <Box>
                <blockquote className="twitter-tweet">
                  <p lang="en" dir="ltr">
                    Integrated{" "}
                    <a href="https://t.co/uKP4sKdbjV">
                      https://t.co/uKP4sKdbjV
                    </a>{" "}
                    into the new Konva docs – hats off to{" "}
                    <a href="https://twitter.com/pramodk73?ref_src=twsrc%5Etfw">
                      @pramodk73
                    </a>{" "}
                    for making it insanely useful.
                    <br />
                    <br />
                    It now powers:
                    <br />- &quot;Ask AI&quot; widget on site
                    <br />- MCP server for docs
                    <br />- Discord bot for community
                    <br />
                    <br />
                    Smarter docs. Better support.
                  </p>
                  &mdash; Anton Lavrenov (@lavrton){" "}
                  <a href="https://twitter.com/lavrton/status/1915467775734350149?ref_src=twsrc%5Etfw">
                    April 24, 2025
                  </a>
                </blockquote>{" "}
                <script async src="https://platform.twitter.com/widgets.js" />
              </Box>
            </Stack>
          </Flex>
        </Stack>
      </Container>
    </Stack>
  );
}

const cache = {
  messagesThisWeek: 0,
  messagesDay: 0,
  messagesMonth: 0,
  updatedAt: 0,
};

export async function loader() {
  const MINS_5 = 5 * 60 * 1000;
  const DAY = 24 * 60 * 60 * 1000;
  const WEEK = 7 * DAY;
  const MONTH = 30 * DAY;

  const now = new Date();
  const startOfWeek = new Date(now.getTime() - WEEK);
  const startOfDay = new Date(now.getTime() - DAY);
  const startOfMonth = new Date(now.getTime() - MONTH);

  if (cache.updatedAt < now.getTime() - MINS_5) {
    cache.messagesThisWeek = await prisma.message.count({
      where: {
        createdAt: {
          gte: startOfWeek,
        },
      },
    });

    cache.messagesDay = await prisma.message.count({
      where: {
        createdAt: {
          gte: startOfDay,
        },
      },
    });

    cache.messagesMonth = await prisma.message.count({
      where: {
        createdAt: {
          gte: startOfMonth,
        },
      },
    });
  }

  return {
    messagesThisWeek: cache.messagesThisWeek,
    messagesDay: cache.messagesDay,
    messagesMonth: cache.messagesMonth,
  };
}

export default function LandingPage({ loaderData }: Route.ComponentProps) {
  return (
    <Stack gap={0} w="full">
      <Navbar />
      <Hero />
      <Demo />
      <UsedBy
        messagesThisWeek={loaderData.messagesThisWeek}
        messagesDay={loaderData.messagesDay}
        messagesMonth={loaderData.messagesMonth}
      />
      <HowItWorks />
      <UseCases />
      <Features />
      <Pricing />
      <Testimonials />
      <CTA />
      <Footer />
      <Toaster />
    </Stack>
  );
}
