import { useState, useEffect, useCallback } from "react";
import api from "@/lib/axios";
import { useDataCache } from "@/hooks/useDataCache";
import { ChevronLeft, ChevronRight, Loader2, AlertCircle, X, Settings2, ImagePlus } from "lucide-react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const STATUS_COLORS = {
  approved:  "bg-blue-100 text-blue-700 border-blue-200",
  pending:   "bg-amber-100 text-amber-700 border-amber-200",
  completed: "bg-slate-100 text-slate-600 border-slate-200",
};

function CalendarEvent({ event }) {
  const [tooltip, setTooltip] = useState(false);
  return (
    <div className="relative" onMouseEnter={() => setTooltip(true)} onMouseLeave={() => setTooltip(false)}>
      <div className={`text-[10px] font-semibold truncate px-1.5 py-0.5 rounded cursor-default border ${STATUS_COLORS[event.status] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
        {event.title}
      </div>
      {tooltip && (
        <div className="absolute z-50 bg-slate-900 text-white text-xs rounded-lg px-2.5 py-2 left-0 top-full mt-1 min-w-[180px] shadow-xl pointer-events-none">
          <p className="font-bold">{event.title}</p>
          <p className="text-white/70">{event.requestor}</p>
          <p className="text-white/60 text-[10px]">{new Date(event.start).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})} – {new Date(event.end).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</p>
        </div>
      )}
    </div>
  );
}

export default function AvrManageVenue() {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [error, setError] = useState(null);
  const [showVenueModal, setShowVenueModal] = useState(false);
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [newVenue, setNewVenue] = useState({ id: null, name: "", location: "", capacity: "" });
  const [venuePhoto, setVenuePhoto] = useState(null);
  const [venuePreview, setVenuePreview] = useState(null);
  const [newClosure, setNewClosure] = useState({ venue_id: "", type: "maintenance", start_time: "", end_time: "", reason: "" });
  const [saving, setSaving] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [tablePage, setTablePage] = useState(1);
  const { data: eventsData, loading: eventsLoading, refresh: refreshEvents } = useDataCache(`avr_calendar_events_${year}_${month + 1}`, `/avr/venues/calendar-events?year=${year}&month=${month + 1}`);
  const { data: venuesData, refresh: refreshVenues } = useDataCache('avr_venues_list', '/avr/venues');

  const events = Array.isArray(eventsData) ? eventsData : [];
  const venues = venuesData?.data ?? (Array.isArray(venuesData) ? venuesData : []);
  const loading = eventsLoading;

  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(venues.length / pageSize));
  const paginatedVenues = venues.slice((tablePage - 1) * pageSize, tablePage * pageSize);

  const fetchEvents = useCallback(() => {
    refreshEvents();
    refreshVenues();
  }, [refreshEvents, refreshVenues]);

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  // Build calendar days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const getEventsForDay = (day) => {
    if (!day) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    return events.filter(e => e.start?.startsWith(dateStr));
  };

  const isToday = (day) => {
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  const saveVenue = async () => {
    if (!newVenue.name.trim()) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", newVenue.name);
      if (newVenue.location) fd.append("location", newVenue.location);
      if (newVenue.capacity) fd.append("capacity", parseInt(newVenue.capacity));
      if (venuePhoto) fd.append("image", venuePhoto);
      
      if (newVenue.id) {
        fd.append("_method", "PUT");
        await api.post(`/avr/venues/${newVenue.id}`, fd);
      } else {
        await api.post("/avr/venues", fd);
      }
      setShowVenueModal(false);
      setNewVenue({ id: null, name: "", location: "", capacity: "" });
      setVenuePhoto(null); setVenuePreview(null);
      fetchVenues();
    } catch (e) { alert(e.response?.data?.message ?? "Failed to save venue."); }
    finally { setSaving(false); }
  };

  const deleteVenue = async (id) => {
    if (!confirm("Delete this venue?")) return;
    setDeleteLoading(id);
    try { await api.delete(`/avr/venues/${id}`); fetchVenues(); }
    catch (e) { alert(e.response?.data?.message ?? "Cannot delete venue."); }
    finally { setDeleteLoading(null); }
  };

  const saveClosure = async () => {
    if (!newClosure.venue_id || !newClosure.start_time || !newClosure.end_time) return;
    setSaving(true);
    try {
      await api.post("/venue-closures", newClosure);
      setShowClosureModal(false);
      setNewClosure({ venue_id: "", type: "maintenance", start_time: "", end_time: "", reason: "" });
      fetchEvents();
    } catch (e) { alert(e.response?.data?.message ?? "Failed to set status."); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Manage Venue</h1>
          <p className="text-sm text-slate-400 mt-0.5">Calendar view of all venue bookings</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowClosureModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-all">
            <Settings2 size={16} /> Set Status
          </button>
          <button onClick={() => { setNewVenue({ id: null, name: "", location: "", capacity: "" }); setVenuePhoto(null); setVenuePreview(null); setShowVenueModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-blue-600/20">
            + Add Venue
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 text-red-700 text-sm font-semibold"><AlertCircle size={18} />{error}</div>}

      {/* Calendar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Nav */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-slate-100 transition-all"><ChevronLeft size={16} /></button>
          <div className="text-center">
            <p className="font-extrabold text-slate-900">{MONTHS[month]} {year}</p>
            {loading && <p className="text-xs text-slate-400">Loading events…</p>}
          </div>
          <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-slate-100 transition-all"><ChevronRight size={16} /></button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-slate-100">
          {DAYS.map(d => (
            <div key={d} className="py-2 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wide">{d}</div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const dayEvents = getEventsForDay(day);
            return (
              <div key={i} className={`min-h-[90px] p-1.5 border-b border-r border-slate-100 ${!day ? "bg-slate-50/50" : "hover:bg-slate-50/40 transition-colors"}`}>
                {day && (
                  <>
                    <div className={`text-xs font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday(day) ? "bg-blue-600 text-white" : "text-slate-600"}`}>
                      {day}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map((ev, j) => <CalendarEvent key={j} event={ev} />)}
                      {dayEvents.length > 3 && (
                        <div className="text-[10px] text-slate-400 font-semibold px-1">+{dayEvents.length - 3} more</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-200 border border-blue-300" />Approved</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-amber-200 border border-amber-300" />Pending</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-slate-200 border border-slate-300" />Completed</div>
      </div>

      {/* Venues List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 size={16} className="text-slate-500" />
            <h2 className="font-bold text-slate-900 text-sm">Registered Venues ({venues.length})</h2>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                {["Name", "Location", "Capacity", "Office", "Status", "Action"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {venues.length === 0
                ? <tr><td colSpan={6} className="text-center py-8 text-slate-400 text-sm">No venues registered.</td></tr>
                : paginatedVenues.map(v => (
                    <tr key={v.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-800 text-xs">{v.name}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{v.location ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{v.capacity ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{v.office?.name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${v.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
                          {v.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 flex gap-1">
                        <button onClick={() => { setNewVenue(v); setVenuePhoto(null); setVenuePreview(v.image_url); setShowVenueModal(true); }}
                          className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-700 transition-all">
                          <Settings2 size={13} />
                        </button>
                        <button onClick={() => deleteVenue(v.id)} disabled={deleteLoading === v.id}
                          className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-700 transition-all">
                          {deleteLoading === v.id ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
                        </button>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Page {tablePage} of {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setTablePage(p => Math.max(1, p - 1))} disabled={tablePage === 1} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40"><ChevronLeft size={14} /></button>
              <button onClick={() => setTablePage(p => Math.min(totalPages, p + 1))} disabled={tablePage === totalPages} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40"><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Add Venue Modal */}
      {showVenueModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-lg">{newVenue.id ? "Edit Venue" : "Add Venue"}</h3>
              <button onClick={() => setShowVenueModal(false)} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  {venuePreview
                    ? <img src={venuePreview} alt="Venue" className="w-24 h-24 rounded-2xl object-cover border-2 border-blue-100 shadow" />
                    : <div className="w-24 h-24 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300 border-2 border-dashed border-slate-200"><ImagePlus size={32} /></div>
                  }
                  <label className="absolute -bottom-1.5 -right-1.5 bg-blue-600 text-white rounded-lg p-2 cursor-pointer shadow hover:bg-blue-700 transition-all">
                    <ImagePlus size={14} />
                    <input type="file" accept="image/*" onChange={e => { const f = e.target.files[0]; if(f){ setVenuePhoto(f); setVenuePreview(URL.createObjectURL(f)); }}} className="hidden" />
                  </label>
                </div>
                <p className="text-[11px] text-slate-400">Venue photo (optional)</p>
              </div>
              {[["name","Venue Name *","text"],["location","Location","text"],["capacity","Capacity","number"]].map(([key,label,type]) => (
                <div key={key}>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">{label}</label>
                  <input type={type} value={newVenue[key] ?? ""} onChange={e => setNewVenue(v => ({...v, [key]: e.target.value}))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowVenueModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all">Cancel</button>
                <button onClick={saveVenue} disabled={saving || !newVenue.name.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving && <Loader2 size={14} className="animate-spin" />} Save Venue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Set Status Modal */}
      {showClosureModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-lg">Set Venue Status</h3>
              <button onClick={() => setShowClosureModal(false)} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Venue *</label>
                <select value={newClosure.venue_id} onChange={e => setNewClosure(c => ({...c, venue_id: e.target.value}))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 bg-white">
                  <option value="">Select Venue...</option>
                  {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Status Type *</label>
                <select value={newClosure.type} onChange={e => setNewClosure(c => ({...c, type: e.target.value}))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 bg-white">
                  <option value="maintenance">Maintenance</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Start Time *</label>
                  <input type="datetime-local" value={newClosure.start_time} onChange={e => setNewClosure(c => ({...c, start_time: e.target.value}))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">End Time *</label>
                  <input type="datetime-local" value={newClosure.end_time} onChange={e => setNewClosure(c => ({...c, end_time: e.target.value}))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Reason (Optional)</label>
                <textarea value={newClosure.reason} onChange={e => setNewClosure(c => ({...c, reason: e.target.value}))} rows={2}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 resize-none" />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowClosureModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all">Cancel</button>
                <button onClick={saveClosure} disabled={saving || !newClosure.venue_id || !newClosure.start_time || !newClosure.end_time}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving && <Loader2 size={14} className="animate-spin" />} Save Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
