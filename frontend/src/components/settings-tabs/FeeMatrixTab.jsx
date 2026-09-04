import React, { useState, useEffect, useMemo } from "react";
import { Printer, Save, PlusCircle, Trash2, Loader2 } from "lucide-react";
import api from "@/lib/axios";
import { downloadReportAsPdf } from "@/pages/general/reports/exportPdfHelper";

export default function FeeMatrixTab({ officeScope = "All Offices", showMsg }) {
  const [venues, setVenues] = useState([]);
  const [selectedVenueId, setSelectedVenueId] = useState("");
  const [title, setTitle] = useState("Facility Rental Fee Schedule and Reservation Policy");
  
  // Toggles
  const [showSignatures, setShowSignatures] = useState(true);
  const [showRateItems, setShowRateItems] = useState(true);
  const [notesEnabled, setNotesEnabled] = useState(true);

  // Signatories list
  const [signatories, setSignatories] = useState([
    { id: "sig-1", name: "Dr. Maria Angela Santos", title: "AVR Operations Head" },
  ]);

  // Rate items list
  const [rateItems, setRateItems] = useState([
    { id: "rate-1", description: "Internal Academic and Dept Rate", rate: "Free of Charge", enabled: true },
    { id: "rate-2", description: "External Hourly Rental Rate", rate: "₱1,500 per hour", enabled: true },
    { id: "rate-3", description: "External Full Day Rate", rate: "₱8,000 per day", enabled: true },
    { id: "rate-4", description: "Facility Cleaning Fee", rate: "₱200", enabled: true },
    { id: "rate-5", description: "Sound System & Tech Setup Fee", rate: "₱500", enabled: true },
  ]);

  // Notes
  const [notes, setNotes] = useState(
    "Internal FSUU events and official academic activities are free of charge. External rentals require prior fee matrix approval. A 50% downpayment is required to confirm and lock the reservation schedule."
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [editingField, setEditingField] = useState({});

  // 1. Fetch live venues from database
  useEffect(() => {
    const fetchVenues = async () => {
      setLoading(true);
      try {
        const res = await api.get("/general/venues").catch(() => ({ data: [] }));
        const list = Array.isArray(res.data) ? res.data : [];
        setVenues(list);

        if (list.length > 0) {
          const firstId = String(list[0].id);
          setSelectedVenueId(firstId);
          loadFeeMatrix(firstId);
        } else {
          loadFeeMatrix(null);
        }
      } catch (err) {
        console.error("Failed to load venues in FeeMatrixTab:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchVenues();
  }, []);

  // 2. Load fee matrix for chosen venue from DB (with fallback to default)
  const loadFeeMatrix = async (venueId) => {
    try {
      const url = venueId ? `/general/fee-matrix?venue_id=${venueId}` : `/general/fee-matrix`;
      const res = await api.get(url).catch(() => null);
      const data = res?.data;

      if (data && data.title) {
        setTitle(data.title);
        setShowSignatures(data.show_signatures !== false);
        setShowRateItems(data.show_rate_items !== false);
        setNotesEnabled(data.notes_enabled !== false);
        if (data.notes !== undefined) setNotes(data.notes || "");
        if (Array.isArray(data.signatories) && data.signatories.length > 0) {
          setSignatories(data.signatories);
        }
        if (Array.isArray(data.rate_items) && data.rate_items.length > 0) {
          setRateItems(data.rate_items);
        }
      }
    } catch (err) {
      console.error("Failed to load fee matrix from server:", err);
    }
  };

  const handleVenueChange = (e) => {
    const vId = e.target.value;
    setSelectedVenueId(vId);
    loadFeeMatrix(vId);
  };

  // 3. Save changes end-to-end to database
  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      const payload = {
        venue_id: selectedVenueId ? parseInt(selectedVenueId, 10) : null,
        title,
        show_signatures: showSignatures,
        show_rate_items: showRateItems,
        notes_enabled: notesEnabled,
        notes,
        signatories,
        rate_items: rateItems,
      };

      const res = await api.post("/general/fee-matrix", payload);
      if (typeof showMsg === "function") {
        showMsg("Fee Matrix settings saved successfully to the database.");
      }
    } catch (err) {
      console.error("Failed to save fee matrix to DB:", err);
      if (typeof showMsg === "function") {
        showMsg(err.response?.data?.message || "Failed to save Fee Matrix settings.");
      }
    } finally {
      setSaving(false);
    }
  };

  // 4. Signatories Management
  const handleAddSignature = () => {
    setSignatories((prev) => [
      ...prev,
      { id: `sig-${Date.now()}`, name: "", title: "" },
    ]);
  };

  const handleUpdateSignature = (index, field, value) => {
    setSignatories((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleRemoveSignature = (index) => {
    if (signatories.length <= 1) return;
    setSignatories((prev) => prev.filter((_, i) => i !== index));
  };

  // 5. Rate Items Management
  const handleAddRateItem = () => {
    setRateItems((prev) => [
      ...prev,
      { id: `rate-${Date.now()}`, description: "", rate: "", enabled: true },
    ]);
  };

  const handleUpdateRateItem = (index, field, value) => {
    setRateItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleToggleRateItem = (index) => {
    setRateItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], enabled: !next[index].enabled };
      return next;
    });
  };

  const handleRemoveRateItem = (index) => {
    setRateItems((prev) => prev.filter((_, i) => i !== index));
  };

  // 6. Print to PDF Export
  const currentVenue = useMemo(() => {
    return venues.find((v) => String(v.id) === String(selectedVenueId));
  }, [venues, selectedVenueId]);

  const activeRates = useMemo(() => {
    if (!showRateItems) return [];
    return rateItems.filter((it) => it.enabled && (it.description || it.rate));
  }, [showRateItems, rateItems]);

  const calculateTotal = (items) => {
    let sum = 0;
    let hasNumeric = false;
    items.forEach((it) => {
      const raw = String(it.rate || "");
      const match = raw.match(/[\d,]+(\.\d+)?/);
      if (match) {
        const val = parseFloat(match[0].replace(/,/g, ""));
        if (!isNaN(val)) {
          sum += val;
          hasNumeric = true;
        }
      }
    });
    if (!hasNumeric || sum === 0) return "—";
    return `₱${sum.toLocaleString()}`;
  };

  const handlePrintToPdf = async () => {
    const venueName = currentVenue?.name ? currentVenue.name.replace(/[^a-zA-Z0-9]/g, "_") : "General";
    const filename = `FSUU_Fee_Matrix_${venueName}_${new Date().toISOString().slice(0, 10)}.pdf`;

    await downloadReportAsPdf({
      elementId: "printable-fee-matrix",
      filename,
      onStart: () => setIsExportingPdf(true),
      onComplete: () => {
        setIsExportingPdf(false);
        if (typeof showMsg === "function") showMsg("Fee Matrix PDF downloaded successfully.");
      },
      onError: () => {
        setIsExportingPdf(false);
        window.print();
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-slate-900 tracking-tight">Fee Matrix</h2>
        <button
          type="button"
          onClick={handlePrintToPdf}
          disabled={isExportingPdf}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-60"
        >
          {isExportingPdf ? <Loader2 size={14} className="animate-spin" /> : <Printer size={15} />}
          <span>{isExportingPdf ? "Exporting..." : "Print to PDF"}</span>
        </button>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form Controls */}
        <div className="lg:col-span-6 space-y-5 text-xs">
          {/* 1. Select Venue */}
          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1.5">Select Venue</label>
            <select
              value={selectedVenueId}
              onChange={handleVenueChange}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-2xs cursor-pointer"
            >
              {venues.length === 0 ? (
                <option value="">No venues available</option>
              ) : (
                venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* 2. Title */}
          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-2xs"
            />
          </div>

          {/* 3. Signature Section */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Signature</h3>
              <button
                type="button"
                onClick={() => setShowSignatures(!showSignatures)}
                className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                  showSignatures ? "bg-blue-600" : "bg-slate-300"
                }`}
                title="Toggle Signature on/off"
              >
                <div
                  className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform ${
                    showSignatures ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {showSignatures && (
              <div className="space-y-3">
                {signatories.map((sig, sIdx) => (
                  <div key={sig.id || sIdx} className="space-y-2 p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs relative">
                    {/* Full Name */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-slate-700">Full Name</label>
                        {signatories.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSignature(sIdx)}
                            className="text-slate-400 hover:text-rose-600 transition-colors"
                            title="Remove signatory"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={sig.name}
                        onChange={(e) => handleUpdateSignature(sIdx, "name", e.target.value)}
                        placeholder="Full Name"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                      />
                    </div>

                    {/* Title */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-slate-700">Title</label>
                      </div>
                      <input
                        type="text"
                        value={sig.title}
                        onChange={(e) => handleUpdateSignature(sIdx, "title", e.target.value)}
                        placeholder="Title / Designation"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddSignature}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-800 hover:text-blue-600 transition-colors cursor-pointer pt-1"
                >
                  <PlusCircle size={15} className="text-slate-700" />
                  <span>Add other signature</span>
                </button>
              </div>
            )}
          </div>

          {/* 4. Rate item Section */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Rate item</h3>
              <button
                type="button"
                onClick={() => setShowRateItems(!showRateItems)}
                className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                  showRateItems ? "bg-blue-600" : "bg-slate-300"
                }`}
                title="Toggle Rate Items on/off"
              >
                <div
                  className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform ${
                    showRateItems ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {showRateItems && (
              <div className="space-y-3">
                {rateItems.map((item, rIdx) => (
                  <div
                    key={item.id || rIdx}
                    className={`space-y-2 p-3 rounded-2xl border transition-all ${
                      item.enabled
                        ? "bg-white border-slate-200 shadow-2xs"
                        : "bg-slate-50/70 border-slate-200/60 opacity-60"
                    }`}
                  >
                    {/* Description */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-slate-700">Description</label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleRateItem(rIdx)}
                            className="text-[11px] font-semibold text-slate-500 hover:text-blue-600 cursor-pointer"
                          >
                            {item.enabled ? "disable" : "enable"}
                          </button>
                          {rateItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveRateItem(rIdx)}
                              className="text-slate-400 hover:text-rose-600 transition-colors"
                              title="Remove item"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                      <input
                        type="text"
                        value={item.description}
                        disabled={!item.enabled}
                        onChange={(e) => handleUpdateRateItem(rIdx, "description", e.target.value)}
                        placeholder="Description"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all disabled:opacity-50"
                      />
                    </div>

                    {/* rate item */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-slate-700">rate item</label>
                        <button
                          type="button"
                          onClick={() => handleToggleRateItem(rIdx)}
                          className="text-[11px] font-semibold text-slate-500 hover:text-blue-600 cursor-pointer"
                        >
                          {item.enabled ? "disable" : "enable"}
                        </button>
                      </div>
                      <input
                        type="text"
                        value={item.rate}
                        disabled={!item.enabled}
                        onChange={(e) => handleUpdateRateItem(rIdx, "rate", e.target.value)}
                        placeholder="rate item (e.g. ₱1,500 / hr)"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all disabled:opacity-50"
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddRateItem}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-800 hover:text-blue-600 transition-colors cursor-pointer pt-1"
                >
                  <PlusCircle size={15} className="text-slate-700" />
                  <span>Add other description</span>
                </button>
              </div>
            )}
          </div>

          {/* 5. Notes Section */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800">Notes</label>
              <button
                type="button"
                onClick={() => setNotesEnabled(!notesEnabled)}
                className="text-[11px] font-semibold text-slate-500 hover:text-blue-600 cursor-pointer"
              >
                {notesEnabled ? "disable" : "enable"}
              </button>
            </div>
            <textarea
              rows={3}
              value={notes}
              disabled={!notesEnabled}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white transition-all disabled:opacity-50"
            />
          </div>

          {/* 6. Save Changes Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleSaveChanges}
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-2 disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              <span>Save Changes</span>
            </button>
          </div>
        </div>

        {/* Right Column: Printable Sheet Preview */}
        <div className="lg:col-span-6 sticky top-6">
          <div
            id="printable-fee-matrix"
            className="w-full bg-white rounded-2xl border border-slate-300 shadow-xs p-8 sm:p-10 space-y-6 text-xs text-slate-900 font-sans min-h-[580px] flex flex-col justify-between"
          >
            {/* Top Area */}
            <div className="space-y-4">
              {/* Header with Logo and Title */}
              <div className="flex items-center justify-between relative pb-2">
                <img
                  src="/fsuu_logo.png"
                  alt="University Shield"
                  className="h-12 w-auto object-contain shrink-0"
                  onError={(e) => {
                    e.target.style.visibility = "hidden";
                  }}
                />
                <h2 className="text-sm font-bold text-slate-900 tracking-tight uppercase text-center flex-1 pr-10">
                  {title || "Title"}
                </h2>
              </div>

              {/* Horizontal Divider */}
              <hr className="border-slate-300" />

              {/* Selected Venue */}
              <p className="text-xs font-bold text-slate-800">
                {currentVenue?.name || "Select Venue"}
              </p>

              {/* 2-Column Fee Table */}
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 border-b border-slate-300">
                      <th className="p-3 text-left font-bold border-r border-slate-300 w-3/5">
                        Charge Description
                      </th>
                      <th className="p-3 text-right font-bold w-2/5">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {activeRates.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="p-4 text-center text-slate-400 italic">
                          No active rate items.
                        </td>
                      </tr>
                    ) : (
                      activeRates.map((item, idx) => (
                        <tr key={item.id || idx}>
                          <td className="p-3 font-medium text-slate-800 border-r border-slate-300">
                            {item.description}
                          </td>
                          <td className="p-3 text-right font-semibold text-slate-900 font-mono">
                            {item.rate}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Total Row */}
              <div className="flex justify-between items-center px-1 text-xs font-bold text-slate-900 pt-1">
                <span>Total</span>
                <span className="font-mono">{calculateTotal(activeRates)}</span>
              </div>

              {/* Notes */}
              {notesEnabled && notes && (
                <div className="space-y-1 text-xs pt-2">
                  <span className="font-bold text-slate-800">Notes :</span>
                  <p className="text-slate-600 leading-relaxed font-normal whitespace-pre-wrap">
                    {notes}
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Signature Area */}
            {showSignatures && (
              <div className="pt-8 mt-auto space-y-4">
                <hr className="border-slate-300" />
                <div className="flex flex-wrap items-end justify-end gap-6 pt-2">
                  {signatories.map((sig, sIdx) => (
                    <div key={sig.id || sIdx} className="w-48 text-center space-y-1 ml-auto">
                      <div className="border-t border-slate-400 pt-1">
                        <p className="text-xs font-bold text-slate-900 uppercase">
                          {sig.name || "Fullname"}
                        </p>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {sig.title || "title"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
