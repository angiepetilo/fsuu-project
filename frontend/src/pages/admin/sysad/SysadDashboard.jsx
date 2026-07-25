import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useUserManagement } from "./hooks/useUserManagement";
import { UserForm, UserTable, CopyButton } from "./components/UserManagementUI";
import { AppCard, AppCardIcon } from "@/components/ui/app-card";
import { CardSkeleton, TableSkeleton } from "@/components/ui/skeletons";
import { useDebounce } from "@/hooks/useDebounce";
import {
  Users, ShieldCheck, UserCog, Building, PlusCircle,
  Search, RefreshCw, AlertCircle, CheckCircle, X, Sparkles
} from "lucide-react";

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-slate-100 rounded-t-3xl z-10">
          <h3 className="font-extrabold text-slate-900 text-lg">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 transition-all">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const {
    users, totalUsers, offices, loading, formLoading, error, success,
    search, setSearch, showCreate, setShowCreate, editUser, setEditUser,
    deleteUser, setDeleteUser, deleteLoading, createdCreds, setCreatedCreds,
    handleCreate, handleUpdate, handleDelete
  } = useUserManagement();

  const [roleFilter, setRoleFilter] = useState("all");
  const debouncedSearch = useDebounce(search, 300);

  // Compute stat card metrics
  const totalAdmins = useMemo(() => users.filter(u => u.role === "admin").length, [users]);
  const totalStaff  = useMemo(() => users.filter(u => u.role === "staff").length, [users]);
  const totalOffices = offices.length;

  // 0ms RAM filtering
  const filteredUsers = useMemo(() => {
    let result = users;
    if (roleFilter !== "all") {
      result = result.filter(u => u.role === roleFilter);
    }
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(u =>
        (u.name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.personal_email || "").toLowerCase().includes(q) ||
        (u.office?.name || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [users, roleFilter, debouncedSearch]);

  return (
    <div className="space-y-7 animate-in fade-in duration-300">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 uppercase tracking-wider">
              System Administration
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            User Creation & Access Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Create user accounts, assign office roles, and manage system authentication
          </p>
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl text-sm font-bold shadow-lg shadow-blue-600/25 transition-all transform hover:-translate-y-0.5"
        >
          <PlusCircle size={18} />
          Create New User
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 text-red-700 text-sm font-semibold">
          <AlertCircle size={18} />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 text-emerald-700 text-sm font-semibold">
          <CheckCircle size={18} />
          {success}
        </div>
      )}

      {/* Stat Cards Overview using minimal metric containers */}
      {loading ? (
        <CardSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#64748B]">Total Users</p>
            <p className="font-mono text-3xl font-black text-slate-900 mt-1.5 tracking-tight">{totalUsers}</p>
            <p className="text-[11px] text-slate-400 font-medium mt-1">Active accounts</p>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#64748B]">System Admins</p>
            <p className="font-mono text-3xl font-black text-slate-900 mt-1.5 tracking-tight">{totalAdmins}</p>
            <p className="text-[11px] text-slate-400 font-medium mt-1">Full privileges</p>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#64748B]">Staff Accounts</p>
            <p className="font-mono text-3xl font-black text-slate-900 mt-1.5 tracking-tight">{totalStaff}</p>
            <p className="text-[11px] text-slate-400 font-medium mt-1">Office managers</p>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#64748B]">System Offices</p>
            <p className="font-mono text-3xl font-black text-slate-900 mt-1.5 tracking-tight">{totalOffices}</p>
            <p className="text-[11px] text-slate-400 font-medium mt-1">AVR, SCO, Sysad</p>
          </div>
        </div>
      )}

      {/* User Management Section */}
      <AppCard className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Users size={18} className="text-blue-600" />
              Registered Accounts
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Showing {filteredUsers.length} of {users.length} accounts
            </p>
          </div>

          {/* Search & Role Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Filter Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setRoleFilter("all")}
                className={`px-3 py-1.5 rounded-lg transition-all ${roleFilter === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                All ({users.length})
              </button>
              <button
                onClick={() => setRoleFilter("admin")}
                className={`px-3 py-1.5 rounded-lg transition-all ${roleFilter === "admin" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                Admins ({totalAdmins})
              </button>
              <button
                onClick={() => setRoleFilter("staff")}
                className={`px-3 py-1.5 rounded-lg transition-all ${roleFilter === "staff" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                Staff ({totalStaff})
              </button>
            </div>

            {/* Search Box */}
            <div className="relative min-w-[220px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search user name or email..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 bg-white"
              />
            </div>
          </div>
        </div>

        {/* User Table Component */}
        {loading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : (
          <UserTable
            users={filteredUsers}
            onEdit={setEditUser}
            onDelete={setDeleteUser}
          />
        )}
      </AppCard>

      {/* Modal 1: Create User Form */}
      {showCreate && (
        <Modal title="Create New User Account" onClose={() => setShowCreate(false)}>
          <UserForm
            offices={offices}
            onSubmit={handleCreate}
            loading={formLoading}
            onClose={() => setShowCreate(false)}
          />
        </Modal>
      )}

      {/* Modal 2: Edit User Form */}
      {editUser && (
        <Modal title={`Edit Account: ${editUser.name}`} onClose={() => setEditUser(null)}>
          <UserForm
            initial={editUser}
            offices={offices}
            onSubmit={(fd) => handleUpdate(editUser.id, fd)}
            loading={formLoading}
            onClose={() => setEditUser(null)}
          />
        </Modal>
      )}

      {/* Modal 3: Delete Confirmation */}
      {deleteUser && (
        <Modal title="Confirm Account Deletion" onClose={() => setDeleteUser(null)}>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to delete <strong className="text-slate-900">{deleteUser.name}</strong> ({deleteUser.email})? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteUser(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteUser.id)}
                disabled={deleteLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              >
                {deleteLoading ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal 4: New User Credentials Created Notification */}
      {createdCreds && (
        <Modal title="User Account Created!" onClose={() => setCreatedCreds(null)}>
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 text-emerald-800 text-xs font-medium">
              <Sparkles size={20} className="text-emerald-600 flex-shrink-0" />
              Account has been registered. Share these credentials with the user:
            </div>
            
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-sans">Full Name:</span>
                <span className="font-bold text-slate-800">{createdCreds.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-sans">Login Username / Email:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-800">{createdCreds.username}</span>
                  <CopyButton text={createdCreds.username} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-sans">Personal Email:</span>
                <span className="font-bold text-slate-800">{createdCreds.personalEmail}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-sans">Role:</span>
                <span className="font-bold uppercase text-blue-600">{createdCreds.role}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCreatedCreds(null)}
              className="w-full py-2.5 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20"
            >
              Done
            </button>
          </div>
        </Modal>
      )}

    </div>
  );
}
