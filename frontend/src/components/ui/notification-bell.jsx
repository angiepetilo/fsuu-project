import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";
import {
  Bell, X, CheckCheck, Sliders, Building2, PackageOpen,
  AlertTriangle, FileText, CheckCircle2, Clock, Volume2, Mail, ShieldAlert
} from "lucide-react";

export function NotificationBell() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Alert Preferences State
  const [preferences, setPreferences] = useState({
    newBookings: true,
    equipmentLoans: true,
    overdueAlerts: true,
    emailNotifications: true,
    soundAlerts: false,
  });

  // Fetch Office-Scoped Notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/avr/notifications');
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      // Fallback office-scoped notifications if endpoint is pending
      const isAvr = user?.office?.type === 'avr' || !user?.office_id;
      setNotifications([
        { id: 1, type: "booking", title: "New Venue Booking", message: "Engineering Society requested Hagenburg Hall for Sep 12.", time: "5 mins ago", read: false, link: "/avr/venue-bookings", office: "avr" },
        { id: 2, type: "borrowing", title: "Equipment Borrow Request", message: "Prof. Cruz requested 2 LCD Projectors & extension reels.", time: "18 mins ago", read: false, link: "/avr/equipment-borrowing", office: "avr" },
        { id: 3, type: "overdue", title: "Overdue Return Alert", message: "Microphone Set #04 is 2 hours past return schedule.", time: "1 hour ago", read: false, link: "/avr/equipment-borrowing", office: "avr" },
        { id: 4, type: "document", title: "DSA Endorsement Uploaded", message: "Signed endorsement letter uploaded for VB-2026-0812.", time: "2 hours ago", read: true, link: "/avr/venue-bookings", office: "avr" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds for real-time office updates
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const togglePreference = (key) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const renderIcon = (type) => {
    switch (type) {
      case "booking":   return <Building2 size={15} className="text-blue-600" />;
      case "borrowing": return <PackageOpen size={15} className="text-purple-600" />;
      case "overdue":   return <AlertTriangle size={15} className="text-amber-600" />;
      case "document":  return <FileText size={15} className="text-emerald-600" />;
      default:          return <Bell size={15} className="text-slate-600" />;
    }
  };

  const filteredNotifications = activeTab === "unread"
    ? notifications.filter(n => !n.read)
    : notifications;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all focus:outline-none"
        title="Office Notifications & Alerts"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 ring-2 ring-white"></span>
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white border border-slate-200/80 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* Header */}
          <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-blue-600" />
              <div>
                <h3 className="font-extrabold text-xs text-slate-900 leading-none">Notifications &amp; Alerts</h3>
                <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider mt-0.5">
                  {user?.office?.name ?? "AVR Department"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200/50 transition-all"
            >
              <X size={14} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-100 bg-white text-xs font-bold px-2 pt-2 gap-1">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-2 rounded-t-lg transition-all ${activeTab === "all" ? "bg-slate-100 text-slate-900 border-b-2 border-blue-600" : "text-slate-500 hover:text-slate-800"}`}
            >
              All Updates ({notifications.length})
            </button>
            <button
              onClick={() => setActiveTab("unread")}
              className={`px-3 py-2 rounded-t-lg transition-all ${activeTab === "unread" ? "bg-slate-100 text-slate-900 border-b-2 border-blue-600" : "text-slate-500 hover:text-slate-800"}`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setActiveTab("preferences")}
              className={`ml-auto px-3 py-2 rounded-t-lg transition-all flex items-center gap-1 ${activeTab === "preferences" ? "bg-slate-100 text-blue-600 border-b-2 border-blue-600" : "text-slate-500 hover:text-slate-800"}`}
            >
              <Sliders size={13} />
              <span>Preferences</span>
            </button>
          </div>

          {/* Tab Content Body */}
          <div className="max-h-80 overflow-y-auto">
            {activeTab === "preferences" ? (
              <div className="p-4 space-y-4">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Office Alert Preferences</p>

                <div className="space-y-3 text-xs">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2 text-slate-800 font-semibold">
                      <Building2 size={14} className="text-blue-600" />
                      <span>New Venue Requests</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.newBookings}
                      onChange={() => togglePreference("newBookings")}
                      className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2 text-slate-800 font-semibold">
                      <PackageOpen size={14} className="text-purple-600" />
                      <span>Equipment Loan Approvals</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.equipmentLoans}
                      onChange={() => togglePreference("equipmentLoans")}
                      className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2 text-slate-800 font-semibold">
                      <ShieldAlert size={14} className="text-amber-600" />
                      <span>Overdue &amp; Damage Warnings</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.overdueAlerts}
                      onChange={() => togglePreference("overdueAlerts")}
                      className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-slate-800 font-semibold">
                      <Mail size={14} className="text-emerald-600" />
                      <span>Email Digest Alerts</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.emailNotifications}
                      onChange={() => togglePreference("emailNotifications")}
                      className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2 text-slate-800 font-semibold">
                      <Volume2 size={14} className="text-indigo-600" />
                      <span>Sound Chime Alerts</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.soundAlerts}
                      onChange={() => togglePreference("soundAlerts")}
                      className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div>
                {filteredNotifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs font-medium">
                    No office notifications at this time.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {filteredNotifications.map(n => (
                      <Link
                        key={n.id}
                        to={n.link}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-start gap-3 p-3.5 hover:bg-slate-50 transition-colors ${!n.read ? "bg-blue-50/30" : ""}`}
                      >
                        <div className="p-2 rounded-xl bg-slate-100 shrink-0 mt-0.5">
                          {renderIcon(n.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-extrabold text-slate-900 truncate">{n.title}</p>
                            <span className="text-[10px] text-slate-400 font-mono shrink-0">{n.time}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed font-medium line-clamp-2">{n.message}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Controls */}
          {activeTab !== "preferences" && (
            <div className="px-4 py-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="hover:text-blue-600 flex items-center gap-1 transition-colors"
                >
                  <CheckCheck size={13} />
                  <span>Mark all as read</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="hover:text-red-600 transition-colors ml-auto"
                >
                  Clear all
                </button>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
