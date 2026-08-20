import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function PasswordInput({ value, onChange, placeholder, label, required = false }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      {label && (
        <label className="text-xs font-bold text-slate-700 mb-1 block">
          {label} {required && <span className="text-rose-600">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-900 transition-all pr-10 bg-white"
        />
        <button
          type="button"
          onClick={() => setShow(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  );
}
