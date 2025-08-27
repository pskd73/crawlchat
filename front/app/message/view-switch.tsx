import { useMemo } from "react";
import { TbMessage, TbMessages } from "react-icons/tb";
import { Link, useMatches } from "react-router";
import cn from "@meltdownjs/cn";

export function ViewSwitch() {
  const matches = useMatches();
  const view = useMemo(() => {
    const match = matches.pop();
    if (match?.pathname === "/messages") {
      return "messages";
    }
    return "conversations";
  }, [matches]);

  return (
    <div className="join hidden md:flex">
      <div className="tooltip tooltip-left" data-tip="Messages">
        <Link
          to={"/messages"}
          className={cn(
            "btn btn-square join-item",
            view === "messages" && "btn-disabled"
          )}
        >
          <TbMessage />
        </Link>
      </div>
      <div className="tooltip tooltip-left" data-tip="Conversations">
        <Link
          to={"/messages/conversations"}
          className={cn(
            "btn btn-square join-item",
            view === "conversations" && "btn-disabled"
          )}
        >
          <TbMessages />
        </Link>
      </div>
    </div>
  );
}
