import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

export type AdminAuthContext = {
  admin: {
    userId: string;
    email: string | null;
    role: "admin" | "staff";
  };
};

/**
 * Function middleware that verifies a Supabase bearer token from the request
 * and confirms the user holds an `admin` or `staff` role. Server functions that
 * expose applicant data compose this middleware so they can never be invoked by
 * unauthenticated or non-admin callers.
 */
export const requireAdmin = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const SUPABASE_URL = process.env["SUPABASE_URL"];
  const SUPABASE_PUBLISHABLE_KEY = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Server configuration error");
  }

  const request = getRequest();
  const authHeader = request?.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";
  if (!token || token.split(".").length !== 3) {
    throw new Error("Unauthorized");
  }

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) {
    throw new Error("Unauthorized");
  }
  const userId = data.claims.sub;

  // Resolve the administrative role for this authenticated user.
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);

  const roleList = (roles ?? []).map((r) => r.role);
  const role: "admin" | "staff" | null = roleList.includes("admin")
    ? "admin"
    : roleList.includes("staff")
      ? "staff"
      : null;
  if (!role) {
    throw new Error("Forbidden");
  }

  const email = typeof data.claims.email === "string" ? data.claims.email : null;

  return next({
    context: { admin: { userId, email, role } } satisfies AdminAuthContext,
  });
});
