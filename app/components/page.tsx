import { Box, Group, Heading, IconButton, Stack, Text } from "@chakra-ui/react";
import { useContext, useEffect, useRef } from "react";
import { TbMenu } from "react-icons/tb";
import { AppContext } from "~/dashboard/context";

export function Page({
  title,
  icon,
  children,
  right,
}: {
  title: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  right?: React.ReactNode;
}) {
  const { menuOpen, setMenuOpen, setContainerWidth } = useContext(AppContext);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <Stack h="full" gap={0}>
      <Stack
        p={4}
        borderBottom={"1px solid"}
        borderColor={"brand.outline"}
        h={"60px"}
        justify="center"
        position="sticky"
        top={0}
        bg="white"
        zIndex={1}
      >
        <Group justify="space-between">
          <Group>
            <IconButton
              size={"xs"}
              display={["flex", "flex", "none"]}
              variant={"subtle"}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <TbMenu />
            </IconButton>
            <Heading display={"flex"} alignItems={"center"} gap={2}>
              <Text>{icon}</Text>
              <Text lineClamp={1}>{title}</Text>
            </Heading>
          </Group>
          {right}
        </Group>
      </Stack>
      <Box p={4} h="full" ref={containerRef}>
        {children}
      </Box>
    </Stack>
  );
}
