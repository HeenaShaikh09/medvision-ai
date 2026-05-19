// src/pages/PatientLogin.jsx
// Patient portal login/register — routes to /my-health on success

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function PatientLogin() {
  const [tab,      setTab]      = useState("login");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [name,     setName]     = useState("");
  const [dob,      setDob]      = useState("");
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
      if (role === "admin") {
        await supabase.auth.signOut();
        setErr("This is the Patient portal. Admins should log in at the Admin portal.");
        return;
      }
      if (role === "doctor") {
        await supabase.auth.signOut();
        setErr("This is the Patient portal. Doctors should log in at the Doctor portal.");
        return;
      }
      navigate("/my-health");
    } catch (e) {
      setErr(e.message || "Login failed. Check your credentials.");
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
        options: { data: { role: "patient", display_name: name, date_of_birth: dob } },
      });
      if (error) throw error;
      setSuccess("Account created! Check your email to confirm, then log in.");
      setTimeout(() => { setTab("login"); reset(); }, 2800);
    } catch (e) {
      setErr(e.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 40%, #E0E7FF 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Segoe UI', system-ui, sans-serif", padding: 24,
    }}>
      <div style={{ width: "100%", maxWidth: 440 }}>

        {/* Branding */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 58, height: 58, borderRadius: 16,
            background: "#7C3AED", margin: "0 auto 14px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 26, boxShadow: "0 4px 20px rgba(124,58,237,.35)",
          }}>🏥</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0B1437", margin: 0 }}>MedVision AI</h1>
          <p style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>Patient Health Portal · Your Records & Reports</p>
        </div>

        {/* Tab switcher */}
        <div style={{ background: "#DDD6FE", borderRadius: 12, padding: 4, display: "flex", marginBottom: 0 }}>
          {["login", "register"].map(m => (
            <button key={m} onClick={() => { setTab(m); reset(); }} style={{
              flex: 1, padding: "10px 0", borderRadius: 9, border: "none",
              background: tab === m ? "#fff" : "transparent",
              color: tab === m ? "#0B1437" : "#6D28D9",
              fontSize: 14, fontWeight: tab === m ? 700 : 500,
              cursor: "pointer",
              boxShadow: tab === m ? "0 1px 4px rgba(0,0,0,.08)" : "none",
              transition: "all .2s",
            }}>{m === "login" ? "Sign In" : "Register"}</button>
          ))}
        </div>

        {/* Card */}
        <div style={{
          background: "#fff", borderRadius: "0 0 20px 20px",
          padding: "28px 32px 32px",
          boxShadow: "0 8px 32px rgba(0,0,0,.08)",
        }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: "#0B1437", margin: "0 0 20px" }}>
            {tab === "login" ? "Welcome back" : "Create your account"}
          </h2>

          {err && (
            <div style={{ background: "#FEF2F2", border: "1px solid rgba(220,38,38,.2)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#DC2626", marginBottom: 16, fontWeight: 600 }}>
              ⚠️ {err}
            </div>
          )}
          {success && (
            <div style={{ background: "#F0FDF4", border: "1px solid rgba(5,150,105,.2)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#059669", marginBottom: 16, fontWeight: 600 }}>
              ✓ {success}
            </div>
          )}

          <form onSubmit={tab === "login" ? handleLogin : handleRegister}>
            {tab === "register" && (
              <>
                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>Full name</label>
                  <input type="text" value={name} required onChange={e => setName(e.target.value)}
                    placeholder="Your full name" style={inp} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>Date of birth</label>
                  <input type="date" value={dob} onChange={e => setDob(e.target.value)} style={inp} />
                </div>
              </>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Email</label>
              <input type="email" value={email} required onChange={e => setEmail(e.target.value)}
                placeholder="you@email.com" style={inp} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={lbl}>Password</label>
              <input type="password" value={password} required onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" style={inp} />
            </div>

            <button type="submit" disabled={loading} style={{
              width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
              background: loading ? "#C4B5FD" : "#7C3AED", color: "#fff",
              fontSize: 14, fontWeight: 800,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "background .2s",
            }}>
              {loading
                ? (tab === "login" ? "Signing in…" : "Creating account…")
                : (tab === "login" ? "Sign In to My Health Portal" : "Create Patient Account")}
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
            <Link to="/doctor-login" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 0", borderRadius: 12, background: "#F0FDFA", border: "1px solid #99F6E4", textDecoration: "none" }}>
              <span style={{ fontSize: 16 }}>🩺</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#0F766E" }}>Doctor Login</div>
                <div style={{ fontSize: 10, color: "#5EA89C" }}>Verify AI reports</div>
              </div>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}

const lbl = { fontSize: 11, fontWeight: 700, color: "#475569", display: "block", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 };
const inp = { width: "100%", boxSizing: "border-box", padding: "11px 14px", borderRadius: 10, border: "1.5px solid #E2E8F0", fontSize: 14, color: "#0B1437", background: "#F8FAFC", fontFamily: "inherit", outline: "none", transition: "border-color .15s" };
