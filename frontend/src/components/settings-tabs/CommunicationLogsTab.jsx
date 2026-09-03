import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import api from "@/lib/axios";
import { formatDate } from "@/lib/dateUtils";

export default function CommunicationLogsTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [channelFilter, setChannelFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Modal inspection
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("page", String(page));
      params.append("per_page", "15");

      if (channelFilter !== "all") params.append("channel", channelFilter);
      if (categoryFilter !== "all") params.append("category", categoryFilter);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (searchTerm.trim()) params.append("search", searchTerm.trim());

      const res = await api.get(`/general/communication-logs?${params.toString()}`);
      if (res.data) {
        setLogs(res.data.data || []);
        setTotalPages(res.data.last_page || 1);
        setTotalCount(res.data.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch communication logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, channelFilter, categoryFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const getChannelBadge = (channel) => {
    if (channel === "sms") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10.5px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
          SMS
        </span>
      );
    }
    if (channel === "notification") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10.5px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
          Notice
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10.5px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
        Email
      </span>
    );
  };

  const getCategoryLabel = (cat) => {
    switch (cat) {
      case "venue_confirmation":
        return "Venue Confirmation";
      case "equipment_confirmation":
        return "Equipment Confirmation";
      case "status_update":
        return "Status Update";
      case "urgent_reminder":
        return "Due Time Advance Reminder";
      case "overdue_reminder":
        return "Overdue / Late Alert";
      case "venue_day_reminder":
        return "Venue Grace Period Notice";
      case "user_credentials":
        return "New User Credentials";
      case "test_email":
        return "SMTP Test Dispatch";
      default:
        return cat || "System Dispatch";
    }
  };

  const getStatusBadge = (status) => {
    if (status === "sent") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-black uppercase tracking-wider bg-emerald-50 border border-emerald-200 text-emerald-700">
          SENT
        </span>
      );
    }
    if (status === "failed") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-black uppercase tracking-wider bg-rose-50 border border-rose-200 text-rose-700">
          FAILED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-black uppercase tracking-wider bg-amber-50 border border-amber-200 text-amber-700">
        QUEUED
      </span>
    );
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Summary */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-slate-900 tracking-tight">Communications &amp; Dispatch Log</h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Audit history of automated and manual emails, SMS notices, booking confirmations, overdue reminders, and credentials.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setPage(1); fetchLogs(); }}
          disabled={loading}
          className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer self-start sm:self-auto disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Channel Filter */}
          <select
            value={channelFilter}
            onChange={(e) => { setChannelFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
          >
            <option value="all">All Channels</option>
            <option value="email">Email Dispatches</option>
            <option value="sms">SMS Alerts</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
          >
            <option value="all">All Categories</option>
            <option value="venue_confirmation">Venue Confirmations</option>
            <option value="equipment_confirmation">Equipment Confirmations</option>
            <option value="status_update">Status Updates</option>
            <option value="urgent_reminder">Due Time Reminders</option>
            <option value="overdue_reminder">Overdue Alerts</option>
            <option value="user_credentials">User Credentials</option>
            <option value="test_email">SMTP Tests</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="sent">Sent</option>
            <option value="queued">Queued</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-auto">
          <input
            type="text"
            placeholder="Search recipient, code, subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0 shadow-xs"
          >
            Search
          </button>
        </form>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4 w-12 text-center">#</th>
                <th className="py-3.5 px-4">CHANNEL</th>
                <th className="py-3.5 px-4">CATEGORY</th>
                <th className="py-3.5 px-4">RECIPIENT</th>
                <th className="py-3.5 px-4">TRACK / CODE</th>
                <th className="py-3.5 px-4">SUBJECT / PREVIEW</th>
                <th className="py-3.5 px-4">TIMESTAMP</th>
                <th className="py-3.5 px-4 text-center">STATUS</th>
                <th className="py-3.5 px-4 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    <Loader2 size={20} className="animate-spin inline mr-2 text-blue-600" />
                    <span>Loading logs...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400 font-normal">
                    No communication dispatch logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log, idx) => (
                  <tr key={log.id || idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 text-slate-400 font-bold text-center">
                      {(page - 1) * 15 + idx + 1}
                    </td>
                    <td className="py-3.5 px-4">{getChannelBadge(log.channel)}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {getCategoryLabel(log.category)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-extrabold text-slate-900">{log.recipient_name || "Recipient"}</span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {log.recipient_email || log.recipient_phone || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                      {log.reference_code || "—"}
                    </td>
                    <td className="py-3.5 px-4 max-w-[240px] truncate" title={log.subject || log.message_preview}>
                      <span className="text-slate-900 font-medium block truncate">{log.subject || "No Subject"}</span>
                      {log.message_preview && (
                        <span className="text-[10.5px] text-slate-400 font-normal truncate block">
                          {log.message_preview}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-medium whitespace-nowrap">
                      {log.sent_at ? formatDate(log.sent_at) : formatDate(log.created_at)}
                    </td>
                    <td className="py-3.5 px-4 text-center">{getStatusBadge(log.status)}</td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className="px-3 py-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalCount > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-white border-t border-slate-100 text-xs font-semibold text-slate-600">
            <div>
              Showing <span className="font-extrabold text-slate-900">{(page - 1) * 15 + 1}</span> to{" "}
              <span className="font-extrabold text-slate-900">{Math.min(page * 15, totalCount)}</span> of{" "}
              <span className="font-extrabold text-slate-900">{totalCount}</span> communication logs
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 text-slate-700 font-black">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-sm font-black text-slate-900">Communication Dispatch Details</h4>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="text-xs font-bold text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10.5px] font-bold uppercase">Channel</span>
                  <span className="font-extrabold text-slate-800">{getChannelBadge(selectedLog.channel)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10.5px] font-bold uppercase">Status</span>
                  <span className="font-extrabold">{getStatusBadge(selectedLog.status)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10.5px] font-bold uppercase">Reference Code</span>
                  <span className="font-mono font-extrabold text-blue-600">{selectedLog.reference_code || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10.5px] font-bold uppercase">Category</span>
                  <span className="font-bold text-slate-800">{getCategoryLabel(selectedLog.category)}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[10.5px] font-bold uppercase mb-0.5">Recipient</span>
                <p className="font-extrabold text-slate-900">{selectedLog.recipient_name || "—"}</p>
                <p className="text-slate-600 font-mono text-[11px]">{selectedLog.recipient_email || selectedLog.recipient_phone || "—"}</p>
              </div>

              {selectedLog.subject && (
                <div>
                  <span className="text-slate-400 block text-[10.5px] font-bold uppercase mb-0.5">Subject</span>
                  <p className="font-bold text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-100">{selectedLog.subject}</p>
                </div>
              )}

              {selectedLog.message_preview && (
                <div>
                  <span className="text-slate-400 block text-[10.5px] font-bold uppercase mb-0.5">Message Content Preview</span>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 font-mono text-[11px] text-slate-700 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                    {selectedLog.message_preview}
                  </div>
                </div>
              )}

              {selectedLog.error_message && (
                <div>
                  <span className="text-rose-500 block text-[10.5px] font-bold uppercase mb-0.5">Delivery Error Log</span>
                  <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 font-mono text-[11px] text-rose-700 whitespace-pre-wrap leading-relaxed">
                    {selectedLog.error_message}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
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
