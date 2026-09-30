import React from "react";
import { Loader2, Clock } from "lucide-react";
import { formatTime12 as formatTime12h } from "../../../lib/dateUtils";
import CustomTimePicker from "@/components/ui/custom-time-picker";
import IosToggle from "@/components/ui/ios-toggle";

export default function VenueScheduleForm({
  VENUES = [],
  selectedVenue,
  setSelectedVenue,
  setupForm,
  setSetupForm,
  handleSaveStatus,
  saveLoading = false,
  venueOpen = "07:30",
  venueClose = "17:00",
}) {
  const isAllVenues = Boolean(setupForm.applyToAll || setupForm.venueId === "all");

  const [initialFormSnapshot, setInitialFormSnapshot] = React.useState(null);

  React.useEffect(() => {
    setInitialFormSnapshot({
      venueId: setupForm.venueId,
      applyToAll: Boolean(setupForm.applyToAll),
      closeEquipment: Boolean(setupForm.closeEquipment),
      status: setupForm.status,
      reason: setupForm.reason || "",
      isMultiDay: Boolean(setupForm.isMultiDay),
      startDate: setupForm.startDate,
      endDate: setupForm.endDate,
      startTime: setupForm.startTime,
      endTime: setupForm.endTime,
    });
  }, [selectedVenue?.id]);

  const isDirty = React.useMemo(() => {
    if (!initialFormSnapshot) return false;
    return (
      setupForm.status !== initialFormSnapshot.status ||
      (setupForm.reason || "").trim() !== (initialFormSnapshot.reason || "").trim() ||
      Boolean(setupForm.isMultiDay) !== Boolean(initialFormSnapshot.isMultiDay) ||
      Boolean(setupForm.applyToAll) !== Boolean(initialFormSnapshot.applyToAll) ||
      Boolean(setupForm.closeEquipment) !== Boolean(initialFormSnapshot.closeEquipment) ||
      setupForm.startDate !== initialFormSnapshot.startDate ||
      setupForm.endDate !== initialFormSnapshot.endDate ||
      setupForm.startTime !== initialFormSnapshot.startTime ||
      setupForm.endTime !== initialFormSnapshot.endTime ||
      String(setupForm.venueId) !== String(initialFormSnapshot.venueId)
    );
  }, [setupForm, initialFormSnapshot]);

  const onSubmit = async (e) => {
    await handleSaveStatus(e);
    setInitialFormSnapshot({
      venueId: setupForm.venueId,
      applyToAll: Boolean(setupForm.applyToAll),
      closeEquipment: Boolean(setupForm.closeEquipment),
      status: setupForm.status,
      reason: setupForm.reason || "",
      isMultiDay: Boolean(setupForm.isMultiDay),
      startDate: setupForm.startDate,
      endDate: setupForm.endDate,
      startTime: setupForm.startTime,
      endTime: setupForm.endTime,
    });
  };

  const handleStartTimeChange = (val) => {
    let bounded = val;
    if (venueOpen && bounded < venueOpen) bounded = venueOpen;
    if (venueClose && bounded > venueClose) bounded = venueClose;
    setSetupForm((prev) => ({ ...prev, startTime: bounded }));
  };

  const handleEndTimeChange = (val) => {
    let bounded = val;
    if (venueClose && bounded > venueClose) bounded = venueClose;
    if (venueOpen && bounded < venueOpen) bounded = venueOpen;
    setSetupForm((prev) => ({ ...prev, endTime: bounded }));
  };

  const setScope = (applyAll) => {
    if (applyAll) {
      setSetupForm((prev) => ({
        ...prev,
        venueId: "all",
        applyToAll: true,
      }));
    } else {
      const targetVenue = selectedVenue || VENUES[0];
      if (targetVenue) {
        setSelectedVenue(targetVenue);
      }
      setSetupForm((prev) => ({
        ...prev,
        venueId: targetVenue?.id || "",
        applyToAll: false,
      }));
    }
  };

  return (
    <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-800 p-6 h-full flex flex-col justify-between space-y-4">
      <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
        <h3 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
          Venue Selection &amp; Availability Control
        </h3>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 text-xs flex-1 flex flex-col justify-between">
        <div className="space-y-4">
          {/* Venue Scope & Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 dark:text-slate-200">
                Target Venues *
              </label>
              {/* Scope Segmented Control */}
              <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-0.5 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setScope(false)}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    !isAllVenues
                      ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-extrabold shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Specific
                </button>
                <button
                  type="button"
                  onClick={() => setScope(true)}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    isAllVenues
                      ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-extrabold shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  All Venues
                </button>
              </div>
            </div>

            {isAllVenues ? (
              <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-blue-900 dark:text-blue-200 font-bold flex items-center justify-between">
                <span>Applies to All Venues ({VENUES.length} total)</span>
                <span className="text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white px-2 py-0.5 rounded">
                  All
                </span>
              </div>
            ) : (
              <select
                value={selectedVenue?.id || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "all") {
                    setScope(true);
                    return;
                  }
                  const found = VENUES.find(v => String(v.id) === String(val));
                  if (found) {
                    setSelectedVenue(found);
                    setSetupForm(prev => ({ ...prev, venueId: found.id, applyToAll: false }));
                  }
                }}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 cursor-pointer text-xs"
              >
                {(!VENUES || VENUES.length === 0) ? (
                  <option value="">No venues created yet</option>
                ) : (
                  <>
                    <option value="all">All Venues ({VENUES.length})</option>
                    {VENUES.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </>
                )}
              </select>
            )}
          </div>

          {/* Controls: Multi-Day Block & Equipment Closure */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Multi-Day Reservation Toggle */}
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors select-none">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  Multi-Day
                  {Boolean(setupForm.isMultiDay) && (
                    <span className="bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded uppercase">
                      Active
                    </span>
                  )}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Date range</span>
              </div>
              <IosToggle
                checked={Boolean(setupForm.isMultiDay)}
                onChange={(enabled) => {
                  setSetupForm((prev) => ({
                    ...prev,
                    isMultiDay: enabled,
                    endDate: enabled ? (prev.endDate || prev.startDate) : "",
                  }));
                }}
                size="md"
                title={setupForm.isMultiDay ? "Disable multi-day block" : "Enable multi-day block"}
              />
            </div>

            {/* Close Equipment Borrowing Toggle */}
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors select-none">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  Equipment
                  {Boolean(setupForm.closeEquipment) && (
                    <span className="bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded uppercase">
                      Closed
                    </span>
                  )}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Close borrowing</span>
              </div>
              <IosToggle
                checked={Boolean(setupForm.closeEquipment)}
                onChange={(enabled) => {
                  setSetupForm((prev) => ({
                    ...prev,
                    closeEquipment: enabled,
                  }));
                }}
                size="md"
                title={setupForm.closeEquipment ? "Re-open equipment borrowing" : "Close equipment borrowing"}
              />
            </div>
          </div>

          {/* Target Date(s) */}
          {setupForm.isMultiDay ? (
            <div className="space-y-1.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={setupForm.startDate}
                    onChange={e => {
                      const newStart = e.target.value;
                      setSetupForm(prev => ({
                        ...prev,
                        startDate: newStart,
                        endDate: (prev.endDate && prev.endDate < newStart) ? newStart : prev.endDate,
                      }));
                    }}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 text-xs cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    min={setupForm.startDate}
                    value={setupForm.endDate || setupForm.startDate}
                    onChange={e => setSetupForm(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 text-xs cursor-pointer"
                  />
                </div>
              </div>
              <div className="text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50/70 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 px-2.5 py-1 rounded-lg flex items-center justify-between">
                <span>Multi-day range</span>
                <span>
                  {setupForm.startDate && setupForm.endDate && setupForm.endDate >= setupForm.startDate
                    ? `${Math.max(1, Math.round((new Date(setupForm.endDate) - new Date(setupForm.startDate)) / (1000 * 60 * 60 * 24)) + 1)} Day(s)`
                    : "1 Day"}
                </span>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1">Target Date *</label>
              <input
                type="date"
                required
                value={setupForm.startDate}
                onChange={e => setSetupForm({ ...setupForm, startDate: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 text-xs cursor-pointer"
              />
            </div>
          )}

          {/* Time Slot Range */}
          <div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1">Start *</label>
                <CustomTimePicker
                  value={setupForm.startTime || venueOpen}
                  onChange={val => handleStartTimeChange(val)}
                  minuteStep={5}
                  triggerClassName="w-full p-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-md font-semibold text-slate-900 dark:text-white text-xs transition-colors cursor-pointer text-left"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1">End *</label>
                <CustomTimePicker
                  value={setupForm.endTime || venueClose}
                  onChange={val => handleEndTimeChange(val)}
                  minuteStep={5}
                  triggerClassName="w-full p-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-md font-semibold text-slate-900 dark:text-white text-xs transition-colors cursor-pointer text-left"
                />
              </div>
            </div>

            <div className="text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-md mt-2">
              <span>
                Operating: <strong className="text-slate-900 dark:text-white">{formatTime12h(venueOpen)} – {formatTime12h(venueClose)}</strong>
              </span>
            </div>
          </div>

          {/* Operating Status Control Buttons */}
          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1.5">Operating Status *</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { 
                  id: "Available",   
                  label: "Available",   
                  activeClass: "bg-emerald-600 border-emerald-600 text-white font-black",
                  inactiveClass: "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-800 dark:hover:text-emerald-300 font-bold",
                },
                { 
                  id: "Maintenance", 
                  label: "Maintenance", 
                  activeClass: "bg-amber-500 border-amber-500 text-white font-black",
                  inactiveClass: "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-800 dark:hover:text-amber-300 font-bold",
                },
                { 
                  id: "Closed",      
                  label: "Closed",      
                  activeClass: "bg-rose-600 border-rose-600 text-white font-black",
                  inactiveClass: "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-800 dark:hover:text-rose-300 font-bold",
                },
              ].map(st => {
                const isSelected = setupForm.status === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setSetupForm({ ...setupForm, status: st.id })}
                    className={`py-2 px-2 rounded-xl border text-center text-xs transition-all cursor-pointer flex items-center justify-center ${
                      isSelected ? st.activeClass : st.inactiveClass
                    }`}
                  >
                    <span>{st.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1">Remarks</label>
            <textarea
              rows={3}
              placeholder="e.g. Scheduled holiday closure, campus maintenance..."
              value={setupForm.reason}
              onChange={e => setSetupForm({ ...setupForm, reason: e.target.value })}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 text-xs"
            />
          </div>
        </div>

        {/* Update Venue Status Button - only appears when isDirty */}
        {isDirty && (
          <div className="pt-3 mt-auto animate-in fade-in slide-in-from-bottom-2 duration-150">
            <button
              type="submit"
              disabled={saveLoading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-2"
            >
              {saveLoading && <Loader2 size={14} className="animate-spin" />}
              <span>{isAllVenues ? "Update All Venues" : "Update Venue"}</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
