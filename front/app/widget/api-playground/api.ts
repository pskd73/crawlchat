import type { Route } from "./+types/api";

export async function action({ request }: Route.ActionArgs) {
  const requestData = await request.json();

  const rawData = requestData.base64 as string;
  const data = JSON.parse(atob(rawData));

  const { url, method, headers, queryParams, body } = data;

  const response = await fetch(url + "?" + queryParams, {
    method,
    headers,
    body: method === "GET" ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  const responseHeaders = response.headers;
  const status = response.status;

  return Response.json({
    text,
    responseHeaders,
    status,
  });
}
