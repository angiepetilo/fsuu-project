import { X } from "lucide-react";

export default function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-300 shadow-xl w-full max-w-lg relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between p-5 border-b border-slate-200 rounded-t-2xl z-10">
          <h3 className="font-extrabold text-slate-900 text-base">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 transition-all cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
