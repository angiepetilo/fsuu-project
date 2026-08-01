import { PackageOpen, Plus, Pencil, Trash2 } from "lucide-react";

export default function EquipmentCategoriesTab({
  inventoryCategories,
  setInventoryCategories,
  showMsg,
  setEditInventory,
  setInventoryForm,
  setShowEditInventoryModal,
}) {
  const handleDeleteCategory = (id, catName) => {
    if (confirm(`Delete inventory category "${catName}"?`)) {
      const updated = inventoryCategories.filter((c) => c.id !== id);
      setInventoryCategories(updated);
      localStorage.setItem("fsuu_equipment_inventory", JSON.stringify(updated));
      window.dispatchEvent(new Event("equipment_inventory_updated"));
      showMsg(`✅ Inventory category "${catName}" deleted.`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm">Equipment Inventory & Stock Breakdown</h3>
          <p className="text-xs text-slate-500 font-medium">
            Manage unit counts: Available (Green), Damaged/Maintenance (Orange), and Lost (Red).
          </p>
        </div>
        <button
          onClick={() => {
            setEditInventory(null);
            setInventoryForm({ category: "", available: 5, damaged: 0, lost: 0, date_purchased: "2024-03-15", lifespan: 5 });
            setShowEditInventoryModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-sm cursor-pointer"
        >
          <Plus size={16} /> Add Inventory Category
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-100">
              {["#", "Category Name", "Stock Status (Available / Maintenance / Lost)", "Date Purchased", "Lifespan vs Current", "Action"].map((h) => (
                <th key={h} className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-semibold">
            {inventoryCategories.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No equipment inventory categories configured yet.
                </td>
              </tr>
            ) : (
              inventoryCategories.map((cat, index) => {
                const purchaseYear = cat.date_purchased ? parseInt(cat.date_purchased.split("-")[0], 10) : 2024;
                const currentYear = new Date().getFullYear();
                const ageYears = Math.max(0.5, currentYear - purchaseYear + 0.2);

                return (
                  <tr key={cat.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-400">{index + 1}</td>
                    <td className="px-4 py-3.5 font-extrabold text-slate-900">{cat.category}</td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold text-xs">
                          🟢 {cat.available} Available
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 font-extrabold text-xs">
                          🟠 {cat.damaged} Maintenance
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-extrabold text-xs">
                          🔴 {cat.lost} Lost
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-slate-700">{cat.date_purchased || "2024-03-15"}</td>

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
                              available: cat.available,
                              damaged: cat.damaged,
                              lost: cat.lost,
                              date_purchased: cat.date_purchased || "2024-03-15",
                              lifespan: cat.lifespan || 5,
                            });
                            setShowEditInventoryModal(true);
                          }}
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all cursor-pointer border border-blue-200"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          title="Delete Category"
                          onClick={() => handleDeleteCategory(cat.id, cat.category)}
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
    </div>
  );
}
