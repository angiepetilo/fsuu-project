import { useState, useEffect } from "react";
import { Loader2, Pencil, X } from "lucide-react";
import api from "@/lib/axios";
import notify from "@/lib/notify";

export default function SystemSettingsTab({ showMsg }) {
  const [settings, setSettings] = useState({
    system_name: "FSUU Facilities & Equipment Booking System",
    organization_name: "Father Saturnino Urios University",
    header_brand_text: "Urios",
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
  const [isEditing, setIsEditing] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState(null); // for cancel

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

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put("/admin/system-settings", settings);
      if (res.data?.settings) {
        setSettings((prev) => ({ ...prev, ...res.data.settings }));
        setSavedSnapshot(res.data.settings);
        localStorage.setItem("fsuu_system_settings", JSON.stringify(res.data.settings));
      } else {
        setSavedSnapshot(settings);
        localStorage.setItem("fsuu_system_settings", JSON.stringify(settings));
      }
      window.dispatchEvent(new Event("fsuu_system_settings_updated"));
      notify.success("System Settings Saved", "Global application and SMTP configuration updated successfully.");
      setIsEditing(false);
    } catch (err) {
      console.error("Save system settings failed:", err);
      notify.error("Error", err.response?.data?.message || "Failed to save system settings to server.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = () => {
    setSavedSnapshot({ ...settings });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (savedSnapshot) setSettings(savedSnapshot);
    setIsEditing(false);
  };

  const handleReset = () => {
    const defaultSettings = {
      system_name: "FSUU Facilities & Equipment Booking System",
      organization_name: "Father Saturnino Urios University",
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
    notify.info("Reset Complete", "Default system settings populated. Click Save Changes to apply.");
  };

  const handleTestSmtp = async (e) => {
    e.preventDefault();
    if (!testEmail) {
      notify.error("Email Required", "Please enter an email address to send the test message to.");
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
              Global application parameters, operational reservation policies, and dynamic SMTP mail configuration.
            </p>
            {!isEditing && (
              <span className="inline-block mt-1.5 text-[11px] text-amber-600 font-semibold bg-amber-50 border border-amber-200 rounded-lg px-2 py-0.5">
                View-only mode — click Edit to make changes
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  <X size={13} />
                  Cancel
                </button>
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
              </>
            ) : (
              <button
                type="button"
                onClick={handleEdit}
                className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-extrabold rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                <Pencil size={13} />
                Edit
              </button>
            )}
          </div>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: General University / System Info */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <h4 className="text-sm font-black text-slate-900">General Information</h4>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Displayed in the public footer, confirmation emails, and user invitations.
              </p>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Header Branding Text</label>
                <input
                  type="text"
                  value={settings.header_brand_text || ""}
                  onChange={(e) => setSettings({ ...settings, header_brand_text: e.target.value })}
                  placeholder="e.g., Urios or FSUU"
                  disabled={!isEditing}
                  className={`w-full px-3.5 py-2 border rounded-xl text-xs font-medium text-slate-900 focus:outline-none transition-colors ${isEditing ? "bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-600" : "bg-slate-100 border-slate-200 text-slate-600 cursor-default"}`}
                />
                <p className="text-[10.5px] text-slate-400 mt-1 font-medium">Controls the top navigation logo brand title across public pages.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">System Display Title</label>
                <input
                  type="text"
                  value={settings.system_name || ""}
                  onChange={(e) => setSettings({ ...settings, system_name: e.target.value })}
                  disabled={!isEditing}
                  className={`w-full px-3.5 py-2 border rounded-xl text-xs font-medium text-slate-900 focus:outline-none transition-colors ${isEditing ? "bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-600" : "bg-slate-100 border-slate-200 text-slate-600 cursor-default"}`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Organization / University</label>
                <input
                  type="text"
                  value={settings.organization_name || ""}
                  onChange={(e) => setSettings({ ...settings, organization_name: e.target.value })}
                  disabled={!isEditing}
                  className={`w-full px-3.5 py-2 border rounded-xl text-xs font-medium text-slate-900 focus:outline-none transition-colors ${isEditing ? "bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-600" : "bg-slate-100 border-slate-200 text-slate-600 cursor-default"}`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Support Email</label>
                  <input
                    type="email"
                    value={settings.contact_email || ""}
                    onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
                    disabled={!isEditing}
                    className={`w-full px-3.5 py-2 border rounded-xl text-xs font-medium text-slate-900 focus:outline-none transition-colors ${isEditing ? "bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-600" : "bg-slate-100 border-slate-200 text-slate-600 cursor-default"}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={settings.contact_phone || ""}
                    onChange={(e) => setSettings({ ...settings, contact_phone: e.target.value })}
                    disabled={!isEditing}
                    className={`w-full px-3.5 py-2 border rounded-xl text-xs font-medium text-slate-900 focus:outline-none transition-colors ${isEditing ? "bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-600" : "bg-slate-100 border-slate-200 text-slate-600 cursor-default"}`}
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
              <label className={`flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 transition-colors ${isEditing ? "hover:bg-slate-50 cursor-pointer" : "cursor-default"}`}>
                <input
                  type="checkbox"
                  checked={Boolean(settings.auto_shift_tomorrow_after_hours)}
                  onChange={(e) => isEditing && setSettings({ ...settings, auto_shift_tomorrow_after_hours: e.target.checked })}
                  disabled={!isEditing}
                  className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 disabled:opacity-60"
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

              <label className={`flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 transition-colors ${isEditing ? "hover:bg-slate-50 cursor-pointer" : "cursor-default"}`}>
                <input
                  type="checkbox"
                  checked={Boolean(settings.allow_advance_equipment_booking)}
                  onChange={(e) => isEditing && setSettings({ ...settings, allow_advance_equipment_booking: e.target.checked })}
                  disabled={!isEditing}
                  className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 disabled:opacity-60"
                />
                <div className="text-xs">
                  <span className="font-extrabold text-slate-900 block">
                    Allow Next-Day Equipment Advance Booking
                  </span>
                  <span className="text-slate-500 font-medium leading-relaxed block mt-0.5">
                    Permits users to reserve physical equipment in advance for the following day.
                  </span>
                </div>
              </label>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Max Equipment Items per Borrow Request</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={settings.max_items_per_borrow || 5}
                  onChange={(e) => setSettings({ ...settings, max_items_per_borrow: parseInt(e.target.value, 10) || 5 })}
                  disabled={!isEditing}
                  className={`w-full px-3.5 py-2 border rounded-xl text-xs font-medium text-slate-900 focus:outline-none transition-colors ${isEditing ? "bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-600" : "bg-slate-100 border-slate-200 text-slate-600 cursor-default"}`}
                />
              </div>
            </div>
          </div>

          {/* Card 3: Dynamic SMTP & Email Dispatch Configuration */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4 md:col-span-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div>
                <h4 className="text-sm font-black text-slate-900">Email &amp; SMTP Configuration</h4>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Dynamic SMTP credentials for system mail delivery. Applied instantly without editing environment files or restarting servers.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 self-start sm:self-auto">
                Dynamic Mode Active
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">SMTP Host</label>
                <input
                  type="text"
                  placeholder="smtp.gmail.com"
                  value={settings.smtp_host || ""}
                  onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
                  disabled={!isEditing}
                  className={`w-full px-3.5 py-2 border rounded-xl text-xs font-medium text-slate-900 focus:outline-none transition-colors font-mono ${isEditing ? "bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-600" : "bg-slate-100 border-slate-200 text-slate-600 cursor-default"}`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">SMTP Port</label>
                <input
                  type="number"
                  placeholder="587"
                  value={settings.smtp_port || 587}
                  onChange={(e) => setSettings({ ...settings, smtp_port: parseInt(e.target.value, 10) || 587 })}
                  disabled={!isEditing}
                  className={`w-full px-3.5 py-2 border rounded-xl text-xs font-medium text-slate-900 focus:outline-none transition-colors font-mono ${isEditing ? "bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-600" : "bg-slate-100 border-slate-200 text-slate-600 cursor-default"}`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Encryption Protocol</label>
                <select
                  value={settings.smtp_encryption || "tls"}
                  onChange={(e) => setSettings({ ...settings, smtp_encryption: e.target.value })}
                  disabled={!isEditing}
                  className={`w-full px-3.5 py-2 border rounded-xl text-xs font-medium text-slate-900 focus:outline-none transition-colors ${isEditing ? "bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-600" : "bg-slate-100 border-slate-200 text-slate-600 cursor-default"}`}
                >
                  <option value="tls">TLS (Port 587)</option>
                  <option value="ssl">SSL (Port 465)</option>
                  <option value="none">None (Plain / Unencrypted)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">SMTP Username / Email</label>
                <input
                  type="text"
                  placeholder="your-email@gmail.com"
                  value={settings.smtp_username || ""}
                  onChange={(e) => setSettings({ ...settings, smtp_username: e.target.value })}
                  disabled={!isEditing}
                  className={`w-full px-3.5 py-2 border rounded-xl text-xs font-medium text-slate-900 focus:outline-none transition-colors font-mono ${isEditing ? "bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-600" : "bg-slate-100 border-slate-200 text-slate-600 cursor-default"}`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">SMTP Password / App Password</label>
                <input
                  type="password"
                  placeholder="••••••••••••••••"
                  value={settings.smtp_password || ""}
                  onChange={(e) => setSettings({ ...settings, smtp_password: e.target.value })}
                  disabled={!isEditing}
                  className={`w-full px-3.5 py-2 border rounded-xl text-xs font-medium text-slate-900 focus:outline-none transition-colors font-mono ${isEditing ? "bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-600" : "bg-slate-100 border-slate-200 text-slate-600 cursor-default"}`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">From Sender Name</label>
                <input
                  type="text"
                  placeholder="FSUU Facilities & Equipment Booking"
                  value={settings.mail_from_name || ""}
                  onChange={(e) => setSettings({ ...settings, mail_from_name: e.target.value })}
                  disabled={!isEditing}
                  className={`w-full px-3.5 py-2 border rounded-xl text-xs font-medium text-slate-900 focus:outline-none transition-colors ${isEditing ? "bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-600" : "bg-slate-100 border-slate-200 text-slate-600 cursor-default"}`}
                />
              </div>

              <div className="sm:col-span-2 md:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">From Sender Email Address</label>
                <input
                  type="email"
                  placeholder="support.booking@fsuu.edu.ph"
                  value={settings.mail_from_address || ""}
                  onChange={(e) => setSettings({ ...settings, mail_from_address: e.target.value })}
                  disabled={!isEditing}
                  className={`w-full px-3.5 py-2 border rounded-xl text-xs font-medium text-slate-900 focus:outline-none transition-colors font-mono ${isEditing ? "bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-600" : "bg-slate-100 border-slate-200 text-slate-600 cursor-default"}`}
                />
              </div>
            </div>

            {/* Test SMTP Connection Tool */}
            <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50/70 p-4 rounded-xl space-y-3">
              <div>
                <span className="text-xs font-black text-slate-900 block">Verify Live SMTP Connection</span>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Enter an email address to send a live test message using the configured credentials above:
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2.5">
                <input
                  type="email"
                  placeholder="recipient@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="w-full sm:max-w-md px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleTestSmtp}
                  disabled={testingSmtp || !testEmail}
                  className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  {testingSmtp ? "Dispatching..." : "Send Test Email"}
                </button>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-xl border text-xs font-semibold ${
                    testResult.success
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-rose-50 border-rose-200 text-rose-800"
                  }`}
                >
                  {testResult.message}
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
