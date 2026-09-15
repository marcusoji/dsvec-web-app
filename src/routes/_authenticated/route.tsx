import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, LogOut, UserCog } from "lucide-react";
import logoDstveb from "@/assets/logo-dstveb.jpg";

import { useAdminUser } from "@/lib/use-admin-user";
import type { Permission } from "@/lib/permissions";

const DESCRIPTION =
  "Secure staff portal for the DSTVEB Umutu Branch — application management, statistics and audit.";

export const Route = createFileRoute("/_authenticated")({
  // Supabase keeps the session in localStorage, so the server cannot read it.
  // Rendering this subtree client-only guarantees loaders/queries run with a
  // bearer token attached instead of failing with "Unauthorized" during SSR.
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
    return { user: data.user };
  },
  head: () => ({
    meta: [
      { title: "Staff Portal | DSTVEB Umutu Branch" },
      { name: "description", content: DESCRIPTION },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  const router = useRouter();
  const { user, hasPermission } = useAdminUser();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // First-login guard: the seeded credential must be replaced before the
  // portal can be used.
  useEffect(() => {
    if (user?.mustChangePassword && pathname !== "/admin/account") {
      router.navigate({ to: "/admin/account" });
    }
  }, [user, pathname, router]);

  // Least-privilege navigation: only surface what the role may open.
  const navItems = (
    [
      { to: "/admin", label: "Dashboard", permission: "applicants.read" },
      { to: "/admin/applicants", label: "Applicants", permission: "applicants.read" },
      
      { to: "/admin/duplicates", label: "Duplicate audit", permission: "audit.read" },
      { to: "/admin/audit", label: "Audit log", permission: "audit.read" },
    ] satisfies Array<{ to: string; label: string; permission: Permission }>
  ).filter((item) => hasPermission(item.permission));

  useEffect(() => {
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        if (!data.session) {
          router.navigate({ to: "/login" });
          return;
        }
        setAuthed(true);
      })
      .catch(() => {
        if (active) router.navigate({ to: "/login" });
      })
      .finally(() => {
        if (active) setChecking(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (!session) {
        router.navigate({ to: "/login" });
      } else {
        setAuthed(true);
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  async function logout() {
    await supabase.auth.signOut();
    router.navigate({ to: "/login" });
  }

  if (checking && !authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <span className="flex items-center gap-2 text-sm font-medium text-ink-muted">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Checking session…
        </span>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-sidebar-border bg-ink">
        <div className="flex h-16 items-center gap-4 px-4 md:px-8">
          <Link to="/admin" className="flex items-center gap-3" aria-label="Staff portal home">
            <img
              src={logoDstveb}
              alt="DSTVEB logo"
              className="size-9 shrink-0 rounded-md bg-white object-contain p-0.5"
            />
            <span className="leading-tight">
              <span className="block font-display text-sm font-bold text-ink-foreground">
                DSTVEB Umutu
              </span>
              <span className="block text-[0.7rem] text-ink-muted">Staff portal</span>
            </span>
          </Link>
          <nav aria-label="Admin" className="ml-auto hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-md px-3 py-2 text-sm font-medium text-ink-muted hover:text-ink-foreground"
                activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
                activeOptions={{ exact: item.to === "/admin" }}
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/admin/account"
              className="ml-1 inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-ink-muted hover:text-ink-foreground"
              activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
            >
              <UserCog className="size-4" aria-hidden="true" />
              <span className="hidden lg:inline">{user?.email ?? "Account"}</span>
            </Link>
          </nav>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-md border border-white/15 px-3 py-2 text-sm font-medium text-ink-muted hover:text-ink-foreground md:ml-0"
          >
            <LogOut className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
        {/* Mobile nav */}
        <nav aria-label="Admin (mobile)" className="flex border-t border-sidebar-border md:hidden">
          {[...navItems, { to: "/admin/account", label: "Account" }].map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="flex-1 px-3 py-3 text-center text-sm font-medium text-ink-muted"
              activeProps={{ className: "text-primary" }}
              activeOptions={{ exact: l.to === "/admin" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </header>
      <main id="admin-main" className="mx-auto w-full max-w-[78rem] flex-1 px-4 py-8 md:px-8">
        <Outlet />
      </main>
      <footer className="border-t border-border py-5">
        <p className="px-4 text-center text-xs text-muted-foreground">
          Authorized personnel only. All access is logged.
        </p>
      </footer>
    </div>
  );
}
