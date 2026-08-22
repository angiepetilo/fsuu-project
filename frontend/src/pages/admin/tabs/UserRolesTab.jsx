import React, { useState, useEffect } from "react";
import { Plus, MoreVertical, Edit2, Trash2, Mail, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

export default function UserRolesTab({
  loading,
  visibleUsers = [],
  setShowCreate,
  setEditUser,
  setDeleteUser,
  onResendInvite,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [openActionId, setOpenActionId] = useState(null);
  const [resendingId, setResendingId] = useState(null);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [visibleUsers.length]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest(".action-menu-container")) {
        setOpenActionId(null);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  const totalPages = Math.ceil(visibleUsers.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedUsers = visibleUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleResend = async (u) => {
    setResendingId(u.id);
    try {
      if (onResendInvite) await onResendInvite(u);
    } finally {
      setResendingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="font-bold text-slate-900 text-sm">
            Staff Accounts Management
          </h3>
          <p className="text-xs text-slate-500 font-normal mt-0.5">
            Create and manage staff accounts and feature permissions. Activation links and credentials are sent to the user's email.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer transition-all shrink-0"
        >
          <Plus size={15} /> Create Staff Account
        </button>
      </div>

      {/* User Accounts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {["#", "Account Name", "Email", "Role", "Status", "Actions"].map((h, i) => (
                <th key={h} className={`px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider ${i === 0 ? 'rounded-tl-2xl' : i === 5 ? 'rounded-tr-2xl' : ''}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-10">
                  <div className="flex items-center justify-center gap-2 text-slate-400">
                    <Loader2 size={16} className="animate-spin text-blue-500" />
                    <span className="text-xs font-semibold italic">Loading staff accounts...</span>
                  </div>
                </td>
              </tr>
            ) : visibleUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-slate-400">
                  <span>No staff accounts found. Click "Create Staff Account" to add one.</span>
                </td>
              </tr>
            ) : (
              paginatedUsers.map((u, idx) => {
                const displayIndex = startIndex + idx + 1;
                const isPending = u.status === "pending_activation" || !u.name || u.name === "Pending Activation";
                const isDisabled = u.status === "disabled" || u.status === "inactive" || u.is_active === false || u.is_active === 0;
                const isNearBottom = idx >= Math.max(1, paginatedUsers.length - 2);
                const isOpen = openActionId === u.id;

                return (
                  <tr key={u.id} className={`hover:bg-slate-50/60 transition-colors ${isOpen ? 'relative z-30' : ''}`}>
                    <td className="px-4 py-3.5 font-bold text-slate-400">{displayIndex}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-xs shrink-0 border border-blue-200">
                          {u.name ? u.name[0].toUpperCase() : "U"}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{u.name || "Pending User"}</div>
                          <div className="text-[11px] text-slate-400">{u.personal_email || u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 font-medium">{u.email}</td>
                    <td className="px-4 py-3.5">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {u.role?.name || "Staff"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {isPending ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                          INVITED
                        </span>
                      ) : isDisabled ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
                          DISABLED
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                          ACTIVE
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 relative">
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
                          <div className={`absolute right-0 ${isNearBottom ? 'bottom-full mb-1.5' : 'top-full mt-1.5'} w-44 bg-white rounded-2xl shadow-2xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 backdrop-blur-md`}>
                            {isPending && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenActionId(null);
                                  handleResend(u);
                                }}
                                disabled={resendingId === u.id}
                                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <Mail size={13} className="text-blue-500" />
                                <span>{resendingId === u.id ? "Sending..." : "Resend Invite"}</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionId(null);
                                setEditUser(u);
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
                                setDeleteUser(u);
                              }}
                              className="w-full px-3.5 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <Trash2 size={13} className="text-rose-500" />
                              <span>Archive Account</span>
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

        {visibleUsers.length > ITEMS_PER_PAGE && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 text-xs font-medium text-slate-600 bg-slate-50">
            <div>
              Showing <span className="font-bold text-slate-900">{startIndex + 1}</span> to{" "}
              <span className="font-bold text-slate-900">{Math.min(startIndex + ITEMS_PER_PAGE, visibleUsers.length)}</span> of{" "}
              <span className="font-bold text-slate-900">{visibleUsers.length}</span> staff accounts
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-xs mr-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors text-xs font-semibold"
              >
                <ChevronLeft size={13} /> Previous
              </button>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors text-xs font-semibold"
              >
                Next <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
