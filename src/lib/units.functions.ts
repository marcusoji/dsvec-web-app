import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type PublicUnit = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  description: string;
  skills: string[];
  careers: string[];
  requirements: string[];
  duration: string | null;
  image_url: string | null;
  icon: string | null;
};

const UNIT_COLUMNS =
  "id, slug, name, summary, description, skills, careers, requirements, duration, image_url, icon";

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const listUnits = createServerFn({ method: "GET" }).handler(async (): Promise<PublicUnit[]> => {
  const { data, error } = await publicClient()
    .from("units")
    .select(UNIT_COLUMNS)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("[units] list failed", error.message);
    return [];
  }
  return (data ?? []) as PublicUnit[];
});

export const getUnitBySlug = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => ({ slug: String(data.slug).slice(0, 120) }))
  .handler(async ({ data }): Promise<PublicUnit | null> => {
    const { data: row, error } = await publicClient()
      .from("units")
      .select(UNIT_COLUMNS)
      .eq("slug", data.slug)
      .eq("is_active", true)
      .maybeSingle();
    if (error) {
      console.error("[units] get failed", error.message);
      return null;
    }
    return (row as PublicUnit) ?? null;
  });
