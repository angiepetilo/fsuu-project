import { useState, useEffect } from "react";
import { Save, Clock, Loader2 } from "lucide-react";
import api from "@/lib/axios";

export default function OperatingHoursTab({ showMsg }) {
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);

  const [operatingHours, setOperatingHours] = useState({
    venue_open: "07:00",
    venue_close: "17:00",
    equipment_open: "07:00",
    equipment_close: "17:00",
    arrival_grace_mins: 15,
    return_grace_mins: 30,
    auto_cancel_mins: 30,
    requirement_grace_hours: 24,
  });

  const fetchHours = async () => {
    setLoading(true);
    try {
      const res = await api.get("/general/operating-hours");
      if (res.data) {
        setOperatingHours({
          venue_open: res.data.venue_open?.substring(0, 5) || "07:00",
          venue_close: res.data.venue_close?.substring(0, 5) || "17:00",
          equipment_open: res.data.equipment_open?.substring(0, 5) || "07:00",
          equipment_close: res.data.equipment_close?.substring(0, 5) || "17:00",
          arrival_grace_mins: res.data.arrival_grace_mins ?? 15,
          return_grace_mins: res.data.return_grace_mins ?? 30,
          auto_cancel_mins: res.data.auto_cancel_mins ?? 30,
          requirement_grace_hours: res.data.requirement_grace_hours ?? 24,
        });
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHours();
  }, []);

  const handleSaveHours = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      await api.put("/general/operating-hours", operatingHours);
      showMsg("✅ Operating Hours, Grace Periods, and Auto-Cancel rules saved globally!");
    } catch {
      showMsg("❌ Failed to save operating hours.");
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-slate-200 flex items-center justify-center gap-2 text-slate-400">
        <div className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin shrink-0" />
        <span className="text-xs font-semibold italic">Loading operating rules...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSaveHours} className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            Operating Hours
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-100">
          <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-2">
              🏛️ Venue Booking
            </h4>
            <p className="text-[11px] text-slate-500 font-medium">
              Requestors may only book venues during this operating time range.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Opening Time</label>
                <input
                  type="time"
                  value={operatingHours.venue_open}
                  onChange={(e) => setOperatingHours({ ...operatingHours, venue_open: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Closing Time</label>
                <input
                  type="time"
                  value={operatingHours.venue_close}
                  onChange={(e) => setOperatingHours({ ...operatingHours, venue_close: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 text-xs"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-2">
              📦 Equipment Borrowing
            </h4>
            <p className="text-[11px] text-slate-500 font-medium">
              Requestors should borrow and return equipment during this operating time.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Opening Time</label>
                <input
                  type="time"
                  value={operatingHours.equipment_open}
                  onChange={(e) => setOperatingHours({ ...operatingHours, equipment_open: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Closing Time</label>
                <input
                  type="time"
                  value={operatingHours.equipment_close}
                  onChange={(e) => setOperatingHours({ ...operatingHours, equipment_close: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div>
          <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">Grace Periods & Auto-Cancel Rules</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
            <label className="block text-xs font-bold text-slate-900 dark:text-slate-200">Arrival Grace Period (Minutes)</label>
            <input
              type="number"
              min={0}
              max={120}
              value={operatingHours.arrival_grace_mins}
              onChange={(e) => setOperatingHours({ ...operatingHours, arrival_grace_mins: parseInt(e.target.value, 10) || 0 })}
              className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white text-xs"
            />
            <p className="text-[10px] text-slate-400 dark:text-slate-400 font-medium">Lead time required before event start.</p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
            <label className="block text-xs font-bold text-slate-900 dark:text-slate-200">Return Grace Period (Minutes)</label>
            <input
              type="number"
              min={0}
              max={120}
              value={operatingHours.return_grace_mins}
              onChange={(e) => setOperatingHours({ ...operatingHours, return_grace_mins: parseInt(e.target.value, 10) || 0 })}
              className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white text-xs"
            />
            <p className="text-[10px] text-slate-400 dark:text-slate-400 font-medium">Time client has to return borrowed items after end time.</p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
            <label className="block text-xs font-bold text-slate-900 dark:text-slate-200">Auto-Cancel Threshold (Minutes)</label>
            <input
              type="number"
              min={0}
              max={120}
              value={operatingHours.auto_cancel_mins}
              onChange={(e) => setOperatingHours({ ...operatingHours, auto_cancel_mins: parseInt(e.target.value, 10) || 0 })}
              className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white text-xs"
            />
            <p className="text-[10px] text-slate-400 dark:text-slate-400 font-medium">Auto cancels if client fails to arrive after event start.</p>
          </div>
        </div>

        {/* Missing Requirements Review Grace Period */}
        <div className="mt-4 p-4.5 bg-blue-50/50 dark:bg-slate-900/80 rounded-2xl border border-blue-200/80 dark:border-blue-900/50 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-white">
                Missing Requirements Review Grace Period
              </label>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                Allowed window for requestors to submit missing requirements before competing complete bookings can claim the reserved slot.
              </p>
            </div>
            <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 text-[11px] font-bold rounded-lg self-start sm:self-auto border border-blue-300 dark:border-blue-800">
              Active: {operatingHours.requirement_grace_hours || 24} Hours
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => setOperatingHours({ ...operatingHours, requirement_grace_hours: 24 })}
              className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                (operatingHours.requirement_grace_hours || 24) === 24
                  ? "bg-white dark:bg-slate-800 border-blue-600 dark:border-blue-500 ring-2 ring-blue-500/20 shadow-xs"
                  : "bg-white/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">24 Hours (1 Day)</span>
                {(operatingHours.requirement_grace_hours || 24) === 24 && (
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-blue-400"></span>
                )}
              </div>
              <p className="text-[10.5px] text-slate-600 dark:text-slate-300 mt-1">
                Standard review window for on-campus student organizations and academic activities.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setOperatingHours({ ...operatingHours, requirement_grace_hours: 48 })}
              className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                operatingHours.requirement_grace_hours === 48
                  ? "bg-white dark:bg-slate-800 border-blue-600 dark:border-blue-500 ring-2 ring-blue-500/20 shadow-xs"
                  : "bg-white/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">48 Hours (2 Days)</span>
                {operatingHours.requirement_grace_hours === 48 && (
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-blue-400"></span>
                )}
              </div>
              <p className="text-[10.5px] text-slate-600 dark:text-slate-300 mt-1">
                Extended review window recommended for external client reservations or weekend filings.
              </p>
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saveLoading}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-md cursor-pointer disabled:opacity-50"
        >
          {saveLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          <span>Save Operating Rules</span>
        </button>
      </div>
    </form>
  );
}
