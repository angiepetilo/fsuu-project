import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, X, Building, CheckCircle2, Loader2, Image as ImageIcon, Camera } from "lucide-react";
import api from "@/lib/axios";

export default function VenuesTab({ showMsg }) {
  const [venues, setVenues] = useState([]);
  const [offices, setOffices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    avatar: "",
    office_id: "",
    status: "available",
    location: "",
    capacity: 100,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [venueRes, offRes] = await Promise.all([
        api.get("/admin/venues"),
        api.get("/admin/offices").catch(() => ({ data: [] })),
      ]);
      setVenues(Array.isArray(venueRes.data) ? venueRes.data : []);
      setOffices(Array.isArray(offRes.data) ? offRes.data : []);
    } catch {
      setVenues([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm((prev) => ({ ...prev, avatar: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormLoading(true);

    const payload = {
      name: form.name,
      avatar: form.avatar || null,
      office_id: form.office_id ? parseInt(form.office_id, 10) : (offices[0]?.id || null),
      status: form.status || "available",
      location: form.location || null,
      capacity: parseInt(form.capacity, 10) || 100,
    };

    try {
      let savedVenue;
      if (editItem) {
        const res = await api.put(`/admin/venues/${editItem.id}`, payload);
        savedVenue = res.data;
        showMsg(`✅ Venue "${form.name}" updated!`);
      } else {
        const res = await api.post("/admin/venues", payload);
        savedVenue = res.data;
        showMsg(`✅ Venue "${form.name}" created and added to catalog!`);
      }

      // Sync venue avatar and status to local storage
      try {
        const existingStr = localStorage.getItem("fsuu_venue_availability");
        let list = existingStr ? JSON.parse(existingStr) : [];
        const venueObj = savedVenue || payload;
        if (venueObj) {
          const idx = list.findIndex(item => item.id === venueObj.id || item.name === form.name);
          const formatted = {
            id: venueObj.id || Date.now(),
            name: form.name,
            photo: form.avatar || payload.avatar,
            avatar: form.avatar || payload.avatar,
            image: form.avatar || payload.avatar,
            location: form.location,
            capacity: form.capacity,
            status: form.status || 'Available',
          };
          if (idx >= 0) list[idx] = { ...list[idx], ...formatted };
          else list.push(formatted);
          localStorage.setItem("fsuu_venue_availability", JSON.stringify(list));
          window.dispatchEvent(new Event("venue_availability_updated"));
        }
      } catch { }

      setShowModal(false);
      setEditItem(null);
      fetchData();
    } catch (err) {
      showMsg(err.response?.data?.message || "❌ Failed to save venue.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (confirm(`Archive venue "${name}"? Soft-delete will apply.`)) {
      try {
        await api.delete(`/admin/venues/${id}`);
        showMsg(`✅ Venue "${name}" archived.`);
        fetchData();
      } catch {
        showMsg("❌ Failed to archive venue.");
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <Building size={18} className="text-blue-600" />
            Venue Catalog Management
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Venues created in this catalog with avatars will be displayed directly in the public venue booking process.
          </p>
        </div>
        <button
          onClick={() => {
            setEditItem(null);
            setForm({
              name: "",
              avatar: "",
              office_id: offices[0]?.id || "",
              status: "available",
              location: "",
              capacity: 100,
            });
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-sm cursor-pointer"
        >
          <Plus size={16} /> Create Venue
        </button>
      </div>

      {/* Table: [#, Avatar, Venue, Office, Status, Action] */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-100">
              {["#", "Avatar", "Venue", "Office", "Status", "Action"].map((h) => (
                <th key={h} className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-semibold">
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-10">
                  <div className="flex items-center justify-center gap-2 text-slate-400">
                    <div className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin" />
                    <span className="text-xs font-semibold italic">Loading venues catalog...</span>
                  </div>
                </td>
              </tr>
            ) : venues.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-slate-400">
                  🏛️ No venues registered. Click "Create Venue" to add your first venue.
                </td>
              </tr>
            ) : (
              venues.map((v, idx) => (
                <tr key={v.id || idx} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-slate-400">{idx + 1}</td>
                  <td className="px-4 py-3.5">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shadow-inner">
                      {v.avatar ? (
                        <img src={v.avatar} alt={v.name} className="w-full h-full object-cover" />
                      ) : (
                        <Building size={20} className="text-slate-400" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-extrabold text-slate-900 text-sm block">{v.name}</span>
                    {v.location && <span className="text-[11px] text-slate-500 font-medium block">{v.location}</span>}
                  </td>
                  <td className="px-4 py-3.5 text-slate-700 font-extrabold">
                    {v.office?.name || (offices.find(o => o.id === v.office_id)?.name) || "FSUU Main Campus"}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-extrabold capitalize border ${
                      v.status === 'maintenance' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                      v.status === 'decommissioned' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                      'bg-emerald-100 text-emerald-800 border-emerald-300'
                    }`}>
                      {v.status || "available"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditItem(v);
                        setForm({
                          name: v.name || "",
                          avatar: v.avatar || "",
                          office_id: v.office_id || offices[0]?.id || "",
                          status: v.status || "available",
                          location: v.location || "",
                          capacity: v.capacity || 100,
                        });
                        setShowModal(true);
                      }}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                      title="Edit Venue"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(v.id, v.name)}
                      className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="Archive Venue"
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

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[1500] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Building size={18} className="text-blue-600" />
                {editItem ? "Edit Venue Record" : "Create New Venue Catalog Record"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {/* Avatar Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Venue Photo Avatar *</label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                    {form.avatar ? (
                      <img src={form.avatar} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={24} className="text-slate-400" />
                    )}
                  </div>
                  <div>
                    <label className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer">
                      <Camera size={14} />
                      <span>{form.avatar ? "Change Avatar" : "Upload Venue Photo Avatar"}</span>
                      <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                    </label>
                    <p className="text-[10px] text-slate-400 font-medium mt-1">
                      This venue photo avatar will display in public venue booking.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Venue Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FSUU Main Auditorium, AVR Hall 1"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {offices.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-slate-900 mb-1">Assigned Office / Branch *</label>
                    <select
                      value={form.office_id}
                      onChange={(e) => setForm({ ...form, office_id: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-xs focus:outline-none"
                    >
                      {offices.map((o) => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Operating Status *</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-xs focus:outline-none"
                  >
                    <option value="available">Available</option>
                    <option value="maintenance">Under Maintenance</option>
                    <option value="decommissioned">Decommissioned</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Seating Capacity (Max Pax) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 100"
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Location / Floor Specs</label>
                  <input
                    type="text"
                    placeholder="e.g. 3rd Floor Main Building"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
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
                  <span>Save Venue Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
