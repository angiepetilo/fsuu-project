import { useState, useEffect, useRef } from "react";
import {
  Plus,
  Edit2,
  RotateCw,
  Ban,
  Loader2,
  Shield,
  Check,
  X,
  Sliders,
} from "lucide-react";
import api from "@/lib/axios";
import { notify } from "@/lib/notify";
import {
  PERMISSION_MODULES,
  ALL_ACTION_KEYS,
  expandPermissions,
} from "./permissionsConfig";

// Dynamic role name formatter directly from DB string (no hardcoded dictionaries)
const formatRoleName = (name = "") =>
  name ? name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "";

// Indeterminate checkbox component for module headers
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

export default function RolesSubTab() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editRole, setEditRole] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    permissions: [],
  });

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await api.get("/sysad/roles");
      setRoles(Array.isArray(res.data) ? res.data : []);
    } catch {
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const openCreate = () => {
    setEditRole(null);
    setForm({
      name: "",
      permissions: [],
    });
    setShowModal(true);
  };

  const openEdit = (r) => {
    setEditRole(r);
    setForm({
      name: r.name,
      permissions: expandPermissions(r.permissions || []),
    });
    setShowModal(true);
  };

  // Toggle single action key (e.g. "venue_bookings.approve")
  const toggleAction = (actionKey) => {
    setForm((prev) => {
      const current = prev.permissions || [];
      const updated = current.includes(actionKey)
        ? current.filter((k) => k !== actionKey)
        : [...current, actionKey];
      return { ...prev, permissions: updated };
    });
  };

  // Toggle entire module
  const toggleModule = (mod) => {
    const moduleActionKeys = mod.actions.map((a) => `${mod.key}.${a.key}`);
    const current = form.permissions || [];
    const allOn = moduleActionKeys.every((k) => current.includes(k));

    if (allOn) {
      setForm((prev) => ({
        ...prev,
        permissions: (prev.permissions || []).filter(
          (k) => !moduleActionKeys.includes(k)
        ),
      }));
    } else {
      setForm((prev) => {
        const nextSet = new Set(prev.permissions || []);
        moduleActionKeys.forEach((k) => nextSet.add(k));
        return { ...prev, permissions: Array.from(nextSet) };
      });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      notify.error("Validation Error", "Role name is required.");
      return;
    }

    setFormLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        permissions: form.permissions,
      };

      if (editRole) {
        await api.put(`/sysad/roles/${editRole.id}`, payload);
        notify.success(
          "Role Updated",
          `Role "${formatRoleName(form.name)}" and its ${payload.permissions.length} permissions were saved.`
        );
      } else {
        await api.post("/sysad/roles", payload);
        notify.success(
          "Role Created",
          `Role "${formatRoleName(form.name)}" created with ${payload.permissions.length} permissions configured.`
        );
      }
      setShowModal(false);
      fetchRoles();
    } catch (err) {
      notify.error(
        "Save Failed",
        err.response?.data?.message || "Could not save role configuration."
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (r) => {
    if (
      !window.confirm(
        `Delete role "${formatRoleName(r.name)}"? This action cannot be undone.`
      )
    )
      return;
    setDeletingId(r.id);
    try {
      await api.delete(`/sysad/roles/${r.id}`);
      notify.success("Deleted", `Role "${formatRoleName(r.name)}" removed.`);
      fetchRoles();
    } catch (err) {
      notify.error(
        "Failed",
        err.response?.data?.message || "Could not delete role."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const selectedCount = form.permissions?.length || 0;
  const totalActionKeys = ALL_ACTION_KEYS.length;

  return (
    <div className="space-y-5">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Roles & Permissions
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manually create custom roles and configure what each role is allowed
            to do across the system.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-xs"
          >
            <Plus size={14} /> Add Role
          </button>
        </div>
      </div>

      {/* Roles Table (Description column removed) */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-[#131C2E] shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Configured Permissions
                </th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Users
                </th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="py-12 text-center text-xs text-slate-400 dark:text-slate-500"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <RotateCw size={13} className="animate-spin text-blue-500" />{" "}
                      Loading roles & permissions...
                    </div>
                  </td>
                </tr>
              ) : roles.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="py-12 text-center text-xs text-slate-400 dark:text-slate-500"
                  >
                    No roles found in database. Click &quot;Add Role&quot; above to create one.
                  </td>
                </tr>
              ) : (
                roles.map((r) => {
                  const displayName = formatRoleName(r.name);
                  const permsCount = Array.isArray(r.permissions)
                    ? r.permissions.length
                    : 0;

                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800 dark:text-white">
                            {displayName}
                          </span>
                          {r.is_protected ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                              System
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                              Custom
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {permsCount > 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/50">
                            <Shield size={11} className="text-blue-500" />
                            {permsCount} permission{permsCount !== 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 italic text-[11px]">
                            No permissions
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {r.users_count}
                        </span>
                        <span className="text-slate-400 dark:text-slate-500 ml-1">
                          user{r.users_count !== 1 ? "s" : ""}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(r)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-[11px] font-medium"
                            title="Edit Role & Permissions"
                          >
                            <Edit2 size={12} />
                            <span>Edit</span>
                          </button>
                          {!r.is_protected && (
                            <button
                              type="button"
                              onClick={() => handleDelete(r)}
                              disabled={deletingId === r.id || r.users_count > 0}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-rose-500 dark:text-rose-400/80 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              title={
                                r.users_count > 0
                                  ? "Cannot delete — users are assigned"
                                  : "Delete role"
                              }
                            >
                              {deletingId === r.id ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Ban size={12} />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Role & Permissions Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#131C2E] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Shield size={16} className="text-blue-600 dark:text-blue-400" />
                  {editRole
                    ? editRole.is_protected
                      ? `Configure ${formatRoleName(editRole.name)} Permissions`
                      : `Edit Role: ${formatRoleName(editRole.name)}`
                    : "Create New Role"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Configure role identifier and assign granular permissions across the system.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0">
              <div className="p-6 overflow-y-auto space-y-5 flex-1">
                {/* Basic Info Field (Description removed) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Role Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. event_coordinator"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    disabled={editRole?.is_protected}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 bg-white dark:bg-[#1E293B] transition-colors disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400"
                  />
                  {editRole?.is_protected && (
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                      System role identifiers are protected and cannot be renamed.
                    </p>
                  )}
                </div>

                {/* Permissions Section Header & Controls */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                        <Sliders size={13} className="text-blue-500" />
                        Role Permissions Matrix
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Choose what features and operations users with this role can execute.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">
                        {selectedCount} / {totalActionKeys} enabled
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            permissions: ALL_ACTION_KEYS,
                          }))
                        }
                        className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300 dark:text-slate-700">|</span>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            permissions: [],
                          }))
                        }
                        className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  {/* Permissions Modules List */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800/70 overflow-hidden bg-slate-50/50 dark:bg-slate-900/30">
                    {PERMISSION_MODULES.map((mod) => {
                      const moduleActionKeys = mod.actions.map(
                        (a) => `${mod.key}.${a.key}`
                      );
                      const enabledActions = moduleActionKeys.filter((k) =>
                        (form.permissions || []).includes(k)
                      );
                      const allEnabled =
                        enabledActions.length === moduleActionKeys.length;
                      const someEnabled = enabledActions.length > 0;

                      return (
                        <div key={mod.key} className="p-3.5 bg-white dark:bg-[#131C2E]/60">
                          {/* Module Header / Toggle */}
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
                              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 leading-tight">
                                {mod.desc}
                              </p>
                            </div>
                          </div>

                          {/* Action Pills */}
                          {mod.categories ? (
                            <div className="mt-3 ml-6 space-y-3">
                              {mod.categories.map((cat) => {
                                const catActionKeys = cat.actions.map(
                                  (a) => `${mod.key}.${a.key}`
                                );
                                const catAllOn = catActionKeys.every((k) =>
                                  (form.permissions || []).includes(k)
                                );

                                const toggleCategory = (e) => {
                                  e.stopPropagation();
                                  if (catAllOn) {
                                    setForm((prev) => ({
                                      ...prev,
                                      permissions: (prev.permissions || []).filter(
                                        (k) => !catActionKeys.includes(k)
                                      ),
                                    }));
                                  } else {
                                    setForm((prev) => {
                                      const nextSet = new Set(prev.permissions || []);
                                      catActionKeys.forEach((k) => nextSet.add(k));
                                      return { ...prev, permissions: Array.from(nextSet) };
                                    });
                                  }
                                };

                                return (
                                  <div
                                    key={cat.name}
                                    className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 space-y-2"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                        {cat.name}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={toggleCategory}
                                        className="text-[9px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                                      >
                                        {catAllOn ? "Deselect All" : "Select All"}
                                      </button>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                      {cat.actions.map((action) => {
                                        const actionKey = `${mod.key}.${action.key}`;
                                        const isOn = (form.permissions || []).includes(
                                          actionKey
                                        );

                                        return (
                                          <button
                                            key={actionKey}
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleAction(actionKey);
                                            }}
                                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-1 ${
                                              isOn
                                                ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                                                : "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-300"
                                            }`}
                                          >
                                            {isOn && <Check size={10} />}
                                            {action.label}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1.5 mt-2.5 ml-6">
                              {mod.actions.map((action) => {
                                const actionKey = `${mod.key}.${action.key}`;
                                const isOn = (form.permissions || []).includes(
                                  actionKey
                                );

                                return (
                                  <button
                                    key={actionKey}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleAction(actionKey);
                                    }}
                                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-1 ${
                                      isOn
                                        ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                                        : "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-300"
                                    }`}
                                  >
                                    {isOn && <Check size={10} />}
                                    {action.label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-60 shadow-xs"
                >
                  {formLoading ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Shield size={13} />
                  )}
                  {editRole ? "Save Changes" : "Create Role & Permissions"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
