import { useState, useEffect } from "react";
import { Loader2, Pencil, X, Save, Upload, Camera, Trash2, Globe, Phone } from "lucide-react";
import api from "@/lib/axios";
import notify from "@/lib/notify";

export default function SystemSettingsTab({ showMsg }) {
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
    smtp_host: "smtp.gmail.com",
    smtp_port: 587,
    smtp_username: "",
    smtp_password: "",
    smtp_encryption: "tls",
    mail_from_address: "support.booking@fsuu.edu.ph",
    mail_from_name: "FSUU Facilities & Equipment Booking",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(true); // Direct editing enabled
  const [savedSnapshot, setSavedSnapshot] = useState(null);

  // SMTP Test state
  const [testEmail, setTestEmail] = useState("");
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Load from backend
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/system-settings");
      if (res.data) {
        setSettings((prev) => ({
          ...prev,
          ...res.data,
          university_name: res.data.university_name || res.data.organization_name || prev.university_name,
        }));
        setSavedSnapshot(res.data);
        localStorage.setItem("fsuu_system_settings", JSON.stringify(res.data));
      }
    } catch (err) {
      console.warn("Failed to load backend system settings, using local cache:", err);
      try {
        const saved = localStorage.getItem("fsuu_system_settings");
        if (saved) setSettings(JSON.parse(saved));
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setSettings(prev => ({ ...prev, system_logo: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...settings,
      organization_name: settings.university_name || settings.organization_name,
      contact_phone: settings.telephone_no || settings.contact_phone,
    };

    try {
      const res = await api.put("/admin/system-settings", payload);
      if (res.data?.settings) {
        setSettings((prev) => ({ ...prev, ...res.data.settings }));
        setSavedSnapshot(res.data.settings);
        localStorage.setItem("fsuu_system_settings", JSON.stringify(res.data.settings));
      } else {
        setSavedSnapshot(payload);
        localStorage.setItem("fsuu_system_settings", JSON.stringify(payload));
      }
      window.dispatchEvent(new Event("fsuu_system_settings_updated"));
      notify.success("System Settings Saved", "Global application parameters and branding updated successfully.");
    } catch (err) {
      console.error("Save system settings failed:", err);
      notify.error("Error", err.response?.data?.message || "Failed to save system settings to server.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
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
      smtp_host: "smtp.gmail.com",
      smtp_port: 587,
      smtp_username: "",
      smtp_password: "",
      smtp_encryption: "tls",
      mail_from_address: "support.booking@fsuu.edu.ph",
      mail_from_name: "FSUU Facilities & Equipment Booking",
    };
    setSettings(defaultSettings);
    notify.info("Settings Reset", "Default values restored. Click Save to persist.");
  };

  const handleTestSmtp = async () => {
    if (!testEmail || !testEmail.includes("@")) {
      notify.error("Invalid Email", "Please provide a valid recipient email address for the test.");
      return;
    }

    setTestingSmtp(true);
    setTestResult(null);

    try {
      await api.put("/admin/system-settings", settings);
      const res = await api.post("/admin/system-settings/test-smtp", { test_email: testEmail });
      setTestResult({
        success: true,
        message: res.data?.message || `Test email dispatched successfully to ${testEmail}!`,
      });
      notify.success("SMTP Connection Verified", `Test email sent to ${testEmail}`);
    } catch (err) {
      console.error("SMTP Test failed:", err);
      const msg = err.response?.data?.message || err.message || "Failed to establish SMTP connection.";
      setTestResult({
        success: false,
        message: msg,
      });
      notify.error("SMTP Test Failed", msg);
    } finally {
      setTestingSmtp(false);
    }
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
      <form onSubmit={handleSave} className="space-y-6">
        {/* Header Summary */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">System Settings</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Global application branding, university logo, social channels, and SMTP mail configuration.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              disabled={saving}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              Reset Defaults
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-extrabold rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              {saving ? (
                <><Loader2 size={13} className="animate-spin" /> Saving...</>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: General University / System Info */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <h4 className="text-sm font-black text-slate-900">University & Branding</h4>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Displayed across headers, public footers, and official export documents.
              </p>
            </div>

            {/* Logo Upload */}
            <div className="flex items-center gap-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shadow-inner shrink-0 relative">
                {settings.system_logo ? (
                  <img src={settings.system_logo} alt="System Logo" className="w-full h-full object-contain p-1" />
                ) : (
                  <Globe size={24} className="text-slate-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <label className="block font-bold text-slate-900 text-xs mb-1">University / System Logo</label>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer shadow-2xs transition-all">
                    <Camera size={13} />
                    <span>{settings.system_logo ? "Change Logo" : "Upload Logo"}</span>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                  {settings.system_logo && (
                    <button
                      type="button"
                      onClick={() => setSettings(prev => ({ ...prev, system_logo: "" }))}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-600 font-bold text-xs cursor-pointer shadow-2xs transition-all"
                    >
                      <Trash2 size={12} />
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">University Name</label>
                <input
                  type="text"
                  value={settings.university_name || settings.organization_name || ""}
                  onChange={(e) => setSettings({ ...settings, university_name: e.target.value, organization_name: e.target.value })}
                  className="w-full px-3.5 py-2 border rounded-xl text-xs font-medium text-slate-900 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Header Branding Text</label>
                <input
                  type="text"
                  value={settings.header_brand_text || ""}
                  onChange={(e) => setSettings({ ...settings, header_brand_text: e.target.value })}
                  placeholder="e.g., Urios or FSUU"
                  className="w-full px-3.5 py-2 border rounded-xl text-xs font-medium text-slate-900 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">System Display Title</label>
                <input
                  type="text"
                  value={settings.system_name || ""}
                  onChange={(e) => setSettings({ ...settings, system_name: e.target.value })}
                  className="w-full px-3.5 py-2 border rounded-xl text-xs font-medium text-slate-900 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Facebook Page URL</label>
                <div className="relative">
                  <Globe size={14} className="absolute left-3 top-2.5 text-blue-600" />
                  <input
                    type="url"
                    placeholder="https://facebook.com/..."
                    value={settings.facebook_url || ""}
                    onChange={(e) => setSettings({ ...settings, facebook_url: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 border rounded-xl text-xs font-medium text-slate-900 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Telephone No.</label>
                  <div className="relative">
                    <Phone size={13} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="(085) 342-1830"
                      value={settings.telephone_no || settings.contact_phone || ""}
                      onChange={(e) => setSettings({ ...settings, telephone_no: e.target.value, contact_phone: e.target.value })}
                      className="w-full pl-8 pr-3 py-2 border rounded-xl text-xs font-medium text-slate-900 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-600"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Support Email</label>
                  <input
                    type="email"
                    value={settings.contact_email || ""}
                    onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
                    className="w-full px-3.5 py-2 border rounded-xl text-xs font-medium text-slate-900 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Equipment Borrowing & Timing Rules */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <h4 className="text-sm font-black text-slate-900">Equipment Reservation Policies</h4>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Configures operational constraints and borrowing allowances for public filers.
              </p>
            </div>

            <div className="space-y-3.5 pt-1">
              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={Boolean(settings.auto_shift_tomorrow_after_hours)}
                  onChange={(e) => setSettings({ ...settings, auto_shift_tomorrow_after_hours: e.target.checked })}
                  className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <div className="text-xs">
                  <span className="font-extrabold text-slate-900 block">
                    Auto-Shift to Next Day after Operating Hours
                  </span>
                  <span className="text-slate-500 font-medium leading-relaxed block mt-0.5">
                    Switches public borrowing date to Tomorrow once today&apos;s operating hours conclude.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={Boolean(settings.allow_advance_equipment_booking)}
                  onChange={(e) => setSettings({ ...settings, allow_advance_equipment_booking: e.target.checked })}
                  className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <div className="text-xs">
                  <span className="font-extrabold text-slate-900 block">
                    Allow Advance Equipment Borrowing (Future Dates)
                  </span>
                  <span className="text-slate-500 font-medium leading-relaxed block mt-0.5">
                    Enables clients to reserve equipment for future event dates beyond today.
                  </span>
                </div>
              </label>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Max Items per Borrow Transaction</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={settings.max_items_per_borrow || 5}
                  onChange={(e) => setSettings({ ...settings, max_items_per_borrow: parseInt(e.target.value, 10) || 1 })}
                  className="w-full px-3.5 py-2 border rounded-xl text-xs font-medium text-slate-900 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-600"
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
