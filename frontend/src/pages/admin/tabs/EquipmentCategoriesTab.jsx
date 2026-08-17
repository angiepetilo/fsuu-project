import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, Package, Loader2, Image as ImageIcon, ChevronLeft, ChevronRight, Check, Camera } from "lucide-react";
import api from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";

export default function EquipmentCategoriesTab({ showMsg }) {
  const { user } = useAuth();
  const userRole = (user?.role?.name || user?.role || "").toString().toLowerCase();
  const isSuperAdmin = ["super_admin", "superadmin", "sysad", "super-admin"].includes(userRole);
  const userOfficeId = user?.office_id ?? user?.office?.id ?? null;
  const userOfficeObj = user?.office ?? null;

  const [categories, setCategories] = useState([]);
  const [offices, setOffices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const [form, setForm] = useState({
    eq_name: "",
    eq_type: "AV Equipment",
    avatar: "",
    total_quantity: 0,
    available_count: 0,
    status: "available",
    office_id: "",
    description: "",
  });

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const [catRes, offRes] = await Promise.all([
        api.get("/admin/equipment-types"),
        api.get("/admin/offices").catch(() => ({ data: [] })),
      ]);

      const rawCats = Array.isArray(catRes.data) ? catRes.data : [];
      let activeRelCount = 0;
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith("fsuu_assigned_units_")) {
            const v = localStorage.getItem(k);
            if (v) {
              const obj = JSON.parse(v);
              Object.values(obj).forEach(bCode => { if (bCode) activeRelCount++; });
            }
          }
        }
      } catch {}

      setCategories(rawCats.map(c => ({
        ...c,
        released_count: c.released_count ?? (activeRelCount > 0 ? activeRelCount : 0),
      })));
      setOffices(Array.isArray(offRes.data) ? offRes.data : []);
    } catch {
      const saved = JSON.parse(localStorage.getItem("fsuu_equipment_types") || "[]");
      setCategories(saved);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [categories.length]);

  const totalPages = Math.ceil(categories.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedCategories = categories.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  useEffect(() => {
    fetchCategories();
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

    const resolvedOfficeId = !isSuperAdmin 
      ? (userOfficeId || form.office_id || offices[0]?.id) 
      : (form.office_id || offices[0]?.id);

    const payload = {
      ...form,
      eq_type: form.eq_type || "AV Equipment",
      office_id: resolvedOfficeId ? parseInt(resolvedOfficeId, 10) : null,
      total_quantity: parseInt(form.total_quantity, 10) || 0,
      available_count: parseInt(form.available_count, 10) || 0,
      avatar: form.avatar || null,
      description: form.description || null,
    };

    try {
      if (editItem) {
        await api.put(`/admin/equipment-types/${editItem.id}`, payload);
        if (showMsg) showMsg(`Equipment catalog item "${form.eq_name}" updated!`);
      } else {
        await api.post("/admin/equipment-types", payload);
        if (showMsg) showMsg(`Equipment catalog item "${form.eq_name}" added to catalog!`);
      }
      setShowModal(false);
      setEditItem(null);
      fetchCategories();
      window.dispatchEvent(new Event("equipment_inventory_updated"));
    } catch {
      if (showMsg) showMsg("Failed to save equipment catalog item.", true);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (confirm(`Archive equipment category "${name}"? Soft-delete will apply.`)) {
      try {
        await api.delete(`/admin/equipment-types/${id}`);
        if (showMsg) showMsg(`Equipment "${name}" archived.`);
        fetchCategories();
        window.dispatchEvent(new Event("equipment_inventory_updated"));
      } catch {
        if (showMsg) showMsg("Failed to archive equipment.", true);
      }
    }
  };

  const [categoryRequests, setCategoryRequests] = useState([]);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState({ proposed_name: "", reason: "" });
  const [requestLoading, setRequestLoading] = useState(false);

  const fetchCategoryRequests = async () => {
    try {
      const res = await api.get("/admin/category-requests");
      setCategoryRequests(Array.isArray(res.data) ? res.data : []);
    } catch {
      setCategoryRequests([]);
    }
  };

  useEffect(() => {
    fetchCategoryRequests();
  }, []);

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setRequestLoading(true);
    try {
      await api.post("/admin/category-requests", requestForm);
      if (showMsg) showMsg("Category request submitted to Super Admin queue!");
      setShowRequestModal(false);
      setRequestForm({ proposed_name: "", reason: "" });
      fetchCategoryRequests();
    } catch {
      if (showMsg) showMsg("Failed to submit category request.", true);
    } finally {
      setRequestLoading(false);
    }
  };

  const handleApproveRequest = async (id) => {
    try {
      await api.post(`/admin/category-requests/${id}/approve`);
      if (showMsg) showMsg("Category request approved & added to Master Category List!");
      fetchCategories();
      fetchCategoryRequests();
    } catch {
      if (showMsg) showMsg("Failed to approve category request.", true);
    }
  };

  const handleRejectRequest = async (id) => {
    try {
      await api.post(`/admin/category-requests/${id}/reject`);
      if (showMsg) showMsg("Category request rejected.");
      fetchCategoryRequests();
    } catch {
      if (showMsg) showMsg("Failed to reject category request.", true);
    }
  };

  const pendingRequests = categoryRequests.filter(r => r.status === "pending");

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            {isSuperAdmin && <Package size={18} className="text-blue-600" />}
            {isSuperAdmin ? "Master Equipment Category" : "Manage Equipment Catalog"}
          </h3>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            {isSuperAdmin
              ? "Super Admin single source of truth for top-level equipment categories."
              : "Select pre-approved master categories or submit a category request to Super Admin."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isSuperAdmin ? (
            <>
              <button
                type="button"
                onClick={() => setShowQueueModal(true)}
                className="relative flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
              >
                <span>Request</span>
                {pendingRequests.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-extrabold">
                    {pendingRequests.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditItem(null);
                  setForm({
                    eq_name: "",
                    eq_type: "AV Equipment",
                    avatar: "",
                    total_quantity: 0,
                    available_count: 0,
                    status: "available",
                    office_id: offices[0]?.id || "",
                    description: "",
                  });
                  setShowModal(true);
                }}
                className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
              >
                <Plus size={14} /> Add Equipment Category
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setShowRequestModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <Plus size={14} /> Request New Category
            </button>
          )}
        </div>
      </div>

      {/* Equipment Catalog Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-left text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              {["#", "Avatar", "Equipment Category", "Total Stock", "Qty Present", "Reserved", "Released", "Damaged", "Lost", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-semibold">
            {/* Pending Approval Rows for Super Admin */}
            {isSuperAdmin && pendingRequests.length > 0 && (
              <>
                <tr className="bg-amber-50/70 border-b border-amber-200/90 text-amber-900">
                  <td colSpan={10} className="px-4 py-2 font-extrabold text-[11px] uppercase tracking-wider">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        Pending Review ({pendingRequests.length} Category {pendingRequests.length === 1 ? "Request" : "Requests"})
                      </span>
                      <span className="text-[10px] font-mono text-amber-800 font-semibold">Inline Moderation Table</span>
                    </div>
                  </td>
                </tr>
                {pendingRequests.map((req) => (
                  <tr key={`pending-${req.id}`} className="bg-slate-50/80 border-b border-slate-200/80 opacity-75 hover:opacity-90 transition-opacity">
                    <td className="px-4 py-3 font-mono font-bold text-slate-400">
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[9px] font-extrabold uppercase">
                        Pending
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-300 overflow-hidden flex items-center justify-center text-slate-400">
                        <Package size={16} />
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <span className="font-extrabold text-slate-600 text-xs block truncate" title={req.proposed_name}>{req.proposed_name}</span>
                      <span className="text-[10.5px] text-slate-400 font-mono truncate block">AV Equipment</span>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5 italic truncate">
                        Requested by {req.requester?.name || "Admin"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-600">0</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-400">0</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-400">0</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-400">0</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-400">0</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-400">0</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleApproveRequest(req.id)}
                          className="p-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all cursor-pointer shadow-2xs font-extrabold"
                          title="Approve Category Request"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectRequest(req.id)}
                          className="p-1.5 rounded-lg border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white transition-all cursor-pointer shadow-2xs font-extrabold"
                          title="Reject Category Request"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </>
            )}

            {loading ? (
              <tr>
                <td colSpan={10} className="text-center py-10 text-slate-400 font-medium">
                  <Loader2 size={16} className="animate-spin inline mr-2 text-slate-600" /> Loading catalog...
                </td>
              </tr>
            ) : categories.length === 0 && pendingRequests.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-10 text-slate-400 font-medium">
                  No equipment categories registered.
                </td>
              </tr>
            ) : (
              paginatedCategories.map((cat, idx) => {
                const displayIndex = startIndex + idx + 1;
                const total = cat.total_quantity ?? 0;
                const released = cat.released_count || 0;
                const damaged = cat.damaged_count || 0;
                const lost = cat.lost_count || 0;
                const reserved = cat.reserved_count || cat.reserved || 0;
                const available = typeof cat.available_count === "number" ? cat.available_count : Math.max(0, total - released - damaged - lost);

                return (
                  <tr key={cat.id || idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-400">{displayIndex}</td>
                    <td className="px-4 py-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center">
                        {cat.avatar ? (
                          <img src={cat.avatar} alt={cat.eq_name} className="w-full h-full object-cover" />
                        ) : (
                          <Package size={16} className="text-slate-400" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-xs truncate" title={cat.eq_name || cat.name}>{cat.eq_name || cat.name}</span>
                      </div>
                      <span className="text-[10.5px] text-slate-500 font-mono truncate block" title={cat.eq_type || "AV Equipment"}>{cat.eq_type || "AV Equipment"}</span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      <span className="bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                        {total}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-extrabold text-emerald-700">
                      <span className="bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-flex items-center gap-1">
                        ● {available}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-indigo-700">
                      <span className={`px-2.5 py-1 rounded-lg border inline-flex items-center gap-1 ${
                        reserved > 0 ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-extrabold" : "bg-slate-50 border-slate-200 text-slate-400"
                      }`}>
                        {reserved > 0 ? `● ${reserved}` : "0"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-blue-700">
                      <span className={`px-2.5 py-1 rounded-lg border inline-flex items-center gap-1 ${
                        released > 0 ? "bg-blue-50 border-blue-200 text-blue-700 font-extrabold" : "bg-slate-50 border-slate-200 text-slate-400"
                      }`}>
                        {released > 0 ? `● ${released}` : "0"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-rose-700">
                      <span className={`px-2.5 py-1 rounded-lg border inline-flex items-center gap-1 ${
                        damaged > 0 ? "bg-rose-50 border-rose-200 text-rose-700 font-extrabold" : "bg-slate-50 border-slate-200 text-slate-400"
                      }`}>
                        {damaged > 0 ? `● ${damaged}` : "0"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-amber-700">
                      <span className={`px-2.5 py-1 rounded-lg border inline-flex items-center gap-1 ${
                        lost > 0 ? "bg-amber-50 border-amber-200 text-amber-700 font-extrabold" : "bg-slate-50 border-slate-200 text-slate-400"
                      }`}>
                        {lost > 0 ? `● ${lost}` : "0"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isSuperAdmin ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditItem(cat);
                              setForm({
                                eq_name: cat.eq_name || cat.name || "",
                                eq_type: cat.eq_type || "AV Equipment",
                                avatar: cat.avatar || "",
                                total_quantity: cat.total_quantity || 0,
                                available_count: cat.available_count || 0,
                                office_id: cat.office_id || "",
                                description: cat.description || "",
                              });
                              setShowModal(true);
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                            title="Edit Category"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(cat.id, cat.eq_name || cat.name)}
                            className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                            title="Archive Category"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono italic">Read-only</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {(categories.length > 0 || (isSuperAdmin && pendingRequests.length > 0)) && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 text-xs font-semibold text-slate-600 bg-white rounded-xl">
          <div>
            Showing <span className="font-mono font-bold text-slate-900">{startIndex + 1}</span> to{" "}
            <span className="font-mono font-bold text-slate-900">
              {Math.min(startIndex + ITEMS_PER_PAGE, categories.length + (isSuperAdmin ? pendingRequests.length : 0))}
            </span> of{" "}
            <span className="font-mono font-bold text-slate-900">
              {categories.length + (isSuperAdmin ? pendingRequests.length : 0)}
            </span> categories
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-mono text-xs mr-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs font-bold text-xs"
            >
              <ChevronLeft size={13} /> Previous
            </button>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs font-bold text-xs"
            >
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Equipment Category Modal - Unified Clean Design */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[1500] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 border border-slate-100 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Package size={18} className="text-blue-600" />
                {editItem ? "Edit Equipment Category" : "Add Equipment Category"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {/* Avatar Upload */}
              <div className="flex items-center gap-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shadow-inner shrink-0 relative">
                  {form.avatar ? (
                    <img src={form.avatar} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Package size={24} className="text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block font-bold text-slate-900 text-xs mb-1">Category Photo Avatar</label>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer shadow-2xs transition-all">
                    <Camera size={13} />
                    <span>{form.avatar ? "Change Photo" : "Upload Photo"}</span>
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Projector, Microphone, Audio System"
                  value={form.eq_name}
                  onChange={(e) => setForm({ ...form, eq_name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Equipment Type</label>
                <input
                  type="text"
                  placeholder="e.g. AV Equipment, Audio/Visual, IT Hardware"
                  value={form.eq_type}
                  onChange={(e) => setForm({ ...form, eq_type: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600 text-xs"
                />
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
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  {formLoading && <Loader2 size={14} className="animate-spin" />}
                  <span>{editItem ? "Save Changes" : "Save Equipment Category"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Super Admin Request Queue Modal */}
      {showQueueModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-300 shadow-xl w-full max-w-2xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center p-5 border-b border-slate-200">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <Package size={18} className="text-blue-600" />
                  Category Requests Queue
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Review new category proposals submitted by office managers before adding to master list.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowQueueModal(false)}
                className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1 text-xs">
              {categoryRequests.length === 0 ? (
                <div className="text-center py-10 text-slate-400 font-semibold">
                  No category requests submitted.
                </div>
              ) : (
                categoryRequests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm">{req.proposed_name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          req.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                          req.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                      {req.reason && <p className="text-xs text-slate-600 italic">"{req.reason}"</p>}
                      <p className="text-[10.5px] text-slate-400 font-mono">
                        Requested by: {req.requester?.name || "Admin"}
                      </p>
                    </div>

                    {req.status === "pending" && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleRejectRequest(req.id)}
                          className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs cursor-pointer"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApproveRequest(req.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                        >
                          Approve & Add to Master
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Office Manager Request New Category Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-300 shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-slate-200">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Package size={18} className="text-blue-600" />
                Request New Category
              </h3>
              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-900 mb-1">Proposed Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 3D Printers, Studio Lighting, Audio Interfaces"
                  value={requestForm.proposed_name}
                  onChange={(e) => setRequestForm({ ...requestForm, proposed_name: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1">Reason / Description *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain why this equipment category is needed for your office inventory..."
                  value={requestForm.reason}
                  onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={requestLoading}
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  {requestLoading && <Loader2 size={13} className="animate-spin" />}
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
