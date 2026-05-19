// src/pages/Auth.jsx  ← Admin portal login/register
// Fixed version: correct routing, role gate, portal switcher

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function Auth() {
  const [tab,      setTab]      = useState("login");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [name,     setName]     = useState("");
  const [err,      setErr]      = useState("");
  const [success,  setSuccess]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const navigate = useNavigate();

  const reset = () => { setErr(""); setSuccess(""); };

  // ── LOGIN ──────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    reset(); setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const role = data.user?.user_metadata?.role;

      // Role gate — redirect non-admins to correct portal
      if (role === "doctor") {
        await supabase.auth.signOut();
        setErr("This is the Admin portal. Doctors should log in via the Doctor Login link below.");
        return;
      }
      if (role === "patient") {
        await supabase.auth.signOut();
        setErr("This is the Admin portal. Patients should log in via the Patient Login link below.");
        return;
      }
      // role === "admin" or unset → allow in
      navigate("/dashboard");
    } catch (e) {
      setErr(e.message || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  // ── REGISTER ───────────────────────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault();
    reset(); setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { role: "admin", display_name: name } },
      });
      if (error) throw error;
      setSuccess("Admin account created! Check your email to confirm, then log in.");
      setTimeout(() => { setTab("login"); reset(); }, 2500);
    } catch (e) {
      setErr(e.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #b2d8d8 0%, #c8e6e6 40%, #d4ecd4 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Segoe UI', system-ui, sans-serif", padding: 24,
    }}>
      <div style={{ width: "100%", maxWidth: 440 }}>

        {/* Branding */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 58, height: 58, borderRadius: 16,
            background: "#2563EB", margin: "0 auto 14px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 26, boxShadow: "0 4px 20px rgba(37,99,235,.3)",
          }}>⚕️</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0B1437", margin: 0, letterSpacing: "-.02em" }}>
            MedVision AI
          </h1>
          <p style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
            AI-Integrated Healthcare · Admin Portal
          </p>
        </div>

        {/* Login / Register tab switcher */}
        <div style={{
          background: "#e2e8f0", borderRadius: 12, padding: 4,
          display: "flex", marginBottom: 0,
        }}>
          {["login", "register"].map(m => (
            <button key={m} onClick={() => { setTab(m); reset(); }} style={{
              flex: 1, padding: "10px 0", borderRadius: 9, border: "none",
              background: tab === m ? "#fff" : "transparent",
              color: tab === m ? "#0B1437" : "#64748B",
              fontSize: 14, fontWeight: tab === m ? 700 : 400,
              cursor: "pointer",
              boxShadow: tab === m ? "0 1px 4px rgba(0,0,0,.1)" : "none",
              transition: "all .2s",
            }}>
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>

        {/* Main card */}
        <div style={{
          background: "#fff", borderRadius: "0 0 20px 20px",
          padding: "28px 32px 32px",
          boxShadow: "0 8px 32px rgba(0,0,0,.08)",
        }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: "#0B1437", margin: "0 0 20px" }}>
            {tab === "login" ? "Admin sign in" : "Create admin account"}
          </h2>

          {err && (
            <div style={{
              background: "#FEF2F2", border: "1px solid rgba(220,38,38,.2)",
              borderRadius: 10, padding: "10px 14px", fontSize: 13,
              color: "#DC2626", marginBottom: 16, fontWeight: 600,
            }}>⚠️ {err}</div>
          )}
          {success && (
            <div style={{
              background: "#F0FDF4", border: "1px solid rgba(5,150,105,.2)",
              borderRadius: 10, padding: "10px 14px", fontSize: 13,
              color: "#059669", marginBottom: 16, fontWeight: 600,
            }}>✓ {success}</div>
          )}

          <form onSubmit={tab === "login" ? handleLogin : handleRegister}>
            {tab === "register" && (
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Full name</label>
                <input
                  type="text" value={name} required
                  onChange={e => setName(e.target.value)}
                  placeholder="Admin full name"
                  style={inputStyle}
                />
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Email</label>
              <input
                type="email" value={email} required
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@hospital.com"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Password</label>
              <input
                type="password" value={password} required
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={inputStyle}
              />
            </div>

            <button type="submit" disabled={loading} style={{
              width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
              background: loading ? "#93C5FD" : "#2563EB", color: "#fff",
              fontSize: 14, fontWeight: 800,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "background .2s",
            }}>
              {loading ? (
                <><Spinner />{tab === "login" ? "Signing in…" : "Creating account…"}</>
              ) : (
                tab === "login" ? "Login" : "Register Admin"
              )}
            </button>
          </form>
        </div>

        {/* ── Portal switcher ─────────────────────────────────────── */}
        <div style={{
          background: "rgba(255,255,255,.65)", backdropFilter: "blur(8px)",
          borderRadius: 16, padding: "18px 24px", marginTop: 16,
          border: "1px solid rgba(255,255,255,.8)",
        }}>
          <p style={{
            fontSize: 11, color: "#475569", fontWeight: 700, margin: "0 0 12px",
            textTransform: "uppercase", letterSpacing: ".06em", textAlign: "center",
          }}>Other portals</p>
          <div style={{ display: "flex", gap: 10 }}>

            {/* Doctor Login → /doctor-login */}
            <Link to="/doctor-login" style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              gap: 8, padding: "10px 0", borderRadius: 12,
              background: "#F0FDFA", border: "1px solid #99F6E4",
              textDecoration: "none", transition: "all .15s",
            }}>
              <span style={{ fontSize: 16 }}>🩺</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#0F766E", lineHeight: 1 }}>Doctor Login</div>
                <div style={{ fontSize: 10, color: "#5EA89C", marginTop: 2 }}>Verify AI reports</div>
              </div>
            </Link>

            {/* Patient Login → /patient-login */}
            <Link to="/patient-login" style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              gap: 8, padding: "10px 0", borderRadius: 12,
              background: "#F5F3FF", border: "1px solid #C4B5FD",
              textDecoration: "none", transition: "all .15s",
            }}>
              <span style={{ fontSize: 16 }}>🏥</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#6D28D9", lineHeight: 1 }}>Patient Login</div>
                <div style={{ fontSize: 10, color: "#8B5CF6", marginTop: 2 }}>My health portal</div>
              </div>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}

const labelStyle = {
  fontSize: 11, fontWeight: 700, color: "#475569", display: "block",
  textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6,
};

const inputStyle = {
  width: "100%", boxSizing: "border-box", padding: "11px 14px",
  borderRadius: 10, border: "1.5px solid #E2E8F0",
  fontSize: 14, color: "#0B1437", background: "#F8FAFC",
  fontFamily: "inherit", outline: "none", transition: "border-color .15s",
};

function Spinner() {
  return (
    <>
      <div style={{
        width: 16, height: 16, borderRadius: "50%",
        border: "2px solid rgba(255,255,255,.35)", borderTopColor: "#fff",
        animation: "_sp .7s linear infinite", flexShrink: 0,
      }} />
      <style>{`@keyframes _sp{to{transform:rotate(360deg)}}`}</style>
    </>
  );
}
