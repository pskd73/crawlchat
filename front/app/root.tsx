import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useMatches,
} from "react-router";

import type { Route } from "./+types/root";
import stylesheet from "./app.css?url";
import { Provider } from "./components/ui/provider";

declare global {
  interface Window {
    ENV: {
      VITE_SERVER_WS_URL: string;
    };
  }
}

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Mynerve&family=Courier+Prime:ital,wght@0,400;0,700;1,400;1,700&display=swap",
  },
  { rel: "stylesheet", href: stylesheet },
];

export function loader() {
  return {
    ENV: {
      VITE_SERVER_WS_URL: process.env.VITE_SERVER_WS_URL,
    },
  };
}

export function Layout({ children }: { children: React.ReactNode }) {
  const matches = useMatches();
  const isEmbed = matches.some((match) => match.id === "landing/embed-demo");
  const isLandingPage = matches.some((match) => match.id === "landing/page");

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script
          defer
          src="https://api.pirsch.io/pa.js"
          id="pianjs"
          data-code="aO7kKYfA1oQ3g4FLHanketwYCWPu2cE0"
        ></script>
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
        {isEmbed && (
          <script
            src="/embed.js"
            id="crawlchat-script"
            data-id="67bca5b7b57f15a3a6f8eac6"
            data-ask-ai-text="💬 Ask AI"
            data-ask-ai-background-color="#000000"
            data-ask-ai-color="white"
            data-ask-ai-position="br"
            data-ask-ai-margin-x="30px"
            data-ask-ai-margin-y="20px"
            data-ask-ai-radius="30px"
            data-ask-ai="true"
          />
        )}
        {isLandingPage && (
          <script
            src="https://crawlchat.app/embed.js"
            id="crawlchat-script"
            data-id="67dbfc7258ed87c571a04b83"
            data-ask-ai="true"
            data-ask-ai-background-color="#7b2cbf"
            data-ask-ai-color="#ffffff"
            data-ask-ai-text="💬 Ask AI"
            data-ask-ai-position="br"
            data-ask-ai-radius="20px"
          />
        )}
      </body>
    </html>
  );
}

export default function App({ loaderData }: Route.ComponentProps) {
  return (
    <Provider>
      <Outlet />
      <script
        dangerouslySetInnerHTML={{
          __html: `window.ENV = ${JSON.stringify(loaderData.ENV)}`,
        }}
      />
    </Provider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
