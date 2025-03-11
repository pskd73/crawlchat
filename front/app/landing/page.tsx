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
} from "@chakra-ui/react";
import type { PropsWithChildren } from "react";
import {
  TbArrowRight,
  TbBrandDiscord,
  TbCheck,
  TbCircleCheck,
  TbCode,
  TbCrown,
  TbMarkdown,
  TbMessage,
  TbRobotFace,
  TbSettings,
  TbStarFilled,
  TbWorld,
  TbX,
} from "react-icons/tb";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { useOpenScrape } from "./use-open-scrape";
import { Toaster } from "~/components/ui/toaster";
import { useColorMode } from "~/components/ui/color-mode";

const maxW = "1200px";

export function meta() {
  return [
    {
      title: "CrawlChat - Make your content LLM ready!",
      description: "Chat with Any Website using AI",
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
            w={"full"}
            variant={"subtle"}
            disabled={stage !== "saved"}
            size={"2xl"}
            onClick={downloadLlmTxt}
          >
            <TbMarkdown />
            LLM.txt
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
            Connect documentations to MCP!
          </Text>

          <Heading
            as="h1"
            fontSize={"6xl"}
            fontWeight={"bolder"}
            lineHeight={1}
            textAlign={"center"}
          >
            Make your content LLM ready!
          </Heading>

          <Text
            as="h2"
            fontSize={"xl"}
            textAlign={"center"}
            maxW={"600px"}
            opacity={0.6}
          >
            Give URL and it will scrape all the content and turns them
            embeddings for RAG. You can share chat links or embed it on your
            website. Or use API to query the content.
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
        <Box rounded={"2xl"} overflow={"hidden"} w={"full"} h={"full"}>
          <video
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            poster="/demo-poster.png"
            src="https://slickwid-public.s3.us-east-1.amazonaws.com/CrawlChat+Demo.mp4"
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
      icon: <TbMessage />,
      title: "Chat & APIs",
      description:
        "There are multiple ways you use the data for AI. Easiest is to just embed the chat widget on your website. API's to query and MCP servers are also available!",
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
                { label: "100 page scrapes per month" },
                { label: "200 messages per month" },
                { label: "API not available", excluded: true },
                { label: "MCP not available", excluded: true },
                { label: "Discord bot", excluded: true },
              ]}
              href="/login"
            />
            <PriceBox
              price={29}
              title="Starter"
              description="Start your journey with CrawlChat"
              features={[
                { label: "3000 site scrapes per month" },
                { label: "15,000 messages per month" },
                { label: "API available" },
                { label: "MCP available" },
                { label: "Discord bot", new: true },
              ]}
              popular
              href="https://beestack.lemonsqueezy.com/buy/a13beb2a-f886-4a9a-a337-bd82e745396a"
              newTab
            />
            <PriceBox
              price={79}
              title="Pro"
              description="For power users and teams"
              features={[
                { label: "10,000 site scrapes per month" },
                { label: "50,000 messages per month" },
                { label: "API available" },
                { label: "MCP available" },
                { label: "Discord bot", new: true },
              ]}
              href="https://beestack.lemonsqueezy.com/buy/3a487266-72de-492d-8884-335c576f89c0"
              newTab
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
            Ready to make your content LLM ready?
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
        <Group w="full" alignItems={"flex-start"}>
          <Stack flex={2}>
            <LogoText />
            <Text>Turn your content LLM ready!</Text>
            <Text fontSize={"sm"} opacity={0.5}>
              © 2025 CrawlChat
            </Text>
          </Stack>
          <Stack flex={1}>
            <ChakraLink href={"/"}>Home</ChakraLink>
            <ChakraLink href={"/#pricing"}>Pricing</ChakraLink>
            <ChakraLink href={"/#use-cases"}>Use cases</ChakraLink>
            <ChakraLink href={"/llm-txt"}>LLM.txt Generator</ChakraLink>
            <ChakraLink href={"/embed-demo"}>Demo embed</ChakraLink>
          </Stack>
          <Stack flex={1}>
            <ChakraLink href={"/terms"}>Terms</ChakraLink>
            <ChakraLink href={"/policy"}>Privacy policy</ChakraLink>
          </Stack>
        </Group>
      </Container>
    </Stack>
  );
}

function UsedBy() {
  const { colorMode } = useColorMode();
  const companies = [
    {
      name: "Remotion",
      image:
        colorMode === "dark"
          ? "/used-by/remotion-white.png"
          : "/used-by/remotion.png",
    },
  ];

  return (
    <Stack w={"full"} px={8} py={12}>
      <Container>
        <Stack alignItems={"center"} w="full" gap={6}>
          <Text textAlign={"center"}>
            Already being used by awesome companies!
          </Text>
          <Flex gap={4}>
            {companies.map((company) => (
              <Image
                key={company.name}
                src={company.image}
                alt={company.name}
                maxW={"180px"}
                maxH={"90px"}
              />
            ))}
          </Flex>
        </Stack>
      </Container>
    </Stack>
  );
}

export default function LandingPage() {
  return (
    <Stack gap={0} w="full">
      <Navbar />
      <Hero />
      <Demo />
      <UsedBy />
      <HowItWorks />
      <UseCases />
      <Pricing />
      <CTA />
      <Footer />
      <Toaster />
    </Stack>
  );
}
