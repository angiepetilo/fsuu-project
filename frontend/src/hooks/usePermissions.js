import { useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";

/**
 * usePermissions - Centralized Role-Based Access Control (RBAC) hook.
 * Single source of truth for role flags and granular operational permissions.
 */
export function usePermissions() {
  const { user } = useAuth();

  const roleName = useMemo(() => {
    const rawRole = user?.role?.name || user?.role || "";
    return typeof rawRole === "string" ? rawRole.toLowerCase() : "";
  }, [user]);

  const isSuperAdmin = useMemo(() => {
    return (
      roleName === "superadmin" ||
      roleName === "super_admin" ||
      user?.email === "admin@fsuu.edu.ph" ||
      user?.email === "superadmin@fsuu.edu.ph"
    );
  }, [roleName, user?.email]);

  const isStudentAssistant = useMemo(() => {
    return (
      roleName.includes("student") ||
      roleName.includes("assistant") ||
      user?.role_id === 3
    );
  }, [roleName, user?.role_id]);

  const isStaff = useMemo(() => {
    return !isSuperAdmin && !isStudentAssistant;
  }, [isSuperAdmin, isStudentAssistant]);

  const isGeneral = useMemo(() => {
    return isStaff || isStudentAssistant || isSuperAdmin;
  }, [isStaff, isStudentAssistant, isSuperAdmin]);

  const userPermissions = useMemo(() => {
    if (!user?.permissions) return [];
    if (Array.isArray(user.permissions)) return user.permissions;
    if (typeof user.permissions === "string") {
      try {
        const parsed = JSON.parse(user.permissions);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }, [user?.permissions]);

  const permissionSet = useMemo(() => new Set(userPermissions), [userPermissions]);

  /**
   * Check if user has permission for a specific feature/module key or granular action.
   * Super Admins always have all permissions.
   */
  const hasPermission = useCallback((permissionKey) => {
    if (isSuperAdmin) return true;
    if (!permissionKey) return true;

    // 1. Wildcard access
    if (permissionSet.has("*")) return true;

    // 2. Exact match (O(1))
    if (permissionSet.has(permissionKey)) return true;

    // 3. Module check: If checking module key (e.g. "venue_bookings"), check if user has any action in that module
    const hasAnyActionInModule = userPermissions.some(
      (p) => p === permissionKey || p.startsWith(`${permissionKey}.`) || p.startsWith(`${permissionKey}:`)
    );
    if (hasAnyActionInModule) return true;

    // 4. Action check: If checking action key (e.g. "venue_bookings.approve"), check if user has parent module access
    if (permissionKey.includes(".")) {
      const parentModule = permissionKey.split(".")[0];
      if (permissionSet.has(parentModule)) return true;
    }

    return false;
  }, [isSuperAdmin, permissionSet, userPermissions]);

  /**
   * Check if user can directly edit a settings module or needs to request approval.
   */
  const canDirectEdit = useCallback((moduleKey) => {
    if (isSuperAdmin) return true;
    if (!moduleKey) return false;
    return hasPermission(moduleKey) || hasPermission(`${moduleKey}.edit`);
  }, [isSuperAdmin, hasPermission]);

  return {
    user,
    roleName,
    isSuperAdmin,
    isStudentAssistant,
    isStaff,
    isGeneral,
    permissions: userPermissions,
    hasPermission,
    canDirectEdit,
  };
}

export default usePermissions;
