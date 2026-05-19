// src/components/AddPatientForm.jsx
import { useState } from "react";
import { addPatient } from "../api/patientApi";

// ── Design tokens (matches Patients.jsx) ─────────────────────────
const C = {
  bg:      "#F8FAFC", surface: "#FFFFFF", border:  "#E2E8F0",
  text:    "#0F172A", muted:   "#64748B", subtle:  "#94A3B8",
  blue:    "#3B82F6", blueL:   "#EFF6FF",
  red:     "#EF4444", redL:    "#FEF2F2",
  green:   "#10B981", greenL:  "#ECFDF5",
  amber:   "#F59E0B", amberL:  "#FFFBEB",
  purple:  "#8B5CF6", purpleL: "#F5F3FF",
};

function Spinner({ color = "#fff", size = 14 }) {
  return (
    <>
      <style>{`@keyframes _sp2{to{transform:rotate(360deg)}}`}</style>
      <div style={{
        width: size, height: size, borderRadius: "50%", flexShrink: 0,
        border: `2px solid ${color}40`, borderTopColor: color,
        animation: "_sp2 .7s linear infinite", display: "inline-block",
      }} />
    </>
  );
}

function TextInput({ label, value, onChange, placeholder, type = "text", icon }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: ".05em" }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        {icon && (
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 15, pointerEvents: "none" }}>
            {icon}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: "100%", padding: icon ? "9px 12px 9px 34px" : "9px 12px",
            borderRadius: 8, fontSize: 13, fontFamily: "inherit",
            border: `1.5px solid ${focused ? C.blue : C.border}`,
            background: C.bg, color: C.text, outline: "none",
            boxSizing: "border-box", transition: "border-color .15s",
          }}
        />
      </div>
    </div>
  );
}

// Symptom checkbox pill
function SymptomCheck({ label, icon, checked, onChange, color, bg }) {
  return (
    <label style={{
      display: "flex", alignItems: "center", gap: 7,
      padding: "8px 14px", borderRadius: 10, cursor: "pointer",
      background: checked ? bg : C.bg,
      border: `1.5px solid ${checked ? color : C.border}`,
      transition: "all .15s", userSelect: "none",
    }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{ display: "none" }}
      />
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: checked ? 700 : 500, color: checked ? color : C.muted }}>
        {label}
      </span>
      {checked && (
        <span style={{
          marginLeft: "auto", width: 16, height: 16, borderRadius: "50%",
          background: color, display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 800,
        }}>✓</span>
      )}
    </label>
  );
}

const SYMPTOMS = [
  { key: "fever",           label: "Fever",           icon: "🌡️", color: C.red,    bg: C.redL    },
  { key: "cough",           label: "Cough",           icon: "😮‍💨", color: C.amber,  bg: C.amberL  },
  { key: "fatigue",         label: "Fatigue",         icon: "😴", color: C.purple, bg: C.purpleL },
  { key: "breathShortness", label: "Breathlessness",  icon: "🫁", color: C.blue,   bg: C.blueL   },
];

const EMPTY = {
  name: "", email: "", age: "", disease: "",
  fever: false, cough: false, fatigue: false, breathShortness: false,
};

export default function AddPatientForm({ refresh }) {
  const [form,    setForm]    = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState("");

  const set = (key) => (e) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const toggle = (key) => () =>
    setForm(f => ({ ...f, [key]: !f[key] }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Patient name is required."); return; }
    if (!form.email.trim()) { setError("Email is required."); return; }

    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      await addPatient({
        name:            form.name.trim(),
        email:           form.email.trim(),
        age:             form.age ? parseInt(form.age) : null,
        disease:         form.disease.trim() || null,
        fever:           form.fever,
        cough:           form.cough,
        fatigue:         form.fatigue,
        breathShortness: form.breathShortness,
      });
      setForm(EMPTY);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      if (refresh) refresh();
    } catch (err) {
      console.error("Add patient error:", err);
      setError("Failed to add patient. Check backend connection.");
    } finally {
      setLoading(false);
    }
  };

  const activeSymptoms = SYMPTOMS.filter(s => form[s.key]).length;

  return (
    <form onSubmit={handleSubmit} style={{ width: "100%" }}>

      {/* Row 1 — text fields */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1.4fr 1.6fr 0.7fr 1.3fr",
        gap: 12, marginBottom: 14,
      }}>
        <TextInput
          label="Full Name" icon="👤"
          value={form.name}
          onChange={set("name")}
          placeholder="Alice Smith"
        />
        <TextInput
          label="Email" icon="✉️" type="email"
          value={form.email}
          onChange={set("email")}
          placeholder="alice@example.com"
        />
        <TextInput
          label="Age" icon="🎂" type="number"
          value={form.age}
          onChange={set("age")}
          placeholder="34"
        />
        <TextInput
          label="Primary Diagnosis" icon="🩺"
          value={form.disease}
          onChange={set("disease")}
          placeholder="Diabetes, Cancer…"
        />
      </div>

      {/* Row 2 — symptoms */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".05em" }}>
          Symptoms {activeSymptoms > 0 && (
            <span style={{
              background: C.blueL, color: C.blue,
              fontSize: 10, fontWeight: 800, padding: "1px 7px",
              borderRadius: 999, marginLeft: 6,
            }}>{activeSymptoms} selected</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {SYMPTOMS.map(s => (
            <SymptomCheck
              key={s.key}
              label={s.label}
              icon={s.icon}
              checked={form[s.key]}
              onChange={toggle(s.key)}
              color={s.color}
              bg={s.bg}
            />
          ))}
        </div>
      </div>

      {/* Row 3 — feedback + submit */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button
          type="submit"
          disabled={loading}
          style={{
            background: loading ? C.subtle : C.green,
            color: "#fff", border: "none", borderRadius: 9,
            padding: "10px 22px", fontSize: 13, fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            display: "inline-flex", alignItems: "center", gap: 8,
            transition: "background .15s",
          }}
        >
          {loading ? <Spinner /> : <span>➕</span>}
          {loading ? "Adding patient…" : "Add Patient"}
        </button>

        {/* Reset */}
        <button
          type="button"
          onClick={() => { setForm(EMPTY); setError(""); setSuccess(false); }}
          style={{
            background: "none", color: C.muted,
            border: `1.5px solid ${C.border}`, borderRadius: 9,
            padding: "10px 16px", fontSize: 13, fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Clear
        </button>

        {/* Feedback messages */}
        {success && (
          <span style={{
            background: C.greenL, color: C.green,
            fontSize: 13, fontWeight: 600, padding: "8px 14px",
            borderRadius: 8, border: `1px solid ${C.green}30`,
          }}>
            ✅ Patient added successfully!
          </span>
        )}
        {error && (
          <span style={{
            background: C.redL, color: C.red,
            fontSize: 13, fontWeight: 600, padding: "8px 14px",
            borderRadius: 8, border: `1px solid ${C.red}30`,
          }}>
            ⚠️ {error}
          </span>
        )}
      </div>
    </form>
  );
}