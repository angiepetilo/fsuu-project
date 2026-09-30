import { useState, useEffect } from "react";
import api from "@/lib/axios";
import { notify } from "@/lib/notify";
import {
  PERMISSION_MODULES,
  ALL_ACTION_KEYS,
  expandPermissions,
} from "./permissionsConfig";
import ConfirmModal from "@/components/ui/ConfirmModal";

// Dynamic role name formatter directly from DB string
const formatRoleName = (name = "") =>
  name ? name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "";

// Indeterminate checkbox component for module headers
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
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);

  const handleClose = () => {
    if (isFormDirty) {
      setShowDiscardModal(true);
    } else {
      setShowModal(false);
    }
  };

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
    setIsFormDirty(false);
    setShowModal(true);
  };

  const openEdit = (r) => {
    setEditRole(r);
    setForm({
      name: r.name,
      permissions: expandPermissions(r.permissions || []),
    });
    setIsFormDirty(false);
    setShowModal(true);
  };

  // Toggle single action key
  const toggleAction = (actionKey) => {
    setIsFormDirty(true);
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
    setIsFormDirty(true);
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
        notify.success("Saved", `Role ${formatRoleName(form.name)} updated.`);
      } else {
        await api.post("/sysad/roles", payload);
        notify.success("Created", `Role ${formatRoleName(form.name)} created.`);
      }
      setShowModal(false);
      fetchRoles();
    } catch (err) {
      notify.error(
        "Failed",
        err.response?.data?.message || "Could not save role."
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (r) => {
    if (!window.confirm(`Delete ${formatRoleName(r.name)}?`)) return;
    setDeletingId(r.id);
    try {
      await api.delete(`/sysad/roles/${r.id}`);
      notify.success("Deleted", `Role removed.`);
      fetchRoles();
    } catch (err) {
      notify.error("Failed", err.response?.data?.message || "Could not delete.");
    } finally {
      setDeletingId(null);
    }
  };

  const selectedCount = form.permissions?.length || 0;
  const totalActionKeys = ALL_ACTION_KEYS.length;

  return (
    <div className="space-y-4">
      {/* Header section */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
          Roles
        </h3>
        <button
          type="button"
          onClick={openCreate}
          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
        >
          Add
        </button>
      </div>

      {/* Roles Table */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Permissions
                </th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Users
                </th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-xs text-slate-500">
                    Loading...
                  </td>
                </tr>
              ) : roles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-xs text-slate-500">
                    Empty
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
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800 dark:text-white">
                            {displayName}
                          </span>
                          {r.is_protected ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase">
                              System
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 uppercase">
                              Custom
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {permsCount > 0 ? (
                          <span className="font-medium">
                            {permsCount}
                          </span>
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                        {r.users_count}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(r)}
                            className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-xs font-medium"
                          >
                            Edit
                          </button>
                          {!r.is_protected && (
                            <button
                              type="button"
                              onClick={() => handleDelete(r)}
                              disabled={deletingId === r.id || r.users_count > 0}
                              className="px-2.5 py-1 rounded border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer text-xs font-medium disabled:opacity-40"
                            >
                              Delete
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                {editRole ? "Edit" : "Create"}
              </h3>
              <button
                type="button"
                onClick={handleClose}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0">
              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Role
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="role_name"
                    value={form.name}
                    onChange={(e) => {
                      setIsFormDirty(true);
                      setForm((f) => ({ ...f, name: e.target.value }));
                    }}
                    disabled={editRole?.is_protected}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500 disabled:opacity-60"
                  />
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Permissions ({selectedCount}/{totalActionKeys})
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsFormDirty(true);
                          setForm((f) => ({
                            ...f,
                            permissions: ALL_ACTION_KEYS,
                          }));
                        }}
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        Select
                      </button>
                      <span className="text-slate-300 dark:text-slate-700">|</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsFormDirty(true);
                          setForm((f) => ({
                            ...f,
                            permissions: [],
                          }));
                        }}
                        className="text-xs font-semibold text-slate-500 hover:underline cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Modules List */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
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
                        <div key={mod.key} className="p-3 bg-white dark:bg-slate-900">
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

                          {/* Action Pills */}
                          <div className="flex flex-wrap gap-1.5 mt-2 ml-6">
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
                                  className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border transition-colors cursor-pointer ${
                                    isOn
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
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-3.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {formLoading ? "Saving" : editRole ? "Save" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Discard Confirmation Modal */}
      <ConfirmModal
        open={showDiscardModal}
        onClose={() => setShowDiscardModal(false)}
        onConfirm={() => {
          setShowDiscardModal(false);
          setIsFormDirty(false);
          setShowModal(false);
        }}
        variant="warning"
        title="Discard"
        message="Discard unsaved changes?"
        confirmLabel="Discard"
        cancelLabel="Keep"
      />
    </div>
  );
}
