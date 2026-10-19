import { isRouteErrorResponse, Link, Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteLoaderData } from "react-router";
import type { Route } from "./+types/root";
import stylesheet from "./app.css?url";
import { parseTheme } from "./components/ThemeToggle";
import { buttonClass } from "./components/ui";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..800&family=IBM+Plex+Mono:wght@400;500;600&display=swap",
  },
  { rel: "stylesheet", href: stylesheet },
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
];

export function loader({ request }: Route.LoaderArgs) {
  return { theme: parseTheme(request.headers.get("Cookie")) };
}

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useRouteLoaderData<typeof loader>("root");
  const theme = data?.theme ?? "system";
  return (
    <html lang="en-GB" data-theme={theme === "system" ? undefined : theme}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let title = "Something went wrong";
  let details = "The page couldn't be loaded. Try again in a moment.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      title = "Page not found";
      details = "That page doesn't exist, or it has moved.";
    } else if (error.status === 403) {
      title = "No access";
      details = typeof error.data === "string" && error.data ? error.data : "You don't have access to this page.";
    } else {
      details = (typeof error.data === "string" && error.data) || error.statusText || details;
    }
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="wide text-3xl font-bold">{title}</h1>
      <p className="mt-2 text-muted">{details}</p>
      <p className="mt-6">
        <Link to="/" className={buttonClass("default")}>Go to the checker</Link>
      </p>
      {stack ? (
        <pre className="mt-6 overflow-x-auto rounded-card bg-sunken p-4 text-xs">
          <code>{stack}</code>
        </pre>
      ) : null}
    </main>
  );
}
