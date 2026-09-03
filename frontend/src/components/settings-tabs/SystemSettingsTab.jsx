import { useState, useEffect, useRef, useCallback } from "react";
import {
  Loader2, CheckCircle2, Globe, Phone, Mail, RotateCcw, AlertCircle
} from "lucide-react";
import api from "@/lib/axios";
import notify from "@/lib/notify";

export default function SystemSettingsTab() {
  const [settings, setSettings] = useState({
    system_name: "FSUU Facilities & Equipment Booking System",
    organization_name: "Father Saturnino Urios University",
    university_name: "Father Saturnino Urios University",
    header_brand_text: "Urios",
    system_logo: "",
    facebook_url: "https://facebook.com/urios.official",
    telephone_no: "(085) 342-1830",
    contact_email: "support.booking@fsuu.edu.ph",
    contact_phone: "(085) 342-1830",
    timezone: "Asia/Manila (UTC+8)",
    allow_advance_equipment_booking: true,
    auto_shift_tomorrow_after_hours: true,
    max_items_per_borrow: 5,
  });

  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState("idle"); // 'idle' | 'saving' | 'saved' | 'error'
  const debounceTimerRef = useRef(null);
  const isInitialMount = useRef(true);

  // Load from backend
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get("/general/system-settings");
      if (res.data) {
        const merged = {
          ...res.data,
          university_name: res.data.university_name || res.data.organization_name || "Father Saturnino Urios University",
          telephone_no: res.data.telephone_no || res.data.contact_phone || "(085) 342-1830",
        };
        setSettings(merged);
        localStorage.setItem("fsuu_system_settings", JSON.stringify(res.data));
      }
    } catch (err) {
      console.warn("Failed to load backend system settings, using local cache:", err);
      try {
        const saved = localStorage.getItem("fsuu_system_settings");
        if (saved) {
          const parsed = JSON.parse(saved);
          setSettings(parsed);
        }
      } catch {}
    } finally {
      setLoading(false);
      setTimeout(() => {
        isInitialMount.current = false;
      }, 300);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Dynamic Auto-Save Function
  const persistSettings = useCallback(async (currentSettings) => {
    setSaveStatus("saving");
    const payload = {
      ...currentSettings,
      organization_name: currentSettings.university_name || currentSettings.organization_name,
      contact_phone: currentSettings.telephone_no || currentSettings.contact_phone,
    };

    try {
      const res = await api.put("/general/system-settings", payload);
      const updated = res.data?.settings || payload;
      localStorage.setItem("fsuu_system_settings", JSON.stringify(updated));
      window.dispatchEvent(new Event("fsuu_system_settings_updated"));
      setSaveStatus("saved");
      setTimeout(() => {
        setSaveStatus((prev) => (prev === "saved" ? "idle" : prev));
      }, 2500);
    } catch (err) {
      console.error("Auto-save system settings failed:", err);
      setSaveStatus("error");
      notify.error("Error", err.response?.data?.message || "Failed to auto-save settings.");
    }
  }, []);

  const handleChange = (field, value) => {
    setSettings((prev) => {
      const next = { ...prev, [field]: value };
      if (!isInitialMount.current) {
        setSaveStatus("saving");
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
          persistSettings(next);
        }, 600);
      }
      return next;
    });
  };

  const handleReset = async () => {
    const defaultSettings = {
      system_name: "FSUU Facilities & Equipment Booking System",
      organization_name: "Father Saturnino Urios University",
      university_name: "Father Saturnino Urios University",
      header_brand_text: "Urios",
      system_logo: "",
      facebook_url: "https://facebook.com/urios.official",
      telephone_no: "(085) 342-1830",
      contact_email: "support.booking@fsuu.edu.ph",
      contact_phone: "(085) 342-1830",
      timezone: "Asia/Manila (UTC+8)",
      allow_advance_equipment_booking: true,
      auto_shift_tomorrow_after_hours: true,
      max_items_per_borrow: 5,
    };
    setSettings(defaultSettings);
    await persistSettings(defaultSettings);
    notify.success("Settings Reset", "Default settings restored and dynamically saved.");
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
        <Loader2 className="animate-spin inline mr-2 text-blue-600" size={20} />
        <span className="text-xs font-bold">Loading system settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Header Summary & Live Status */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-slate-900 tracking-tight">System Settings</h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Global application branding, university details, and contact channels.
          </p>
        </div>

        {/* Dynamic Saving Indicator & Action */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border bg-slate-50 border-slate-200">
            {saveStatus === "saving" && (
              <span className="text-blue-600 flex items-center gap-1.5">
                <Loader2 size={13} className="animate-spin" />
                <span>Saving changes...</span>
              </span>
            )}
            {saveStatus === "saved" && (
              <span className="text-emerald-600 flex items-center gap-1.5">
                <CheckCircle2 size={13} />
                <span>All changes saved dynamically</span>
              </span>
            )}
            {saveStatus === "error" && (
              <span className="text-rose-600 flex items-center gap-1.5">
                <AlertCircle size={13} />
                <span>Save failed</span>
              </span>
            )}
            {saveStatus === "idle" && (
              <span className="text-slate-500 flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-slate-400" />
                <span>Auto-save active</span>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-2xs"
            title="Reset to factory defaults"
          >
            <RotateCcw size={13} />
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 gap-6">
        {/* University / System Info */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-black text-slate-900">University &amp; Branding</h4>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Displayed across headers, public footers, and official export documents.
              </p>
            </div>
            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
              Live Dynamic Field
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">University Name</label>
              <input
                type="text"
                value={settings.university_name || settings.organization_name || ""}
                onChange={(e) => {
                  handleChange("university_name", e.target.value);
                  handleChange("organization_name", e.target.value);
                }}
                className="w-full px-3.5 py-2.5 border rounded-xl text-xs font-semibold text-slate-900 bg-white border-slate-200 focus:border-blue-600 focus:outline-none transition-colors shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Header Branding Text</label>
              <input
                type="text"
                value={settings.header_brand_text || ""}
                onChange={(e) => handleChange("header_brand_text", e.target.value)}
                placeholder="e.g., Urios or FSUU"
                className="w-full px-3.5 py-2.5 border rounded-xl text-xs font-semibold text-slate-900 bg-white border-slate-200 focus:border-blue-600 focus:outline-none transition-colors shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">System Display Title</label>
              <input
                type="text"
                value={settings.system_name || ""}
                onChange={(e) => handleChange("system_name", e.target.value)}
                className="w-full px-3.5 py-2.5 border rounded-xl text-xs font-semibold text-slate-900 bg-white border-slate-200 focus:border-blue-600 focus:outline-none transition-colors shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Facebook Page URL</label>
              <div className="relative">
                <Globe size={14} className="absolute left-3 top-3 text-blue-600" />
                <input
                  type="url"
                  placeholder="https://facebook.com/..."
                  value={settings.facebook_url || ""}
                  onChange={(e) => handleChange("facebook_url", e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border rounded-xl text-xs font-semibold text-slate-900 bg-white border-slate-200 focus:border-blue-600 focus:outline-none transition-colors shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Telephone No.</label>
              <div className="relative">
                <Phone size={13} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="(085) 342-1830"
                  value={settings.telephone_no || settings.contact_phone || ""}
                  onChange={(e) => {
                    handleChange("telephone_no", e.target.value);
                    handleChange("contact_phone", e.target.value);
                  }}
                  className="w-full pl-8 pr-3 py-2.5 border rounded-xl text-xs font-semibold text-slate-900 bg-white border-slate-200 focus:border-blue-600 focus:outline-none transition-colors shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Support Email</label>
              <div className="relative">
                <Mail size={13} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="email"
                  value={settings.contact_email || ""}
                  onChange={(e) => handleChange("contact_email", e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 border rounded-xl text-xs font-semibold text-slate-900 bg-white border-slate-200 focus:border-blue-600 focus:outline-none transition-colors shadow-2xs"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
