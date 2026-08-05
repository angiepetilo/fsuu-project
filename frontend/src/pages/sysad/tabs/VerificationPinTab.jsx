import { useState, useEffect } from "react";
import { Save, ShieldCheck, Plus, Edit2, Trash2, X, FileText, Loader2 } from "lucide-react";
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
    <div className="space-y-4">
      <form onSubmit={handleSavePinConfig} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
            <ShieldCheck className="text-blue-600" size={17} />
            Verification PIN Control & Rules
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Configure master security PIN, access permissions, and verification trigger rules.
          </p>
        </div>

        {pinSavedFeedback && (
          <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-2">
            <span>{pinSavedFeedback}</span>
          </div>
        )}

        {/* Section 1: Security PIN Configuration */}
        <div className="space-y-3 pt-2.5 border-t border-slate-100">
          <h4 className="font-extrabold text-[11px] text-slate-700 uppercase tracking-wider">1. Master Security PIN</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1.5">Master Verification PIN (6-Digit Code) *</label>
              <div className="flex gap-1.5 justify-start items-center">
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
                      className="w-9 h-10 text-center text-base font-black bg-slate-50 border border-slate-200 rounded-lg focus:border-blue-600 focus:bg-white text-blue-700 font-mono shadow-2xs focus:outline-none transition-all"
                    />
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-400 font-medium mt-1">
                6-digit numeric security code for administrative authorization.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">PIN Mode</label>
              <select
                value={pinConfig.requirePinForStudent ? "required" : "optional"}
                onChange={(e) => setPinConfig({ ...pinConfig, requirePinForStudent: e.target.value === "required" })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-xs focus:bg-white focus:outline-none"
              >
                <option value="optional">Optional for faculty members</option>
                <option value="required">Mandatory for all students and faculty</option>
              </select>
              <p className="text-[10px] text-slate-400 font-medium mt-1">
                Controls whether standard 1-day requisitions require PIN confirmation.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Verification Trigger Rules Checklist */}
        <div className="space-y-2.5 pt-2.5 border-t border-slate-100">
          <h4 className="font-extrabold text-[11px] text-slate-700 uppercase tracking-wider">2. Verification Trigger Rules</h4>

          <div className="space-y-1.5 text-xs">
            {/* Rule 1: Multi-Day Venue */}
            <label className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 cursor-pointer hover:bg-slate-100/80 transition-all">
              <span className="font-bold text-slate-900 text-xs">Require PIN for Multi-Day Venue Bookings (2 or more reserved days)</span>
              <input
                type="checkbox"
                checked={pinConfig.requirePinMultiDayVenue !== false}
                onChange={(e) => setPinConfig({ ...pinConfig, requirePinMultiDayVenue: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded cursor-pointer"
              />
            </label>

            {/* Rule 2: Multi-Day Equipment */}
            <label className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 cursor-pointer hover:bg-slate-100/80 transition-all">
              <span className="font-bold text-slate-900 text-xs">Require PIN for Next-Day / Multi-Day Equipment Returns</span>
              <input
                type="checkbox"
                checked={pinConfig.requirePinMultiDayEquipment !== false}
                onChange={(e) => setPinConfig({ ...pinConfig, requirePinMultiDayEquipment: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded cursor-pointer"
              />
            </label>

            {/* Rule 3: External Requisitions */}
            <label className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 cursor-pointer hover:bg-slate-100/80 transition-all">
              <span className="font-bold text-slate-900 text-xs">Require PIN for External Identity Requisitions</span>
              <input
                type="checkbox"
                checked={pinConfig.enableExternalVenue !== false}
                onChange={(e) => setPinConfig({
                  ...pinConfig,
                  enableExternalVenue: e.target.checked,
                  enableExternalEquipment: e.target.checked
                })}
                className="w-4 h-4 text-blue-600 rounded cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Bottom Save Action */}
        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            type="submit"
            className="flex items-center gap-1 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-2xs transition-all cursor-pointer active:scale-95"
          >
            <Save size={14} />
            <span>Save</span>
          </button>
        </div>
      </form>

      {/* Section 3: Requirements Needed Before Venue Booking */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div>
            <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <FileText size={16} className="text-blue-600" />
              3. Requirements Needed Before Venue Booking
            </h4>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Configure mandatory endorsement letters and clearance documents per classification.
            </p>
          </div>
          <button
            onClick={() => {
              setEditReq(null);
              setReqForm({ classification: "all", label: "", description: "" });
              setShowReqModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold cursor-pointer"
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
                <th className="p-3">Requirement Title</th>
                <th className="p-3">Classification Scope</th>
                <th className="p-3">Description / Instructions</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-semibold">
              {reqLoading ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400">
                    <span className="text-xs font-semibold italic">Loading requirements...</span>
                  </td>
                </tr>
              ) : requirements.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400">
                    No specific requirements configured. Click "Add Requirement" to create one.
                  </td>
                </tr>
              ) : (
                requirements.map((req, idx) => (
                  <tr key={req.id || idx} className="hover:bg-white transition-colors">
                    <td className="p-3 font-bold text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-extrabold text-slate-900">{req.label}</td>
                    <td className="p-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 uppercase">
                        {req.classification || "ALL"}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600 font-medium">{req.description || "Required for booking clearance"}</td>
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

      {/* Requirement Add/Edit Modal */}
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
                  placeholder="e.g. Must be signed by Director of Student Affairs"
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
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-2xs flex items-center gap-1.5"
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
