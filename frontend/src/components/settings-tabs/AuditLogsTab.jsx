import { useState, useEffect } from "react";
import { 
  ShieldAlert, CheckCircle2, XCircle, UserCheck, Activity, 
  Search, Calendar, Filter, RefreshCw, Eye, X, Globe, User, 
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

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);
  const [previewPhoto, setPreviewPhoto] = useState(null);

  const fetchAuditLogs = async (targetPage = 1) => {
    setLoading(true);
    try {
      const params = {
        page: targetPage,
        per_page: 25,
      };
      if (categoryFilter !== "all") params.action = categoryFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

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
    fetchAuditLogs(1);
  }, [categoryFilter, dateFrom, dateTo]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAuditLogs(1);
  };

  const resetFilters = () => {
    setCategoryFilter("all");
    setSearchTerm("");
    setDateFrom("");
    setDateTo("");
    fetchAuditLogs(1);
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
    if (act.includes("PIN") || act.includes("VERIFICATION")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
          <Key size={12} className="text-orange-600" />
          Verification PIN
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
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
        <Activity size={12} className="text-slate-500" />
        {act.replace(/_/g, " ")}
      </span>
    );
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Sleek, Simple, Plain & Minimal Filter Bar (No tabs) */}
      <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 space-y-2.5">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex-1 min-w-[220px] relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search user, action, reference, description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none shadow-2xs cursor-pointer"
            >
              <option value="all">All Actions</option>
              <option value="approval">Approval</option>
              <option value="rejection">Rejection</option>
              <option value="inspection">Inspection</option>
              <option value="complete">Complete</option>
              <option value="manage_equipment">Manage Equipment</option>
              <option value="add_user">Add User</option>
              <option value="venue_creation">Venue Creation</option>
              <option value="change_password">Change Password</option>
              <option value="verification_pin">Verification PIN</option>
              <option value="equipment_category">Equipment Category</option>
              <option value="manage_venue">Manage Venue</option>
            </select>

            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none shadow-2xs"
              title="From date"
            />

            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none shadow-2xs"
              title="To date"
            />

            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer"
            >
              Filter
            </button>

            <button
              type="button"
              onClick={() => fetchAuditLogs(page)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs"
              title="Refresh audit log"
            >
              <RefreshCw size={13} className={loading ? "animate-spin text-blue-600" : "text-slate-500"} />
              <span>Refresh</span>
            </button>
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
                <th className="px-4 py-3.5">Device & IP</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
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
                    <p className="text-[11px] text-slate-400 mt-0.5">Try resetting search filters or changing tabs.</p>
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
                  } else if (act.includes("APPROVED") || act.includes("SUCCESS") || act.includes("CREATED")) {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={11} className="text-emerald-600" />
                        Success
                      </span>
                    );
                  } else if (act.includes("REJECTED") || act.includes("FAILED") || act.includes("TERMINATED")) {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <XCircle size={11} className="text-rose-600" />
                        {act.includes("TERMINATED") ? "Terminated" : "Rejected"}
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
                onClick={() => fetchAuditLogs(pagination.current_page - 1)}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer transition-all flex items-center gap-1"
              >
                <ChevronLeft size={13} />
                <span>Prev</span>
              </button>
              <button
                type="button"
                disabled={pagination.current_page >= pagination.last_page}
                onClick={() => fetchAuditLogs(pagination.current_page + 1)}
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
                        {selectedLog.metadata.venue_name || selectedLog.metadata.equipment_name || selectedLog.metadata.target_type?.replace(/_/g, " ") || "Resource"}
                      </span>
                    </div>
                  </div>

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
