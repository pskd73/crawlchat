import {
  Group,
  Heading,
  IconButton,
  Separator,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import {
  TbChevronRight,
  TbFolder,
  TbHome,
  TbLogout,
  TbMessage,
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
import type { Thread, User } from "@prisma/client";
import { getThreadName } from "~/thread-util";
import { useContext } from "react";
import { AppContext } from "./context";
import { LogoText } from "~/landing/page";

const links = [
  { label: "Home", to: "/app", icon: <TbHome /> },
  { label: "Scrape", to: "/scrape", icon: <TbScan /> },
  { label: "Collections", to: "/collections", icon: <TbFolder /> },
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

export function SideMenu({
  fixed,
  width,
  user,
  contentRef,
}: {
  fixed: boolean;
  width: number;
  user: User;
  contentRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const { threadTitle } = useContext(AppContext);

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

      <Stack p={4}>
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
