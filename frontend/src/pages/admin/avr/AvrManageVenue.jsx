import { useState, useEffect, useCallback } from "react";
import api from "@/lib/axios";
import { useDataCache } from "@/hooks/useDataCache";
import { AppCard } from "@/components/ui/app-card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  ChevronLeft, ChevronRight, Loader2, AlertCircle, X, Settings2,
  ImagePlus, Calendar as CalendarIcon, Clock, User, Building2, FileText, Plus
} from "lucide-react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const STATUS_COLORS = {
  approved:  "bg-blue-100 text-blue-700 border-blue-200 font-bold",
  pending:   "bg-amber-100 text-amber-700 border-amber-200 font-bold",
  completed: "bg-slate-100 text-slate-600 border-slate-200 font-medium",
};

export default function AvrManageVenue() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(today.getDate());

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

  // Calendar Day Calculation
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

  const selectedDayEvents = getEventsForDay(selectedDay);
  const formattedSelectedDate = new Date(year, month, selectedDay).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });

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
      setVenuePhoto(null);
      setVenuePreview(null);
      fetchEvents();
    } catch (e) {
      alert(e.response?.data?.message ?? "Failed to save venue.");
    } finally {
      setSaving(false);
    }
  };

  const deleteVenue = async (id) => {
    if (!confirm("Are you sure you want to delete this venue?")) return;
    setDeleteLoading(id);
    try {
      await api.delete(`/avr/venues/${id}`);
      fetchEvents();
    } catch (e) {
      alert(e.response?.data?.message ?? "Failed to delete venue.");
    } finally {
      setDeleteLoading(null);
    }
  };

  const saveClosure = async () => {
    if (!newClosure.venue_id || !newClosure.start_time || !newClosure.end_time) return;
    setSaving(true);
    try {
      await api.post("/avr/venue-closures", newClosure);
      setShowClosureModal(false);
      setNewClosure({ venue_id: "", type: "maintenance", start_time: "", end_time: "", reason: "" });
      fetchEvents();
    } catch (e) {
      alert(e.response?.data?.message ?? "Failed to set closure status.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Venue Calendar &amp; Schedule</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowClosureModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Settings2 size={15} />
            <span>Set Closure Status</span>
          </button>
          <button
            onClick={() => { setNewVenue({ id: null, name: "", location: "", capacity: "" }); setVenuePhoto(null); setVenuePreview(null); setShowVenueModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-md shadow-blue-600/20"
          >
            <Plus size={15} />
            <span>Add Venue</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 text-red-700 text-sm font-semibold">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Grid: Left Column Proportioned Calendar + Right Column Booking Side Memos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* 1. Left Column: Proportioned Monthly Calendar (7 cols) */}
        <AppCard className="lg:col-span-7 xl:col-span-8 p-0 overflow-hidden shadow-sm">
          {/* Calendar Header Navigation */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-600 transition-all">
              <ChevronLeft size={16} />
            </button>
            <div className="text-center">
              <p className="font-extrabold text-sm text-slate-900 tracking-tight">{MONTHS[month]} {year}</p>
              {loading && <p className="text-[10px] text-blue-600 font-semibold">Updating schedules…</p>}
            </div>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-600 transition-all">
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-slate-100 bg-white">
            {DAYS.map(d => (
              <div key={d} className="py-2 text-center text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{d}</div>
            ))}
          </div>

          {/* Calendar Day Grid (Proportioned cells) */}
          <div className="grid grid-cols-7 bg-white">
            {cells.map((day, i) => {
              const dayEvents = getEventsForDay(day);
              const isSelected = day === selectedDay;
              return (
                <div
                  key={i}
                  onClick={() => day && setSelectedDay(day)}
                  className={`min-h-[64px] sm:min-h-[72px] p-1.5 border-b border-r border-slate-100 cursor-pointer transition-colors ${
                    !day ? "bg-slate-50/40 cursor-default" : isSelected ? "bg-blue-50/50 ring-2 ring-blue-600/30 inset-0" : "hover:bg-slate-50/60"
                  }`}
                >
                  {day && (
                    <>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-extrabold w-5 h-5 flex items-center justify-center rounded-full ${
                          isToday(day) ? "bg-blue-600 text-white shadow-sm" : isSelected ? "bg-blue-100 text-blue-700" : "text-slate-700"
                        }`}>
                          {day}
                        </span>
                        {dayEvents.length > 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                        )}
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 2).map((ev, j) => (
                          <div
                            key={j}
                            className={`text-[9px] font-extrabold truncate px-1 py-0.5 rounded border ${STATUS_COLORS[ev.status] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}
                          >
                            {ev.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-[9px] text-blue-600 font-extrabold px-0.5">+{dayEvents.length - 2} more</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Calendar Legend */}
          <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-100 flex items-center gap-5 text-xs font-semibold text-slate-500">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-blue-500" /><span>Approved</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-amber-500" /><span>Pending</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-slate-400" /><span>Completed</span></div>
          </div>
        </AppCard>

        {/* 2. Right Column: Venue Booking Memos & Schedule Details Side Panel (5 cols) */}
        <AppCard className="lg:col-span-5 xl:col-span-4 p-0 overflow-hidden shadow-sm flex flex-col">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon size={16} className="text-blue-600" />
              <h3 className="font-extrabold text-xs text-slate-900 tracking-tight">Booking Memos</h3>
            </div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{MONTHS[month]} {selectedDay}</span>
          </div>

          <div className="p-4 flex-1 overflow-y-auto max-h-[500px]">
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-3">
              {formattedSelectedDate}
            </p>

            {selectedDayEvents.length === 0 ? (
              <div className="p-8 text-center bg-slate-50/60 border border-dashed border-slate-200 rounded-2xl space-y-2">
                <Building2 size={24} className="mx-auto text-slate-300" />
                <p className="text-xs font-bold text-slate-600">No Venue Bookings Scheduled</p>
                <p className="text-[11px] text-slate-400 font-medium">There are no reservation memos recorded for this date.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDayEvents.map((ev, idx) => (
                  <div key={idx} className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 space-y-2 hover:bg-slate-100/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-blue-600 font-mono bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                        {ev.title}
                      </span>
                      <StatusBadge status={ev.status} />
                    </div>

                    <div className="space-y-1 pt-1">
                      <p className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                        <User size={13} className="text-slate-400" />
                        <span>{ev.requestor || "Booked Requestor"}</span>
                      </p>
                      <p className="text-xs text-slate-600 flex items-center gap-1.5 font-mono">
                        <Clock size={13} className="text-slate-400" />
                        <span>
                          {new Date(ev.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – {new Date(ev.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </p>
                      {ev.purpose && (
                        <p className="text-xs text-slate-500 flex items-start gap-1.5 pt-1">
                          <FileText size={13} className="text-slate-400 shrink-0 mt-0.5" />
                          <span className="leading-relaxed font-medium">{ev.purpose}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </AppCard>

      </div>

      {/* Registered Venues List */}
      <AppCard className="p-0 overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-blue-600" />
            <h3 className="font-extrabold text-slate-900 text-xs tracking-tight">Registered Campus Venues ({venues.length})</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Venue Name</th>
                <th className="px-4 py-3 text-left">Location</th>
                <th className="px-4 py-3 text-left">Capacity</th>
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {venues.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-slate-400 text-xs">No venues registered.</td></tr>
              ) : (
                paginatedVenues.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-extrabold text-slate-900 text-xs">{v.name}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{v.location || "Main Campus"}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs font-mono font-bold">{v.capacity ? `${v.capacity} Seats` : "—"}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => deleteVenue(v.id)}
                        disabled={deleteLoading === v.id}
                        className="px-2.5 py-1 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all"
                      >
                        {deleteLoading === v.id ? "Deleting…" : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AppCard>

      {/* Add Venue Modal */}
      {showVenueModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm">Add New Campus Venue</h3>
              <button onClick={() => setShowVenueModal(false)} className="text-slate-400 hover:bg-slate-100 p-1.5 rounded-xl"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4 text-xs font-semibold">
              <div>
                <label className="text-slate-700 mb-1 block">Venue Name *</label>
                <input
                  type="text"
                  value={newVenue.name}
                  onChange={e => setNewVenue({ ...newVenue, name: e.target.value })}
                  placeholder="e.g., AVR 1, Hagenburg Hall"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="text-slate-700 mb-1 block">Location</label>
                <input
                  type="text"
                  value={newVenue.location}
                  onChange={e => setNewVenue({ ...newVenue, location: e.target.value })}
                  placeholder="e.g., Main Building, 3rd Floor"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="text-slate-700 mb-1 block">Seating Capacity</label>
                <input
                  type="number"
                  value={newVenue.capacity}
                  onChange={e => setNewVenue({ ...newVenue, capacity: e.target.value })}
                  placeholder="e.g., 150"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 font-mono"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button onClick={() => setShowVenueModal(false)} className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100">Cancel</button>
                <button onClick={saveVenue} disabled={saving} className="px-5 py-2 rounded-xl bg-blue-600 text-white font-extrabold hover:bg-blue-700">
                  {saving ? "Saving…" : "Save Venue"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Closure Status Modal */}
      {showClosureModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm">Set Venue Closure / Maintenance</h3>
              <button onClick={() => setShowClosureModal(false)} className="text-slate-400 hover:bg-slate-100 p-1.5 rounded-xl"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4 text-xs font-semibold">
              <div>
                <label className="text-slate-700 mb-1 block">Select Venue *</label>
                <select
                  value={newClosure.venue_id}
                  onChange={e => setNewClosure({ ...newClosure, venue_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600"
                >
                  <option value="">Select a venue…</option>
                  {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-slate-700 mb-1 block">Start Datetime *</label>
                <input
                  type="datetime-local"
                  value={newClosure.start_time}
                  onChange={e => setNewClosure({ ...newClosure, start_time: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 font-mono"
                />
              </div>
              <div>
                <label className="text-slate-700 mb-1 block">End Datetime *</label>
                <input
                  type="datetime-local"
                  value={newClosure.end_time}
                  onChange={e => setNewClosure({ ...newClosure, end_time: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 font-mono"
                />
              </div>
              <div>
                <label className="text-slate-700 mb-1 block">Closure Reason</label>
                <input
                  type="text"
                  value={newClosure.reason}
                  onChange={e => setNewClosure({ ...newClosure, reason: e.target.value })}
                  placeholder="e.g., AC Repair, Aircon Maintenance"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button onClick={() => setShowClosureModal(false)} className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100">Cancel</button>
                <button onClick={saveClosure} disabled={saving} className="px-5 py-2 rounded-xl bg-amber-600 text-white font-extrabold hover:bg-amber-700">
                  {saving ? "Saving…" : "Save Closure"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
