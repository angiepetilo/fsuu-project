import { Barcode, X, Edit3 } from "lucide-react";

export default function EquipmentDetailModal({
  selectedItem,
  setSelectedItem,
  handleOpenEditModal,
}) {
  if (!selectedItem) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden">
        
        {/* Modal Header — Item 35: Clean White Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 font-mono text-xs font-bold tracking-wider">
              {selectedItem.barcode}
            </div>
            <h3 className="text-sm font-extrabold text-slate-900">Equipment Specification & Details</h3>
          </div>
          <button
            onClick={() => setSelectedItem(null)}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 text-xs">
          
          {/* Main Model Name & Category */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Equipment Model & Name</span>
              <h3 className="text-base font-extrabold text-slate-900 mt-0.5">{selectedItem.name}</h3>
            </div>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 font-extrabold text-xs rounded-xl border border-blue-200">
              Category: {selectedItem.category}
            </span>
          </div>

          {/* Grid Specifications */}
          <div className="grid grid-cols-2 gap-4">
            
            <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-bold block text-[10px] uppercase">Equipment Barcode</span>
              <span className="font-mono font-extrabold text-blue-600 text-sm mt-0.5 block">{selectedItem.barcode}</span>
            </div>

            <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-bold block text-[10px] uppercase">Operating Status</span>
              <span className="font-extrabold text-slate-900 text-sm mt-0.5 block capitalize">
                {selectedItem.status || "available"} ({selectedItem.available_count ?? 1} / {selectedItem.total_count ?? 1} Units)
              </span>
            </div>

            <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-bold block text-[10px] uppercase">Date Purchased</span>
              <span className="font-bold text-slate-800 text-sm mt-0.5 block">{selectedItem.date_purchased || "2024-03-15"}</span>
            </div>

            <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-bold block text-[10px] uppercase">Equipment Lifespan</span>
              <span className="font-bold text-slate-800 text-sm mt-0.5 block">{selectedItem.lifespan_years || 5} Years</span>
            </div>

          </div>

          {/* Description */}
          {selectedItem.description && (
            <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-blue-900 uppercase block">Description / Notes:</span>
              <p className="font-semibold text-slate-800 leading-relaxed">
                {selectedItem.description}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end pt-4 border-t border-slate-100">
            <button
              onClick={() => setSelectedItem(null)}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs"
            >
              Close Details
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
