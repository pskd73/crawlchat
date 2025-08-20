import {
  Group,
  Heading,
  Stack,
  Text,
  Link as ChakraLink,
} from "@chakra-ui/react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { TbCheck } from "react-icons/tb";
import { Link, useLocation, type FetcherWithComponents } from "react-router";
import { Button } from "~/components/ui/button";

export function SettingsSection({
  id,
  children,
  fetcher,
  title,
  description,
  actionRight,
  plainTitle,
  danger,
}: {
  id?: string;
  children?: React.ReactNode;
  fetcher?: FetcherWithComponents<unknown>;
  title?: React.ReactNode;
  description?: string;
  actionRight?: React.ReactNode;
  plainTitle?: string;
  danger?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [targeted, setTargeted] = useState(false);
  const { addSection } = useContext(SettingsSectionContext);
  const location = useLocation();

  useEffect(() => {
    if (id) {
      let _title = plainTitle ?? id;
      if (typeof title === "string") {
        _title = title;
      }
      addSection(id, _title);
    }
  }, [id, title, plainTitle]);

  useEffect(() => {
    const hash = location.hash;
    if (id && hash === `#${id}` && ref.current) {
      const elementPosition = ref.current.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - 70;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
      setTargeted(true);
    } else {
      setTargeted(false);
    }
  }, [id, location.hash]);

  function render() {
    return (
      <Stack
        border={"1px solid"}
        borderColor={danger ? "red.300" : "brand.outline"}
        borderRadius={"md"}
        overflow={"hidden"}
        ref={ref}
        outline={targeted ? "3px solid" : "none"}
        outlineColor={"brand.fg"}
        outlineOffset={"2px"}
        gap={0}
      >
        <Stack p={4} gap={4} bg={danger ? "brand.danger.subtle" : undefined}>
          <Stack>
            {title && <Heading size={"md"}>{title}</Heading>}
            {description && (
              <Text opacity={0.5} fontSize={"sm"}>
                {description}
              </Text>
            )}
          </Stack>
          {children}
        </Stack>
        {(actionRight || fetcher) && (
          <Group
            p={4}
            py={3}
            borderTop={"1px solid"}
            borderColor={"brand.outline"}
            bg={"brand.gray.50"}
            w="full"
            justifyContent={"space-between"}
          >
            <Group></Group>
            <Group>
              {actionRight}
              {fetcher && (
                <Button
                  type="submit"
                  size={"xs"}
                  loading={fetcher.state !== "idle"}
                  variant={"surface"}
                  colorPalette={danger ? "red" : undefined}
                >
                  Save
                  <TbCheck />
                </Button>
              )}
            </Group>
          </Group>
        )}
      </Stack>
    );
  }

  if (!fetcher) {
    return render();
  }

  return <fetcher.Form method="post">{render()}</fetcher.Form>;
}

export function SettingsContainer({ children }: { children: React.ReactNode }) {
  const { sections } = useContext(SettingsSectionContext);
  const [activeId, setActiveId] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    const hash = location.hash;
    if (hash) {
      setActiveId(hash.slice(1));
    }
  }, [location.hash]);

  return (
    <Group gap={8} alignItems={"flex-start"}>
      <Stack gap={4} flex={1}>
        {children}
      </Stack>
      <Stack w={"200px"} h="full" position={"sticky"} top={"80px"}>
        <Heading size={"sm"}>On this page</Heading>
        <Stack>
          {sections.map((section) => (
            <ChakraLink
              key={section.id}
              asChild
              fontSize={"sm"}
              outline={"none"}
              opacity={activeId === section.id ? 1 : 0.5}
              fontWeight={activeId === section.id ? "medium" : undefined}
              color={activeId === section.id ? "brand.fg" : undefined}
            >
              <Link to={`#${section.id}`} preventScrollReset>
                {section.title}
              </Link>
            </ChakraLink>
          ))}
        </Stack>
      </Stack>
    </Group>
  );
}

function useSettingsSections() {
  const [sections, setSections] = useState<{ id: string; title: string }[]>([]);

  function addSection(id: string, title: string) {
    setSections((prev) => {
      if (prev.find((s) => s.id === id)) {
        return prev;
      }
      return [...prev, { id, title }];
    });
  }

  return { sections, addSection };
}

type SettingsSectionState = ReturnType<typeof useSettingsSections>;

export const SettingsSectionContext = createContext<SettingsSectionState>({
  sections: [],
  addSection: () => {},
});

export function SettingsSectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const value = useSettingsSections();

  return (
    <SettingsSectionContext.Provider value={value}>
      {children}
    </SettingsSectionContext.Provider>
  );
}
