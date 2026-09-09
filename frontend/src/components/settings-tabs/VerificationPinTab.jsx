import { useState, useEffect } from "react";
import api from "@/lib/axios";
import { notify } from "@/lib/notify";
import EndorsementLetterTemplateModal from "@/components/ui/EndorsementLetterTemplateModal";
import ConfirmModal from "@/components/ui/ConfirmModal";

export default function VerificationPinTab({
  pinConfig: externalPinConfig,
  setPinConfig: setExternalPinConfig,
  pinSavedFeedback,
  handleSavePinConfig: externalHandleSavePinConfig,
  showMsg: externalShowMsg,
}) {
  const DEFAULT_APPLICABILITY_MATRIX = {
    student: { venue_single: false, venue_multiday: true, equipment: false },
    faculty: { venue_single: false, venue_multiday: true, equipment: false },
    external: { venue_single: true, venue_multiday: true, equipment: true },
  };

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
    venueVerifyEmail: true,
    venueVerifyPhone: false,
    equipmentVerifyEmail: true,
    equipmentVerifyPhone: false,
    applicabilityMatrix: DEFAULT_APPLICABILITY_MATRIX,
  });

  const [pinLoading, setPinLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplateType, setSelectedTemplateType] = useState("organization");
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [originalPinSettings, setOriginalPinSettings] = useState(null);

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

  const [confirmModalState, setConfirmModalState] = useState({ open: false, field: null });

  const fetchPinSettings = async () => {
    setPinLoading(true);
    try {
      const res = await api.get("/general/verification-pin");
      if (res.data) {
        const isHashed = typeof res.data.masterPin === 'string' && (res.data.masterPin.startsWith('$2y$') || res.data.masterPin.startsWith('$2a$'));
        const loaded = {
          masterPin: isHashed ? "" : (res.data.masterPin || "123456"),
          isEnabled: res.data.isEnabled !== false,
          requirePinOutsideHours: res.data.requirePinOutsideHours !== false,
          requirePinMultiDayVenue: res.data.requirePinMultiDayVenue !== false,
          requirePinMultiDayEquipment: !!res.data.requirePinMultiDayEquipment,
          enableExternalVenue: res.data.enableExternalVenue !== false,
          enableExternalEquipment: res.data.enableExternalEquipment !== false,
          requirePinForStudent: !!res.data.requirePinForStudent,
          pinMode: res.data.pinMode || "optional",
          venueVerifyEmail: res.data.venueVerifyEmail !== false,
          venueVerifyPhone: res.data.venueVerifyPhone === true,
          equipmentVerifyEmail: res.data.equipmentVerifyEmail !== false,
          equipmentVerifyPhone: res.data.equipmentVerifyPhone === true,
          applicabilityMatrix: res.data.applicabilityMatrix || DEFAULT_APPLICABILITY_MATRIX,
        };
        setPinSettings(loaded);
        setOriginalPinSettings(loaded);
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
            applicabilityMatrix: loaded.applicabilityMatrix,
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
            applicabilityMatrix: parsed.applicabilityMatrix || DEFAULT_APPLICABILITY_MATRIX,
          }));
          setOriginalPinSettings(prev => ({
            ...prev,
            masterPin: parsed.pin || prev.masterPin,
            requirePinOutsideHours: parsed.requireOutsideHours !== false,
            requirePinMultiDayVenue: parsed.requireMultiDayVenue !== false,
            enableExternalVenue: parsed.enableExternal !== false,
            enableExternalEquipment: parsed.enableExternal !== false,
            applicabilityMatrix: parsed.applicabilityMatrix || DEFAULT_APPLICABILITY_MATRIX,
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
      const res = await api.get("/general/booking-requirements");
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
        isEnabled: !!pinSettings.isEnabled,
        requirePinOutsideHours: !!pinSettings.requirePinOutsideHours,
        requirePinMultiDayVenue: !!pinSettings.requirePinMultiDayVenue,
        requirePinMultiDayEquipment: false,
        enableExternalVenue: !!pinSettings.enableExternalVenue,
        enableExternalEquipment: !!pinSettings.enableExternalEquipment,
        requirePinForStudent: false,
        pinMode: "optional",
        venueVerifyEmail: !!pinSettings.venueVerifyEmail,
        venueVerifyPhone: !!pinSettings.venueVerifyPhone,
        equipmentVerifyEmail: !!pinSettings.equipmentVerifyEmail,
        equipmentVerifyPhone: !!pinSettings.equipmentVerifyPhone,
        applicabilityMatrix: pinSettings.applicabilityMatrix || DEFAULT_APPLICABILITY_MATRIX,
      };
      if (pinSettings.masterPin && !pinSettings.masterPin.startsWith('$2y$')) {
        payload.masterPin = pinSettings.masterPin;
      }

      const res = await api.put("/general/verification-pin", payload);
      if (res.data) {
        const updated = { ...pinSettings, ...res.data, masterPin: payload.masterPin || pinSettings.masterPin };
        setPinSettings(updated);
        setOriginalPinSettings(updated);
      } else {
        setOriginalPinSettings(payload);
      }
      setIsEditing(false);

      // Save local storage for instant sync across tabs
      try {
        localStorage.setItem("fsuu_verification_pin_settings", JSON.stringify({
          pin: payload.masterPin,
          enabled: payload.isEnabled,
          requireOutsideHours: payload.requirePinOutsideHours,
          requireMultiDayVenue: payload.requirePinMultiDayVenue,
          requireMultiDayEquipment: payload.requirePinMultiDayEquipment,
          enableExternal: payload.enableExternalVenue,
          applicabilityMatrix: payload.applicabilityMatrix,
        }));
        window.dispatchEvent(new Event("pin_settings_updated"));
      } catch {}

      const msg = "Verification PIN settings saved successfully.";
      setFeedbackMsg(msg);
      if (externalShowMsg) {
        externalShowMsg(msg);
      } else {
        notify.success("Settings Saved", msg);
      }

      if (setExternalPinConfig) {
        setExternalPinConfig(payload);
      }
    } catch {
      const errMsg = "Failed to save verification PIN settings.";
      if (externalShowMsg) {
        externalShowMsg(errMsg, true);
      } else {
        notify.error("Error", errMsg);
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
        await api.put(`/general/booking-requirements/${editReq.id}`, payload);
        notify.success("Requirement updated.");
      } catch {
        setRequirements(prev);
        setEditReq(editReq);
        setShowReqModal(true);
        notify.error("Failed to update requirement.");
      } finally {
        setReqFormLoading(false);
      }
    } else {
      const tempId = `temp-${Date.now()}`;
      const prev = requirements;
      setRequirements(r => [...r, { ...payload, id: tempId }]);
      setShowReqModal(false);
      try {
        const res = await api.post("/general/booking-requirements", payload);
        const saved = res.data;
        setRequirements(r => r.map(x => x.id === tempId ? saved : x));
        notify.success("Requirement added.");
      } catch {
        setRequirements(prev);
        setShowReqModal(true);
        notify.error("Failed to add requirement.");
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
      await api.delete(`/general/booking-requirements/${id}`);
      notify.success("Requirement removed.");
    } catch {
      setRequirements(prev);
      notify.error("Failed to remove requirement.");
    }
  };

  const handleOtpSettingChange = (field, newValue) => {
    if (newValue === false) {
      setConfirmModalState({ open: true, field });
      return;
    }
    setPinSettings(prev => ({ ...prev, [field]: newValue }));
  };

  const ToggleSwitch = ({ checked, onChange, disabled, title }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      title={title}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        disabled ? "opacity-40 cursor-not-allowed" : ""
      } ${checked ? "bg-blue-600" : "bg-slate-300"}`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );

  const updateMatrixCell = (group, column, val) => {
    if (!isEditing || !pinSettings.isEnabled) return;
    setPinSettings(prev => ({
      ...prev,
      applicabilityMatrix: {
        ...(prev.applicabilityMatrix || DEFAULT_APPLICABILITY_MATRIX),
        [group]: {
          ...((prev.applicabilityMatrix || DEFAULT_APPLICABILITY_MATRIX)[group] || {}),
          [column]: val,
        },
      },
    }));
  };

  const currentMatrix = pinSettings.applicabilityMatrix || DEFAULT_APPLICABILITY_MATRIX;

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
              Configure master authorization code and trigger conditions for facility reservations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-600">
              {pinSettings.isEnabled ? "PIN Protection Active" : "PIN Protection Disabled"}
            </span>
            <ToggleSwitch
              checked={pinSettings.isEnabled !== false}
              disabled={!isEditing}
              onChange={(val) => setPinSettings({ ...pinSettings, isEnabled: val })}
            />
          </div>
        </div>

        {/* Disabled banner */}
        {!pinSettings.isEnabled && (
          <div className="flex items-center gap-2 px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs font-semibold text-amber-700">
            <span>⚠</span>
            PIN Protection is currently <strong>disabled</strong>. All PIN trigger rules are inactive.
          </div>
        )}

        {/* Section 1: Master PIN Input */}
        <div className={`space-y-2 transition-opacity ${!pinSettings.isEnabled ? "opacity-40 pointer-events-none select-none" : ""}`}>
          <label className="block text-xs font-semibold text-slate-900">
            Master Security PIN (6-Digit Code)
          </label>
          <div className="flex items-center gap-3">
            <input
              type={showPin ? "text" : "password"}
              maxLength={6}
              value={pinSettings.masterPin || ""}
              disabled={!isEditing || !pinSettings.isEnabled}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                setPinSettings({ ...pinSettings, masterPin: val });
              }}
              placeholder="123456"
              className="w-48 p-2 text-sm font-mono tracking-widest bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
            />
            <button
              type="button"
              disabled={!pinSettings.isEnabled}
              onClick={() => setShowPin(!showPin)}
              className="px-3 py-2 text-xs text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {showPin ? "Hide PIN" : "Show PIN"}
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            Issued by the AVR Head / Administrator to authorize special booking requests.
          </p>
        </div>

        {/* Section 2: Trigger Rules (Sleek plain divider layout, no cards, toggle icons) */}
        <div className={`space-y-3 pt-3 border-t border-slate-100 transition-opacity ${!pinSettings.isEnabled ? "opacity-40 pointer-events-none select-none" : ""}`}>
          <div>
            <h4 className="text-xs font-semibold text-slate-900">
              Trigger Rules Checklist
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Select which conditions mandate administrative verification PIN.
            </p>
          </div>

          <div className="divide-y divide-slate-100 border-y border-slate-100">
            {/* Rule 1: External Users */}
            <div className="flex items-center justify-between py-3">
              <div className="space-y-0.5 pr-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-900">
                    External Users: Venue Bookings &amp; Equipment Borrowings
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-700 rounded">
                    Mandatory
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Enforce PIN authentication for all external client reservations and equipment rentals.
                </p>
              </div>
              <ToggleSwitch
                checked={pinSettings.enableExternalVenue !== false && pinSettings.enableExternalEquipment !== false}
                disabled={!isEditing || !pinSettings.isEnabled}
                onChange={(val) => {
                  setPinSettings({
                    ...pinSettings,
                    enableExternalVenue: val,
                    enableExternalEquipment: val,
                  });
                }}
              />
            </div>

            {/* Rule 2: Multi-Day Venue Bookings */}
            <div className="flex items-center justify-between py-3">
              <div className="space-y-0.5 pr-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-900">
                    Multi-Day Venue Bookings: Faculty &amp; Students (2+ Days)
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-700 rounded">
                    Mandatory
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Require administrative PIN verification when reserving venues spanning two or more days.
                </p>
              </div>
              <ToggleSwitch
                checked={pinSettings.requirePinMultiDayVenue !== false}
                disabled={!isEditing || !pinSettings.isEnabled}
                onChange={(val) => setPinSettings({ ...pinSettings, requirePinMultiDayVenue: val })}
              />
            </div>

            {/* Rule 3: Outside Campus Office Hours */}
            <div className="flex items-center justify-between py-3">
              <div className="space-y-0.5 pr-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-900">
                    Outside Campus Office Hours
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 rounded">
                    Configurable
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Mandate administrator verification for schedules booked outside standard university hours.
                </p>
              </div>
              <ToggleSwitch
                checked={pinSettings.requirePinOutsideHours !== false}
                disabled={!isEditing || !pinSettings.isEnabled}
                onChange={(val) => setPinSettings({ ...pinSettings, requirePinOutsideHours: val })}
              />
            </div>
          </div>
        </div>

        {/* Section 3: OTP Verification Settings (Sleek plain divider layout, no cards, toggle icons) */}
        <div className={`space-y-3 pt-3 border-t border-slate-100 transition-opacity ${!pinSettings.isEnabled ? "opacity-40 pointer-events-none select-none" : ""}`}>
          <div>
            <h4 className="text-xs font-semibold text-slate-900">
              OTP Verification Settings
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Enable or disable one-time password verification channels for email and SMS contacts.
            </p>
          </div>

          <div className="divide-y divide-slate-100 border-y border-slate-100">
            {/* Venue Email */}
            <div className="flex items-center justify-between py-3">
              <div className="space-y-0.5 pr-4">
                <span className="text-xs font-semibold text-slate-900 block">
                  Venue Booking: Verify Email
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Requires 6-digit OTP code sent via verified email address.
                </span>
              </div>
              <ToggleSwitch
                checked={pinSettings.venueVerifyEmail !== false}
                disabled={!isEditing || !pinSettings.isEnabled}
                onChange={(val) => handleOtpSettingChange('venueVerifyEmail', val)}
              />
            </div>

            {/* Venue Phone */}
            <div className="flex items-center justify-between py-3">
              <div className="space-y-0.5 pr-4">
                <span className="text-xs font-semibold text-slate-900 block">
                  Venue Booking: Verify Phone
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Requires 6-digit OTP code sent via SMS mobile channel.
                </span>
              </div>
              <ToggleSwitch
                checked={pinSettings.venueVerifyPhone === true}
                disabled={!isEditing || !pinSettings.isEnabled}
                onChange={(val) => handleOtpSettingChange('venueVerifyPhone', val)}
              />
            </div>

            {/* Equipment Email */}
            <div className="flex items-center justify-between py-3">
              <div className="space-y-0.5 pr-4">
                <span className="text-xs font-semibold text-slate-900 block">
                  Equipment Borrowing: Verify Email
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Requires 6-digit OTP code sent via verified email address.
                </span>
              </div>
              <ToggleSwitch
                checked={pinSettings.equipmentVerifyEmail !== false}
                disabled={!isEditing || !pinSettings.isEnabled}
                onChange={(val) => handleOtpSettingChange('equipmentVerifyEmail', val)}
              />
            </div>

            {/* Equipment Phone */}
            <div className="flex items-center justify-between py-3">
              <div className="space-y-0.5 pr-4">
                <span className="text-xs font-semibold text-slate-900 block">
                  Equipment Borrowing: Verify Phone
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Requires 6-digit OTP code sent via SMS mobile channel.
                </span>
              </div>
              <ToggleSwitch
                checked={pinSettings.equipmentVerifyPhone === true}
                disabled={!isEditing || !pinSettings.isEnabled}
                onChange={(val) => handleOtpSettingChange('equipmentVerifyPhone', val)}
              />
            </div>
          </div>
        </div>

        {/* Dynamic Applicability Matrix Table */}
        <div className="space-y-2 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-semibold text-slate-900">
                Applicability Matrix
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Dynamic classification enforcement rules. Click edit to toggle requirement per service type.
              </p>
            </div>
            {isEditing && (
              <span className="text-[11px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                Editing Matrix Rules
              </span>
            )}
          </div>

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
                {/* Student */}
                <tr className="hover:bg-slate-50/50">
                  <td className="p-2.5 font-medium text-slate-900">Student</td>
                  <td className="p-2.5">
                    <div className="flex items-center gap-2">
                      <ToggleSwitch
                        checked={!!currentMatrix.student?.venue_single}
                        disabled={!isEditing || !pinSettings.isEnabled}
                        onChange={(val) => updateMatrixCell('student', 'venue_single', val)}
                      />
                      <span className={`text-[11px] font-medium ${currentMatrix.student?.venue_single ? 'text-blue-600 font-semibold' : 'text-slate-500'}`}>
                        {currentMatrix.student?.venue_single ? "PIN Required" : "No PIN (Direct)"}
                      </span>
                    </div>
                  </td>
                  <td className="p-2.5">
                    <div className="flex items-center gap-2">
                      <ToggleSwitch
                        checked={!!currentMatrix.student?.venue_multiday}
                        disabled={!isEditing || !pinSettings.isEnabled}
                        onChange={(val) => updateMatrixCell('student', 'venue_multiday', val)}
                      />
                      <span className={`text-[11px] font-medium ${currentMatrix.student?.venue_multiday ? 'text-blue-600 font-semibold' : 'text-slate-500'}`}>
                        {currentMatrix.student?.venue_multiday ? "PIN Required" : "No PIN (Direct)"}
                      </span>
                    </div>
                  </td>
                  <td className="p-2.5">
                    <div className="flex items-center gap-2">
                      <ToggleSwitch
                        checked={!!currentMatrix.student?.equipment}
                        disabled={!isEditing || !pinSettings.isEnabled}
                        onChange={(val) => updateMatrixCell('student', 'equipment', val)}
                      />
                      <span className={`text-[11px] font-medium ${currentMatrix.student?.equipment ? 'text-blue-600 font-semibold' : 'text-slate-500'}`}>
                        {currentMatrix.student?.equipment ? "PIN Required" : "No PIN (Direct)"}
                      </span>
                    </div>
                  </td>
                </tr>

                {/* Faculty / Staff */}
                <tr className="hover:bg-slate-50/50">
                  <td className="p-2.5 font-medium text-slate-900">Faculty / Staff</td>
                  <td className="p-2.5">
                    <div className="flex items-center gap-2">
                      <ToggleSwitch
                        checked={!!currentMatrix.faculty?.venue_single}
                        disabled={!isEditing || !pinSettings.isEnabled}
                        onChange={(val) => updateMatrixCell('faculty', 'venue_single', val)}
                      />
                      <span className={`text-[11px] font-medium ${currentMatrix.faculty?.venue_single ? 'text-blue-600 font-semibold' : 'text-slate-500'}`}>
                        {currentMatrix.faculty?.venue_single ? "PIN Required" : "No PIN (Direct)"}
                      </span>
                    </div>
                  </td>
                  <td className="p-2.5">
                    <div className="flex items-center gap-2">
                      <ToggleSwitch
                        checked={!!currentMatrix.faculty?.venue_multiday}
                        disabled={!isEditing || !pinSettings.isEnabled}
                        onChange={(val) => updateMatrixCell('faculty', 'venue_multiday', val)}
                      />
                      <span className={`text-[11px] font-medium ${currentMatrix.faculty?.venue_multiday ? 'text-blue-600 font-semibold' : 'text-slate-500'}`}>
                        {currentMatrix.faculty?.venue_multiday ? "PIN Required" : "No PIN (Direct)"}
                      </span>
                    </div>
                  </td>
                  <td className="p-2.5">
                    <div className="flex items-center gap-2">
                      <ToggleSwitch
                        checked={!!currentMatrix.faculty?.equipment}
                        disabled={!isEditing || !pinSettings.isEnabled}
                        onChange={(val) => updateMatrixCell('faculty', 'equipment', val)}
                      />
                      <span className={`text-[11px] font-medium ${currentMatrix.faculty?.equipment ? 'text-blue-600 font-semibold' : 'text-slate-500'}`}>
                        {currentMatrix.faculty?.equipment ? "PIN Required" : "No PIN (Direct)"}
                      </span>
                    </div>
                  </td>
                </tr>

                {/* External Client */}
                <tr className="hover:bg-slate-50/50">
                  <td className="p-2.5 font-medium text-slate-900">External Client</td>
                  <td className="p-2.5">
                    <div className="flex items-center gap-2">
                      <ToggleSwitch
                        checked={!!currentMatrix.external?.venue_single}
                        disabled={!isEditing || !pinSettings.isEnabled}
                        onChange={(val) => updateMatrixCell('external', 'venue_single', val)}
                      />
                      <span className={`text-[11px] font-medium ${currentMatrix.external?.venue_single ? 'text-blue-600 font-semibold' : 'text-slate-500'}`}>
                        {currentMatrix.external?.venue_single ? "PIN Required" : "No PIN (Direct)"}
                      </span>
                    </div>
                  </td>
                  <td className="p-2.5">
                    <div className="flex items-center gap-2">
                      <ToggleSwitch
                        checked={!!currentMatrix.external?.venue_multiday}
                        disabled={!isEditing || !pinSettings.isEnabled}
                        onChange={(val) => updateMatrixCell('external', 'venue_multiday', val)}
                      />
                      <span className={`text-[11px] font-medium ${currentMatrix.external?.venue_multiday ? 'text-blue-600 font-semibold' : 'text-slate-500'}`}>
                        {currentMatrix.external?.venue_multiday ? "PIN Required" : "No PIN (Direct)"}
                      </span>
                    </div>
                  </td>
                  <td className="p-2.5">
                    <div className="flex items-center gap-2">
                      <ToggleSwitch
                        checked={!!currentMatrix.external?.equipment}
                        disabled={!isEditing || !pinSettings.isEnabled}
                        onChange={(val) => updateMatrixCell('external', 'equipment', val)}
                      />
                      <span className={`text-[11px] font-medium ${currentMatrix.external?.equipment ? 'text-blue-600 font-semibold' : 'text-slate-500'}`}>
                        {currentMatrix.external?.equipment ? "PIN Required" : "No PIN (Direct)"}
                      </span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Save Settings Action */}
        <div className="flex justify-end pt-3 border-t border-slate-100 gap-2">
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Edit Settings
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  if (originalPinSettings) setPinSettings(originalPinSettings);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saveLoading || pinLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                {saveLoading ? "Saving..." : "Save Settings"}
              </button>
            </>
          )}
        </div>
      </form>

      {/* Section 3: Booking Requirements */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h4 className="text-xs font-extrabold text-slate-900">
              Booking Requirements
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
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-xs transition-all self-start sm:self-auto cursor-pointer flex items-center gap-1.5"
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
        allowEdit={true}
        showTypeTabs={true}
      />

      <ConfirmModal
        open={confirmModalState.open}
        onClose={() => setConfirmModalState({ open: false, field: null })}
        onConfirm={() => {
          if (confirmModalState.field) {
            setPinSettings(prev => ({ ...prev, [confirmModalState.field]: false }));
          }
          setConfirmModalState({ open: false, field: null });
        }}
        variant="warning"
        title="Disable OTP Verification"
        message={`Are you sure you want to disable OTP Verification for ${
          confirmModalState.field?.startsWith('venue') ? 'Venue Booking' : 'Equipment Borrowing'
        }?`}
        confirmLabel="Yes, Disable"
      />
    </div>
  );
}
