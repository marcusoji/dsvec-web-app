import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdmin, requirePermission, type AdminAuthContext } from "./admin-auth";
import {
  APPLICANT_CSV_COLUMNS,
  formatDate,
  formatDateTime,
  fullName,
  titleCase,
  toCsv,
} from "./admin-csv";
import type { Permission, StaffRole } from "./permissions";

export type AdminRole = StaffRole;
export const STATUSES = [
  "submitted",
  "under_review",
  "shortlisted",
  "admitted",
  "rejected",
  "graduated",
] as const;
/** Includes the retired "withdrawn" value so older rows still type-check. */
export type ApplicationStatus = (typeof STATUSES)[number] | "withdrawn";

/**
 * Accepted by status filters and exports. The retired `withdrawn` value is
 * still readable so old records can be filtered and purged, but it is never
 * offered as a status a staff member can set.
 */
const FILTER_STATUSES = [...STATUSES, "withdrawn"] as const;

/** Alternate row orderings offered by the applicants list and its export. */
export const SORT_ORDERS = ["name_asc", "name_desc"] as const;
export type ApplicantSort = (typeof SORT_ORDERS)[number];

export type AdminUser = {
  userId: string;
  email: string | null;
  role: AdminRole;
  permissions: readonly Permission[];
  mustChangePassword: boolean;
  /** Trade unit for department-scoped staff; `null` for admins and unassigned. */
  unitId: string | null;
  unitName: string | null;
};

function adminOf(context: unknown): AdminAuthContext["admin"] {
  return (context as { admin: AdminAuthContext["admin"] }).admin;
}

/** Staff profile fields the portal reads. `unit_id` is absent until the
 * staff-department migration runs, so every read below tolerates its absence. */
export type StaffProfileRow = {
  user_id: string;
  full_name: string | null;
  must_change_password: boolean;
  unit_id: string | null;
};

/**
 * Loads one staff profile row.
 *
 * A database that predates the staff-department migration must not look like a
 * missing profile: doing so previously reset every account into the forced
 * password-change flow, and no amount of changing the password could clear it.
 */
export async function readStaffProfile(userId: string): Promise<StaffProfileRow | null> {
  const { data, error } = await supabaseAdmin
    .from("staff_profiles")
    .select("user_id, full_name, must_change_password, unit_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!error) return data;

  const legacy = await supabaseAdmin
    .from("staff_profiles")
    .select("user_id, full_name, must_change_password")
    .eq("user_id", userId)
    .maybeSingle();
  if (legacy.error) {
    console.error("[admin] staff profile lookup failed", legacy.error.message);
    throw new Error("Could not read your staff profile. Please contact the portal administrator.");
  }

  console.error(
    "[admin] staff profile read degraded (has the staff-department migration run?)",
    error.message,
  );
  return legacy.data ? { ...legacy.data, unit_id: null } : null;
}

/** Bulk variant of {@link readStaffProfile} for the staff directory. */
export async function readStaffProfiles(): Promise<StaffProfileRow[]> {
  const { data, error } = await supabaseAdmin
    .from("staff_profiles")
    .select("user_id, full_name, must_change_password, unit_id");
  if (!error) return data ?? [];

  const legacy = await supabaseAdmin
    .from("staff_profiles")
    .select("user_id, full_name, must_change_password");
  if (legacy.error) {
    console.error("[admin] staff profile list failed", legacy.error.message);
    return [];
  }

  console.error(
    "[admin] staff profile list degraded (has the staff-department migration run?)",
    error.message,
  );
  return (legacy.data ?? []).map((row) => ({ ...row, unit_id: null }));
}

/** Append an attributable entry to the audit trail. Never throws. */
async function audit(
  admin: AdminAuthContext["admin"],
  event_type: string,
  detail: string,
  applicant?: { id?: string; application_number?: string | null },
) {
  try {
    await supabaseAdmin.from("activity_log").insert({
      event_type,
      detail,
      actor_user_id: admin.userId,
      actor_email: admin.email,
      applicant_id: applicant?.id ?? null,
      application_number: applicant?.application_number ?? null,
    });
  } catch {
    /* auditing must never break the operation it records */
  }
}

// ---------------------------------------------------------------------------
// Session / user
// ---------------------------------------------------------------------------

export const getUser = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<AdminUser> => {
    const admin = adminOf(context);
    const profile = await readStaffProfile(admin.userId);

    // Only create a row when the read genuinely found nothing. A failed read
    // already threw above, so it can never be mistaken for an absent profile.
    if (!profile) {
      const { error: insertError } = await supabaseAdmin
        .from("staff_profiles")
        .insert({ user_id: admin.userId, must_change_password: true });
      if (insertError) {
        console.error("[admin] staff profile insert failed", insertError.message);
      }
    }

    const unitId = admin.role === "admin" ? null : (profile?.unit_id ?? null);
    let unitName: string | null = null;
    if (unitId) {
      const { data: unit } = await supabaseAdmin
        .from("units")
        .select("name")
        .eq("id", unitId)
        .maybeSingle();
      unitName = unit?.name ?? null;
    }

    return {
      userId: admin.userId,
      email: admin.email,
      role: admin.role,
      permissions: admin.permissions,
      mustChangePassword: profile ? profile.must_change_password : true,
      unitId,
      unitName,
    };
  });

/** Called after the user successfully changes their password client-side. */
export const confirmPasswordChanged = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const admin = adminOf(context);
    await supabaseAdmin.from("staff_profiles").upsert(
      {
        user_id: admin.userId,
        must_change_password: false,
        password_changed_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    await audit(admin, "password_changed", `Password changed by ${admin.email ?? admin.userId}`);
    return { ok: true as const };
  });

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

export type AdminStats = {
  total: number;
  today: number;
  this_week: number;
  this_month: number;
  this_year: number;
  pending: number;
  completed: number;
  per_year: Array<{ year: number; count: number }>;
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

/** `2026` → `[2026-01-01T00:00:00+01:00, 2027-01-01T00:00:00+01:00)` in Lagos time. */
export function yearBounds(year: number): [string, string] {
  return [`${year}-01-01T00:00:00+01:00`, `${year + 1}-01-01T00:00:00+01:00`];
}

/** Calendar year (Lagos time) of an ISO timestamp. */
function yearForDate(iso: string): number {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return new Date().getFullYear();
  return Number(
    new Intl.DateTimeFormat("en-GB", { year: "numeric", timeZone: "Africa/Lagos" }).format(d),
  );
}

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
  .middleware([requirePermission("applicants.read")])
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

    // Per-year counts (Lagos calendar years).
    const yearCounts = new Map<number, number>();
    const { data: yearRows } = await supabaseAdmin.from("applicants").select("created_at");
    for (const row of yearRows ?? []) {
      const year = yearForDate(row.created_at);
      yearCounts.set(year, (yearCounts.get(year) ?? 0) + 1);
    }

    const now = new Date();
    const [thisYearStart, thisYearEnd] = yearBounds(now.getFullYear());
    const { count: thisYearCount } = await supabaseAdmin
      .from("applicants")
      .select("id", { count: "exact", head: true })
      .gte("created_at", thisYearStart)
      .lt("created_at", thisYearEnd);

    return {
      total: total.count ?? 0,
      today: today.count ?? 0,
      this_week: week.count ?? 0,
      this_month: month.count ?? 0,
      this_year: thisYearCount ?? 0,
      pending,
      completed,
      per_year: [...yearCounts.entries()]
        .map(([year, count]) => ({ year, count }))
        .sort((a, b) => b.year - a.year),
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
  stream: string;
  created_at: string;
  access_token: string | null;
};

const listInputSchema = z.object({
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(5).max(100).default(20),
  search: z.string().trim().max(120).optional(),
  unit_id: z.string().uuid().optional(),
  status: z.enum(FILTER_STATUSES).optional(),
  year: z.number().int().min(2000).max(2100).optional(),
  stream: z.enum(["1", "2"]).optional(),
  sort: z.enum(SORT_ORDERS).optional(),
});
type ListInput = z.infer<typeof listInputSchema>;

export type ApplicantListResult = {
  rows: ApplicantRow[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
  units: Array<{ id: string; name: string }>;
  years: number[];
};

/**
 * PostgREST types `.order()` against the concrete select's column union, which
 * cannot be expressed as a generic constraint — hence the structural shape.
 */
type OrderableQuery = {
  order(column: string, options: { ascending: boolean; nullsFirst?: boolean }): OrderableQuery;
};

/**
 * Shared ordering for the applicant list and its CSV export so a file always
 * matches the rows staff see on screen. Alphabetical ordering keys off the same
 * name fields the UI displays.
 */
function applyApplicantOrder<Q>(query: Q, sort?: ApplicantSort): Q {
  const q = query as unknown as OrderableQuery;
  const ascending = sort === "name_asc";

  const ordered =
    sort === "name_asc" || sort === "name_desc"
      ? q
          .order("last_name", { ascending, nullsFirst: false })
          .order("first_name", { ascending, nullsFirst: false })
          .order("middle_name", { ascending, nullsFirst: false })
          .order("application_number", { ascending: true })
      : // Default: newest first, then by the immutable application number so
        // repeat queries produce an identical order.
        q
          .order("created_at", { ascending: false })
          .order("application_number", { ascending: true });

  return ordered as unknown as Q;
}

export const listApplicants = createServerFn({ method: "POST" })
  .middleware([requirePermission("applicants.read")])
  .validator(listInputSchema)
  .handler(async ({ data }): Promise<ApplicantListResult> => {
    const { page, per_page, search, unit_id, status, year, stream, sort } = data;
    const fromRow = (page - 1) * per_page;

    let query = supabaseAdmin
      .from("applicants")
      .select(
        "id, application_number, first_name, middle_name, last_name, email, phone, unit_id, status, stream, created_at, access_token, units(name)",
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
    if (stream) query = query.eq("stream", stream);
    if (year) {
      const [start, end] = yearBounds(year);
      query = query.gte("created_at", start).lt("created_at", end);
    }

    const {
      data: rows,
      count,
      error,
    } = await applyApplicantOrder(query, sort).range(fromRow, fromRow + per_page - 1);
    if (error) throw new Error("Could not load applicants");

    const { data: units } = await supabaseAdmin
      .from("units")
      .select("id, name")
      .eq("is_active", true)
      .order("name", { ascending: true });

    const { data: yearRows } = await supabaseAdmin.from("applicants").select("created_at");
    const yearSet = new Set<number>();
    for (const r of yearRows ?? []) yearSet.add(yearForDate(r.created_at));
    const years = [...yearSet].sort((a, b) => b - a);

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
      stream: string;
      created_at: string;
      access_token: string | null;
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
          stream: raw.stream ?? "1",
          created_at: raw.created_at,
          access_token: raw.access_token ?? null,
        } satisfies ApplicantRow;
      }),
      total: count ?? 0,
      page,
      per_page,
      pages: Math.max(1, Math.ceil((count ?? 0) / per_page)),
      units: (units ?? []).map((u) => ({ id: u.id, name: u.name })),
      years,
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
  access_token: string | null;
};

export const getApplicantDetail = createServerFn({ method: "GET" })
  .middleware([requirePermission("applicants.read")])
  .inputValidator((data: { id: string }) => ({ id: String(data.id).slice(0, 40) }))
  .handler(async ({ data }): Promise<ApplicantDetail | null> => {
    const { data: row } = await supabaseAdmin
      .from("applicants")
      .select(
        "id, application_number, first_name, middle_name, last_name, email, phone, date_of_birth, gender, nationality, state, local_government, address, status, admin_notes, created_at, access_token, units(name)",
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
      access_token: row.access_token ?? null,
    };
  });

// ---------------------------------------------------------------------------
// Status update
// ---------------------------------------------------------------------------

export const updateApplicationStatus = createServerFn({ method: "POST" })
  .middleware([requirePermission("applicants.status.update")])
  .validator(
    z.object({
      id: z.string().uuid(),
      // The retired `withdrawn` value is accepted only so a legacy record can be
      // re-saved unchanged; the UI never offers it as a new choice.
      status: z.enum(FILTER_STATUSES),
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

    await audit(
      admin,
      "status_updated",
      `Status changed from ${existing.status} to ${data.status}`,
      { id: data.id, application_number: existing.application_number },
    );

    return { ok: true as const, status: data.status };
  });

// ---------------------------------------------------------------------------
// CSV export (returns CSV text; client builds a downloadable blob)
// ---------------------------------------------------------------------------

const csvInputSchema = z.object({
  unit_id: z.string().uuid().optional(),
  status: z.enum(FILTER_STATUSES).optional(),
  year: z.number().int().min(2000).max(2100).optional(),
  stream: z.enum(["1", "2"]).optional(),
  sort: z.enum(SORT_ORDERS).optional(),
});

export const exportApplicantsCsv = createServerFn({ method: "POST" })
  .middleware([requirePermission("applicants.export")])
  .validator(csvInputSchema)
  .handler(async ({ data, context }): Promise<string> => {
    const admin = adminOf(context);

    let query = supabaseAdmin
      .from("applicants")
      .select(
        "application_number, first_name, middle_name, last_name, email, phone, gender, date_of_birth, nationality, state, local_government, address, status, stream, created_at, units(name)",
      );

    if (data.unit_id) query = query.eq("unit_id", data.unit_id);
    if (data.status) query = query.eq("status", data.status);
    if (data.stream) query = query.eq("stream", data.stream);
    if (data.year) {
      const [start, end] = yearBounds(data.year);
      query = query.gte("created_at", start).lt("created_at", end);
    }

    const { data: rows, error } = await applyApplicantOrder(query, data.sort);
    if (error) throw new Error("Could not export applicants");

    const body = (rows ?? []).map((r) => {
      const unit = r.units as unknown as { name?: string } | null;
      return [
        r.application_number,
        fullName(r.first_name, r.middle_name, r.last_name),
        r.email,
        r.phone,
        titleCase(r.gender),
        formatDate(r.date_of_birth),
        r.nationality,
        r.state,
        r.local_government,
        r.address,
        unit?.name ?? "",
        r.stream === "2" ? "Stream 2" : "Stream 1",
        titleCase(r.status),
        formatDateTime(r.created_at),
      ];
    });

    await audit(admin, "applicants_exported", `Exported ${body.length} applicant record(s) to CSV`);

    return toCsv(APPLICANT_CSV_COLUMNS, body);
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
  .middleware([requirePermission("audit.read")])
  .handler(async ({ context }): Promise<DuplicateRow[]> => {
    const { data } = await supabaseAdmin
      .from("activity_log")
      .select("id, application_number, email_masked, phone_masked, detail, created_at")
      .eq("event_type", "duplicate_attempt")
      .order("created_at", { ascending: false })
      .limit(200);

    await audit(adminOf(context), "duplicates_viewed", "Viewed the duplicate-attempt audit");
    return (data ?? []) as DuplicateRow[];
  });

// ---------------------------------------------------------------------------
// Audit trail
// ---------------------------------------------------------------------------

export type AuditRow = {
  id: number;
  event_type: string;
  detail: string | null;
  actor_email: string | null;
  actor_user_id: string | null;
  applicant_id: string | null;
  application_number: string | null;
  created_at: string;
};

export const listAuditLog = createServerFn({ method: "POST" })
  .middleware([requirePermission("audit.read")])
  .validator(
    z.object({
      event_type: z.string().trim().max(60).optional(),
      limit: z.number().int().min(10).max(500).default(200),
    }),
  )
  .handler(async ({ data }): Promise<AuditRow[]> => {
    let query = supabaseAdmin
      .from("activity_log")
      .select(
        "id, event_type, detail, actor_email, actor_user_id, applicant_id, application_number, created_at",
      )
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(data.limit);

    if (data.event_type) query = query.eq("event_type", data.event_type);

    const { data: rows, error } = await query;
    if (error) throw new Error("Could not load the audit log");
    return (rows ?? []) as AuditRow[];
  });

// ---------------------------------------------------------------------------
// Stale applications: not admitted 60+ days after submission
// ---------------------------------------------------------------------------

export const STALE_DAYS = 60;

export const deleteApplicants = createServerFn({ method: "POST" })
  .middleware([requirePermission("applicants.manage")])
  .validator(z.object({ ids: z.array(z.string().uuid()).min(1).max(5000) }))
  .handler(async ({ data, context }) => {
    const { data: rows } = await supabaseAdmin
      .from("applicants")
      .select("id, application_number, status")
      .in("id", data.ids)
      .not("status", "in", "(admitted,graduated)");
    return purgeApplicants(adminOf(context), rows ?? [], "applicant_deleted");
  });

/** Removes applicants plus their photos, documents and scores. Audit rows are kept. */
async function purgeApplicants(
  admin: AdminAuthContext["admin"],
  rows: { id: string; application_number: string; status: string }[],
  event: string,
) {
  const ids = rows.map((r) => r.id);
  if (!ids.length) return { deleted: 0 };
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const { data: docs } = await supabaseAdmin
      .from("applicant_documents")
      .select("bucket, storage_path")
      .in("applicant_id", chunk);
    const byBucket = new Map<string, string[]>();
    for (const d of docs ?? []) {
      byBucket.set(d.bucket, [...(byBucket.get(d.bucket) ?? []), d.storage_path]);
    }
    for (const [bucket, paths] of byBucket) {
      await supabaseAdmin.storage.from(bucket).remove(paths);
    }
    await supabaseAdmin.from("applicant_documents").delete().in("applicant_id", chunk);
    await supabaseAdmin.from("applicant_scores").delete().in("applicant_id", chunk);
    await supabaseAdmin
      .from("activity_log")
      .update({ applicant_id: null })
      .in("applicant_id", chunk);
    const { error } = await supabaseAdmin.from("applicants").delete().in("id", chunk);
    if (error) throw new Error("Could not delete the selected applications");
  }
  for (const r of rows) {
    await audit(admin, event, `Deleted ${r.status} application`, {
      application_number: r.application_number,
    });
  }
  return { deleted: ids.length };
}

// ---------------------------------------------------------------------------
// Free-plan storage watch and archive cleanup
// ---------------------------------------------------------------------------

export const DB_LIMIT_BYTES = 350 * 1024 * 1024;
export const BUCKET_LIMIT_BYTES = 700 * 1024 * 1024;

export type StorageUsage = {
  db_bytes: number;
  bucket_bytes: number;
  db_limit: number;
  bucket_limit: number;
  /** True when the `storage_usage` migration has not been applied yet. */
  unavailable: boolean;
  over_limit: boolean;
};

export const getStorageUsage = createServerFn({ method: "GET" })
  .middleware([requirePermission("applicants.manage")])
  .handler(async (): Promise<StorageUsage> => {
    const empty: StorageUsage = {
      db_bytes: 0,
      bucket_bytes: 0,
      db_limit: DB_LIMIT_BYTES,
      bucket_limit: BUCKET_LIMIT_BYTES,
      unavailable: true,
      over_limit: false,
    };

    const { data, error } = await supabaseAdmin.rpc("storage_usage");
    if (error) {
      // A database that predates the migration must degrade to "unknown"
      // rather than crash the whole clean-up panel.
      console.error("[admin] storage_usage unavailable", error.message);
      return empty;
    }

    const row = (Array.isArray(data) ? data[0] : data) as
      { db_bytes: number; bucket_bytes: number } | undefined;
    const db = Number(row?.db_bytes ?? 0);
    const bucket = Number(row?.bucket_bytes ?? 0);
    return {
      db_bytes: db,
      bucket_bytes: bucket,
      db_limit: DB_LIMIT_BYTES,
      bucket_limit: BUCKET_LIMIT_BYTES,
      unavailable: false,
      over_limit: db >= DB_LIMIT_BYTES || bucket >= BUCKET_LIMIT_BYTES,
    };
  });

/** Start of the stream running today (Stream 1: Jan–Jun, Stream 2: Jul–Dec), Lagos time. */
function currentStreamStart(): string {
  const now = new Date(Date.now() + 3_600_000);
  const month = now.getUTCMonth() < 6 ? 0 : 6;
  return new Date(Date.UTC(now.getUTCFullYear(), month, 1) - 3_600_000).toISOString();
}

export type ArchiveRow = {
  id: string;
  application_number: string;
  full_name: string;
  email: string;
  phone: string;
  gender: string;
  date_of_birth: string;
  state: string;
  local_government: string;
  address: string;
  next_of_kin: string;
  school: string;
  qualification: string;
  unit: string;
  stream: string;
  status: string;
  test_score: number | null;
  exam_score: number | null;
  applied_on: string;
};

const ARCHIVE_SELECT =
  "id, application_number, first_name, middle_name, last_name, email, phone, gender, date_of_birth, state, local_government, address, next_of_kin_name, next_of_kin_relationship, next_of_kin_phone, school, qualification, stream, status, created_at, units(name), applicant_scores(test_score, exam_score)";

type ArchiveRawRow = {
  id: string;
  application_number: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  email: string;
  phone: string;
  gender: string;
  date_of_birth: string;
  state: string;
  local_government: string;
  address: string;
  next_of_kin_name: string | null;
  next_of_kin_relationship: string | null;
  next_of_kin_phone: string | null;
  school: string | null;
  qualification: string | null;
  stream: string;
  status: string;
  created_at: string;
  units: { name?: string } | null;
  applicant_scores:
    | { test_score: number | null; exam_score: number | null }
    | { test_score: number | null; exam_score: number | null }[]
    | null;
};

function mapArchiveRows(rows: unknown[]): ArchiveRow[] {
  return (rows as unknown as ArchiveRawRow[]).map((a) => {
    const scores = Array.isArray(a.applicant_scores) ? a.applicant_scores[0] : a.applicant_scores;
    return {
      id: a.id,
      application_number: a.application_number,
      full_name: fullName(a.first_name, a.middle_name, a.last_name),
      email: a.email,
      phone: a.phone,
      gender: a.gender,
      date_of_birth: formatDate(a.date_of_birth),
      state: a.state,
      local_government: a.local_government,
      address: a.address,
      next_of_kin: [a.next_of_kin_name, a.next_of_kin_relationship, a.next_of_kin_phone]
        .filter(Boolean)
        .join(" · "),
      school: a.school ?? "",
      qualification: a.qualification ?? "",
      unit: a.units?.name ?? "",
      stream: a.stream === "2" ? "Stream 2" : "Stream 1",
      status: titleCase(a.status),
      test_score: scores?.test_score ?? null,
      exam_score: scores?.exam_score ?? null,
      applied_on: formatDateTime(a.created_at),
    };
  });
}

/**
 * Past records: graduated, rejected or withdrawn applications, plus anything
 * from an earlier stream that never got admitted. Current students are kept.
 */
export const listArchiveCandidates = createServerFn({ method: "GET" })
  .middleware([requirePermission("applicants.manage")])
  .handler(async (): Promise<ArchiveRow[]> => {
    const start = currentStreamStart();
    const { data, error } = await supabaseAdmin
      .from("applicants")
      .select(ARCHIVE_SELECT)
      .or(
        `status.in.(graduated,rejected,withdrawn),and(created_at.lt.${start},status.neq.admitted)`,
      )
      .order("created_at", { ascending: true })
      .limit(5000);
    if (error) throw new Error("Could not load past records");
    return mapArchiveRows(data ?? []);
  });

/**
 * The same past records, narrowed to those a {@link STALE_DAYS}-day prompt is
 * about, with their full details so the operator can export before deleting.
 */
export const listStaleArchiveRows = createServerFn({ method: "GET" })
  .middleware([requirePermission("applicants.manage")])
  .handler(async (): Promise<ArchiveRow[]> => {
    const cutoff = new Date(Date.now() - STALE_DAYS * 86_400_000).toISOString();
    const { data, error } = await supabaseAdmin
      .from("applicants")
      .select(ARCHIVE_SELECT)
      .not("status", "in", "(admitted,graduated)")
      .lt("created_at", cutoff)
      .order("created_at", { ascending: true })
      .limit(5000);
    if (error) throw new Error("Could not load old applications");
    return mapArchiveRows(data ?? []);
  });

export const deleteArchivedRecords = createServerFn({ method: "POST" })
  .middleware([requirePermission("applicants.manage")])
  .validator(z.object({ ids: z.array(z.string().uuid()).min(1).max(5000) }))
  .handler(async ({ data, context }) => {
    const start = currentStreamStart();
    const rows: { id: string; application_number: string; status: string; created_at: string }[] =
      [];
    for (let i = 0; i < data.ids.length; i += 200) {
      const { data: part } = await supabaseAdmin
        .from("applicants")
        .select("id, application_number, status, created_at")
        .in("id", data.ids.slice(i, i + 200))
        .neq("status", "admitted");
      rows.push(...(part ?? []));
    }
    // Re-check on the server: only past records may be removed.
    const eligible = rows.filter(
      (r) => ["graduated", "rejected", "withdrawn"].includes(r.status) || r.created_at < start,
    );
    return purgeApplicants(adminOf(context), eligible, "archive_cleanup");
  });
