import { TbLanguage } from "react-icons/tb";

export function LanguageBadge({ language }: { language: string }) {
  const shortCode = language.substring(0, 2).toUpperCase();
  const name = language.charAt(0).toUpperCase() + language.slice(1);

  if (shortCode === "EN") {
    return null;
  }

  return (
    <div className="tooltip" data-tip={name}>
      <div className="badge badge-soft px-2">
        <TbLanguage />
        {shortCode}
      </div>
    </div>
  );
}
