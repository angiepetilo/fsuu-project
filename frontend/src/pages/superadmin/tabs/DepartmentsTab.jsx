import { useState, useEffect } from "react";
import { BookOpen, Plus, Edit2, Ban, X, Loader2 } from "lucide-react";
import api from "@/lib/axios";
import ConfirmModal from "@/components/ui/ConfirmModal";

export default function DepartmentsTab({ showMsg }) {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [editDept, setEditDept] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [disableTarget, setDisableTarget] = useState(null);

  const [deptForm, setDeptForm] = useState({
    code: "",
    name: "",
    status: "active",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const deptRes = await api.get("/admin/departments");
      const deptData = Array.isArray(deptRes.data) ? deptRes.data : [];
      setDepartments(deptData);
      localStorage.setItem("fsuu_departments", JSON.stringify(deptData));
      window.dispatchEvent(new Event("departments_updated"));
    } catch {
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveDept = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    const payload = { 
      code: deptForm.code, 
      name: deptForm.name,
      department_name: deptForm.name,
      status: deptForm.status || "active",
    };

    if (editDept) {
      // ── OPTIMISTIC EDIT ─────────────────────────────────────────────────
      const prev = departments;
      setDepartments(d => d.map(x => x.id === editDept.id ? { ...x, ...payload, _optimistic: true } : x));
      setShowAddDeptModal(false); setEditDept(null);
      try {
        await api.put(`/admin/departments/${editDept.id}`, payload);
        setDepartments(d => d.map(x => x.id === editDept.id ? { ...x, _optimistic: false } : x));
        showMsg(`Department "${payload.code}" updated!`);
      } catch (err) {
        setDepartments(prev); setEditDept(editDept); setShowAddDeptModal(true);
        showMsg(err.response?.data?.message || "Failed to update — changes reverted.");
      } finally { setFormLoading(false); }
    } else {
      // ── OPTIMISTIC ADD ──────────────────────────────────────────────────
      const tempId = `temp-${Date.now()}`;
      const prev = departments;
      setDepartments(d => [...d, { ...payload, id: tempId, _optimistic: true }]);
      setShowAddDeptModal(false);
      try {
        const res = await api.post("/admin/departments", payload);
        const actual = res.data?.department || res.data;
        setDepartments(d => d.map(x => x.id === tempId ? { ...(actual || x), _optimistic: false } : x));
        showMsg(`Department "${payload.code}" created!`);
      } catch (err) {
        setDepartments(prev);
        showMsg(err.response?.data?.message || "Failed to create — changes reverted.");
      } finally { setFormLoading(false); }
    }
  };

  const confirmToggleDisable = async () => {
    if (!disableTarget) return;
    const { id, code, status } = disableTarget;
    const isCurrentlyDisabled = status === "disabled" || status === "inactive";
    const newStatus = isCurrentlyDisabled ? "active" : "disabled";

    const prev = departments;
    setDepartments(d => d.map(x => x.id === id ? { ...x, status: newStatus } : x));
    setDisableTarget(null);

    try {
      await api.put(`/admin/departments/${id}`, { status: newStatus });
      showMsg(`Department "${code}" has been ${isCurrentlyDisabled ? 'enabled' : 'disabled'}.`);
    } catch (err) {
      setDepartments(prev);
      showMsg(err.response?.data?.message || `Failed to update department "${code}".`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            Departments
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Manage official university academic and administrative department codes.
          </p>
        </div>
        <button
          onClick={() => {
            setEditDept(null);
            setDeptForm({ code: "", name: "", status: "active" });
            setShowAddDeptModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-sm cursor-pointer transition-all"
        >
          <Plus size={16} /> Add Department
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
              <th className="px-4 py-3.5 w-12">#</th>
              <th className="px-4 py-3.5 w-32">Code</th>
              <th className="px-4 py-3.5">Department / Program Name</th>
              <th className="px-4 py-3.5 w-24">Status</th>
              <th className="px-4 py-3.5 text-right w-24">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-semibold">
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-10">
                  <div className="flex items-center justify-center gap-2 text-slate-400">
                    <div className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin" />
                    <span className="text-xs font-semibold italic">Loading departments...</span>
                  </div>
                </td>
              </tr>
            ) : departments.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-slate-400 text-xs font-semibold">
                  📚 No departments configured yet. Click "Add Department" to create one.
                </td>
              </tr>
            ) : (
              departments.map((dept, index) => {
                const isItemDisabled = dept.status === "disabled" || dept.status === "inactive";
                return (
                  <tr key={dept.id || index} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-400">{index + 1}</td>
                    <td className="px-4 py-3.5">
                      <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-mono font-extrabold text-[11px]">
                        {dept.code}
                      </span>
                    </td>
                    <td className={`px-4 py-3.5 font-extrabold ${isItemDisabled ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                      {dept.name || dept.department_name}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        !isItemDisabled
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}>
                        {!isItemDisabled ? "ACTIVE" : "DISABLED"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditDept(dept);
                            setDeptForm({
                              code: dept.code || "",
                              name: dept.name || dept.department_name || "",
                              status: dept.status || "active",
                            });
                            setShowAddDeptModal(true);
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                          title="Edit Department"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => setDisableTarget({ id: dept.id, code: dept.code, status: dept.status })}
                          className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${
                            isItemDisabled
                              ? "border-emerald-200 hover:bg-emerald-50 text-emerald-600"
                              : "border-rose-200 hover:bg-rose-50 text-rose-600"
                          }`}
                          title={isItemDisabled ? "Enable Department" : "Disable Department"}
                        >
                          <Ban size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showAddDeptModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[1500] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 border border-slate-100 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm">
                {editDept ? "Edit Department" : "Add Department"}
              </h3>
              <button onClick={() => setShowAddDeptModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveDept} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Department Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CCS, CITEC, CCJE"
                  value={deptForm.code}
                  onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. College of Information, Technology, Entertainment, and Computing"
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddDeptModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  {formLoading && <Loader2 size={14} className="animate-spin" />}
                  <span>Save</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!disableTarget}
        onClose={() => setDisableTarget(null)}
        onConfirm={confirmToggleDisable}
        title={disableTarget?.status === "disabled" ? "Enable Department" : "Disable Department"}
        message={`Are you sure you want to ${disableTarget?.status === "disabled" ? 'enable' : 'disable'} department "${disableTarget?.code}"?`}
        confirmText={disableTarget?.status === "disabled" ? "Enable" : "Disable"}
        variant={disableTarget?.status === "disabled" ? "primary" : "danger"}
      />
    </div>
  );
}
