import { useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";

/**
 * usePermissions — Dynamic RBAC hook.
 *
 * All role flags and permission checks are derived from the live `user`
 * object fetched from the server. There are NO hardcoded role IDs, emails,
 * or static permission lists here. This hook reacts automatically whenever
 * AuthContext refreshes the user (on login, heartbeat poll, or WebSocket push).
 *
 * Role resolution order:
 *  1. user.role.name  (relationship object, e.g. { id: 1, name: "superadmin" })
 *  2. user.role       (string shorthand, e.g. "staff")
 *  3. ""              (unauthenticated / unknown)
 */
export function usePermissions() {
  const { user, refreshUser } = useAuth();

  /* ── Normalize role name from server ── */
  const roleName = useMemo(() => {
    const raw = user?.role?.name ?? user?.role ?? "";
    return typeof raw === "string" ? raw.toLowerCase().trim() : "";
  }, [user?.role]);

  /* ── Role flags — derived purely from server role name ── */
  const isSuperAdmin = useMemo(() =>
    roleName === "superadmin" || roleName === "super_admin",
  [roleName]);

  const isAdmin = useMemo(() =>
    isSuperAdmin || roleName === "admin" || roleName === "head",
  [isSuperAdmin, roleName]);

  const isStudentAssistant = useMemo(() =>
    roleName === "student_assistant" ||
    roleName === "student assistant" ||
    (roleName.includes("student") && roleName.includes("assistant")),
  [roleName]);

  const isStaff = useMemo(() =>
    !isSuperAdmin && !isAdmin && !isStudentAssistant,
  [isSuperAdmin, isAdmin, isStudentAssistant]);

  const isGeneral = useMemo(() =>
    isStaff || isStudentAssistant || isAdmin || isSuperAdmin,
  [isStaff, isStudentAssistant, isAdmin, isSuperAdmin]);

  /* ── Parse permissions array from server user object ── */
  const userPermissions = useMemo(() => {
    let raw = user?.permissions;
    if (!raw || (Array.isArray(raw) && raw.length === 0)) {
      raw = user?.role?.permissions;
    }
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }, [user?.permissions, user?.role?.permissions]);

  /* O(1) lookup Set */
  const permissionSet = useMemo(
    () => new Set(userPermissions),
    [userPermissions]
  );

  /**
   * hasPermission(key) — Check a single permission key.
   *
   * Resolution order:
   *  1. SuperAdmin → always true
   *  2. Wildcard "*" in user's permissions → always true
   *  3. Exact key match (O(1))
   *  4. Backward-compat alias check (account/settings synonyms)
   *  5. Parent module check: "venue_bookings" grants "venue_bookings.view"
   *  6. Child action check: "venue_bookings.approve" is granted by "venue_bookings"
   */
  const hasPermission = useCallback((permissionKey) => {
    if (isSuperAdmin) return true;
    if (!permissionKey) return true;
    if (permissionSet.has("*")) return true;

    // Exact match
    if (permissionSet.has(permissionKey)) return true;

    // Backward-compat aliases for account/settings modules
    const aliases = {
      "settings.account": ["account.profile", "settings.profile", "account"],
      "account.profile":  ["settings.account", "settings.profile", "account"],
    };
    if (aliases[permissionKey]?.some(a => permissionSet.has(a))) return true;

    // Module-level: checking "venue_bookings" → grants any "venue_bookings.*" action
    const hasAnyAction = userPermissions.some(
      p => p === permissionKey ||
           p.startsWith(`${permissionKey}.`) ||
           p.startsWith(`${permissionKey}:`)
    );
    if (hasAnyAction) return true;

    // Action-level: checking "venue_bookings.approve" → granted if user has "venue_bookings"
    if (permissionKey.includes(".")) {
      const parentModule = permissionKey.split(".")[0];
      if (permissionSet.has(parentModule)) return true;
    }

    return false;
  }, [isSuperAdmin, permissionSet, userPermissions]);

  /**
   * canAny(keys[]) — Returns true if the user has at least one of the keys.
   */
  const canAny = useCallback(
    (keys = []) => keys.some(k => hasPermission(k)),
    [hasPermission]
  );

  /**
   * canAll(keys[]) — Returns true only if the user has ALL of the keys.
   */
  const canAll = useCallback(
    (keys = []) => keys.every(k => hasPermission(k)),
    [hasPermission]
  );

  /**
   * canAccess(moduleKey) — Module-level guard.
   * Returns true if the user has any permission within the given module.
   */
  const canAccess = useCallback((moduleKey) => {
    if (isSuperAdmin) return true;
    return hasPermission(moduleKey);
  }, [isSuperAdmin, hasPermission]);

  /**
   * canDirectEdit(moduleKey) — Whether user can edit directly (vs. request approval).
   */
  const canDirectEdit = useCallback((moduleKey) => {
    if (isSuperAdmin) return true;
    if (!moduleKey) return false;
    return hasPermission(moduleKey) || hasPermission(`${moduleKey}.edit`);
  }, [isSuperAdmin, hasPermission]);

  return {
    user,
    roleName,

    /* Role flags */
    isSuperAdmin,
    isAdmin,
    isStudentAssistant,
    isStaff,
    isGeneral,

    /* Permission data */
    permissions: userPermissions,

    /* Permission checkers */
    hasPermission,
    canAny,
    canAll,
    canAccess,
    canDirectEdit,

    /* Force-refresh from server (call after an admin changes permissions) */
    refreshUser,
  };
}

export default usePermissions;
