import { useState, useEffect, useRef, useCallback } from "react";
import {
  Loader2, CheckCircle2, Globe, Phone, Mail, RotateCcw, AlertCircle,
  Edit3, Save, X, Lock, Eye, EyeOff, MessageSquare, Server, Shield,
  Send, Sun, Moon, Check
} from "lucide-react";
import api from "@/lib/axios";
import notify from "@/lib/notify";
import { useTheme } from "@/context/ThemeContext";

const inputCls = (editing) =>
  `w-full px-3.5 py-2.5 border rounded-xl text-xs font-semibold text-slate-900 transition-colors shadow-2xs ${
    editing
      ? "bg-white border-blue-300 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
      : "bg-slate-50 border-slate-200 text-slate-600 cursor-default focus:outline-none"
  }`;

const labelCls = "block text-xs font-bold text-slate-700 mb-1";

export default function SystemSettingsTab() {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState({
    system_name: "FSUU Facilities & Equipment Booking System",
    organization_name: "Father Saturnino Urios University",
    university_name: "Father Saturnino Urios University",
    header_brand_text: "Urios",
    system_logo: "",
    facebook_url: "https://www.facebook.com/fsuubutuan",
    facebook_name: "Father Saturnino Urios University",
    telephone_no: "(085) 342-1830",
    contact_email: "support.booking@fsuu.edu.ph",
    contact_phone: "(085) 342-1830",
    timezone: "Asia/Manila (UTC+8)",
    allow_advance_equipment_booking: true,
    auto_shift_tomorrow_after_hours: true,
    max_items_per_borrow: 5,
    // Email / SMTP
    smtp_host: "",
    smtp_port: "",
    smtp_username: "",
    smtp_password: "",
    smtp_encryption: "tls",
    mail_from_address: "",
    mail_from_name: "",
    // SMS
    sms_api_key: "",
    sms_api_url: "",
  });

  const [savedSettings, setSavedSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSmsKey, setShowSmsKey] = useState(false);
  const [testEmailAddr, setTestEmailAddr] = useState("");
  const [testingEmail, setTestingEmail] = useState(false);

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
        setSavedSettings(merged);
        localStorage.setItem("fsuu_system_settings", JSON.stringify(res.data));
      }
    } catch (err) {
      console.warn("Failed to load backend system settings:", err);
      try {
        const saved = localStorage.getItem("fsuu_system_settings");
        if (saved) {
          const parsed = JSON.parse(saved);
          setSettings(parsed);
          setSavedSettings(parsed);
        }
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleCancelEdit = () => {
    if (savedSettings) setSettings(savedSettings);
    setEditMode(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      ...settings,
      organization_name: settings.university_name || settings.organization_name,
      contact_phone: settings.telephone_no || settings.contact_phone,
    };
    try {
      const res = await api.put("/general/system-settings", payload);
      const updated = res.data?.settings || payload;
      setSavedSettings(updated);
      localStorage.setItem("fsuu_system_settings", JSON.stringify(updated));
      window.dispatchEvent(new Event("fsuu_system_settings_updated"));
      setEditMode(false);
      notify.success("Settings Saved", "System settings have been updated successfully.");
    } catch (err) {
      notify.error("Save Failed", err.response?.data?.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmailAddr) { notify.error("Required", "Enter a test email address."); return; }
    setTestingEmail(true);
    try {
      const res = await api.post("/general/system-settings/test-smtp", { test_email: testEmailAddr });
      notify.success("Test Email Sent", res.data?.message || "Test email dispatched successfully.");
    } catch (err) {
      notify.error("SMTP Test Failed", err.response?.data?.message || "Failed to send test email.");
    } finally {
      setTestingEmail(false);
    }
  };

  const handleReset = async () => {
    const defaultSettings = {
      system_name: "FSUU Facilities & Equipment Booking System",
      organization_name: "Father Saturnino Urios University",
      university_name: "Father Saturnino Urios University",
      header_brand_text: "Urios",
      system_logo: "",
      facebook_url: "",
      telephone_no: "(085) 342-1830",
      contact_email: "support.booking@fsuu.edu.ph",
      contact_phone: "(085) 342-1830",
      timezone: "Asia/Manila (UTC+8)",
      allow_advance_equipment_booking: true,
      auto_shift_tomorrow_after_hours: true,
      max_items_per_borrow: 5,
    };
    setSettings(defaultSettings);
    setSavedSettings(defaultSettings);
    try {
      await api.put("/general/system-settings", defaultSettings);
      localStorage.setItem("fsuu_system_settings", JSON.stringify(defaultSettings));
      window.dispatchEvent(new Event("fsuu_system_settings_updated"));
      notify.success("Settings Reset", "Default settings restored.");
    } catch {}
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
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">System Settings</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Global application branding, university details, email, SMS, and contact channels.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!editMode ? (
              <>
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  <RotateCcw size={12} />
                  Reset Defaults
                </button>
                <button
                  type="button"
                  onClick={() => setEditMode(true)}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Edit Settings
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {saving ? <Loader2 size={12} className="animate-spin" /> : null}
                  {saving ? "Saving..." : "Save Settings"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── 0. Theme & Appearance ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-black text-slate-900">Theme & Appearance</h4>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Choose between light and dark mode for the application interface.
            </p>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                theme === "light"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Sun size={13} />
              Light
            </button>
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                theme === "dark"
                  ? "bg-slate-800 text-white shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Moon size={13} />
              Dark
            </button>
          </div>
        </div>
      </div>

      {/* ── 1. University & Branding ── */}
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
            <label className={labelCls}>University Name</label>
            <input
              type="text"
              disabled={!editMode}
              value={settings.university_name || settings.organization_name || ""}
              onChange={(e) => { handleChange("university_name", e.target.value); handleChange("organization_name", e.target.value); }}
              className={inputCls(editMode)}
            />
          </div>

          <div>
            <label className={labelCls}>Header Branding Text</label>
            <input
              type="text"
              disabled={!editMode}
              value={settings.header_brand_text || ""}
              onChange={(e) => handleChange("header_brand_text", e.target.value)}
              placeholder="e.g., Urios or FSUU"
              className={inputCls(editMode)}
            />
          </div>

          <div>
            <label className={labelCls}>System Display Title</label>
            <input
              type="text"
              disabled={!editMode}
              value={settings.system_name || ""}
              onChange={(e) => handleChange("system_name", e.target.value)}
              className={inputCls(editMode)}
            />
          </div>

          <div>
            <label className={labelCls}>Facebook Page URL</label>
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="absolute left-3 top-3 text-blue-600">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <input
                type="url"
                disabled={!editMode}
                placeholder="https://facebook.com/..."
                value={settings.facebook_url || ""}
                onChange={(e) => handleChange("facebook_url", e.target.value)}
                className={`${inputCls(editMode)} pl-9`}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Facebook Page Name / Display Name</label>
            <input
              type="text"
              disabled={!editMode}
              placeholder="Father Saturnino Urios University"
              value={settings.facebook_name || ""}
              onChange={(e) => handleChange("facebook_name", e.target.value)}
              className={inputCls(editMode)}
            />
          </div>

          <div>
            <label className={labelCls}>Telephone No.</label>
            <div className="relative">
              <Phone size={13} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                disabled={!editMode}
                placeholder="(085) 342-1830"
                value={settings.telephone_no || settings.contact_phone || ""}
                onChange={(e) => { handleChange("telephone_no", e.target.value); handleChange("contact_phone", e.target.value); }}
                className={`${inputCls(editMode)} pl-8`}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Support Email</label>
            <div className="relative">
              <Mail size={13} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="email"
                disabled={!editMode}
                value={settings.contact_email || ""}
                onChange={(e) => handleChange("contact_email", e.target.value)}
                className={`${inputCls(editMode)} pl-8`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Email / SMTP Configuration ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
        <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Mail size={15} className="text-blue-600" />
              Email / SMTP Configuration
            </h4>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Production-ready outgoing mail settings. Changes are persisted to the database and applied immediately.
            </p>
          </div>
          <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1 shrink-0 whitespace-nowrap self-start">
            <Shield size={11} /> Encrypted Storage
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Mail Host</label>
            <div className="relative">
              <Server size={13} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                disabled={!editMode}
                placeholder="smtp.gmail.com"
                value={settings.smtp_host || ""}
                onChange={(e) => handleChange("smtp_host", e.target.value)}
                className={`${inputCls(editMode)} pl-8`}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Mail Port</label>
            <input
              type="number"
              disabled={!editMode}
              placeholder="587"
              value={settings.smtp_port || ""}
              onChange={(e) => handleChange("smtp_port", e.target.value)}
              className={inputCls(editMode)}
            />
          </div>

          <div>
            <label className={labelCls}>Mail Username</label>
            <div className="relative">
              <Mail size={13} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                disabled={!editMode}
                placeholder="your@email.com"
                value={settings.smtp_username || ""}
                onChange={(e) => handleChange("smtp_username", e.target.value)}
                className={`${inputCls(editMode)} pl-8`}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Mail Password</label>
            <div className="relative">
              <Lock size={13} className="absolute left-3 top-3 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                disabled={!editMode}
                placeholder={editMode ? "Enter password..." : "••••••••"}
                value={settings.smtp_password || ""}
                onChange={(e) => handleChange("smtp_password", e.target.value)}
                className={`${inputCls(editMode)} pl-8 pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div>
            <label className={labelCls}>Mail Encryption</label>
            <select
              disabled={!editMode}
              value={settings.smtp_encryption || "tls"}
              onChange={(e) => handleChange("smtp_encryption", e.target.value)}
              className={inputCls(editMode)}
            >
              <option value="tls">TLS</option>
              <option value="ssl">SSL</option>
              <option value="none">None</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>Mail From Address</label>
            <div className="relative">
              <Mail size={13} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="email"
                disabled={!editMode}
                placeholder="noreply@fsuu.edu.ph"
                value={settings.mail_from_address || ""}
                onChange={(e) => handleChange("mail_from_address", e.target.value)}
                className={`${inputCls(editMode)} pl-8`}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Mail From Name</label>
            <input
              type="text"
              disabled={!editMode}
              placeholder="FSUU Booking System"
              value={settings.mail_from_name || ""}
              onChange={(e) => handleChange("mail_from_name", e.target.value)}
              className={inputCls(editMode)}
            />
          </div>
        </div>

        {/* Test SMTP */}
        <div className="pt-3 border-t border-slate-100">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Test SMTP Connection</p>
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Mail size={13} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="email"
                placeholder="Send test email to..."
                value={testEmailAddr}
                onChange={(e) => setTestEmailAddr(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 bg-white focus:border-blue-600 focus:outline-none shadow-2xs"
              />
            </div>
            <button
              type="button"
              disabled={testingEmail || !testEmailAddr}
              onClick={handleTestEmail}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-50 whitespace-nowrap"
            >
              {testingEmail ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              <span>Send Test</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 3. SMS Configuration ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
        <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <MessageSquare size={15} className="text-violet-600" />
              SMS Configuration
            </h4>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Configure your SMS gateway API credentials for OTP and notification dispatch.
            </p>
          </div>
          <span className="text-[11px] font-bold text-violet-600 bg-violet-50 px-2.5 py-0.5 rounded-full border border-violet-200 flex items-center gap-1 shrink-0 whitespace-nowrap self-start">
            <Shield size={11} /> Encrypted Storage
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>SMS API Key</label>
            <div className="relative">
              <Lock size={13} className="absolute left-3 top-3 text-slate-400" />
              <input
                type={showSmsKey ? "text" : "password"}
                disabled={!editMode}
                placeholder={editMode ? "Enter your SMS API key..." : "••••••••••••"}
                value={settings.sms_api_key || ""}
                onChange={(e) => handleChange("sms_api_key", e.target.value)}
                className={`${inputCls(editMode)} pl-8 pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowSmsKey((v) => !v)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showSmsKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div>
            <label className={labelCls}>SMS API URL</label>
            <div className="relative">
              <Server size={13} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="url"
                disabled={!editMode}
                placeholder="https://api.semaphore.co/api/v4/messages"
                value={settings.sms_api_url || ""}
                onChange={(e) => handleChange("sms_api_url", e.target.value)}
                className={`${inputCls(editMode)} pl-8`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
