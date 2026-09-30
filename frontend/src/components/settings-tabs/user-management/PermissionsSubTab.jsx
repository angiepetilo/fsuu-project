import { useState, useEffect } from "react";
import api from "@/lib/axios";
import { notify } from "@/lib/notify";
import {
  PERMISSION_MODULES,
  ALL_ACTION_KEYS,
  expandPermissions,
} from "./permissionsConfig";

function ModuleCheckbox({ allEnabled, someEnabled, onClick }) {
  return (
    <input
      type="checkbox"
      checked={allEnabled}
      onChange={onClick}
      className="w-4 h-4 accent-blue-600 text-blue-600 rounded cursor-pointer shrink-0 mt-0.5"
      onClick={(e) => e.stopPropagation()}
    />
  );
}

export default function PermissionsSubTab({ initialRoleId }) {
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [permissions, setPermissions] = useState([]);
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

  const toggleAction = (actionKey) => {
    setDirty(true);
    setPermissions((prev) =>
      prev.includes(actionKey)
        ? prev.filter((k) => k !== actionKey)
        : [...prev, actionKey]
    );
  };

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
      notify.success("Saved", `Permissions updated.`);
      setDirty(false);
      setRoles((prev) =>
        prev.map((r) => (r.id === selectedRole.id ? { ...r, permissions } : r))
      );
    } catch (err) {
      notify.error("Failed", err.response?.data?.message || "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
          Permissions
        </h3>
        {dirty && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            {saving ? "Saving" : "Save"}
          </button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        {/* Roles Column */}
        <div className="w-full md:w-48 shrink-0 space-y-1">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Roles
          </p>
          {loadingRoles ? (
            <div className="text-xs text-slate-400 py-3">Loading...</div>
          ) : (
            <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
              {roles.map((r) => {
                const isSelected = selectedRole?.id === r.id;
                const displayName = formatRoleName(r.name);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRole(r)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center justify-between shrink-0 ${
                      isSelected
                        ? "bg-blue-600 text-white"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span>{displayName}</span>
                    {r.is_protected && (
                      <span
                        className={`text-[9px] px-1 py-0.5 rounded font-bold uppercase ${
                          isSelected
                            ? "bg-blue-500/30 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500"
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

        {/* Matrix Column */}
        <div className="flex-1 min-w-0">
          {!selectedRole ? (
            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg py-8 text-center text-xs text-slate-500">
              Empty
            </div>
          ) : loadingPerms ? (
            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg py-8 text-center text-xs text-slate-500">
              Loading...
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
              {/* Matrix Top bar */}
              <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-white">
                    {formatRoleName(selectedRole.name)}
                  </span>
                  <span className="text-xs text-slate-500 ml-2">
                    ({permissions.length}/{ALL_ACTION_KEYS.length})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPermissions(ALL_ACTION_KEYS);
                      setDirty(true);
                    }}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Select
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <button
                    type="button"
                    onClick={() => {
                      setPermissions([]);
                      setDirty(true);
                    }}
                    className="text-xs font-semibold text-slate-500 hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Modules List */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {PERMISSION_MODULES.map((mod) => {
                  const moduleActionKeys = mod.actions.map((a) => `${mod.key}.${a.key}`);
                  const enabledActions = moduleActionKeys.filter((k) =>
                    permissions.includes(k)
                  );
                  const allEnabled = enabledActions.length === moduleActionKeys.length;
                  const someEnabled = enabledActions.length > 0;

                  return (
                    <div key={mod.key} className="px-4 py-3">
                      <div
                        className="flex items-start gap-2.5 cursor-pointer select-none"
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
                                  ? "text-blue-600 dark:text-blue-400"
                                  : "text-slate-800 dark:text-slate-200"
                              }`}
                            >
                              {mod.label}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {enabledActions.length}/{moduleActionKeys.length}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mt-2 ml-6">
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
                              className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border transition-colors cursor-pointer ${
                                isActionOn
                                  ? "bg-blue-600 border-blue-600 text-white"
                                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-400"
                              }`}
                            >
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
