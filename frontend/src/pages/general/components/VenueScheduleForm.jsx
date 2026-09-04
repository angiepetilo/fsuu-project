import React from "react";
import { Loader2, Calendar, Clock } from "lucide-react";
import { formatTime12 as formatTime12h } from "../../../lib/dateUtils";

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

  return (
    <div className="bg-white rounded-[28px] border border-slate-200/90 shadow-sm p-6 h-full flex flex-col justify-between space-y-4">
      <div className="border-b border-slate-100 pb-3">
        <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
          Venue Selection &amp; Availability Control
        </h3>
      </div>

      <form onSubmit={handleSaveStatus} className="space-y-4 text-xs flex-1 flex flex-col justify-between">
        <div className="space-y-4">
          {/* Venue Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">Select Venue *</label>
            <select
              value={selectedVenue?.id || ""}
              onChange={(e) => {
                const found = VENUES.find(v => String(v.id) === String(e.target.value));
                if (found) {
                  setSelectedVenue(found);
                  setSetupForm({ ...setupForm, venueId: found.id });
                }
              }}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600 cursor-pointer text-xs"
            >
              {(!VENUES || VENUES.length === 0) ? (
                <option value="">No venues created yet</option>
              ) : (
                VENUES.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Multi-Day Reservation Toggle */}
          <label className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-2xl cursor-pointer transition-colors select-none">
            <div className="flex flex-col">
              <span className="text-xs font-black text-slate-900 flex items-center gap-2">
                Multi-Day Block
                {Boolean(setupForm.isMultiDay) && (
                  <span className="bg-blue-600 text-white text-[9.5px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                    Active
                  </span>
                )}
              </span>
              <span className="text-[11px] text-slate-600 font-semibold">Apply status across consecutive days</span>
            </div>
            <div className="relative inline-flex items-center">
              <input
                type="checkbox"
                checked={Boolean(setupForm.isMultiDay)}
                onChange={(e) => {
                  const enabled = e.target.checked;
                  setSetupForm(prev => ({
                    ...prev,
                    isMultiDay: enabled,
                    endDate: enabled ? (prev.endDate || prev.startDate) : "",
                  }));
                }}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </div>
          </label>

          {/* Target Date(s) */}
          {setupForm.isMultiDay ? (
            <div className="space-y-1.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-black text-slate-900 mb-1">Start Date *</label>
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
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600 text-xs cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-900 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    min={setupForm.startDate}
                    value={setupForm.endDate || setupForm.startDate}
                    onChange={e => setSetupForm(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600 text-xs cursor-pointer"
                  />
                </div>
              </div>
              <div className="text-[11px] font-bold text-blue-700 bg-blue-50/70 border border-blue-200/60 px-2.5 py-1 rounded-lg flex items-center justify-between">
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
              <label className="block text-xs font-black text-slate-900 mb-1">Target Date *</label>
              <input
                type="date"
                required
                value={setupForm.startDate}
                onChange={e => setSetupForm({ ...setupForm, startDate: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600 text-xs cursor-pointer"
              />
            </div>
          )}

          {/* Time Slot Range (Strictly bounded by Venue Operating Hours) */}
          <div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-black text-slate-900 mb-1">Start Time *</label>
                <input
                  type="time"
                  required
                  min={venueOpen}
                  max={venueClose}
                  value={setupForm.startTime}
                  onChange={e => handleStartTimeChange(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-900 mb-1">End Time *</label>
                <input
                  type="time"
                  required
                  min={venueOpen}
                  max={venueClose}
                  value={setupForm.endTime}
                  onChange={e => handleEndTimeChange(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl mt-2">
              <Clock size={13} className="text-blue-600 shrink-0" />
              <span>
                Venue Reservation Operating Window: <strong className="text-slate-900">{formatTime12h(venueOpen)} – {formatTime12h(venueClose)}</strong>
              </span>
            </div>
          </div>

          {/* Operating Status Control Buttons */}
          <div>
            <label className="block text-xs font-black text-slate-900 mb-1.5">Operating Status *</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { 
                  id: "Available",   
                  label: "Available",   
                  activeClass: "bg-emerald-600 border-emerald-600 text-white font-black shadow-sm",
                  inactiveClass: "border-slate-200 bg-slate-50 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 font-bold",
                },
                { 
                  id: "Maintenance", 
                  label: "Maintenance", 
                  activeClass: "bg-amber-500 border-amber-500 text-white font-black shadow-sm",
                  inactiveClass: "border-slate-200 bg-slate-50 text-slate-700 hover:bg-amber-50 hover:text-amber-800 font-bold",
                },
                { 
                  id: "Closed",      
                  label: "Closed",      
                  activeClass: "bg-rose-600 border-rose-600 text-white font-black shadow-sm",
                  inactiveClass: "border-slate-200 bg-slate-50 text-slate-700 hover:bg-rose-50 hover:text-rose-800 font-bold",
                },
              ].map(st => {
                const isSelected = setupForm.status === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setSetupForm({ ...setupForm, status: st.id })}
                    className={`py-2.5 px-2 rounded-xl border text-center text-xs transition-all cursor-pointer flex items-center justify-center shadow-2xs ${
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
            <label className="block text-xs font-black text-slate-900 mb-1">Remarks</label>
            <textarea
              rows={3}
              placeholder="e.g. Scheduled holiday closure, regular maintenance, AV calibration..."
              value={setupForm.reason}
              onChange={e => setSetupForm({ ...setupForm, reason: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-blue-600 text-xs"
            />
          </div>
        </div>

        {/* Update Venue Status Button */}
        <div className="pt-3 mt-auto">
          <button
            type="submit"
            disabled={saveLoading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-colors flex items-center justify-center gap-2"
          >
            {saveLoading && <Loader2 size={14} className="animate-spin" />}
            <span>Update Venue Status</span>
          </button>
        </div>
      </form>
    </div>
  );
}
