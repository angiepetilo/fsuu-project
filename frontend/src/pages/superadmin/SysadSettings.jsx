/**
 * SysadSettings (Super Admin Portal)
 * 
 * Re-exports the unified Settings component from '@/pages/general/Settings'.
 * Both Super Admin and General operational roles now share a single unified architecture
 * with two-tier navigation (top horizontal categories + left sub-menu), while strictly
 * preserving granular RBAC permission gating and password protection per agent.md.
 */
export { default } from "@/pages/general/Settings";
