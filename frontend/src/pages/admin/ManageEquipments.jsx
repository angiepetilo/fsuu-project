import { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import api from "@/lib/axios";
import {
  PackageOpen, Plus, Search, Filter, Edit3, Trash2, CheckCircle2,
  AlertTriangle, RefreshCw, Barcode, Calendar, Clock, Loader2, Eye
} from "lucide-react";
import EquipmentDetailModal from "./components/EquipmentDetailModal";
import EquipmentModal from "./components/EquipmentModal";
import { PageLoader } from "@/components/ui/page-loader";

function StatusBadge({ status }) {
  const map = {
    available: "bg-emerald-100 text-emerald-800 border-emerald-300",
    maintenance: "bg-amber-100 text-amber-800 border-amber-300",
    decommissioned: "bg-rose-100 text-rose-800 border-rose-300",
    damaged: "bg-rose-100 text-rose-800 border-rose-300",
  };
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-extrabold capitalize border ${map[status] ?? "bg-slate-100 text-slate-700"}`}>
      {status || "available"}
    </span>
  );
}

export default function ManageEquipments() {
  const context = useOutletContext();

  const [units, setUnits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    barcode: "",
    category: "",
    date_purchased: new Date().toISOString().split("T")[0],
    lifespan_years: "5",
    total_units: "1",
    status: "available",
    description: "",
  });

  const [editFormData, setEditFormData] = useState({
    name: "",
    barcode: "",
    category: "",
    date_purchased: "2026-03-15",
    lifespan_years: "5",
    total_units: "1",
    status: "available",
    description: "",
  });

  const fetchEquipments = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, unitRes] = await Promise.all([
        api.get('/admin/equipment-types'),
        api.get('/admin/equipment-units').catch(() => ({ data: [] })),
      ]);

      const catData = Array.isArray(catRes.data) ? catRes.data : [];
      const unitData = Array.isArray(unitRes.data) ? unitRes.data : [];

      setCategories(catData);

      setUnits(unitData.map((u, idx) => ({
        id: u.id || idx + 1,
        equipment_type_id: u.equipment_type_id,
        barcode: u.unit_code || u.barcode || `BC-EQP-2026-00${idx + 1}`,
        name: u.name || u.equipment_type?.eq_name || "Equipment Unit",
        category: u.equipment_type?.eq_type || u.equipment_type?.eq_name || "AV Equipment",
        status: u.status || "available",
        available_count: u.status === 'available' ? 1 : 0,
        total_count: 1,
        date_purchased: u.purchased_at ? u.purchased_at.substring(0, 10) : "2026-01-15",
        lifespan_years: u.eq_lifespan || 5,
        description: u.description || "",
      })));

      if (catData.length > 0 && !formData.category) {
        setFormData(prev => ({ ...prev, category: catData[0].eq_type || catData[0].eq_name || catData[0].name }));
      }
    } catch {
      setUnits([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEquipments();
  }, [fetchEquipments]);

  const handleOpenAddModal = async () => {
    let activeCats = categories;
    if (!activeCats || activeCats.length === 0) {
      try {
        const res = await api.get('/admin/equipment-types');
        activeCats = Array.isArray(res.data) ? res.data : [];
        setCategories(activeCats);
      } catch {
        activeCats = [];
      }
    }

    if (activeCats.length === 0) {
      alert("⚠️ No Equipment Category created yet! Please create an Equipment Category first in Settings -> Equipment Catalog before adding equipment units.");
      return;
    }

    const defaultCatName = activeCats[0]?.eq_name || activeCats[0]?.eq_type || activeCats[0]?.name || "";
    setFormData(prev => ({
      ...prev,
      category: prev.category || defaultCatName,
    }));

    setShowAddModal(true);
  };

  const handleAddEquipment = async (e) => {
    e.preventDefault();
    if (categories.length === 0) {
      alert("No equipment categories created yet. Please create an Equipment Category in Settings -> Equipment Catalog first.");
      return;
    }

    setIsSubmitting(true);
    try {
      const matchedCat = categories.find(c =>
        (c.eq_type || c.eq_name || c.name || "").toLowerCase() === (formData.category || "").toLowerCase()
      ) || categories[0];

      const payload = {
        equipment_type_id: matchedCat.id,
        name: formData.name,
        unit_code: formData.barcode || `BC-${Date.now().toString().slice(-6)}`,
        purchased_at: formData.date_purchased || undefined,
        eq_lifespan: parseInt(formData.lifespan_years, 10) || 5,
        status: formData.status || "available",
        description: formData.description || undefined,
      };

      await api.post("/admin/equipment-units", payload);

      setFeedback(`✅ Physical equipment unit "${formData.name}" registered under category "${matchedCat.eq_name || matchedCat.eq_type}". Category stock updated!`);
      setShowAddModal(false);
      fetchEquipments();
      setTimeout(() => setFeedback(null), 5000);
    } catch (err) {
      alert(err.response?.data?.message ?? "Failed to save equipment unit.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditEquipmentSubmit = async (e) => {
    e.preventDefault();
    if (!editingItem) return;
    setIsSubmitting(true);
    try {
      const matchedCat = categories.find(c =>
        (c.eq_type || c.eq_name || c.name || "").toLowerCase() === (editFormData.category || "").toLowerCase()
      ) || categories[0];

      const payload = {
        equipment_type_id: matchedCat.id,
        name: editFormData.name,
        unit_code: editFormData.barcode,
        purchased_at: editFormData.date_purchased,
        eq_lifespan: parseInt(editFormData.lifespan_years, 10) || 5,
        status: editFormData.status || "available",
        description: editFormData.description,
      };

      await api.put(`/admin/equipment-units/${editingItem.id}`, payload);
      setFeedback(`✅ Physical unit "${editFormData.name}" updated!`);
      setEditingItem(null);
      fetchEquipments();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      alert(err.response?.data?.message ?? "Failed to update physical unit.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEquipment = async (id, name) => {
    if (confirm(`Archive physical unit "${name}"? Soft-delete will apply.`)) {
      try {
        await api.delete(`/admin/equipment-units/${id}`);
        setFeedback(`✅ Equipment unit "${name}" archived.`);
        fetchEquipments();
        setTimeout(() => setFeedback(null), 4000);
      } catch {
        alert("Failed to archive equipment unit.");
      }
    }
  };

  const filtered = units.filter(item => {
    const matchCategory = activeCategory === "all" || (item.category || "").toLowerCase() === activeCategory.toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchSearch = !searchQuery || (item.name || "").toLowerCase().includes(q) || (item.barcode || "").toLowerCase().includes(q);
    return matchCategory && matchSearch;
  });

  const categoryNames = Array.from(new Set(categories.map(c => c.eq_type || c.eq_name || c.name).filter(Boolean)));
  const categoryList = [
    { id: "all", label: "All Categories" },
    ...categoryNames.map(c => ({ id: c, label: c }))
  ];

  if (loading && units.length === 0) return <PageLoader message="Loading Equipment Inventory..." />;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <PackageOpen className="text-blue-600" size={24} />
            Manage Physical Equipment Units
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Add physical equipment units and assign them to created equipment categories to update stock counts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchEquipments}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-md transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Add Equipment</span>
          </button>
        </div>
      </div>

      {/* Warning Banner if No Category Exists */}
      {categories.length === 0 && !loading && (
        <div className="bg-amber-50 border-2 border-amber-200 p-4 rounded-2xl text-amber-900 text-xs font-semibold flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-600 shrink-0" />
            <span>
              <strong>No Equipment Category Created Yet:</strong> You cannot add physical equipment units until an Equipment Category is created in <strong>Settings → Equipment Catalog</strong>.
            </span>
          </div>
        </div>
      )}

      {feedback && (
        <div className="bg-emerald-500 text-white text-xs font-bold px-5 py-3 rounded-2xl flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 size={16} />
          {feedback}
        </div>
      )}

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs text-xs font-bold text-slate-700">
          <Filter size={14} className="text-blue-600 flex-shrink-0" />
          <select
            value={activeCategory}
            onChange={(e) => setActiveCategory(e.target.value)}
            className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer text-xs pr-2"
          >
            {categoryList.map(t => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search unit name, barcode..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-600"
          />
        </div>
      </div>

      {/* Physical Units Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                {["#", "Unit Barcode", "Equipment Unit Name", "Assigned Category", "Status", "Date Purchased", "Lifespan vs Current", "Action"].map(h => (
                  <th key={h} className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <Loader2 size={20} className="animate-spin inline mr-2" /> Loading equipment units...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    {categories.length === 0
                      ? "⚠️ Create an Equipment Category in Settings first before adding physical equipment units."
                      : "📦 No physical equipment units added yet. Click 'Add Equipment' to add units to a category."}
                  </td>
                </tr>
              ) : (
                filtered.map((item, index) => {
                  const lifespanYears = item.lifespan_years || 5;
                  const purchaseYear = item.date_purchased ? parseInt(item.date_purchased.split("-")[0], 10) : 2026;
                  const currentYear = new Date().getFullYear();
                  const ageYears = Math.max(0.5, currentYear - purchaseYear + 0.2);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-slate-400">{index + 1}</td>
                      <td className="px-4 py-3.5 font-mono text-xs font-bold text-blue-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 bg-blue-50/60 border border-blue-200/60 px-2.5 py-1 rounded-lg w-fit">
                          <Barcode size={14} className="text-blue-500" />
                          <span>{item.barcode}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-extrabold text-slate-900">{item.name}</td>
                      <td className="px-4 py-3.5 font-bold text-blue-700">
                        <span className="bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/60">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{item.date_purchased}</td>
                      <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{ageYears.toFixed(1)} / {lifespanYears} yrs</td>
                      <td className="px-4 py-3.5 flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all cursor-pointer"
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => {
                            setEditingItem(item);
                            setEditFormData({
                              name: item.name,
                              barcode: item.barcode,
                              category: item.category,
                              date_purchased: item.date_purchased,
                              lifespan_years: String(item.lifespan_years),
                              total_units: "1",
                              status: item.status || "available",
                              description: item.description || "",
                            });
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                          title="Edit Unit"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteEquipment(item.id, item.name)}
                          className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Archive Unit"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Equipment Modal */}
      <EquipmentModal
        showAddModal={showAddModal}
        setShowAddModal={setShowAddModal}
        editingItem={editingItem}
        setEditingItem={setEditingItem}
        formData={formData}
        setFormData={setFormData}
        editFormData={editFormData}
        setEditFormData={setEditFormData}
        handleAddEquipment={handleAddEquipment}
        handleEditEquipmentSubmit={handleEditEquipmentSubmit}
        isSubmitting={isSubmitting}
        categories={categoryNames}
      />

      {/* Detail Modal */}
      <EquipmentDetailModal
        selectedItem={selectedItem}
        setSelectedItem={setSelectedItem}
      />
    </div>
  );
}
