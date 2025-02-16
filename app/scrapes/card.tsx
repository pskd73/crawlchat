import { TbTrash } from "react-icons/tb";
import { TbCheck } from "react-icons/tb";
import { Badge, Box, IconButton, Image } from "@chakra-ui/react";
import { TbMessage } from "react-icons/tb";
import { Group, Text } from "@chakra-ui/react";
import { Stack } from "@chakra-ui/react";
import type { Scrape } from "@prisma/client";
import { useEffect, useMemo, useState } from "react";
import { TbWorld } from "react-icons/tb";
import { Link } from "react-router";
import moment from "moment";
import { getScrapeTitle } from "./util";

export function ScrapeCard({
  scrape,
  onDelete,
  deleting,
}: {
  scrape: Scrape;
  onDelete?: () => void;
  deleting?: boolean;
}) {
  const [deleteActive, setDeleteActive] = useState(false);
  const [faviconUrl, setFaviconUrl] = useState<string>();

  useEffect(() => {
    const fetchFaviconUrl = async () => {
      try {
        const url = new URL(scrape.url);
        const faviconUrl = url.origin + "/favicon.ico";
        const response = await fetch(faviconUrl);
        if (!response.ok) return;
        setFaviconUrl(faviconUrl);
      } catch {
        setFaviconUrl(undefined);
      }
    };
    fetchFaviconUrl();
  }, [scrape.url]);

  useEffect(() => {
    if (deleteActive) {
      setTimeout(() => {
        setDeleteActive(false);
      }, 3000);
    }
  }, [deleteActive]);

  function handleDelete() {
    if (!deleteActive) {
      setDeleteActive(true);
      return;
    }
    if (onDelete) {
      onDelete();
    }
  }

  return (
    <Stack bg="brand.gray.100" p={4} rounded={"lg"} h="full" className="group">
      <Group h={"30px"}>
        <Group _groupHover={{ display: "none" }}>
          {faviconUrl && <Image src={faviconUrl} w={"30px"} h={"30px"} />}
          {!faviconUrl && (
            <Text fontSize={"30px"}>
              <TbWorld />
            </Text>
          )}
        </Group>
        <Group h="full" display={"none"} _groupHover={{ display: "flex" }}>
          <IconButton size={"xs"} asChild>
            <Link to={`/threads/new?id=${scrape.id}`}>
              <TbMessage />
            </Link>
          </IconButton>
          {onDelete && (
            <IconButton
              size={"xs"}
              variant={deleteActive ? "solid" : "subtle"}
              colorPalette={"red"}
              onClick={handleDelete}
            >
              {deleteActive ? <TbCheck /> : <TbTrash />}
            </IconButton>
          )}
        </Group>
      </Group>

      <Text fontSize={"sm"} lineClamp={2}>
        {getScrapeTitle(scrape)}
      </Text>
      <Group fontSize={"xs"}>
        <Text opacity={0.5}>{moment(scrape.createdAt).fromNow()}</Text>
        <Badge size={"xs"} variant={"surface"} colorPalette={"brand"}>
          <TbWorld />
          {scrape.urls.length}
        </Badge>
      </Group>
    </Stack>
  );
}
