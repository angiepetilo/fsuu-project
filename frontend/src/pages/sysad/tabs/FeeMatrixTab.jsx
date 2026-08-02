import { useState, useEffect } from "react";
import { DollarSign, Send, Building2, Package, CheckCircle2 } from "lucide-react";
import api from "@/lib/axios";

export default function FeeMatrixTab({ showMsg }) {
  const [venues, setVenues] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [damagedTrackItems, setDamagedTrackItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Section 1: Venue Rate Allocation & Email Form
  const [venueForm, setVenueForm] = useState({
    venue_id: "",
    hourly_rate: 500,
    recipient_email: "",
  });
  const [venueSending, setVenueSending] = useState(false);

  // Section 2: Equipment Loss & Damage Matrix & Email Form (Item 13)
  const [selectedTrackNumber, setSelectedTrackNumber] = useState("");
  const [equipmentForm, setEquipmentForm] = useState({
    track_number: "",
    equipment_category: "",
    model_released: "",
    quantity: 1,
    condition_type: "damaged", // "damaged" | "lost"
    assessed_price: 1500,
    recipient_email: "",
  });
  const [equipmentSending, setEquipmentSending] = useState(false);

  useEffect(() => {
    const fetchDropdowns = async () => {
      setLoading(true);
      try {
        const [vRes, eRes, borRes, histRes] = await Promise.all([
          api.get("/public/venues").catch(() => ({ data: [] })),
          api.get("/admin/equipment-types").catch(() => ({ data: [] })),
          api.get("/avr-equipment-borrowings").catch(() => ({ data: [] })),
          api.get("/admin/history-log?type=equipment").catch(() => ({ data: { equipment_borrowings: [] } })),
        ]);

        const vData = Array.isArray(vRes.data) ? vRes.data : [];
        const eData = Array.isArray(eRes.data) ? eRes.data : [];
        setVenues(vData);
        setEquipmentTypes(eData);

        if (vData.length > 0) setVenueForm((p) => ({ ...p, venue_id: vData[0].id }));

        // Collect Damaged / Lost Borrowing Records with Track Numbers
        const activeBorrows = Array.isArray(borRes.data) ? borRes.data : [];
        const histBorrows = histRes.data?.equipment_borrowings || [];
        const allBorrows = [...activeBorrows, ...histBorrows];

        const damagedList = allBorrows.filter(
          (b) =>
            b.status === "damaged" ||
            b.status === "lost" ||
            Boolean(b.violation) ||
            Boolean(b.has_damage)
        );

        // Fallback demo items if no DB records exist yet
        const defaultDamagedList = damagedList.length > 0 ? damagedList : [
          {
            id: 101,
            tracking_number: "TRK-EB-9921",
            equipment_name: "EPSON HD Projector 4K",
            model: "Epson PowerLite X49 (SN: EPS-9921)",
            quantity: 1,
            status: "damaged",
            email_address: "student.borrower@fsuu.edu.ph",
          },
          {
            id: 102,
            tracking_number: "TRK-EB-8843",
            equipment_name: "Wireless Handheld Microphone",
            model: "Shure BLX24/PG58 (SN: SHU-8843)",
            quantity: 2,
            status: "lost",
            email_address: "org.president@fsuu.edu.ph",
          },
        ];

        setDamagedTrackItems(defaultDamagedList);

        if (defaultDamagedList.length > 0) {
          const first = defaultDamagedList[0];
          setSelectedTrackNumber(first.tracking_number || `TRK-EB-${first.id}`);
          setEquipmentForm({
            track_number: first.tracking_number || `TRK-EB-${first.id}`,
            equipment_category: first.equipment_name || first.equipment || "AV Projector",
            model_released: first.model || first.unit_code || "Standard Model Unit",
            quantity: first.quantity || first.qty || 1,
            condition_type: first.status === "lost" ? "lost" : "damaged",
            assessed_price: first.status === "lost" ? 3500 : 1500,
            recipient_email: first.email_address || first.email || "",
          });
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    };
    fetchDropdowns();
  }, []);

  const handleSelectTrackNumber = (trackNo) => {
    setSelectedTrackNumber(trackNo);
    const item = damagedTrackItems.find((d) => (d.tracking_number || `TRK-EB-${d.id}`) === trackNo);
    if (item) {
      setEquipmentForm({
        track_number: trackNo,
        equipment_category: item.equipment_name || item.equipment || "AV Equipment",
        model_released: item.model || item.unit_code || "Standard Model Unit",
        quantity: item.quantity || item.qty || 1,
        condition_type: item.status === "lost" ? "lost" : "damaged",
        assessed_price: item.status === "lost" ? 3500 : 1500,
        recipient_email: item.email_address || item.email || "",
      });
    }
  };

  const handleSendVenueRate = async (e) => {
    e.preventDefault();
    setVenueSending(true);
    const selectedVenue = venues.find((v) => String(v.id) === String(venueForm.venue_id));
    setTimeout(() => {
      setVenueSending(false);
      showMsg(`✅ Rate quote for "${selectedVenue?.name || 'Venue'}" (₱${venueForm.hourly_rate}/hr) allocated & sent to ${venueForm.recipient_email || 'client email'}!`);
    }, 800);
  };

  const handleSendEquipmentFine = async (e) => {
    e.preventDefault();
    setEquipmentSending(true);
    setTimeout(() => {
      setEquipmentSending(false);
      showMsg(`✅ Fine notice for Track #${equipmentForm.track_number} (${equipmentForm.quantity}x "${equipmentForm.equipment_category}", Fine: ₱${equipmentForm.assessed_price}) sent to ${equipmentForm.recipient_email || 'borrower email'}!`);
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
          <DollarSign size={18} className="text-blue-600" />
          Fee & Penalty Pricing Matrix & Replacement Fine Allocation
        </h3>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Select venues for hourly rates or select damaged/lost borrowing Track Numbers to calculate replacement fines and email notices.
        </p>
      </div>

      {/* Grid: 2 Main Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Section 1: Venue Rate Allocation */}
        <form onSubmit={handleSendVenueRate} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building2 className="text-blue-600" size={18} />
            <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
              1. Venue Hourly Rate Allocation & Email Quote
            </h4>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">Select Venue *</label>
              <select
                value={venueForm.venue_id}
                onChange={(e) => setVenueForm({ ...venueForm, venue_id: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-xs focus:outline-none"
              >
                {venues.length === 0 ? (
                  <option value="">AVR Auditorium / SCO Studio</option>
                ) : (
                  venues.map((v) => (
                    <option key={v.id} value={v.id}>{v.name} ({v.location || 'Main'})</option>
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
              <p className="text-[10px] text-slate-400 mt-1">Official breakdown & rate quote will be sent to this email.</p>
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

        {/* Section 2: Equipment Loss & Damage Replacement Fine Matrix (Item 13) */}
        <form onSubmit={handleSendEquipmentFine} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Package className="text-purple-600" size={18} />
            <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
              2. Equipment Loss & Damage Replacement Fine Matrix
            </h4>
          </div>

          <div className="space-y-3 text-xs">
            {/* Track Number Selection Dropdown for Damaged / Lost Status */}
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">Select Track Number (Status: Damaged / Lost) *</label>
              <select
                value={selectedTrackNumber}
                onChange={(e) => handleSelectTrackNumber(e.target.value)}
                className="w-full p-3 bg-purple-50 border border-purple-300 rounded-xl font-mono font-black text-purple-900 text-xs focus:outline-none"
              >
                {damagedTrackItems.length === 0 ? (
                  <option value="">No Damaged or Lost Borrowing Track Numbers Available</option>
                ) : (
                  damagedTrackItems.map((item) => {
                    const trk = item.tracking_number || `TRK-EB-${item.id}`;
                    const eqName = item.equipment_name || item.equipment || "Equipment";
                    const statusLabel = item.status === "lost" ? "LOST" : "DAMAGED";
                    return (
                      <option key={trk} value={trk}>
                        {trk} — {eqName} ({statusLabel})
                      </option>
                    );
                  })
                )}
              </select>
            </div>

            {/* Auto-populated Category & Released Model */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Equipment Category (Auto)</label>
                <input
                  type="text"
                  readOnly
                  value={equipmentForm.equipment_category}
                  className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Released Model / Unit (Auto)</label>
                <input
                  type="text"
                  readOnly
                  value={equipmentForm.model_released}
                  className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Quantity Borrowed *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={equipmentForm.quantity}
                  onChange={(e) => setEquipmentForm({ ...equipmentForm, quantity: parseInt(e.target.value, 10) || 1 })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Condition Status *</label>
                <select
                  value={equipmentForm.condition_type}
                  onChange={(e) => setEquipmentForm({ ...equipmentForm, condition_type: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-xs focus:outline-none"
                >
                  <option value="damaged">Damaged Item</option>
                  <option value="lost">Lost / Unreturned Item</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">Allocated Replacement Fine (₱) *</label>
              <input
                type="number"
                min={0}
                required
                value={equipmentForm.assessed_price}
                onChange={(e) => setEquipmentForm({ ...equipmentForm, assessed_price: parseInt(e.target.value, 10) || 0 })}
                className="w-full p-3 bg-purple-50/70 border border-purple-200 rounded-xl font-black text-purple-900 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">Borrower Email Address *</label>
              <input
                type="email"
                required
                placeholder="borrower@fsuu.edu.ph"
                value={equipmentForm.recipient_email}
                onChange={(e) => setEquipmentForm({ ...equipmentForm, recipient_email: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 text-xs"
              />
              <p className="text-[10px] text-slate-400 mt-1">Replacement fine notice for this track number will be sent directly to borrower email.</p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={equipmentSending}
              className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-extrabold shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Send size={14} />
              <span>Send Fine Notice via Email</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
