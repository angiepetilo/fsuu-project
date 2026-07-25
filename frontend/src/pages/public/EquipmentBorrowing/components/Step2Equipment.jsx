import { Sparkles, Check, PackageOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";

export default function Step2Equipment({
  equipmentCategory, setEquipmentCategory,
  filteredCatalog,
  selectedItems, handleEquipmentToggle,
  isScoSelected, isAvrSelected,
  handleEquipmentSubmit
}) {
  const [equipPage, setEquipPage] = useState(0);
  const totalEquipPages = Math.max(1, Math.ceil(filteredCatalog.length / 4));
  const displayedCatalog = useMemo(() => {
    return filteredCatalog.slice(equipPage * 4, (equipPage + 1) * 4);
  }, [filteredCatalog, equipPage]);

  return (
    <div className="p-6 sm:p-8 animate-in slide-in-from-top-2 duration-300">
      
      {/* Header info with Next/Prev pagination */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-900">Select Equipment Gear</h3>
          <p className="text-xs text-slate-400">Showing {displayedCatalog.length} of {filteredCatalog.length} available items</p>
        </div>
        {totalEquipPages > 1 && (
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <Button
              variant="ghost"
              size="sm"
              disabled={equipPage === 0}
              onClick={() => setEquipPage(p => Math.max(0, p - 1))}
              className="h-7 w-7 p-0 rounded-lg hover:bg-white disabled:opacity-40"
            >
              <ChevronLeft size={15} />
            </Button>
            <span className="text-[10px] font-bold text-slate-600 px-1">
              {equipPage + 1}/{totalEquipPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={equipPage >= totalEquipPages - 1}
              onClick={() => setEquipPage(p => Math.min(totalEquipPages - 1, p + 1))}
              className="h-7 w-7 p-0 rounded-lg hover:bg-white disabled:opacity-40"
            >
              <ChevronRight size={15} />
            </Button>
          </div>
        )}
      </div>

      {/* Equipment Grid (Max 4 Items) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {displayedCatalog.map((item) => {
          const isChecked = selectedItems.includes(item.id);
          const isSco = item.dept === "sco";
          const IconComp = item.icon || PackageOpen;

          return (
            <div
              key={item.id}
              onClick={() => handleEquipmentToggle(item.id)}
              className={`relative border-2 rounded-2xl p-4 cursor-pointer transition-all duration-300 flex flex-col justify-between ${isChecked
                ? isSco
                  ? 'border-purple-600 bg-purple-50/70 shadow-md shadow-purple-600/10 scale-[1.02]'
                  : 'border-blue-600 bg-blue-50/70 shadow-md shadow-blue-600/10 scale-[1.02]'
                : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm'
                }`}
            >
              <div className="flex flex-col flex-grow">
                {/* Image Box */}
                <div className="w-full h-28 bg-slate-200 rounded-xl mb-3 overflow-hidden flex items-center justify-center border border-slate-200">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-slate-400 text-xs font-medium">No Image</span>
                  )}
                </div>
                <div className="flex justify-between items-start mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSco ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                    <IconComp size={16} />
                  </div>
                  <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${isSco ? 'bg-purple-100 border-purple-200 text-purple-700' : 'bg-blue-100 border-blue-200 text-blue-700'
                    }`}>
                    {isSco ? "SCO Media" : "AVR Resource"}
                  </span>
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm mb-1">{item.name}</h4>
                <div className="flex gap-2 text-[10px] font-bold mb-1">
                  <span className={`${item.available > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    Available: {item.available ?? 0}
                  </span>
                  <span className="text-slate-400">Total: {item.total ?? 0}</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mb-3 line-clamp-2">{item.description}</p>
              </div>

              <div className={`mt-auto text-xs font-bold text-center py-1.5 rounded-xl border flex items-center justify-center gap-1.5 transition-all ${isChecked
                ? isSco ? 'bg-purple-600 text-white border-purple-600' : 'bg-blue-600 text-white border-blue-600'
                : 'bg-slate-50 text-slate-700 border-slate-200/60'
                }`}>
                {isChecked && <Check size={14} />}
                {isChecked ? "Added to Requisition" : "Select Item"}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Action Bar */}
      {selectedItems.length > 0 && (
        <div className="flex items-center justify-between bg-slate-900 text-white p-4 rounded-2xl shadow-xl animate-in slide-in-from-bottom-3 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center font-extrabold text-xs">
              {selectedItems.length}
            </div>
            <div>
              <p className="text-xs font-extrabold">Items Selected</p>
              <p className="text-[10px] text-slate-400">
                {isScoSelected && isAvrSelected ? "Mixed (SCO & AVR Gear)" : isScoSelected ? "SCO Media Kit" : "AVR Resource Gear"}
              </p>
            </div>
          </div>
          <Button onClick={handleEquipmentSubmit} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-blue-600/20 flex items-center gap-2">
            <span>Continue to Form</span>
            <span>→</span>
          </Button>
        </div>
      )}
    </div>
  );
}
