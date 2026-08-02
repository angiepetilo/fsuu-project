import { useState } from "react";
import { PackageOpen, Loader2, Plus, Pencil, Trash2, Save, X, Calculator, ShieldCheck, CheckCircle2, Clock, Wrench } from "lucide-react";
import api from "@/lib/axios";

export default function EquipmentStockTab({
  filteredInventory = [],
  setInventoryItems,
  loading = false,
  fetchReportsData,
}) {
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    office: "FSUU Main Campus AVR Office",
    expected_total: 10,
    available: 0,
    onLoan: 0,
    maintenance: 0,
  });

  // Calculate live Total Stock
  const computedTotalStock =
    (Number(form.available) || 0) +
    (Number(form.onLoan) || 0) +
    (Number(form.maintenance) || 0);

  const openAddModal = () => {
    setEditingItem(null);
    setForm({
      name: "",
      office: "FSUU Main Campus AVR Office",
      expected_total: 10,
      available: 0,
      onLoan: 0,
      maintenance: 0,
    });
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    const catName = item.eq_name || item.name || item.category || item.eq_type || "AV Equipment";
    const officeLocation = typeof item.office === "object"
      ? (item.office?.name || item.office?.location || "FSUU Main Campus AVR Office")
      : (item.office || "FSUU Main Campus AVR Office");

    const availStock = item.available_count ?? item.available ?? 0;
    const onLoanCount = item.onLoan ?? item.released ?? 0;
    const maintCount = item.maintenance ?? item.damaged ?? item.lost ?? 0;
    const expected = item.expected_total || item.total_quantity || (availStock + onLoanCount + maintCount);

    setForm({
      name: catName,
      office: officeLocation,
      expected_total: Number(expected),
      available: Number(availStock),
      onLoan: Number(onLoanCount),
      maintenance: Number(maintCount),
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveLoading(true);

    const totalQty = computedTotalStock;

    const newItem = {
      id: editingItem ? editingItem.id : Date.now(),
      eq_name: form.name,
      name: form.name,
      category: form.name,
      office: form.office,
      expected_total: Number(form.expected_total) || totalQty,
      total_quantity: totalQty,
      total: totalQty,
      available_count: Number(form.available),
      available: Number(form.available),
      onLoan: Number(form.onLoan),
      released: Number(form.onLoan),
      maintenance: Number(form.maintenance),
      damaged: Number(form.maintenance),
    };

    let updatedList;
    if (editingItem) {
      updatedList = filteredInventory.map((item) =>
        item.id === editingItem.id ? { ...item, ...newItem } : item
      );
    } else {
      updatedList = [newItem, ...filteredInventory];
    }

    if (setInventoryItems) {
      setInventoryItems(updatedList);
    }

    localStorage.setItem("fsuu_equipment_inventory", JSON.stringify(updatedList));
    window.dispatchEvent(new Event("equipment_inventory_updated"));

    try {
      if (editingItem && typeof editingItem.id === "number" && editingItem.id < 1000000) {
        await api.put(`/admin/equipment-types/${editingItem.id}`, {
          eq_name: form.name,
          available_count: Number(form.available),
          total_quantity: totalQty,
        });
      } else {
        await api.post("/admin/equipment-types", {
          eq_name: form.name,
          available_count: Number(form.available),
          total_quantity: totalQty,
        });
      }
    } catch {
      // Graceful fallback
    } finally {
      setSaveLoading(false);
      setShowModal(false);
      setEditingItem(null);
      if (fetchReportsData) fetchReportsData();
    }
  };

  const handleDelete = async (item) => {
    const itemName = item.eq_name || item.name || item.category || "equipment item";
    if (!confirm(`Are you sure you want to delete "${itemName}"?`)) return;

    const updatedList = filteredInventory.filter((i) => i.id !== item.id);
    if (setInventoryItems) {
      setInventoryItems(updatedList);
    }

    localStorage.setItem("fsuu_equipment_inventory", JSON.stringify(updatedList));
    window.dispatchEvent(new Event("equipment_inventory_updated"));

    try {
      if (typeof item.id === "number" && item.id < 1000000) {
        await api.delete(`/admin/equipment-types/${item.id}`);
      }
    } catch {
      // Graceful fallback
    }
  };

  return (
    <div className="bg-slate-50/50 rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border-b border-slate-100 bg-white gap-3">
        <div className="flex items-center gap-2">
          <PackageOpen size={18} className="text-blue-600" />
          <span className="font-bold text-slate-900 text-sm">Equipment Inventory Stock & Health Report</span>
          <span className="ml-1 text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
            {filteredInventory.length}
          </span>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer w-fit"
        >
          <Plus size={15} /> Add Equipment Stock
        </button>
      </div>

      {/* Inventory Stock Table */}
      <div className="overflow-x-auto bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-100">
              {["#", "Category Name", "Office Location", "Expected Total Equipment", "Live Total Stock", "Available", "On Loan", "Maintenance / Lost", "Action"].map((h) => (
                <th key={h} className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-semibold">
            {loading ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-slate-500 font-bold">
                  <Loader2 className="animate-spin inline mr-2 text-blue-600" size={20} />
                  Please wait... Loading inventory stock records...
                </td>
              </tr>
            ) : filteredInventory.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-slate-400">
                  No inventory records found. Click "Add Equipment Stock" to create an item.
                </td>
              </tr>
            ) : (
              filteredInventory.map((item, idx) => {
                const catName = item.eq_name || item.eq_type || item.name || item.category || "AV Equipment";
                const availStock = Number(item.available_count ?? item.available ?? 0);
                const onLoanCount = Number(item.onLoan ?? item.released ?? 0);
                const maintCount = Number(item.maintenance ?? item.damaged ?? item.lost ?? 0);

                const calculatedTotal = availStock + onLoanCount + maintCount;
                const expectedTotal = item.expected_total || item.total_quantity || calculatedTotal;
                const totalStock = (item.total_quantity !== undefined && item.total_quantity > 0)
                  ? item.total_quantity
                  : calculatedTotal;

                const officeLocation = typeof item.office === "object"
                  ? (item.office?.name || item.office?.location || "FSUU Main Campus")
                  : (item.office || "FSUU Main Campus");

                return (
                  <tr key={item.id || idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-3.5 font-extrabold text-slate-900">{catName}</td>
                    <td className="px-4 py-3.5 text-slate-600 font-semibold">{officeLocation}</td>
                    <td className="px-4 py-3.5 font-black text-purple-800">
                      <span className="inline-flex items-center gap-1 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-lg">
                        <ShieldCheck size={14} className="text-purple-600" /> {expectedTotal} Units
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-black text-slate-900">
                      <span className="inline-block bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                        {totalStock} Units
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-emerald-700 font-extrabold">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1.5 font-extrabold">
                        <CheckCircle2 size={13} className="text-emerald-600" /> {availStock} Available
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-blue-700 font-extrabold">
                      <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 inline-flex items-center gap-1.5 font-extrabold">
                        <Clock size={13} className="text-blue-600" /> {onLoanCount} On Loan
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-amber-700 font-extrabold">
                      <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 inline-flex items-center gap-1.5 font-extrabold">
                        <Wrench size={13} className="text-amber-600" /> {maintCount} Maintenance / Lost
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          title="Edit Stock Breakdown"
                          onClick={() => openEditModal(item)}
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all cursor-pointer border border-blue-200"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          title="Delete Stock Record"
                          onClick={() => handleDelete(item)}
                          className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all cursor-pointer border border-rose-200"
                        >
                          <Trash2 size={14} />
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

      {/* Add / Edit Equipment Stock Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[1500] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 border border-slate-100 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <PackageOpen size={18} className="text-blue-600" />
                {editingItem ? "Edit Equipment Stock Breakdown" : "Add Equipment Stock Record"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Equipment Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Projector, Wireless Mic, Tripod..."
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Office Location *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FSUU Main Campus AVR Office"
                  value={form.office}
                  onChange={(e) => setForm({ ...form, office: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Expected Total Equipment Capacity (Base Assigned) *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={form.expected_total}
                  onChange={(e) => setForm({ ...form, expected_total: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                  className="w-full p-3 bg-purple-50 border border-purple-200 rounded-xl font-black text-purple-900 text-sm focus:outline-none"
                />
              </div>

              {/* Stock Counts Breakdown Inputs */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <label className="block text-xs font-extrabold text-slate-900">
                  Stock Breakdown Counts *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] font-extrabold text-emerald-700 flex items-center gap-1 block mb-1">
                      <CheckCircle2 size={12} /> Available
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={form.available}
                      onChange={(e) => setForm({ ...form, available: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                      className="w-full p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl font-black text-emerald-800 text-sm text-center"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-blue-700 flex items-center gap-1 block mb-1">
                      <Clock size={12} /> On Loan
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={form.onLoan}
                      onChange={(e) => setForm({ ...form, onLoan: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                      className="w-full p-2.5 bg-blue-50 border border-blue-300 rounded-xl font-black text-blue-800 text-sm text-center"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-amber-700 flex items-center gap-1 block mb-1">
                      <Wrench size={12} /> Maintenance / Lost
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={form.maintenance}
                      onChange={(e) => setForm({ ...form, maintenance: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                      className="w-full p-2.5 bg-amber-50 border border-amber-300 rounded-xl font-black text-amber-800 text-sm text-center"
                    />
                  </div>
                </div>

                {/* Dynamic Calculated Total Stock Box */}
                <div className="mt-3 p-3 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center justify-between">
                  <span className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                    <Calculator size={15} className="text-blue-600" /> Automatically Computed Live Total:
                  </span>
                  <span className="font-black text-blue-700 text-sm bg-white px-3 py-1 rounded-lg border border-blue-200 shadow-2xs">
                    {computedTotalStock} Units
                  </span>
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
                  disabled={saveLoading}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  {saveLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save Stock Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
