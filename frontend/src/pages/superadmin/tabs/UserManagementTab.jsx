import { useState, useEffect, useRef } from "react";
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Mail, 
  Ban,
  Plus, 
  Edit2, 
  X, 
  RotateCw,
  Search,
  Filter,
  Check,
  Building2,
  Calendar,
  Lock,
  MoreVertical,
  GraduationCap
} from "lucide-react";
import api from "@/lib/axios";
import { notify } from "@/lib/notify";

const ALL_PERMISSIONS = [
  { key: "manage_venues", label: "Manage Venues", desc: "Add, edit, and configure venue settings" },
  { key: "venue_bookings", label: "Venue Bookings", desc: "Review, approve, and track venue reservations" },
  { key: "manage_equipments", label: "Manage Equipment", desc: "Add and manage equipment inventory items" },
  { key: "equipment_borrowing", label: "Equipment Borrowing", desc: "Process borrow requests, releases, and returns" },
  { key: "inspections", label: "Inspections", desc: "Conduct pre/post-use checks and report issues" },
  { key: "history_log", label: "History Log", desc: "View system audit trail and past transactions" },
  { key: "reports", label: "Analytics & Reports", desc: "Generate utilization summaries and export data" },
];

export default function UserManagementTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all"); // 'all', 'staff', 'student_assistant'
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [resendingId, setResendingId] = useState(null);
  const [openActionId, setOpenActionId] = useState(null);

  const [userForm, setUserForm] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    suffix: "",
    name: "",
    email_address: "",
    email: "",
    role: "staff",
    location: "",
    isDisabled: false,
    permissions: ["venue_bookings", "equipment_borrowing", "history_log", "inspections"],
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/users");
      setUsers(Array.isArray(res.data) ? res.data : (res.data?.data || []));
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.action-menu-container')) {
        setOpenActionId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const togglePermission = (key) => {
    setUserForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(key)
        ? prev.permissions.filter((k) => k !== key)
        : [...prev.permissions, key],
    }));
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setFormLoading(true);

    const emailValue = (userForm.email_address || userForm.email || "").trim();
    const statusValue = userForm.isDisabled ? "disabled" : "active";
    const isActiveValue = !userForm.isDisabled;
    const targetRole = userForm.role || "staff";

    const fullName = [userForm.first_name, userForm.middle_name, userForm.last_name, userForm.suffix]
      .filter(Boolean)
      .join(" ")
      .trim() || userForm.name || "User";

    const payload = {
      name: fullName,
      first_name: userForm.first_name,
      middle_name: userForm.middle_name,
      last_name: userForm.last_name,
      suffix: userForm.suffix,
      email_address: emailValue,
      email: emailValue,
      role: targetRole,
      status: statusValue,
      is_active: isActiveValue,
      location: userForm.location,
      permissions: targetRole === "staff" ? ALL_PERMISSIONS.map(p => p.key) : userForm.permissions,
    };

    if (editUser) {
      // ── OPTIMISTIC EDIT ─────────────────────────────────────────────────
      const prevUsers = [...users];
      setUsers(prev => prev.map(u => u.id === editUser.id ? { 
        ...u, 
        ...payload, 
        role: { ...(u.role || {}), name: targetRole },
        role_id: targetRole === "student_assistant" ? 3 : 2
      } : u));
      setShowAddUserModal(false);

      try {
        await api.put(`/admin/users/${editUser.id}`, payload);
        notify.success("Account Updated", `${fullName}'s details and permissions were successfully saved.`);
      } catch (err) {
        setUsers(prevUsers);
        notify.error("Update Failed", err.response?.data?.message || "Failed to update account.");
      } finally {
        setFormLoading(false);
        fetchData();
      }
    } else {
      // ── CREATE / INVITE ──────────────────────────────────────────────────
      try {
        const res = await api.post("/admin/users", payload);
        notify.success(
          "Invitation Sent",
          `An invitation email with setup instructions has been sent to ${emailValue}.`
        );
        setShowAddUserModal(false);
        fetchData();
      } catch (err) {
        notify.error("Creation Failed", err.response?.data?.message || "Failed to create user.");
      } finally {
        setFormLoading(false);
      }
    }
  };

  const handleToggleDisableUser = async (u) => {
    const isCurrentlyDisabled = u.status === "disabled" || u.status === "inactive" || u.is_active === false || u.is_active === 0;
    const newStatus = isCurrentlyDisabled ? "active" : "disabled";
    const actionLabel = isCurrentlyDisabled ? "enable" : "disable";
    const ok = window.confirm(`Are you sure you want to ${actionLabel} the account for "${u.full_name || u.name || 'this user'}"?`);
    if (!ok) return;

    const prevUsers = [...users];
    setUsers(prev => prev.map(item => item.id === u.id ? { ...item, status: newStatus, is_active: isCurrentlyDisabled } : item));

    try {
      await api.put(`/admin/users/${u.id}`, { status: newStatus, is_active: isCurrentlyDisabled });
      notify.success("Account Updated", `Account has been ${isCurrentlyDisabled ? 'enabled' : 'disabled'}.`);
    } catch (err) {
      setUsers(prevUsers);
      notify.error("Action Failed", err.response?.data?.message || `Could not ${actionLabel} account.`);
    }
  };

  const handleResendInvite = async (u) => {
    setResendingId(u.id);
    const targetEmail = u.email_address || u.email;
    try {
      const res = await api.post(`/admin/users/${u.id}/resend-invite`);
      notify.success("Invitation Sent", res.data?.message || `Invitation resent to ${targetEmail}.`);
    } catch (err) {
      notify.error("Action Failed", err.response?.data?.message || "Failed to resend invitation.");
    } finally {
      setResendingId(null);
    }
  };

  // Filter users by role tab, status filter, and search query
  const filteredUsers = users.filter((u) => {
    const roleStr = (u.role?.name || (u.role_id === 3 ? "student_assistant" : "staff")).toLowerCase();
    const isSA = roleStr.includes("student") || roleStr.includes("assistant") || u.role_id === 3;
    
    // Tab filter
    if (activeTab === "staff" && isSA) return false;
    if (activeTab === "student_assistant" && !isSA) return false;

    // Status filter
    const isDisabled = u.status === "disabled" || u.status === "inactive" || u.is_active === false || u.is_active === 0;
    const isPending = u.status === "pending_activation" || (!isDisabled && !!u.invite_token);
    const isActive = !isDisabled && !isPending;

    if (statusFilter === "active" && !isActive) return false;
    if (statusFilter === "pending" && !isPending) return false;
    if (statusFilter === "disabled" && !isDisabled) return false;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = (u.name || "").toLowerCase().includes(q) || (u.full_name || "").toLowerCase().includes(q);
      const emailMatch = (u.email_address || u.email || "").toLowerCase().includes(q);
      const locMatch = (u.location || "").toLowerCase().includes(q);
      return nameMatch || emailMatch || locMatch;
    }

    return true;
  });

  const staffCount = users.filter(u => {
    const roleStr = (u.role?.name || (u.role_id === 3 ? "student_assistant" : "staff")).toLowerCase();
    return !roleStr.includes("student") && !roleStr.includes("assistant") && u.role_id !== 3;
  }).length;

  const saCount = users.filter(u => {
    const roleStr = (u.role?.name || (u.role_id === 3 ? "student_assistant" : "staff")).toLowerCase();
    return roleStr.includes("student") || roleStr.includes("assistant") || u.role_id === 3;
  }).length;

  return (
    <div className="space-y-6">
      {/* Header section with Action Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h3 className="font-bold text-slate-900 text-sm">
            User Accounts Management
          </h3>
          <p className="text-xs text-slate-500 font-normal mt-0.5">
            Create and manage Staff and Student Assistant accounts with system operational permissions.
          </p>
        </div>
        <button
          onClick={() => {
            setEditUser(null);
            setUserForm({
              first_name: "",
              middle_name: "",
              last_name: "",
              suffix: "",
              name: "",
              email_address: "",
              email: "",
              role: "staff",
              location: "",
              isDisabled: false,
              permissions: ["venue_bookings", "equipment_borrowing", "history_log", "inspections"],
            });
            setShowAddUserModal(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer transition-all"
        >
          <Plus size={15} /> Create User Account
        </button>
      </div>

      {/* Role Navigation Tabs (All Users button is blue) */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "all"
              ? "bg-blue-600 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <Users size={14} />
          <span>All Users</span>
          <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === "all" ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-700"}`}>
            {users.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("staff")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "staff"
              ? "bg-blue-600 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <Users size={14} />
          <span>Staff</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-700">
            {staffCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("student_assistant")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "student_assistant"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <GraduationCap size={14} />
          <span>Student Assistants</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-700">
            {saCount}
          </span>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or unit..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 transition-all font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={14} className="text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-600 transition-all cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="pending">Pending Activation</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-visible">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
            <tr>
              <th className="px-4 py-3.5">User</th>
              <th className="px-4 py-3.5">Email Address</th>
              <th className="px-4 py-3.5">Role</th>
              <th className="px-4 py-3.5">Role ID</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-slate-400">
                  <div className="flex justify-center items-center gap-2">
                    <RotateCw size={16} className="animate-spin text-blue-600" />
                    <span>Loading user accounts...</span>
                  </div>
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <Users size={28} className="text-slate-300" />
                    <span className="font-semibold text-slate-500">No users found</span>
                    <span className="text-[11px] text-slate-400">Try adjusting your search query or filters.</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredUsers.map((u, index) => {
                const roleStr = (u.role?.name || (u.role_id === 3 ? "student_assistant" : "staff")).toLowerCase();
                const isSA = roleStr.includes("student") || roleStr.includes("assistant") || u.role_id === 3;
                const roleIdDisplay = u.role_id || (isSA ? 3 : 2);
                const isDisabled = u.status === "disabled" || u.status === "inactive" || u.is_active === false || u.is_active === 0;
                const isPending = u.status === "pending_activation" || (!isDisabled && !!u.invite_token);
                const isOpen = openActionId === u.id;
                const isNearBottom = index >= filteredUsers.length - 2 && filteredUsers.length > 2;
                const displayEmail = u.email_address || u.email;

                return (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5">
                      {isPending ? (
                        <span className="text-slate-400 font-normal italic">Pending Activation</span>
                      ) : (
                        <span className={`font-semibold ${isDisabled ? "text-slate-400 line-through" : "text-slate-900"}`}>
                          {u.full_name || u.name}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-600">{displayEmail}</td>
                    <td className="px-4 py-3.5">
                      {isSA ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
                          STUDENT ASSISTANT
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-blue-50 text-blue-700 border-blue-200">
                          STAFF
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold text-slate-500">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px]">
                        ID: {roleIdDisplay}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {isDisabled ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-rose-50 text-rose-700 border-rose-200">
                          DISABLED
                        </span>
                      ) : isPending ? (
                        <span className="text-amber-600 font-semibold text-xs uppercase tracking-wide">
                          PENDING
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
                          ACTIVE
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right overflow-visible relative">
                      <div className="relative action-menu-container inline-block">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenActionId(openActionId === u.id ? null : u.id);
                          }}
                          className={`p-1.5 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                            isOpen
                              ? "bg-blue-600 border-blue-600 text-white shadow-md"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                          title="Actions"
                        >
                          <MoreVertical size={14} />
                        </button>

                        {isOpen && (
                          <div 
                            className={`absolute right-0 ${isNearBottom ? 'bottom-full mb-2' : 'top-full mt-2'} w-48 bg-white rounded-2xl shadow-2xl border border-slate-200 py-1.5 z-[9999] animate-in fade-in zoom-in-95 backdrop-blur-md text-left`}
                            style={{ filter: "drop-shadow(0 20px 25px rgba(0, 0, 0, 0.15))" }}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionId(null);
                                handleResendInvite(u);
                              }}
                              disabled={resendingId === u.id}
                              className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <Mail size={13} className="text-blue-500" />
                              <span>{resendingId === u.id ? "Sending..." : "Resend Invite"}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionId(null);
                                const perms = Array.isArray(u.permissions)
                                  ? u.permissions
                                  : typeof u.permissions === "string"
                                  ? JSON.parse(u.permissions || "[]")
                                  : ALL_PERMISSIONS.map(p => p.key);

                                const userDisabled = u.status === "disabled" || u.status === "inactive" || u.is_active === false || u.is_active === 0;

                                setEditUser(u);
                                setUserForm({
                                  first_name: u.first_name || "",
                                  middle_name: u.middle_name || "",
                                  last_name: u.last_name || "",
                                  suffix: u.suffix || "",
                                  name: u.name === "Pending Activation" ? "" : (u.name || ""),
                                  email_address: displayEmail,
                                  email: displayEmail,
                                  role: isSA ? "student_assistant" : "staff",
                                  location: u.location || "",
                                  isDisabled: userDisabled,
                                  permissions: perms,
                                });
                                setShowAddUserModal(true);
                              }}
                              className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <Edit2 size={13} className="text-slate-500" />
                              <span>Edit Account</span>
                            </button>

                            <div className="border-t border-slate-100 my-1"></div>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionId(null);
                                handleToggleDisableUser(u);
                              }}
                              className="w-full px-3.5 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <Ban size={13} className="text-rose-500" />
                              <span>{isDisabled ? "Enable Account" : "Disable Account"}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Create / Edit User with Role Selection */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[1500] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 sm:p-7 max-w-lg w-full shadow-2xl animate-in zoom-in-95 border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">
                {editUser ? `Edit ${userForm.role === "student_assistant" ? "Student Assistant" : "Staff"} Account` : "Create New User Account"}
              </h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">Account Role *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setUserForm({ ...userForm, role: "staff", permissions: ALL_PERMISSIONS.map(p => p.key) })}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                    userForm.role === "staff"
                      ? "bg-blue-600 border-blue-600 text-white shadow-2xs"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                  >
                    <Users size={14} />
                    <span>Staff</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserForm({ ...userForm, role: "student_assistant" })}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                    userForm.role === "student_assistant"
                      ? "bg-emerald-600 border-emerald-600 text-white shadow-2xs"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                  >
                    <GraduationCap size={14} />
                    <span>Student Assistant</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 font-normal mt-1">
                  {userForm.role === "staff"
                    ? "Staff handle venue bookings, equipment release, approvals, and full day-to-day operations."
                    : "Student Assistants assist with equipment borrowing/returns, inspections, and monitoring."}
                </p>
              </div>

              {/* Email Address (Only field when creating account) */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. maria.santos@urios.edu.ph"
                  value={userForm.email_address || userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email_address: e.target.value, email: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg font-mono font-medium text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* Name Details & Location (Only visible when editing an existing account) */}
              {editUser && (
                <>
                  <div className="space-y-2.5 pt-1 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">Account Name Details</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-800 mb-1">First Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Maria"
                          value={userForm.first_name}
                          onChange={(e) => setUserForm({ ...userForm, first_name: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-lg font-medium text-slate-900 focus:outline-none focus:border-blue-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-800 mb-1">Middle Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Cruz"
                          value={userForm.middle_name}
                          onChange={(e) => setUserForm({ ...userForm, middle_name: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-lg font-medium text-slate-900 focus:outline-none focus:border-blue-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-800 mb-1">Last Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Santos"
                          value={userForm.last_name}
                          onChange={(e) => setUserForm({ ...userForm, last_name: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-lg font-medium text-slate-900 focus:outline-none focus:border-blue-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-800 mb-1">Suffix</label>
                        <input
                          type="text"
                          placeholder="e.g. Jr., III"
                          value={userForm.suffix}
                          onChange={(e) => setUserForm({ ...userForm, suffix: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-lg font-medium text-slate-900 focus:outline-none focus:border-blue-600"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">Assigned Unit / Department</label>
                    <input
                      type="text"
                      placeholder="e.g. AVR / Facilities Office"
                      value={userForm.location}
                      onChange={(e) => setUserForm({ ...userForm, location: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg font-medium text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-800 text-[11px] block">Activation & Credentials Email</span>
                      <span className="text-[11px] text-slate-500 block">Resend the account setup invitation to this user.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleResendInvite(editUser)}
                      disabled={resendingId === editUser.id}
                      className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      <Mail size={12} className="text-blue-600" />
                      <span>{resendingId === editUser.id ? "Sending..." : "Resend Invite"}</span>
                    </button>
                  </div>
                </>
              )}

              {/* Student Assistant Granular Permissions */}
              {userForm.role === "student_assistant" && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold text-slate-800">
                      Operational Permissions
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Select allowed operations
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ALL_PERMISSIONS.map((p) => {
                      const checked = userForm.permissions.includes(p.key);
                      return (
                        <div
                          key={p.key}
                          onClick={() => togglePermission(p.key)}
                          className={`p-2 rounded-xl border cursor-pointer flex items-start gap-2 transition-all ${
                            checked
                              ? "bg-emerald-50/70 border-emerald-300 text-emerald-950"
                              : "bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            checked ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 bg-white"
                          }`}>
                            {checked && <Check size={11} />}
                          </div>
                          <div>
                            <span className="font-bold text-[11px] block">{p.label}</span>
                            <span className="text-[10px] text-slate-500 font-normal leading-tight block">{p.desc}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Active / Disabled Status Toggle (Edit only) with Red warning styling */}
              {editUser && (
                <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-200/80 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-rose-900 text-xs block">Account Status</span>
                    <span className="text-[11px] text-rose-700/80">Temporarily disable or enable this user account.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUserForm({ ...userForm, isDisabled: !userForm.isDisabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                      userForm.isDisabled ? "bg-rose-600" : "bg-emerald-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        userForm.isDisabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                >
                  {formLoading && <RotateCw size={13} className="animate-spin" />}
                  <span>{editUser ? "Save Changes" : "Sent"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
