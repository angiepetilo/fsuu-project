import { useState, useEffect } from "react";
import api from "@/lib/axios";
import { toast } from "sonner";
import EndorsementLetterTemplateModal from "@/components/ui/EndorsementLetterTemplateModal";

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
    requirePinMultiDayEquipment: false,
    enableExternalVenue: true,
    enableExternalEquipment: true,
    requirePinForStudent: false,
    pinMode: "optional",
  });

  const [pinLoading, setPinLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplateType, setSelectedTemplateType] = useState("organization");
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
          requirePinMultiDayEquipment: !!res.data.requirePinMultiDayEquipment,
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
      // Fallback to localStorage
      try {
        const saved = localStorage.getItem("fsuu_verification_pin_settings");
        if (saved) {
          const parsed = JSON.parse(saved);
          setPinSettings(prev => ({
            ...prev,
            masterPin: parsed.pin || prev.masterPin,
            requirePinOutsideHours: parsed.requireOutsideHours !== false,
            requirePinMultiDayVenue: parsed.requireMultiDayVenue !== false,
            enableExternalVenue: parsed.enableExternal !== false,
            enableExternalEquipment: parsed.enableExternal !== false,
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
        requirePinMultiDayEquipment: false,
        enableExternalVenue: pinSettings.enableExternalVenue !== false,
        enableExternalEquipment: pinSettings.enableExternalEquipment !== false,
        requirePinForStudent: false,
        pinMode: "optional",
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

      const msg = "Verification PIN settings saved successfully.";
      setFeedbackMsg(msg);
      if (externalShowMsg) {
        externalShowMsg(msg);
      } else {
        toast.success(msg);
      }

      if (setExternalPinConfig) {
        setExternalPinConfig(payload);
      }
    } catch {
      const errMsg = "Failed to save verification PIN settings.";
      if (externalShowMsg) {
        externalShowMsg(errMsg, true);
      } else {
        toast.error(errMsg);
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
      const prev = requirements;
      setRequirements(r => r.map(x => x.id === editReq.id ? { ...x, ...payload } : x));
      setShowReqModal(false);
      setEditReq(null);
      try {
        await api.put(`/admin/booking-requirements/${editReq.id}`, payload);
        toast.success("Requirement updated.");
      } catch {
        setRequirements(prev);
        setEditReq(editReq);
        setShowReqModal(true);
        toast.error("Failed to update requirement.");
      } finally {
        setReqFormLoading(false);
      }
    } else {
      const tempId = `temp-${Date.now()}`;
      const prev = requirements;
      setRequirements(r => [...r, { ...payload, id: tempId }]);
      setShowReqModal(false);
      try {
        const res = await api.post("/admin/booking-requirements", payload);
        const saved = res.data;
        setRequirements(r => r.map(x => x.id === tempId ? saved : x));
        toast.success("Requirement added.");
      } catch {
        setRequirements(prev);
        setShowReqModal(true);
        toast.error("Failed to add requirement.");
      } finally {
        setReqFormLoading(false);
      }
    }
  };

  const handleDeleteReq = async (id) => {
    if (!confirm("Are you sure you want to delete this requirement?")) return;
    const prev = requirements;
    setRequirements(r => r.filter(x => x.id !== id));
    try {
      await api.delete(`/admin/booking-requirements/${id}`);
      toast.success("Requirement removed.");
    } catch {
      setRequirements(prev);
      toast.error("Failed to remove requirement.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Section: Verification PIN Settings & Trigger Checklist */}
      <form onSubmit={handleSavePinSettings} className="bg-white p-5 rounded-xl border border-slate-200 space-y-5">
        {/* Header & Master Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Verification PIN Settings
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage administrative security PIN code, trigger rules, and booking checklist requirements.
            </p>
          </div>

          <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={pinSettings.isEnabled !== false}
              onChange={(e) => setPinSettings({ ...pinSettings, isEnabled: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded border-slate-300"
            />
            <span>Enable PIN Protection</span>
          </label>
        </div>

        {/* Section 1: Master PIN Input */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-900">
            Master Security PIN (6-Digit Code)
          </label>
          <div className="flex items-center gap-3">
            <input
              type={showPin ? "text" : "password"}
              maxLength={6}
              value={pinSettings.masterPin || ""}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                setPinSettings({ ...pinSettings, masterPin: val });
              }}
              placeholder="123456"
              className="w-48 p-2 text-sm font-mono tracking-widest bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-slate-500"
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="px-3 py-2 text-xs text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              {showPin ? "Hide PIN" : "Show PIN"}
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            Issued by the AVR Head / Administrator to authorize special booking requests.
          </p>
        </div>

        {/* Section 2: Trigger Rules Checklist */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <div>
            <h4 className="text-xs font-semibold text-slate-900">
              Trigger Rules Checklist
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Select which conditions mandate administrative verification PIN.
            </p>
          </div>

          <div className="space-y-2.5">
            {/* Rule 1: External Users (Mandatory) */}
            <label className="flex items-start justify-between p-3.5 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition-colors">
              <div className="space-y-1 pr-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-900">
                    External Users: Venue Bookings &amp; Equipment Borrowings
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-200 text-slate-700 rounded">
                    Mandatory
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Verification PIN is required for all external (guest/partner) users when booking venues or borrowing equipment.
                </p>
              </div>
              <input
                type="checkbox"
                checked={pinSettings.enableExternalVenue !== false && pinSettings.enableExternalEquipment !== false}
                onChange={(e) => setPinSettings({
                  ...pinSettings,
                  enableExternalVenue: e.target.checked,
                  enableExternalEquipment: e.target.checked,
                })}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 mt-0.5"
              />
            </label>

            {/* Rule 2: Multi-Day Venue Bookings for Faculty & Students (Mandatory) */}
            <label className="flex items-start justify-between p-3.5 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition-colors">
              <div className="space-y-1 pr-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-900">
                    Multi-Day Venue Bookings: Faculty &amp; Students (2+ Days)
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-200 text-slate-700 rounded">
                    Mandatory
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Verification PIN is required for faculty and students when reserving a venue for more than 1 day. Single-day venue bookings do not require a PIN.
                </p>
              </div>
              <input
                type="checkbox"
                checked={pinSettings.requirePinMultiDayVenue !== false}
                onChange={(e) => setPinSettings({ ...pinSettings, requirePinMultiDayVenue: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 mt-0.5"
              />
            </label>

            {/* Rule 3: Outside Campus Office Hours (Configurable) */}
            <label className="flex items-start justify-between p-3.5 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition-colors">
              <div className="space-y-1 pr-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-900">
                    Outside Campus Office Hours
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded border border-slate-200">
                    Configurable
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Verification PIN is required when requested venue or equipment hours fall outside official campus operating hours.
                </p>
              </div>
              <input
                type="checkbox"
                checked={pinSettings.requirePinOutsideHours !== false}
                onChange={(e) => setPinSettings({ ...pinSettings, requirePinOutsideHours: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 mt-0.5"
              />
            </label>
          </div>
        </div>

        {/* Applicability Matrix Table */}
        <div className="space-y-2 pt-3 border-t border-slate-100">
          <h4 className="text-xs font-semibold text-slate-900">
            Applicability Matrix
          </h4>
          <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                  <th className="p-2.5">Requester Classification</th>
                  <th className="p-2.5">Venue Booking (1-Day)</th>
                  <th className="p-2.5">Venue Booking (Multi-Day)</th>
                  <th className="p-2.5">Equipment Borrowing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-normal text-slate-700">
                <tr>
                  <td className="p-2.5 font-medium text-slate-900">Student</td>
                  <td className="p-2.5 text-slate-500">No PIN (Direct)</td>
                  <td className="p-2.5 font-medium text-slate-900">PIN Required</td>
                  <td className="p-2.5 text-slate-500">No PIN (Direct)</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-medium text-slate-900">Faculty / Staff</td>
                  <td className="p-2.5 text-slate-500">No PIN (Direct)</td>
                  <td className="p-2.5 font-medium text-slate-900">PIN Required</td>
                  <td className="p-2.5 text-slate-500">No PIN (Direct)</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-medium text-slate-900">External Client</td>
                  <td className="p-2.5 font-medium text-slate-900">PIN Required</td>
                  <td className="p-2.5 font-medium text-slate-900">PIN Required</td>
                  <td className="p-2.5 font-medium text-slate-900">PIN Required</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Save Settings Action */}
        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            type="submit"
            disabled={saveLoading || pinLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {saveLoading ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>

      {/* Section 3: Booking Checklist Requirements */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h4 className="text-xs font-semibold text-slate-900">
              Booking Requirements &amp; Documents Checklist
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Endorsement letters and documents required before venue booking clearance.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditReq(null);
              setReqForm({ classification: "all", label: "", description: "" });
              setShowReqModal(true);
            }}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium self-start sm:self-auto"
          >
            Add Requirement
          </button>
        </div>

        {/* Requirements Table */}
        <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                <th className="p-2.5 w-10">#</th>
                <th className="p-2.5">Requirement Title</th>
                <th className="p-2.5">Scope</th>
                <th className="p-2.5">Description</th>
                <th className="p-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {reqLoading ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-slate-400">
                    Loading requirements...
                  </td>
                </tr>
              ) : requirements.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-slate-400">
                    No requirements configured.
                  </td>
                </tr>
              ) : (
                requirements.map((req, idx) => {
                  const isAcad = String(req.classification || "").toLowerCase().includes("acad");
                  return (
                    <tr key={req.id || idx} className="hover:bg-slate-50/50">
                      <td className="p-2.5 text-slate-400">{idx + 1}</td>
                      <td className="p-2.5 font-medium text-slate-900">{req.label}</td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                          {req.classification || "All"}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-500">{req.description || "—"}</td>
                      <td className="p-2.5 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTemplateType(isAcad ? "academic" : "organization");
                              setShowTemplateModal(true);
                            }}
                            className="px-2 py-1 border border-slate-200 rounded text-slate-600 hover:bg-slate-100 text-[11px]"
                          >
                            Template
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditReq(req);
                              setReqForm({
                                classification: req.classification || "all",
                                label: req.label || "",
                                description: req.description || "",
                              });
                              setShowReqModal(true);
                            }}
                            className="px-2 py-1 border border-slate-200 rounded text-slate-600 hover:bg-slate-100 text-[11px]"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteReq(req.id)}
                            className="px-2 py-1 border border-slate-200 rounded text-rose-600 hover:bg-rose-50 text-[11px]"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Requirement Modal */}
      {showReqModal && (
        <div className="fixed inset-0 bg-black/40 z-[1500] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-5 max-w-md w-full border border-slate-200 space-y-4 shadow-lg">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">
                {editReq ? "Edit Requirement" : "Add Requirement"}
              </h3>
              <button
                onClick={() => setShowReqModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveReq} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Requirement Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. OISAA Endorsement Letter"
                  value={reqForm.label}
                  onChange={(e) => setReqForm({ ...reqForm, label: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Classification Scope *
                </label>
                <select
                  value={reqForm.classification}
                  onChange={(e) => setReqForm({ ...reqForm, classification: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none"
                >
                  <option value="all">All Classifications</option>
                  <option value="organization">Student Organization</option>
                  <option value="academic">Academic Department</option>
                  <option value="external">External Client</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Description / Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Must be signed by the Director of OISAA"
                  value={reqForm.description}
                  onChange={(e) => setReqForm({ ...reqForm, description: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReqModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reqFormLoading}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                >
                  {reqFormLoading ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Template Modal */}
      <EndorsementLetterTemplateModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        initialType={selectedTemplateType}
      />
    </div>
  );
}
