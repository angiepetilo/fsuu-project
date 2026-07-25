import { useState, useEffect, useCallback } from "react";
import api from "@/lib/axios";
import { useDataCache } from "@/hooks/useDataCache";
import { Search, PlusCircle, Pencil, Trash2, X, Loader2, AlertCircle, ImagePlus } from "lucide-react";

const STATUS_OPTIONS = ["available","checked_out","damaged","under_repair","lost"];
const STATUS_COLORS = {
  available:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  checked_out:  "bg-blue-50 text-blue-700 border-blue-200",
  damaged:      "bg-red-50 text-red-700 border-red-200",
  under_repair: "bg-amber-50 text-amber-700 border-amber-200",
  lost:         "bg-slate-100 text-slate-500 border-slate-200",
};

function StatusBadge({ status }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize border ${STATUS_COLORS[status] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
      {status?.replace(/_/g," ")}
    </span>
  );
}

function UnitModal({ unit, categories, onClose, onSave }) {
  const isEdit = !!unit?.id;
  const [form, setForm] = useState({
    equipment_type_id: unit?.equipment_type_id ?? "",
    barcode:           unit?.barcode ?? "",
    brand_model:       unit?.brand_model ?? "",
    unit_status:       unit?.unit_status?.value ?? unit?.unit_status ?? "available",
    unit_status_notes: unit?.unit_status_notes ?? "",
    purchased_date:    unit?.purchased_date ?? "",
    lifespan_years:    unit?.lifespan_years ?? "",
  });
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(unit?.image_url ?? null);
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  const handleSave = async () => {
    if (!form.equipment_type_id || !form.barcode.trim()) {
      alert("Equipment category and barcode are required."); return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== null && v !== "") formData.append(k, v);
      });
      if (photo) formData.append("image", photo);
      
      // If editing, append _method=PUT because PHP doesn't parse multipart form-data on PUT requests natively well
      if (isEdit) formData.append("_method", "PUT");

      await onSave(formData, isEdit ? unit.id : null);
      onClose();
    } catch (e) {
      alert(e.response?.data?.message ?? "Failed to save equipment.");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-slate-100 rounded-t-3xl z-10">
          <h3 className="font-extrabold text-slate-900 text-lg">{isEdit ? "Edit Equipment" : "Add Equipment"}</h3>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          {/* Photo */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              {preview
                ? <img src={preview} alt="Equipment" className="w-20 h-20 rounded-2xl object-cover border-2 border-blue-100 shadow" />
                : <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300 border-2 border-dashed border-slate-200"><ImagePlus size={28} /></div>
              }
              <label className="absolute -bottom-1.5 -right-1.5 bg-blue-600 text-white rounded-lg p-1.5 cursor-pointer shadow hover:bg-blue-700 transition-all">
                <ImagePlus size={13} />
                <input type="file" accept="image/*" onChange={e => { const f = e.target.files[0]; if(f){ setPhoto(f); setPreview(URL.createObjectURL(f)); }}} className="hidden" />
              </label>
            </div>
            <p className="text-[11px] text-slate-400">Equipment photo (optional)</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Category */}
            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs font-bold text-slate-700 mb-1 block">Category <span className="text-red-500">*</span></label>
              <select value={form.equipment_type_id} onChange={e => set("equipment_type_id", e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 bg-white">
                <option value="">— Select Category —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Barcode */}
            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs font-bold text-slate-700 mb-1 block">Barcode <span className="text-red-500">*</span></label>
              <input value={form.barcode} onChange={e => set("barcode", e.target.value)}
                placeholder="Unique barcode identifier"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
            </div>

            {/* Brand/Model */}
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-700 mb-1 block">Brand / Model</label>
              <input value={form.brand_model} onChange={e => set("brand_model", e.target.value)}
                placeholder="e.g. Canon EOS 90D"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Purchased Date */}
            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs font-bold text-slate-700 mb-1 block">Purchased Date</label>
              <input type="date" value={form.purchased_date} onChange={e => set("purchased_date", e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 bg-white" />
            </div>

            {/* Lifespan Years */}
            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs font-bold text-slate-700 mb-1 block">Lifespan (Years)</label>
              <input type="number" min="1" value={form.lifespan_years} onChange={e => set("lifespan_years", e.target.value)}
                placeholder="e.g. 5"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="text-xs font-bold text-slate-700 mb-1 block">Status</label>
            <select value={form.unit_status} onChange={e => set("unit_status", e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 bg-white capitalize">
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g," ")}</option>)}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-slate-700 mb-1 block">Notes</label>
            <textarea value={form.unit_status_notes} onChange={e => set("unit_status_notes", e.target.value)}
              placeholder="Any notes about this unit's condition..."
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" rows={2} />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all">Cancel</button>
            <button onClick={handleSave} disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {loading && <Loader2 size={14} className="animate-spin" />} {isEdit ? "Save Changes" : "Add Equipment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AvrManageEquipment() {
  const [error, setError]           = useState(null);
  const [search, setSearch]         = useState("");
  const [filterCat, setFilterCat]   = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage]             = useState(1);
  const [showModal, setShowModal]   = useState(false);
  const [editUnit, setEditUnit]     = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(null);

  const params = new URLSearchParams({ page, ...(search && { search }), ...(filterCat && { type_id: filterCat }), ...(filterStatus && { status: filterStatus }) }).toString();
  const { data: unitsData, loading: unitsLoading, refresh: refreshUnits } = useDataCache(`avr_equipment_units_${params}`, `/avr/equipment-units?${params}`);
  const { data: catData, loading: catLoading, refresh: refreshCat } = useDataCache('avr_equipment_types', '/avr/equipment-types');

  const units = unitsData?.data ?? [];
  const meta = unitsData ?? null;
  const categories = catData?.data ?? catData ?? [];
  const loading = unitsLoading || catLoading;

  const fetchAll = useCallback(() => {
    refreshUnits();
    refreshCat();
  }, [refreshUnits, refreshCat]);

  const handleSave = async (form, id) => {
    if (id) await api.post(`/avr/equipment-units/${id}`, form);
    else     await api.post("/avr/equipment-units", form);
    fetchAll();
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this equipment unit?")) return;
    setDeleteLoading(id);
    try { await api.delete(`/avr/equipment-units/${id}`); fetchAll(); }
    catch (e) { alert(e.response?.data?.message ?? "Failed to delete."); }
    finally { setDeleteLoading(null); }
  };

  const calcAge = (purchasedDate) => {
    if (!purchasedDate) return "—";
    const years = Math.floor((Date.now() - new Date(purchasedDate)) / (1000 * 60 * 60 * 24 * 365));
    return `${years} yr${years !== 1 ? "s" : ""}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Manage Equipment</h1>
          <p className="text-sm text-slate-400 mt-0.5">All equipment units with barcodes and statuses</p>
        </div>
        <button onClick={() => { setEditUnit(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-blue-600/20">
          <PlusCircle size={14} /> Add Equipment
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 text-red-700 text-sm font-semibold"><AlertCircle size={18} />{error}</div>}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search barcode..."
            className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
        </div>
        <select value={filterCat} onChange={e => { setFilterCat(e.target.value); setPage(1); }}
          className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 bg-white">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
          className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 bg-white capitalize">
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g," ")}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Eq. No.","Category","Brand/Model","Purchased","Lifespan","Age Used","Status","Action"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading
                ? <tr><td colSpan={8} className="text-center py-12 text-slate-400"><Loader2 size={18} className="animate-spin inline mr-2" />Loading…</td></tr>
                : units.length === 0
                  ? <tr><td colSpan={8} className="text-center py-12 text-slate-400">No equipment found.</td></tr>
                  : units.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs font-bold text-slate-700">{u.barcode}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800 text-xs">{u.equipmentType?.name ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{u.brand_model ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{u.purchased_date ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{u.lifespan_years ? `${u.lifespan_years} yrs` : "—"}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{calcAge(u.purchased_date)}</td>
                        <td className="px-4 py-3"><StatusBadge status={u.unit_status?.value ?? u.unit_status} /></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => { setEditUnit(u); setShowModal(true); }} title="Edit"
                              className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-all">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => handleDelete(u.id)} disabled={deleteLoading === u.id} title="Delete"
                              className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-700 transition-all disabled:opacity-40">
                              {deleteLoading === u.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
              }
            </tbody>
          </table>
        </div>
        {meta && meta.last_page > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Showing {units.length} of {meta.total}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40">‹</button>
              <button onClick={() => setPage(p => Math.min(meta.last_page, p + 1))} disabled={page === meta.last_page} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40">›</button>
            </div>
          </div>
        )}
      </div>

      {showModal && <UnitModal unit={editUnit} categories={categories} onClose={() => setShowModal(false)} onSave={handleSave} />}
    </div>
  );
}
