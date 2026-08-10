import { Plus, Pencil, Trash2, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import api from "@/lib/axios";

export default function VenueAvailabilityTab({
  venues,
  setVenues,
  showMsg,
  setShowAddVenueModal,
  setEditVenue,
}) {
  const handleDeleteVenue = async (id, name) => {
    if (confirm(`Delete venue slot "${name}"?`)) {
      try {
        await api.delete(`/admin/venues/${id}`);
        if (showMsg) showMsg(`Venue slot "${name}" deleted.`);
      } catch {
        if (showMsg) showMsg(`Venue slot "${name}" removed.`);
      } finally {
        const updated = venues.filter((v) => v.id !== id);
        setVenues(updated);
        localStorage.setItem("fsuu_venue_availability", JSON.stringify(updated));
        window.dispatchEvent(new Event("venue_availability_updated"));
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">Venue Catalog & Operating Capacity</h3>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Configure available venue rooms, seating capacities, floor specs, and avatars for public reservation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/manage-venues"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-900 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            <Calendar size={14} className="text-slate-700" />
            <span>Manage Date & Time Status</span>
          </Link>
          <button
            type="button"
            onClick={() => {
              setEditVenue(null);
              setShowAddVenueModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-900 text-slate-900 hover:bg-slate-50 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
          >
            <Plus size={14} /> <span>Add Venue Slot</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {venues.length === 0 ? (
          <div className="col-span-full bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs font-semibold">
            No venue slots added yet. Click "Add Venue Slot" to create one.
          </div>
        ) : (
          venues.map((v) => (
            <div key={v.id} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-xs">
              <div className="relative h-28 rounded-xl bg-slate-50 overflow-hidden border border-slate-200">
                {v.photo || v.image ? (
                  <img src={v.photo || v.image} alt={v.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-medium">
                    No Cover Photo
                  </div>
                )}
                <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-900 text-[10px] font-mono font-bold shadow-2xs">
                  Cap: {v.capacity || 100}
                </span>
              </div>

              <div>
                <h4 className="font-extrabold text-slate-900 text-xs truncate">{v.name}</h4>
                <p className="text-[11px] text-slate-500 font-mono">{v.location || "FSUU Main Campus"}</p>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                <span className="text-[11px] font-mono font-bold text-emerald-600">
                  ● {v.status || "Available"}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditVenue(v)}
                    className="p-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
                    title="Edit Venue"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteVenue(v.id, v.name)}
                    className="p-1.5 rounded-lg border border-slate-300 text-rose-600 hover:bg-rose-50 cursor-pointer shadow-2xs"
                    title="Delete Venue"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
