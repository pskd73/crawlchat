import moment from "moment";
import type { BlogPost } from "~/blog/posts";

export type ChangelogMonthGroup = {
  year: number;
  month: number;
  count: number;
  href: string;
  label: string;
};

export function buildChangelogMonthGroups(
  posts: BlogPost[]
): ChangelogMonthGroup[] {
  const counts = new Map<string, number>();
  for (const post of posts) {
    const d = post.date;
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const groups: ChangelogMonthGroup[] = [];
  for (const [key, count] of counts) {
    const [y, m] = key.split("-").map(Number);
    const monthStart = new Date(y, m - 1, 1);
    groups.push({
      year: y,
      month: m,
      count,
      href: `/changelog/${y}/${m}`,
      label: `${moment(monthStart).format("MMMM YYYY")} (${count})`,
    });
  }
  return groups.sort((a, b) =>
    a.year !== b.year ? b.year - a.year : b.month - a.month
  );
}
