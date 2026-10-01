/**
 * Role-based access control for the staff portal.
 *
 * Roles are stored in `public.user_roles` (never on a profile row) and mapped
 * here to a least-privilege set of permissions. Adding a future role only
 * requires extending the enum in the database and adding an entry below.
 */
export const ROLES = ["admin", "registrar", "reviewer", "staff"] as const;
export type StaffRole = (typeof ROLES)[number];

/**
 * Roles that work inside a single trade unit. They must be given a department,
 * and their access is limited to that unit's admitted students. Administrators
 * are deliberately excluded: they span every department.
 */
export const UNIT_SCOPED_ROLES = ["staff"] as const;
export type UnitScopedRole = (typeof UNIT_SCOPED_ROLES)[number];

export function requiresUnit(role: string): role is UnitScopedRole {
  return (UNIT_SCOPED_ROLES as readonly string[]).includes(role);
}

export const PERMISSIONS = [
  "applicants.read",
  "applicants.status.update",
  "applicants.export",
  "applicants.delete",
  "audit.read",
  "staff.manage",
  "students.read",
  "scores.read",
  "scores.write",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<StaffRole, readonly Permission[]> = {
  admin: PERMISSIONS,
  registrar: ["applicants.read", "applicants.status.update", "applicants.export", "audit.read"],
  reviewer: ["applicants.read", "audit.read"],
  staff: ["students.read", "scores.read", "scores.write"],
};

export const ROLE_LABELS: Record<StaffRole, string> = {
  admin: "Administrator",
  registrar: "Registrar",
  reviewer: "Reviewer",
  staff: "Staff",
};

/** Highest-privilege role wins when a user holds several. */
export function highestRole(roles: readonly string[]): StaffRole | null {
  for (const role of ROLES) {
    if (roles.includes(role)) return role;
  }
  return null;
}

export function permissionsFor(role: StaffRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function can(role: StaffRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return permissionsFor(role).includes(permission);
}
