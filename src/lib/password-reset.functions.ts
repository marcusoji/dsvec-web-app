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
