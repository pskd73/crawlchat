import type { Location, MessageChannel } from "@packages/common/prisma";
import Avatar from "boring-avatars";
import { CountryFlag } from "~/message/country-flag";
import { ChannelBadge } from "~/components/channel-badge";
import { Timestamp } from "~/components/timestamp";
import { Link } from "react-router";
import { TbArrowUp, TbArrowDown } from "react-icons/tb";
import cn from "@meltdownjs/cn";

export type UniqueUser = {
  fingerprint: string;
  questionsCount: number;
  firstAsked: Date;
  lastAsked: Date;
  ageDays: number;
  channel: MessageChannel | null;
  location: Location | null;
};

export const FIELD_LABELS: Record<string, string> = {
  questionsCount: "Questions",
  ageDays: "Age",
  firstAsked: "First asked",
  lastAsked: "Last asked",
  channel: "Channel",
};

function SortHeader({
  field,
  label,
  currentSortBy,
  currentSortOrder,
  onSort,
}: {
  field: string;
  label?: string;
  currentSortBy?: string;
  currentSortOrder?: string;
  onSort?: (field: string) => void;
}) {
  const displayLabel = label ?? FIELD_LABELS[field] ?? field;
  const isActive = currentSortBy === field;
  return (
    <button
      className={cn(
        "flex items-center gap-1 font-medium hover:text-primary",
        isActive && "text-primary"
      )}
      onClick={() => onSort?.(field)}
    >
      {displayLabel}
      {isActive ? (
        currentSortOrder === "asc" ? (
          <TbArrowUp className="text-xs" />
        ) : (
          <TbArrowDown className="text-xs" />
        )
      ) : null}
    </button>
  );
}

export function UniqueUsers({
  users,
  sortBy = "lastAsked",
  sortOrder = "desc",
  onSort,
}: {
  users: UniqueUser[];
  sortBy?: string;
  sortOrder?: string;
  onSort?: (field: string) => void;
}) {
  const fields = Object.keys(FIELD_LABELS);
  return (
    <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
      <table className="table">
        <thead>
          <tr>
            <th>User</th>
            {fields.map((field) => (
              <th key={field}>
                {onSort ? (
                  <SortHeader
                    field={field}
                    currentSortBy={sortBy}
                    currentSortOrder={sortOrder}
                    onSort={onSort}
                  />
                ) : (
                  <span className="font-medium">{FIELD_LABELS[field]}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.fingerprint}>
              <td>
                <Link
                  to={`/questions?fingerprint=${user.fingerprint}`}
                  className="flex items-center gap-2 link-hover text-primary"
                >
                  <Avatar
                    name={user.fingerprint}
                    size={24}
                    variant="beam"
                    className="shrink-0"
                  />
                  {user.location?.country && (
                    <CountryFlag location={user.location} />
                  )}
                  <span className="whitespace-nowrap">
                    #{user.fingerprint.slice(0, 6)}
                  </span>
                </Link>
              </td>
              <td>
                <span className="badge badge-soft">{user.questionsCount}</span>
              </td>
              <td>
                <span className="badge badge-soft">{user.ageDays}d</span>
              </td>
              <td className="whitespace-nowrap">
                <Timestamp date={user.firstAsked} />
              </td>
              <td className="whitespace-nowrap">
                <Timestamp date={user.lastAsked} />
              </td>
              <td>
                <ChannelBadge channel={user.channel} onlyIcon />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
