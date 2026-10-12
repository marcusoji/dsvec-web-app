import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { readStaffProfiles } from "./admin.functions";
import { requirePermission, type AdminAuthContext } from "./admin-auth";
import { ROLE_LABELS, requiresUnit, type StaffRole } from "./permissions";
import { MAX_SUBJECTS, MIN_SUBJECTS, splitMarks } from "./subjects";
import { emailSchema } from "./validation";

/** Subject count to fall back on when a unit row has not been given one. */
const DEFAULT_SUBJECTS = 2;

function adminOf(context: unknown): AdminAuthContext["admin"] {
  return (context as { admin: AdminAuthContext["admin"] }).admin;
}

/**
 * Resolves the unit a department-scoped caller may work within.
 *
 * Administrators pass an explicit `unitId` (or `null` for every department);
 * everyone else is pinned to their own profile assignment. An unassigned
 * non-admin resolves to `undefined`, which callers treat as "no access".
 */
function scopedUnitId(
  admin: AdminAuthContext["admin"],
  requested?: string | null,
): string | null | undefined {
  if (admin.role === "admin") return requested ?? null;
  return admin.unitId ?? undefined;
}

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

/**
 * Subject counts per unit. A unit row without `subject_count` (migration not
 * run yet) falls back to the two-subject default so the portal degrades instead
 * of failing to render a scoresheet.
 */
async function readUnitSubjectCounts(unitIds?: string[]): Promise<Map<string, number>> {
  let query = supabaseAdmin.from("units").select("id, subject_count");
  if (unitIds && unitIds.length > 0) query = query.in("id", unitIds);
  const { data, error } = await query;
  if (error) {
    console.error(
      "[students] unit subject counts unavailable (has the unit-subjects migration run?)",
      error.message,
    );
    return new Map();
  }
  const counts = new Map<string, number>();
  for (const row of (data ?? []) as Array<{ id: string; subject_count?: number | null }>) {
    counts.set(row.id, row.subject_count ?? DEFAULT_SUBJECTS);
  }
  return counts;
}

// ---------------------------------------------------------------------------
// Staff management (administrators only)
// ---------------------------------------------------------------------------

export type StaffMember = {
  userId: string;
  email: string | null;
  fullName: string | null;
  role: StaffRole;
  unitId: string | null;
  unitName: string | null;
  mustChangePassword: boolean;
  createdAt: string;
  lastSignInAt: string | null;
};

/** Supabase auth pages users in batches; walk them until one page comes up short. */
async function listAllAuthUsers() {
  const perPage = 200;
  const users: Array<{
    id: string;
    email?: string;
    created_at: string;
    last_sign_in_at?: string | null;
  }> = [];
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error("Could not list staff accounts");
    users.push(...data.users);
    if (data.users.length < perPage) break;
  }
  return users;
}

export const listStaff = createServerFn({ method: "GET" })
  .middleware([requirePermission("staff.manage")])
  .handler(async (): Promise<StaffMember[]> => {
    const [authUsers, roles, profiles, units] = await Promise.all([
      listAllAuthUsers(),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      readStaffProfiles(),
      supabaseAdmin.from("units").select("id, name"),
    ]);
    const unitNames = new Map((units.data ?? []).map((u) => [u.id, u.name]));
    const profileByUser = new Map(profiles.map((p) => [p.user_id, p]));
    const roleByUser = new Map((roles.data ?? []).map((r) => [r.user_id, r.role as StaffRole]));

    return authUsers
      .map((u) => {
        const profile = profileByUser.get(u.id);
        const role = roleByUser.get(u.id);
        if (!role) return null;
        const unitId = role === "admin" ? null : (profile?.unit_id ?? null);
        return {
          userId: u.id,
          email: u.email ?? null,
          fullName: profile?.full_name ?? null,
          role,
          unitId,
          unitName: unitId ? (unitNames.get(unitId) ?? null) : null,
          mustChangePassword: profile?.must_change_password ?? true,
          createdAt: u.created_at,
          lastSignInAt: u.last_sign_in_at ?? null,
        } satisfies StaffMember;
      })
      .filter((row): row is StaffMember => row !== null)
      .sort((a, b) => (a.fullName ?? a.email ?? "").localeCompare(b.fullName ?? b.email ?? ""));
  });

const createStaffSchema = z.object({
  email: emailSchema,
  full_name: z.string().trim().min(2).max(80),
  password: z
    .string()
    .min(10, "Use at least 10 characters")
    .max(72)
    .regex(/[A-Z]/, "Include an uppercase letter")
    .regex(/[a-z]/, "Include a lowercase letter")
    .regex(/\d/, "Include a number"),
  role: z.enum(["staff", "registrar", "reviewer"]),
  unit_id: z.string().uuid().optional(),
});

export const createStaff = createServerFn({ method: "POST" })
  .middleware([requirePermission("staff.manage")])
  .validator(createStaffSchema)
  .handler(async ({ data, context }): Promise<{ userId: string }> => {
    const caller = adminOf(context);

    if (requiresUnit(data.role) && !data.unit_id) {
      throw new Error("Assign a department for this role");
    }

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (error || !created.user) {
      throw new Error(error?.message ?? "Could not create the staff account");
    }
    const userId = created.user.id;

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: data.role });
    if (roleError) {
      // Roll back the orphaned auth user so the admin can retry cleanly.
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error("Could not assign the staff role");
    }

    const { error: profileError } = await supabaseAdmin.from("staff_profiles").upsert(
      {
        user_id: userId,
        full_name: data.full_name,
        unit_id: requiresUnit(data.role) ? (data.unit_id ?? null) : null,
        must_change_password: true,
      },
      { onConflict: "user_id" },
    );
    if (profileError) throw new Error("Could not save the staff profile");

    await audit(
      caller,
      "staff_created",
      `Created ${ROLE_LABELS[data.role]} account for ${data.email}`,
    );

    return { userId };
  });

const updateStaffSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(["staff", "registrar", "reviewer", "admin"]),
  unit_id: z.string().uuid().nullable().optional(),
  full_name: z.string().trim().min(2).max(80).optional(),
});

export const updateStaff = createServerFn({ method: "POST" })
  .middleware([requirePermission("staff.manage")])
  .validator(updateStaffSchema)
  .handler(async ({ data, context }) => {
    const caller = adminOf(context);

    if (data.user_id === caller.userId && data.role !== "admin") {
      throw new Error("You cannot remove your own administrator role");
    }
    if (requiresUnit(data.role) && !data.unit_id) {
      throw new Error("Assign a department for this role");
    }

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: data.user_id, role: data.role }, { onConflict: "user_id,role" });
    if (roleError) throw new Error("Could not update the staff role");

    // user_roles allows several rows per user; collapse to the chosen role.
    await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.user_id)
      .neq("role", data.role);

    await supabaseAdmin.from("staff_profiles").upsert(
      {
        user_id: data.user_id,
        ...(data.full_name ? { full_name: data.full_name } : {}),
        unit_id: requiresUnit(data.role) ? (data.unit_id ?? null) : null,
      },
      { onConflict: "user_id" },
    );

    await audit(caller, "staff_updated", `Updated staff account ${data.user_id} to ${data.role}`);
    return { ok: true as const };
  });

export const resetStaffPassword = createServerFn({ method: "POST" })
  .middleware([requirePermission("staff.manage")])
  .validator(
    z.object({
      user_id: z.string().uuid(),
      password: createStaffSchema.shape.password,
    }),
  )
  .handler(async ({ data, context }) => {
    const caller = adminOf(context);
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      password: data.password,
    });
    if (error) throw new Error(error.message);

    await supabaseAdmin
      .from("staff_profiles")
      .upsert({ user_id: data.user_id, must_change_password: true }, { onConflict: "user_id" });

    await audit(caller, "staff_password_reset", `Reset password for staff ${data.user_id}`);
    return { ok: true as const };
  });

// ---------------------------------------------------------------------------
// Students (admitted applicants), scoped to the caller's department
// ---------------------------------------------------------------------------

export type StudentRow = {
  id: string;
  application_number: string;
  full_name: string;
  email: string;
  phone: string;
  unit_id: string;
  unit_name: string;
  stream: string;
  status: string;
  created_at: string;
  /** One mark per subject, in order; `null` until the assessor records them. */
  subjects: number[] | null;
  subject_count: number;
  /** Sum of the recorded subject marks, or null when nothing is recorded. */
  total_score: number | null;
};

export type StudentsResult = {
  rows: StudentRow[];
  unit: { id: string; name: string; subjectCount: number } | null;
  units: Array<{ id: string; name: string }>;
  isAdmin: boolean;
};

const studentsSchema = z.object({
  unit_id: z.string().uuid().optional(),
  search: z.string().trim().max(120).optional(),
});

export const listStudents = createServerFn({ method: "POST" })
  .middleware([requirePermission("students.read")])
  .validator(studentsSchema)
  .handler(async ({ data, context }): Promise<StudentsResult> => {
    const admin = adminOf(context);
    const scope = scopedUnitId(admin, data.unit_id ?? null);

    const [unitsResult, subjectCounts] = await Promise.all([
      supabaseAdmin
        .from("units")
        .select("id, name")
        .eq("is_active", true)
        .order("name", { ascending: true }),
      readUnitSubjectCounts(),
    ]);
    const units = unitsResult.data;

    // No department and no administrator override means nothing to show.
    if (scope === undefined) {
      return { rows: [], unit: null, units: units ?? [], isAdmin: false };
    }

    let query = supabaseAdmin
      .from("applicants")
      .select(
        "id, application_number, first_name, middle_name, last_name, email, phone, unit_id, status, stream, created_at, units(name), applicant_scores(subjects)",
      )
      .eq("status", "admitted");

    if (scope) query = query.eq("unit_id", scope);

    if (data.search && data.search.length > 0) {
      const term = data.search;
      query = query.or(
        `application_number.ilike.%${term}%,first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%`,
      );
    }

    let result = await query
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true })
      .order("application_number", { ascending: true });

    // A database that has not yet run the unit-subjects migration has no
    // `subjects` column. Fall back to a scores-less read so the roster still
    // lists students instead of failing outright.
    if (result.error) {
      let legacy = supabaseAdmin
        .from("applicants")
        .select(
          "id, application_number, first_name, middle_name, last_name, email, phone, unit_id, status, stream, created_at, units(name)",
        )
        .eq("status", "admitted");
      if (scope) legacy = legacy.eq("unit_id", scope);
      if (data.search && data.search.length > 0) {
        const term = data.search;
        legacy = legacy.or(
          `application_number.ilike.%${term}%,first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%`,
        );
      }
      console.error(
        "[students] roster degraded (has the unit-subjects migration run?)",
        result.error.message,
      );
      result = (await legacy
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true })
        .order("application_number", { ascending: true })) as typeof result;
    }

    const { data: rows, error } = result;
    if (error) throw new Error("Could not load students");

    type Raw = {
      id: string;
      application_number: string;
      first_name: string;
      middle_name: string | null;
      last_name: string;
      email: string;
      phone: string;
      unit_id: string;
      status: string;
      stream: string;
      created_at: string;
      units: { name?: string } | null;
      applicant_scores: { subjects: number[] | null } | null;
    };

    const mapped: StudentRow[] = (rows ?? []).map((r) => {
      const raw = r as unknown as Raw;
      const subjects = raw.applicant_scores?.subjects ?? null;
      const subject_count = subjectCounts.get(raw.unit_id) ?? DEFAULT_SUBJECTS;
      return {
        id: raw.id,
        application_number: raw.application_number,
        full_name: [raw.first_name, raw.middle_name, raw.last_name].filter(Boolean).join(" "),
        email: raw.email,
        phone: raw.phone,
        unit_id: raw.unit_id,
        unit_name: raw.units?.name ?? "—",
        stream: raw.stream ?? "1",
        status: raw.status,
        created_at: raw.created_at,
        subjects,
        subject_count,
        total_score:
          subjects && subjects.length > 0
            ? subjects.reduce((sum, value) => sum + Number(value ?? 0), 0)
            : null,
      };
    });

    const selected = scope ? ((units ?? []).find((u) => u.id === scope) ?? null) : null;

    return {
      rows: mapped,
      unit: selected
        ? {
            id: selected.id,
            name: selected.name,
            subjectCount: subjectCounts.get(selected.id) ?? DEFAULT_SUBJECTS,
          }
        : null,
      units: units ?? [],
      isAdmin: admin.role === "admin",
    };
  });

// ---------------------------------------------------------------------------
// Scores
// ---------------------------------------------------------------------------

export type StudentDetail = {
  id: string;
  application_number: string;
  full_name: string;
  email: string;
  phone: string;
  gender: string;
  date_of_birth: string;
  unit_id: string;
  unit_name: string;
  stream: string;
  created_at: string;
  subjects: number[] | null;
  subject_count: number;
  total_score: number | null;
  updated_at: string | null;
};

export const getStudent = createServerFn({ method: "POST" })
  .middleware([requirePermission("students.read")])
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }): Promise<StudentDetail | null> => {
    const admin = adminOf(context);
    const scope = scopedUnitId(admin, null);

    let query = supabaseAdmin
      .from("applicants")
      .select(
        "id, application_number, first_name, middle_name, last_name, email, phone, gender, date_of_birth, unit_id, status, stream, created_at, units(name), applicant_scores(subjects, updated_at)",
      )
      .eq("id", data.id)
      .eq("status", "admitted");
    if (scope) query = query.eq("unit_id", scope);

    let result = await query.maybeSingle();

    // Same stale-database fallback as `listStudents`: read the applicant
    // without the subject marks when the migration has not run.
    if (result.error) {
      let legacy = supabaseAdmin
        .from("applicants")
        .select(
          "id, application_number, first_name, middle_name, last_name, email, phone, gender, date_of_birth, unit_id, status, stream, created_at, units(name), applicant_scores(updated_at)",
        )
        .eq("id", data.id)
        .eq("status", "admitted");
      if (scope) legacy = legacy.eq("unit_id", scope);
      console.error(
        "[students] scoresheet degraded (has the unit-subjects migration run?)",
        result.error.message,
      );
      result = (await legacy.maybeSingle()) as typeof result;
    }

    const { data: row } = result;
    if (!row) return null;

    type Raw = {
      id: string;
      application_number: string;
      first_name: string;
      middle_name: string | null;
      last_name: string;
      email: string;
      phone: string;
      gender: string;
      date_of_birth: string;
      unit_id: string;
      stream: string;
      created_at: string;
      units: { name?: string } | null;
      applicant_scores: {
        subjects: number[] | null;
        updated_at: string;
      } | null;
    };
    const raw = row as unknown as Raw;
    const subjects = raw.applicant_scores?.subjects ?? null;
    const subjectCounts = await readUnitSubjectCounts([raw.unit_id]);
    const subject_count = subjectCounts.get(raw.unit_id) ?? DEFAULT_SUBJECTS;

    return {
      id: raw.id,
      application_number: raw.application_number,
      full_name: [raw.first_name, raw.middle_name, raw.last_name].filter(Boolean).join(" "),
      email: raw.email,
      phone: raw.phone,
      gender: raw.gender,
      date_of_birth: raw.date_of_birth,
      unit_id: raw.unit_id,
      unit_name: raw.units?.name ?? "—",
      stream: raw.stream ?? "1",
      created_at: raw.created_at,
      subjects,
      subject_count,
      total_score:
        subjects && subjects.length > 0
          ? subjects.reduce((sum, value) => sum + Number(value ?? 0), 0)
          : null,
      updated_at: raw.applicant_scores?.updated_at ?? null,
    };
  });

const saveScoresSchema = z.object({
  entries: z
    .array(
      z.object({
        applicant_id: z.string().uuid(),
        subjects: z.array(z.number().min(0).nullable()),
      }),
    )
    .min(1)
    .max(500),
});

export const saveScores = createServerFn({ method: "POST" })
  .middleware([requirePermission("scores.write")])
  .validator(saveScoresSchema)
  .handler(async ({ data, context }) => {
    const admin = adminOf(context);
    const scope = scopedUnitId(admin, null);
    if (scope === undefined) throw new Error("No department assigned to your account");

    // Re-read the applicant units so scores can only ever be written for
    // students inside the caller's department.
    const ids = data.entries.map((e) => e.applicant_id);
    let check = supabaseAdmin
      .from("applicants")
      .select("id, application_number, unit_id, status")
      .in("id", ids)
      .eq("status", "admitted");
    if (scope) check = check.eq("unit_id", scope);

    const { data: allowed, error: checkError } = await check;
    if (checkError) throw new Error("Could not verify the selected students");
    const allowedIds = new Set((allowed ?? []).map((a) => a.id));
    if (allowedIds.size !== ids.length) {
      throw new Error("Some selected students are outside your department");
    }

    // The slot maxima come from each student's own unit, never the client.
    const unitByApplicant = new Map((allowed ?? []).map((a) => [a.id, a.unit_id]));
    const subjectCounts = await readUnitSubjectCounts([...new Set(unitByApplicant.values())]);

    for (const entry of data.entries) {
      const unitId = unitByApplicant.get(entry.applicant_id);
      const count = (unitId ? subjectCounts.get(unitId) : undefined) ?? DEFAULT_SUBJECTS;
      if (entry.subjects.length > count) {
        throw new Error(`A student's unit is assessed on ${count} subject(s)`);
      }
      const caps = splitMarks(count);
      entry.subjects.forEach((value, index) => {
        if (value === null) return;
        if (value < 0 || value > (caps[index] ?? 0)) {
          throw new Error(`Subject ${index + 1} must be between 0 and ${caps[index] ?? 0}`);
        }
      });
    }

    const { error } = await supabaseAdmin.from("applicant_scores").upsert(
      data.entries.map((e) => ({
        applicant_id: e.applicant_id,
        subjects: e.subjects,
        recorded_by: admin.userId,
        recorded_by_email: admin.email,
      })),
      { onConflict: "applicant_id" },
    );
    if (error) {
      console.error("[students] score save failed", error.message);
      throw new Error("Could not save the scores");
    }

    await audit(admin, "scores_recorded", `Recorded scores for ${data.entries.length} student(s)`);

    return { ok: true as const, saved: data.entries.length };
  });

/**
 * Sets how many subjects a unit is assessed on. The 100-point total is then
 * split evenly across them. A department-scoped caller may only change their
 * own unit; an administrator passes an explicit `unit_id`.
 */
export const setUnitSubjectCount = createServerFn({ method: "POST" })
  .middleware([requirePermission("scores.write")])
  .validator(
    z.object({
      unit_id: z.string().uuid().optional(),
      subject_count: z.number().int().min(MIN_SUBJECTS).max(MAX_SUBJECTS),
    }),
  )
  .handler(async ({ data, context }) => {
    const admin = adminOf(context);
    const scope = scopedUnitId(admin, data.unit_id ?? null);
    if (!scope) throw new Error("Choose a department before setting its subjects");

    const { error } = await supabaseAdmin
      .from("units")
      .update({ subject_count: data.subject_count })
      .eq("id", scope);
    if (error) throw new Error("Could not update the subject count");

    await audit(
      admin,
      "unit_subjects_updated",
      `Unit subjects set to ${data.subject_count} (split ${splitMarks(data.subject_count).join("/")})`,
    );

    return { ok: true as const, subject_count: data.subject_count };
  });

// ---------------------------------------------------------------------------
// Staff removal and admin-assisted password resets
// ---------------------------------------------------------------------------

export const deleteStaff = createServerFn({ method: "POST" })
  .middleware([requirePermission("staff.manage")])
  .validator(z.object({ user_id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const caller = adminOf(context);
    if (data.user_id === caller.userId) {
      throw new Error("You cannot delete your own account");
    }
    const { data: target } = await supabaseAdmin.auth.admin.getUserById(data.user_id);
    const email = target?.user?.email ?? data.user_id;

    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
    await supabaseAdmin.from("staff_profiles").delete().eq("user_id", data.user_id);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error("Could not delete this account");

    await audit(caller, "staff_deleted", `Deleted staff account ${email}`);
    return { ok: true as const };
  });

export type ResetRequest = { id: string; email: string; note: string | null; createdAt: string };

export const listResetRequests = createServerFn({ method: "GET" })
  .middleware([requirePermission("staff.manage")])
  .handler(async (): Promise<ResetRequest[]> => {
    const { data } = await supabaseAdmin
      .from("password_reset_requests")
      .select("id, email, note, created_at")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(100);
    return (data ?? []).map((r) => ({
      id: r.id,
      email: r.email,
      note: r.note,
      createdAt: r.created_at,
    }));
  });

export const resolveResetRequest = createServerFn({ method: "POST" })
  .middleware([requirePermission("staff.manage")])
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const caller = adminOf(context);
    await supabaseAdmin
      .from("password_reset_requests")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
        resolved_by: caller.userId,
      })
      .eq("id", data.id);
    return { ok: true as const };
  });
