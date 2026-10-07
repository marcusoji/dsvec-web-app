import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Public: a staff member who forgot their password asks an administrator to
 * reset it. Always answers the same way so it never reveals which emails exist.
 */
export const requestPasswordReset = createServerFn({ method: "POST" })
  .validator(
    z.object({
      email: z.string().trim().toLowerCase().email().max(254),
      note: z.string().trim().max(500).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Light abuse guard: one open request per email.
    const { data: existing } = await supabaseAdmin
      .from("password_reset_requests")
      .select("id")
      .eq("email", data.email)
      .eq("status", "open")
      .limit(1);
    if (!existing?.length) {
      await supabaseAdmin
        .from("password_reset_requests")
        .insert({ email: data.email, note: data.note || null });
    }
    return { ok: true as const };
  });

/**
 * Finds one auth user by email. The admin API has no "get by email" call, so
 * page through the (normally tiny) staff directory and match case-insensitively.
 */
async function findUserByEmail(email: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const target = email.trim().toLowerCase();
  const perPage = 1000;
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users ?? [];
    const match = users.find((u) => (u.email ?? "").toLowerCase() === target);
    if (match) return match;
    if (users.length < perPage) return null;
  }
  return null;
}

/**
 * Public: an administrator who forgot their password asks for a recovery email.
 * Resolves the account and confirms it holds the `admin` role before asking
 * Supabase to send the link, so raising a request can never reveal a mailbox or
 * trigger a reset for a non-administrator. Always answers the same way.
 */
export const requestAdminPasswordReset = createServerFn({ method: "POST" })
  .validator(
    z.object({
      email: z.string().trim().toLowerCase().email().max(254),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const user = await findUserByEmail(data.email);
      // Unknown email: stop, but answer exactly as a successful send would.
      if (!user) return { ok: true as const };

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: roles } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (!(roles ?? []).some((r) => r.role === "admin")) return { ok: true as const };

      // Send the reader back to this deployment's own reset page.
      const { getRequestUrl } = await import("@tanstack/react-start/server");
      const redirectTo = new URL("/reset-password", getRequestUrl()).toString();

      const { error } = await supabaseAdmin.auth.resetPasswordForEmail(user.email ?? data.email, {
        redirectTo,
      });
      if (error) console.error("[password-reset] recovery email failed", error.message);
    } catch (err) {
      // Delivery problems stay server-side; the public form never learns them.
      console.error("[password-reset] admin recovery failed", err);
    }
    return { ok: true as const };
  });
