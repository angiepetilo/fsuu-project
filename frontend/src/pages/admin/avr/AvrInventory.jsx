import { useState, useEffect } from "react";
import api from "@/lib/axios";
import { useDataCache } from "@/hooks/useDataCache";
import { Loader2, AlertCircle, RefreshCw, Warehouse } from "lucide-react";

const STATUS_MAP = [
  { key: "available_count",     label: "Available",    color: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" },
  { key: "checked_out_count",   label: "Checked Out",  color: "bg-blue-500",    text: "text-blue-700",    bg: "bg-blue-50"    },
  { key: "damaged_count",       label: "Damaged",      color: "bg-red-500",     text: "text-red-700",     bg: "bg-red-50"     },
  { key: "under_repair_count",  label: "Under Repair", color: "bg-amber-500",   text: "text-amber-700",   bg: "bg-amber-50"   },
  { key: "lost_count",          label: "Lost",         color: "bg-slate-400",   text: "text-slate-600",   bg: "bg-slate-100"  },
];

function SummaryCard({ label, value, color, bg, text }) {
  return (
    <div className={`rounded-2xl p-4 flex items-center gap-3 ${bg} border border-white/60`}>
      <div className={`w-2 h-10 rounded-full ${color} flex-shrink-0`} />
      <div>
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <p className={`text-2xl font-extrabold ${text}`}>{value ?? 0}</p>
      </div>
    </div>
  );
}

function CategoryRow({ cat }) {
  const total = cat.total_units || 1;
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-slate-900 text-sm">{cat.name}</h3>
          {cat.description && <p className="text-xs text-slate-400 mt-0.5">{cat.description}</p>}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xl font-extrabold text-slate-900">{cat.total_units}</p>
          <p className="text-[10px] text-slate-400">total units</p>
        </div>
      </div>

      {/* Status breakdown bars */}
      <div className="space-y-2">
        {STATUS_MAP.map(({ key, label, color }) => {
          const val = cat[key] ?? 0;
          const pct = Math.round((val / (cat.total_units || 1)) * 100);
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 w-24 flex-shrink-0">{label}</span>
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
              </div>
              <span className="text-[11px] font-bold text-slate-700 w-6 text-right">{val}</span>
            </div>
          );
        })}
      </div>

      {/* Updated by */}
      {cat.updated_by && (
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[10px] text-slate-400">
            Last updated by <span className="font-semibold text-slate-600">{cat.updated_by.name}</span>
          </p>
          {cat.last_updated_at && (
            <p className="text-[10px] text-slate-400">{new Date(cat.last_updated_at).toLocaleDateString()}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function AvrInventory() {
  const { data, loading, error, refresh: fetchInventory } = useDataCache('avr_inventory', '/avr/inventory');

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Inventory</h1>
          <p className="text-sm text-slate-400 mt-0.5">Equipment availability and status breakdown</p>
        </div>
        <button onClick={fetchInventory} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-60">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 text-red-700 text-sm font-semibold"><AlertCircle size={18} />{error}</div>}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {STATUS_MAP.map(s => (
            <SummaryCard key={s.key} label={s.label} value={summary[s.key.replace("_count","")]} color={s.color} bg={s.bg} text={s.text} />
          ))}
        </div>
      )}

      {/* Total banner */}
      {summary && (
        <div className="bg-gradient-to-r from-[#0f1c3f] to-[#1a2f5e] rounded-2xl p-5 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <Warehouse size={22} className="text-white/60" />
            <div>
              <p className="text-xs font-semibold text-white/60">Total Equipment Units</p>
              <p className="text-3xl font-extrabold">{summary.total_units ?? 0}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/50">Overall Availability</p>
            <p className="text-2xl font-extrabold">
              {summary.total_units > 0 ? Math.round((summary.available / summary.total_units) * 100) : 0}%
            </p>
          </div>
        </div>
      )}

      {/* Per-category cards */}
      {loading
        ? <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 size={22} className="animate-spin mr-2" />Loading inventory…</div>
        : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(data?.categories ?? []).map(cat => <CategoryRow key={cat.id} cat={cat} />)}
            {!data?.categories?.length && (
              <div className="col-span-full text-center py-12 text-slate-400">No equipment categories found.</div>
            )}
          </div>
        )
      }
    </div>
  );
}
