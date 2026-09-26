import { useState, useEffect, useRef } from "react";
import { 
  ShieldAlert, CheckCircle2, XCircle, UserCheck, Activity, 
  Search, RefreshCw, Eye, X, Globe, User, 
  Clock, FileText, ChevronLeft, ChevronRight, Info, AlertCircle,
  AlertTriangle, Package, Building2, Tag, Phone, Mail, ExternalLink,
  Camera, Lock, Key
} from "lucide-react";
import api from "@/lib/axios";
import notify from "@/lib/notify";

export default function AuditLogsTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 25,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const isFirstMount = useRef(true);

  const fetchAuditLogs = async (targetPage = 1, query = searchTerm) => {
    setLoading(true);
    try {
      const params = {
        page: targetPage,
        per_page: 25,
      };
      if (typeof query === "string" && query.trim()) {
        params.search = query.trim();
      }

      const res = await api.get("/sysad/audit-logs", { params });
      const logsData = res.data?.logs?.data || (Array.isArray(res.data?.logs) ? res.data.logs : []);
      setLogs(logsData);
      if (res.data?.logs?.current_page) {
        setPagination({
          current_page: res.data.logs.current_page,
          last_page: res.data.logs.last_page,
          total: res.data.logs.total,
          per_page: res.data.logs.per_page,
        });
        setPage(res.data.logs.current_page);
      }
    } catch (err) {
      notify.error("Failed to Load Logs", "Could not retrieve audit trail data.");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      fetchAuditLogs(1, "");
      return;
    }
    const timer = setTimeout(() => {
      fetchAuditLogs(1, searchTerm);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAuditLogs(1, searchTerm);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    fetchAuditLogs(1, "");
  };

  const getActionBadge = (action = "") => {
    const act = (action || "").toUpperCase();

    if (act.includes("APPROVED") || act === "APPROVAL") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 size={12} className="text-emerald-600" />
          Approval
        </span>
      );
    }
    if (act.includes("REJECTED") || act === "REJECTION") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle size={12} className="text-rose-600" />
          Rejection
        </span>
      );
    }
    if (act.includes("INSPECT") || act.includes("VIOLATION") || act.includes("DAMAGE") || act.includes("LOST")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <ShieldAlert size={12} className="text-amber-600" />
          Inspection
        </span>
      );
    }
    if (act.includes("COMPLETE") || act === "COMPLETED") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 size={12} className="text-emerald-600" />
          Complete
        </span>
      );
    }
    if (act.includes("PASSWORD")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
          <Lock size={12} className="text-amber-600" />
          Change Password
        </span>
      );
    }
    if (act.includes("SYSTEM_SETTINGS") || act.includes("SYSTEM_SETTING")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <Lock size={12} className="text-indigo-600" />
          System Settings
        </span>
      );
    }
    if (act.includes("PIN") || act.includes("VERIFICATION") || act.includes("SECURITY")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
          <Key size={12} className="text-orange-600" />
          {act.includes("PIN") ? "Verification PIN" : "Security Verification"}
        </span>
      );
    }
    if (act.includes("CATEGORY")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <Tag size={12} className="text-indigo-600" />
          Equipment Category
        </span>
      );
    }
    if (act === "VENUE_CREATED") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <Building2 size={12} className="text-blue-600" />
          Venue Creation
        </span>
      );
    }
    if (act.includes("VENUE")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
          <Building2 size={12} className="text-purple-600" />
          Manage Venue
        </span>
      );
    }
    if (act.includes("EQUIPMENT") || act.includes("BRAND")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
          <Package size={12} className="text-sky-600" />
          Manage Equipment
        </span>
      );
    }
    if (act.includes("USER") || act.includes("ROLE")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <UserCheck size={12} className="text-blue-600" />
          Add User
        </span>
      );
    }
    if (act.includes("RELEASED") || act.includes("ONGOING")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">
          <Activity size={12} className="text-cyan-600" />
          Released / On-going
        </span>
      );
    }
    if (act.includes("CANCEL")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
          <XCircle size={12} className="text-slate-600" />
          Cancelled
        </span>
      );
    }
    if (act.includes("INCOMPLETE")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <AlertTriangle size={12} className="text-amber-600" />
          Incomplete
        </span>
      );
    }
    if (act.includes("UNDO") || act.includes("REVERT")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
          <RefreshCw size={12} className="text-orange-600" />
          Reverted / Undo
        </span>
      );
    }
    if (act.includes("OVERRIDE")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
          <AlertCircle size={12} className="text-purple-600" />
          Override
        </span>
      );
    }
    if (act.includes("UNITS_ASSIGNED")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
          <Package size={12} className="text-teal-600" />
          Units Assigned
        </span>
      );
    }
    if (act.includes("BULK_IMPORTED")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <FileText size={12} className="text-indigo-600" />
          Bulk Imported
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
        <Activity size={12} className="text-slate-500" />
        {act.replace(/_/g, " ")}
      </span>
    );
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Clean & Sleek Search Bar with Refresh */}
      <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/80">
        <form onSubmit={handleSearchSubmit} className="flex items-center justify-between gap-2.5">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by barcode, action/module, user, activity description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 shadow-2xs transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                title="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[11px] font-semibold">
              <tr>
                <th className="px-4 py-3.5">Timestamp</th>
                <th className="px-4 py-3.5">User</th>
                <th className="px-4 py-3.5">Action / Module</th>
                <th className="px-4 py-3.5">Activity Description</th>
                <th className="px-4 py-3.5">Device & IP</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="flex items-center justify-center gap-2 text-slate-400">
                      <div className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin" />
                      <span className="text-xs font-semibold italic">Loading audit trail records...</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <Activity size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-semibold">No incident or audit logs found matching criteria.</p>
                    {searchTerm ? (
                      <button
                        type="button"
                        onClick={handleClearSearch}
                        className="text-[11px] text-blue-600 hover:underline mt-1.5 font-semibold cursor-pointer block mx-auto"
                      >
                        Clear search query
                      </button>
                    ) : (
                      <p className="text-[11px] text-slate-400 mt-0.5">No audit activity recorded yet.</p>
                    )}
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const meta = log.metadata || {};
                  const actor = log.user;
                  const roleName = actor?.role?.name || "Staff";
                  const refCode = meta.reference_code || (log.auditable_id ? `#${log.auditable_id}` : "");
                  const remarks = meta.remarks || meta.reason || meta.note;
                  const createdDate = new Date(log.created_at || Date.now());

                  // Module resolution
                  const moduleName = (log.auditable_type || "")
                    .replace(/App\\Models\\/g, "")
                    .replace(/_/g, " ")
                    .toLowerCase();

                  const act = (log.action || "").toUpperCase();
                  const isIncident = act.includes("INCIDENT") || act.includes("DAMAGE") || act.includes("LOST") || act.includes("VIOLATION");

                  // Status determination
                  let statusBadge = (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-slate-100 text-slate-700">
                      Completed
                    </span>
                  );
                  if (act === "VENUE_UNIT_DAMAGED" || act === "EQUIPMENT_UNIT_DAMAGED") {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <AlertCircle size={11} className="text-rose-600" />
                        Damaged Unit
                      </span>
                    );
                  } else if (act === "VENUE_UNIT_LOST" || act === "EQUIPMENT_UNIT_LOST") {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <AlertTriangle size={11} className="text-amber-600" />
                        Lost Unit
                      </span>
                    );
                  } else if (act === "VENUE_POLICY_VIOLATION" || act === "EQUIPMENT_POLICY_VIOLATION") {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-violet-50 text-violet-700 border border-violet-200">
                        <ShieldAlert size={11} className="text-violet-600" />
                        Policy Breach
                      </span>
                    );
                  } else if (act.includes("APPROVED") || act.includes("SUCCESS") || act.includes("GRANTED") || act.includes("CREATED")) {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={11} className="text-emerald-600" />
                        {act.includes("GRANTED") ? "Access Granted" : "Success"}
                      </span>
                    );
                  } else if (act.includes("REJECTED") || act.includes("FAILED") || act.includes("DENIED") || act.includes("TERMINATED")) {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <XCircle size={11} className="text-rose-600" />
                        {act.includes("DENIED") ? "Access Denied" : act.includes("TERMINATED") ? "Terminated" : "Rejected"}
                      </span>
                    );
                  }

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Timestamp */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900">
                            {createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                          <span className="text-[10.5px] text-slate-500">
                            {createdDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      </td>

                      {/* User / Actor */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {actor ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                              {actor.name ? actor.name.charAt(0).toUpperCase() : "U"}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-900">{actor.name || actor.email}</span>
                              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                                {roleName}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic font-normal">System Automated</span>
                        )}
                      </td>

                      {/* Action / Module */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          {getActionBadge(log.action)}
                          {moduleName && (
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Module: <span className="text-slate-600 capitalize">{moduleName}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Activity Description */}
                      <td className="px-4 py-3 min-w-[220px] max-w-[360px]">
                        <div className="flex flex-col gap-0.5">
                          <p className="text-xs text-slate-800 font-medium leading-snug line-clamp-2" title={meta.description || meta.remarks || remarks || refCode}>
                            {meta.description || (
                              <>
                                {refCode && <span className="text-blue-600 font-bold mr-1">{refCode}:</span>}
                                <span>{remarks || meta.reason || act.replace(/_/g, " ")}</span>
                              </>
                            )}
                          </p>
                          {meta.reference_code && meta.description && (
                            <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded w-fit inline-block">
                              {meta.reference_code}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Device & IP */}
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-slate-600">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <Globe size={11} className="text-slate-400" />
                            <span className="font-semibold text-slate-800">{log.ip_address || "127.0.0.1"}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-sans">
                            {meta.device || "Web Client"}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {statusBadge}
                      </td>

                      {/* Details */}
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Eye size={12} />
                          <span>Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pagination.last_page > 1 && (
          <div className="p-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
            <span className="text-xs text-slate-500">
              Showing page <strong className="text-slate-900">{pagination.current_page}</strong> of{" "}
              <strong className="text-slate-900">{pagination.last_page}</strong> ({pagination.total} total records)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={pagination.current_page <= 1}
                onClick={() => fetchAuditLogs(pagination.current_page - 1, searchTerm)}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer transition-all flex items-center gap-1"
              >
                <ChevronLeft size={13} />
                <span>Prev</span>
              </button>
              <button
                type="button"
                disabled={pagination.current_page >= pagination.last_page}
                onClick={() => fetchAuditLogs(pagination.current_page + 1, searchTerm)}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer transition-all flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/40 z-[1600] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95 border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  {selectedLog.action?.includes("INCIDENT") || selectedLog.action?.includes("DAMAGE") || selectedLog.action?.includes("LOST") || selectedLog.action?.includes("VIOLATION")
                    ? "Incident & Damage Record Details"
                    : "Audit Log Event Details"}
                </h3>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Event Overview Card */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Log Record ID:</span>
                  <span className="font-mono font-bold text-slate-900">#{selectedLog.id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Action Event:</span>
                  <div>{getActionBadge(selectedLog.action)}</div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Logged Timestamp:</span>
                  <span className="font-semibold text-slate-900">
                    {new Date(selectedLog.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">IP Address / Host:</span>
                  <span className="font-mono text-slate-800">{selectedLog.ip_address || "127.0.0.1"}</span>
                </div>
              </div>

              {/* Specialized Incident & Damage Breakdown Card */}
              {selectedLog.metadata && (
                <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/90 space-y-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                    Incident Breakdown
                  </span>
                  
                  {/* Reference & Target */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Reference Code</span>
                      <span className="font-mono font-bold text-blue-600 text-xs">
                        {selectedLog.metadata.reference_code || `#${selectedLog.auditable_id}`}
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Facility / Module</span>
                      <span className="font-semibold text-slate-800 capitalize">
                        {selectedLog.metadata.venue_name || selectedLog.metadata.equipment_name || selectedLog.metadata.module || selectedLog.metadata.target_type?.replace(/_/g, " ") || "Resource"}
                      </span>
                    </div>
                  </div>

                  {/* Password Verification Attempt Count if applicable */}
                  {selectedLog.metadata.attempt_count && (
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Security Verification Attempts</span>
                        <span className="font-semibold text-slate-800">
                          {selectedLog.metadata.module || "Protected Module"}
                        </span>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-bold font-mono ${selectedLog.metadata.status === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                        Attempt #{selectedLog.metadata.attempt_count} • {selectedLog.metadata.status === 'success' ? 'Access Granted' : 'Access Denied'}
                      </span>
                    </div>
                  )}

                  {/* Responsible Person / Filer */}
                  {selectedLog.metadata.filer_name && (
                    <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Responsible Person / Filer
                      </span>
                      <p className="font-bold text-slate-900 text-xs">{selectedLog.metadata.filer_name}</p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-0.5 flex-wrap">
                        {selectedLog.metadata.department && (
                          <span className="flex items-center gap-1 font-semibold text-slate-700">
                            <Building2 size={11} className="text-slate-400" />
                            {selectedLog.metadata.department}
                          </span>
                        )}
                        {selectedLog.metadata.contact_number && selectedLog.metadata.contact_number !== 'N/A' && (
                          <span className="flex items-center gap-1 font-mono">
                            <Phone size={11} className="text-slate-400" />
                            {selectedLog.metadata.contact_number}
                          </span>
                        )}
                        {selectedLog.metadata.email_address && selectedLog.metadata.email_address !== 'N/A' && (
                          <span className="flex items-center gap-1 font-mono text-[10.5px]">
                            <Mail size={11} className="text-slate-400" />
                            {selectedLog.metadata.email_address}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Policy Violation */}
                  {selectedLog.metadata.violation_type && (
                    <div className="bg-violet-50/70 p-3 rounded-lg border border-violet-200/80">
                      <span className="text-[10px] text-violet-700 uppercase font-bold block mb-0.5">
                        Recorded Policy Breach
                      </span>
                      <p className="font-semibold text-violet-900 text-xs">
                        {selectedLog.metadata.violation_type}
                      </p>
                    </div>
                  )}

                  {/* Damaged Barcodes */}
                  {Array.isArray(selectedLog.metadata.damaged_units) && selectedLog.metadata.damaged_units.length > 0 && (
                    <div className="bg-rose-50/70 p-3 rounded-lg border border-rose-200/80 space-y-1">
                      <span className="text-[10px] text-rose-700 uppercase font-bold block">
                        Damaged Physical Units
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {selectedLog.metadata.damaged_units.map((code, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded-md font-mono font-bold text-xs bg-white text-rose-700 border border-rose-300 shadow-2xs">
                            #{code}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Lost Barcodes */}
                  {Array.isArray(selectedLog.metadata.lost_units) && selectedLog.metadata.lost_units.length > 0 && (
                    <div className="bg-amber-50/70 p-3 rounded-lg border border-amber-200/80 space-y-1">
                      <span className="text-[10px] text-amber-700 uppercase font-bold block">
                        Lost / Unreturned Physical Units
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {selectedLog.metadata.lost_units.map((code, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded-md font-mono font-bold text-xs bg-white text-amber-700 border border-amber-300 shadow-2xs">
                            #{code}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Inspection Remarks */}
                  {selectedLog.metadata.remarks && (
                    <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Inspection Remarks / Notes
                      </span>
                      <p className="text-slate-800 font-medium italic text-xs leading-relaxed">
                        "{selectedLog.metadata.remarks}"
                      </p>
                    </div>
                  )}

                  {/* Evidence Photos */}
                  {Array.isArray(selectedLog.metadata.evidence_photos) && selectedLog.metadata.evidence_photos.length > 0 && (
                    <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                      <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs">
                        <Camera size={13} className="text-blue-600" />
                        <span>Attached Inspection Photos ({selectedLog.metadata.evidence_photos.length})</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedLog.metadata.evidence_photos.map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative rounded-lg overflow-hidden border border-slate-200 bg-slate-100 aspect-video block"
                          >
                            <img
                              src={url}
                              alt={`Evidence photo ${i + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold gap-1">
                              <ExternalLink size={12} />
                              <span>View Photo</span>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Inspector Details Card */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Inspector / Staff Actor
                </span>
                {selectedLog.user ? (
                  <div className="flex items-center gap-3 pt-1">
                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                      {selectedLog.user.name?.charAt(0) || "U"}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{selectedLog.user.name}</p>
                      <p className="text-slate-500 font-mono text-[11px]">{selectedLog.user.email}</p>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {selectedLog.user.role?.name || "Staff"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500 italic">Performed by system process</p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
