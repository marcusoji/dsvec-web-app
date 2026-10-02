import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import logoDstveb from "../assets/logo-dstveb.jpg";

import appCss from "../styles.css?url";
import { SITE } from "../lib/site";
import { BOARD } from "../lib/branches";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: `${SITE.campusName} | Technical & Vocational Training`,
      },
      { name: "description", content: SITE.description },
      { name: "author", content: SITE.name },
      { name: "robots", content: "index, follow" },
      { name: "theme-color", content: "#d9b53d" },
      { property: "og:site_name", content: SITE.campusName },
      { property: "og:title", content: `${SITE.campusName} — Technical & Vocational Training` },
      { property: "og:description", content: SITE.description },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "en_NG" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: `${SITE.campusName} — Technical & Vocational Training` },
      { name: "twitter:description", content: SITE.description },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

const LOADING_MIN_MS = 3000;
const LOADING_MESSAGES = [
  "Preparing your trade unit…",
  "Sharpening the tools…",
  "Warming up the workshop…",
  "Firing up the generator…",
];

/**
 * Paths served by the Umutu branch site, including its staff portal. The
 * board-level landing page (and anywhere else) keeps the plain DSTVEB identity,
 * so the loading screen adopts the Umutu branch name only when the destination
 * is actually a branch page.
 */
const UMTU_BRANCH_PREFIXES = [
  "/umutu",
  "/about",
  "/admissions",
  "/units",
  "/apply",
  "/contact",
  "/application",
  "/login",
  "/admin",
];

function isUmutuBranchPath(pathname: string) {
  return UMTU_BRANCH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function RouteLoadingOverlay() {
  const isLoading = useRouterState({
    select: (s) => s.status === "pending" || s.isLoading,
  });
  // The router commits the destination location before loaders resolve, so the
  // pathname already points at the page we are navigating to.
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const showingBranch = isUmutuBranchPath(pathname);
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState(LOADING_MESSAGES[0]);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAt = useRef<number>(0);

  useEffect(() => {
    if (isLoading) {
      startedAt.current = Date.now();
      setMessage(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
      setVisible(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      return;
    }
    if (!visible) return;
    const elapsed = Date.now() - startedAt.current;
    const remaining = Math.max(0, LOADING_MIN_MS - elapsed);
    hideTimer.current = setTimeout(() => setVisible(false), remaining);
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-ink px-6 text-center"
      role="status"
      aria-live="polite"
    >
      <div className="rounded-2xl bg-white p-1.5 shadow-lg">
        <img src={logoDstveb} alt="DSTVEB logo" className="size-28 object-contain" />
      </div>
      <div>
        <p className="font-display text-2xl font-black tracking-tight text-ink-foreground">
          {showingBranch ? SITE.shortName : BOARD.shortName}
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          {showingBranch ? SITE.campusName : BOARD.region}
        </p>
      </div>
      <div className="flex items-center gap-2 text-sm text-ink-muted">
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        <span>{message}</span>
      </div>
      <p className="text-xs uppercase tracking-[0.3em] text-ink-muted/70">
        Practical skills · Certified trades
      </p>
    </div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <RouteLoadingOverlay />
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
