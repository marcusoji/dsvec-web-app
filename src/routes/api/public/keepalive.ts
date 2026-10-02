import { createFileRoute } from "@tanstack/react-router";

/**
 * Tiny read so the database records activity. Called twice a week by a
 * scheduler so a free-plan database is never idle long enough to pause.
 * Returns no data beyond a status flag.
 */
export const Route = createFileRoute("/api/public/keepalive")({
  server: {
    handlers: {
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.from("units").select("id").limit(1);
        return Response.json(
          { ok: !error, at: new Date().toISOString() },
          { status: error ? 503 : 200, headers: { "cache-control": "no-store" } },
        );
      },
    },
  },
});
