// src/components/DoctorSidebar.jsx
// ── Standalone sidebar for Doctor portal — does NOT depend on role metadata ──
import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

const C = {
  navy: "#0B1437", teal: "#0D9488", tealL: "#CCFBF1",
  border: "rgba(255,255,255,.07)", muted: "rgba(255,255,255,.4)",
  active: "#0D9488",
};

const NAV = [
  { label: "Patient Queue",    path: "/doctor-dashboard", icon: HeartIcon,  end: true  },
  { label: "Today's Schedule", path: "/doctor-dashboard/schedule", icon: CalIcon   },
  { label: "All Patients",     path: "/doctor-dashboard/patients", icon: UserIcon  },
  { label: "Appointments",     path: "/doctor-dashboard/appointments", icon: ClipIcon },
];

export default function DoctorSidebar({ user }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/doctor-login");
  };

  const email    = user?.email || "";
  const initial  = email[0]?.toUpperCase() || "D";
  const doctorId = user?.user_metadata?.doctor_id;

  return (
    <aside style={{
      width: 220, flexShrink: 0, background: C.navy,
      display: "flex", flexDirection: "column", minHeight: "100vh",
    }}>
      {/* Logo */}
      <div style={{ padding: "22px 18px 18px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, background: C.teal,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
          }}>🩺</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", letterSpacing: "-.02em" }}>MedVision AI</div>
            <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: ".08em", marginTop: 1 }}>
              Doctor Portal
            </div>
          </div>
        </div>
      </div>

      {/* Doctor info */}
      <div style={{ padding: "14px 18px 10px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%", background: C.teal,
          color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 900, fontSize: 15, marginBottom: 8,
        }}>{initial}</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {email}
        </div>
        {doctorId && (
          <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>Doctor ID: {doctorId}</div>
        )}
        <div style={{ marginTop: 8 }}>
          <span style={{
            background: "rgba(13,148,136,.3)", color: "#5EEAD4",
            fontSize: 9, fontWeight: 800, padding: "2px 10px",
            borderRadius: 999, textTransform: "uppercase", letterSpacing: ".08em",
          }}>Doctor</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "14px 10px" }}>
        {NAV.map(item => (
          <NavLink
            key={item.label}
            to={item.path}
            end={item.end}
            style={({ isActive }) => ({
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", borderRadius: 10, marginBottom: 4,
              textDecoration: "none",
              background: isActive ? `${C.teal}28` : "transparent",
              color: isActive ? "#fff" : C.muted,
              fontWeight: isActive ? 700 : 400,
              fontSize: 13, transition: "all .15s",
            })}
          >
            {({ isActive }) => (
              <>
                <span style={{ color: isActive ? C.teal : C.muted, display: "flex" }}>
                  <item.icon />
                </span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {isActive && (
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.teal }} />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div style={{ padding: "12px 10px", borderTop: `1px solid ${C.border}` }}>
        <button
          onClick={handleLogout}
          style={{
            width: "100%", padding: "10px 12px", borderRadius: 10,
            border: "1px solid rgba(255,255,255,.08)", background: "transparent",
            color: C.muted, fontSize: 12, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 8, transition: "all .15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(220,38,38,.15)"; e.currentTarget.style.color = "#F87171"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.muted; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  );
}

// ── Icons ─────────────────────────────────────────────────────────
function HeartIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
}
function CalIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
}
function UserIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}
function ClipIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
}
