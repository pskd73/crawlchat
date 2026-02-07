import cn from "@meltdownjs/cn";
import { useMemo } from "react";
import { TbRegex, TbSearch, TbTextSpellcheck } from "react-icons/tb";

export function SearchTypeBadge({ searchType }: { searchType: string }) {
  const [icon, text] = useMemo(() => {
    if (searchType === "search_data") {
      return [<TbSearch />, "Semantic"];
    }
    if (searchType === "text_search") {
      return [<TbTextSpellcheck />, "Phrase"];
    }
    if (searchType === "text_search_regex") {
      return [<TbRegex />, "Regex"];
    }
    return [<TbSearch />, "Search Data"];
  }, [searchType]);
  return (
    <div
      className={cn(
        "badge badge-soft",
        searchType === "search_data" && "badge-primary",
        searchType === "text_search" && "badge-secondary",
        searchType === "text_search_regex" && "badge-accent"
      )}
    >
      {icon}
      {text}
    </div>
  );
}
