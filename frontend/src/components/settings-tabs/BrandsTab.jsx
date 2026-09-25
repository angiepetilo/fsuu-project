import { useState, useEffect } from "react";
import { 
  Tag, Plus, Search, Edit2, Ban, CheckCircle2,
  AlertCircle, X, Loader2
} from "lucide-react";
import api from "@/lib/axios";
import notify from "@/lib/notify";

export default function BrandsTab() {
  const [brands, setBrands] = useState([]);
  const [stats, setStats] = useState({
    total_brands: 0,
    active_brands: 0,
    inactive_brands: 0,
    total_linked_units: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState(null);

  // Form states
  const [formData, setFormData] = useState({ name: "", description: "", status: "active", equipment_type_id: "" });
  const [categories, setCategories] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchCategories = async () => {
    try {
      const res = await api.get("/general/equipment-types");
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setCategories(list);
    } catch {}
  };

  const fetchBrands = async () => {
    setLoading(true);
    try {
      const params = {
        all: 1,
      };
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (categoryFilter !== "all" && categoryFilter) {
        params.equipment_type_id = categoryFilter;
      }

      const res = await api.get("/general/brands", { params });
      const list = res.data?.brands?.data || (Array.isArray(res.data?.brands) ? res.data.brands : []);
      setBrands(list);
      if (res.data?.stats) {
        setStats(res.data.stats);
      }
    } catch (err) {
      notify.error("Error", "Failed to retrieve equipment brands.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchBrands();
  }, [categoryFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchBrands();
  };

  const handleOpenAdd = () => {
    setFormData({ name: "", description: "", status: "active", equipment_type_id: "" });
    setFormError("");
    setShowAddModal(true);
  };

  const handleOpenEdit = (brand) => {
    setSelectedBrand(brand);
    setFormData({
      name: brand.name,
      description: brand.description || "",
      status: brand.status || "active",
      equipment_type_id: brand.equipment_type_id ? String(brand.equipment_type_id) : "",
    });
    setFormError("");
    setShowEditModal(true);
  };

  const handleOpenDelete = (brand) => {
    setSelectedBrand(brand);
    setShowDeleteModal(true);
  };

  const handleSaveAdd = async (e) => {
    e.preventDefault();
    if (!formData.equipment_type_id) {
      setFormError("Equipment category is required.");
      return;
    }
    if (!formData.name.trim()) {
      setFormError("Brand name is required.");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      await api.post("/general/brands", formData);
      notify.success("Brand Created", `Brand "${formData.name.toUpperCase()}" added successfully.`);
      setShowAddModal(false);
      fetchBrands();
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to create brand. Name might already exist.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!formData.equipment_type_id) {
      setFormError("Equipment category is required.");
      return;
    }
    if (!formData.name.trim()) {
      setFormError("Brand name is required.");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      await api.put(`/general/brands/${selectedBrand.id}`, formData);
      notify.success("Brand Updated", `Brand details updated successfully.`);
      setShowEditModal(false);
      fetchBrands();
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to update brand.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (brand) => {
    try {
      await api.patch(`/general/brands/${brand.id}/toggle-status`);
      const nextStatus = brand.status === "active" ? "Disabled" : "Enabled";
      notify.success("Status Updated", `Brand is now ${nextStatus.toLowerCase()}.`);
      fetchBrands();
    } catch (err) {
      notify.error("Error", "Could not toggle brand status.");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedBrand) return;
    setSubmitting(true);
    try {
      await api.delete(`/general/brands/${selectedBrand.id}`);
      notify.success("Brand Removed", `Brand "${selectedBrand.name}" has been deleted.`);
      setShowDeleteModal(false);
      fetchBrands();
    } catch (err) {
      notify.error("Cannot Delete", err.response?.data?.message || "Cannot delete this brand as it is linked to equipment units.");
      setShowDeleteModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 font-sans">
      {/* Action and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearch} className="flex items-center gap-2.5 w-full sm:w-auto flex-1 max-w-md">
          <div className="relative w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search brand name, description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Category Filter */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">All</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                  {cat.eq_name || cat.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span>Add Brand</span>
          </button>
        </div>
      </div>

      {/* Brands Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[11px] font-semibold">
              <tr>
                <th className="px-4 py-3.5">Brand Name</th>
                <th className="px-4 py-3.5">Associated Equipment</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={3} className="text-center py-12">
                    <div className="flex items-center justify-center gap-2 text-slate-400">
                      <div className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin" />
                      <span className="text-xs font-semibold italic">Loading equipment brands...</span>
                    </div>
                  </td>
                </tr>
              ) : brands.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-12 text-slate-400">
                    <Tag size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-semibold">No equipment brands found.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Click "Add Brand" above to register manufacturer brands.</p>
                  </td>
                </tr>
              ) : (
                brands.map((brand) => (
                  <tr key={brand.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center font-black text-blue-700 text-xs shrink-0">
                          {brand.name.substring(0, 2)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{brand.name}</p>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            <span>ID #{brand.id}</span>
                            {brand.equipment_category_name && (
                              <span className="font-medium text-slate-500">• {brand.equipment_category_name}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="text-xs text-slate-700 font-medium">
                        {brand.equipment_units_count ?? 0} physical unit(s)
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(brand)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Brand"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(brand)}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer shadow-2xs ${
                            brand.status === "active"
                              ? "text-rose-600 bg-rose-50 border-rose-200 hover:bg-rose-100 dark:text-rose-400/80 dark:bg-rose-950/40 dark:border-rose-900/40 hover:dark:bg-rose-900/40 hover:dark:text-rose-300"
                              : "text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 dark:text-emerald-400/80 dark:bg-emerald-950/40 dark:border-emerald-900/40 hover:dark:bg-emerald-900/40 hover:dark:text-emerald-300"
                          }`}
                          title={brand.status === "active" ? "Disable brand" : "Enable brand"}
                        >
                          {brand.status === "active" ? <Ban size={14} /> : <CheckCircle2 size={14} />}
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

      {/* Add Brand Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Tag size={18} />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Add Equipment Brand</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveAdd} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Equipment Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.equipment_type_id || ""}
                  onChange={(e) => setFormData({ ...formData, equipment_type_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 cursor-pointer"
                  required
                >
                  <option value="">-- Select Equipment Category --</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.eq_name || cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Brand Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. SONY, EPSON, LOGITECH"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 cursor-pointer"
                >
                  <option value="active">Enable</option>
                  <option value="inactive">Disable</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  <span>Save Brand</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Brand Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Edit2 size={16} />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Edit Equipment Brand</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Equipment Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.equipment_type_id || ""}
                  onChange={(e) => setFormData({ ...formData, equipment_type_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 cursor-pointer"
                  required
                >
                  <option value="">-- Select Equipment Category --</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.eq_name || cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Brand Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 cursor-pointer"
                >
                  <option value="active">Enable</option>
                  <option value="inactive">Disable</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  <span>Update Brand</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Disable Confirmation is handled inline via PowerOff icon — no separate modal needed */}
    </div>
  );
}
