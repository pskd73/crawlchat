export type MultimodalContent =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export function getQueryString(query: string | MultimodalContent[]) {
  if (typeof query === "string") {
    return query;
  }

  if (Array.isArray(query)) {
    return query
      .filter((q) => q.type === "text")
      .map((q) => q.text)
      .join("\n");
  }

  return "Unsupported query type";
}

export function getImagesCount(query: string | MultimodalContent[]) {
  if (typeof query === "string") {
    return 0;
  }
  return query.filter((q) => q.type === "image_url").length;
}

export function removeImages(query: string | MultimodalContent[]) {
  if (typeof query === "string") {
    return query;
  }
  return query.filter((q) => q.type !== "image_url");
}
