import { useState, useEffect } from "react";
import { Building2, Plus, Edit2, Trash2, CheckCircle2, X, Loader2, MapPin } from "lucide-react";
import api from "@/lib/axios";

export default function CampusOfficesTab({ showMsg }) {
  const [campusOffices, setCampusOffices] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddOfficeModal, setShowAddOfficeModal] = useState(false);
  const [editOffice, setEditOffice] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const [officeForm, setOfficeForm] = useState({
    name: "",
    location: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [offRes, locRes] = await Promise.all([
        api.get("/admin/offices"),
        api.get("/admin/locations").catch(() => ({ data: [] })),
      ]);
      const offList = Array.isArray(offRes.data) ? offRes.data : [];
      const locList = Array.isArray(locRes.data) ? locRes.data : [];
      setCampusOffices(offList);
      setLocations(locList);
      if (locList.length > 0 && !officeForm.location) {
        setOfficeForm(prev => ({ ...prev, location: locList[0].name }));
      }
    } catch {
      setCampusOffices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveOffice = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const loc = officeForm.location || (locations[0]?.name || "FSUU Main Campus");
      const payload = {
        name: officeForm.name,
        location: loc,
      };

      if (editOffice) {
        await api.put(`/admin/offices/${editOffice.id}`, payload);
        showMsg(`✅ Campus office "${officeForm.name}" updated!`);
      } else {
        await api.post("/admin/offices", payload);
        showMsg(`✅ Campus office "${officeForm.name}" created! Branch admins can now be assigned.`);
      }
      setShowAddOfficeModal(false);
      setEditOffice(null);
      fetchData();
      window.dispatchEvent(new Event("campus_offices_updated"));
    } catch (err) {
      showMsg(err.response?.data?.message || "❌ Failed to save office.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteOffice = async (id, name) => {
    if (confirm(`Delete campus office "${name}"? Only System Admin can perform this action.`)) {
      try {
        await api.delete(`/admin/offices/${id}`);
        showMsg(`✅ Campus office "${name}" removed.`);
        fetchData();
        window.dispatchEvent(new Event("campus_offices_updated"));
      } catch (err) {
        showMsg(err.response?.data?.message || "❌ Failed to delete campus office.");
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <Building2 size={18} className="text-blue-600" />
            Campus Branch Offices Management
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            <strong className="text-amber-600 font-bold">System Admin Controlled:</strong> Create and manage official campus office locations (e.g., FSUU Main, FSUU Morelos) so requisitions are strictly isolated by branch.
          </p>
        </div>
        <button
          onClick={() => {
            setEditOffice(null);
            setOfficeForm({ name: "", location: locations[0]?.name || "" });
            setShowAddOfficeModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-sm cursor-pointer"
        >
          <Plus size={16} /> Create Campus Office
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-100">
              {["#", "Office / Campus Name", "Campus Location", "Status", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-semibold">
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-10">
                  <div className="flex items-center justify-center gap-2 text-slate-400">
                    <div className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin" />
                    <span className="text-xs font-semibold italic">Loading offices...</span>
                  </div>
                </td>
              </tr>
            ) : campusOffices.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-slate-400">
                  🏢 No campus branch offices created yet. Click "Create Campus Office" to add one.
                </td>
              </tr>
            ) : (
              campusOffices.map((off, index) => (
                <tr key={off.id || index} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-slate-400">{index + 1}</td>
                  <td className="px-4 py-3.5 font-extrabold text-slate-900">{off.name}</td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                      <MapPin size={12} />
                      {off.location || "FSUU Main Campus"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 size={12} /> Active Branch
                    </span>
                  </td>
                  <td className="px-4 py-3.5 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditOffice(off);
                        setOfficeForm({
                          name: off.name || "",
                          location: off.location || locations[0]?.name || "",
                        });
                        setShowAddOfficeModal(true);
                      }}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                      title="Edit Office"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteOffice(off.id, off.name)}
                      className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="Delete Office"
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

      {showAddOfficeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[1500] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 border border-slate-100 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Building2 size={18} className="text-blue-600" />
                {editOffice ? "Edit Campus Office Record" : "Create New Campus / Branch Office"}
              </h3>
              <button onClick={() => setShowAddOfficeModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveOffice} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Campus Office Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FSUU Main Campus AVR Office or Morelos SCO Office"
                  value={officeForm.name}
                  onChange={(e) => setOfficeForm({ ...officeForm, name: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Campus Location *</label>
                <select
                  value={officeForm.location}
                  onChange={(e) => setOfficeForm({ ...officeForm, location: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                >
                  {locations.length > 0 ? (
                    locations.map((loc) => (
                      <option key={loc.id} value={loc.name}>
                        {loc.name}
                      </option>
                    ))
                  ) : (
                    <option value="">No locations available. Create one in Locations tab.</option>
                  )}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">Select from registered campus locations in the Location tab.</p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddOfficeModal(false)}
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
                  <span>Save Campus Office</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
