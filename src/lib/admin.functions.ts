import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdmin, type AdminAuthContext } from "./admin-auth";

export type AdminRole = "admin" | "staff";
export const STATUSES = [
  "submitted",
  "under_review",
  "shortlisted",
  "admitted",
  "rejected",
  "withdrawn",
] as const;
export type ApplicationStatus = (typeof STATUSES)[number];

export type AdminUser = {
  userId: string;
  email: string | null;
  role: AdminRole;
};

function adminOf(context: unknown): AdminAuthContext["admin"] {
  return (context as { admin: AdminAuthContext["admin"] }).admin;
}

// ---------------------------------------------------------------------------
// Session / user
// ---------------------------------------------------------------------------

export const getUser = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<AdminUser> => {
    const admin = adminOf(context);
    return { userId: admin.userId, email: admin.email, role: admin.role };
  });

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

export type AdminStats = {
  total: number;
  today: number;
  this_week: number;
  this_month: number;
  pending: number;
  completed: number;
  per_unit: Array<{ unit_name: string; count: number }>;
  by_status: Array<{ status: ApplicationStatus; count: number }>;
  recent: Array<{
    id: string;
    application_number: string;
    full_name: string;
    unit_name: string;
    created_at: string;
    status: ApplicationStatus;
  }>;
};

function startOfDay(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
function startOfWeek(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString();
}
function startOfMonth(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  return d.toISOString();
}

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<AdminStats> => {
    const [total, today, week, month, unitsRows, recentRows] = await Promise.all([
      supabaseAdmin.from("applicants").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("applicants")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startOfDay()),
      supabaseAdmin
        .from("applicants")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startOfWeek()),
      supabaseAdmin
        .from("applicants")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startOfMonth()),
      supabaseAdmin.from("units").select("id, name, is_active").eq("is_active", true),
      supabaseAdmin
        .from("applicants")
        .select(
          "id, application_number, first_name, middle_name, last_name, created_at, status, units(name)",
        )
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    // Status breakdown (single status column read, tallied here for accuracy).
    const statusCounts = new Map<ApplicationStatus, number>();
    for (const status of STATUSES) statusCounts.set(status, 0);
    const { data: statusRows } = await supabaseAdmin.from("applicants").select("status");
    for (const row of statusRows ?? []) {
      const s = row.status as ApplicationStatus;
      statusCounts.set(s, (statusCounts.get(s) ?? 0) + 1);
    }
    const by_status = STATUSES.map((status) => ({ status, count: statusCounts.get(status) ?? 0 }));

    // Per-unit counts
    const per_unit: Array<{ unit_name: string; count: number }> = [];
    for (const unit of unitsRows.data ?? []) {
      const { count } = await supabaseAdmin
        .from("applicants")
        .select("id", { count: "exact", head: true })
        .eq("unit_id", unit.id);
      per_unit.push({ unit_name: unit.name, count: count ?? 0 });
    }
    per_unit.sort((a, b) => b.count - a.count);

    const recent = (recentRows.data ?? []).map((r) => {
      const unit = r.units as unknown as { name?: string } | null;
      return {
        id: r.id,
        application_number: r.application_number,
        full_name: [r.first_name, r.middle_name, r.last_name].filter(Boolean).join(" "),
        unit_name: unit?.name ?? "—",
        created_at: r.created_at,
        status: r.status,
      };
    });

    const pending = (statusCounts.get("submitted") ?? 0) + (statusCounts.get("under_review") ?? 0);
    const completed = (statusCounts.get("admitted") ?? 0) + (statusCounts.get("shortlisted") ?? 0);

    return {
      total: total.count ?? 0,
      today: today.count ?? 0,
      this_week: week.count ?? 0,
      this_month: month.count ?? 0,
      pending,
      completed,
      per_unit,
      by_status,
      recent,
    };
  });

// ---------------------------------------------------------------------------
// Applicant listing
// ---------------------------------------------------------------------------

export type ApplicantRow = {
  id: string;
  application_number: string;
  full_name: string;
  email: string;
  phone: string;
  unit_name: string;
  unit_id: string;
  status: ApplicationStatus;
  created_at: string;
};

const listInputSchema = z.object({
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(5).max(100).default(20),
  search: z.string().trim().max(120).optional(),
  unit_id: z.string().uuid().optional(),
  status: z.enum(STATUSES).optional(),
});
type ListInput = z.infer<typeof listInputSchema>;

export type ApplicantListResult = {
  rows: ApplicantRow[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
  units: Array<{ id: string; name: string }>;
};

export const listApplicants = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(listInputSchema)
  .handler(async ({ data }): Promise<ApplicantListResult> => {
    const { page, per_page, search, unit_id, status } = data;
    const fromRow = (page - 1) * per_page;

    let query = supabaseAdmin
      .from("applicants")
      .select(
        "id, application_number, first_name, middle_name, last_name, email, phone, unit_id, status, created_at, units(name)",
        { count: "exact" },
      );

    if (search && search.trim().length > 0) {
      const term = search.trim();
      query = query.or(
        `application_number.ilike.%${term}%,first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`,
      );
    }
    if (unit_id) query = query.eq("unit_id", unit_id);
    if (status) query = query.eq("status", status);

    const {
      data: rows,
      count,
      error,
    } = await query
      .order("created_at", { ascending: false })
      .range(fromRow, fromRow + per_page - 1);
    if (error) throw new Error("Could not load applicants");

    const { data: units } = await supabaseAdmin
      .from("units")
      .select("id, name")
      .eq("is_active", true)
      .order("name", { ascending: true });

    type RawRow = {
      id: string;
      application_number: string;
      first_name: string;
      middle_name: string | null;
      last_name: string;
      email: string;
      phone: string;
      unit_id: string;
      status: ApplicationStatus;
      created_at: string;
      units: { name?: string } | null;
    };

    return {
      rows: (rows ?? []).map((r) => {
        const raw = r as unknown as RawRow;
        const unit = raw.units;
        return {
          id: raw.id,
          application_number: raw.application_number,
          full_name: [raw.first_name, raw.middle_name, raw.last_name].filter(Boolean).join(" "),
          email: raw.email,
          phone: raw.phone,
          unit_id: raw.unit_id,
          unit_name: unit?.name ?? "—",
          status: raw.status,
          created_at: raw.created_at,
        } satisfies ApplicantRow;
      }),
      total: count ?? 0,
      page,
      per_page,
      pages: Math.max(1, Math.ceil((count ?? 0) / per_page)),
      units: (units ?? []).map((u) => ({ id: u.id, name: u.name })),
    };
  });

// ---------------------------------------------------------------------------
// Applicant detail
// ---------------------------------------------------------------------------

export type ApplicantDetail = {
  id: string;
  application_number: string;
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  nationality: string;
  state: string;
  local_government: string;
  address: string;
  status: ApplicationStatus;
  admin_notes: string | null;
  created_at: string;
  unit_name: string;
  photo_url: string | null;
};

export const getApplicantDetail = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .inputValidator((data: { id: string }) => ({ id: String(data.id).slice(0, 40) }))
  .handler(async ({ data }): Promise<ApplicantDetail | null> => {
    const { data: row } = await supabaseAdmin
      .from("applicants")
      .select(
        "id, application_number, first_name, middle_name, last_name, email, phone, date_of_birth, gender, nationality, state, local_government, address, status, admin_notes, created_at, units(name)",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (!row) return null;

    const unit = row.units as unknown as { name?: string } | null;

    const { data: doc } = await supabaseAdmin
      .from("applicant_documents")
      .select("storage_path")
      .eq("applicant_id", row.id)
      .eq("kind", "photograph")
      .maybeSingle();

    let photo_url: string | null = null;
    if (doc?.storage_path) {
      const { data: signed } = await supabaseAdmin.storage
        .from("applicant-photos")
        .createSignedUrl(doc.storage_path, 60 * 30);
      photo_url = signed?.signedUrl ?? null;
    }

    return {
      id: row.id,
      application_number: row.application_number,
      full_name: [row.first_name, row.middle_name, row.last_name].filter(Boolean).join(" "),
      email: row.email,
      phone: row.phone,
      date_of_birth: row.date_of_birth,
      gender: row.gender,
      nationality: row.nationality,
      state: row.state,
      local_government: row.local_government,
      address: row.address,
      status: row.status,
      admin_notes: row.admin_notes,
      created_at: row.created_at,
      unit_name: unit?.name ?? "—",
      photo_url,
    };
  });

// ---------------------------------------------------------------------------
// Status update
// ---------------------------------------------------------------------------

export const updateApplicationStatus = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(
    z.object({
      id: z.string().uuid(),
      status: z.enum(STATUSES),
      notes: z.string().trim().max(2000).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const admin = adminOf(context);

    const { data: existing } = await supabaseAdmin
      .from("applicants")
      .select("application_number, status")
      .eq("id", data.id)
      .maybeSingle();
    if (!existing) throw new Error("Applicant not found");

    const changes: {
      status: ApplicationStatus;
      admin_notes: string | null;
    } = {
      status: data.status,
      admin_notes: data.notes !== undefined ? data.notes.trim() : null,
    };

    const { error } = await supabaseAdmin.from("applicants").update(changes).eq("id", data.id);
    if (error) throw new Error("Could not update the application");

    await supabaseAdmin.from("activity_log").insert({
      event_type: "status_updated",
      applicant_id: data.id,
      application_number: existing.application_number,
      detail: `Status changed from ${existing.status} to ${data.status} by ${admin.email ?? admin.userId}`,
    });

    return { ok: true as const, status: data.status };
  });

// ---------------------------------------------------------------------------
// CSV export (returns CSV text; client builds a downloadable blob)
// ---------------------------------------------------------------------------

const csvInputSchema = z.object({
  unit_id: z.string().uuid().optional(),
  status: z.enum(STATUSES).optional(),
});

export const exportApplicantsCsv = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(csvInputSchema)
  .handler(async ({ data }): Promise<string> => {
    let query = supabaseAdmin
      .from("applicants")
      .select(
        "application_number, first_name, middle_name, last_name, email, phone, gender, date_of_birth, nationality, state, local_government, address, status, created_at, units(name)",
      )
      .order("created_at", { ascending: false });
    if (data.unit_id) query = query.eq("unit_id", data.unit_id);
    if (data.status) query = query.eq("status", data.status);

    const { data: rows } = await query;

    const headers = [
      "Application Number",
      "Full Name",
      "Email",
      "Phone",
      "Gender",
      "Date of Birth",
      "Nationality",
      "State",
      "LGA",
      "Address",
      "Selected Unit",
      "Status",
      "Applied Date",
    ];

    const esc = (value: unknown): string => {
      const s = value == null ? "" : String(value);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const lines = [headers.map(esc).join(",")];
    for (const r of rows ?? []) {
      const unit = r.units as unknown as { name?: string } | null;
      lines.push(
        [
          r.application_number,
          r.first_name,
          r.middle_name,
          r.last_name,
          r.email,
          r.phone,
          r.gender,
          r.date_of_birth,
          r.nationality,
          r.state,
          r.local_government,
          r.address,
          unit?.name,
          r.status,
          r.created_at,
        ]
          .map(esc)
          .join(","),
      );
    }
    return lines.join("\n");
  });

// ---------------------------------------------------------------------------
// Duplicate-attempt audit
// ---------------------------------------------------------------------------

export type DuplicateRow = {
  id: number;
  application_number: string | null;
  email_masked: string | null;
  phone_masked: string | null;
  detail: string | null;
  created_at: string;
};

export const listDuplicateAttempts = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<DuplicateRow[]> => {
    const { data } = await supabaseAdmin
      .from("activity_log")
      .select("id, application_number, email_masked, phone_masked, detail, created_at")
      .eq("event_type", "duplicate_attempt")
      .order("created_at", { ascending: false })
      .limit(200);
    return (data ?? []) as DuplicateRow[];
  });
