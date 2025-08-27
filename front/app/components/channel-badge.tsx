import cn from "@meltdownjs/cn";
import type { MessageChannel } from "libs/prisma";
import {
  TbBrandDiscord,
  TbBrandSlack,
  TbMessage,
  TbRobotFace,
} from "react-icons/tb";

export function ChannelBadge({ channel }: { channel?: MessageChannel | null }) {
  return (
    <span
      className={cn(
        "badge badge-soft",
        !channel && "badge-primary",
        channel === "discord" && "badge-info",
        channel === "slack" && "badge-error",
        channel === "mcp" && "badge-success"
      )}
    >
      {!channel && <TbMessage />}
      {channel === "discord" && <TbBrandDiscord />}
      {channel === "slack" && <TbBrandSlack />}
      {channel === "mcp" && <TbRobotFace />}

      {!channel && "Chatbot"}
      {channel === "discord" && "Discord"}
      {channel === "slack" && "Slack"}
      {channel === "mcp" && "MCP"}
    </span>
  );
}
