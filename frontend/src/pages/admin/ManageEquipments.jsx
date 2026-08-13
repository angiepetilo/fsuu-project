import { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import api from "@/lib/axios";
import {
  PackageOpen, Plus, Search, Filter, Edit3, Trash2, CheckCircle2,
  AlertTriangle, RefreshCw, Barcode, Calendar, Clock, Loader2, Eye, Copy, Check,
  ChevronLeft, ChevronRight
} from "lucide-react";
import EquipmentDetailModal from "./components/EquipmentDetailModal";
import EquipmentModal from "./components/EquipmentModal";
import { PageLoader } from "@/components/ui/page-loader";
import { StatusBadge } from "@/components/ui/status-badge";

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
  const [copiedBarcode, setCopiedBarcode] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const handleCopyBarcode = (barcode) => {
    if (!barcode) return;
    navigator.clipboard.writeText(barcode);
    setCopiedBarcode(barcode);
    setTimeout(() => setCopiedBarcode(null), 2000);
  };

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

      setUnits(unitData.map((u, idx) => {
        const bCode = String(u.unit_code || u.barcode || `BC-EQP-2026-00${idx + 1}`).trim();
        // Always use actual database status — do not override with localStorage
        const dbStatus = (u.status || 'available').toLowerCase();
        const dbCondition = u.condition || '';

        // Derive human-readable condition from DB value
        let conditionLabel;
        const condLower = dbCondition.toLowerCase();
        if (condLower === 'good' || condLower === 'good condition') conditionLabel = 'Good';
        else if (condLower === 'damaged') conditionLabel = 'Damaged';
        else if (condLower === 'lost') conditionLabel = 'Lost';
        else if (condLower === 'maintenance' || condLower === 'under_maintenance' || condLower === 'under repair') conditionLabel = 'Under Repair';
        else if (condLower === 'worn' || condLower === 'minor wear') conditionLabel = 'Minor Wear';
        else if (dbStatus === 'damaged') conditionLabel = 'Damaged';
        else if (dbStatus === 'maintenance' || dbStatus === 'under_maintenance') conditionLabel = 'Under Repair';
        else if (dbStatus === 'decommissioned' || dbStatus === 'lost') conditionLabel = 'Lost';
        else conditionLabel = 'Good';

        return {
          id: u.id || idx + 1,
          equipment_type_id: u.equipment_type_id,
          barcode: bCode,
          name: u.name || u.equipmentType?.eq_name || u.equipmentType?.name || u.equipment_type?.eq_name || 'Equipment Unit',
          category: u.equipmentType?.eq_name || u.equipmentType?.name || u.equipment_type?.eq_name || u.equipment_type?.name || u.equipmentType?.eq_type || 'AV Equipment',
          office_name: u.equipmentType?.office?.office_name || u.equipment_type?.office?.office_name || u.equipmentType?.office?.name || 'AVR | FSUU Main Campus',
          status: dbStatus,
          condition: conditionLabel,
          available_count: dbStatus === 'available' ? 1 : 0,
          total_count: 1,
          date_purchased: u.purchased_at ? u.purchased_at.substring(0, 10) : '2026-01-15',
          lifespan_years: u.eq_lifespan || 5,
          description: u.description || '',
        };
      }));

      if (catData.length > 0 && !formData.category) {
        setFormData(prev => ({ ...prev, category: catData[0].eq_name || catData[0].name || catData[0].eq_type }));
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
    // Re-fetch when post-inspection syncs update unit condition/status
    const handleInventoryUpdate = () => fetchEquipments();
    window.addEventListener("equipment_inventory_updated", handleInventoryUpdate);
    return () => window.removeEventListener("equipment_inventory_updated", handleInventoryUpdate);
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

    const defaultCatName = activeCats[0]?.eq_name || activeCats[0]?.name || activeCats[0]?.eq_type || "";
    setFormData({
      name: "",
      barcode: "",
      category: defaultCatName,
      status: "available",
      date_purchased: new Date().toISOString().split("T")[0],
      lifespan_years: 5,
      description: "",
    });

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
        (c.eq_name || c.name || c.eq_type || "").toLowerCase() === (formData.category || "").toLowerCase()
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

      setFeedback(`✅ Physical equipment unit "${formData.name}" registered under category "${matchedCat.eq_name || matchedCat.name || matchedCat.eq_type}". Category stock updated!`);
      setFormData({
        name: "",
        barcode: "",
        category: matchedCat.eq_name || matchedCat.name || matchedCat.eq_type || "",
        status: "available",
        date_purchased: new Date().toISOString().split("T")[0],
        lifespan_years: 5,
        description: "",
      });
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
        (c.eq_name || c.name || c.eq_type || "").toLowerCase() === (editFormData.category || "").toLowerCase()
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

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, searchQuery]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedUnits = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const categoryNames = Array.from(new Set(categories.map(c => c.eq_name || c.name || c.eq_type).filter(Boolean)));
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
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Manage Equipment
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
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
        <div className="fixed bottom-6 right-6 z-[3000] bg-slate-900 text-white text-xs font-extrabold px-5 py-3.5 rounded-2xl flex items-center gap-3 shadow-2xl animate-in slide-in-from-bottom-5 duration-300 border border-slate-700 max-w-md">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <span>{feedback}</span>
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
                {["#", "Unit Barcode", "Equipment Unit Name", "Assigned Category", "Status", "Condition", "Date Purchased", "Lifespan vs Current", "Action"].map(h => (
                  <th key={h} className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    <Loader2 size={20} className="animate-spin inline mr-2" /> Loading equipment units...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    {categories.length === 0
                      ? "⚠️ Create an Equipment Category in Settings first before adding physical equipment units."
                      : "📦 No physical equipment units added yet. Click 'Add Equipment' to add units to a category."}
                  </td>
                </tr>
              ) : (
                paginatedUnits.map((item, index) => {
                  const lifespanYears = item.lifespan_years || 5;
                  const purchaseYear = item.date_purchased ? parseInt(item.date_purchased.split("-")[0], 10) : 2026;
                  const currentYear = new Date().getFullYear();
                  const ageYears = Math.max(0.5, currentYear - purchaseYear + 0.2);
                  const displayIndex = startIndex + index + 1;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-slate-400">{displayIndex}</td>
                      <td className="px-4 py-3.5 font-mono text-xs font-bold text-blue-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center gap-1.5 bg-blue-50/60 border border-blue-200/60 px-2.5 py-1 rounded-lg w-fit">
                            <Barcode size={14} className="text-blue-500" />
                            <span>{item.barcode}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyBarcode(item.barcode)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-all cursor-pointer"
                            title="Copy Barcode"
                          >
                            {copiedBarcode === item.barcode ? (
                              <Check size={13} className="text-emerald-600 font-extrabold" />
                            ) : (
                              <Copy size={13} />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-extrabold text-slate-900">{item.name}</td>
                      <td className="px-4 py-3.5 font-bold text-blue-700">
                        <span className="bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/60 block w-fit">
                          {item.category}
                        </span>
                        <span className="text-[10px] text-slate-500 font-semibold block mt-1">
                          🏢 {item.office_name || item.office_location || item.office?.name || "Unassigned Office"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          item.condition === "Damaged" || item.condition === "Lost"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : item.condition === "Under Repair" || item.condition === "Minor Wear"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}>
                          {item.condition || "Good"}
                        </span>
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

        {/* Pagination Footer */}
        {filtered.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-slate-50/80 border-t border-slate-100 text-xs font-semibold text-slate-600">
            <div>
              Showing <span className="font-extrabold text-slate-900">{startIndex + 1}</span> to{" "}
              <span className="font-extrabold text-slate-900">{Math.min(startIndex + ITEMS_PER_PAGE, filtered.length)}</span> of{" "}
              <span className="font-extrabold text-slate-900">{filtered.length}</span> equipment units
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-bold mr-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-xs font-bold text-xs"
              >
                <ChevronLeft size={14} /> Previous
              </button>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-xs font-bold text-xs"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
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
        categories={categories.length > 0 ? categories : categoryNames}
      />

      {/* Detail Modal */}
      <EquipmentDetailModal
        selectedItem={selectedItem}
        setSelectedItem={setSelectedItem}
      />
    </div>
  );
}
