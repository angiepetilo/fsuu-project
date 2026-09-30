import { useState, useEffect, useMemo } from "react";
import api, { clearApiCache } from "@/lib/axios";
import { invalidateCache } from "@/lib/apiCache";

const HOURS_12 = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
const MINUTES_5 = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

function to12Hour(time24 = "07:30") {
  if (!time24) return { hour: "07", minute: "30", period: "AM" };
  const clean = String(time24).trim();
  const [hStr, mStr] = clean.split(":");
  let h = parseInt(hStr, 10);
  if (isNaN(h)) h = 7;
  let m = parseInt(mStr, 10);
  if (isNaN(m)) m = 0;
  const period = h >= 12 ? "PM" : "AM";
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return {
    hour: String(h12).padStart(2, "0"),
    minute: String(m).padStart(2, "0"),
    period,
  };
}

function to24Hour(hour12, minute, period) {
  let h = parseInt(hour12, 10);
  if (isNaN(h)) h = 12;
  const m = String(minute || "00").padStart(2, "0");
  if (period === "AM") {
    if (h === 12) h = 0;
  } else {
    if (h < 12) h += 12;
  }
  return `${String(h).padStart(2, "0")}:${m}`;
}

function PhilippineTimeSelect({ label, value, onChange }) {
  const { hour, minute, period } = to12Hour(value);

  const update = (newHour, newMinute, newPeriod) => {
    const val24 = to24Hour(newHour, newMinute, newPeriod);
    onChange(val24);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
          {label}
        </label>
        <span className="text-[10px] font-bold text-slate-500 font-mono">
          {hour}:{minute} {period}
        </span>
      </div>

      <div className="flex items-center gap-1">
        {/* Hour */}
        <select
          value={hour}
          onChange={(e) => update(e.target.value, minute, period)}
          className="flex-1 px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white cursor-pointer"
        >
          {HOURS_12.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>

        <span className="text-slate-400 text-xs font-bold">:</span>

        {/* Minute */}
        <select
          value={minute}
          onChange={(e) => update(hour, e.target.value, period)}
          className="flex-1 px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white cursor-pointer"
        >
          {MINUTES_5.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        {/* AM / PM Toggle */}
        <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0">
          <button
            type="button"
            onClick={() => update(hour, minute, "AM")}
            className={`px-2.5 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
              period === "AM"
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
            }`}
          >
            AM
          </button>
          <button
            type="button"
            onClick={() => update(hour, minute, "PM")}
            className={`px-2.5 py-1.5 text-xs font-bold transition-colors cursor-pointer border-l border-slate-200 dark:border-slate-700 ${
              period === "PM"
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
            }`}
          >
            PM
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OperatingHoursTab({ showMsg }) {
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [initialHours, setInitialHours] = useState(null);
  const [showDiscardModal, setShowDiscardModal] = useState(false);

  const [operatingHours, setOperatingHours] = useState({
    venue_open: "07:30",
    venue_close: "17:00",
    equipment_open: "07:30",
    equipment_close: "17:00",
    arrival_grace_mins: 15,
    auto_cancel_mins: 30,
    requirement_grace_hours: 24,
  });

  const fetchHours = async () => {
    setLoading(true);
    try {
      const res = await api.get("/general/operating-hours");
      if (res.data) {
        const loaded = {
          venue_open: res.data.venue_open?.substring(0, 5) || "07:30",
          venue_close: res.data.venue_close?.substring(0, 5) || "17:00",
          equipment_open: res.data.equipment_open?.substring(0, 5) || "07:30",
          equipment_close: res.data.equipment_close?.substring(0, 5) || "17:00",
          arrival_grace_mins: Number(res.data.arrival_grace_mins ?? 15),
          auto_cancel_mins: Number(res.data.auto_cancel_mins ?? 30),
          requirement_grace_hours: Number(res.data.requirement_grace_hours ?? 24),
        };
        setOperatingHours(loaded);
        setInitialHours(loaded);
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

  const dirtyFields = useMemo(() => {
    if (!initialHours) return {};
    const dirty = {};
    for (const key of Object.keys(initialHours)) {
      if (String(operatingHours[key]) !== String(initialHours[key])) {
        dirty[key] = true;
      }
    }
    return dirty;
  }, [initialHours, operatingHours]);

  const isDirty = useMemo(() => {
    return Object.keys(dirtyFields).length > 0;
  }, [dirtyFields]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const handleSaveHours = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      const res = await api.put("/general/operating-hours", operatingHours);
      if (res.data) {
        const saved = {
          venue_open: res.data.venue_open?.substring(0, 5) || operatingHours.venue_open,
          venue_close: res.data.venue_close?.substring(0, 5) || operatingHours.venue_close,
          equipment_open: res.data.equipment_open?.substring(0, 5) || operatingHours.equipment_open,
          equipment_close: res.data.equipment_close?.substring(0, 5) || operatingHours.equipment_close,
          arrival_grace_mins: Number(res.data.arrival_grace_mins ?? operatingHours.arrival_grace_mins),
          auto_cancel_mins: Number(res.data.auto_cancel_mins ?? operatingHours.auto_cancel_mins),
          requirement_grace_hours: Number(res.data.requirement_grace_hours ?? operatingHours.requirement_grace_hours),
        };
        setOperatingHours(saved);
        setInitialHours(saved);
      } else {
        setInitialHours({ ...operatingHours });
      }
      clearApiCache();
      invalidateCache("operating_hours_settings");
      window.dispatchEvent(new Event("operating_hours_updated"));
      try { localStorage.setItem("fsuu_operating_hours_ping", Date.now().toString()); } catch {}
      showMsg("Saved");
    } catch {
      showMsg("Failed");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDiscard = () => {
    if (initialHours) {
      setOperatingHours({ ...initialHours });
    }
    setShowDiscardModal(false);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 p-8 rounded-lg border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
        Loading...
      </div>
    );
  }

  return (
    <form onSubmit={handleSaveHours} className="space-y-4">
      {/* Hours Section */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
            Hours
          </h3>
          {(dirtyFields.venue_open ||
            dirtyFields.venue_close ||
            dirtyFields.equipment_open ||
            dirtyFields.equipment_close) && (
            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
              Unsaved
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Venue */}
          <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700/60">
            <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
              Venues
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <PhilippineTimeSelect
                label="Open"
                value={operatingHours.venue_open}
                onChange={(val) =>
                  setOperatingHours({ ...operatingHours, venue_open: val })
                }
              />
              <PhilippineTimeSelect
                label="Close"
                value={operatingHours.venue_close}
                onChange={(val) =>
                  setOperatingHours({ ...operatingHours, venue_close: val })
                }
              />
            </div>
          </div>

          {/* Equipment */}
          <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700/60">
            <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
              Equipment
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <PhilippineTimeSelect
                label="Open"
                value={operatingHours.equipment_open}
                onChange={(val) =>
                  setOperatingHours({ ...operatingHours, equipment_open: val })
                }
              />
              <PhilippineTimeSelect
                label="Close"
                value={operatingHours.equipment_close}
                onChange={(val) =>
                  setOperatingHours({ ...operatingHours, equipment_close: val })
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* Rules Section */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
            Rules
          </h3>
          {(dirtyFields.arrival_grace_mins ||
            dirtyFields.auto_cancel_mins ||
            dirtyFields.requirement_grace_hours) && (
            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
              Unsaved
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700/60 space-y-1.5">
            <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300">
              Grace
            </label>
            <input
              type="number"
              min={0}
              max={120}
              value={operatingHours.arrival_grace_mins}
              onChange={(e) =>
                setOperatingHours({
                  ...operatingHours,
                  arrival_grace_mins: parseInt(e.target.value, 10) || 0,
                })
              }
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white"
            />
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700/60 space-y-1.5">
            <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300">
              Cancel
            </label>
            <input
              type="number"
              min={0}
              max={120}
              value={operatingHours.auto_cancel_mins}
              onChange={(e) =>
                setOperatingHours({
                  ...operatingHours,
                  auto_cancel_mins: parseInt(e.target.value, 10) || 0,
                })
              }
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Requirements Grace Period */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700/60 space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300">
              Requirements
            </label>
            <span className="text-[11px] font-medium text-slate-500">
              {operatingHours.requirement_grace_hours || 24}h
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() =>
                setOperatingHours({ ...operatingHours, requirement_grace_hours: 24 })
              }
              className={`px-3 py-2 rounded-lg border text-center text-xs font-semibold cursor-pointer transition-colors ${
                (operatingHours.requirement_grace_hours || 24) === 24
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-400"
              }`}
            >
              24h
            </button>

            <button
              type="button"
              onClick={() =>
                setOperatingHours({ ...operatingHours, requirement_grace_hours: 48 })
              }
              className={`px-3 py-2 rounded-lg border text-center text-xs font-semibold cursor-pointer transition-colors ${
                operatingHours.requirement_grace_hours === 48
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-400"
              }`}
            >
              48h
            </button>
          </div>
        </div>
      </div>

      {/* Dirty Changes Action Bar */}
      {isDirty && (
        <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700/60 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
              Unsaved
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowDiscardModal(true)}
              disabled={saveLoading}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold hover:bg-white dark:hover:bg-slate-800 cursor-pointer transition-colors disabled:opacity-50"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={saveLoading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50"
            >
              {saveLoading ? "Saving" : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* Discard Confirmation Modal */}
      {showDiscardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm w-full max-w-sm p-5 space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Discard
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Discard unsaved changes?
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowDiscardModal(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                Keep
              </button>
              <button
                type="button"
                onClick={handleDiscard}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
