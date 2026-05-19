// src/components/NotificationPanel.jsx


import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  getDoctorNotifications,
  getPatientNotifications,
  markRead,
  markAllRead,
  deleteNotification,
  subscribeToNotifications,
} from "../api/notificationApi";

// ── Notification type display config ────────────────────────────
const TYPE_CONFIG = {
  report_ready:        { icon: "📋", color: "#0D9488", bg: "#CCFBF1", label: "Report ready"    },
  report_verified:     { icon: "✅", color: "#059669", bg: "#D1FAE5", label: "Report verified" },
  high_risk_alert:     { icon: "🚨", color: "#DC2626", bg: "#FEF2F2", label: "High risk"       },
  appointment_booked:  { icon: "📅", color: "#2563EB", bg: "#EFF6FF", label: "Appointment"     },
  appointment_reminder:{ icon: "⏰", color: "#D97706", bg: "#FEF3C7", label: "Reminder"        },
  default:             { icon: "🔔", color: "#7C3AED", bg: "#EDE9FE", label: "Notification"    },
};

const cfg = (type) => TYPE_CONFIG[type] || TYPE_CONFIG.default;

const fmtTime = (iso) => {
  if (!iso) return "";
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return "just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

// ── Component ────────────────────────────────────────────────────
export default function NotificationPanel({ role = "doctor", userId = null }) {
  const navigate  = useNavigate();
  const panelRef  = useRef(null);

  const [open,     setOpen]     = useState(false);
  const [notifs,   setNotifs]   = useState([]);
  const [unread,   setUnread]   = useState(0);
  const [loading,  setLoading]  = useState(false);
  const [toast,    setToast]    = useState(null);   // renamed from newNotif for clarity

  // ── Fetch ──────────────────────────────────────────────────────
  const fetchNotifs = useCallback(async () => {
    // FIX 1: admin has no personal notification feed — skip fetch
    if (role === "admin") return;
    // Doctor / patient both need a valid userId
    if (!userId) return;

    setLoading(true);
    try {
      const data = role === "patient"
        ? await getPatientNotifications(userId)
        : await getDoctorNotifications(userId);

      const list = Array.isArray(data) ? data : [];
      setNotifs(list);
      setUnread(list.filter(n => !n.is_read).length);
    } catch (err) {
      console.error("NotificationPanel fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [role, userId]);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  // ── Realtime subscription ──────────────────────────────────────
  useEffect(() => {
    // FIX 4: don't subscribe if no userId (admin or not-yet-loaded)
    if (!userId || role === "admin") return;

    const unsub = subscribeToNotifications(role, userId, (newN) => {
      setNotifs(prev => [newN, ...prev]);
      setUnread(u => u + 1);
      setToast(newN);
      setTimeout(() => setToast(null), 5000);
    });

    return unsub; // cleanup on unmount
  }, [role, userId]);

  // ── Close panel on outside click ───────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Actions ───────────────────────────────────────────────────
  const handleRead = async (notif) => {
    if (!notif.is_read) {
      await markRead(notif.id);
      setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      setUnread(u => Math.max(0, u - 1));
    }
    // FIX 3: action_url now actually set in API — this navigation works
    if (notif.action_url) {
      setOpen(false);
      navigate(notif.action_url);
    }
  };

  const handleMarkAll = async () => {
    if (!userId) return;
    await markAllRead(role, userId);
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnread(0);
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    await deleteNotification(id);
    setNotifs(prev => {
      const removed = prev.find(n => n.id === id);
      if (removed && !removed.is_read) setUnread(u => Math.max(0, u - 1));
      return prev.filter(n => n.id !== id);
    });
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <div ref={panelRef} style={{ position: "relative" }}>

      {/* ── Toast (real-time new notification popup) ── */}
      {toast && (
        <div style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          background: "#fff",
          border: `1px solid ${cfg(toast.type).color}40`,
          borderLeft: `4px solid ${cfg(toast.type).color}`,
          borderRadius: 12,
          padding: "14px 18px",
          boxShadow: "0 8px 32px rgba(0,0,0,.15)",
          maxWidth: 340,
          zIndex: 9999,   // FIX 5: above all modals
          animation: "_slideUp .3s ease",
          cursor: toast.action_url ? "pointer" : "default",
        }}
          onClick={() => {
            if (toast.action_url) navigate(toast.action_url);
            setToast(null);
          }}
        >
          <style>{`@keyframes _slideUp{from{transform:translateY(20px);opacity:0}to{transform:none;opacity:1}}`}</style>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{cfg(toast.type).icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#0F172A", marginBottom: 3 }}>
                {toast.title}
              </div>
              <div style={{ fontSize: 12, color: "#64748B", lineHeight: 1.5 }}>
                {toast.message?.slice(0, 100)}
              </div>
              {toast.action_label && (
                <div style={{ fontSize: 11, fontWeight: 700, color: cfg(toast.type).color, marginTop: 4 }}>
                  {toast.action_label} →
                </div>
              )}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setToast(null); }}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#94A3B8", flexShrink: 0 }}
            >×</button>
          </div>
        </div>
      )}

      {/* ── Bell button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Notifications"
        style={{
          position: "relative",
          background: open ? "#F1F5F9" : "transparent",
          border: "1.5px solid #E2E8F0",
          borderRadius: 10,
          width: 38, height: 38,
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background .15s",
          flexShrink: 0,
        }}
      >
        {/* Bell SVG */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>

        {/* Unread badge — FIX 6: now shows correctly */}
        {unread > 0 && (
          <span style={{
            position: "absolute", top: -4, right: -4,
            background: "#DC2626", color: "#fff",
            fontSize: 9, fontWeight: 900,
            width: 16, height: 16,
            borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid #fff",
            lineHeight: 1,
          }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div style={{
          position: "absolute", top: 46, right: 0,
          width: 360, maxHeight: 480,
          background: "#fff",
          borderRadius: 16,
          border: "1px solid #E2E8F0",
          boxShadow: "0 16px 48px rgba(0,0,0,.12)",
          zIndex: 500,
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>

          {/* Header */}
          <div style={{
            padding: "14px 18px",
            borderBottom: "1px solid #E2E8F0",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <span style={{ fontWeight: 800, fontSize: 14, color: "#0F172A" }}>Notifications</span>
              {unread > 0 && (
                <span style={{
                  marginLeft: 8,
                  background: "#FEF2F2", color: "#DC2626",
                  fontSize: 10, fontWeight: 800,
                  padding: "2px 8px", borderRadius: 99,
                }}>
                  {unread} unread
                </span>
              )}
            </div>
            {unread > 0 && (
              <button onClick={handleMarkAll} style={{
                background: "none", border: "none",
                fontSize: 11, fontWeight: 700,
                color: "#2563EB", cursor: "pointer",
                padding: "4px 8px",
              }}>
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: 32, gap: 10 }}>
                <div style={{
                  width: 18, height: 18, borderRadius: "50%",
                  border: "2px solid #E2E8F0", borderTopColor: "#0D9488",
                  animation: "_sp .7s linear infinite",
                }} />
                <style>{`@keyframes _sp{to{transform:rotate(360deg)}}`}</style>
                <span style={{ fontSize: 13, color: "#64748B" }}>Loading…</span>
              </div>
            ) : notifs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>🔔</div>
                <div style={{ fontSize: 13, color: "#64748B" }}>No notifications yet</div>
                <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>
                  {role === "doctor" ? "Patient reports will appear here" : "Doctor updates will appear here"}
                </div>
              </div>
            ) : (
              notifs.map(n => {
                const c = cfg(n.type);
                return (
                  <div
                    key={n.id}
                    onClick={() => handleRead(n)}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 12,
                      padding: "12px 16px",
                      cursor: n.action_url ? "pointer" : "default",
                      background: n.is_read ? "#fff" : "#F8FAFC",
                      borderBottom: "1px solid #F1F5F9",
                      transition: "background .1s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#F1F5F9"}
                    onMouseLeave={e => e.currentTarget.style.background = n.is_read ? "#fff" : "#F8FAFC"}
                  >
                    {/* Unread dot */}
                    <div style={{ paddingTop: 4, flexShrink: 0 }}>
                      {!n.is_read
                        ? <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.color }} />
                        : <div style={{ width: 8, height: 8 }} />
                      }
                    </div>

                    {/* Icon */}
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      flexShrink: 0, background: c.bg,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 16,
                    }}>
                      {c.icon}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: n.is_read ? 500 : 800,
                        fontSize: 13, color: "#0F172A",
                        marginBottom: 3, lineHeight: 1.3,
                      }}>
                        {n.title}
                      </div>
                      <div style={{ fontSize: 11, color: "#64748B", lineHeight: 1.5, marginBottom: 4 }}>
                        {n.message}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 10, color: "#94A3B8" }}>{fmtTime(n.created_at)}</span>
                        {/* FIX 3: action_label now shows because it's set in API */}
                        {n.action_label && !n.is_read && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: c.color }}>
                            {n.action_label} →
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => handleDelete(e, n.id)}
                      title="Dismiss"
                      style={{
                        background: "none", border: "none",
                        fontSize: 16, color: "#CBD5E1",
                        cursor: "pointer", padding: "0 2px",
                        flexShrink: 0, opacity: 0, transition: "opacity .15s",
                      }}
                      onMouseEnter={e => e.target.style.opacity = "1"}
                      onMouseLeave={e => e.target.style.opacity = "0"}
                    >×</button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifs.length > 0 && (
            <div style={{ padding: "10px 16px", borderTop: "1px solid #E2E8F0", textAlign: "center" }}>
              <button onClick={fetchNotifs} style={{
                background: "none", border: "none",
                fontSize: 11, fontWeight: 700,
                color: "#64748B", cursor: "pointer",
              }}>
                ↻ Refresh
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
