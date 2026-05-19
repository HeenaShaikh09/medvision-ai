// src/components/Sidebar.jsx
// ── Role-aware sidebar — shows different links per role ───────────
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabaseClient";

// ── Nav configs per role ──────────────────────────────────────────
const ADMIN_NAV = [
  { label: "Dashboard",    path: "/dashboard",    icon: GridIcon    },
  { label: "Patients",     path: "/patients",     icon: UserIcon    },
  { label: "Doctors",      path: "/doctors",      icon: StethIcon   },
  { label: "Appointments", path: "/appointment",  icon: CalIcon     },
  { label: "Reports",      path: "/reports",      icon: ChartIcon   },
];

const DOCTOR_NAV = [
  { label: "My Patients",  path: "/doctor-dashboard", icon: UserIcon    },
  { label: "Schedule",     path: "/doctor-dashboard", icon: CalIcon     },
];

const PATIENT_NAV = [
  { label: "My Health",    path: "/my-health",    icon: HeartIcon   },
];

const ROLE_THEME = {
  admin:   { accent: "#2563EB", bg: "#EFF6FF", active: "#1D4ED8" },
  doctor:  { accent: "#0D9488", bg: "#CCFBF1", active: "#0F766E" },
  patient: { accent: "#7C3AED", bg: "#EDE9FE", active: "#6D28D9" },
};

export default function Sidebar() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const role      = user?.user_metadata?.role || "admin";
  const theme     = ROLE_THEME[role] || ROLE_THEME.admin;

  const navItems = role === "doctor"  ? DOCTOR_NAV
                 : role === "patient" ? PATIENT_NAV
                 : ADMIN_NAV;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (role === "doctor")  { navigate("/doctor-login");  return; }
    if (role === "patient") { navigate("/patient-login"); return; }
    navigate("/");
  };

  return (
    <aside style={{
      width: 220, flexShrink: 0, background: "#0B1437",
      display: "flex", flexDirection: "column",
      minHeight: "100vh",
    }}>
      {/* Logo */}
      <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid rgba(255,255,255,.07)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: theme.accent, display: "flex",
            alignItems: "center", justifyContent: "center", fontSize: 16,
          }}>
            {role === "doctor" ? "🩺" : role === "patient" ? "🏥" : "⚕️"}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", letterSpacing: "-.02em" }}>MedVision AI</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: ".08em", marginTop: 1 }}>
              {role} portal
            </div>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav style={{ flex: 1, padding: "16px 12px" }}>
        {navItems.map(item => (
          <NavLink
            key={item.path + item.label}
            to={item.path}
            style={({ isActive }) => ({
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", borderRadius: 10,
              marginBottom: 4, textDecoration: "none",
              background: isActive ? theme.accent + "25" : "transparent",
              color: isActive ? "#fff" : "rgba(255,255,255,.55)",
              fontWeight: isActive ? 700 : 400,
              fontSize: 13, transition: "all .15s",
            })}
          >
            {({ isActive }) => (
              <>
                <span style={{ color: isActive ? theme.accent : "rgba(255,255,255,.4)", display: "flex" }}>
                  <item.icon size={16} />
                </span>
                {item.label}
                {isActive && (
                  <div style={{
                    marginLeft: "auto", width: 6, height: 6,
                    borderRadius: "50%", background: theme.accent,
                  }} />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout at bottom */}
      <div style={{ padding: "16px 12px", borderTop: "1px solid rgba(255,255,255,.07)" }}>
        <button
          onClick={handleLogout}
          style={{
            width: "100%", padding: "10px 12px", borderRadius: 10,
            border: "1px solid rgba(255,255,255,.1)",
            background: "transparent", color: "rgba(255,255,255,.5)",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 8,
            transition: "all .15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(220,38,38,.15)"; e.currentTarget.style.color = "#F87171"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,.5)"; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  );
}

// ── SVG icon components ───────────────────────────────────────────
function GridIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  );
}
function UserIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}
function StethIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/>
      <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/>
      <circle cx="20" cy="10" r="2"/>
    </svg>
  );
}
function CalIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}
function ChartIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  );
}
function HeartIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );
}
