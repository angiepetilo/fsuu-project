import React, { useState } from "react";
import { Save, CheckCircle2, Wrench, XCircle, Users, Tag, ZoomIn } from "lucide-react";

export default function VenueScheduleForm({
  VENUES = [],
  selectedVenue,
  setSelectedVenue,
  setupForm,
  setSetupForm,
  handleSaveStatus,
}) {
  const [objectFit, setObjectFit] = useState("cover");

  const venueImage = selectedVenue?.image || selectedVenue?.avatar || selectedVenue?.cover_photo || "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80";
  const externalPrice = selectedVenue?.price || selectedVenue?.external_rate || selectedVenue?.hourly_rate || "₱1,500 / hr";

  return (
    <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
      <div className="border-b border-slate-100 pb-3">
        <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">
          Venue Selection &amp; Availability Control
        </h3>
        <p className="text-xs text-slate-500 font-semibold mt-0.5">
          Select venue and assign operating status by date and time
        </p>
      </div>

      {/* Side-by-Side Design */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
        {/* Left Side (7 Cols): Inputs */}
        <form onSubmit={handleSaveStatus} className="md:col-span-7 space-y-3.5 text-xs">
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
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-slate-900 cursor-pointer shadow-2xs"
            >
              {(!VENUES || VENUES.length === 0) ? (
                <option value="">No venues created yet</option>
              ) : (
                VENUES.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name} (Cap: {v.capacity || 100})
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
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-900"
            />
          </div>

          {/* Time Slot Range */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-800 mb-1">Start Time *</label>
              <input
                type="time"
                required
                value={setupForm.startTime}
                onChange={e => setSetupForm({ ...setupForm, startTime: e.target.value })}
                className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-800 mb-1">End Time *</label>
              <input
                type="time"
                required
                value={setupForm.endTime}
                onChange={e => setSetupForm({ ...setupForm, endTime: e.target.value })}
                className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>
          </div>

          {/* Operating Status Control Buttons — solid color when selected, neutral outline when not */}
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">Assign Operating Status *</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: "Available",   label: "Available",   selectedClass: "bg-emerald-600 border-emerald-600 text-white font-extrabold shadow-sm" },
                { id: "Maintenance", label: "Maintenance", selectedClass: "bg-slate-700 border-slate-700 text-white font-extrabold shadow-sm" },
                { id: "Closed",      label: "Closed",      selectedClass: "bg-rose-600 border-rose-600 text-white font-extrabold shadow-sm" },
              ].map(st => {
                const isSelected = setupForm.status === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setSetupForm({ ...setupForm, status: st.id })}
                    className={`py-2 px-1 rounded-xl border text-center text-[11px] font-mono transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs ${
                      isSelected
                        ? st.selectedClass
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-semibold"
                    }`}
                  >
                    <span>{st.label}</span>
                  </button>
                );
              })}
            </div>

          </div>

          {/* Status Reason */}
          <div>
            <label className="block text-[11px] font-bold text-slate-800 mb-1">Status Reason / Notes</label>
            <textarea
              rows={2}
              placeholder="e.g. Scheduled holiday closure..."
              value={setupForm.reason}
              onChange={e => setSetupForm({ ...setupForm, reason: e.target.value })}
              className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:border-slate-900"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-white border border-slate-900 text-slate-900 hover:bg-slate-50 font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-2 transition-colors"
          >
            <Save size={14} /> Update Venue Status
          </button>
        </form>

        {/* Right Side (5 Cols): Venue Photo & Info */}
        <div className="md:col-span-5 bg-white rounded-xl border border-slate-200 p-3 space-y-3 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-700">Venue Preview</span>
              <button
                type="button"
                onClick={() => setObjectFit(prev => prev === "cover" ? "contain" : "cover")}
                className="text-[10px] font-mono font-bold text-slate-700 hover:underline flex items-center gap-1 cursor-pointer"
                title="Toggle image crop / full fit"
              >
                <ZoomIn size={12} /> {objectFit === "cover" ? "Full Crop" : "Fit"}
              </button>
            </div>

            {/* Cover Photo */}
            <div className="relative w-full h-36 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-2xs group">
              <img
                src={venueImage}
                alt={selectedVenue?.name || "Venue Cover"}
                className={`w-full h-full ${objectFit === "cover" ? "object-cover" : "object-contain"}`}
              />
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-900 font-mono font-bold text-[10px] shadow-2xs">
                {selectedVenue?.status || "Operating"}
              </div>
            </div>
          </div>

          {/* Venue Info below photo */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <h4 className="text-xs font-black text-slate-900 truncate">
              {selectedVenue?.name || "AVR Facility"}
            </h4>
            <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-600">
              <span className="flex items-center gap-1 text-slate-500">
                <Users size={12} /> Capacity:
              </span>
              <span className="text-slate-900">{selectedVenue?.capacity || 100} Persons</span>
            </div>

            {/* Price Info */}
            <div className="flex items-center justify-between text-[11px] font-mono font-bold border-t border-slate-100 pt-1.5">
              <span className="flex items-center gap-1 text-slate-500">
                <Tag size={12} /> Rate:
              </span>
              <span className="text-slate-900">{externalPrice}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
