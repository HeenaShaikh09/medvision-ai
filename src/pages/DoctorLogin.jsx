// src/pages/DoctorLogin.jsx
// Standalone doctor login portal — routes to /doctor-dashboard on success

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function DoctorLogin() {
  const [tab,      setTab]      = useState("login");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [name,     setName]     = useState("");
  const [err,      setErr]      = useState("");
  const [success,  setSuccess]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const navigate = useNavigate();

  const reset = () => { setErr(""); setSuccess(""); };

  const handleLogin = async (e) => {
    e.preventDefault();
    reset(); setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const role = data.user?.user_metadata?.role;
      if (role === "patient") {
        await supabase.auth.signOut();
        setErr("This is the Doctor portal. Patients should log in at /patient-login.");
        return;
      }
      if (role === "admin") {
        await supabase.auth.signOut();
        setErr("This is the Doctor portal. Admins should log in at /.");
        return;
      }
      navigate("/doctor-dashboard");
    } catch (e) {
      setErr(e.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    reset(); setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { role: "doctor", display_name: name } },
      });
      if (error) throw error;
      setSuccess("Doctor account created! Check your email to confirm.");
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
      background: "linear-gradient(135deg, #CCFBF1 0%, #99F6E4 40%, #D1FAE5 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Segoe UI', system-ui, sans-serif", padding: 24,
    }}>
      <div style={{ width: "100%", maxWidth: 440 }}>

        {/* Branding */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 58, height: 58, borderRadius: 16,
            background: "#0D9488", margin: "0 auto 14px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 26, boxShadow: "0 4px 20px rgba(13,148,136,.35)",
          }}>🩺</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0B1437", margin: 0 }}>MedVision AI</h1>
          <p style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>Doctor Portal · Verify AI Reports</p>
        </div>

        {/* Tab switcher */}
        <div style={{ background: "#CCFBF1", borderRadius: 12, padding: 4, display: "flex", marginBottom: 0 }}>
          {["login", "register"].map(m => (
            <button key={m} onClick={() => { setTab(m); reset(); }} style={{
              flex: 1, padding: "10px 0", borderRadius: 9, border: "none",
              background: tab === m ? "#fff" : "transparent",
              color: tab === m ? "#0B1437" : "#0F766E",
              fontSize: 14, fontWeight: tab === m ? 700 : 500,
              cursor: "pointer",
              boxShadow: tab === m ? "0 1px 4px rgba(0,0,0,.08)" : "none",
              transition: "all .2s",
            }}>{m.charAt(0).toUpperCase() + m.slice(1)}</button>
          ))}
        </div>

        {/* Card */}
        <div style={{
          background: "#fff", borderRadius: "0 0 20px 20px",
          padding: "28px 32px 32px",
          boxShadow: "0 8px 32px rgba(0,0,0,.08)",
        }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: "#0B1437", margin: "0 0 20px" }}>
            {tab === "login" ? "Doctor sign in" : "Create doctor account"}
          </h2>

          {err && <div style={{ background: "#FEF2F2", border: "1px solid rgba(220,38,38,.2)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#DC2626", marginBottom: 16, fontWeight: 600 }}>⚠️ {err}</div>}
          {success && <div style={{ background: "#F0FDF4", border: "1px solid rgba(5,150,105,.2)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#059669", marginBottom: 16, fontWeight: 600 }}>✓ {success}</div>}

          <form onSubmit={tab === "login" ? handleLogin : handleRegister}>
            {tab === "register" && (
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Full name</label>
                <input type="text" value={name} required onChange={e => setName(e.target.value)} placeholder="Dr. Full Name" style={inp} />
              </div>
            )}
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Email</label>
              <input type="email" value={email} required onChange={e => setEmail(e.target.value)} placeholder="doctor@hospital.com" style={inp} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={lbl}>Password</label>
              <input type="password" value={password} required onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={inp} />
            </div>

            <button type="submit" disabled={loading} style={{
              width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
              background: loading ? "#99F6E4" : "#0D9488", color: "#fff",
              fontSize: 14, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "background .2s",
            }}>
              {loading ? "Please wait…" : tab === "login" ? "Doctor Login" : "Register"}
            </button>
          </form>
        </div>

        {/* Portal switcher */}
        <div style={{ background: "rgba(255,255,255,.65)", backdropFilter: "blur(8px)", borderRadius: 16, padding: "18px 24px", marginTop: 16, border: "1px solid rgba(255,255,255,.8)" }}>
          <p style={{ fontSize: 11, color: "#475569", fontWeight: 700, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: ".06em", textAlign: "center" }}>Other portals</p>
          <div style={{ display: "flex", gap: 10 }}>
            <Link to="/" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 0", borderRadius: 12, background: "#EFF6FF", border: "1px solid #BFDBFE", textDecoration: "none" }}>
              <span style={{ fontSize: 16 }}>🛡️</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#1D4ED8" }}>Admin Login</div>
                <div style={{ fontSize: 10, color: "#60A5FA" }}>System management</div>
              </div>
            </Link>
            <Link to="/patient-login" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 0", borderRadius: 12, background: "#F5F3FF", border: "1px solid #C4B5FD", textDecoration: "none" }}>
              <span style={{ fontSize: 16 }}>🏥</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#6D28D9" }}>Patient Login</div>
                <div style={{ fontSize: 10, color: "#8B5CF6" }}>My health portal</div>
              </div>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}

const lbl = { fontSize: 11, fontWeight: 700, color: "#475569", display: "block", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 };
const inp = { width: "100%", boxSizing: "border-box", padding: "11px 14px", borderRadius: 10, border: "1.5px solid #E2E8F0", fontSize: 14, color: "#0B1437", background: "#F8FAFC", fontFamily: "inherit", outline: "none" };
