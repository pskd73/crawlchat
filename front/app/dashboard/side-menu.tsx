import {
  Badge,
  Box,
  createListCollection,
  Group,
  IconButton,
  Progress,
  Separator,
  Spinner,
  Stack,
  Text,
  Image,
  Avatar,
} from "@chakra-ui/react";
import {
  TbBook,
  TbChevronLeft,
  TbChevronRight,
  TbCrown,
  TbHome,
  TbLock,
  TbLogout,
  TbMessage,
  TbPlug,
  TbRoad,
  TbSettings,
  TbThumbDown,
  TbTicket,
  TbUser,
  TbUsers,
  TbWorld,
} from "react-icons/tb";
import {
  Link,
  NavLink,
  useFetcher,
  type FetcherWithComponents,
} from "react-router";
import {
  MenuContent,
  MenuItem,
  MenuRoot,
  MenuTrigger,
} from "~/components/ui/menu";
import type { Scrape, User } from "libs/prisma";
import type { Plan } from "libs/user-plan";
import { numberToKMB } from "~/number-util";
import {
  SelectContent,
  SelectItem,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
} from "~/components/ui/select";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getPendingActions,
  getSkippedActions,
  setSkippedActions,
  type SetupProgressInput,
} from "./setup-progress";
import { LogoChakra } from "./logo-chakra";
import { Tooltip } from "~/components/ui/tooltip";

function SideMenuItem({
  link,
  number,
}: {
  link: {
    label: string;
    to: string;
    icon: React.ReactNode;
    external?: boolean;
  };
  number?: {
    value: number;
    color?: string;
    icon?: React.ReactNode;
  };
}) {
  return (
    <NavLink to={link.to} target={link.external ? "_blank" : undefined}>
      {({ isPending, isActive }) => (
        <Group
          px={3}
          py={1}
          w="full"
          bg={isActive ? "brand.fg" : undefined}
          color={isActive ? "brand.contrast" : undefined}
          borderRadius={"md"}
          transition={"all 100ms ease"}
          _hover={{ bg: !isActive ? "brand.gray.100" : undefined }}
          justify="space-between"
        >
          <Group>
            <Text>{link.icon}</Text>
            <Text truncate>{link.label}</Text>
            <Text>{isPending && <Spinner size="xs" />}</Text>
          </Group>
          <Group>
            {number && (
              <Badge colorPalette={number.color} variant={"surface"}>
                {number.icon}
                {number.value}
              </Badge>
            )}
          </Group>
        </Group>
      )}
    </NavLink>
  );
}

function CreditProgress({
  title,
  used,
  total,
}: {
  title: string;
  used: number;
  total: number;
}) {
  function getProgressColor(used: number) {
    if (used < 50) {
      return "brand";
    }
    return "black";
  }

  const value = Math.max(0, Math.min(used, total));
  const percentage = (value / total) * 100;

  return (
    <Stack gap={1}>
      <Group justify="space-between" fontSize={"sm"}>
        <Text>{title}</Text>
        <Tooltip
          content={`Used ${used} of ${total}`}
          showArrow
          positioning={{ placement: "top" }}
        >
          <Text>
            {numberToKMB(used)} / {numberToKMB(total)}
          </Text>
        </Tooltip>
      </Group>
      <Progress.Root
        value={value}
        max={total}
        size={"sm"}
        colorPalette={getProgressColor(percentage)}
      >
        <Progress.Track rounded="full">
          <Progress.Range />
        </Progress.Track>
      </Progress.Root>
    </Stack>
  );
}

function SmallButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Text
      fontSize={"xs"}
      opacity={0.4}
      onClick={onClick}
      _hover={{ cursor: "pointer", opacity: 1 }}
    >
      {children}
    </Text>
  );
}

function SetupProgress({ scrapeId }: { scrapeId: string }) {
  const fetcher = useFetcher<{
    input: SetupProgressInput;
  }>();
  const [index, setIndex] = useState(0);
  const [skipped, setSkipped] = useState<string[] | undefined>(undefined);
  const actions = useMemo(() => {
    if (skipped === undefined || fetcher.data === undefined) {
      return [];
    }
    return getPendingActions(fetcher.data.input, skipped);
  }, [fetcher.data, skipped]);
  const action = actions[index];
  const topAction = actions[0];

  useEffect(() => {
    fetcher.submit(null, {
      method: "get",
      action: "/setup-progress",
    });
  }, [scrapeId]);

  useEffect(() => {
    setSkipped(getSkippedActions(scrapeId));
  }, []);

  useEffect(() => {
    if (skipped === undefined) {
      return;
    }
    setSkippedActions(scrapeId, skipped);
  }, [skipped]);

  function handleSkip() {
    if (skipped === undefined) {
      return;
    }
    setSkipped([...skipped, action.id]);
  }

  function handleNext() {
    setIndex(Math.min(index + 1, actions.length - 1));
  }

  function handlePrevious() {
    setIndex(Math.max(index - 1, 0));
  }

  if (!action) {
    return null;
  }

  return (
    <Stack gap={1}>
      <Group justify={"space-between"}>
        <Text fontSize={"xs"} opacity={0.4}>
          {index + 1} / {actions.length}
        </Text>

        <Group gap={1}>
          <SmallButton onClick={handlePrevious}>
            <TbChevronLeft />
          </SmallButton>
          <SmallButton onClick={handleNext}>
            <TbChevronRight />
          </SmallButton>
          {topAction.canSkip && index === 0 && (
            <SmallButton onClick={handleSkip}>Skip</SmallButton>
          )}
        </Group>
      </Group>

      <Group
        bg="brand.subtle"
        border="1px solid"
        borderColor="brand.outline"
        rounded="md"
        _hover={{ shadow: "xs" }}
      >
        <Link
          to={action.url!}
          style={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            gap: "10px",
            padding: "10px 14px",
          }}
        >
          <Stack flex={1} gap={0} w="full">
            <Text
              fontSize={"sm"}
              color="brand.fg"
              fontWeight={"medium"}
              fontStyle={"italic"}
            >
              {action.title}
            </Text>
            <Text fontSize={"xs"} opacity={0.5}>
              {action.description}
            </Text>
          </Stack>
          <Stack>
            <TbChevronRight />
          </Stack>
        </Link>
      </Group>
    </Stack>
  );
}

export function SideMenu({
  fixed,
  width,
  scrapeOwner,
  loggedInUser,
  contentRef,
  plan,
  scrapes,
  scrapeId,
  scrapeIdFetcher,
  toBeFixedMessages,
  openTickets,
  scrape,
}: {
  fixed: boolean;
  width: number;
  scrapeOwner: User;
  loggedInUser: User;
  contentRef?: React.RefObject<HTMLDivElement | null>;
  plan: Plan;
  scrapes: Scrape[];
  scrapeId?: string;
  scrapeIdFetcher: FetcherWithComponents<any>;
  toBeFixedMessages: number;
  openTickets: number;
  scrape?: Scrape;
}) {
  const links = useMemo(() => {
    const links = [
      { label: "Home", to: "/app", icon: <TbHome /> },
      {
        label: "Knowledge",
        to: "/knowledge",
        icon: <TbBook />,
        forScrape: true,
      },
      {
        label: "Messages",
        to: "/messages",
        icon: <TbMessage />,
        forScrape: true,
      },
      {
        label: "Tickets",
        to: "/tickets",
        icon: <TbTicket />,
        forScrape: true,
        ticketingEnabled: true,
      },
      {
        label: "Integrations",
        to: "/integrations",
        icon: <TbPlug />,
        forScrape: true,
      },
      {
        label: "Settings",
        to: "/settings",
        icon: <TbSettings />,
        forScrape: true,
      },
      {
        label: "Team",
        to: "/team",
        icon: <TbUsers />,
        forScrape: true,
      },
      { label: "Profile", to: "/profile", icon: <TbUser /> },
    ];

    return links
      .filter((link) => !link.forScrape || scrapeId)
      .filter((link) => !link.ticketingEnabled || scrape?.ticketingEnabled);
  }, []);
  const formRef = useRef<HTMLFormElement>(null);
  const collections = useMemo(
    () =>
      createListCollection({
        items: scrapes.map((scrape) => ({
          label: scrape.title ?? "Untitled",
          value: scrape.id,
        })),
      }),
    [scrapes]
  );

  const totalMessages = plan.credits.messages;
  const totalScrapes = plan.credits.scrapes;

  const availableMessages =
    scrapeOwner?.plan?.credits?.messages ?? plan.credits.messages;
  const usedMessages = totalMessages - availableMessages;

  const availableScrapes =
    scrapeOwner?.plan?.credits?.scrapes ?? plan.credits.scrapes;
  const usedScrapes = totalScrapes - availableScrapes;

  function getLinkNumber(label: string) {
    if (label === "Tickets" && openTickets > 0) {
      return {
        value: openTickets,
        icon: <TbTicket />,
        color: "blue",
      };
    }
    if (label === "Messages" && toBeFixedMessages > 0) {
      return {
        value: toBeFixedMessages,
        icon: <TbThumbDown />,
        color: "red",
      };
    }
    return undefined;
  }

  const planId = scrapeOwner?.plan?.planId;

  return (
    <Stack
      h="100dvh"
      w={fixed ? [0, 0, width] : "full"}
      borderRight="1px solid"
      borderColor="brand.outline"
      bg="brand.gray"
      gap={0}
      justify="space-between"
      position={fixed ? "fixed" : undefined}
      left={0}
      top={0}
      overflow="hidden"
    >
      <Stack py={4} gap={4}>
        <Stack px={4}>
          <Group justify="space-between">
            <LogoChakra />
            <Group gap={1}>
              <Tooltip
                content={
                  scrape?.widgetConfig?.private
                    ? "Private collection. Only secured channels such as Discord, Slack can be used."
                    : "Public collection. Anyone can chat with it."
                }
                positioning={{ placement: "right" }}
                showArrow
              >
                <Badge colorPalette={"blue"} variant={"surface"}>
                  {scrape?.widgetConfig?.private ? <TbLock /> : <TbWorld />}
                </Badge>
              </Tooltip>
              {["pro", "starter"].includes(planId ?? "") && (
                <Tooltip
                  content={`Collection on ${planId} plan`}
                  positioning={{ placement: "right" }}
                  showArrow
                >
                  <Badge colorPalette={"orange"} variant={"surface"}>
                    <TbCrown />
                  </Badge>
                </Tooltip>
              )}
            </Group>
          </Group>
        </Stack>

        <Box px={3}>
          <scrapeIdFetcher.Form ref={formRef} method="post" action="/app">
            <input type="hidden" name="intent" value="set-scrape-id" />
            <SelectRoot
              value={scrapeId ? [scrapeId] : []}
              collection={collections}
              name="scrapeId"
              onValueChange={(e) => {
                formRef.current?.submit();
              }}
              disabled={collections.items.length === 0}
              size={"sm"}
            >
              <SelectTrigger bg="brand.white">
                <SelectValueText placeholder="Select collection" />
              </SelectTrigger>
              <SelectContent>
                {collections.items.map((item) => (
                  <SelectItem item={item} key={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </SelectRoot>
          </scrapeIdFetcher.Form>
        </Box>

        <Stack gap={1} w="full" px={3}>
          {links.map((link, index) => (
            <SideMenuItem
              key={index}
              link={link}
              number={getLinkNumber(link.label)}
            />
          ))}
        </Stack>

        <Separator />

        <Stack gap={1} w="full" px={3}>
          <SideMenuItem
            link={{
              label: "Roadmap",
              to: "https://crawlchat.features.vote/roadmap",
              icon: <TbRoad />,
              external: true,
            }}
          />
          <SideMenuItem
            link={{
              label: "Guides",
              to: "https://guides.crawlchat.app",
              icon: <TbBook />,
              external: true,
            }}
          />
        </Stack>
      </Stack>

      <Stack p={4} gap={4}>
        {scrapeId && <SetupProgress scrapeId={scrapeId} />}
        <Stack bg="brand.gray.100" rounded="md" px={3} py={2}>
          <CreditProgress
            title="Messages"
            used={usedMessages}
            total={totalMessages}
          />
          <CreditProgress
            title="Scrapes"
            used={usedScrapes}
            total={totalScrapes}
          />
        </Stack>
        <Group
          rounded="md"
          transition={"all 100ms ease"}
          justify="space-between"
        >
          <Group flex={1} maxW="80%">
            <Avatar.Root shape="full" size="sm">
              <Avatar.Fallback>
                {loggedInUser.name?.charAt(0) ?? loggedInUser.email.charAt(0)}
              </Avatar.Fallback>
              {loggedInUser.photo && <Avatar.Image src={loggedInUser.photo} />}
            </Avatar.Root>
            <Text truncate>{loggedInUser.name ?? loggedInUser.email}</Text>
          </Group>

          <MenuRoot positioning={{ placement: "right-end" }}>
            <MenuTrigger asChild>
              <IconButton size="xs" variant={"ghost"} colorPalette={"brand"}>
                <TbChevronRight />
              </IconButton>
            </MenuTrigger>
            <MenuContent portalRef={contentRef as React.RefObject<HTMLElement>}>
              {/* <MenuItem value="billing" asChild>
                    <Link to="/dashboard/billing">
                      <TbCreditCard />
                      Billing
                    </Link>
                  </MenuItem> */}
              <MenuItem value="logout" asChild>
                <Link to="/logout">
                  <TbLogout />
                  Logout
                </Link>
              </MenuItem>
            </MenuContent>
          </MenuRoot>
        </Group>
      </Stack>
    </Stack>
  );
}
