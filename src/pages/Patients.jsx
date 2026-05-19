// src/pages/Patients.jsx
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import AddPatientForm from "../components/AddPatientForm";
import SearchFilter from "../components/SearchFilter";
import ExportCSV from "../components/ExportCSV";
import PatientModal from "../components/PatientModal";

import { useEffect, useState, useContext } from "react";
import {
  getAllPatients,
  deletePatient,
  updatePatient,
  getSummary,
} from "../api/patientApi";
import { AuthContext } from "../context/AuthContext";

// ── Design tokens ────────────────────────────────────────────────
const C = {
  bg:      "#F8FAFC",
  surface: "#FFFFFF",
  border:  "#E2E8F0",
  text:    "#0F172A",
  muted:   "#64748B",
  subtle:  "#94A3B8",
  blue:    "#3B82F6", blueL:   "#EFF6FF",
  red:     "#EF4444", redL:    "#FEF2F2",
  green:   "#10B981", greenL:  "#ECFDF5",
  amber:   "#F59E0B", amberL:  "#FFFBEB",
  indigo:  "#6366F1", indigoL: "#EEF2FF",
  purple:  "#8B5CF6", purpleL: "#F5F3FF",
};

// ── Atoms ────────────────────────────────────────────────────────
const RiskBadge = ({ risk }) => {
  const isHigh = risk === 1;
  return (
    <span style={{
      background: isHigh ? C.redL : C.greenL,
      color: isHigh ? C.red : C.green,
      fontSize: 11, fontWeight: 700,
      padding: "3px 10px", borderRadius: 999, letterSpacing: ".04em",
    }}>
      {isHigh ? "High Risk" : "Low Risk"}
    </span>
  );
};

const SymTag = ({ label, color, bg }) => (
  <span style={{
    background: bg, color, fontSize: 10, fontWeight: 700,
    padding: "2px 7px", borderRadius: 999,
  }}>{label}</span>
);

function Spinner({ color = C.blue, size = 22 }) {
  return (
    <>
      <style>{`@keyframes _spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{
        width: size, height: size, borderRadius: "50%", flexShrink: 0,
        border: `2.5px solid ${color}30`, borderTopColor: color,
        animation: "_spin .7s linear infinite", display: "inline-block",
      }} />
    </>
  );
}

function Btn({ label, onClick, bg, hover, disabled, spin }) {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick} disabled={disabled}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        background: disabled ? "#E2E8F0" : h ? hover : bg,
        color: disabled ? C.subtle : "#fff",
        border: "none", borderRadius: 8,
        padding: "5px 13px", fontSize: 12, fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background .15s, transform .1s",
        transform: h && !disabled ? "translateY(-1px)" : "none",
        display: "inline-flex", alignItems: "center", gap: 5,
      }}
    >
      {spin ? <Spinner color="#fff" size={12} /> : null}
      {label}
    </button>
  );
}

// ── AI Summary Modal ──────────────────────────────────────────────
function SummaryModal({ patient, summary, loading, onClose }) {
  if (!patient) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 200, backdropFilter: "blur(6px)",
    }} onClick={onClose}>
      <div style={{
        background: C.surface, borderRadius: 20, padding: "32px 36px",
        width: 500, maxWidth: "92vw",
        boxShadow: "0 24px 80px rgba(0,0,0,.22)",
      }} onClick={e => e.stopPropagation()}>

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 13, background: C.purpleL,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
          }}>🤖</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, color: C.text }}>AI Clinical Summary</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Patient: <strong>{patient.name}</strong></div>
          </div>
          <button onClick={onClose} style={{
            marginLeft: "auto", background: "none", border: "none",
            fontSize: 22, cursor: "pointer", color: C.subtle, lineHeight: 1,
          }}>×</button>
        </div>

        {/* Quick stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
          {[
            { l: "Age",      v: patient.age     || "—" },
            { l: "Disease",  v: patient.disease || "—" },
            { l: "Risk",     v: (patient.predictedRisk ?? patient.predicted_risk) === 1 ? "High" : "Low" },
          ].map(({ l, v }) => (
            <div key={l} style={{ background: C.bg, borderRadius: 10, padding: "10px 14px" }}>
              <div style={{ fontSize: 10, color: C.subtle, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>{l}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginTop: 3 }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div style={{
          background: C.purpleL, borderRadius: 12, padding: "18px 20px",
          minHeight: 90, fontSize: 14, color: C.text, lineHeight: 1.75,
          border: `1px solid ${C.purple}25`,
        }}>
          {loading
            ? <div style={{ display: "flex", alignItems: "center", gap: 10, color: C.purple, fontWeight: 600 }}>
                <Spinner color={C.purple} size={16} /> Generating clinical summary…
              </div>
            : summary}
        </div>

        <button onClick={onClose} style={{
          marginTop: 20, width: "100%", background: C.indigo,
          color: "#fff", border: "none", borderRadius: 10,
          padding: "12px 0", fontWeight: 700, fontSize: 14, cursor: "pointer",
        }}>Close</button>
      </div>
    </div>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────
function EditModal({ editing, setEditing, handleUpdate }) {
  if (!editing) return null;

  const inp = (key, label, type = "text") => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 5 }}>{label}</label>
      <input
        type={type}
        value={editing[key] || ""}
        onChange={e => setEditing({ ...editing, [key]: e.target.value })}
        placeholder={label}
        style={{
          width: "100%", padding: "9px 13px", borderRadius: 8, fontSize: 14,
          border: `1.5px solid ${C.border}`, background: C.bg, color: C.text,
          outline: "none", boxSizing: "border-box", fontFamily: "inherit",
        }}
        onFocus={e => e.target.style.borderColor = C.blue}
        onBlur={e => e.target.style.borderColor = C.border}
      />
    </div>
  );

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 200, backdropFilter: "blur(6px)",
    }} onClick={() => setEditing(null)}>
      <div style={{
        background: C.surface, borderRadius: 20, padding: "32px 36px",
        width: 440, maxWidth: "92vw",
        boxShadow: "0 24px 80px rgba(0,0,0,.22)",
      }} onClick={e => e.stopPropagation()}>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 11, background: C.blueL,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
          }}>✏️</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: C.text }}>Edit Patient</div>
            <div style={{ fontSize: 12, color: C.muted }}>Update record details</div>
          </div>
          <button onClick={() => setEditing(null)} style={{
            marginLeft: "auto", background: "none", border: "none",
            fontSize: 22, cursor: "pointer", color: C.subtle,
          }}>×</button>
        </div>

        {inp("name",    "Full Name")}
        {inp("email",   "Email Address", "email")}
        {inp("age",     "Age", "number")}
        {inp("disease", "Diagnosis / Disease")}

        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button onClick={handleUpdate} style={{
            flex: 1, background: C.blue, color: "#fff", border: "none",
            borderRadius: 10, padding: "12px 0", fontWeight: 700, fontSize: 14, cursor: "pointer",
          }}>Save Changes</button>
          <button onClick={() => setEditing(null)} style={{
            flex: 1, background: C.bg, color: C.muted,
            border: `1.5px solid ${C.border}`, borderRadius: 10,
            padding: "12px 0", fontWeight: 700, fontSize: 14, cursor: "pointer",
          }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────
export default function Patients() {
  const { user } = useContext(AuthContext);

  const [patients,        setPatients]        = useState([]);
  const [search,          setSearch]          = useState("");
  const [risk,            setRisk]            = useState("all");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [editing,         setEditing]         = useState(null);
  const [loading,         setLoading]         = useState(false);
  const [summaryState,    setSummaryState]    = useState(null); // { patient, summary, loading }

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getAllPatients();
      setPatients(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch error:", err);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this patient record?")) return;
    try { await deletePatient(id); fetchData(); }
    catch { alert("Failed to delete. Please try again."); }
  };

  const handleUpdate = async () => {
    try { await updatePatient(editing.id, editing); setEditing(null); fetchData(); }
    catch { alert("Failed to update. Please try again."); }
  };

  // ✅ AI Summary — no more alert(), opens modal with graceful fallback
  const handleSummary = async (patient, e) => {
    e.stopPropagation();
    setSummaryState({ patient, summary: null, loading: true });
    try {
      const res = await getSummary(patient);
      const text =
        typeof res === "string" ? res :
        res?.summary ?? res?.data?.summary ?? res?.message ??
        `Patient ${patient.name}, Age ${patient.age ?? "N/A"}, diagnosed with ${patient.disease || "an unspecified condition"}. Predicted risk level: ${(patient.predictedRisk ?? patient.predicted_risk) === 1 ? "High" : "Low"}.`;
      setSummaryState({ patient, summary: text, loading: false });
    } catch {
      // ✅ graceful fallback — never shows browser alert box
      setSummaryState({
        patient,
        summary: `AI service is currently unavailable. Here is a brief overview — Name: ${patient.name}, Age: ${patient.age ?? "N/A"}, Condition: ${patient.disease || "N/A"}, Risk: ${(patient.predictedRisk ?? patient.predicted_risk) === 1 ? "High" : "Low"}.`,
        loading: false,
      });
    }
  };

  const filteredPatients = patients.filter(p => {
    const s = p.name?.toLowerCase().includes(search.toLowerCase()) ?? true;
    const r =
      risk === "all" ||
      (risk === "high" && (p.predictedRisk === 1 || p.predicted_risk === 1)) ||
      (risk === "low"  && (p.predictedRisk === 0 || p.predicted_risk === 0));
    return s && r;
  });

  const highCount = patients.filter(p => (p.predictedRisk ?? p.predicted_risk) === 1).length;
  const lowCount  = patients.length - highCount;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <Sidebar />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Header user={user} />

        <main style={{ flex: 1, padding: "28px 32px", maxWidth: 1300, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>

          {/* Page header */}
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: 0, letterSpacing: "-.02em" }}>
              Patient Records
            </h1>
            <p style={{ fontSize: 14, color: C.muted, marginTop: 4 }}>
              AI-Integrated Healthcare · Predictive Diagnosis & Intelligent Decision Support
            </p>
          </div>

          {/* Stat pills */}
          <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
            {[
              { label: "Total Patients", value: patients.length, bg: C.blueL,  color: C.blue  },
              { label: "High Risk",      value: highCount,       bg: C.redL,   color: C.red   },
              { label: "Low Risk",       value: lowCount,        bg: C.greenL, color: C.green },
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

          {/* Add patient */}
          <div style={{
            background: C.surface, borderRadius: 16, padding: "20px 24px",
            marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,.05)",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.subtle, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 12 }}>
              Register New Patient
            </div>
            <AddPatientForm refresh={fetchData} />
          </div>

          {/* Search + filter + export */}
          <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <SearchFilter search={search} setSearch={setSearch} risk={risk} setRisk={setRisk} />
            </div>
            <ExportCSV data={filteredPatients} />
          </div>

          {/* Table */}
          <div style={{
            background: C.surface, borderRadius: 16, overflow: "hidden",
            boxShadow: "0 1px 4px rgba(0,0,0,.06), 0 4px 24px rgba(0,0,0,.04)",
          }}>
            {loading ? (
              <div style={{ padding: 64, display: "flex", flexDirection: "column", alignItems: "center", gap: 16, color: C.muted }}>
                <Spinner size={36} />
                <span style={{ fontSize: 14 }}>Loading patient records…</span>
              </div>
            ) : filteredPatients.length === 0 ? (
              <div style={{ padding: 64, textAlign: "center" }}>
                <div style={{ fontSize: 44, marginBottom: 12 }}>🏥</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.muted }}>No patients found</div>
                <div style={{ fontSize: 13, color: C.subtle, marginTop: 6 }}>
                  {search ? "Try a different search term or filter." : "Register your first patient using the form above."}
                </div>
              </div>
            ) : (
              <>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}` }}>
                      {["Patient", "Email", "Age", "Diagnosis", "Symptoms", "Risk", "Actions"].map(h => (
                        <th key={h} style={{
                          padding: "13px 16px", textAlign: "left",
                          fontSize: 11, fontWeight: 700, color: C.subtle,
                          textTransform: "uppercase", letterSpacing: ".07em",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPatients.map((p, i) => {
                      const isHigh = (p.predictedRisk ?? p.predicted_risk) === 1;
                      return (
                        <tr
                          key={p.id}
                          onClick={() => setSelectedPatient(p)}
                          style={{
                            borderBottom: `1px solid ${C.border}`,
                            cursor: "pointer",
                            background: i % 2 === 0 ? C.surface : "#FAFBFC",
                            transition: "background .12s",
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = "#EFF6FF"}
                          onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? C.surface : "#FAFBFC"}
                        >
                          {/* Name + avatar */}
                          <td style={{ padding: "13px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{
                                width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                                background: isHigh ? C.redL : C.blueL,
                                color: isHigh ? C.red : C.blue,
                                display: "flex", alignItems: "center",
                                justifyContent: "center", fontWeight: 800, fontSize: 15,
                              }}>
                                {(p.name || "?")[0].toUpperCase()}
                              </div>
                              <span style={{ fontWeight: 600, color: C.text }}>{p.name || "N/A"}</span>
                            </div>
                          </td>

                          <td style={{ padding: "13px 16px", color: C.muted }}>{p.email || "—"}</td>
                          <td style={{ padding: "13px 16px", fontWeight: 600, color: C.text }}>{p.age ?? "—"}</td>
                          <td style={{ padding: "13px 16px", color: C.text }}>{p.disease || p.aiDisease || "—"}</td>

                          {/* Symptoms */}
                          <td style={{ padding: "13px 16px" }}>
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                              {p.fever           && <SymTag label="Fever"   color={C.red}    bg={C.redL}    />}
                              {p.cough           && <SymTag label="Cough"   color={C.amber}  bg={C.amberL}  />}
                              {p.fatigue         && <SymTag label="Fatigue" color={C.purple} bg={C.purpleL} />}
                              {p.breathShortness && <SymTag label="Breath"  color={C.blue}   bg={C.blueL}   />}
                              {!p.fever && !p.cough && !p.fatigue && !p.breathShortness &&
                                <span style={{ color: C.subtle, fontSize: 12 }}>None</span>}
                            </div>
                          </td>

                          <td style={{ padding: "13px 16px" }}>
                            <RiskBadge risk={p.predictedRisk ?? p.predicted_risk} />
                          </td>

                          {/* Actions */}
                          <td style={{ padding: "13px 16px" }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: "flex", gap: 6 }}>
                              <Btn label="Edit"   onClick={() => setEditing({ ...p })}  bg={C.blue}   hover="#2563EB" />
                              <Btn label="Delete" onClick={() => handleDelete(p.id)}    bg={C.red}    hover="#DC2626" />
                              <Btn label="AI ✦"   onClick={e => handleSummary(p, e)}   bg={C.indigo} hover="#4F46E5" />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Footer */}
                <div style={{
                  padding: "11px 20px", background: C.bg,
                  borderTop: `1px solid ${C.border}`,
                  display: "flex", justifyContent: "space-between",
                  fontSize: 12, color: C.subtle,
                }}>
                  <span>Showing <strong style={{ color: C.muted }}>{filteredPatients.length}</strong> of <strong style={{ color: C.muted }}>{patients.length}</strong> patients</span>
                  <span>Click any row to view full patient details</span>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      <PatientModal patient={selectedPatient} onClose={() => setSelectedPatient(null)} />
      <EditModal editing={editing} setEditing={setEditing} handleUpdate={handleUpdate} />
      <SummaryModal
        patient={summaryState?.patient}
        summary={summaryState?.summary}
        loading={summaryState?.loading}
        onClose={() => setSummaryState(null)}
      />
    </div>
  );
}
