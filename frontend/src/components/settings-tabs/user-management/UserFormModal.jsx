import { useState, useEffect } from "react";
import {
  Users, GraduationCap, X, Loader2, Mail, CheckCircle2,
  AlertCircle, Lock, Eye, EyeOff, ShieldCheck, KeyRound
} from "lucide-react";
import api from "@/lib/axios";

export default function UserFormModal({
  showModal,
  setShowModal,
  editUser,
  form,
  setForm,
  formLoading,
  handleSave,
  handleResend,
}) {
  const [availableRoles, setAvailableRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailStatus, setEmailStatus] = useState(null); // { valid: bool, message: string }

  // Password fields for edit mode
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwValidationError, setPwValidationError] = useState("");

  // Super Admin Password Confirmation Pop-up State
  const [showAdminPwModal, setShowAdminPwModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [showAdminPw, setShowAdminPw] = useState(false);
  const [adminPwError, setAdminPwError] = useState("");
  const [verifyingAdminPw, setVerifyingAdminPw] = useState(false);

  useEffect(() => {
    setEmailStatus(null);
    setNewPassword("");
    setConfirmPassword("");
    setPwValidationError("");
    setShowAdminPwModal(false);
    setAdminPassword("");
    setAdminPwError("");
  }, [showModal, editUser]);

  const checkEmailActive = async () => {
    const email = (form.email_address || "").trim();
    if (!email || !email.includes("@")) return;

    setEmailChecking(true);
    try {
      const res = await api.post("/public/verify-email-active", { email });
      setEmailStatus({ valid: true, message: res.data?.message || "Active email domain verified." });
    } catch (err) {
      setEmailStatus({
        valid: false,
        message: err.response?.data?.message || "Invalid or inactive email domain.",
      });
    } finally {
      setEmailChecking(false);
    }
  };

  useEffect(() => {
    const fetchLiveRoles = async () => {
      setLoadingRoles(true);
      try {
        const res = await api.get("/sysad/roles").catch(() => api.get("/general/roles"));
        const rolesList = Array.isArray(res.data) ? res.data : [];
        setAvailableRoles(rolesList);
        if (rolesList.length > 0 && !form.role) {
          setForm((f) => ({ ...f, role: rolesList[0].name, role_id: rolesList[0].id }));
        }
      } catch {
        setAvailableRoles([]);
      } finally {
        setLoadingRoles(false);
      }
    };
    if (showModal) {
      fetchLiveRoles();
    }
  }, [showModal]);

  const formatRoleLabel = (name) => {
    if (!name) return "";
    if (name === "staff") return "Staff";
    if (name === "student_assistant") return "Student Assistant";
    return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const getRoleIcon = (name) => {
    if (name === "student_assistant") return GraduationCap;
    return Users;
  };

  const onSubmitForm = (e) => {
    e.preventDefault();
    setPwValidationError("");

    // If editUser and password fields are filled
    if (editUser && (newPassword || confirmPassword)) {
      if (newPassword.length < 6) {
        setPwValidationError("New password must be at least 6 characters.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setPwValidationError("Passwords do not match. Please verify.");
        return;
      }
      // Require Super Admin password confirmation pop-up
      setAdminPassword("");
      setAdminPwError("");
      setShowAdminPwModal(true);
      return;
    }

    // Normal save (new invite or edit without password change)
    handleSave(e);
  };

  const handleConfirmAdminPassword = async (e) => {
    e.preventDefault();
    if (!adminPassword.trim()) {
      setAdminPwError("Please enter your Super Admin password.");
      return;
    }

    setVerifyingAdminPw(true);
    setAdminPwError("");

    try {
      await api.post("/verify-password", { password: adminPassword });
      // Password verified successfully, dispatch user update with new password
      setShowAdminPwModal(false);
      handleSave(e, newPassword);
    } catch (err) {
      const msg = err.response?.data?.message || "Incorrect administrator password. Please try again.";
      setAdminPwError(msg);
    } finally {
      setVerifyingAdminPw(false);
    }
  };

  if (!showModal) return null;

  return (
    <>
      {/* ── Main Create / Edit Modal ── */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-xs z-[1500] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight">
                {editUser ? "Edit Account" : "Create Account"}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {editUser
                  ? "Update account details and security credentials."
                  : "An invitation email will be sent to the address below."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={onSubmitForm} className="space-y-4 text-xs">
            {/* Account Role */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Account Role
              </label>
              {loadingRoles ? (
                <div className="flex items-center justify-center p-3 text-slate-400 gap-2 border border-slate-200 rounded-xl">
                  <Loader2 size={13} className="animate-spin text-blue-600" />
                  <span className="text-xs font-semibold">Loading roles...</span>
                </div>
              ) : availableRoles.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0 text-amber-600" />
                  <span>No roles found. Please configure a role in the <strong>Roles</strong> tab first.</span>
                </div>
              ) : (
                <div className={`grid ${availableRoles.length <= 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"} gap-2`}>
                  {availableRoles.map((r) => {
                    const val = r.name;
                    const label = formatRoleLabel(r.name);
                    const Icon = getRoleIcon(r.name);
                    const isSelected = form.role === val || form.role_id === r.id;

                    return (
                      <button
                        key={r.id || val}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, role: val, role_id: r.id }))}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-extrabold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${
                          isSelected
                            ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                            : "border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <Icon size={14} /> {label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Email Address */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Email Address
                </label>
                {emailChecking && (
                  <span className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold">
                    <Loader2 size={10} className="animate-spin" /> Checking mail server...
                  </span>
                )}
                {!emailChecking && emailStatus && (
                  <span
                    className={`text-[10px] font-bold flex items-center gap-1 ${
                      emailStatus.valid ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {emailStatus.valid ? (
                      <>
                        <CheckCircle2 size={11} /> Mail Server Active
                      </>
                    ) : (
                      <>
                        <AlertCircle size={11} /> Undeliverable
                      </>
                    )}
                  </span>
                )}
              </div>
              <input
                type="email"
                required
                placeholder="e.g. juan.delacruz@urios.edu.ph"
                value={form.email_address}
                onChange={(e) => setForm((f) => ({ ...f, email_address: e.target.value }))}
                onBlur={checkEmailActive}
                className={`w-full px-3.5 py-2.5 border rounded-xl font-mono text-xs font-semibold text-slate-900 focus:outline-none transition-colors ${
                  emailStatus?.valid === false
                    ? "border-rose-300 bg-rose-50/20 focus:border-rose-500"
                    : emailStatus?.valid === true
                    ? "border-emerald-300 bg-emerald-50/20 focus:border-emerald-500"
                    : "border-slate-200 focus:border-blue-600 bg-slate-50 focus:bg-white"
                }`}
              />
              {emailStatus?.valid === false ? (
                <div className="flex items-start gap-1.5 mt-1.5 text-rose-600">
                  <AlertCircle size={13} className="shrink-0 mt-0.5" />
                  <span className="text-[11px] font-semibold leading-tight">{emailStatus.message}</span>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 font-medium mt-1">
                  Must be an active email address capable of receiving messages.
                </p>
              )}
            </div>

            {/* Change Password Section — ONLY in Edit Mode */}
            {editUser && (
              <div className="border-t border-slate-100 pt-3.5 space-y-3">
                <div className="flex items-center gap-1.5">
                  <KeyRound size={14} className="text-blue-600" />
                  <span className="text-xs font-extrabold text-slate-900">
                    Change Password
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium ml-auto">
                    (Leave blank to keep existing)
                  </span>
                </div>

                {pwValidationError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-[11px] font-bold flex items-center gap-1.5">
                    <AlertCircle size={13} className="shrink-0" />
                    <span>{pwValidationError}</span>
                  </div>
                )}

                <div className="space-y-2.5">
                  {/* New Password */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPw ? "text" : "password"}
                        placeholder="Enter new password (min. 6 characters)"
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          setPwValidationError("");
                        }}
                        className="w-full pl-3 pr-9 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 bg-slate-50 focus:bg-white focus:border-blue-600 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPw(!showNewPw)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {showNewPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPw ? "text" : "password"}
                        placeholder="Re-enter new password"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          setPwValidationError("");
                        }}
                        className="w-full pl-3 pr-9 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 bg-slate-50 focus:bg-white focus:border-blue-600 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPw(!showConfirmPw)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Resend Invitation — only on edit */}
            {editUser && (
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                <div>
                  <span className="text-xs font-extrabold text-slate-800 block">
                    Resend Invitation
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Send a new account setup link to this user.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleResend(editUser)}
                  className="px-3.5 py-1.5 border border-slate-200 bg-white hover:bg-slate-100 rounded-xl text-xs font-extrabold text-slate-700 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Mail size={12} /> Resend
                </button>
              </div>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formLoading}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-extrabold transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60 shadow-xs"
              >
                {formLoading && <Loader2 size={13} className="animate-spin" />}
                {editUser ? "Save Changes" : "Send Invitation"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ── Super Admin Password Confirmation Pop-up Modal ── */}
      {showAdminPwModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1600] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-sm p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-black text-slate-900 tracking-tight">
                  Confirm Password Change
                </h4>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-relaxed">
                  Please enter your Super Administrator password to authorize setting a new password for this user.
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmAdminPassword} className="space-y-3.5 pt-1">
              {adminPwError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-1.5">
                  <AlertCircle size={13} className="shrink-0" />
                  <span>{adminPwError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Super Admin Password
                </label>
                <div className="relative">
                  <input
                    type={showAdminPw ? "text" : "password"}
                    required
                    autoFocus
                    placeholder="Enter your admin password"
                    value={adminPassword}
                    onChange={(e) => {
                      setAdminPassword(e.target.value);
                      setAdminPwError("");
                    }}
                    className="w-full pl-3 pr-9 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 bg-slate-50 focus:bg-white focus:border-blue-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPw(!showAdminPw)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showAdminPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdminPwModal(false)}
                  disabled={verifyingAdminPw}
                  className="flex-1 py-2 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifyingAdminPw || !adminPassword.trim()}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-extrabold transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-xs"
                >
                  {verifyingAdminPw ? (
                    <><Loader2 size={13} className="animate-spin" /> Verifying...</>
                  ) : (
                    "Authorize & Save"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
