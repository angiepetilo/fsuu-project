import { useState, useEffect } from "react";
import { ShieldCheck, PlusCircle, Pencil, Trash2, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

function Avatar({ user }) {
  if (user?.avatar) return (
    <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full object-cover border-2 border-white shadow" />
  );
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold border-2 border-white shadow">
      {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
    </div>
  );
}

export default function UserRolesTab({
  loading,
  visibleUsers,
  roleBadge,
  setShowCreate,
  setEditUser,
  setDeleteUser,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [visibleUsers.length]);

  const totalPages = Math.ceil(visibleUsers.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedUsers = visibleUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-blue-600" />
          <span className="font-bold text-slate-900 text-sm">Role & User Access Permissions</span>
          <span className="ml-1 text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
            {visibleUsers.length}
          </span>
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-md cursor-pointer"
        >
          <PlusCircle size={15} /> Add User
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-100">
              {["#", "User", "Username", "Personal Email", "Office", "Role", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400 text-xs font-semibold">
                  <Loader2 size={20} className="animate-spin inline mr-2" /> Loading users...
                </td>
              </tr>
            ) : visibleUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400 text-xs font-semibold">
                  No users found for your office scope.
                </td>
              </tr>
            ) : (
              paginatedUsers.map((u, idx) => {
                const displayIndex = startIndex + idx + 1;
                return (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-400 text-xs">{displayIndex}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar user={u} />
                        <span className="font-extrabold text-slate-900">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-600 font-bold">{u.email}</td>
                    <td className="px-4 py-3.5 text-slate-500 text-xs font-semibold">
                      {u.personal_email ?? <span className="text-slate-300 italic">not set</span>}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 text-xs font-semibold">{u.office?.name ?? "FSUU Main"}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col gap-1">
                        <div>{roleBadge(u.role)}</div>
                        {(u.role?.name === "staff" || u.role === "staff") && u.permissions && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {u.permissions.includes("manage_equipments") && (
                              <span className="text-[9px] font-bold bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200">📦 Equip</span>
                            )}
                            {u.permissions.includes("manage_venues") && (
                              <span className="text-[9px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">🏛️ Venues</span>
                            )}
                            {u.permissions.includes("reports") && (
                              <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">📊 Reports</span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditUser(u)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                          title="Edit User & Access Permissions"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteUser(u)}
                          className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                          title="Delete User"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {visibleUsers.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-slate-50/80 border-t border-slate-100 text-xs font-semibold text-slate-600">
          <div>
            Showing <span className="font-extrabold text-slate-900">{startIndex + 1}</span> to{" "}
            <span className="font-extrabold text-slate-900">{Math.min(startIndex + ITEMS_PER_PAGE, visibleUsers.length)}</span> of{" "}
            <span className="font-extrabold text-slate-900">{visibleUsers.length}</span> system users
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-bold mr-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-xs font-bold text-xs"
            >
              <ChevronLeft size={14} /> Previous
            </button>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-xs font-bold text-xs"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
