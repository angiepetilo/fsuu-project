import { useState, useEffect } from "react";
import { MapPin, Plus, Edit2, Trash2, CheckCircle2, X, Loader2 } from "lucide-react";
import api from "@/lib/axios";

export default function CampusLocationsTab({ showMsg }) {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    status: "active",
  });

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/locations");
      setLocations(Array.isArray(res.data) ? res.data : []);
    } catch {
      const saved = JSON.parse(localStorage.getItem("fsuu_campus_locations") || "[]");
      setLocations(saved);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const handleSaveLocation = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const payload = {
        name: form.name,
        status: form.status || "active",
      };

      if (editItem) {
        await api.put(`/admin/locations/${editItem.id}`, payload);
        showMsg(`✅ Campus location "${form.name}" updated!`);
      } else {
        await api.post("/admin/locations", payload);
        showMsg(`✅ Campus location "${form.name}" created! Available for campus office and department tagging.`);
      }
      setShowModal(false);
      setEditItem(null);
      fetchLocations();
      window.dispatchEvent(new Event("campus_locations_updated"));
    } catch (err) {
      showMsg(err.response?.data?.message || "❌ Failed to save campus location.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteLocation = async (id, name) => {
    if (confirm(`Archive campus location "${name}"? Only System Admin can perform this action.`)) {
      try {
        await api.delete(`/admin/locations/${id}`);
        showMsg(`✅ Campus location "${name}" archived.`);
        fetchLocations();
        window.dispatchEvent(new Event("campus_locations_updated"));
      } catch (err) {
        showMsg(err.response?.data?.message || "❌ Failed to delete location.");
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <MapPin size={18} className="text-blue-600" />
            Campus Locations Management
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Manage official university physical campus locations (e.g. FSUU Main Campus, FSUU Morelos Campus). Locations populated here automatically power dropdowns for branch offices and departments.
          </p>
        </div>
        <button
          onClick={() => {
            setEditItem(null);
            setForm({ name: "", status: "active" });
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-sm cursor-pointer"
        >
          <Plus size={16} /> Create Location
        </button>
      </div>

      {/* Table: [#, Campus Location Name, Status, Actions] */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-100">
              {["#", "Campus Location Name", "Status", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-semibold">
            {loading ? (
              <tr>
                <td colSpan={4} className="text-center py-10">
                  <div className="flex items-center justify-center gap-2 text-slate-400">
                    <div className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin" />
                    <span className="text-xs font-semibold italic">Loading campus locations...</span>
                  </div>
                </td>
              </tr>
            ) : locations.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-10 text-slate-400">
                  📍 No campus locations created yet. Click "Create Location" to add one.
                </td>
              </tr>
            ) : (
              locations.map((loc, index) => (
                <tr key={loc.id || index} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-slate-400">{index + 1}</td>
                  <td className="px-4 py-3.5 font-extrabold text-slate-900 flex items-center gap-2">
                    <MapPin size={14} className="text-blue-600" />
                    {loc.name}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 size={12} /> Active Location
                    </span>
                  </td>
                  <td className="px-4 py-3.5 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditItem(loc);
                        setForm({ name: loc.name, status: loc.status || "active" });
                        setShowModal(true);
                      }}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                      title="Edit Location"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteLocation(loc.id, loc.name)}
                      className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="Delete Location"
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

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[1500] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 border border-slate-100 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <MapPin size={18} className="text-blue-600" />
                {editItem ? "Edit Campus Location Record" : "Create New Campus Location"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveLocation} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Campus Location Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FSUU Main Campus, FSUU Morelos Campus"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Status *</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
                  <span>Save Location</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
