import { useQuery } from "@tanstack/react-query";

import { getUser, type AdminUser } from "@/lib/admin.functions";
import { can, type Permission } from "@/lib/permissions";

export const adminUserQuery = {
  queryKey: ["admin-user"] as const,
  queryFn: () => getUser(),
  staleTime: 60_000,
  retry: false,
};

export function useAdminUser() {
  const query = useQuery(adminUserQuery);
  const user = (query.data ?? null) as AdminUser | null;
  return {
    user,
    isLoading: query.isLoading,
    role: user?.role ?? null,
    /** Least-privilege: unknown user or unknown permission means "no". */
    hasPermission: (permission: Permission) => can(user?.role ?? null, permission),
  };
}
