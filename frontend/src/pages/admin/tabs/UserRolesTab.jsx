import React, { useState, useEffect } from "react";
import { PlusCircle, Pencil, Trash2, Loader2, ChevronLeft, ChevronRight, Mail } from "lucide-react";

function Avatar({ user }) {
  if (user?.avatar) return (
    <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-2xs" />
  );
  return (
    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 text-xs font-bold shadow-2xs">
      {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
    </div>
  );
}

export default function UserRolesTab({
  loading,
  visibleUsers = [],
  roleBadge,
  setShowCreate,
  setEditUser,
  setDeleteUser,
  onResendInvite,
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
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-slate-100">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm">Role &amp; Permission</h3>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Manage user accounts, roles, and administrative access permissions
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-900 text-slate-900 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
        >
          <PlusCircle size={14} /> Add Staff Account
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-left text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              {["#", "User", "Personal Email", "Role", "Status", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-semibold">
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-400 font-medium">
                  <Loader2 size={18} className="animate-spin inline mr-2 text-slate-600" /> Loading users...
                </td>
              </tr>
            ) : visibleUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-400 font-medium">
                  No users found.
                </td>
              </tr>
            ) : (
              paginatedUsers.map((u, idx) => {
                const displayIndex = startIndex + idx + 1;
                const isPending = u.status === "pending_activation";

                return (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-400">{displayIndex}</td>
                    <td className="px-4 py-3">
                      {isPending ? (
                        <span className="font-semibold text-slate-400 italic">— (pending)</span>
                      ) : (
                        <div className="flex items-center gap-2.5">
                          <Avatar user={u} />
                          <span className="font-bold text-slate-900">{u.name}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600 font-medium">
                      {u.personal_email || u.email}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <div>{roleBadge(u.role)}</div>
                        {(u.role?.name === "staff" || u.role === "staff") && u.permissions && (
                          <div className="flex flex-wrap gap-1 mt-0.5 text-[9.5px] font-mono text-slate-600">
                            {u.permissions.includes("manage_equipments") && <span>[Equip]</span>}
                            {u.permissions.includes("manage_venues") && <span>[Venues]</span>}
                            {u.permissions.includes("reports") && <span>[Reports]</span>}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {isPending ? (
                        <span className="text-amber-600 font-bold text-xs uppercase tracking-wide">
                          PENDING
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-emerald-50 text-emerald-700 border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          ACTIVE
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {isPending ? (
                          <button
                            type="button"
                            onClick={() => onResendInvite && onResendInvite(u)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
                            title="Resend activation invitation email"
                          >
                            <Mail size={12} /> Resend
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => setEditUser(u)}
                              className="p-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
                              title="Edit User"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteUser(u)}
                              className="p-1.5 rounded-lg border border-slate-300 text-rose-600 hover:bg-rose-50 transition-all cursor-pointer shadow-2xs"
                              title="Archive User"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
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

      {visibleUsers.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 text-xs font-semibold text-slate-600">
          <div>
            Showing <span className="font-mono font-bold text-slate-900">{startIndex + 1}</span> to{" "}
            <span className="font-mono font-bold text-slate-900">{Math.min(startIndex + ITEMS_PER_PAGE, visibleUsers.length)}</span> of{" "}
            <span className="font-mono font-bold text-slate-900">{visibleUsers.length}</span> user accounts
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-mono text-xs mr-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs font-bold text-xs"
            >
              <ChevronLeft size={13} /> Previous
            </button>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs font-bold text-xs"
            >
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
