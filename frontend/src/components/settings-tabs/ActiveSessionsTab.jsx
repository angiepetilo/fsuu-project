import { useState, useEffect, useRef } from "react";
import {
  Monitor, ShieldAlert, Clock, CheckCircle2, AlertTriangle, 
  Search, RefreshCw, X, ShieldX, Laptop, UserCheck, AlertCircle, 
  Loader2, Wifi, WifiOff, PowerOff
} from "lucide-react";
import api from "@/lib/axios";
import notify from "@/lib/notify";

export default function ActiveSessionsTab() {
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState({
    total_sessions: 0,
    active_now: 0,
    idle_sessions: 0,
    terminated_sessions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Terminate Modal State
  const [selectedSession, setSelectedSession] = useState(null);
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [terminateReason, setTerminateReason] = useState("");
  const [terminating, setTerminating] = useState(false);

  const autoRefreshIntervalRef = useRef(null);

  const fetchSessions = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const params = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (roleFilter !== "all") params.role = roleFilter;
      if (statusFilter !== "all") params.status = statusFilter;

      const res = await api.get("/sysad/active-sessions", { params });
      setSessions(res.data?.sessions || []);
      if (res.data?.stats) {
        setStats(res.data.stats);
      }
    } catch (err) {
      if (!quiet) {
        notify.error("Session Error", "Could not fetch active terminal sessions.");
      }
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [roleFilter, statusFilter]);

  // Real-time polling heartbeat (every 15 seconds)
  useEffect(() => {
    if (autoRefresh) {
      autoRefreshIntervalRef.current = setInterval(() => {
        fetchSessions(true);
      }, 15000);
    }
    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, [autoRefresh, searchTerm, roleFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchSessions();
  };

  const handleOpenTerminate = (session) => {
    setSelectedSession(session);
    setTerminateReason("Unauthorized or unattended terminal detected.");
    setShowTerminateModal(true);
  };

  const handleConfirmTerminate = async () => {
    if (!selectedSession) return;
    setTerminating(true);
    try {
      await api.post(`/sysad/active-sessions/${selectedSession.id}/terminate`, {
        reason: terminateReason.trim() || "Remotely terminated by administrator.",
      });

      notify.success(
        "Terminal Session Terminated",
        `Session for ${selectedSession.user.name} (${selectedSession.role}) has been forcefully revoked.`
      );
      setShowTerminateModal(false);
      fetchSessions();
    } catch (err) {
      notify.error("Termination Failed", err.response?.data?.message || "Could not terminate session.");
    } finally {
      setTerminating(false);
    }
  };

  const formatRelativeTime = (isoString) => {
    if (!isoString) return "Never";
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const formatExactTime = (isoString) => {
    if (!isoString) return "N/A";
    const date = new Date(isoString);
    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getStatusBadge = (status) => {
    if (status === "active") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Active
        </span>
      );
    }
    if (status === "idle") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          Idle (&gt;15m)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
        <PowerOff size={11} className="text-rose-500" />
        Terminated
      </span>
    );
  };

  return (
    <div className="space-y-5 font-sans">
      {/* Control / Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search user name, email, terminal IP, device..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600"
            />
          </form>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            {/* Status Filter */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              {["all", "active", "idle", "terminated"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg capitalize cursor-pointer transition-all ${
                    statusFilter === st ? "bg-blue-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Live Auto-Refresh Toggle */}
            <button
              type="button"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer transition-all ${
                autoRefresh
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-slate-50 text-slate-600 border-slate-200"
              }`}
              title="Real-time heartbeat updates"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? "bg-blue-600 animate-pulse" : "bg-slate-400"}`} />
              <span>{autoRefresh ? "Live (15s)" : "Paused"}</span>
            </button>

            {/* Manual Refresh Button */}
            <button
              type="button"
              onClick={() => fetchSessions()}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              <RefreshCw size={13} className={loading ? "animate-spin text-blue-600" : "text-slate-500"} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Security Notice Banner */}
        <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl flex items-start gap-2.5 text-xs text-blue-800">
          <ShieldAlert size={16} className="text-blue-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <span className="font-bold">Real-time Terminal Security:</span> You can monitor and remotely terminate unauthorized or unattended cashier and admin terminals in real time. Terminating an active terminal immediately invalidates its authentication token and locks the workstation out.
          </p>
        </div>
      </div>

      {/* Active Sessions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[11px] font-semibold">
              <tr>
                <th className="px-4 py-3.5">User / Account</th>
                <th className="px-4 py-3.5">Role</th>
                <th className="px-4 py-3.5">Session Started</th>
                <th className="px-4 py-3.5">Last Active</th>
                <th className="px-4 py-3.5">Session Status</th>
                <th className="px-4 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <div className="flex items-center justify-center gap-2 text-slate-400">
                      <div className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin" />
                      <span className="text-xs font-semibold italic">Scanning active cashier and admin terminals...</span>
                    </div>
                  </td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <Laptop size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-semibold">No active terminal sessions found.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Try resetting search and status filters.</p>
                  </td>
                </tr>
              ) : (
                sessions.map((sess) => {
                  const isCurrent = sess.is_current;
                  const isTerminated = sess.session_status === "terminated";

                  return (
                    <tr key={sess.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* User / Account */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                            {sess.user.name ? sess.user.name.charAt(0).toUpperCase() : "U"}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900">{sess.user.name}</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase bg-blue-100 text-blue-700 rounded-md">
                                  This Device
                                </span>
                              )}
                            </div>
                            <p className="text-[10.5px] text-slate-400">{sess.user.email}</p>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                              <span>IP: {sess.ip_address}</span>
                              <span>•</span>
                              <span>{sess.device_name}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          sess.role_raw === "super_admin"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : sess.role_raw === "admin"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : sess.role_raw?.includes("cashier")
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}>
                          {sess.role}
                        </span>
                      </td>

                      {/* Session Started */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800">
                            {formatExactTime(sess.session_started)}
                          </span>
                          <span className="text-[10.5px] text-slate-400">
                            {formatRelativeTime(sess.session_started)}
                          </span>
                        </div>
                      </td>

                      {/* Last Active */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">
                            {formatRelativeTime(sess.last_active)}
                          </span>
                          <span className="text-[10.5px] text-slate-400">
                            {sess.last_active ? new Date(sess.last_active).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "N/A"}
                          </span>
                        </div>
                      </td>

                      {/* Session Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {getStatusBadge(sess.session_status)}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-right">
                        {isTerminated ? (
                          <span className="text-xs text-slate-400 font-semibold italic">
                            Terminated
                          </span>
                        ) : isCurrent ? (
                          <span className="text-xs text-slate-400 font-semibold italic">
                            Current Session
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenTerminate(sess)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs hover:shadow-xs"
                            title="Remotely terminate unauthorized or unattended terminal"
                          >
                            <ShieldX size={13} className="text-rose-600" />
                            <span>Terminate</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Remote Session Termination Modal */}
      {showTerminateModal && selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <ShieldAlert size={24} />
            </div>

            <h3 className="text-base font-bold text-slate-900">
              Remotely Terminate Terminal Session?
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              You are about to forcefully invalidate the live session for{" "}
              <strong className="text-slate-900">{selectedSession.user.name}</strong> ({selectedSession.role}) connected from IP{" "}
              <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono text-[11px]">{selectedSession.ip_address}</code>.
            </p>

            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <span>The cashier or admin terminal will immediately be disconnected and logged out on its next request.</span>
            </div>

            <div className="mt-4">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Termination Reason
              </label>
              <textarea
                rows={2}
                value={terminateReason}
                onChange={(e) => setTerminateReason(e.target.value)}
                placeholder="e.g. Unattended cashier workstation, unauthorized terminal access..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-rose-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowTerminateModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={terminating}
                onClick={handleConfirmTerminate}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
              >
                {terminating && <Loader2 size={14} className="animate-spin" />}
                <span>Force Terminate Now</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
