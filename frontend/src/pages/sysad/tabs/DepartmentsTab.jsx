import { useState, useEffect } from "react";
import { BookOpen, Plus, Edit2, Trash2, X, Loader2, MapPin } from "lucide-react";
import api from "@/lib/axios";

export default function DepartmentsTab({ showMsg }) {
  const [departments, setDepartments] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [editDept, setEditDept] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const [deptForm, setDeptForm] = useState({
    code: "",
    campus_location: "",
    name: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [deptRes, locRes] = await Promise.all([
        api.get("/admin/departments"),
        api.get("/admin/locations").catch(() => ({ data: [] })),
      ]);
      const deptData = Array.isArray(deptRes.data) ? deptRes.data : [];
      setDepartments(deptData);
      localStorage.setItem("fsuu_departments", JSON.stringify(deptData));
      window.dispatchEvent(new Event("departments_updated"));
      const locList = Array.isArray(locRes.data) ? locRes.data : [];
      setLocations(locList);
      if (locList.length > 0 && !deptForm.campus_location) {
        setDeptForm(prev => ({ ...prev, campus_location: locList[0].name }));
      }
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
    try {
      const payload = {
        code: deptForm.code,
        name: deptForm.name,
        campus_location: deptForm.campus_location || locations[0]?.name || "FSUU Main Campus",
      };

      if (editDept) {
        await api.put(`/admin/departments/${editDept.id}`, payload);
        showMsg(`✅ Department "${deptForm.code}" updated successfully!`);
      } else {
        await api.post("/admin/departments", payload);
        showMsg(`✅ Department "${deptForm.code}" created successfully!`);
      }
      setShowAddDeptModal(false);
      setEditDept(null);
      fetchData();
    } catch (err) {
      showMsg(err.response?.data?.message || "❌ Failed to save department.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteDept = async (id, code) => {
    if (confirm(`Delete department "${code}"? It will be soft-deleted.`)) {
      try {
        await api.delete(`/admin/departments/${id}`);
        showMsg(`✅ Department "${code}" archived (soft-deleted).`);
        fetchData();
      } catch {
        showMsg("❌ Failed to delete department.");
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <BookOpen size={18} className="text-blue-600" />
            Departments & Programs Management
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Manage academic colleges, facility departments, and campus locations for requisitions.
          </p>
        </div>
        <button
          onClick={() => {
            setEditDept(null);
            setDeptForm({
              code: "",
              name: "",
              campus_location: locations[0]?.name || "FSUU Main Campus",
            });
            setShowAddDeptModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-sm cursor-pointer"
        >
          <Plus size={16} /> Add Department
        </button>
      </div>

      {/* Table: [#, Code, Campus Location, Department Name, Actions] */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-100">
              {["#", "Code", "Campus Location", "Department Name", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-semibold">
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-slate-400">
                  <Loader2 className="animate-spin inline mr-2" size={18} /> Loading departments...
                </td>
              </tr>
            ) : departments.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-slate-400 text-xs font-semibold">
                  📚 No departments configured yet. Click "Add Department" to create one.
                </td>
              </tr>
            ) : (
              departments.map((dept, index) => (
                <tr key={dept.id || index} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-slate-400">{index + 1}</td>
                  <td className="px-4 py-3.5">
                    <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-mono font-extrabold text-[11px]">
                      {dept.code}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                      <MapPin size={12} className="text-blue-600 shrink-0" />
                      {dept.campus_location || dept.campus || "FSUU Main Campus"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-extrabold text-slate-900">
                    {dept.name}
                  </td>
                  <td className="px-4 py-3.5 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditDept(dept);
                        setDeptForm({
                          code: dept.code || "",
                          name: dept.name || "",
                          campus_location: dept.campus_location || locations[0]?.name || "FSUU Main Campus",
                        });
                        setShowAddDeptModal(true);
                      }}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                      title="Edit Department"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteDept(dept.id, dept.code)}
                      className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="Delete Department"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showAddDeptModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[1500] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 border border-slate-100 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <BookOpen size={18} className="text-blue-600" />
                {editDept ? "Edit Department Record" : "Add New Department"}
              </h3>
              <button onClick={() => setShowAddDeptModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveDept} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CCS"
                    value={deptForm.code}
                    onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-900 mb-1">Campus Location *</label>
                  <select
                    value={deptForm.campus_location}
                    onChange={(e) => setDeptForm({ ...deptForm, campus_location: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    {locations.length > 0 ? (
                      locations.map((loc) => (
                        <option key={loc.id} value={loc.name}>{loc.name}</option>
                      ))
                    ) : (
                      <option value="FSUU Main Campus">FSUU Main Campus</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. College of Computing Studies"
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddDeptModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md flex items-center gap-1.5"
                >
                  {formLoading && <Loader2 size={14} className="animate-spin" />}
                  <span>Save Department</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
