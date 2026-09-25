import { useState, useEffect, useRef } from "react";
import { RotateCw, Save, Loader2, Shield, Check } from "lucide-react";
import api from "@/lib/axios";
import { notify } from "@/lib/notify";
import {
  PERMISSION_MODULES,
  ALL_ACTION_KEYS,
  expandPermissions,
} from "./permissionsConfig";

// Indeterminate checkbox helper
function ModuleCheckbox({ allEnabled, someEnabled, onClick }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = someEnabled && !allEnabled;
  }, [allEnabled, someEnabled]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={allEnabled}
      onChange={onClick}
      className="w-4 h-4 accent-blue-600 text-blue-600 focus:ring-blue-500 rounded cursor-pointer shrink-0 mt-0.5"
      onClick={(e) => e.stopPropagation()}
    />
  );
}

export default function PermissionsSubTab({ initialRoleId }) {
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [permissions, setPermissions] = useState([]); // granular keys: ["venue_bookings.approve", ...]
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const fetchRoles = async () => {
    setLoadingRoles(true);
    try {
      const res = await api.get("/sysad/roles");
      const list = Array.isArray(res.data) ? res.data : [];
      setRoles(list);
      if (list.length > 0) {
        if (initialRoleId) {
          const matched = list.find((r) => r.id === initialRoleId);
          setSelectedRole(matched || list[0]);
        } else if (!selectedRole) {
          setSelectedRole(list[0]);
        }
      }
    } catch {
      setRoles([]);
    } finally {
      setLoadingRoles(false);
    }
  };

  const fetchPermissions = async (role) => {
    if (!role) return;
    setLoadingPerms(true);
    setDirty(false);
    try {
      const res = await api.get(`/sysad/roles/${role.id}/permissions`);
      const raw = Array.isArray(res.data.permissions) ? res.data.permissions : [];
      // Expand old flat-key format to granular action keys for backward compatibility
      setPermissions(expandPermissions(raw));
    } catch {
      setPermissions([]);
    } finally {
      setLoadingPerms(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  useEffect(() => {
    if (initialRoleId && roles.length > 0) {
      const target = roles.find((r) => r.id === initialRoleId);
      if (target) setSelectedRole(target);
    }
  }, [initialRoleId, roles]);

  useEffect(() => {
    if (selectedRole) fetchPermissions(selectedRole);
  }, [selectedRole?.id]);

  // Toggle a single action key (e.g. "venue_bookings.approve")
  const toggleAction = (actionKey) => {
    setDirty(true);
    setPermissions((prev) =>
      prev.includes(actionKey)
        ? prev.filter((k) => k !== actionKey)
        : [...prev, actionKey]
    );
  };

  // Toggle entire module
  const toggleModule = (mod) => {
    setDirty(true);
    const moduleActionKeys = mod.actions.map((a) => `${mod.key}.${a.key}`);
    const allOn = moduleActionKeys.every((k) => permissions.includes(k));
    if (allOn) {
      setPermissions((prev) => prev.filter((k) => !moduleActionKeys.includes(k)));
    } else {
      setPermissions((prev) => {
        const next = new Set(prev);
        moduleActionKeys.forEach((k) => next.add(k));
        return Array.from(next);
      });
    }
  };

  const formatRoleName = (name = "") =>
    name ? name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "";

  const handleSave = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      await api.post(`/sysad/roles/${selectedRole.id}/permissions`, { permissions });
      notify.success(
        "Permissions Saved",
        `Permissions updated for all ${formatRoleName(selectedRole.name)} accounts.`
      );
      setDirty(false);
      // Update local role list permissions count if applicable
      setRoles((prev) =>
        prev.map((r) => (r.id === selectedRole.id ? { ...r, permissions } : r))
      );
    } catch (err) {
      notify.error("Failed", err.response?.data?.message || "Could not save permissions.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield size={16} className="text-blue-600 dark:text-blue-400" />
            Permissions Matrix
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure what each role is allowed to do across the system.
          </p>
        </div>
        {dirty && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 shadow-xs"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Save Changes
          </button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-5">
        {/* Role Selector Sidebar */}
        <div className="w-full md:w-52 shrink-0 space-y-1">
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
            Select Role
          </p>
          {loadingRoles ? (
            <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 py-3">
              <RotateCw size={12} className="animate-spin text-blue-500" /> Loading roles...
            </div>
          ) : (
            <div className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-visible pb-1 md:pb-0">
              {roles.map((r) => {
                const isSelected = selectedRole?.id === r.id;
                const displayName = formatRoleName(r.name);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRole(r)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center justify-between shrink-0 ${
                      isSelected
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span>{displayName}</span>
                    {r.is_protected && (
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                          isSelected
                            ? "bg-blue-500/30 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        System
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Permission Matrix */}
        <div className="flex-1 min-w-0">
          {!selectedRole ? (
            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C2E] rounded-xl py-12 text-center text-xs text-slate-400 dark:text-slate-500">
              Select a role to configure permissions.
            </div>
          ) : loadingPerms ? (
            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C2E] rounded-xl py-12 flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
              <RotateCw size={13} className="animate-spin text-blue-500" /> Loading permissions...
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-[#131C2E] shadow-2xs">
              {/* Matrix Top bar */}
              <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-white">
                    {formatRoleName(selectedRole.name)}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                    — {permissions.length} of {ALL_ACTION_KEYS.length} actions authorized
                  </span>
                </div>
                {/* Quick select all / clear all */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPermissions(ALL_ACTION_KEYS);
                      setDirty(true);
                    }}
                    className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <button
                    type="button"
                    onClick={() => {
                      setPermissions([]);
                      setDirty(true);
                    }}
                    className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Modules List */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {PERMISSION_MODULES.map((mod) => {
                  const moduleActionKeys = mod.actions.map((a) => `${mod.key}.${a.key}`);
                  const enabledActions = moduleActionKeys.filter((k) =>
                    permissions.includes(k)
                  );
                  const allEnabled = enabledActions.length === moduleActionKeys.length;
                  const someEnabled = enabledActions.length > 0;

                  return (
                    <div key={mod.key} className="px-4 py-3.5">
                      {/* Module row — clicking the label or checkbox toggles all actions */}
                      <div
                        className="flex items-start gap-3 cursor-pointer select-none"
                        onClick={() => toggleModule(mod)}
                      >
                        <ModuleCheckbox
                          allEnabled={allEnabled}
                          someEnabled={someEnabled}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleModule(mod);
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-xs font-semibold ${
                                allEnabled
                                  ? "text-blue-700 dark:text-blue-400"
                                  : someEnabled
                                  ? "text-slate-900 dark:text-white"
                                  : "text-slate-600 dark:text-slate-400"
                              }`}
                            >
                              {mod.label}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                              {enabledActions.length}/{moduleActionKeys.length}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 leading-relaxed">
                            {mod.desc}
                          </p>
                        </div>
                      </div>

                      {/* Individual action pills */}
                      <div className="flex flex-wrap gap-1.5 mt-2.5 ml-7">
                        {mod.actions.map((action) => {
                          const actionKey = `${mod.key}.${action.key}`;
                          const isActionOn = permissions.includes(actionKey);
                          return (
                            <button
                              key={actionKey}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleAction(actionKey);
                              }}
                              className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border transition-all cursor-pointer flex items-center gap-1 ${
                                isActionOn
                                  ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                                  : "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-300"
                              }`}
                            >
                              {isActionOn && <Check size={10} />}
                              {action.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
