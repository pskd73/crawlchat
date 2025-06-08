import {
  Badge,
  Box,
  createListCollection,
  Group,
  Heading,
  IconButton,
  Progress,
  Separator,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import {
  TbBook,
  TbChevronRight,
  TbHome,
  TbLogout,
  TbMessage,
  TbMessages,
  TbPlug,
  TbRoad,
  TbSettings,
  TbThumbDown,
  TbTicket,
  TbUser,
} from "react-icons/tb";
import { Link, NavLink, type FetcherWithComponents } from "react-router";
import { Avatar } from "~/components/ui/avatar";
import {
  MenuContent,
  MenuItem,
  MenuRoot,
  MenuTrigger,
} from "~/components/ui/menu";
import type { Scrape, User } from "libs/prisma";
import { LogoText } from "~/landing/page";
import type { Plan } from "libs/user-plan";
import { numberToKMB } from "~/number-util";
import {
  SelectContent,
  SelectItem,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
} from "~/components/ui/select";
import { useMemo, useRef } from "react";

const links = [
  { label: "Home", to: "/app", icon: <TbHome /> },
  { label: "Knowledge", to: "/knowledge", icon: <TbBook />, forScrape: true },
  {
    label: "Conversations",
    to: "/conversations",
    icon: <TbMessages />,
    forScrape: true,
  },
  { label: "Messages", to: "/messages", icon: <TbMessage />, forScrape: true },
  { label: "Tickets", to: "/tickets", icon: <TbTicket />, forScrape: true },
  { label: "Settings", to: "/settings", icon: <TbSettings />, forScrape: true },
  {
    label: "Integrations",
    to: "/integrations",
    icon: <TbPlug />,
    forScrape: true,
  },
  { label: "Profile", to: "/profile", icon: <TbUser /> },
];

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
        <Text>
          {numberToKMB(used)} / {numberToKMB(total)}
        </Text>
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

export function SideMenu({
  fixed,
  width,
  user,
  contentRef,
  plan,
  scrapes,
  scrapeId,
  scrapeIdFetcher,
  toBeFixedMessages,
  openTickets,
}: {
  fixed: boolean;
  width: number;
  user: User;
  contentRef?: React.RefObject<HTMLDivElement | null>;
  plan: Plan;
  scrapes: Scrape[];
  scrapeId?: string;
  scrapeIdFetcher: FetcherWithComponents<any>;
  toBeFixedMessages: number;
  openTickets: number;
}) {
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
    user.plan?.credits?.messages ?? plan.credits.messages;
  const usedMessages = totalMessages - availableMessages;

  const availableScrapes = user.plan?.credits?.scrapes ?? plan.credits.scrapes;
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
        <Stack px={6}>
          <Heading
            display="flex"
            alignItems="center"
            gap={2}
            color="brand.fg"
            asChild
          >
            <Group>
              <LogoText />
            </Group>
          </Heading>
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
          {links
            .filter((link) => !link.forScrape || scrapeId)
            .map((link, index) => (
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
            <Avatar name={user.email} size={"sm"} />
            <Text truncate>{user.email}</Text>
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
