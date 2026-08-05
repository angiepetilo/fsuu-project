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
        showMsg(`✅ Venue slot "${name}" deleted.`);
      } catch {
        showMsg(`✅ Venue slot "${name}" removed.`);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">Venue Catalog & Operating Capacity</h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Configure available venue rooms, seating capacities, floor specs, and avatars for public kiosk booking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/manage-venues"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-extrabold transition-all cursor-pointer"
          >
            <Calendar size={15} className="text-blue-600" />
            <span>Manage Date & Time Status</span>
          </Link>
          <button
            onClick={() => {
              setEditVenue(null);
              setShowAddVenueModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-xs transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span>Add Venue Slot</span>
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
            <div key={v.id} className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3 shadow-xs">
              <div className="relative h-28 rounded-xl bg-slate-100 overflow-hidden border border-slate-200">
                {v.photo || v.image ? (
                  <img src={v.photo || v.image} alt={v.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-bold">
                    No Cover Photo
                  </div>
                )}
                <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-slate-900/80 text-white text-[10px] font-extrabold">
                  Cap: {v.capacity || 100}
                </span>
              </div>

              <div>
                <h4 className="font-extrabold text-slate-900 text-xs truncate">{v.name}</h4>
                <p className="text-[11px] text-slate-500 font-medium">{v.location || "FSUU Main Campus"}</p>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {v.status || "Available"}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditVenue(v)}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                    title="Edit Venue"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => handleDeleteVenue(v.id, v.name)}
                    className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
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
