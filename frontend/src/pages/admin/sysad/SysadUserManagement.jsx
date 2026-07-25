import { PlusCircle, Loader2, AlertCircle, CheckCircle, X, Trash2 } from "lucide-react";
import { useUserManagement } from "./hooks/useUserManagement";
import { UserForm, UserTable, CopyButton } from "./components/UserManagementUI";

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

export default function SysadUserManagement() {
  const {
    users, totalUsers, offices, loading, formLoading, error, success,
    search, setSearch, showCreate, setShowCreate, editUser, setEditUser,
    deleteUser, setDeleteUser, deleteLoading, createdCreds, setCreatedCreds,
    handleCreate, handleUpdate, handleDelete
  } = useUserManagement();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">User Management</h1>
          <p className="text-sm text-slate-400 mt-0.5">Create and manage all system user accounts</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-blue-600/20">
          <PlusCircle size={14} /> Add User
        </button>
      </div>

      {/* Alerts */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 text-emerald-700 text-sm font-semibold animate-in slide-in-from-top-2 duration-300">
          <CheckCircle size={18} />{success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 text-red-700 text-sm font-semibold animate-in slide-in-from-top-2 duration-300">
          <AlertCircle size={18} />{error}
        </div>
      )}

      {/* Credentials reveal */}
      {createdCreds && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 space-y-3 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between">
            <p className="font-bold text-blue-900 text-sm">Account Created: {createdCreds.name}</p>
            <button onClick={() => setCreatedCreds(null)} className="text-blue-400 hover:text-blue-700"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-white rounded-xl p-3 border border-blue-100">
              <p className="text-slate-400 font-bold mb-1">LOGIN USERNAME</p>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-bold text-slate-900">{createdCreds.username}</span>
                <CopyButton text={createdCreds.username} />
              </div>
            </div>
            <div className="bg-white rounded-xl p-3 border border-blue-100">
              <p className="text-slate-400 font-bold mb-1">EMAIL SENT TO</p>
              <span className="font-bold text-slate-900 break-all">{createdCreds.personalEmail}</span>
            </div>
            <div className="bg-white rounded-xl p-3 border border-blue-100">
              <p className="text-slate-400 font-bold mb-1">ROLE</p>
              <span className="font-bold text-slate-900 capitalize">{createdCreds.role}</span>
            </div>
          </div>
          <p className="text-[11px] text-blue-700 font-medium">
            The generated password was sent to <strong>{createdCreds.personalEmail}</strong>. The user must check their inbox.
          </p>
        </div>
      )}

      {/* Search */}
      <div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, username, or office…"
          className="w-full sm:w-80 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
      </div>

      {/* Main Table Component */}
      <UserTable 
        users={users} 
        loading={loading} 
        onEdit={setEditUser} 
        onDelete={setDeleteUser} 
        searchMessage={search ? "No users match your search." : "No users found."}
      />

      {/* Modals */}
      {showCreate && (
        <Modal title="Add New User" onClose={() => setShowCreate(false)}>
          <UserForm offices={offices} loading={formLoading} onSubmit={handleCreate} onClose={() => setShowCreate(false)} />
        </Modal>
      )}
      
      {editUser && (
        <Modal title="Edit User" onClose={() => setEditUser(null)}>
          <UserForm initial={editUser} offices={offices} loading={formLoading} onSubmit={handleUpdate} onClose={() => setEditUser(null)} />
        </Modal>
      )}
      
      {deleteUser && (
        <Modal title="Delete User" onClose={() => setDeleteUser(null)}>
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <Trash2 size={28} className="text-red-600" />
            </div>
            <div>
              <p className="font-bold text-slate-900">Delete "{deleteUser.name}"?</p>
              <p className="text-sm text-slate-500 mt-1">This action cannot be undone. All login access will be removed.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteUser(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleteLoading}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {deleteLoading && <Loader2 size={14} className="animate-spin" />} Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
