import { useState, useEffect } from "react";
import { Plus, Edit2, Ban, CheckCircle2, X, Building, Loader2, Image as ImageIcon, Camera, Trash2 } from "lucide-react";
import api from "@/lib/axios";
import ConfirmModal from "@/components/ui/ConfirmModal";

export default function VenuesTab({ showMsg }) {
  const [venues, setVenues] = useState([]);
  const [equipmentCatalog, setEquipmentCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [disableTarget, setDisableTarget] = useState(null); // { id, name, status }

  const [form, setForm] = useState({
    name: "",
    photo: "",
    avatar: "",
    status: "available",
    location: "",
    capacity: 100,
    allowed_equipment: [],
    equipment_max_qtys: {}, // { [equipId]: maxQty }
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [venueRes, equipRes] = await Promise.all([
        api.get("/admin/venues").catch(() => api.get("/public/venues")),
        api.get("/admin/equipment-types").catch(() => api.get("/public/equipment-types").catch(() => ({ data: [] }))),
      ]);
      const rawVenues = Array.isArray(venueRes.data) ? venueRes.data : [];
      const rawEquip = Array.isArray(equipRes.data) ? equipRes.data : (equipRes.data?.data || []);
      setVenues(rawVenues);
      setEquipmentCatalog(rawEquip);
      try {
        if (rawVenues.length > 0) {
          localStorage.setItem("fsuu_venues_catalog", JSON.stringify(rawVenues));
        }
        if (rawEquip.length > 0) {
          localStorage.setItem("fsuu_equipment_types", JSON.stringify(rawEquip));
        }
      } catch {}
    } catch {
      try {
        const savedVenues = JSON.parse(localStorage.getItem("fsuu_venues_catalog") || "[]");
        const savedEquip = JSON.parse(localStorage.getItem("fsuu_equipment_types") || "[]");
        setVenues(savedVenues);
        setEquipmentCatalog(savedEquip);
      } catch {
        setVenues([]);
        setEquipmentCatalog([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((prev) => ({ ...prev, photo: reader.result, avatar: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    setFormLoading(true);
    const photoData = form.photo || form.avatar;
    const payload = {
      name: form.name.trim(),
      photo: photoData,
      avatar: photoData,
      status: form.status,
      location: form.location,
      capacity: form.capacity ? Number(form.capacity) : 100,
      allowed_equipment: form.allowed_equipment || [],
      allowed_equipment_types_id: JSON.stringify(form.allowed_equipment || []),
      equipment_max_qtys: form.equipment_max_qtys || {},
    };

    if (editItem) {
      // ── OPTIMISTIC EDIT ─────────────────────────────────────────────────
      const prevVenues = venues;
      const updated = prevVenues.map(v => v.id === editItem.id ? { ...v, ...payload } : v);
      setVenues(updated);
      setShowModal(false);

      try {
        const res = await api.put(`/admin/venues/${editItem.id}`, payload);
        const saved = res.data?.venue || res.data;
        setVenues(prev => prev.map(v => v.id === editItem.id ? { ...v, ...saved } : v));
        try {
          localStorage.setItem("fsuu_venues_catalog", JSON.stringify(updated));
        } catch {}
        window.dispatchEvent(new Event("venues_updated"));
        showMsg("Venue details updated successfully.");
      } catch (err) {
        setVenues(prevVenues);
        showMsg(err.response?.data?.message || "Failed to update venue — changes reverted.");
      } finally {
        setFormLoading(false);
      }
    } else {
      // ── OPTIMISTIC CREATE ────────────────────────────────────────────────
      const tempId = Date.now();
      const newVenueTemp = { id: tempId, ...payload, created_at: new Date().toISOString() };
      const nextVenues = [newVenueTemp, ...venues];
      setVenues(nextVenues);
      setShowModal(false);

      try {
        const res = await api.post("/admin/venues", payload);
        const actualVenue = res.data?.venue || res.data || newVenueTemp;
        setVenues(prev => prev.map(v => v.id === tempId ? { ...actualVenue, id: actualVenue.id || tempId } : v));
        try {
          localStorage.setItem("fsuu_venues_catalog", JSON.stringify(nextVenues));
        } catch {}
        window.dispatchEvent(new Event("venues_updated"));
        showMsg("Venue created successfully.");
      } catch (err) {
        setVenues(venues);
        showMsg(err.response?.data?.message || "Failed to create venue — reverted.");
      } finally {
        setFormLoading(false);
      }
    }
  };

  const handleEditClick = (v) => {
    setEditItem(v);
    const rawAllowed = v.allowed_equipment || v.allowed_equipment_types_id || [];
    let parsedAllowed = [];
    if (Array.isArray(rawAllowed)) {
      parsedAllowed = rawAllowed;
    } else if (typeof rawAllowed === "string") {
      try { parsedAllowed = JSON.parse(rawAllowed); } catch { parsedAllowed = []; }
    }

    setForm({
      name: v.name || "",
      photo: v.photo || v.avatar || "",
      avatar: v.photo || v.avatar || "",
      status: v.status || "available",
      location: v.location || "",
      capacity: v.capacity || 100,
      allowed_equipment: parsedAllowed,
      equipment_max_qtys: v.equipment_max_qtys || {},
    });
    setShowModal(true);
  };

  const confirmToggleDisable = async () => {
    if (!disableTarget) return;
    const { id, name, status } = disableTarget;
    const isCurrentlyDisabled = status === "disabled" || status === "inactive" || status === "unavailable";
    const newStatus = isCurrentlyDisabled ? "available" : "disabled";

    const prevVenues = venues;
    const updated = prevVenues.map(v => v.id === id ? { ...v, status: newStatus } : v);
    setVenues(updated);
    setDisableTarget(null);

    try {
      await api.put(`/admin/venues/${id}`, { status: newStatus });
      try {
        localStorage.setItem("fsuu_venues_catalog", JSON.stringify(updated));
      } catch {}
      window.dispatchEvent(new Event("venues_updated"));
      showMsg(`Venue "${name}" has been ${isCurrentlyDisabled ? 'enabled' : 'disabled'}.`);
    } catch (err) {
      setVenues(prevVenues);
      showMsg(err.response?.data?.message || `Failed to update "${name}" status.`);
    }
  };

  const isItemChecked = (eq) => {
    if (!Array.isArray(form.allowed_equipment)) return false;
    const eqIdStr = String(eq.id);
    const eqNameLower = String(eq.name || eq.eq_name || "").trim().toLowerCase();
    return form.allowed_equipment.some(item => {
      const itemStr = String(item).trim();
      return itemStr === eqIdStr || (eqNameLower && itemStr.toLowerCase() === eqNameLower) || (Number(item) > 0 && Number(item) === Number(eq.id));
    });
  };

  const toggleEquipment = (eq) => {
    const checked = isItemChecked(eq);
    const eqId = Number(eq.id) || eq.id;
    const eqIdStr = String(eq.id);
    const eqNameLower = String(eq.name || eq.eq_name || "").trim().toLowerCase();

    if (checked) {
      setForm(prev => {
        const nextQtys = { ...prev.equipment_max_qtys };
        delete nextQtys[eqId];
        return {
          ...prev,
          allowed_equipment: (prev.allowed_equipment || []).filter(item => {
            const itemStr = String(item).trim();
            return itemStr !== eqIdStr && itemStr.toLowerCase() !== eqNameLower && Number(item) !== Number(eq.id);
          }),
          equipment_max_qtys: nextQtys,
        };
      });
    } else {
      setForm(prev => ({
        ...prev,
        allowed_equipment: [...(prev.allowed_equipment || []), eqId],
        equipment_max_qtys: {
          ...prev.equipment_max_qtys,
          [eqId]: prev.equipment_max_qtys?.[eqId] || eq.total_quantity || 1,
        }
      }));
    }
  };

  const handleMaxQtyChange = (eqId, qty) => {
    setForm(prev => ({
      ...prev,
      equipment_max_qtys: {
        ...prev.equipment_max_qtys,
        [eqId]: Math.max(1, Number(qty) || 1),
      }
    }));
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            Venue Creation
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Create and manage venue listings and configured allowed equipment for public bookings.
          </p>
        </div>
        <button
          onClick={() => {
            setEditItem(null);
            setForm({
              name: "",
              photo: "",
              avatar: "",
              status: "available",
              location: "",
              capacity: 100,
              allowed_equipment: [],
              equipment_max_qtys: {},
            });
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-sm cursor-pointer transition-all"
        >
          <Plus size={16} /> Create Venue
        </button>
      </div>

      {/* Table: [#, Photo, Venue, Status, Action] */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-100">
              {["#", "Photo", "Venue", "Status", "Action"].map((h) => (
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
                    <span>Loading venues...</span>
                  </div>
                </td>
              </tr>
            ) : venues.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-slate-400">
                  No venues found in catalog. Click "Create Venue" to add one.
                </td>
              </tr>
            ) : (
              venues.map((v, i) => {
                const isItemDisabled = v.status === "disabled" || v.status === "inactive" || v.status === "unavailable";
                const displayPhoto = v.photo || v.avatar;

                return (
                  <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 text-slate-400 font-mono">{i + 1}</td>
                    
                    {/* Photo Column */}
                    <td className="px-4 py-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shadow-2xs">
                        {displayPhoto ? (
                          <img src={displayPhoto} alt={v.name} className="w-full h-full object-cover" />
                        ) : (
                          <Building size={16} className="text-slate-400" />
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-extrabold text-slate-900">{v.name}</div>
                      <div className="text-[11px] text-slate-400 font-medium">{v.location || "FSUU Main Campus"} • Cap: {v.capacity || 100}</div>
                    </td>

                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold border ${
                        !isItemDisabled
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}>
                        {!isItemDisabled ? "Available" : "Disabled"}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleEditClick(v)}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer transition-colors"
                          title="Edit Venue"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => setDisableTarget({ id: v.id, name: v.name, status: v.status })}
                          className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${
                            isItemDisabled 
                              ? "border-emerald-200 hover:bg-emerald-50 text-emerald-600" 
                              : "border-rose-200 hover:bg-rose-50 text-rose-600"
                          }`}
                          title={isItemDisabled ? "Enable Venue" : "Disable Venue"}
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

      {/* Modal: Create Venue / Edit Venue */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[1500] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm">
                {editItem ? "Edit Venue" : "Create Venue"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {/* Photo Upload */}
              <div className="flex items-center gap-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shadow-inner shrink-0 relative">
                  {(form.photo || form.avatar) ? (
                    <img src={form.photo || form.avatar} alt="Preview" className="w-full h-full object-contain p-1" />
                  ) : (
                    <Building size={24} className="text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block font-bold text-slate-900 text-xs mb-1">Venue Photo</label>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer shadow-2xs transition-all">
                      <Camera size={13} />
                      <span>{(form.photo || form.avatar) ? "Change Photo" : "Upload Photo"}</span>
                      <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                    </label>
                    {(form.photo || form.avatar) && (
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, photo: "", avatar: "" })}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-600 font-bold text-xs cursor-pointer shadow-2xs transition-all"
                      >
                        <Trash2 size={12} />
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Venue Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AVR 1, Main Auditorium"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Location *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2nd Floor, Main Building"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Capacity *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 100"
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600 text-xs"
                  />
                </div>
              </div>

              {/* Allowed Equipment with Max Needed Quantity */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Allowed Equipment & Max Needed Qty</label>
                <p className="text-[11px] text-slate-500 mb-2 font-medium">Select categories allowed for this venue and set the maximum requested quantity.</p>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-48 overflow-y-auto space-y-2">
                  {equipmentCatalog.map(eq => {
                    const checked = isItemChecked(eq);
                    const currentMax = form.equipment_max_qtys?.[eq.id] ?? (eq.total_quantity || 1);

                    return (
                      <div key={eq.id} className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                        <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                          <input
                            type="checkbox"
                            className="accent-blue-600 w-4 h-4 shrink-0"
                            checked={checked}
                            onChange={() => toggleEquipment(eq)}
                          />
                          <span className="text-xs font-bold text-slate-800 truncate">{eq.name || eq.eq_name}</span>
                        </label>
                        {checked && (
                          <div className="flex items-center gap-1.5 ml-2">
                            <span className="text-[10.5px] font-semibold text-slate-500">Max Qty:</span>
                            <input
                              type="number"
                              min="1"
                              value={currentMax}
                              onChange={(e) => handleMaxQtyChange(eq.id, e.target.value)}
                              className="w-16 p-1 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {equipmentCatalog.length === 0 && (
                    <span className="text-xs text-slate-500 italic">No equipment categories found.</span>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  {formLoading && <Loader2 size={14} className="animate-spin" />}
                  <span>{editItem ? "Save Changes" : "Save"}</span>
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
        title={disableTarget?.status === "disabled" ? "Enable Venue" : "Disable Venue"}
        message={`Are you sure you want to ${disableTarget?.status === "disabled" ? 'enable' : 'disable'} venue "${disableTarget?.name}"?`}
        confirmText={disableTarget?.status === "disabled" ? "Enable" : "Disable"}
        variant={disableTarget?.status === "disabled" ? "primary" : "danger"}
      />
    </div>
  );
}
