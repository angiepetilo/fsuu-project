import { useState, useEffect } from "react";
import {
  Users,
  Plus,
  Edit2,
  RotateCw,
  Search,
  Mail,
  Ban,
  GraduationCap,
  MoreVertical,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import api from "@/lib/axios";
import { notify } from "@/lib/notify";
import ActionPopover from "./ActionPopover";
import UserFormModal from "./UserFormModal";

export default function UsersSubTab({ showMsg }) {
  const [availableRoles, setAvailableRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [openActionId, setOpenActionId] = useState(null);
  const [actionAnchorEl, setActionAnchorEl] = useState(null);
  const [resendingId, setResendingId] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    suffix: "",
    email_address: "",
    role: "staff",
    isDisabled: false,
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/general/users");
      setUsers(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await api.get("/sysad/roles").catch(() => api.get("/general/roles"));
      setAvailableRoles(Array.isArray(res.data) ? res.data : []);
    } catch {
      setAvailableRoles([]);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest(".action-menu-wrap")) setOpenActionId(null);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const openCreate = () => {
    setEditUser(null);
    setForm({
      first_name: "",
      middle_name: "",
      last_name: "",
      suffix: "",
      email_address: "",
      role: "staff",
      isDisabled: false,
    });
    setShowModal(true);
  };

  const openEdit = (u) => {
    const isDisabled =
      u.status === "disabled" ||
      u.status === "inactive" ||
      u.is_active === false ||
      u.is_active === 0;
    const roleStr = (u.role?.name || "staff").toLowerCase();
    const isSA =
      roleStr.includes("student") || roleStr.includes("assistant") || u.role_id === 3;
    setEditUser(u);
    setForm({
      first_name: u.first_name || "",
      middle_name: u.middle_name || "",
      last_name: u.last_name || "",
      suffix: u.suffix || "",
      email_address: u.email_address || u.email || "",
      role: isSA ? "student_assistant" : "staff",
      isDisabled,
    });
    setShowModal(true);
  };

  const handleSave = async (e, newPassword = null) => {
    if (e && e.preventDefault) e.preventDefault();
    setFormLoading(true);
    const email = (form.email_address || "").trim();
    const payload = {
      email_address: email,
      email: email,
      role: form.role,
      role_id: form.role_id,
      status: form.isDisabled ? "disabled" : "active",
      is_active: !form.isDisabled,
    };
    if (newPassword) {
      payload.new_password = newPassword;
    }
    try {
      if (editUser) {
        await api.put(`/general/users/${editUser.id}`, payload);
        notify.success(
          "Account Updated",
          newPassword
            ? `Account details and password updated for ${editUser.name || email}.`
            : `Account details updated for ${editUser.name || email}.`
        );
      } else {
        await api.post("/general/users", payload);
        notify.success("Invitation Sent", `Invitation email sent to ${email}.`);
      }
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      notify.error("Failed", err.response?.data?.message || "Could not save account.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleDisable = async (u) => {
    const isCurrentlyDisabled =
      u.status === "disabled" ||
      u.status === "inactive" ||
      u.is_active === false ||
      u.is_active === 0;
    const newStatus = isCurrentlyDisabled ? "active" : "disabled";
    const prevUsers = [...users];
    setUsers((prev) =>
      prev.map((item) =>
        item.id === u.id
          ? { ...item, status: newStatus, is_active: isCurrentlyDisabled }
          : item
      )
    );
    try {
      await api.put(`/general/users/${u.id}`, {
        status: newStatus,
        is_active: isCurrentlyDisabled,
      });
      notify.success("Updated", `Account ${isCurrentlyDisabled ? "enabled" : "disabled"}.`);
    } catch (err) {
      setUsers(prevUsers);
      notify.error("Failed", err.response?.data?.message || "Could not update account.");
    }
  };

  const handleResend = async (u) => {
    setResendingId(u.id);
    try {
      const res = await api.post(`/general/users/${u.id}/resend-invite`);
      notify.success("Sent", res.data?.message || "Invitation resent.");
    } catch (err) {
      notify.error("Failed", err.response?.data?.message || "Could not resend.");
    } finally {
      setResendingId(null);
      fetchUsers();
    }
  };

  const filteredUsers = users.filter((u) => {
    const roleStr = (
      u.role?.name || (u.role_id === 3 ? "student_assistant" : "staff")
    ).toLowerCase();
    const isSA =
      roleStr.includes("student") || roleStr.includes("assistant") || u.role_id === 3;
    if (roleFilter === "staff" && isSA) return false;
    if (roleFilter === "student_assistant" && !isSA) return false;

    const isDisabled =
      u.status === "disabled" ||
      u.status === "inactive" ||
      u.is_active === false ||
      u.is_active === 0;
    const isPending =
      u.status === "pending_activation" || (!isDisabled && !!u.invite_token);
    const isActive = !isDisabled && !isPending;

    if (statusFilter === "active" && !isActive) return false;
    if (statusFilter === "pending" && !isPending) return false;
    if (statusFilter === "disabled" && !isDisabled) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        (u.name || "").toLowerCase().includes(q) ||
        (u.full_name || "").toLowerCase().includes(q) ||
        (u.email_address || u.email || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">User Accounts</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Create and manage staff and student assistant accounts.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-xs"
        >
          <Plus size={14} /> Create Account
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 transition-colors"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-slate-400 bg-white cursor-pointer"
        >
          <option value="all">All Roles</option>
          {availableRoles.map((r) => {
            const roleName = r.name || r;
            const roleLabel = roleName === "staff" ? "Staff" : roleName === "student_assistant" ? "Student Assistant" : roleName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
            return (
              <option key={r.id || roleName} value={roleName}>
                {roleLabel}
              </option>
            );
          })}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-slate-400 bg-white cursor-pointer"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>

      {/* Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Email Verified
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Date Added
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center">
                  <div className="flex items-center justify-center gap-2 text-slate-400">
                    <RotateCw size={14} className="animate-spin" />
                    <span className="text-xs">Loading accounts...</span>
                  </div>
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                  No user accounts found.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => {
                const roleName = u.role?.name || (u.role_id === 3 ? "student_assistant" : "staff");
                const isSA = roleName.toLowerCase().includes("student") || roleName.toLowerCase().includes("assistant") || u.role_id === 3;
                const roleLabel = roleName === "staff" ? "Staff" : roleName === "student_assistant" ? "SA" : roleName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

                const isDisabled =
                  u.status === "disabled" ||
                  u.status === "inactive" ||
                  u.is_active === false ||
                  u.is_active === 0;
                const isPending =
                  u.status === "pending_activation" || (!isDisabled && !!u.invite_token);
                const isVerified = !!u.email_verified_at;
                const displayEmail = u.email_address || u.email;
                const fullName = [u.first_name, u.middle_name, u.last_name, u.suffix].filter(Boolean).join(" ") || (u.name && u.name !== "Pending Activation" ? u.name : null);
                const displayName = fullName || (displayEmail ? displayEmail.split("@")[0] : "—");
                const initialChar = displayName ? displayName.charAt(0).toUpperCase() : "?";

                const dateAdded = u.created_at
                  ? new Date(u.created_at).toLocaleDateString("en-PH", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "—";

                return (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* User */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-600 flex-shrink-0 uppercase">
                          {initialChar}
                        </div>
                        <div className="flex flex-col">
                          <span
                            className={`font-medium ${
                              isDisabled ? "text-slate-400 line-through" : "text-slate-800"
                            }`}
                          >
                            {displayName}
                          </span>
                          {isPending && (
                            <span className="text-[10px] text-amber-600 font-normal">Pending Invite</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3 font-mono text-slate-600 text-[11px]">
                      {displayEmail}
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                        isSA
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}>
                        {isSA ? <GraduationCap size={10} /> : <Users size={10} />}
                        {roleLabel}
                      </span>
                    </td>

                    {/* Email Verified */}
                    <td className="px-4 py-3">
                      {isVerified ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
                          <CheckCircle2 size={13} /> Verified
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-600"
                          title="This email has not been verified. The user may be using an undeliverable or invalid address."
                        >
                          <AlertCircle size={13} /> Unverified
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {isDisabled ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-50 text-rose-600 border border-rose-200">
                          Disabled
                        </span>
                      ) : isPending ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-600 border border-amber-200">
                          Pending
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                          Active
                        </span>
                      )}
                    </td>

                    {/* Date Added */}
                    <td className="px-4 py-3 text-slate-500">{dateAdded}</td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="action-menu-wrap inline-block">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (openActionId === u.id) {
                              setOpenActionId(null);
                              setActionAnchorEl(null);
                            } else {
                              setOpenActionId(u.id);
                              setActionAnchorEl(e.currentTarget);
                            }
                          }}
                          className={`p-1.5 rounded-lg border text-xs transition-all cursor-pointer ${
                            openActionId === u.id
                              ? "bg-blue-600 border-blue-600 text-white"
                              : "border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <MoreVertical size={13} />
                        </button>

                        <ActionPopover
                          isOpen={openActionId === u.id}
                          anchorEl={actionAnchorEl}
                          onClose={() => {
                            setOpenActionId(null);
                            setActionAnchorEl(null);
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setOpenActionId(null);
                              setActionAnchorEl(null);
                              openEdit(u);
                            }}
                            className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <Edit2 size={12} /> Edit Account
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenActionId(null);
                              setActionAnchorEl(null);
                              handleResend(u);
                            }}
                            disabled={resendingId === u.id}
                            className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <Mail size={12} />{" "}
                            {resendingId === u.id ? "Sending..." : "Resend Invite"}
                          </button>
                          <div className="border-t border-slate-100 my-0.5" />
                          <button
                            type="button"
                            onClick={() => {
                              setOpenActionId(null);
                              setActionAnchorEl(null);
                              handleToggleDisable(u);
                            }}
                            className="w-full px-3.5 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <Ban size={12} />{" "}
                            {isDisabled ? "Enable Account" : "Disable Account"}
                          </button>
                        </ActionPopover>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      <UserFormModal
        showModal={showModal}
        setShowModal={setShowModal}
        editUser={editUser}
        form={form}
        setForm={setForm}
        formLoading={formLoading}
        handleSave={handleSave}
        handleResend={handleResend}
      />
    </div>
  );
}
