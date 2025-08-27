import { TbLock, TbWorld } from "react-icons/tb";

export function ScrapePrivacyBadge({
  private: _private,
}: {
  private: boolean;
}) {
  return (
    <div
      className="tooltip tooltip-left"
      data-tip={_private ? "Private collection" : "Public collection"}
    >
      <span className="badge px-1 badge-soft">
        {_private ? <TbLock /> : <TbWorld />}
      </span>
    </div>
  );
}
