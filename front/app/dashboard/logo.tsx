import cn from "@meltdownjs/cn";
import { RiChatVoiceAiFill } from "react-icons/ri";

export function Logo() {
  return (
    <div
      className={cn(
        "flex gap-2 text-2xl text-brand-fg items-center",
        "text-primary"
      )}
      style={{
        fontFamily: "Radio Grotesk",
      }}
    >
      <div className="text-3xl">
        <RiChatVoiceAiFill />
      </div>
      CrawlChat
    </div>
  );
}
