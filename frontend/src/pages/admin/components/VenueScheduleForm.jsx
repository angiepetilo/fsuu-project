import React from "react";
import { Loader2, Calendar } from "lucide-react";

export default function VenueScheduleForm({
  VENUES = [],
  selectedVenue,
  setSelectedVenue,
  setupForm,
  setSetupForm,
  handleSaveStatus,
  saveLoading = false,
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
      <div>
        <h3 className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight flex items-center gap-2">
          <Calendar size={18} className="text-blue-600" />
          Venue Selection &amp; Availability Control
        </h3>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Select venue and assign operating status by date and time
        </p>
      </div>

      <form onSubmit={handleSaveStatus} className="space-y-4 text-xs">
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

        {/* Target Date */}
        <div>
          <label className="block text-xs font-bold text-slate-900 mb-1">Target Date *</label>
          <input
            type="date"
            required
            value={setupForm.startDate}
            onChange={e => setSetupForm({ ...setupForm, startDate: e.target.value })}
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600 text-xs"
          />
        </div>

        {/* Time Slot Range */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">Start Time *</label>
            <input
              type="time"
              required
              value={setupForm.startTime}
              onChange={e => setSetupForm({ ...setupForm, startTime: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">End Time *</label>
            <input
              type="time"
              required
              value={setupForm.endTime}
              onChange={e => setSetupForm({ ...setupForm, endTime: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600 text-xs"
            />
          </div>
        </div>

        {/* Operating Status Control Buttons */}
        <div>
          <label className="block text-xs font-bold text-slate-900 mb-1">Operating Status *</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "Available",   label: "Available",   activeClass: "bg-emerald-100 border-emerald-500 text-emerald-900 font-extrabold" },
              { id: "Maintenance", label: "Maintenance", activeClass: "bg-slate-300 border-slate-500 text-slate-900 font-extrabold" },
              { id: "Closed",      label: "Closed",      activeClass: "bg-orange-100 border-orange-400 text-orange-900 font-extrabold" },
            ].map(st => {
              const isSelected = setupForm.status === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setSetupForm({ ...setupForm, status: st.id })}
                  className={`py-2 px-2 rounded-xl border text-center text-xs transition-all cursor-pointer flex items-center justify-center shadow-2xs ${
                    isSelected
                      ? st.activeClass
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 font-bold"
                  }`}
                >
                  <span>{st.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Status Reason / Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-900 mb-1">Status Reason / Notes</label>
          <textarea
            rows={3}
            placeholder="e.g. Scheduled holiday closure, regular maintenance, AV calibration..."
            value={setupForm.reason}
            onChange={e => setSetupForm({ ...setupForm, reason: e.target.value })}
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-blue-600 text-xs"
          />
        </div>

        {/* Update Venue Status Button */}
        <div className="pt-2">
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
