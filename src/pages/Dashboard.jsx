// src/pages/Dashboard.jsx
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { getAllPatients, getAnalytics } from "../api/patientApi";
import { getDoctors } from "../api/doctorApi";
import { getAllAppointments } from "../api/appointApi"; // ✅ FIX: was importing from wrong file

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

// ── Design tokens ─────────────────────────────────────────────────
const C = {
  bg:      "#F0F4FF", surface: "#FFFFFF", border:  "#DDE3F0",
  text:    "#0B1437", muted:   "#5A6A8A", subtle:  "#8899BB",
  blue:    "#3D6FF8", blueL:   "#EBF0FF",
  indigo:  "#5B4EF8", indigoL: "#EEECFF",
  teal:    "#0EB8A4", tealL:   "#E4FAF7",
  green:   "#0DBD78", greenL:  "#E4F9F1",
  amber:   "#F5A623", amberL:  "#FFF5E0",
  red:     "#F04E4E", redL:    "#FFF0F0",
  purple:  "#9747FF", purpleL: "#F5EDFF",
};

const RISK_COLORS  = [C.red, C.green];
const CHART_COLORS = [C.blue, C.purple, C.teal, C.amber, C.red, C.green];
const TODAY        = new Date().toISOString().split("T")[0];

const fmtTime = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};
const fmtDate = (d) =>
  d ? new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—";

// ── Atoms ─────────────────────────────────────────────────────────
function Spin() {
  return (
    <>
      <style>{`@keyframes _ds{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 44, height: 44, borderRadius: "50%",
        border: "4px solid #DDE3F0", borderTopColor: C.blue,
        animation: "_ds .8s linear infinite" }} />
    </>
  );
}

function RiskBadge({ risk }) {
  const hi = risk === 1;
  return (
    <span style={{ background: hi ? C.redL : C.greenL, color: hi ? C.red : C.green,
      fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 999 }}>
      {hi ? "High" : "Low"}
    </span>
  );
}

function SymTag({ label, color, bg }) {
  return (
    <span style={{ background: bg, color, fontSize: 9, fontWeight: 700,
      padding: "1px 6px", borderRadius: 999 }}>{label}</span>
  );
}

function ApptStatus({ status }) {
  const MAP = {
    scheduled: { color: C.blue,  bg: C.blueL,  label: "Scheduled" },
    completed: { color: C.green, bg: C.greenL, label: "Completed" },
    cancelled: { color: C.red,   bg: C.redL,   label: "Cancelled" },
    "no-show": { color: C.amber, bg: C.amberL, label: "No Show"   },
  };
  const s = MAP[status] || MAP.scheduled;
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 9,
      fontWeight: 700, padding: "2px 7px", borderRadius: 999 }}>
      {s.label}
    </span>
  );
}

function StatCard({ title, value, icon, color, bg, sub }) {
  return (
    <div style={{ background: C.surface, borderRadius: 16, padding: "18px 20px",
      boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 20px rgba(0,0,0,.04)",
      borderTop: `3px solid ${color}`, display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 46, height: 46, borderRadius: 13, background: bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22, flexShrink: 0 }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, marginBottom: 2,
          textTransform: "uppercase", letterSpacing: ".06em" }}>{title}</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: C.text, lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: 10, color: C.subtle, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

function ChartCard({ title, children, style = {}, badge }) {
  return (
    <div style={{ background: C.surface, borderRadius: 16, padding: "20px 18px",
      boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 20px rgba(0,0,0,.04)", ...style }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>{title}</h3>
        {badge && <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>{badge}</span>}
      </div>
      {children}
    </div>
  );
}

function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.text, color: "#F1F5F9", borderRadius: 10,
      padding: "8px 13px", fontSize: 12, boxShadow: "0 8px 32px rgba(0,0,0,.2)" }}>
      {label && <div style={{ fontWeight: 700, marginBottom: 2 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || "#94A3B8" }}>
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
}

function Empty({ message }) {
  return (
    <div style={{ height: 160, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", color: C.subtle, gap: 8 }}>
      <div style={{ fontSize: 32 }}>📭</div>
      <div style={{ fontSize: 12 }}>{message}</div>
    </div>
  );
}

function InsightRow({ label, value, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
      fontSize: 13, padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
      <span style={{ color: C.muted }}>{label}</span>
      <span style={{ fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

function Loader({ text }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 16,
      background: C.bg, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <Spin />
      <p style={{ color: C.muted, fontSize: 14 }}>{text}</p>
    </div>
  );
}

function Blocker({ text, isError }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: C.bg, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ background: C.surface, borderRadius: 16, padding: "40px 48px",
        textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,.06)", maxWidth: 400 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>{isError ? "⚠️" : "🔐"}</div>
        <p style={{ color: isError ? C.red : C.muted, fontSize: 14 }}>{text}</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const { user, loading } = useAuth();

  // ✅ FIX: all state declared inside the component
  const [patients,     setPatients]     = useState([]);
  const [doctors,      setDoctors]      = useState([]);
  const [analytics,    setAnalytics]    = useState({ total: 0, highRisk: 0, lowRisk: 0 });
  const [appointments, setAppointments] = useState([]); // 
  const [loadingData,  setLoadingData]  = useState(true);
  const [error,        setError]        = useState("");

  // ✅ FIX: appointments result now captured and set into state
  const fetchData = useCallback(async () => {
    try {
      const [pData, dData, aData, apptData] = await Promise.all([
        getAllPatients(),
        getDoctors(),
        getAnalytics(),
        getAllAppointments(),   // ✅ FIX: was fetched but result was never captured
      ]);
      setPatients(Array.isArray(pData)     ? pData     : []);
      setDoctors(Array.isArray(dData)      ? dData     : []);
      setAnalytics(aData || { total: 0, highRisk: 0, lowRisk: 0 });
      setAppointments(Array.isArray(apptData) ? apptData : []);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError("Failed to load dashboard data. Check your backend connection.");
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading)     return <Loader text="Authenticating…" />;
  if (!user)       return <Blocker text="Please log in to access the dashboard." />;
  if (loadingData) return <Loader text="Loading dashboard…" />;
  if (error)       return <Blocker text={error} isError />;

  // ── Derived stats ──────────────────────────────────────────────
  const total    = analytics.total    || patients.length;
  const highRisk = analytics.highRisk || patients.filter(p => (p.predictedRisk ?? p.predicted_risk) === 1).length;
  const lowRisk  = analytics.lowRisk  || patients.filter(p => (p.predictedRisk ?? p.predicted_risk) === 0).length;
  const riskRate = total > 0 ? Math.round((highRisk / total) * 100) : 0;

  // ✅ FIX: todayAppointments now correctly inside component scope
  const todayAppts    = appointments.filter(a => a.appointmentDate === TODAY);
  const scheduledAppts = appointments.filter(a => a.status === "scheduled");
  const urgentAppts   = appointments.filter(a => a.urgency === "urgent" && a.status === "scheduled");
  const upcomingAppts = [...scheduledAppts]
    .filter(a => a.appointmentDate >= TODAY)
    .sort((a, b) => a.appointmentDate > b.appointmentDate ? 1 : -1)
    .slice(0, 5);

  const pieData = [
    { name: "High Risk", value: highRisk },
    { name: "Low Risk",  value: lowRisk  },
  ];

  const apptStatusData = ["scheduled", "completed", "cancelled", "no-show"].map(s => ({
    name: s.charAt(0).toUpperCase() + s.slice(1),
    value: appointments.filter(a => a.status === s).length,
  })).filter(d => d.value > 0);

  const diseaseMap = patients.reduce((acc, p) => {
    const d = p.disease || p.aiDisease || "Unknown";
    acc[d] = (acc[d] || 0) + 1; return acc;
  }, {});
  const diseaseData = Object.entries(diseaseMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value).slice(0, 6);

  const ageBuckets = { "0-18": 0, "19-35": 0, "36-50": 0, "51-65": 0, "65+": 0 };
  patients.forEach(p => {
    const age = p.age || 0;
    if      (age <= 18) ageBuckets["0-18"]++;
    else if (age <= 35) ageBuckets["19-35"]++;
    else if (age <= 50) ageBuckets["36-50"]++;
    else if (age <= 65) ageBuckets["51-65"]++;
    else                ageBuckets["65+"]++;
  });
  const ageData = Object.entries(ageBuckets).map(([name, value]) => ({ name, value }));

  const symptomData = [
    { name: "Fever",          value: patients.filter(p => p.fever           === true).length },
    { name: "Cough",          value: patients.filter(p => p.cough           === true).length },
    { name: "Fatigue",        value: patients.filter(p => p.fatigue         === true).length },
    { name: "Breathlessness", value: patients.filter(p => p.breathShortness === true).length },
  ];

  const doctorWorkload = doctors.map(d => ({
    ...d,
    assigned: patients.filter(p => p.doctor?.id === d.id || p.doctorId === d.id).length,
    appts:    appointments.filter(a => a.doctorId === d.id || a.doctorName === d.name).length,
  }));

  const recentPatients = [...patients].reverse().slice(0, 5);
  const topSymptom     = [...symptomData].sort((a, b) => b.value - a.value)[0]?.name || "—";
  const topDisease     = diseaseData[0]?.name || "—";

  // ── RENDER ────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg,
      fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <Sidebar />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Header user={user} />

        <main style={{ flex: 1, padding: "24px 28px", boxSizing: "border-box",
          maxWidth: 1440, width: "100%", margin: "0 auto" }}>

          {/* Page title */}
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0, letterSpacing: "-.02em" }}>
              Clinical Dashboard
            </h1>
            <p style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>
              AI-Integrated Healthcare · Predictive Diagnosis & Decision Support
            </p>
          </div>

          {/* ── Row 0: 6 stat cards ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: 18 }}>
            <StatCard title="Total Patients"    value={total}                   icon="🫀" color={C.blue}   bg={C.blueL}   sub="Registered"            />
            <StatCard title="High Risk"          value={highRisk}                icon="⚠️" color={C.red}    bg={C.redL}    sub={`${riskRate}% of total`} />
            <StatCard title="Low Risk"           value={lowRisk}                 icon="✅" color={C.green}  bg={C.greenL}  sub="Stable patients"        />
            <StatCard title="Appointments"       value={appointments.length}     icon="📅" color={C.teal}   bg={C.tealL}   sub="Total bookings"         />
            <StatCard title="Today"              value={todayAppts.length}       icon="⏰" color={C.amber}  bg={C.amberL}  sub="Today's schedule"       />
            <StatCard title="Urgent"             value={urgentAppts.length}      icon="🚨" color={C.red}    bg={C.redL}    sub="Need attention"         />
          </div>

          {/* ── Row 1: Risk | Appt status | Age distribution ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.5fr", gap: 14, marginBottom: 14 }}>

            <ChartCard title="Risk Distribution">
              {highRisk === 0 && lowRisk === 0 ? <Empty message="No risk data yet" /> : (
                <>
                  <ResponsiveContainer width="100%" height={170}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" cx="50%" cy="50%"
                        innerRadius={45} outerRadius={68} paddingAngle={3}>
                        {pieData.map((_, i) => <Cell key={i} fill={RISK_COLORS[i]} />)}
                      </Pie>
                      <Tooltip content={<Tip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 4 }}>
                    {pieData.map((d, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.muted }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: RISK_COLORS[i] }} />
                        {d.name} ({d.value})
                      </div>
                    ))}
                  </div>
                </>
              )}
            </ChartCard>

            <ChartCard title="Appointment Status">
              {apptStatusData.length === 0 ? <Empty message="No appointments yet" /> : (
                <>
                  <ResponsiveContainer width="100%" height={170}>
                    <PieChart>
                      <Pie data={apptStatusData} dataKey="value" cx="50%" cy="50%"
                        outerRadius={68} paddingAngle={3}
                        label={({ value }) => value} labelLine={false}>
                        {apptStatusData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                      </Pie>
                      <Tooltip content={<Tip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 4 }}>
                    {apptStatusData.map((d, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: C.muted }}>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: CHART_COLORS[i] }} />
                        {d.name}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </ChartCard>

            <ChartCard title="Patient Age Distribution">
              {patients.length === 0 ? <Empty message="No patient data yet" /> : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={ageData} barSize={26}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EEF2FF" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.subtle }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: C.subtle }} axisLine={false} tickLine={false} />
                    <Tooltip content={<Tip />} />
                    <Bar dataKey="value" name="Patients" fill={C.blue} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          {/* ── Row 2: Disease | Symptom ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>

            <ChartCard title="Disease Distribution">
              {diseaseData.length === 0 ? <Empty message="No disease data yet" /> : (
                <ResponsiveContainer width="100%" height={195}>
                  <PieChart>
                    <Pie data={diseaseData} dataKey="value" cx="50%" cy="50%"
                      outerRadius={72} paddingAngle={2}
                      label={({ name, value }) => `${name} (${value})`} labelLine>
                      {diseaseData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<Tip />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Symptom Prevalence">
              {patients.length === 0 ? <Empty message="No symptom data yet" /> : (
                <ResponsiveContainer width="100%" height={195}>
                  <BarChart data={symptomData} layout="vertical" barSize={16}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EEF2FF" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: C.subtle }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: C.muted }} axisLine={false} tickLine={false} width={100} />
                    <Tooltip content={<Tip />} />
                    <Bar dataKey="value" name="Patients" fill={C.teal} radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          {/* ── Row 3: Upcoming appointments | Recent patients ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 14, marginBottom: 14 }}>

            <ChartCard title="Upcoming Appointments" badge={`${scheduledAppts.length} scheduled`}>
              {upcomingAppts.length === 0 ? <Empty message="No upcoming appointments" /> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {upcomingAppts.map((a, i) => {
                    const isToday = a.appointmentDate === TODAY;
                    return (
                      <div key={a.id || i} style={{ display: "flex", alignItems: "center", gap: 11,
                        padding: "9px 11px", borderRadius: 10,
                        background: isToday ? C.amberL : C.bg,
                        border: `1px solid ${isToday ? C.amber + "50" : C.border}` }}>
                        <div style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                          background: isToday ? C.amber + "20" : C.blueL,
                          color: isToday ? C.amber : C.blue,
                          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>
                          {isToday ? "⏰" : "📅"}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: C.text,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {a.patientName || "Unknown"}
                          </div>
                          <div style={{ fontSize: 11, color: C.muted }}>
                            Dr. {a.doctorName || "TBD"} · {a.specialization || "General"}
                          </div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{fmtDate(a.appointmentDate)}</div>
                          <div style={{ fontSize: 10, color: C.muted }}>{fmtTime(a.appointmentTime)}</div>
                        </div>
                        {a.urgency === "urgent" && (
                          <span style={{ background: C.redL, color: C.red,
                            fontSize: 8, fontWeight: 800, padding: "2px 6px", borderRadius: 999 }}>URGENT</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ChartCard>

            <ChartCard title="Recent Patients" badge={`${patients.length} total`}>
              {recentPatients.length === 0 ? <Empty message="No patients added yet" /> : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                      {["Patient", "Age", "Disease", "Risk", "Symptoms"].map(h => (
                        <th key={h} style={{ padding: "5px 8px", textAlign: "left", color: C.subtle,
                          fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentPatients.map((p, i) => (
                      <tr key={p.id} style={{ borderBottom: `1px solid ${C.border}`,
                        background: i % 2 === 0 ? C.surface : C.bg }}>
                        <td style={{ padding: "8px 8px", fontWeight: 600, color: C.text }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                            <div style={{ width: 26, height: 26, borderRadius: "50%",
                              background: (p.predictedRisk ?? p.predicted_risk) === 1 ? C.redL : C.blueL,
                              color: (p.predictedRisk ?? p.predicted_risk) === 1 ? C.red : C.blue,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 10, fontWeight: 800, flexShrink: 0 }}>
                              {(p.name || "?")[0].toUpperCase()}
                            </div>
                            {p.name || "—"}
                          </div>
                        </td>
                        <td style={{ padding: "8px 8px", color: C.muted }}>{p.age || "—"}</td>
                        <td style={{ padding: "8px 8px", color: C.muted }}>{p.disease || p.aiDisease || "—"}</td>
                        <td style={{ padding: "8px 8px" }}>
                          <RiskBadge risk={p.predictedRisk ?? p.predicted_risk} />
                        </td>
                        <td style={{ padding: "8px 8px" }}>
                          <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                            {p.fever           && <SymTag label="Fever"   color={C.red}    bg={C.redL}    />}
                            {p.cough           && <SymTag label="Cough"   color={C.amber}  bg={C.amberL}  />}
                            {p.fatigue         && <SymTag label="Fatigue" color={C.purple} bg={C.purpleL} />}
                            {p.breathShortness && <SymTag label="Breath"  color={C.blue}   bg={C.blueL}   />}
                            {!p.fever && !p.cough && !p.fatigue && !p.breathShortness &&
                              <span style={{ color: C.subtle, fontSize: 10 }}>—</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </ChartCard>
          </div>

          {/* ── Row 4: Doctor workload + AI insights ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 14 }}>

            <ChartCard title="Doctor Workload">
              {doctorWorkload.length === 0 ? <Empty message="No doctors registered" /> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {doctorWorkload.map((d, i) => {
                    const pct = total > 0 ? Math.round((d.assigned / total) * 100) : 0;
                    const col = CHART_COLORS[i % CHART_COLORS.length];
                    return (
                      <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                          background: col + "20", color: col,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontWeight: 800, fontSize: 14 }}>
                          {(d.name || "?")[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                            <span style={{ fontWeight: 600, fontSize: 13, color: C.text,
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              Dr. {d.name}
                            </span>
                            <span style={{ fontSize: 11, color: C.muted, flexShrink: 0, marginLeft: 8 }}>
                              {d.assigned} pts · {d.appts} appts
                            </span>
                          </div>
                          <div style={{ height: 5, borderRadius: 99, background: C.border }}>
                            <div style={{ height: "100%", borderRadius: 99,
                              width: `${Math.min(pct, 100)}%`, background: col, transition: "width .4s" }} />
                          </div>
                          <div style={{ fontSize: 10, color: C.subtle, marginTop: 2 }}>
                            {d.specialization || "General Physician"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ChartCard>

            <ChartCard title="🤖 AI Insights">
              <div style={{ display: "flex", flexDirection: "column" }}>
                <InsightRow label="High risk rate"      value={`${riskRate}%`}          color={riskRate > 40 ? C.red : C.green} />
                <InsightRow label="Total patients"      value={total}                    color={C.blue}   />
                <InsightRow label="Most common disease" value={topDisease}               color={C.purple} />
                <InsightRow label="Top symptom"         value={topSymptom}               color={C.teal}   />
                <InsightRow label="Doctors on staff"    value={doctors.length}           color={C.indigo} />
                <InsightRow label="Total appointments"  value={appointments.length}      color={C.amber}  />
                <InsightRow label="Today's bookings"    value={todayAppts.length}        color={C.amber}  />
                <InsightRow label="Urgent cases"        value={urgentAppts.length}       color={C.red}    />
              </div>

              {/* Today's mini schedule */}
              {todayAppts.length > 0 && (
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 10,
                    textTransform: "uppercase", letterSpacing: ".06em" }}>
                    Today's Schedule
                  </div>
                  {todayAppts.slice(0, 3).map((a, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between",
                      alignItems: "center", padding: "6px 0",
                      borderBottom: i < Math.min(todayAppts.length - 1, 2) ? `1px solid ${C.border}` : "none" }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{a.patientName || "—"}</div>
                        <div style={{ fontSize: 10, color: C.muted }}>{a.specialization || "General"}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{fmtTime(a.appointmentTime)}</div>
                        <ApptStatus status={a.status} />
                      </div>
                    </div>
                  ))}
                  {todayAppts.length > 3 && (
                    <div style={{ fontSize: 11, color: C.blue, fontWeight: 600, marginTop: 8 }}>
                      +{todayAppts.length - 3} more today
                    </div>
                  )}
                </div>
              )}
            </ChartCard>
          </div>

        </main>
      </div>
    </div>
  );
}