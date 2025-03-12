import {
  Group,
  Heading,
  IconButton,
  Progress,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import {
  TbChevronRight,
  TbFileX,
  TbFolder,
  TbHome,
  TbLogout,
  TbScan,
} from "react-icons/tb";
import { Link, NavLink } from "react-router";
import { Avatar } from "~/components/ui/avatar";
import {
  MenuContent,
  MenuItem,
  MenuRoot,
  MenuTrigger,
} from "~/components/ui/menu";
import type { User } from "libs/prisma";
import { LogoText } from "~/landing/page";
import type { Plan } from "libs/user-plan";
import { numberToKMB } from "~/number-util";

const links = [
  { label: "Home", to: "/app", icon: <TbHome /> },
  { label: "Scrape", to: "/scrape", icon: <TbScan /> },
  { label: "Collections", to: "/collections", icon: <TbFolder /> },
  { label: "Data gaps", to: "/data-gaps", icon: <TbFileX /> },
  // { label: "Settings", to: "/settings", icon: <TbSettings /> },
];

function SideMenuItem({
  link,
}: {
  link: { label: string; to: string; icon: React.ReactNode };
}) {
  return (
    <NavLink to={link.to}>
      {({ isPending, isActive }) => (
        <Group
          px={3}
          py={2}
          w="full"
          bg={isActive ? "brand.fg" : undefined}
          color={isActive ? "brand.contrast" : undefined}
          borderRadius={"md"}
          transition={"all 100ms ease"}
          _hover={{ bg: !isActive ? "brand.gray.100" : undefined }}
        >
          <Text>{link.icon}</Text>
          <Text truncate>{link.label}</Text>
          <Text>{isPending && <Spinner size="xs" />}</Text>
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
  return (
    <Stack gap={1}>
      <Group justify="space-between" fontSize={"sm"}>
        <Text>{title}</Text>
        <Text>
          {numberToKMB(used)} / {numberToKMB(total)}
        </Text>
      </Group>
      <Progress.Root value={Math.max(0, Math.min(used, total))} max={total}>
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
}: {
  fixed: boolean;
  width: number;
  user: User;
  contentRef?: React.RefObject<HTMLDivElement | null>;
  plan: Plan;
}) {
  const totalMessages = plan.credits.messages;
  const totalScrapes = plan.credits.scrapes;

  const availableMessages =
    user.plan?.credits?.messages ?? plan.credits.messages;
  const usedMessages = totalMessages - availableMessages;

  const availableScrapes = user.plan?.credits?.scrapes ?? plan.credits.scrapes;
  const usedScrapes = totalScrapes - availableScrapes;

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

        <Stack gap={1} w="full" px={3}>
          {links.map((link, index) => (
            <SideMenuItem key={index} link={link} />
          ))}
        </Stack>
      </Stack>

      <Stack p={4} gap={4}>
        <Stack bg="brand.gray.100" rounded="md" p={4} gap={4}>
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
