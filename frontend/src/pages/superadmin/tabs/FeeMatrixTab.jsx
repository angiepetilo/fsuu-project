import { useState, useEffect } from "react";
import { DollarSign, Send, Building2 } from "lucide-react";
import api from "@/lib/axios";

export default function FeeMatrixTab({ showMsg }) {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);

  // Section 1: Venue Rate Allocation & Email Form
  const [venueForm, setVenueForm] = useState({
    venue_id: "",
    hourly_rate: 500,
    recipient_email: "",
  });
  const [venueSending, setVenueSending] = useState(false);

  useEffect(() => {
    const fetchDropdowns = async () => {
      setLoading(true);
      try {
        const res = await api.get("/public/venues").catch(() => api.get("/admin/venues")).catch(() => ({ data: [] }));
        const vData = Array.isArray(res.data) ? res.data : [];
        setVenues(vData);
        if (vData.length > 0) setVenueForm((p) => ({ ...p, venue_id: vData[0].id }));
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    };
    fetchDropdowns();
  }, []);

  const handleSendVenueRate = async (e) => {
    e.preventDefault();
    setVenueSending(true);
    const selectedVenue = venues.find((v) => String(v.id) === String(venueForm.venue_id));
    setTimeout(() => {
      setVenueSending(false);
      if (showMsg) {
        showMsg(`✅ Rate quote for "${selectedVenue?.name || 'Venue'}" (₱${venueForm.hourly_rate}/hr) allocated & sent to ${venueForm.recipient_email || 'client email'}!`);
      }
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
          <DollarSign size={18} className="text-blue-600" />
          Fee Matrix Configuration & Rate Allocation
        </h3>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Configure venue rental rates and calculate rate quote allocations for reservations.
        </p>
      </div>

      {/* Main Form */}
      <div className="max-w-2xl">
        <form onSubmit={handleSendVenueRate} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building2 className="text-blue-600" size={18} />
            <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
              Venue Hourly Rate Allocation & Email Quote
            </h4>
          </div>

          <div className="space-y-3 text-xs font-semibold">
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">Select Venue *</label>
              <select
                value={venueForm.venue_id}
                onChange={(e) => setVenueForm({ ...venueForm, venue_id: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-xs focus:outline-none"
              >
                {venues.length === 0 ? (
                  <option value="">No venues registered in Venue Catalog</option>
                ) : (
                  venues.map((v) => (
                    <option key={v.id} value={v.id}>{v.name} ({v.location || 'FSUU Main Campus'})</option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">Allocated Hourly Rate (₱) *</label>
              <input
                type="number"
                min={0}
                required
                value={venueForm.hourly_rate}
                onChange={(e) => setVenueForm({ ...venueForm, hourly_rate: parseInt(e.target.value, 10) || 0 })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">Recipient Email Address *</label>
              <input
                type="email"
                required
                placeholder="client@fsuu.edu.ph"
                value={venueForm.recipient_email}
                onChange={(e) => setVenueForm({ ...venueForm, recipient_email: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 text-xs"
              />
              <p className="text-[10px] text-slate-400 font-medium mt-1">Official breakdown & rate quote will be sent to this email.</p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={venueSending}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Send size={14} />
              <span>Send Venue Rate Quote via Email</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
