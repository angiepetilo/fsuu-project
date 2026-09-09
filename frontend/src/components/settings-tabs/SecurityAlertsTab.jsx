import { useState, useEffect } from "react";
import {
  ShieldAlert, ShieldCheck, AlertTriangle, AlertCircle, Lock, 
  Search, RefreshCw, X, Clock, CheckCircle2, Eye, 
  Terminal, ShieldX, Globe, Laptop, Activity, AlertOctagon,
  Filter, Calendar, ChevronLeft, ChevronRight, Loader2
} from "lucide-react";
import api from "@/lib/axios";
import notify from "@/lib/notify";

export default function SecurityAlertsTab() {
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({
    total_incidents: 0,
    rate_limit_breaches: 0,
    login_lockouts: 0,
    forced_terminations: 0,
    unresolved_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 25,
  });

  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Modal State
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);

  const fetchAlerts = async (targetPage = 1) => {
    setLoading(true);
    try {
      const params = {
        page: targetPage,
        per_page: 25,
      };
      if (eventTypeFilter !== "all") params.event_type = eventTypeFilter;
      if (severityFilter !== "all") params.severity = severityFilter;
      if (statusFilter !== "all") params.status = statusFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const res = await api.get("/sysad/security-alerts", { params });
      const alertsData = res.data?.alerts?.data || (Array.isArray(res.data?.alerts) ? res.data.alerts : []);
      setAlerts(alertsData);
      if (res.data?.stats) {
        setStats(res.data.stats);
      }
      if (res.data?.alerts?.current_page) {
        setPagination({
          current_page: res.data.alerts.current_page,
          last_page: res.data.alerts.last_page,
          total: res.data.alerts.total,
          per_page: res.data.alerts.per_page,
        });
        setPage(res.data.alerts.current_page);
      }
    } catch (err) {
      notify.error("Error", "Could not load security incident logs.");
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts(1);
  }, [eventTypeFilter, severityFilter, statusFilter, dateFrom, dateTo]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAlerts(1);
  };

  const handleResolve = async (alert, newStatus = "resolved") => {
    setResolvingId(alert.id);
    try {
      await api.patch(`/sysad/security-alerts/${alert.id}/resolve`, { status: newStatus });
      notify.success("Incident Updated", `Alert marked as ${newStatus}.`);
      fetchAlerts(page);
      if (selectedAlert?.id === alert.id) {
        setSelectedAlert((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      notify.error("Error", "Could not update alert status.");
    } finally {
      setResolvingId(null);
    }
  };

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case "critical":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
            <AlertOctagon size={11} className="text-rose-600" />
            Critical
          </span>
        );
      case "high":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Warning
          </span>
        );
      case "medium":
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            Notice
          </span>
        );
    }
  };

  const getSimpleAlertInfo = (al) => {
    const meta = al.metadata || {};
    const username = meta.username || al.ip_address || "User";
    const attempt = meta.attempt ? ` (Attempt ${meta.attempt} of ${meta.max_attempts || 5})` : "";

    if (al.event_type === "login_lockout") {
      return {
        badge: "Sign-in Paused",
        title: `Sign-in temporarily locked for "${username}"`,
        summary: "Multiple incorrect passwords were entered. Sign-in is temporarily paused to protect the account.",
        device: meta.device || "Computer or Phone",
      };
    }

    if (al.event_type === "rate_limit_breach") {
      return {
        badge: "Unusual Traffic",
        title: "Frequent requests from this device",
        summary: "Many rapid requests were received in a short time. Requests were temporarily slowed down.",
        device: meta.device || "Network Device",
      };
    }

    if (al.event_type === "forced_session_termination") {
      return {
        badge: "Session Ended",
        title: `Sign-in ended for "${username}"`,
        summary: "An administrator ended this active session remotely.",
        device: meta.device || "Workstation",
      };
    }

    return {
      badge: "Failed Login",
      title: `Incorrect password for "${username}"${attempt}`,
      summary: "An incorrect password was entered when attempting to sign in.",
      device: meta.device || "Web Browser",
    };
  };

  return (
    <div className="space-y-3 font-sans">
      {/* Filter and Control Bar (Sleek, minimal, plain) */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-100">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[200px] relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by account or IP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-normal text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
          />
        </form>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="unresolved">Needs Attention</option>
            <option value="resolved">Resolved</option>
          </select>

          <button
            type="button"
            onClick={() => fetchAlerts(page)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            title="Refresh alerts"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-blue-600" : "text-slate-500"} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Dynamic Security Alerts List (Sleek, plain, minimal, no big color cards) */}
      <div className="space-y-2">
        {loading ? (
          <div className="py-12 text-center border border-slate-200 rounded-xl bg-white">
            <div className="inline-flex items-center justify-center gap-2 text-slate-500">
              <Loader2 size={16} className="animate-spin text-blue-600" />
              <span className="text-xs font-medium">Checking security records...</span>
            </div>
          </div>
        ) : alerts.length === 0 ? (
          <div className="py-12 text-center border border-slate-200 rounded-xl bg-white">
            <ShieldCheck size={32} className="mx-auto text-emerald-500 mb-1.5" />
            <p className="text-xs font-semibold text-slate-800">All Clear</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              No unusual activity or failed logins recorded.
            </p>
          </div>
        ) : (
          alerts.map((al) => {
            const date = new Date(al.created_at);
            const formattedDate = date.toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            });
            const info = getSimpleAlertInfo(al);

            return (
              <div
                key={al.id}
                className="bg-white rounded-lg border border-slate-200 hover:border-slate-300 p-3 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  {/* Subtle Alert Icon */}
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertCircle size={16} />
                  </div>

                  {/* Simple text details */}
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className="font-medium text-slate-900 text-xs">
                        {info.badge}
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        • {formattedDate}
                      </span>
                      {al.status === "resolved" ? (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Resolved
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          Needs Review
                        </span>
                      )}
                    </div>

                    <div className="text-xs font-semibold text-slate-800 truncate">
                      {info.title}
                    </div>

                    <div className="text-[11px] text-slate-500">
                      <span>Device: {info.device}</span>
                      <span className="text-slate-300 mx-1.5">|</span>
                      <span>IP: {al.ip_address || "127.0.0.1"}</span>
                    </div>
                  </div>
                </div>

                {/* Action button */}
                <div className="shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => setSelectedAlert(al)}
                    className="px-3 py-1 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
                  >
                    View Details
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {pagination.last_page > 1 && (
        <div className="px-3 py-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-normal">
            Page {pagination.current_page} of {pagination.last_page} ({pagination.total} records)
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => fetchAlerts(page - 1)}
              className="p-1 rounded border border-slate-200 bg-white text-slate-600 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft size={13} />
            </button>
            <button
              type="button"
              disabled={page >= pagination.last_page}
              onClick={() => fetchAlerts(page + 1)}
              className="p-1 rounded border border-slate-200 bg-white text-slate-600 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Simple, Non-Tech Friendly Alert Details Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <AlertCircle size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-900">Security Alert Details</h3>
                  <p className="text-[10px] text-slate-400">Record #{selectedAlert.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAlert(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {(() => {
              const info = getSimpleAlertInfo(selectedAlert);
              const date = new Date(selectedAlert.created_at);
              const formattedDate = date.toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              });

              return (
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                    <span className="font-semibold text-slate-900 text-xs block">{info.title}</span>
                    <p className="text-slate-600 text-[11px] leading-relaxed">{info.summary}</p>
                  </div>

                  <div className="space-y-1.5 border-t border-slate-100 pt-2 text-[11px]">
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">Target Account:</span>
                      <span className="font-semibold text-slate-800">{selectedAlert.metadata?.username || "Not specified"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">Date &amp; Time:</span>
                      <span className="font-medium text-slate-800">{formattedDate}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">Device:</span>
                      <span className="font-medium text-slate-800">{info.device}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">IP Address:</span>
                      <span className="font-mono text-slate-800">{selectedAlert.ip_address || "127.0.0.1"}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Status:</span>
                      <span className={`font-semibold ${selectedAlert.status === "resolved" ? "text-emerald-600" : "text-amber-600"}`}>
                        {selectedAlert.status === "resolved" ? "Resolved" : "Needs Review"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-4">
              {selectedAlert.status === "unresolved" ? (
                <button
                  type="button"
                  disabled={resolvingId === selectedAlert.id}
                  onClick={() => handleResolve(selectedAlert, "resolved")}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                >
                  <CheckCircle2 size={13} />
                  <span>Mark as Resolved</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={resolvingId === selectedAlert.id}
                  onClick={() => handleResolve(selectedAlert, "unresolved")}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium cursor-pointer"
                >
                  <span>Re-open</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedAlert(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium cursor-pointer"
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
