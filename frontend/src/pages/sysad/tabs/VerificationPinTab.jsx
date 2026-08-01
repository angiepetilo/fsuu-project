import { useState, useEffect } from "react";
import { Save, ShieldCheck, Clock, CalendarDays, Plus, Edit2, Trash2, X, FileText, Loader2, CheckCircle2 } from "lucide-react";
import api from "@/lib/axios";

export default function VerificationPinTab({
  pinConfig,
  setPinConfig,
  pinSavedFeedback,
  handleSavePinConfig,
}) {
  const [requirements, setRequirements] = useState([]);
  const [reqLoading, setReqLoading] = useState(true);
  const [showReqModal, setShowReqModal] = useState(false);
  const [editReq, setEditReq] = useState(null);
  const [reqFormLoading, setReqFormLoading] = useState(false);

  const [reqForm, setReqForm] = useState({
    classification: "all",
    label: "",
    description: "",
  });

  const fetchRequirements = async () => {
    setReqLoading(true);
    try {
      const res = await api.get("/admin/booking-requirements");
      setRequirements(Array.isArray(res.data) ? res.data : []);
    } catch {
      // Fallback
    } finally {
      setReqLoading(false);
    }
  };

  useEffect(() => {
    fetchRequirements();
  }, []);

  const handleSaveReq = async (e) => {
    e.preventDefault();
    setReqFormLoading(true);
    try {
      const payload = {
        classification: reqForm.classification,
        label: reqForm.label,
        description: reqForm.description,
        office_id: 1,
      };

      if (editReq) {
        await api.put(`/admin/booking-requirements/${editReq.id}`, payload);
      } else {
        await api.post("/admin/booking-requirements", payload);
      }
      setShowReqModal(false);
      setEditReq(null);
      fetchRequirements();
    } catch {
      // Handle error
    } finally {
      setReqFormLoading(false);
    }
  };

  const handleDeleteReq = async (id) => {
    if (confirm("Archive this booking requirement?")) {
      try {
        await api.delete(`/admin/booking-requirements/${id}`);
        fetchRequirements();
      } catch {
        // Handle error
      }
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSavePinConfig} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <ShieldCheck className="text-blue-600" size={18} />
            Security PIN Control & Extended Usage Policies
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Configure master security PIN, external user booking privileges, and 2+ day multi-day extension controls.
          </p>
        </div>

        {pinSavedFeedback && (
          <div className="bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-2">
            <Save size={14} />
            {pinSavedFeedback}
          </div>
        )}

        {/* Section 1: Kiosk Security PIN Control */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <h4 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">1. Kiosk Security PIN Control</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-2">Master Verification PIN (6-Digit Security Code) *</label>
              <div className="flex gap-2 justify-start items-center">
                {[0, 1, 2, 3, 4, 5].map((index) => {
                  const digit = (pinConfig.masterPin || "")[index] || "";
                  return (
                    <input
                      key={index}
                      id={`pin-box-${index}`}
                      type="password"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        const current = (pinConfig.masterPin || "").split("");
                        current[index] = val;
                        const newPin = current.join("").slice(0, 6);
                        setPinConfig({ ...pinConfig, masterPin: newPin });
                        if (val && index < 5) {
                          document.getElementById(`pin-box-${index + 1}`)?.focus();
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && !digit && index > 0) {
                          document.getElementById(`pin-box-${index - 1}`)?.focus();
                        }
                      }}
                      className="w-10 h-12 text-center text-xl font-black bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-600 focus:bg-white text-blue-700 font-mono shadow-xs focus:outline-none transition-all"
                    />
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-400 font-medium mt-1.5">
                Each box accepts 1 numeric digit for the security verification PIN code.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">PIN Mode</label>
              <select
                value={pinConfig.requirePinForStudent ? "required" : "optional"}
                onChange={(e) => setPinConfig({ ...pinConfig, requirePinForStudent: e.target.value === "required" })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-xs focus:bg-white focus:outline-none"
              >
                <option value="required">Mandatory for all students and faculty</option>
                <option value="optional">Optional for faculty members</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: External User Enable/Disable Toggles & 2+ Day Rules */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h4 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <CalendarDays size={14} className="text-amber-500" />
            2. External User Controls & 2+ Day Extensions
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Enable/Disable External Venue Booking */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-900">External User Venue Booking</span>
                <input
                  type="checkbox"
                  checked={pinConfig.enableExternalVenue !== false}
                  onChange={(e) => setPinConfig({ ...pinConfig, enableExternalVenue: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Allow or disable non-FSUU external clients from submitting venue booking requests. Requires PIN verification for 2+ day multi-day reservations.
              </p>
            </div>

            {/* Enable/Disable External Equipment Borrowing */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-900">External User Equipment Borrowing</span>
                <input
                  type="checkbox"
                  checked={pinConfig.enableExternalEquipment !== false}
                  onChange={(e) => setPinConfig({ ...pinConfig, enableExternalEquipment: e.target.checked })}
                  className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Allow or disable non-FSUU external clients from submitting equipment borrowing requests. Requires PIN verification if return extended &gt; 2 days.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-md cursor-pointer"
          >
            <Save size={16} /> Save Security & PIN Settings
          </button>
        </div>
      </form>

      {/* Section 3: Requirements Needed Before Venue Booking (Item 6) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div>
            <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <FileText size={16} className="text-blue-600" />
              3. Requirements Needed Before Venue Booking
            </h4>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Configure mandatory endorsement letters and documents required per booking classification.
            </p>
          </div>
          <button
            onClick={() => {
              setEditReq(null);
              setReqForm({ classification: "all", label: "", description: "" });
              setShowReqModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold cursor-pointer"
          >
            <Plus size={15} /> Add Requirement
          </button>
        </div>

        {/* Requirements Table */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden text-xs">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                <th className="p-3">#</th>
                <th className="p-3">Requirement Document Title</th>
                <th className="p-3">Classification Scope</th>
                <th className="p-3">Description / Signatory</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-semibold">
              {reqLoading ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400">
                    <Loader2 className="animate-spin inline mr-2" size={16} /> Loading requirements...
                  </td>
                </tr>
              ) : requirements.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400">
                    📄 No specific requirements configured. Click "Add Requirement" to create one.
                  </td>
                </tr>
              ) : (
                requirements.map((req, idx) => (
                  <tr key={req.id || idx} className="hover:bg-white transition-colors">
                    <td className="p-3 font-bold text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-extrabold text-slate-900">{req.label}</td>
                    <td className="p-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 capitalize">
                        {req.classification}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600 font-normal">{req.description || "—"}</td>
                    <td className="p-3 flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditReq(req);
                          setReqForm({
                            classification: req.classification || "all",
                            label: req.label || "",
                            description: req.description || "",
                          });
                          setShowReqModal(true);
                        }}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteReq(req.id)}
                        className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Requirement Add/Edit Modal (Clean White Header - Item 35) */}
      {showReqModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[1500] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <FileText size={18} className="text-blue-600" />
                {editReq ? "Edit Booking Requirement" : "Add Booking Requirement"}
              </h3>
              <button onClick={() => setShowReqModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveReq} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Requirement Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DSA Endorsement Letter"
                  value={reqForm.label}
                  onChange={(e) => setReqForm({ ...reqForm, label: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Classification Scope *</label>
                <select
                  value={reqForm.classification}
                  onChange={(e) => setReqForm({ ...reqForm, classification: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-xs focus:outline-none"
                >
                  <option value="all">All Classifications</option>
                  <option value="organization">Student Organization</option>
                  <option value="academic">Academic Department</option>
                  <option value="external">External Client</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Description / Instructions</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Must be signed by the Director of Student Affairs Office"
                  value={reqForm.description}
                  onChange={(e) => setReqForm({ ...reqForm, description: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReqModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reqFormLoading}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md flex items-center gap-1.5"
                >
                  {reqFormLoading && <Loader2 size={14} className="animate-spin" />}
                  <span>Save Requirement</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
