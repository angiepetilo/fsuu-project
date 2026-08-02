import { Building2, Save, CheckCircle2, Wrench, XCircle } from "lucide-react";

export default function VenueScheduleForm({
  VENUES = [],
  selectedVenue,
  setSelectedVenue,
  setupForm,
  setSetupForm,
  handleSaveStatus,
}) {
  return (
    <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
      <div className="border-b border-slate-100 pb-3">
        <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
          <Building2 size={16} className="text-blue-600" />
          Venue Selection & Availability Control
        </h3>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Select venue and assign operating status by date and time
        </p>
      </div>

      <form onSubmit={handleSaveStatus} className="space-y-4 text-xs">
        {/* Venue Selector Buttons */}
        <div>
          <label className="block text-xs font-bold text-slate-900 mb-1.5">Select Venue *</label>
          <div className="grid grid-cols-2 gap-2">
            {!VENUES || VENUES.length === 0 ? (
              <div className="col-span-2 text-center py-4 text-slate-400 text-xs font-semibold bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-center gap-2">
                <Building2 size={16} className="text-slate-400" />
                <span>No venue slots available. Add venues in Settings ➔ Venue Availability.</span>
              </div>
            ) : (
              VENUES.map(v => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    setSelectedVenue(v);
                    setSetupForm({ ...setupForm, venueId: v.id });
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer text-left ${
                    selectedVenue?.id === v.id
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <p className="font-extrabold truncate">{v.name}</p>
                  <p className={`text-[10px] ${selectedVenue?.id === v.id ? "text-blue-100" : "text-slate-500"}`}>Cap: {v.capacity || 100}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Date Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-900 mb-1">Target Date *</label>
          <input
            type="date"
            required
            value={setupForm.startDate}
            onChange={e => setSetupForm({ ...setupForm, startDate: e.target.value })}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600"
          />
        </div>

        {/* Time Slot Range */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">Start Time *</label>
            <input
              type="time"
              required
              value={setupForm.startTime}
              onChange={e => setSetupForm({ ...setupForm, startTime: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">End Time *</label>
            <input
              type="time"
              required
              value={setupForm.endTime}
              onChange={e => setSetupForm({ ...setupForm, endTime: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
            />
          </div>
        </div>

        {/* Status Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-900 mb-1.5">Assign Operating Status *</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "Available", label: "Available", icon: CheckCircle2, cls: "border-emerald-600 bg-emerald-50 text-emerald-900" },
              { id: "Maintenance", label: "Maintenance", icon: Wrench, cls: "border-purple-600 bg-purple-50 text-purple-900" },
              { id: "Closed", label: "Closed", icon: XCircle, cls: "border-rose-600 bg-rose-50 text-rose-900" },
            ].map(st => {
              const IconComponent = st.icon;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setSetupForm({ ...setupForm, status: st.id })}
                  className={`py-2 px-1 rounded-xl border-2 text-center text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    setupForm.status === st.id ? st.cls : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <IconComponent size={14} />
                  <span>{st.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Notes & Reason */}
        <div>
          <label className="block text-xs font-bold text-slate-900 mb-1">Status Reason / Notes</label>
          <textarea
            rows={2}
            placeholder="e.g. Audio system calibration or scheduled holiday closure..."
            value={setupForm.reason}
            onChange={e => setSetupForm({ ...setupForm, reason: e.target.value })}
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-600"
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2 transition-all"
        >
          <Save size={15} /> Update Venue Availability & Status
        </button>
      </form>
    </div>
  );
}
