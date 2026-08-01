import { useState, useEffect } from "react";
import { PackageOpen, Plus, Pencil, Trash2, RefreshCw, Loader2 } from "lucide-react";
import api from "@/lib/axios";

export default function InventoryTab({
  inventoryCategories,
  setInventoryCategories,
  showMsg,
}) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [editInventory, setEditInventory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [catalogItems, setCatalogItems] = useState([]);
  const [inventoryForm, setInventoryForm] = useState({
    category: "",
    available: 0,
    released: 0,
    damaged: 0,
    lost: 0,
    date_purchased: "2026-03-15",
    lifespan: 5,
  });

  const syncInventoryFromBackend = async () => {
    setLoading(true);
    try {
      const [typeRes, unitRes] = await Promise.all([
        api.get("/admin/equipment-types"),
        api.get("/admin/equipment-units").catch(() => ({ data: [] })),
      ]);

      const types = Array.isArray(typeRes.data) ? typeRes.data : [];
      const units = Array.isArray(unitRes.data) ? unitRes.data : [];

      setCatalogItems(types);

      if (types.length > 0) {
        const categoryMap = {};

        // 1. Initialize all registered categories from equipment-types
        types.forEach((typeItem) => {
          const catName = typeItem.eq_name || typeItem.name || typeItem.eq_type || "General Equipment";
          categoryMap[typeItem.id] = {
            id: typeItem.id,
            category: catName,
            available: 0,
            released: 0,
            damaged: 0,
            lost: 0,
            date_purchased: typeItem.date_purchased ? typeItem.date_purchased.substring(0, 10) : "2026-01-15",
            lifespan: typeItem.lifespan_years || 5,
          };
        });

        // 2. Aggregate counts directly from physical units in equipment-units table
        units.forEach((u) => {
          const typeId = u.equipment_type_id;
          const targetCat = categoryMap[typeId] || Object.values(categoryMap).find(c => c.category === (u.equipment_type?.eq_name || u.equipment_type?.eq_type));

          if (targetCat) {
            const st = (u.status || "available").toLowerCase();
            if (st === "maintenance" || st === "damaged") {
              targetCat.damaged += 1;
            } else if (st === "decommissioned" || st === "lost") {
              targetCat.lost += 1;
            } else if (st === "borrowed" || st === "released") {
              targetCat.released += 1;
            } else {
              targetCat.available += 1;
            }
          }
        });

        const syncedList = Object.values(categoryMap);
        setInventoryCategories(syncedList);
        localStorage.setItem("fsuu_equipment_inventory", JSON.stringify(syncedList));
      }
    } catch {
      // Fallback to current inventoryCategories prop if API call fails
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncInventoryFromBackend();
  }, []);

  const handleSaveInventory = (e) => {
    e.preventDefault();
    let updated;
    if (editInventory) {
      updated = inventoryCategories.map((c) =>
        c.id === editInventory.id ? { ...c, ...inventoryForm } : c
      );
      showMsg(`✅ Stock breakdown for "${inventoryForm.category}" updated!`);
    } else {
      const newCat = { id: Date.now(), ...inventoryForm };
      updated = [...inventoryCategories, newCat];
      showMsg(`✅ Inventory category "${newCat.category}" added!`);
    }
    setInventoryCategories(updated);
    localStorage.setItem("fsuu_equipment_inventory", JSON.stringify(updated));
    window.dispatchEvent(new Event("equipment_inventory_updated"));
    setShowEditModal(false);
    setEditInventory(null);
  };

  const handleDeleteInventory = (id, catName) => {
    if (confirm(`Delete inventory category "${catName}"?`)) {
      const updated = inventoryCategories.filter((c) => c.id !== id);
      setInventoryCategories(updated);
      localStorage.setItem("fsuu_equipment_inventory", JSON.stringify(updated));
      window.dispatchEvent(new Event("equipment_inventory_updated"));
      showMsg(`✅ Category "${catName}" deleted.`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <PackageOpen className="text-blue-600" size={18} />
            Equipment Inventory & Synchronous Stock Table
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Live stock counts synchronized by equipment catalog: Available (green), Released/Borrowed (blue), Maintenance/Damaged (orange), and Lost (red).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={syncInventoryFromBackend}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold shadow-2xs cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Sync Stock
          </button>
          <button
            onClick={() => {
              setEditInventory(null);
              setInventoryForm({
                category: "",
                available: 0,
                released: 0,
                damaged: 0,
                lost: 0,
                date_purchased: "2026-01-15",
                lifespan: 5,
              });
              setShowEditModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-sm cursor-pointer"
          >
            <Plus size={16} /> Add Inventory Category
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-100">
              {["#", "Equipment Catalog Category", "Synchronous Stock Breakdown (Available / Released / Maintenance / Lost)", "Date Purchased", "Lifespan vs Current", "Action"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-semibold">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500 font-bold">
                  <Loader2 className="animate-spin inline mr-2 text-blue-600" size={18} />
                  Please wait... Synchronizing equipment inventory stock...
                </td>
              </tr>
            ) : inventoryCategories.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No inventory categories added yet. Create an Equipment Catalog item or click "Add Inventory Category".
                </td>
              </tr>
            ) : (
              inventoryCategories.map((cat, index) => {
                const purchaseYear = cat.date_purchased
                  ? parseInt(cat.date_purchased.split("-")[0], 10)
                  : 2026;
                const currentYear = new Date().getFullYear();
                const ageYears = Math.max(0.5, currentYear - purchaseYear + 0.2);

                return (
                  <tr key={cat.id || index} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-400">{index + 1}</td>
                    <td className="px-4 py-3.5 font-extrabold text-slate-900">{cat.category}</td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold text-xs">
                          🟢 {cat.available ?? 0} Available
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-extrabold text-xs">
                          🔵 {cat.released ?? 0} Released
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 font-extrabold text-xs">
                          🟠 {cat.damaged ?? 0} Maintenance
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-extrabold text-xs">
                          🔴 {cat.lost ?? 0} Lost
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-slate-700">{cat.date_purchased || "2026-01-15"}</td>

                    <td className="px-4 py-3.5 text-slate-700 font-bold whitespace-nowrap">
                      <span className="text-blue-700 font-extrabold">{ageYears.toFixed(1)} yrs</span>
                      <span className="text-slate-400 font-normal"> / </span>
                      <span className="text-slate-600">{cat.lifespan || 5} yrs max</span>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          title="Edit Stock & Details"
                          onClick={() => {
                            setEditInventory(cat);
                            setInventoryForm({
                              category: cat.category,
                              available: cat.available ?? 0,
                              released: cat.released ?? 0,
                              damaged: cat.damaged ?? 0,
                              lost: cat.lost ?? 0,
                              date_purchased: cat.date_purchased || "2026-01-15",
                              lifespan: cat.lifespan || 5,
                            });
                            setShowEditModal(true);
                          }}
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all cursor-pointer border border-blue-200"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          title="Delete Category"
                          onClick={() => handleDeleteInventory(cat.id, cat.category)}
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

      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[1500] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 border border-slate-100 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <PackageOpen size={18} className="text-blue-600" />
                {editInventory ? "Edit Equipment Stock & Details" : "Add Inventory Category"}
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveInventory} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Equipment Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Projector, Sound System, Camera..."
                  value={inventoryForm.category}
                  onChange={(e) => setInventoryForm({ ...inventoryForm, category: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <label className="block text-xs font-extrabold text-slate-900">Stock Count Breakdown *</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] font-extrabold text-emerald-700 block mb-1">🟢 Available</span>
                    <input
                      type="number"
                      min={0}
                      value={inventoryForm.available}
                      onChange={(e) => setInventoryForm({ ...inventoryForm, available: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                      className="w-full p-2.5 bg-emerald-50/80 border border-emerald-300 rounded-xl font-black text-emerald-800 text-sm text-center"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-blue-700 block mb-1">🔵 Released</span>
                    <input
                      type="number"
                      min={0}
                      value={inventoryForm.released}
                      onChange={(e) => setInventoryForm({ ...inventoryForm, released: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                      className="w-full p-2.5 bg-blue-50/80 border border-blue-300 rounded-xl font-black text-blue-800 text-sm text-center"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-amber-700 block mb-1">🟠 Maintenance</span>
                    <input
                      type="number"
                      min={0}
                      value={inventoryForm.damaged}
                      onChange={(e) => setInventoryForm({ ...inventoryForm, damaged: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                      className="w-full p-2.5 bg-amber-50/80 border border-amber-300 rounded-xl font-black text-amber-800 text-sm text-center"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-rose-700 block mb-1">🔴 Lost</span>
                    <input
                      type="number"
                      min={0}
                      value={inventoryForm.lost}
                      onChange={(e) => setInventoryForm({ ...inventoryForm, lost: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                      className="w-full p-2.5 bg-rose-50/80 border border-rose-300 rounded-xl font-black text-rose-800 text-sm text-center"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md"
                >
                  Save Stock Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
