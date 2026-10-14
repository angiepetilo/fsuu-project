import { useState, useEffect, useRef, useCallback } from "react";
import {
  Loader2, CheckCircle2, Globe, Phone, Mail, RotateCcw, AlertCircle,
  Save, Lock, Eye, EyeOff, MessageSquare, Server, Shield,
  Send, Sun, Moon, Check
} from "lucide-react";
import api from "@/lib/axios";
import notify from "@/lib/notify";
import { useTheme } from "@/context/ThemeContext";

const inputCls = (isModified = false) =>
  `w-full px-3.5 py-2.5 border rounded-xl text-xs font-semibold text-slate-900 transition-colors shadow-2xs ${
    isModified
      ? "bg-blue-50/20 border-blue-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
      : "bg-white border-slate-200 hover:border-slate-300 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
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
    // Abstract API
    abstract_email_api_key: "",
  });

  const [savedSettings, setSavedSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSmsKey, setShowSmsKey] = useState(false);
  const [showAbstractKey, setShowAbstractKey] = useState(false);
  const [testEmailAddr, setTestEmailAddr] = useState("");
  const [testingEmail, setTestingEmail] = useState(false);
  const [testPhoneNum, setTestPhoneNum] = useState("");
  const [testingSms, setTestingSms] = useState(false);
  const [testingAbstract, setTestingAbstract] = useState(false);
  const [abstractStatus, setAbstractStatus] = useState(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get("/general/system-settings");
      if (res.data) {
        const uName = res.data.university_name || res.data.organization_name || "";
        const phone = res.data.telephone_no || res.data.contact_phone || "";
        const merged = {
          ...res.data,
          university_name: uName,
          organization_name: uName,
          telephone_no: phone,
          contact_phone: phone,
          header_brand_text: res.data.header_brand_text ?? "",
          facebook_name: res.data.facebook_name ?? "",
          facebook_url: res.data.facebook_url ?? "",
          system_name: res.data.system_name ?? "",
          contact_email: res.data.contact_email ?? "",
          smtp_host: res.data.smtp_host ?? "",
          smtp_port: res.data.smtp_port ?? 587,
          smtp_username: res.data.smtp_username ?? "",
          smtp_password: res.data.smtp_password ?? "",
          smtp_encryption: res.data.smtp_encryption ?? "tls",
          mail_from_address: res.data.mail_from_address ?? "",
          mail_from_name: res.data.mail_from_name ?? "",
          sms_api_key: res.data.sms_api_key ?? "",
          sms_api_url: res.data.sms_api_url ?? "",
          abstract_email_api_key: res.data.abstract_email_api_key ?? "",
        };
        setSettings(merged);
        setSavedSettings(merged);
        localStorage.setItem("fsuu_system_settings", JSON.stringify(merged));
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

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleCancelEdit = () => {
    if (savedSettings) setSettings(savedSettings);
  };

  // Determine if there are unsaved changes
  const hasChanges = Boolean(
    savedSettings &&
    Object.keys(settings).some((key) => {
      return String(settings[key] ?? "").trim() !== String(savedSettings[key] ?? "").trim();
    })
  );

  const isFieldModified = (field) => {
    if (!savedSettings) return false;
    return String(settings[field] ?? "").trim() !== String(savedSettings[field] ?? "").trim();
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      ...settings,
      organization_name: settings.university_name || settings.organization_name || "",
      university_name: settings.university_name || settings.organization_name || "",
      contact_phone: settings.telephone_no || settings.contact_phone || "",
      telephone_no: settings.telephone_no || settings.contact_phone || "",
      header_brand_text: settings.header_brand_text ?? "",
      facebook_name: settings.facebook_name ?? "",
      facebook_url: settings.facebook_url ?? "",
    };
    try {
      const res = await api.put("/general/system-settings", payload);
      const returned = res.data?.settings || payload;
      const updated = {
        ...payload,
        ...returned,
        university_name: returned.university_name || returned.organization_name || payload.university_name,
        organization_name: returned.organization_name || payload.organization_name,
        telephone_no: returned.telephone_no || returned.contact_phone || payload.telephone_no,
        contact_phone: returned.contact_phone || payload.contact_phone,
        facebook_name: returned.facebook_name !== undefined ? returned.facebook_name : payload.facebook_name,
        facebook_url: returned.facebook_url !== undefined ? returned.facebook_url : payload.facebook_url,
        header_brand_text: returned.header_brand_text !== undefined ? returned.header_brand_text : payload.header_brand_text,
      };
      setSettings(updated);
      setSavedSettings(updated);
      localStorage.setItem("fsuu_system_settings", JSON.stringify(updated));
      window.dispatchEvent(new Event("fsuu_system_settings_updated"));
      notify.success("Settings Saved", "System settings have been updated successfully.");
    } catch (err) {
      notify.error("Save Failed", err.response?.data?.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmailAddr) {
      notify.error("Required", "Enter a test email address.");
      return;
    }
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

  const handleTestSms = async () => {
    if (!testPhoneNum) {
      notify.error("Required", "Enter a test phone number.");
      return;
    }
    setTestingSms(true);
    try {
      const res = await api.post("/general/system-settings/test-sms", { test_phone: testPhoneNum });
      notify.success("Test SMS Sent", res.data?.message || "Test SMS dispatched successfully.");
    } catch (err) {
      notify.error("SMS Test Failed", err.response?.data?.message || "Failed to send test SMS.");
    } finally {
      setTestingSms(false);
    }
  };

  const handleTestAbstractApi = async () => {
    setTestingAbstract(true);
    setAbstractStatus(null);
    try {
      const res = await api.post("/general/system-settings/test-abstract-api", {
        api_key: settings.abstract_email_api_key,
      });
      setAbstractStatus({
        success: true,
        message: res.data?.message || `Abstract API connected successfully! Latency: ${res.data?.latency_ms || 0}ms`,
        latency_ms: res.data?.latency_ms,
      });
      notify.success("Abstract API Connected", "Your Abstract API key is valid and responding.");
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to connect to Abstract API.";
      setAbstractStatus({
        success: false,
        message: msg,
      });
      notify.error("Abstract API Test Failed", msg);
    } finally {
      setTestingAbstract(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm("Are you sure you want to restore all system settings to default? This will overwrite your current configuration.")) {
      return;
    }
    const defaultSettings = {
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
      smtp_host: "",
      smtp_port: "",
      smtp_username: "",
      smtp_password: "",
      smtp_encryption: "tls",
      mail_from_address: "",
      mail_from_name: "",
      sms_api_key: "",
      sms_api_url: "",
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
            {hasChanges && (
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={saving}
                className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Discard
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-xs text-white cursor-pointer active:scale-98 ${
                hasChanges
                  ? "bg-blue-600 hover:bg-blue-700 ring-2 ring-blue-300"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              <span>{saving ? "Saving..." : "Save Settings"}</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 px-2.5 py-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              title="Reset all settings to factory default"
            >
              <RotateCcw size={12} />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* ── 0. Theme & Appearance ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-black text-slate-900">Theme &amp; Appearance</h4>
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
              value={settings.university_name || settings.organization_name || ""}
              onChange={(e) => {
                handleChange("university_name", e.target.value);
                handleChange("organization_name", e.target.value);
              }}
              className={inputCls(isFieldModified("university_name") || isFieldModified("organization_name"))}
            />
          </div>

          <div>
            <label className={labelCls}>Header Branding Text</label>
            <input
              type="text"
              value={settings.header_brand_text || ""}
              onChange={(e) => handleChange("header_brand_text", e.target.value)}
              placeholder="e.g., Urios or FSUU"
              className={inputCls(isFieldModified("header_brand_text"))}
            />
          </div>

          <div>
            <label className={labelCls}>System Display Title</label>
            <input
              type="text"
              value={settings.system_name || ""}
              onChange={(e) => handleChange("system_name", e.target.value)}
              className={inputCls(isFieldModified("system_name"))}
            />
          </div>

          <div>
            <label className={labelCls}>Facebook Page URL</label>
            <p className="text-[11px] text-slate-500 mb-1">
              Destination web address (e.g. https://facebook.com/fsuubutuan) opened when clicking the Facebook icon.
            </p>
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="absolute left-3 top-3 text-blue-600">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <input
                type="url"
                placeholder="https://facebook.com/fsuubutuan"
                value={settings.facebook_url || ""}
                onChange={(e) => handleChange("facebook_url", e.target.value)}
                className={`${inputCls(isFieldModified("facebook_url"))} pl-9`}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>
              Facebook Page Display Name <span className="text-[11px] font-normal text-slate-400">(Optional)</span>
            </label>
            <p className="text-[11px] text-slate-500 mb-1">
              Visible text label shown next to the icon (defaults to URL handle if left blank).
            </p>
            <input
              type="text"
              placeholder="e.g. fsuubutuan or Father Saturnino Urios University"
              value={settings.facebook_name || ""}
              onChange={(e) => handleChange("facebook_name", e.target.value)}
              className={inputCls(isFieldModified("facebook_name"))}
            />
          </div>

          <div>
            <label className={labelCls}>Telephone No.</label>
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
                className={`${inputCls(isFieldModified("telephone_no") || isFieldModified("contact_phone"))} pl-8`}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Support Email</label>
            <div className="relative">
              <Mail size={13} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="email"
                placeholder="support.booking@fsuu.edu.ph"
                value={settings.contact_email || ""}
                onChange={(e) => handleChange("contact_email", e.target.value)}
                className={`${inputCls(isFieldModified("contact_email"))} pl-8`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Email / SMTP Configuration ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
        <div className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Mail size={15} className="text-blue-600" />
              Email / SMTP Configuration
            </h4>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Production-ready outgoing mail settings. Changes are persisted to the database and .env immediately.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
              <Shield size={11} /> Encrypted Storage
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Mail Host</label>
            <div className="relative">
              <Server size={13} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="smtp.gmail.com"
                value={settings.smtp_host || ""}
                onChange={(e) => handleChange("smtp_host", e.target.value)}
                className={`${inputCls(isFieldModified("smtp_host"))} pl-8`}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Mail Port</label>
            <input
              type="number"
              placeholder="587"
              value={settings.smtp_port || ""}
              onChange={(e) => handleChange("smtp_port", e.target.value)}
              className={inputCls(isFieldModified("smtp_port"))}
            />
          </div>

          <div>
            <label className={labelCls}>Mail Username</label>
            <div className="relative">
              <Mail size={13} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="your@email.com"
                value={settings.smtp_username || ""}
                onChange={(e) => handleChange("smtp_username", e.target.value)}
                className={`${inputCls(isFieldModified("smtp_username"))} pl-8`}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Mail Password</label>
            <div className="relative">
              <Lock size={13} className="absolute left-3 top-3 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter password..."
                value={settings.smtp_password || ""}
                onChange={(e) => handleChange("smtp_password", e.target.value)}
                className={`${inputCls(isFieldModified("smtp_password"))} pl-8 pr-10`}
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
              value={settings.smtp_encryption || "tls"}
              onChange={(e) => handleChange("smtp_encryption", e.target.value)}
              className={inputCls(isFieldModified("smtp_encryption"))}
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
                placeholder="noreply@fsuu.edu.ph"
                value={settings.mail_from_address || ""}
                onChange={(e) => handleChange("mail_from_address", e.target.value)}
                className={`${inputCls(isFieldModified("mail_from_address"))} pl-8`}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Mail From Name</label>
            <input
              type="text"
              placeholder="FSUU Booking System"
              value={settings.mail_from_name || ""}
              onChange={(e) => handleChange("mail_from_name", e.target.value)}
              className={inputCls(isFieldModified("mail_from_name"))}
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
              <span>Send Test Email</span>
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
              Configure your SMS gateway API credentials (supports Semaphore, iProg, and REST SMS gateways).
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
                placeholder="Enter your SMS API key..."
                value={settings.sms_api_key || ""}
                onChange={(e) => handleChange("sms_api_key", e.target.value)}
                className={`${inputCls(isFieldModified("sms_api_key"))} pl-8 pr-10`}
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
                placeholder="https://api.semaphore.co/api/v4/messages"
                value={settings.sms_api_url || ""}
                onChange={(e) => handleChange("sms_api_url", e.target.value)}
                className={`${inputCls(isFieldModified("sms_api_url"))} pl-8`}
              />
            </div>
          </div>
        </div>

        {/* Test SMS Gateway */}
        <div className="pt-3 border-t border-slate-100">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Test SMS Gateway Connection</p>
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Phone size={13} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="tel"
                placeholder="Send test SMS to phone number (e.g. 09123456789)..."
                value={testPhoneNum}
                onChange={(e) => setTestPhoneNum(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 bg-white focus:border-blue-600 focus:outline-none shadow-2xs"
              />
            </div>
            <button
              type="button"
              disabled={testingSms || !testPhoneNum}
              onClick={handleTestSms}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-50 whitespace-nowrap"
            >
              {testingSms ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              <span>Send Test SMS</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 4. Abstract API Email Deliverability & Anti-Spam Shield ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
        <div className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Shield size={15} className="text-emerald-600" />
              Abstract API Email Validation & Anti-Spam Shield
            </h4>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Deep mailbox deliverability, SMTP handshake check, and anti-spam verification to prevent fake, disposable, or invalid email accounts.
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
              <Check size={11} /> 99,000+ Blocklist Active
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className={labelCls}>Abstract Email API Key</label>
              <a
                href="https://app.abstractapi.com/api/email-validation/overview"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 underline"
              >
                Get Abstract API Key ↗
              </a>
            </div>
            <div className="relative">
              <Lock size={13} className="absolute left-3 top-3 text-slate-400" />
              <input
                type={showAbstractKey ? "text" : "password"}
                placeholder="e.g. 8e5b33d1494840e19465f09669d8ec1f"
                value={settings.abstract_email_api_key || ""}
                onChange={(e) => handleChange("abstract_email_api_key", e.target.value)}
                className={`${inputCls(isFieldModified("abstract_email_api_key"))} pl-8 pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowAbstractKey((v) => !v)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showAbstractKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Configured key used by the booking portal to detect fake mailboxes, check SMTP deliverability, and block throwaway addresses.
            </p>
          </div>
        </div>

        {/* Test Abstract API Connection */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Live Endpoint Diagnostic</p>
            <p className="text-[11px] text-slate-500">
              Verify that your Abstract API key is currently recognized and within active request quota limits.
            </p>
          </div>
          <button
            type="button"
            disabled={testingAbstract || !settings.abstract_email_api_key}
            onClick={handleTestAbstractApi}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-50 whitespace-nowrap self-start sm:self-center"
          >
            {testingAbstract ? <Loader2 size={13} className="animate-spin" /> : <Shield size={13} />}
            <span>Test Abstract API Connection</span>
          </button>
        </div>

        {abstractStatus && (
          <div
            className={`p-3 rounded-xl border text-xs font-semibold flex items-start gap-2 animate-in fade-in ${
              abstractStatus.success
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            {abstractStatus.success ? (
              <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-bold">{abstractStatus.success ? "Connection Verified" : "Verification Failed"}</p>
              <p className="text-[11px] mt-0.5 opacity-90">{abstractStatus.message}</p>
            </div>
          </div>
        )}

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-600 space-y-1">
          <p className="font-bold text-slate-800 flex items-center gap-1">
            <span>🛡️ 24/7 Failsafe Disposable Shield:</span>
          </p>
          <p>
            Even if your Abstract API key runs out of free requests or encounters network downtime, the system's internal <strong>99,600+ Disposable Domain Blacklist</strong> and <strong>Mail Server (MX) Inspector</strong> actively intercept and reject temporary emails (such as <code>temp-mail.org</code>, <code>herclan.com</code>, <code>mailinator</code>, <code>guerrillamail</code>) immediately.
          </p>
        </div>
      </div>

      {/* ── Sticky Unsaved Changes Floating Bar ── */}
      {hasChanges && (
        <div className="sticky bottom-4 z-40 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0"></span>
            <span className="text-xs font-bold">You have unsaved changes across system settings.</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCancelEdit}
              disabled={saving}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Discard Changes
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              <span>{saving ? "Saving Changes..." : "Save All Changes"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
