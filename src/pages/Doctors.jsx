// src/pages/Doctors.jsx
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { useEffect, useState, useContext } from "react";
import { getDoctors, addDoctor, updateDoctor, deleteDoctor } from "../api/doctorApi";
import { AuthContext } from "../context/AuthContext";

// ── Design tokens ────────────────────────────────────────────────
const C = {
  bg:      "#F8FAFC", surface: "#FFFFFF", border: "#E2E8F0",
  text:    "#0F172A", muted:   "#64748B", subtle: "#94A3B8",
  blue:    "#3B82F6", blueL:   "#EFF6FF",
  red:     "#EF4444", redL:    "#FEF2F2",
  green:   "#10B981", greenL:  "#ECFDF5",
  amber:   "#F59E0B", amberL:  "#FFFBEB",
  indigo:  "#6366F1", indigoL: "#EEF2FF",
  purple:  "#8B5CF6", purpleL: "#F5F3FF",
  teal:    "#14B8A6", tealL:   "#F0FDFA",
  rose:    "#F43F5E", roseL:   "#FFF1F2",
};

const SPEC_COLORS = [
  [C.blue, C.blueL], [C.purple, C.purpleL], [C.teal, C.tealL],
  [C.amber, C.amberL], [C.rose, C.roseL], [C.green, C.greenL],
  [C.indigo, C.indigoL],
];

function specColor(spec = "") {
  let h = 0;
  for (let c of spec) h = (h * 31 + c.charCodeAt(0)) % SPEC_COLORS.length;
  return SPEC_COLORS[h];
}

// ── AI Recommendation ────────────────────────────────────────────
async function getRecommendation(symptoms) {
  try {
    const res = await fetch("http://localhost:8080/api/ai/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symptoms, age: 0, disease: "", fever: false, cough: false, breathShortness: false, fatigue: false }),
    });
    if (!res.ok) throw new Error("API unavailable");
    const data = await res.json();
    return data.recommendedSpecialization || "General Physician";
  } catch {
    // Smart fallback based on keyword matching
    const s = symptoms.toLowerCase();
    if (s.includes("heart") || s.includes("chest"))       return "Cardiologist";
    if (s.includes("brain") || s.includes("headache"))    return "Neurologist";
    if (s.includes("bone") || s.includes("joint"))        return "Orthopedist";
    if (s.includes("skin") || s.includes("rash"))         return "Dermatologist";
    if (s.includes("stomach") || s.includes("digest"))    return "Gastroenterologist";
    if (s.includes("lung") || s.includes("breath"))       return "Pulmonologist";
    if (s.includes("eye") || s.includes("vision"))        return "Ophthalmologist";
    if (s.includes("ear") || s.includes("throat"))        return "ENT Specialist";
    if (s.includes("mental") || s.includes("anxiety"))    return "Psychiatrist";
    if (s.includes("child") || s.includes("pediatric"))   return "Pediatrician";
    if (s.includes("cancer") || s.includes("tumor"))      return "Oncologist";
    return "General Physician";
  }
}

// ── Atoms ────────────────────────────────────────────────────────
function Spinner({ color = C.blue, size = 22 }) {
  return (
    <>
      <style>{`@keyframes _sp{to{transform:rotate(360deg)}}`}</style>
      <div style={{
        width: size, height: size, borderRadius: "50%",
        border: `2.5px solid ${color}30`, borderTopColor: color,
        animation: "_sp .7s linear infinite", display: "inline-block", flexShrink: 0,
      }} />
    </>
  );
}

function Input({ label, value, onChange, placeholder, type = "text", icon }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      {label && <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 5 }}>{label}</label>}
      <div style={{ position: "relative" }}>
        {icon && <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 16, pointerEvents: "none" }}>{icon}</span>}
        <input
          type={type} value={value} onChange={onChange} placeholder={placeholder}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width: "100%", padding: icon ? "9px 12px 9px 36px" : "9px 13px",
            borderRadius: 8, fontSize: 14, fontFamily: "inherit",
            border: `1.5px solid ${focused ? C.blue : C.border}`,
            background: C.bg, color: C.text, outline: "none",
            boxSizing: "border-box", transition: "border-color .15s",
          }}
        />
      </div>
    </div>
  );
}

function Btn({ label, onClick, type = "button", bg, hover, outline, icon, disabled, loading, full }) {
  const [h, setH] = useState(false);
  return (
    <button
      type={type} onClick={onClick} disabled={disabled || loading}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        background: outline ? "transparent" : (disabled || loading) ? "#E2E8F0" : h ? hover : bg,
        color: outline ? bg : (disabled || loading) ? C.subtle : "#fff",
        border: outline ? `1.5px solid ${bg}` : "none",
        borderRadius: 9, padding: "9px 18px", fontSize: 13, fontWeight: 700,
        cursor: (disabled || loading) ? "not-allowed" : "pointer",
        display: "inline-flex", alignItems: "center", gap: 7,
        transition: "all .15s", width: full ? "100%" : "auto",
        justifyContent: "center",
        transform: h && !disabled && !loading ? "translateY(-1px)" : "none",
      }}
    >
      {loading ? <Spinner color={outline ? bg : "#fff"} size={14} /> : icon ? <span style={{ fontSize: 15 }}>{icon}</span> : null}
      {label}
    </button>
  );
}

// ── Doctor Card ───────────────────────────────────────────────────
function DoctorCard({ doc, onEdit, onDelete, index }) {
  const [color, bg] = specColor(doc.specialization);
  const initials = (doc.name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const exp = parseInt(doc.experience) || 0;
  const patients = doc.patientsAssigned || 0;

  return (
    <div style={{
      background: C.surface, borderRadius: 18,
      boxShadow: "0 1px 4px rgba(0,0,0,.06), 0 4px 20px rgba(0,0,0,.04)",
      overflow: "hidden", transition: "transform .2s, box-shadow .2s",
      display: "flex", flexDirection: "column",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,.1)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,.06), 0 4px 20px rgba(0,0,0,.04)"; }}
    >
      {/* Accent top bar */}
      <div style={{ height: 4, background: `linear-gradient(90deg, ${color}, ${color}88)` }} />

      <div style={{ padding: "20px 22px", flex: 1 }}>
        {/* Avatar + name */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <div style={{
            width: 52, height: 52, borderRadius: "50%",
            background: bg, color, fontWeight: 800, fontSize: 18,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: `2px solid ${color}30`, flexShrink: 0,
          }}>{initials}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              Dr. {doc.name}
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {doc.email}
            </div>
          </div>
        </div>

        {/* Specialization badge */}
        <div style={{ marginBottom: 14 }}>
          <span style={{
            background: bg, color, fontSize: 12, fontWeight: 700,
            padding: "4px 12px", borderRadius: 999,
          }}>🩺 {doc.specialization || "General"}</span>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          {[
            { icon: "⭐", label: "Experience", value: `${exp} yrs` },
            { icon: "👥", label: "Patients", value: patients },
          ].map(s => (
            <div key={s.label} style={{
              flex: 1, background: C.bg, borderRadius: 10,
              padding: "10px 12px", textAlign: "center",
            }}>
              <div style={{ fontSize: 18 }}>{s.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{s.value}</div>
              <div style={{ fontSize: 10, color: C.subtle, marginTop: 1 }}>{s.label}</div>
            </div>
          ))}
          <div style={{
            flex: 1, background: exp >= 10 ? C.greenL : exp >= 5 ? C.amberL : C.blueL,
            borderRadius: 10, padding: "10px 12px", textAlign: "center",
          }}>
            <div style={{ fontSize: 18 }}>🏅</div>
            <div style={{
              fontSize: 12, fontWeight: 700,
              color: exp >= 10 ? C.green : exp >= 5 ? C.amber : C.blue,
            }}>
              {exp >= 10 ? "Senior" : exp >= 5 ? "Mid-level" : "Junior"}
            </div>
            <div style={{ fontSize: 10, color: C.subtle, marginTop: 1 }}>Level</div>
          </div>
        </div>

        {/* Availability indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.green, boxShadow: `0 0 6px ${C.green}` }} />
          <span style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>Available for appointments</span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: "12px 22px 18px", display: "flex", gap: 8, borderTop: `1px solid ${C.border}` }}>
        <Btn label="Edit" icon="✏️" onClick={() => onEdit(doc)} bg={C.blue} hover="#2563EB" />
        <Btn label="Delete" icon="🗑️" onClick={() => onDelete(doc.id)} bg={C.red} hover="#DC2626" />
      </div>
    </div>
  );
}

// ── Add/Edit Modal ────────────────────────────────────────────────
function DoctorFormModal({ form, setForm, editId, onSubmit, onClose }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 200, backdropFilter: "blur(6px)",
    }} onClick={onClose}>
      <div style={{
        background: C.surface, borderRadius: 20, padding: "32px 36px",
        width: 480, maxWidth: "92vw",
        boxShadow: "0 24px 80px rgba(0,0,0,.22)",
      }} onClick={e => e.stopPropagation()}>

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 26 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: C.blueL,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
          }}>🩺</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, color: C.text }}>{editId ? "Edit Doctor" : "Add New Doctor"}</div>
            <div style={{ fontSize: 12, color: C.muted }}>{editId ? "Update doctor record" : "Register a new specialist"}</div>
          </div>
          <button onClick={onClose} style={{
            marginLeft: "auto", background: "none", border: "none",
            fontSize: 22, cursor: "pointer", color: C.subtle,
          }}>×</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ gridColumn: "1/-1" }}>
            <Input label="Full Name" value={form.name} icon="👤"
              onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Dr. Priya Singh" />
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <Input label="Email Address" value={form.email} icon="✉️" type="email"
              onChange={e => setForm({ ...form, email: e.target.value })} placeholder="doctor@hospital.com" />
          </div>
          <Input label="Specialization" value={form.specialization} icon="🔬"
            onChange={e => setForm({ ...form, specialization: e.target.value })} placeholder="Cardiology" />
          <Input label="Experience (years)" value={form.experience} icon="📅" type="number"
            onChange={e => setForm({ ...form, experience: e.target.value })} placeholder="8" />
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <Btn label={editId ? "Save Changes" : "Add Doctor"} type="submit"
            onClick={onSubmit} bg={C.blue} hover="#2563EB" icon={editId ? "💾" : "➕"} full />
          <Btn label="Cancel" onClick={onClose} bg={C.muted} hover="#475569" />
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function Doctors() {
  const { user } = useContext(AuthContext);

  const [doctors,      setDoctors]      = useState([]);
  const [form,         setForm]         = useState({ name: "", email: "", specialization: "", experience: "" });
  const [editId,       setEditId]       = useState(null);
  const [search,       setSearch]       = useState("");
  const [showForm,     setShowForm]     = useState(false);
  const [loading,      setLoading]      = useState(false);

  // AI states
  const [symptoms,     setSymptoms]     = useState("");
  const [recommended,  setRecommended]  = useState(null);
  const [aiLoading,    setAiLoading]    = useState(false);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const data = await getDoctors();
      setDoctors(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchDoctors(); }, []);

  const handleSubmit = async () => {
    if (!form.name || !form.specialization) return alert("Name and specialization are required.");
    try {
      if (editId) { await updateDoctor(editId, form); setEditId(null); }
      else         { await addDoctor(form); }
      setForm({ name: "", email: "", specialization: "", experience: "" });
      setShowForm(false);
      fetchDoctors();
    } catch { alert("Failed to save. Please try again."); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this doctor from the system?")) return;
    try { const ok = await deleteDoctor(id); if (ok) fetchDoctors(); }
    catch { alert("Failed to delete."); }
  };

  const handleEdit = (doc) => {
    setForm({ name: doc.name, email: doc.email, specialization: doc.specialization, experience: doc.experience });
    setEditId(doc.id);
    setShowForm(true);
  };

  const handleAI = async () => {
    if (!symptoms.trim()) return;
    setAiLoading(true);
    setRecommended(null);
    const spec = await getRecommendation(symptoms);
    setRecommended(spec);
    setAiLoading(false);
  };

  const filtered = doctors.filter(d =>
    d.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.specialization?.toLowerCase().includes(search.toLowerCase())
  );

  // Unique specializations for stats
  const specs = [...new Set(doctors.map(d => d.specialization).filter(Boolean))];
  const totalPatients = doctors.reduce((s, d) => s + (d.patientsAssigned || 0), 0);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <Sidebar />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Header user={user} />

        <main style={{ flex: 1, padding: "28px 32px", maxWidth: 1300, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>

          {/* Page header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: 0, letterSpacing: "-.02em" }}>
                Medical Staff
              </h1>
              <p style={{ fontSize: 14, color: C.muted, marginTop: 4 }}>
                Manage doctors · AI-powered specialist recommendation
              </p>
            </div>
            <Btn label="Add Doctor" icon="➕" onClick={() => { setEditId(null); setForm({ name: "", email: "", specialization: "", experience: "" }); setShowForm(true); }}
              bg={C.blue} hover="#2563EB" />
          </div>

          {/* Stat pills */}
          <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
            {[
              { label: "Total Doctors",   value: doctors.length, bg: C.blueL,   color: C.blue   },
              { label: "Specializations", value: specs.length,   bg: C.purpleL, color: C.purple },
              { label: "Total Patients",  value: totalPatients,  bg: C.greenL,  color: C.green  },
            ].map(s => (
              <div key={s.label} style={{
                background: s.bg, color: s.color, borderRadius: 12,
                padding: "10px 20px", display: "flex", alignItems: "center", gap: 10,
                fontWeight: 700, boxShadow: "0 1px 4px rgba(0,0,0,.05)",
              }}>
                <span style={{ fontSize: 24, fontWeight: 800 }}>{s.value}</span>
                <span style={{ fontSize: 13, opacity: .75 }}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* AI Recommendation Panel */}
          <div style={{
            background: C.surface, borderRadius: 16, padding: "22px 26px",
            marginBottom: 24, boxShadow: "0 1px 4px rgba(0,0,0,.06)",
            borderLeft: `4px solid ${C.indigo}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 22 }}>🤖</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: C.text }}>AI Specialist Recommender</div>
                <div style={{ fontSize: 12, color: C.muted }}>Describe symptoms to find the right specialist</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 240 }}>
                <Input
                  value={symptoms} icon="🔍"
                  onChange={e => setSymptoms(e.target.value)}
                  placeholder="e.g. chest pain, shortness of breath, irregular heartbeat…"
                />
              </div>
              <Btn label="Recommend" icon="✨" onClick={handleAI}
                loading={aiLoading} disabled={!symptoms.trim()}
                bg={C.indigo} hover="#4F46E5" />
            </div>

            {recommended && (
              <div style={{
                marginTop: 14, background: C.indigoL, borderRadius: 10,
                padding: "14px 18px", display: "flex", alignItems: "center", gap: 12,
                border: `1px solid ${C.indigo}25`,
              }}>
                <span style={{ fontSize: 24 }}>🏥</span>
                <div>
                  <div style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Recommended Specialist</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: C.indigo }}>{recommended}</div>
                  {doctors.find(d => d.specialization?.toLowerCase().includes(recommended.toLowerCase().split(" ")[0])) && (
                    <div style={{ fontSize: 12, color: C.green, marginTop: 3, fontWeight: 600 }}>
                      ✓ Available in your system
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Search */}
          <div style={{ marginBottom: 20 }}>
            <Input value={search} icon="🔍"
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or specialization…" />
          </div>

          {/* Doctor grid */}
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: 64, color: C.muted }}>
              <Spinner size={36} /> <span style={{ fontSize: 14 }}>Loading medical staff…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 64 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>👨‍⚕️</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.muted }}>No doctors found</div>
              <div style={{ fontSize: 13, color: C.subtle, marginTop: 6 }}>
                {search ? "Try a different search term." : "Add your first doctor using the button above."}
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
              {filtered.map((doc, i) => (
                <DoctorCard key={doc.id} doc={doc} index={i} onEdit={handleEdit} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Form Modal */}
      {showForm && (
        <DoctorFormModal
          form={form} setForm={setForm}
          editId={editId} onSubmit={handleSubmit}
          onClose={() => { setShowForm(false); setEditId(null); }}
        />
      )}
    </div>
  );
}
