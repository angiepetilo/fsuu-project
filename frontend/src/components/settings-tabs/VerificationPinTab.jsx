import { useState, useEffect } from "react";
import api from "@/lib/axios";
import { notify } from "@/lib/notify";
import { Download, FileText, UploadCloud, X, Paperclip } from "lucide-react";
import EndorsementLetterTemplateModal from "@/components/ui/EndorsementLetterTemplateModal";
import ConfirmModal from "@/components/ui/ConfirmModal";
import IosToggle from "@/components/ui/ios-toggle";

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
  const [selectedReqForFormat, setSelectedReqForFormat] = useState(null);
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
    template_file: null,
    template_file_name: "",
    template_file_url: "",
    template_display_mode: "uploaded_file",
    remove_template: false,
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

    const formData = new FormData();
    formData.append("classification", reqForm.classification);
    formData.append("label", reqForm.label);
    formData.append("description", reqForm.description || "");
    formData.append("template_display_mode", reqForm.template_display_mode || "uploaded_file");
    formData.append("office_id", "1");

    if (reqForm.template_file) {
      formData.append("template_file", reqForm.template_file);
    }
    if (reqForm.remove_template) {
      formData.append("remove_template", "1");
    }

    if (editReq) {
      const prev = requirements;
      setRequirements(r => r.map(x => x.id === editReq.id ? {
        ...x,
        classification: reqForm.classification,
        label: reqForm.label,
        description: reqForm.description,
        template_display_mode: reqForm.template_display_mode || "uploaded_file",
        template_file_name: reqForm.remove_template ? null : (reqForm.template_file ? reqForm.template_file.name : x.template_file_name),
        template_file_url: reqForm.remove_template ? null : x.template_file_url,
      } : x));
      setShowReqModal(false);
      setEditReq(null);
      try {
        formData.append("_method", "PUT");
        const res = await api.post(`/general/booking-requirements/${editReq.id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const updated = res.data;
        setRequirements(r => r.map(x => x.id === editReq.id ? updated : x));
        notify.success("Requirement updated.");
      } catch (err) {
        setRequirements(prev);
        setEditReq(editReq);
        setShowReqModal(true);
        const errDetail = err.response?.data?.errors
          ? Object.values(err.response.data.errors).flat().join(" ")
          : (err.response?.data?.message || "Failed to update requirement.");
        notify.error(errDetail);
      } finally {
        setReqFormLoading(false);
      }
    } else {
      const tempId = `temp-${Date.now()}`;
      const prev = requirements;
      setRequirements(r => [...r, {
        id: tempId,
        classification: reqForm.classification,
        label: reqForm.label,
        description: reqForm.description,
        template_display_mode: reqForm.template_display_mode || "uploaded_file",
        template_file_name: reqForm.template_file ? reqForm.template_file.name : null,
      }]);
      setShowReqModal(false);
      try {
        const res = await api.post("/general/booking-requirements", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const saved = res.data;
        setRequirements(r => r.map(x => x.id === tempId ? saved : x));
        notify.success("Requirement added.");
      } catch (err) {
        setRequirements(prev);
        setShowReqModal(true);
        const errDetail = err.response?.data?.errors
          ? Object.values(err.response.data.errors).flat().join(" ")
          : (err.response?.data?.message || "Failed to add requirement.");
        notify.error(errDetail);
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
    } catch (err) {
      setRequirements(prev);
      const errDetail = err.response?.data?.message || "Failed to remove requirement.";
      notify.error(errDetail);
    }
  };

  const handleSaveRequirementFormat = async (updatedFormat) => {
    if (!selectedReqForFormat) return;
    const reqId = selectedReqForFormat.id;

    try {
      const formData = new FormData();
      formData.append("_method", "PUT");
      formData.append("format_content", JSON.stringify(updatedFormat));

      const res = await api.post(`/general/booking-requirements/${reqId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const updated = res.data;
      setRequirements((prev) =>
        prev.map((r) =>
          r.id === reqId ? { ...r, format_content: updated.format_content || updatedFormat } : r
        )
      );
      setSelectedReqForFormat((prev) =>
        prev ? { ...prev, format_content: updated.format_content || updatedFormat } : null
      );
      notify.success("Document format saved.");
    } catch (err) {
      const errDetail = err.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join(" ")
        : (err.response?.data?.message || "Failed to save format.");
      notify.error(errDetail);
    }
  };

  const handleOtpSettingChange = (field, newValue) => {
    if (newValue === false) {
      setConfirmModalState({ open: true, field });
      return;
    }
    setPinSettings(prev => ({ ...prev, [field]: newValue }));
  };

  const ToggleSwitch = ({ checked, onChange, disabled, title, size = "md" }) => (
    <IosToggle
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      title={title}
      size={size}
    />
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

        {/* Section 1: Master Password / PIN Input */}
        <div className={`space-y-2 transition-opacity ${!pinSettings.isEnabled ? "opacity-40 pointer-events-none select-none" : ""}`}>
          <label className="block text-xs font-semibold text-slate-900 dark:text-white">
            Super Administrator Master Password / Verification PIN
          </label>
          <div className="flex items-center gap-3">
            <input
              type={showPin ? "text" : "password"}
              value={pinSettings.masterPin || ""}
              disabled={!isEditing || !pinSettings.isEnabled}
              onChange={(e) => {
                setPinSettings({ ...pinSettings, masterPin: e.target.value });
              }}
              placeholder="Enter master password or PIN"
              className="w-64 p-2 text-xs sm:text-sm bg-white dark:bg-[#1E293B] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed"
            />
            <button
              type="button"
              disabled={!pinSettings.isEnabled}
              onClick={() => setShowPin(!showPin)}
              className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:cursor-not-allowed cursor-pointer"
            >
              {showPin ? "Hide" : "Show"}
            </button>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Master authorization password used by the Super Administrator to verify overrides. Regular staff and users can authorize using their own account credentials.
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

          <div className="border border-slate-200 rounded-xl overflow-x-auto w-full text-xs">
            <table className="w-full text-left min-w-[580px]">
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
                        size="sm"
                        checked={!!currentMatrix.student?.venue_single}
                        disabled={!isEditing || !pinSettings.isEnabled}
                        onChange={(val) => updateMatrixCell('student', 'venue_single', val)}
                      />
                      <span className={`text-[11px] font-medium ${currentMatrix.student?.venue_single ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                        {currentMatrix.student?.venue_single ? "PIN Required" : "No PIN (Direct)"}
                      </span>
                    </div>
                  </td>
                  <td className="p-2.5">
                    <div className="flex items-center gap-2">
                      <ToggleSwitch
                        size="sm"
                        checked={!!currentMatrix.student?.venue_multiday}
                        disabled={!isEditing || !pinSettings.isEnabled}
                        onChange={(val) => updateMatrixCell('student', 'venue_multiday', val)}
                      />
                      <span className={`text-[11px] font-medium ${currentMatrix.student?.venue_multiday ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                        {currentMatrix.student?.venue_multiday ? "PIN Required" : "No PIN (Direct)"}
                      </span>
                    </div>
                  </td>
                  <td className="p-2.5">
                    <div className="flex items-center gap-2">
                      <ToggleSwitch
                        size="sm"
                        checked={!!currentMatrix.student?.equipment}
                        disabled={!isEditing || !pinSettings.isEnabled}
                        onChange={(val) => updateMatrixCell('student', 'equipment', val)}
                      />
                      <span className={`text-[11px] font-medium ${currentMatrix.student?.equipment ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
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
                        size="sm"
                        checked={!!currentMatrix.faculty?.venue_single}
                        disabled={!isEditing || !pinSettings.isEnabled}
                        onChange={(val) => updateMatrixCell('faculty', 'venue_single', val)}
                      />
                      <span className={`text-[11px] font-medium ${currentMatrix.faculty?.venue_single ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                        {currentMatrix.faculty?.venue_single ? "PIN Required" : "No PIN (Direct)"}
                      </span>
                    </div>
                  </td>
                  <td className="p-2.5">
                    <div className="flex items-center gap-2">
                      <ToggleSwitch
                        size="sm"
                        checked={!!currentMatrix.faculty?.venue_multiday}
                        disabled={!isEditing || !pinSettings.isEnabled}
                        onChange={(val) => updateMatrixCell('faculty', 'venue_multiday', val)}
                      />
                      <span className={`text-[11px] font-medium ${currentMatrix.faculty?.venue_multiday ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                        {currentMatrix.faculty?.venue_multiday ? "PIN Required" : "No PIN (Direct)"}
                      </span>
                    </div>
                  </td>
                  <td className="p-2.5">
                    <div className="flex items-center gap-2">
                      <ToggleSwitch
                        size="sm"
                        checked={!!currentMatrix.faculty?.equipment}
                        disabled={!isEditing || !pinSettings.isEnabled}
                        onChange={(val) => updateMatrixCell('faculty', 'equipment', val)}
                      />
                      <span className={`text-[11px] font-medium ${currentMatrix.faculty?.equipment ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
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
                        size="sm"
                        checked={!!currentMatrix.external?.venue_single}
                        disabled={!isEditing || !pinSettings.isEnabled}
                        onChange={(val) => updateMatrixCell('external', 'venue_single', val)}
                      />
                      <span className={`text-[11px] font-medium ${currentMatrix.external?.venue_single ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                        {currentMatrix.external?.venue_single ? "PIN Required" : "No PIN (Direct)"}
                      </span>
                    </div>
                  </td>
                  <td className="p-2.5">
                    <div className="flex items-center gap-2">
                      <ToggleSwitch
                        size="sm"
                        checked={!!currentMatrix.external?.venue_multiday}
                        disabled={!isEditing || !pinSettings.isEnabled}
                        onChange={(val) => updateMatrixCell('external', 'venue_multiday', val)}
                      />
                      <span className={`text-[11px] font-medium ${currentMatrix.external?.venue_multiday ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                        {currentMatrix.external?.venue_multiday ? "PIN Required" : "No PIN (Direct)"}
                      </span>
                    </div>
                  </td>
                  <td className="p-2.5">
                    <div className="flex items-center gap-2">
                      <ToggleSwitch
                        size="sm"
                        checked={!!currentMatrix.external?.equipment}
                        disabled={!isEditing || !pinSettings.isEnabled}
                        onChange={(val) => updateMatrixCell('external', 'equipment', val)}
                      />
                      <span className={`text-[11px] font-medium ${currentMatrix.external?.equipment ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
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
              setReqForm({
                classification: "all",
                label: "",
                description: "",
                template_file: null,
                template_file_name: "",
                template_file_url: "",
                template_display_mode: "uploaded_file",
                remove_template: false,
              });
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
                <th className="p-2.5">Downloadable Template</th>
                <th className="p-2.5">Display Format</th>
                <th className="p-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {reqLoading ? (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-slate-400">
                    Loading requirements...
                  </td>
                </tr>
              ) : requirements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <FileText size={28} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-semibold text-slate-600">No booking requirements configured.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Click "Add Requirement" above to create requirements and upload your template form.</p>
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
                      <td className="p-2.5">
                        {req.template_file_url ? (
                          <a
                            href={req.template_file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-semibold text-[11px] transition-colors"
                            title={req.template_file_name || "Download Template"}
                          >
                            <Download className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                            <span className="truncate max-w-[130px]">{req.template_file_name || "Download"}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 text-xs italic">No file attached</span>
                        )}
                      </td>
                      <td className="p-2.5">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          req.template_display_mode === 'digital_format'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : req.template_display_mode === 'both'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {req.template_display_mode === 'digital_format'
                            ? 'Digital Format'
                            : req.template_display_mode === 'both'
                            ? 'Both (File & Digital)'
                            : 'Uploaded File Only'}
                        </span>
                      </td>
                      <td className="p-2.5 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedReqForFormat(req);
                              setSelectedTemplateType(req.classification || (isAcad ? "academic" : "organization"));
                              setShowTemplateModal(true);
                            }}
                            className="px-2 py-1 border border-slate-200 rounded text-slate-600 hover:bg-slate-100 text-[11px] cursor-pointer"
                            title="View and edit dynamic requirement document format"
                          >
                            Format
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditReq(req);
                              setReqForm({
                                classification: req.classification || "all",
                                label: req.label || "",
                                description: req.description || "",
                                template_file: null,
                                template_file_name: req.template_file_name || "",
                                template_file_url: req.template_file_url || "",
                                template_display_mode: req.template_display_mode || "uploaded_file",
                                remove_template: false,
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
          <div className="bg-white rounded-xl p-5 max-w-2xl w-full border border-slate-200 shadow-lg space-y-4">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {editReq ? "Edit Requirement" : "Add Requirement"}
                </h3>
                <p className="text-xs text-slate-500 font-normal mt-0.5">
                  Configure submission guidelines, signatory requirements, and template file options.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowReqModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveReq} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                {/* Left Column: Core Details */}
                <div className="space-y-3">
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
                      rows={4}
                      placeholder="e.g. Must be signed by the Dean and Director of OISAA"
                      value={reqForm.description}
                      onChange={(e) => setReqForm({ ...reqForm, description: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Right Column: Display Mode & Template Attachment */}
                <div className="space-y-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Template Display Mode *
                    </label>
                    <div className="space-y-1.5">
                      <label className="flex items-start gap-2 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                        <input
                          type="radio"
                          name="template_display_mode"
                          value="uploaded_file"
                          checked={reqForm.template_display_mode === "uploaded_file"}
                          onChange={(e) => setReqForm({ ...reqForm, template_display_mode: e.target.value })}
                          className="mt-0.5 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <span className="block font-medium text-slate-900 text-xs">Uploaded File Only</span>
                          <span className="block text-[11px] text-slate-500 font-normal">Only provide download of your uploaded custom document.</span>
                        </div>
                      </label>
                      <label className="flex items-start gap-2 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                        <input
                          type="radio"
                          name="template_display_mode"
                          value="digital_format"
                          checked={reqForm.template_display_mode === "digital_format"}
                          onChange={(e) => setReqForm({ ...reqForm, template_display_mode: e.target.value })}
                          className="mt-0.5 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <span className="block font-medium text-slate-900 text-xs">Digital Letter Format</span>
                          <span className="block text-[11px] text-slate-500 font-normal">Display digital letter format with university letterhead and body text.</span>
                        </div>
                      </label>
                      <label className="flex items-start gap-2 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                        <input
                          type="radio"
                          name="template_display_mode"
                          value="both"
                          checked={reqForm.template_display_mode === "both"}
                          onChange={(e) => setReqForm({ ...reqForm, template_display_mode: e.target.value })}
                          className="mt-0.5 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <span className="block font-medium text-slate-900 text-xs">Both (Download File &amp; Digital Format)</span>
                          <span className="block text-[11px] text-slate-500 font-normal">Allow users to both download the uploaded file and view the digital letter.</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Downloadable Template Form (Optional)
                    </label>
                    {reqForm.template_file_url && !reqForm.remove_template ? (
                      <div className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                          <a
                            href={reqForm.template_file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-blue-600 hover:underline truncate max-w-[150px]"
                            title={reqForm.template_file_name || "Existing Template File"}
                          >
                            {reqForm.template_file_name || "Attached Template File"}
                          </a>
                        </div>
                        <button
                          type="button"
                          onClick={() => setReqForm(prev => ({ ...prev, remove_template: true, template_file: null }))}
                          className="text-rose-600 hover:text-rose-800 font-medium ml-2 shrink-0 cursor-pointer text-xs"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setReqForm(prev => ({
                                ...prev,
                                template_file: file,
                                template_file_name: file.name,
                                remove_template: false,
                              }));
                            }
                          }}
                          className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-normal file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                        />
                        {reqForm.template_file && (
                          <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                            ✓ Selected: {reqForm.template_file.name}
                          </p>
                        )}
                        <p className="text-[10.5px] text-slate-400 font-normal">
                          PDF, Word, Excel, or Image up to 10MB.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReqModal(false)}
                  className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer font-normal text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reqFormLoading}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium cursor-pointer text-xs"
                >
                  {reqFormLoading ? "Saving..." : (editReq ? "Save Changes" : "Save Requirement")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Template Modal */}
      <EndorsementLetterTemplateModal
        isOpen={showTemplateModal}
        onClose={() => {
          setShowTemplateModal(false);
          setSelectedReqForFormat(null);
        }}
        requirement={selectedReqForFormat}
        onSaveTemplate={handleSaveRequirementFormat}
        initialType={selectedTemplateType}
        allowEdit={true}
        showTypeTabs={!selectedReqForFormat}
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
