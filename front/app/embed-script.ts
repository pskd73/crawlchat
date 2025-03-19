import fs from "fs";

let content: string;

function getContent() {
  if (!content) {
    const path =
      process.env.NODE_ENV === "development"
        ? "public/embed-script.js"
        : "build/client/embed-script.js";
    content = fs.readFileSync(path, "utf8");
  }
  return content;
}

export async function loader() {
  return new Response(getContent(), {
    headers: {
      "Content-Type": "text/javascript",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
