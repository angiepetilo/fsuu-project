import React, { useState, useEffect } from "react";
import { Save, Tag, DollarSign, Building2, CheckCircle2 } from "lucide-react";
import api from "@/lib/axios";

export default function FeeMatrixTab({ officeScope = "All Offices", showMsg }) {
  const [venues, setVenues] = useState([]);
  const [selectedVenueId, setSelectedVenueId] = useState("");
  const [feeForm, setFeeForm] = useState({
    internal_hourly: "0",
    external_hourly: "1500",
    external_daily: "8000",
    cleaning_fee: "200",
    sound_system_fee: "500",
    notes: "Internal FSUU events are free of charge. External rentals require fee matrix approval.",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVenues = async () => {
      setLoading(true);
      try {
        const res = await api.get("/admin/venues").catch(() => ({ data: [] }));
        const list = Array.isArray(res.data) ? res.data : [];
        const saved = JSON.parse(localStorage.getItem("fsuu_venue_availability") || "[]");
        const combined = list.length > 0 ? list : saved;

        const filtered = combined.filter(v => {
          if (officeScope === "All Offices") return true;
          const vOffice = (v.office_name || v.office || v.location || "").toLowerCase();
          const scope = officeScope.toLowerCase();
          if (scope.includes("main")) return vOffice.includes("main") || !vOffice;
          if (scope.includes("morelos")) return vOffice.includes("morelos");
          return true;
        });

        setVenues(filtered);
        if (filtered.length > 0) {
          setSelectedVenueId(String(filtered[0].id));
        }
      } catch {
        setVenues([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVenues();
  }, [officeScope]);

  const handleSaveFeeMatrix = (e) => {
    e.preventDefault();
    const selVenue = venues.find(v => String(v.id) === selectedVenueId);
    const key = `fsuu_fee_matrix_${selectedVenueId}`;
    localStorage.setItem(key, JSON.stringify(feeForm));
    if (showMsg) {
      showMsg(`Rental fee matrix updated for ${selVenue?.name || 'Selected Venue'}!`);
    } else {
      alert(`Rental fee matrix updated for ${selVenue?.name || 'Selected Venue'}!`);
    }
  };

  const currentVenue = venues.find(v => String(v.id) === selectedVenueId);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm">
            Fee Matrix Configuration
          </h3>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Configure rental rates for venues under <span className="font-bold text-slate-900">{officeScope}</span>.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Fee Form */}
        <form onSubmit={handleSaveFeeMatrix} className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 text-xs">
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1.5">Select Venue Scope *</label>
            <select
              value={selectedVenueId}
              onChange={(e) => setSelectedVenueId(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-slate-900 cursor-pointer shadow-2xs"
            >
              {venues.length === 0 ? (
                <option value="">No venues found under {officeScope}</option>
              ) : (
                venues.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.office_name || officeScope})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-900 mb-1">Internal Hourly Rate (₱)</label>
              <input
                type="number"
                min="0"
                value={feeForm.internal_hourly}
                onChange={e => setFeeForm({ ...feeForm, internal_hourly: e.target.value })}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-900 mb-1">External Hourly Rate (₱)</label>
              <input
                type="number"
                min="0"
                value={feeForm.external_hourly}
                onChange={e => setFeeForm({ ...feeForm, external_hourly: e.target.value })}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-900 mb-1">Daily Rate (₱)</label>
              <input
                type="number"
                min="0"
                value={feeForm.external_daily}
                onChange={e => setFeeForm({ ...feeForm, external_daily: e.target.value })}
                className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-900 mb-1">Cleaning Fee (₱)</label>
              <input
                type="number"
                min="0"
                value={feeForm.cleaning_fee}
                onChange={e => setFeeForm({ ...feeForm, cleaning_fee: e.target.value })}
                className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-900 mb-1">Sound Fee (₱)</label>
              <input
                type="number"
                min="0"
                value={feeForm.sound_system_fee}
                onChange={e => setFeeForm({ ...feeForm, sound_system_fee: e.target.value })}
                className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-900 mb-1">Policy Notes</label>
            <textarea
              rows={2}
              value={feeForm.notes}
              onChange={e => setFeeForm({ ...feeForm, notes: e.target.value })}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:border-slate-900"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-white border border-slate-900 text-slate-900 hover:bg-slate-50 font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-2 transition-colors"
          >
            <Save size={14} /> Save Rate Schedule
          </button>
        </form>

        {/* Live Preview Card */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-2">
            <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">Summary Preview</h4>
            <p className="text-[11px] text-slate-500 font-mono">{currentVenue?.name || "Selected Facility"}</p>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-600">Internal Rate:</span>
              <span className="font-bold text-emerald-600">₱{feeForm.internal_hourly} / hr</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-600">External Hourly:</span>
              <span className="font-bold text-slate-900">₱{feeForm.external_hourly} / hr</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-600">External Daily:</span>
              <span className="font-bold text-slate-900">₱{feeForm.external_daily} / day</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-600">Cleaning Fee:</span>
              <span className="font-bold text-slate-900">₱{feeForm.cleaning_fee}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-600">Sound System:</span>
              <span className="font-bold text-slate-900">₱{feeForm.sound_system_fee}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
