import { PackageOpen, Loader2 } from "lucide-react";

export default function EquipmentStockTab({ filteredInventory = [], loading = false }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <PackageOpen size={18} className="text-blue-600" />
          <span className="font-bold text-slate-900 text-sm">Equipment Inventory Stock & Health Report</span>
          <span className="ml-1 text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
            {filteredInventory.length}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-100">
              {["#", "Category Name", "Office Location", "Total Stock", "Available", "On Loan", "Maintenance / Lost"].map((h) => (
                <th key={h} className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-semibold">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-500 font-bold">
                  <Loader2 className="animate-spin inline mr-2 text-blue-600" size={20} />
                  Please wait... Loading inventory stock records...
                </td>
              </tr>
            ) : filteredInventory.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400">
                  No inventory records found for selected office scope.
                </td>
              </tr>
            ) : (
              filteredInventory.map((item, idx) => {
                const catName = item.eq_name || item.eq_type || item.name || item.category || "AV Equipment";
                const totalStock = item.total_quantity ?? item.total ?? item.available_count ?? 0;
                const availStock = item.available_count ?? item.available ?? 0;
                const onLoanCount = item.onLoan ?? item.released ?? 0;
                const maintCount = item.maintenance ?? item.damaged ?? item.lost ?? 0;

                const officeLocation = typeof item.office === "object"
                  ? (item.office?.name || item.office?.location || "FSUU Main Campus")
                  : (item.office || "FSUU Main Campus");

                return (
                  <tr key={item.id || idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-3.5 font-extrabold text-slate-900">{catName}</td>
                    <td className="px-4 py-3.5 text-slate-600 font-semibold">{officeLocation}</td>
                    <td className="px-4 py-3.5 font-extrabold text-slate-900">{totalStock} Units</td>
                    <td className="px-4 py-3.5 text-emerald-700 font-extrabold">🟢 {availStock} Available</td>
                    <td className="px-4 py-3.5 text-blue-700 font-extrabold">🔵 {onLoanCount} On Loan</td>
                    <td className="px-4 py-3.5 text-amber-700 font-extrabold">🟠 {maintCount} Maintenance</td>
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
