export const NO_INDEX_HTTP_HEADERS = {
  "X-Robots-Tag": "noindex, nofollow",
} as const;

export function makeMeta({
  title,
  description,
  noIndex,
}: {
  title: string;
  description?: string;
  noIndex?: boolean;
}) {
  const meta = [
    {
      title,
    },
    {
      name: "og:title",
      content: title,
    },
  ];

  if (description) {
    meta.push({
      name: "description",
      content: description,
    });
  }

  if (noIndex) {
    meta.push({
      name: "robots",
      content: "noindex, nofollow",
    });
  }

  return meta;
}
