import { useState, useEffect } from "react";
import { Save, ShieldCheck, Plus, Edit2, Trash2, X, FileText, Loader2, KeyRound, Clock, Calendar, PackageOpen, Users, CheckCircle2 } from "lucide-react";
import api from "@/lib/axios";
import { toast } from "sonner";

export default function VerificationPinTab({
  pinConfig: externalPinConfig,
  setPinConfig: setExternalPinConfig,
  pinSavedFeedback,
  handleSavePinConfig: externalHandleSavePinConfig,
  showMsg: externalShowMsg,
}) {
  const [pinSettings, setPinSettings] = useState({
    masterPin: "123456",
    isEnabled: true,
    requirePinOutsideHours: true,
    requirePinMultiDayVenue: true,
    requirePinMultiDayEquipment: true,
    enableExternalVenue: true,
    enableExternalEquipment: true,
    requirePinForStudent: false,
    pinMode: "optional",
  });

  const [pinLoading, setPinLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // Requirements state
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

  const fetchPinSettings = async () => {
    setPinLoading(true);
    try {
      const res = await api.get("/admin/verification-pin");
      if (res.data) {
        const loaded = {
          masterPin: res.data.masterPin || "123456",
          isEnabled: res.data.isEnabled !== false,
          requirePinOutsideHours: res.data.requirePinOutsideHours !== false,
          requirePinMultiDayVenue: res.data.requirePinMultiDayVenue !== false,
          requirePinMultiDayEquipment: res.data.requirePinMultiDayEquipment !== false,
          enableExternalVenue: res.data.enableExternalVenue !== false,
          enableExternalEquipment: res.data.enableExternalEquipment !== false,
          requirePinForStudent: !!res.data.requirePinForStudent,
          pinMode: res.data.pinMode || "optional",
        };
        setPinSettings(loaded);
        if (setExternalPinConfig) {
          setExternalPinConfig(loaded);
        }
        try {
          localStorage.setItem("fsuu_verification_pin_settings", JSON.stringify({
            pin: loaded.masterPin,
            enabled: loaded.isEnabled,
            requireOutsideHours: loaded.requirePinOutsideHours,
            requireMultiDayVenue: loaded.requirePinMultiDayVenue,
            requireMultiDayEquipment: loaded.requirePinMultiDayEquipment,
            enableExternal: loaded.enableExternalVenue,
          }));
        } catch {}
      }
    } catch {
      // Fallback to localStorage if any
      try {
        const saved = localStorage.getItem("fsuu_verification_pin_settings");
        if (saved) {
          const parsed = JSON.parse(saved);
          setPinSettings(prev => ({
            ...prev,
            masterPin: parsed.pin || prev.masterPin,
            requirePinOutsideHours: parsed.requireOutsideHours !== false,
          }));
        }
      } catch {}
    } finally {
      setPinLoading(false);
    }
  };

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
    fetchPinSettings();
    fetchRequirements();
  }, []);

  const handleSavePinSettings = async (e) => {
    if (e) e.preventDefault();
    setSaveLoading(true);
    setFeedbackMsg(null);

    try {
      const payload = {
        masterPin: pinSettings.masterPin || "123456",
        isEnabled: pinSettings.isEnabled !== false,
        requirePinOutsideHours: pinSettings.requirePinOutsideHours !== false,
        requirePinMultiDayVenue: pinSettings.requirePinMultiDayVenue !== false,
        requirePinMultiDayEquipment: pinSettings.requirePinMultiDayEquipment !== false,
        enableExternalVenue: pinSettings.enableExternalVenue !== false,
        enableExternalEquipment: pinSettings.enableExternalEquipment !== false,
        requirePinForStudent: !!pinSettings.requirePinForStudent,
        pinMode: pinSettings.requirePinForStudent ? "required" : "optional",
      };

      const res = await api.put("/admin/verification-pin", payload);
      if (res.data) {
        setPinSettings(prev => ({ ...prev, ...res.data }));
      }

      // Save local storage for instant sync across tabs
      try {
        localStorage.setItem("fsuu_verification_pin_settings", JSON.stringify({
          pin: payload.masterPin,
          enabled: payload.isEnabled,
          requireOutsideHours: payload.requirePinOutsideHours,
          requireMultiDayVenue: payload.requirePinMultiDayVenue,
          requireMultiDayEquipment: payload.requirePinMultiDayEquipment,
          enableExternal: payload.enableExternalVenue,
        }));
        window.dispatchEvent(new Event("pin_settings_updated"));
      } catch {}

      const msg = "✅ Verification PIN & trigger rules saved permanently in the database!";
      setFeedbackMsg(msg);
      if (externalShowMsg) {
        externalShowMsg(msg);
      } else {
        toast.success("Verification PIN settings saved successfully!");
      }

      if (setExternalPinConfig) {
        setExternalPinConfig(payload);
      }
    } catch {
      const errMsg = "❌ Failed to save verification PIN settings.";
      if (externalShowMsg) {
        externalShowMsg(errMsg, true);
      } else {
        toast.error("Failed to save verification PIN settings.");
      }
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSaveReq = async (e) => {
    e.preventDefault();
    setReqFormLoading(true);
    const payload = {
      classification: reqForm.classification,
      label: reqForm.label,
      description: reqForm.description,
      office_id: 1,
    };

    if (editReq) {
      // ── OPTIMISTIC EDIT ─────────────────────────────────────────────────
      const prev = requirements;
      setRequirements(r => r.map(x => x.id === editReq.id ? { ...x, ...payload, _optimistic: true } : x));
      setShowReqModal(false); setEditReq(null);
      try {
        await api.put(`/admin/booking-requirements/${editReq.id}`, payload);
        setRequirements(r => r.map(x => x.id === editReq.id ? { ...x, _optimistic: false } : x));
        toast.success("Booking requirement updated!");
      } catch {
        setRequirements(prev); setEditReq(editReq); setShowReqModal(true);
        toast.error("Failed to update — changes reverted.");
      } finally { setReqFormLoading(false); }
    } else {
      // ── OPTIMISTIC ADD ──────────────────────────────────────────────────
      const tempId = `temp-${Date.now()}`;
      const prev = requirements;
      setRequirements(r => [...r, { ...payload, id: tempId, _optimistic: true }]);
      setShowReqModal(false);
      try {
        const res = await api.post("/admin/booking-requirements", payload);
        const saved = res.data;
        setRequirements(r => r.map(x => x.id === tempId ? { ...saved, _optimistic: false } : x));
        toast.success("Booking requirement added!");
      } catch {
        setRequirements(prev); setShowReqModal(true);
        toast.error("Failed to add — changes reverted.");
      } finally { setReqFormLoading(false); }
    }
  };

  const handleDeleteReq = async (id) => {
    if (!confirm("Archive this booking requirement?")) return;
    // ── OPTIMISTIC DELETE ────────────────────────────────────────────────
    const prev = requirements;
    setRequirements(r => r.filter(x => x.id !== id));
    try {
      await api.delete(`/admin/booking-requirements/${id}`);
      toast.success("Requirement archived.");
    } catch {
      setRequirements(prev);
      toast.error("Failed to archive — changes reverted.");
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSavePinSettings} className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">

              Verification PIN Control & Security Rules
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Configure master administrative security PIN, outside campus office hours enforcement, and trigger rules.
            </p>
          </div>

          <label className="flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors">
            <span className="text-xs font-bold text-slate-700">System PIN Protection</span>
            <input
              type="checkbox"
              checked={pinSettings.isEnabled !== false}
              onChange={(e) => setPinSettings({ ...pinSettings, isEnabled: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded cursor-pointer"
            />
          </label>
        </div>

        {(feedbackMsg || pinSavedFeedback) && (
          <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{feedbackMsg || pinSavedFeedback}</span>
          </div>
        )}

        {/* Section 1: Security PIN Configuration */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <h4 className="font-extrabold text-[11px] text-slate-700 uppercase tracking-wider flex items-center gap-1.5">

            1. Master Security PIN
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1.5">Master Verification PIN (6-Digit Security Code) *</label>
              <div className="flex gap-2 justify-start items-center">
                {[0, 1, 2, 3, 4, 5].map((index) => {
                  const digit = (pinSettings.masterPin || "")[index] || "";
                  return (
                    <input
                      key={index}
                      id={`pin-box-${index}`}
                      type="password"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        const current = (pinSettings.masterPin || "").split("");
                        current[index] = val;
                        const newPin = current.join("").slice(0, 6);
                        setPinSettings({ ...pinSettings, masterPin: newPin });
                        if (val && index < 5) {
                          document.getElementById(`pin-box-${index + 1}`)?.focus();
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && !digit && index > 0) {
                          document.getElementById(`pin-box-${index - 1}`)?.focus();
                        }
                      }}
                      className="w-10 h-11 text-center text-lg font-black bg-white border-2 border-slate-200 rounded-xl focus:border-blue-600 focus:bg-white text-blue-700 font-mono shadow-2xs focus:outline-none transition-all"
                    />
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-1.5">
                6-digit numeric security PIN issued by the AVR Head / Administrator to authorize special bookings.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1.5">PIN Mode Policy</label>
              <select
                value={pinSettings.requirePinForStudent ? "required" : "optional"}
                onChange={(e) => setPinSettings({ ...pinSettings, requirePinForStudent: e.target.value === "required" })}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 text-xs focus:outline-none focus:border-blue-600 shadow-2xs"
              >
                <option value="optional">Optional for standard faculty members</option>
                <option value="required">Mandatory for all students and faculty</option>
              </select>
              <p className="text-[11px] text-slate-500 font-medium mt-1.5">
                Controls general base requirements for regular 1-day requisitions.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Verification Trigger Rules Checklist */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <h4 className="font-extrabold text-[11px] text-slate-700 uppercase tracking-wider flex items-center gap-1.5">

            2. Verification Trigger Rules (Select / Unselect Active Rules)
          </h4>

          <div className="space-y-2.5 text-xs">
            {/* Rule 0: Outside Campus Office Hours (CRITICAL NEW RULE) */}
            <label className="flex items-start justify-between p-3.5 bg-blue-50/50 rounded-2xl border border-blue-200 cursor-pointer hover:bg-blue-50 transition-all">
              <div className="space-y-0.5 pr-4">
                <div className="flex items-center gap-2">
                  <Clock size={15} className="text-blue-600" />
                  <span className="font-extrabold text-slate-900 text-xs">
                    Require PIN for Outside Campus Office Hours (Internal &amp; External Users)
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-600 text-white uppercase tracking-wider">
                    Office Hours
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 font-medium">
                  Applies to both <strong>borrow-equipment</strong> and <strong>book-venue</strong> when selected times fall outside official operating hours (e.g. before opening time or after closing time).
                </p>
              </div>
              <input
                type="checkbox"
                checked={pinSettings.requirePinOutsideHours !== false}
                onChange={(e) => setPinSettings({ ...pinSettings, requirePinOutsideHours: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded-lg cursor-pointer mt-0.5"
              />
            </label>

            {/* Rule 1: Multi-Day Venue */}
            <label className="flex items-start justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 cursor-pointer hover:bg-slate-100/80 transition-all">
              <div className="space-y-0.5 pr-4">
                <div className="flex items-center gap-2">
                  <Calendar size={15} className="text-slate-600" />
                  <span className="font-bold text-slate-900 text-xs">Require PIN for Multi-Day Venue Bookings (More than 1 day — 2+ days)</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  Enforces PIN verification for all users (students, faculty, external) whenever a venue reservation spans more than 1 day.
                </p>
              </div>
              <input
                type="checkbox"
                checked={pinSettings.requirePinMultiDayVenue !== false}
                onChange={(e) => setPinSettings({ ...pinSettings, requirePinMultiDayVenue: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded-lg cursor-pointer mt-0.5"
              />
            </label>

            {/* Rule 2: External Requisitions */}
            <label className="flex items-start justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 cursor-pointer hover:bg-slate-100/80 transition-all">
              <div className="space-y-0.5 pr-4">
                <div className="flex items-center gap-2">
                  <Users size={15} className="text-slate-600" />
                  <span className="font-bold text-slate-900 text-xs">Require PIN for External Identity Requisitions</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  Enforces administrative clearance for outside organizations, guests, and commercial entities.
                </p>
              </div>
              <input
                type="checkbox"
                checked={pinSettings.enableExternalVenue !== false}
                onChange={(e) => setPinSettings({
                  ...pinSettings,
                  enableExternalVenue: e.target.checked,
                  enableExternalEquipment: e.target.checked
                })}
                className="w-5 h-5 text-blue-600 rounded-lg cursor-pointer mt-0.5"
              />
            </label>
          </div>
        </div>

        {/* Bottom Save Action */}
        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            type="submit"
            disabled={saveLoading || pinLoading}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {saveLoading ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            <span>Save PIN &amp; Rules</span>
          </button>
        </div>
      </form>

      {/* Section 3: Requirements Needed Before Venue Booking */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div>
            <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">

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
              <h3 className="font-extrabold text-slate-900 text-sm">
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
