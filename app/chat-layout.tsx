import { Stack } from "@chakra-ui/react";
import { Outlet } from "react-router";

export default function ChatLayout() {
  return (
    <Stack>
      Chat layout
      <Outlet />
    </Stack>
  );
}
