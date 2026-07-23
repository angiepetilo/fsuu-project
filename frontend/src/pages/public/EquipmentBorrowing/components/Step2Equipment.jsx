import { Sparkles, Check, PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Step2Equipment({
  equipmentCategory, setEquipmentCategory,
  filteredCatalog,
  selectedItems, handleEquipmentToggle,
  isScoSelected, isAvrSelected,
  handleEquipmentSubmit
}) {
  return (
    <div className="p-6 sm:p-8 animate-in slide-in-from-top-2 duration-300">
      {/* Equipment Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {filteredCatalog.map((item) => {
          const isChecked = selectedItems.includes(item.id);
          const isSco = item.dept === "sco";
          const IconComp = item.icon || PackageOpen;

          return (
            <div
              key={item.id}
              onClick={() => handleEquipmentToggle(item.id)}
              className={`relative border-2 rounded-2xl p-5 cursor-pointer transition-all duration-300 flex flex-col justify-between ${isChecked
                ? isSco
                  ? 'border-purple-600 bg-purple-50/70 shadow-md shadow-purple-600/10 scale-[1.02]'
                  : 'border-blue-600 bg-blue-50/70 shadow-md shadow-blue-600/10 scale-[1.02]'
                : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm'
                }`}
            >
              <div className="flex flex-col flex-grow">
                {/* Image Box */}
                <div className="w-full h-32 bg-slate-200 rounded-xl mb-3 overflow-hidden flex items-center justify-center border border-slate-200">
                  <span className="text-slate-400 text-xs font-medium">No Image Available</span>
                </div>
                <div className="flex justify-between items-start mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSco ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                    <IconComp size={20} />
                  </div>
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${isSco ? 'bg-purple-100 border-purple-200 text-purple-700' : 'bg-blue-100 border-blue-200 text-blue-700'
                    }`}>
                    {isSco ? "SCO Media" : "AVR Resource"}
                  </span>
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm mb-1">{item.name}</h4>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">{item.description}</p>
              </div>

              <div className={`mt-auto text-xs font-bold text-center py-2 rounded-xl border flex items-center justify-center gap-1.5 transition-all ${isChecked
                ? isSco ? 'bg-purple-600 text-white border-purple-600' : 'bg-blue-600 text-white border-blue-600'
                : 'bg-slate-50 text-slate-700 border-slate-200/60'
                }`}>
                {isChecked && <Check size={14} />}
                {isChecked ? "Added to Cart" : "Select Item"}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Action Bar */}
      {selectedItems.length > 0 && (
        <div className="flex items-center justify-between bg-slate-900 text-white p-4 rounded-2xl shadow-xl animate-in slide-in-from-bottom-3 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-extrabold text-sm">
              {selectedItems.length}
            </div>
            <div>
              <p className="text-xs font-extrabold">Items Selected</p>
              <p className="text-[11px] text-slate-400">
                {isScoSelected && isAvrSelected ? "Mixed (SCO & AVR Items)" : isScoSelected ? "SCO Media Kit" : "AVR Resource Gear"}
              </p>
            </div>
          </div>
          <Button onClick={handleEquipmentSubmit} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-5 rounded-xl font-extrabold text-xs">
            Continue to Details Form &rarr;
          </Button>
        </div>
      )}
    </div>
  );
}
