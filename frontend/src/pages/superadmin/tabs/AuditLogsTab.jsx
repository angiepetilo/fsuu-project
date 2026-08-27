import { useState, useEffect } from "react";
import { 
  ShieldAlert, CheckCircle2, XCircle, UserCheck, Activity, 
  Search, Calendar, Filter, RefreshCw, Eye, X, Globe, User, 
  Clock, FileText, ChevronLeft, ChevronRight, Info
} from "lucide-react";
import api from "@/lib/axios";
import notify from "@/lib/notify";

export default function AuditLogsTab() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    total_approvals: 0,
    total_rejections: 0,
    total_user_mgmt: 0,
    total_logs: 0,
  });
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
      if (res.data?.stats) {
        setStats(res.data.stats);
      }
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
    const act = action.toUpperCase();
    if (act.includes("APPROVED")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 size={12} className="text-emerald-600" />
          {act.replace(/_/g, " ")}
        </span>
      );
    }
    if (act.includes("REJECTED")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle size={12} className="text-rose-600" />
          {act.replace(/_/g, " ")}
        </span>
      );
    }
    if (act.includes("USER")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <UserCheck size={12} className="text-blue-600" />
          {act.replace(/_/g, " ")}
        </span>
      );
    }
    if (act.includes("INCIDENT") || act.includes("DAMAGE") || act.includes("LOST") || act.includes("VIOLATION")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <ShieldAlert size={12} className="text-amber-600" />
          {act.replace(/_/g, " ")}
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
    <div className="space-y-5 font-sans">
      {/* Stat Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Total Approvals</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{stats.total_approvals}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Approved bookings & borrows</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Total Rejections</p>
            <p className="text-2xl font-black text-rose-600 mt-1">{stats.total_rejections}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Rejected requests with reason</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
            <XCircle size={22} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">User Operations</p>
            <p className="text-2xl font-black text-blue-600 mt-1">{stats.total_user_mgmt}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Accounts created & modified</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <UserCheck size={22} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Total Audit Records</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{stats.total_logs}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">System-wide event entries</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
            <Activity size={22} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: "all", label: "All Activity" },
              { id: "approvals", label: "Approvals" },
              { id: "rejections", label: "Rejections" },
              { id: "users", label: "User Management" },
              { id: "incidents", label: "Incidents & Damage" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategoryFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  categoryFilter === tab.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => fetchAuditLogs(page)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-blue-600" : "text-slate-500"} />
            <span>Refresh</span>
          </button>
        </div>

        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-2 border-t border-slate-100">
          <div className="sm:col-span-5 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search reference code, staff, remarks, filer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="sm:col-span-3 flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="sm:col-span-3 flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">To:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="sm:col-span-1 flex items-center gap-1.5">
            <button
              type="submit"
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer text-center"
            >
              Filter
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
                <th className="px-4 py-3.5">Action Executed</th>
                <th className="px-4 py-3.5">Performed By</th>
                <th className="px-4 py-3.5">Auditable Entity</th>
                <th className="px-4 py-3.5">IP Address</th>
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
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <Activity size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-semibold">No audit logs found matching criteria.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Try resetting search filters.</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const meta = log.metadata || {};
                  const actor = log.user;
                  const roleName = actor?.role?.name || "Staff";
                  const refCode = meta.reference_code || (log.auditable_id ? `#${log.auditable_id}` : "N/A");
                  const remarks = meta.remarks || meta.reason || meta.note;
                  const createdDate = new Date(log.created_at || Date.now());

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
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

                      <td className="px-4 py-3 whitespace-nowrap">
                        {getActionBadge(log.action)}
                      </td>

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
                          <span className="text-slate-400 italic font-normal">System / Automated</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-[11px]">
                              {refCode}
                            </span>
                            {log.auditable_type && (
                              <span className="text-[10.5px] text-slate-500">({log.auditable_type})</span>
                            )}
                          </div>
                          {meta.filer_name && (
                            <span className="text-[11px] text-slate-600 mt-0.5 truncate max-w-[200px]">
                              Filer: {meta.filer_name}
                            </span>
                          )}
                          {remarks && (
                            <span className="text-[10.5px] text-slate-500 italic truncate max-w-[220px]">
                              "{remarks}"
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-500 text-[11px]">
                        {log.ip_address || "127.0.0.1"}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Eye size={12} />
                          <span>View</span>
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
                <h3 className="font-bold text-slate-900 text-sm">Audit Log Event Details</h3>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Log Record ID:</span>
                  <span className="font-mono font-bold text-slate-900">#{selectedLog.id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Action:</span>
                  <div>{getActionBadge(selectedLog.action)}</div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Timestamp:</span>
                  <span className="font-semibold text-slate-900">
                    {new Date(selectedLog.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">IP Address:</span>
                  <span className="font-mono text-slate-800">{selectedLog.ip_address || "N/A"}</span>
                </div>
              </div>

              {/* Performed By Card */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Actor Details</span>
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

              {/* Metadata JSON */}
              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                    Metadata & Payload
                  </span>
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
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
