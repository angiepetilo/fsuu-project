import { useState, useEffect } from "react";
import { Building2, MapPin, Plus, Edit2, Trash2, CheckCircle2, X, Loader2, Layers } from "lucide-react";
import api from "@/lib/axios";

export default function CampusManagementTab({ showMsg }) {
  const [locations, setLocations] = useState([]);
  const [offices, setOffices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editLocation, setEditLocation] = useState(null);
  const [locationForm, setLocationForm] = useState({ name: "", status: "active" });

  const [showOfficeModal, setShowOfficeModal] = useState(false);
  const [editOffice, setEditOffice] = useState(null);
  const [officeForm, setOfficeForm] = useState({ name: "", location: "" });

  const [formLoading, setFormLoading] = useState(false);
  const [locationFilter, setLocationFilter] = useState("all");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [locRes, offRes] = await Promise.all([
        api.get("/admin/locations").catch(() => ({ data: [] })),
        api.get("/admin/offices").catch(() => ({ data: [] })),
      ]);

      const locList = Array.isArray(locRes.data) ? locRes.data : [];
      const offList = Array.isArray(offRes.data) ? offRes.data : [];

      setLocations(locList);
      setOffices(offList);

      if (locList.length > 0 && !officeForm.location) {
        setOfficeForm((prev) => ({ ...prev, location: locList[0].name }));
      }
    } catch {
      setLocations([]);
      setOffices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- Location Actions ---
  const handleSaveLocation = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const payload = {
        name: locationForm.name,
        status: locationForm.status || "active",
      };

      if (editLocation) {
        await api.put(`/admin/locations/${editLocation.id}`, payload);
        showMsg(`✅ Campus location "${locationForm.name}" updated!`);
      } else {
        await api.post("/admin/locations", payload);
        showMsg(`✅ Campus location "${locationForm.name}" created! Available for office assignment.`);
      }

      setShowLocationModal(false);
      setEditLocation(null);
      fetchData();
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
        fetchData();
        window.dispatchEvent(new Event("campus_locations_updated"));
      } catch (err) {
        showMsg(err.response?.data?.message || "❌ Failed to archive location.");
      }
    }
  };

  // --- Office Actions ---
  const handleSaveOffice = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const targetLocation = officeForm.location || (locations[0]?.name || "FSUU Main Campus");
      const payload = {
        name: officeForm.name,
        location: targetLocation,
        slug: officeForm.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      };

      if (editOffice) {
        await api.put(`/admin/offices/${editOffice.id}`, payload);
        showMsg(`✅ Campus branch office "${officeForm.name}" updated!`);
      } else {
        await api.post("/admin/offices", payload);
        showMsg(`✅ Campus branch office "${officeForm.name}" created!`);
      }

      setShowOfficeModal(false);
      setEditOffice(null);
      fetchData();
      window.dispatchEvent(new Event("campus_offices_updated"));
    } catch (err) {
      showMsg(err.response?.data?.message || "❌ Failed to save campus office.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteOffice = async (id, name) => {
    if (confirm(`Delete campus branch office "${name}"? Only System Admin can perform this action.`)) {
      try {
        await api.delete(`/admin/offices/${id}`);
        showMsg(`✅ Campus branch office "${name}" removed.`);
        fetchData();
        window.dispatchEvent(new Event("campus_offices_updated"));
      } catch (err) {
        showMsg(err.response?.data?.message || "❌ Failed to delete branch office.");
      }
    }
  };

  const filteredOffices = locationFilter === "all"
    ? offices
    : offices.filter((o) => (o.location || "FSUU Main Campus") === locationFilter);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
            <Building2 size={20} className="text-blue-600" />
            Campuses &amp; Branch Offices Management
          </h3>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Manage university physical locations (e.g., FSUU Main, FSUU Morelos) and the administrative branch offices (e.g., AVR Office, Property Office) operating within each location.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setEditLocation(null);
              setLocationForm({ name: "", status: "active" });
              setShowLocationModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold shadow-sm cursor-pointer"
          >
            <Plus size={15} /> Add Campus Location
          </button>
          <button
            onClick={() => {
              setEditOffice(null);
              setOfficeForm({ name: "", location: locations[0]?.name || "FSUU Main Campus" });
              setShowOfficeModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-sm cursor-pointer"
          >
            <Plus size={15} /> Add Branch Office
          </button>
        </div>
      </div>

      {/* Section 1: Physical Campus Locations Summary */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <MapPin size={16} className="text-blue-600" />
            Physical Campus Locations ({locations.length})
          </h4>
          <span className="text-[10px] uppercase font-bold text-slate-400">Physical Sites</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {loading ? (
            <div className="col-span-full bg-white p-6 rounded-2xl border border-slate-200/80 text-center text-slate-400 text-xs font-semibold">
              <Loader2 size={16} className="animate-spin inline mr-2" />
              Loading campus locations...
            </div>
          ) : locations.length === 0 ? (
            <div className="col-span-full bg-white p-6 rounded-2xl border border-slate-200/80 text-center text-slate-400 text-xs font-semibold">
              📍 No physical campus locations configured. Click "Add Campus Location" to set up your primary campuses.
            </div>
          ) : (
            locations.map((loc) => {
              const officeCount = offices.filter((o) => (o.location || "FSUU Main Campus") === loc.name).length;
              return (
                <div key={loc.id} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-blue-200 transition-all">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 text-xs">{loc.name}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                        ACTIVE
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                      <Building2 size={12} className="text-slate-400" />
                      {officeCount} {officeCount === 1 ? "Branch Office" : "Branch Offices"} assigned
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditLocation(loc);
                        setLocationForm({ name: loc.name, status: loc.status || "active" });
                        setShowLocationModal(true);
                      }}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                      title="Edit Location"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteLocation(loc.id, loc.name)}
                      className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="Archive Location"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Section 2: Campus Branch Offices Table */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Layers size={16} className="text-blue-600" />
            Campus Branch Offices ({filteredOffices.length})
          </h4>

          {/* Location Filter */}
          {locations.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Filter Location:</span>
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-extrabold text-slate-800 focus:outline-none cursor-pointer shadow-xs"
              >
                <option value="all">All Locations ({offices.length})</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.name}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                {["#", "Branch Office Name", "Assigned Campus Location", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-10">
                    <div className="flex items-center justify-center gap-2 text-slate-400">
                      <Loader2 size={16} className="animate-spin text-blue-600" />
                      <span className="text-xs italic">Loading branch offices...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredOffices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400">
                    🏢 No campus branch offices registered. Click "Add Branch Office" to add one.
                  </td>
                </tr>
              ) : (
                filteredOffices.map((off, index) => (
                  <tr key={off.id || index} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-400">{index + 1}</td>
                    <td className="px-4 py-3.5 font-extrabold text-slate-900 flex items-center gap-2">
                      <Building2 size={14} className="text-blue-600" />
                      {off.name}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                        <MapPin size={12} />
                        {off.location || "FSUU Main Campus"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                        <CheckCircle2 size={12} /> ACTIVE BRANCH
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditOffice(off);
                            setOfficeForm({
                              name: off.name || "",
                              location: off.location || locations[0]?.name || "FSUU Main Campus",
                            });
                            setShowOfficeModal(true);
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                          title="Edit Branch Office"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteOffice(off.id, off.name)}
                          className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Delete Branch Office"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Add / Edit Campus Location */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[1500] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 border border-slate-100 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <MapPin size={18} className="text-blue-600" />
                {editLocation ? "Edit Campus Location" : "Create New Campus Location"}
              </h3>
              <button onClick={() => setShowLocationModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
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
                  value={locationForm.name}
                  onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Status *</label>
                <select
                  value={locationForm.status}
                  onChange={(e) => setLocationForm({ ...locationForm, status: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowLocationModal(false)}
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

      {/* Modal 2: Add / Edit Branch Office */}
      {showOfficeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[1500] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 border border-slate-100 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Building2 size={18} className="text-blue-600" />
                {editOffice ? "Edit Campus Branch Office" : "Create New Branch Office"}
              </h3>
              <button onClick={() => setShowOfficeModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveOffice} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Branch Office Name *</label>
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
                <label className="block text-xs font-bold text-slate-900 mb-1">Assigned Campus Location *</label>
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
                    <option value="" disabled>No campus locations created yet</option>
                  )}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">Select the physical campus location where this office is based.</p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowOfficeModal(false)}
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
                  <span>Save Branch Office</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
