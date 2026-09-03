import { useState, useEffect, useRef } from "react";
import { RotateCw, Save, Loader2 } from "lucide-react";
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
      className="w-4 h-4 accent-slate-900 cursor-pointer flex-shrink-0 mt-0.5"
      onClick={(e) => e.stopPropagation()}
    />
  );
}

export default function PermissionsSubTab() {
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
      if (list.length > 0 && !selectedRole) setSelectedRole(list[0]);
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

  // Toggle entire module — if ALL actions are on → turn all off; else turn all on
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

  const handleSave = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      await api.post(`/sysad/roles/${selectedRole.id}/permissions`, { permissions });
      notify.success(
        "Permissions Saved",
        `Permissions updated for all ${
          ROLE_DISPLAY[selectedRole.name] || selectedRole.name
        } accounts.`
      );
      setDirty(false);
    } catch (err) {
      notify.error("Failed", err.response?.data?.message || "Could not save permissions.");
    } finally {
      setSaving(false);
    }
  };

  const ROLE_DISPLAY = {
    staff: "Staff",
    student_assistant: "Student Assistant",
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Permissions</h3>
          <p className="text-xs text-slate-500 mt-0.5">
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

      <div className="flex gap-5">
        {/* Role Selector Sidebar */}
        <div className="w-44 shrink-0 space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Select Role
          </p>
          {loadingRoles ? (
            <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
              <RotateCw size={12} className="animate-spin" /> Loading...
            </div>
          ) : (
            roles.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedRole(r)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  selectedRole?.id === r.id
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {ROLE_DISPLAY[r.name] || r.name}
              </button>
            ))
          )}
        </div>

        {/* Permission Matrix */}
        <div className="flex-1 min-w-0">
          {!selectedRole ? (
            <div className="border border-slate-200 rounded-xl py-12 text-center text-xs text-slate-400">
              Select a role to configure permissions.
            </div>
          ) : loadingPerms ? (
            <div className="border border-slate-200 rounded-xl py-12 flex items-center justify-center gap-2 text-xs text-slate-400">
              <RotateCw size={13} className="animate-spin" /> Loading permissions...
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-700">
                    {ROLE_DISPLAY[selectedRole.name] || selectedRole.name}
                  </span>
                  <span className="text-xs text-slate-400 ml-2">
                    — click a module to toggle all, or click individual actions
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
                    className="text-[10px] font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => {
                      setPermissions([]);
                      setDirty(true);
                    }}
                    className="text-[10px] font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
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
                          <span
                            className={`text-xs font-semibold ${
                              allEnabled
                                ? "text-slate-900"
                                : someEnabled
                                ? "text-slate-700"
                                : "text-slate-400"
                            }`}
                          >
                            {mod.label}
                          </span>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                            {mod.desc}
                          </p>
                        </div>
                      </div>

                      {/* Individual action pills — always visible, clickable independently */}
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
                              className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border transition-all cursor-pointer ${
                                isActionOn
                                  ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                                  : "bg-white border-slate-200 text-slate-400 hover:border-slate-400 hover:text-slate-600"
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
