// src/AppWrapper.jsx
// ── FIXED: each role redirects to its own login page when not authenticated
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

import Dashboard        from "./pages/Dashboard";
import Appointment      from "./pages/Appointment";
import Patients         from "./pages/Patients";
import Doctors          from "./pages/Doctors";
import Reports          from "./pages/Reports";
import Auth             from "./pages/Auth";
import DoctorLogin      from "./pages/DoctorLogin";
import PatientLogin     from "./pages/PatientLogin";
import DoctorDashboard  from "./pages/DoctorDashboard";
import PatientDashboard from "./pages/PatientDashboard";

// ══════════════════════════════════════════════════════════════════
// Role-based protected route
// loginPath = where to send unauthenticated users for THIS route
// roles     = which roles are allowed on this route
// ══════════════════════════════════════════════════════════════════
function Protected({ children, roles, loginPath = "/" }) {
  const { user } = useAuth();

  // Not logged in → go to the correct login page for this portal
  if (!user) return <Navigate to={loginPath} replace />;

  // Wrong role → send to correct home
  if (roles && roles.length > 0) {
    const role = user.user_metadata?.role || "admin";
    if (!roles.includes(role)) {
      if (role === "doctor")  return <Navigate to="/doctor-dashboard" replace />;
      if (role === "patient") return <Navigate to="/my-health" replace />;
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
}

// Reads role from session and sends to the right home
function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  const role = user.user_metadata?.role || "admin";
  if (role === "doctor")  return <Navigate to="/doctor-dashboard" replace />;
  if (role === "patient") return <Navigate to="/my-health" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function AppWrapper() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", flexDirection: "column", gap: 16,
        background: "#F0F4FF", fontFamily: "system-ui",
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          border: "3px solid #DDE3F0", borderTopColor: "#2563EB",
          animation: "spin .7s linear infinite",
        }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ color: "#5A6A8A", fontSize: 14 }}>Loading MedVision AI…</p>
      </div>
    );
  }

  return (
    <Routes>

      {/* ── PUBLIC LOGIN PAGES ─────────────────────────────────── */}

      <Route path="/"
        element={user ? <RoleRedirect /> : <Auth />}
      />

      <Route path="/doctor-login"
        element={user ? <RoleRedirect /> : <DoctorLogin />}
      />

      <Route path="/patient-login"
        element={user ? <RoleRedirect /> : <PatientLogin />}
      />

      {/* ── ADMIN ROUTES ────────────────────────────────────────── */}

      <Route path="/dashboard" element={
        <Protected roles={["admin"]} loginPath="/">
          <Dashboard />
        </Protected>
      }/>

      <Route path="/patients" element={
        <Protected roles={["admin"]} loginPath="/">
          <Patients />
        </Protected>
      }/>

      <Route path="/doctors" element={
        <Protected roles={["admin"]} loginPath="/">
          <Doctors />
        </Protected>
      }/>

      <Route path="/appointment" element={
        <Protected roles={["admin"]} loginPath="/">
          <Appointment />
        </Protected>
      }/>

      <Route path="/reports" element={
        <Protected roles={["admin"]} loginPath="/">
          <Reports />
        </Protected>
      }/>

      {/* ── DOCTOR ROUTES ───────────────────────────────────────── */}

      <Route path="/doctor-dashboard" element={
        <Protected roles={["doctor", "admin"]} loginPath="/doctor-login">
          <DoctorDashboard />
        </Protected>
      }/>

      {/* ── PATIENT ROUTES ──────────────────────────────────────── */}
      {/* KEY FIX: loginPath="/patient-login" instead of "/" */}

      <Route path="/my-health" element={
        <Protected roles={["patient", "admin"]} loginPath="/patient-login">
          <PatientDashboard />
        </Protected>
      }/>

      {/* ── FALLBACK ────────────────────────────────────────────── */}
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  );
}
