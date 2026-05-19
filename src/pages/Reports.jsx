// src/pages/Reports.jsx
// ✅ FULLY MERGED: All additions from ReportsAdditions.jsx integrated

import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { useEffect, useState, useContext, useCallback } from "react";
import React from "react";
import { AuthContext } from "../context/AuthContext";
import { getAllPatients } from "../api/patientApi";
import { getDoctors } from "../api/doctorApi";
import { getAllAppointments } from "../api/appointApi";
import {
  getPatientReport, getDoctorReport, getTrendReport,
  getApptAnalytics, getCohortAnalysis, checkOutbreak,
  checkAiHealth, getDailyBrief, getVitalsTrend,
  checkDrugInteractions, getPredictionAudit,
} from "../api/reportApi";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { createReportReadyNotification, createHighRiskAlert } from "../api/notificationApi";
import { supabase } from "../supabaseClient";

// ─── Design tokens ─────────────────────────────────────────────
const C = {
  bg: "#F0F4FF", surface: "#FFFFFF", border: "#DDE3F0",
  text: "#0B1437", muted: "#5A6A8A", subtle: "#8899BB",
  blue: "#2563EB", blueL: "#EFF6FF",
  indigo: "#4338CA", indigoL: "#EEF2FF",
  teal: "#0D9488", tealL: "#F0FDFA",
  green: "#059669", greenL: "#F0FDF4",
  amber: "#D97706", amberL: "#FFFBEB",
  red: "#DC2626", redL: "#FEF2F2",
  purple: "#7C3AED", purpleL: "#F5F3FF",
  rose: "#E11D48", roseL: "#FFF1F2",
};
const CHART_COLORS = [C.blue, C.teal, C.purple, C.amber, C.red, C.green];
const TODAY = new Date().toISOString().split("T")[0];

// ─── Shared UI ─────────────────────────────────────────────────
function Spin({ size = 22, color = C.blue }) {
  return (
    <>
      <style>{`@keyframes _rsp{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, border: `2.5px solid ${color}30`, borderTopColor: color, animation: "_rsp .7s linear infinite", display: "inline-block" }} />
    </>
  );
}
function Badge({ label, color, bg }) {
  return <span style={{ background: bg, color, fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 999, whiteSpace: "nowrap" }}>{label}</span>;
}
function Card({ children, style = {} }) {
  return <div style={{ background: C.surface, borderRadius: 16, padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,.05),0 4px 20px rgba(0,0,0,.04)", ...style }}>{children}</div>;
}
function CardTitle({ children, action }) {
  return <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h3 style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>{children}</h3>{action}</div>;
}
function StatPill({ label, value, color, bg }) {
  return <div style={{ background: bg, borderRadius: 12, padding: "10px 18px", display: "flex", alignItems: "center", gap: 10, fontWeight: 700 }}><span style={{ fontSize: 26, fontWeight: 800, color }}>{value}</span><span style={{ fontSize: 12, color, opacity: .75 }}>{label}</span></div>;
}
const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return <div style={{ background: C.text, color: "#F1F5F9", borderRadius: 10, padding: "8px 13px", fontSize: 12, boxShadow: "0 8px 24px rgba(0,0,0,.2)" }}>{label && <div style={{ fontWeight: 700, marginBottom: 2 }}>{label}</div>}{payload.map((p, i) => <div key={i} style={{ color: p.color || "#94A3B8" }}>{p.name}: <strong>{p.value}</strong></div>)}</div>;
};
function Empty({ msg = "No data yet" }) {
  return <div style={{ height: 140, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: C.subtle, gap: 8 }}><div style={{ fontSize: 30 }}>📭</div><div style={{ fontSize: 12 }}>{msg}</div></div>;
}
function DownloadBtn({ onClick, loading }) {
  return <button onClick={onClick} disabled={loading} style={{ background: C.indigo, color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6, opacity: loading ? .6 : 1 }}>{loading ? <Spin size={12} color="#fff" /> : "⬇"} PDF</button>;
}

// ─── ✅ Tab component — key must NOT be in spread props ─────────
function Tab({ label, icon, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: active ? C.blue : "transparent",
      color: active ? "#fff" : C.muted,
      border: `1.5px solid ${active ? C.blue : C.border}`,
      borderRadius: 9, padding: "8px 16px", fontSize: 12, fontWeight: 700,
      cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
      transition: "all .15s",
    }}>
      <span style={{ fontSize: 14 }}>{icon}</span>{label}
    </button>
  );
}

// ─── PDF export ─────────────────────────────────────────────────
async function downloadPDF(data, title) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF();
  const W = doc.internal.pageSize.width;
  doc.setFillColor(11, 20, 55); doc.rect(0, 0, W, 22, "F");
  doc.setTextColor(255, 255, 255); doc.setFontSize(12); doc.setFont(undefined, "bold");
  doc.text("MedVision AI — " + title, 14, 14);
  doc.setFontSize(8); doc.setFont(undefined, "normal");
  doc.text(new Date().toLocaleDateString("en-IN"), W - 14, 14, { align: "right" });
  doc.setTextColor(0, 0, 0);
  let y = 30;
  const addSection = (heading, rows) => {
    doc.setFontSize(11); doc.setFont(undefined, "bold"); doc.setTextColor(37, 99, 235);
    doc.text(heading, 14, y); y += 6; doc.setTextColor(0, 0, 0);
    autoTable(doc, { startY: y, head: [["Field", "Value"]], body: rows, theme: "grid", headStyles: { fillColor: [11, 20, 55], textColor: 255, fontSize: 9 }, bodyStyles: { fontSize: 9 }, alternateRowStyles: { fillColor: [240, 244, 255] } });
    y = doc.lastAutoTable.finalY + 10;
  };
  if (data.patient) addSection("Patient Information", [["Name", data.patient.name || "—"], ["Age", data.patient.age || "—"], ["Disease", data.patient.disease || "—"], ["Risk Level", data.riskLabel || (data.riskLevel === 1 ? "High Risk" : "Low Risk")], ["Risk Score", `${data.riskScore ?? data.risk_score ?? "—"} / 8`], ["Specialist Recommended", data.specialist || data.recommendedSpecialist || "—"]]);
  if (data.clinicalSummary || data.summary) { doc.setFontSize(10); doc.setFont(undefined, "bold"); doc.text("AI Clinical Summary", 14, y); y += 5; doc.setFont(undefined, "normal"); doc.setFontSize(9); const lines = doc.splitTextToSize(data.clinicalSummary || data.summary, W - 28); doc.text(lines, 14, y); y += lines.length * 5 + 8; }
  if (data.factorBreakdown) addSection("Risk Factor Breakdown", Object.entries(data.factorBreakdown).map(([k, v]) => [k, `+${v} pts`]));
  if (data.appointments?.length) addSection("Appointment History", data.appointments.map(a => [a.appointmentDate || "—", a.doctorName || "—", a.status || "—", a.reason || "—"]));
  if (data.doctorNotes) addSection("Doctor's Notes", [["Notes", data.doctorNotes]]);
  if (data.doctorVerifiedAt) addSection("Verification", [["Verified by", data.doctorName || "Doctor"], ["Verified at", data.doctorVerifiedAt], ["Status", "Doctor Verified ✓"]]);
  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) { doc.setPage(i); doc.setFontSize(7); doc.setTextColor(100, 100, 100); doc.text(`Jamia Hamdard · MedVision AI · Page ${i} of ${pages}`, 14, doc.internal.pageSize.height - 8); }
  doc.save(`medvision_${title.replace(/\s+/g, "_").toLowerCase()}_${TODAY}.pdf`);
}

// ─── Notification Bell Panel ────────────────────────────────────
function NotificationPanel({ open, onClose, notifications, onMarkRead, onClearAll }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200 }} onClick={onClose}>
      <div style={{
        position: "absolute", top: 60, right: 24, width: 360,
        background: C.surface, borderRadius: 16, boxShadow: "0 8px 40px rgba(0,0,0,.15)",
        border: `1px solid ${C.border}`, overflow: "hidden",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 800, fontSize: 14, color: C.text }}>🔔 Notifications</span>
          <div style={{ display: "flex", gap: 8 }}>
            {notifications.length > 0 && <button onClick={onClearAll} style={{ fontSize: 11, color: C.muted, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Clear all</button>}
            <button onClick={onClose} style={{ fontSize: 18, color: C.muted, background: "none", border: "none", cursor: "pointer", lineHeight: 1 }}>×</button>
          </div>
        </div>
        <div style={{ maxHeight: 400, overflowY: "auto" }}>
          {notifications.length === 0 ? (
            <div style={{ padding: "32px 18px", textAlign: "center", color: C.subtle, fontSize: 13 }}>No notifications yet</div>
          ) : notifications.map((n, i) => (
            <div key={n.id || i} onClick={() => onMarkRead(i)} style={{
              padding: "12px 18px", borderBottom: `1px solid ${C.border}`,
              background: n.read ? C.surface : n.type === "high_risk" ? C.redL : C.blueL,
              cursor: "pointer", transition: "background .15s",
            }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>
                  {n.type === "high_risk" ? "🚨" : n.type === "report_ready" ? "📄" : n.type === "verified" ? "✅" : "🔔"}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{n.title}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>{n.message}</div>
                  <div style={{ fontSize: 10, color: C.subtle, marginTop: 4 }}>{n.time}</div>
                </div>
                {!n.read && <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.blue, flexShrink: 0, marginTop: 4 }} />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Doctor Verify Modal ────────────────────────────────────────
function DoctorVerifyModal({ report, patient, doctors, onClose, onVerified }) {
  const [notes, setNotes] = useState(report.doctorNotes || "");
  const [editedSummary, setEditedSummary] = useState(report.clinicalSummary || report.summary || "");
  const [editedRisk, setEditedRisk] = useState(report.riskLabel || (report.riskLevel === 1 ? "High Risk" : "Low Risk"));
  const [selDoctor, setSelDoctor] = useState(report.verifyingDoctorId || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleVerify = async () => {
    setSaving(true);
    const verifiedReport = {
      ...report,
      doctorNotes: notes,
      clinicalSummary: editedSummary,
      riskLabel: editedRisk,
      doctorVerifiedAt: new Date().toLocaleString(),
      verifyingDoctorId: selDoctor,
      doctorName: doctors.find(d => String(d.id) === selDoctor)?.name || "Doctor",
      doctorVerified: true,
    };

    if (patient?.id) {
      try {
        await supabase.from("reports").upsert({
          patient_id: patient.id,
          title: "AI Risk Report",
          report_type: "AI Risk Assessment",
          summary: editedSummary,
          findings: JSON.stringify(report.factorBreakdown || {}),
          recommendations: notes,
          ai_verified: true,
          doctor_name: verifiedReport.doctorName,
          created_at: new Date().toISOString(),
        });
      } catch (e) { console.warn("Supabase save failed:", e); }
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => { onVerified(verifiedReport); onClose(); }, 1000);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(11,20,55,.5)", backdropFilter: "blur(4px)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={onClose}>
      <div style={{ background: C.surface, borderRadius: 20, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.2)" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>🩺 Doctor Verification</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Review, edit and verify AI report for {patient?.name}</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", border: `1px solid ${C.border}`, background: C.bg, cursor: "pointer", fontSize: 16, color: C.muted }}>×</button>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={formLbl}>Verifying Doctor</label>
            <select value={selDoctor} onChange={e => setSelDoctor(e.target.value)} style={formInp}>
              <option value="">Select doctor…</option>
              {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.name} — {d.specialization}</option>)}
            </select>
          </div>

          <div>
            <label style={formLbl}>Risk Assessment</label>
            <select value={editedRisk} onChange={e => setEditedRisk(e.target.value)} style={formInp}>
              <option value="High Risk">High Risk</option>
              <option value="Medium Risk">Medium Risk</option>
              <option value="Low Risk">Low Risk</option>
            </select>
          </div>

          <div>
            <label style={formLbl}>Clinical Summary (AI generated — editable)</label>
            <textarea
              value={editedSummary}
              onChange={e => setEditedSummary(e.target.value)}
              rows={4}
              style={{ ...formInp, resize: "vertical", lineHeight: 1.6 }}
              placeholder="AI clinical summary…"
            />
          </div>

          <div>
            <label style={formLbl}>Doctor's Notes & Recommendations</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={4}
              style={{ ...formInp, resize: "vertical", lineHeight: 1.6 }}
              placeholder="Add your clinical notes, recommendations, follow-up instructions…"
            />
          </div>

          <div style={{ background: C.blueL, borderRadius: 10, padding: "10px 14px", fontSize: 12, color: C.blue, border: `1px solid ${C.blue}20` }}>
            ℹ️ Once verified, this report will be visible to the patient in their My Reports section and can be exported as a PDF.
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.surface, color: C.muted, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
            <button onClick={handleVerify} disabled={saving || saved || !selDoctor} style={{ flex: 2, padding: "11px 0", borderRadius: 10, border: "none", background: saved ? C.green : saving ? C.tealL : C.teal, color: saved || saving ? C.surface : "#fff", fontSize: 13, fontWeight: 700, cursor: saving || !selDoctor ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {saved ? "✓ Verified & Sent to Patient!" : saving ? <><Spin size={14} color={C.teal} /> Verifying…</> : "✅ Verify & Send to Patient"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const formLbl = { fontSize: 11, fontWeight: 700, color: C.muted, display: "block", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 };
const formInp = { width: "100%", boxSizing: "border-box", padding: "10px 13px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.text, background: C.bg, fontFamily: "inherit", outline: "none" };

// ─── ADDITION 5: PredictiveDiagnosisCard ───────────────────────
function PredictiveDiagnosisCard({ diagnosisList, riskPathway, followUpDays, urgencyFlag, triageScore }) {
  if (!diagnosisList?.length && !riskPathway) return null;

  const triageColor = triageScore >= 80 ? C.red : triageScore >= 50 ? C.amber : C.green;
  const triageBg    = triageScore >= 80 ? C.redL : triageScore >= 50 ? C.amberL : C.greenL;
  const triageLabel = triageScore >= 80 ? "Critical" : triageScore >= 50 ? "Urgent" : "Routine";

  return (
    <Card>
      <CardTitle action={
        triageScore != null
          ? <Badge label={`Triage: ${triageLabel} (${triageScore}/100)`} color={triageColor} bg={triageBg} />
          : null
      }>
        🧠 Predictive Diagnosis — Differential List
      </CardTitle>

      {diagnosisList.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          {diagnosisList.map((dx, i) => {
            const pct   = Math.round((dx.probability || dx.confidence || 0) * 100);
            const color = pct >= 80 ? C.red : pct >= 60 ? C.amber : C.blue;
            return (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{dx.condition || dx.diagnosis}</span>
                    {dx.icd10 && (
                      <span style={{ fontSize: 10, color: C.subtle, marginLeft: 8, fontFamily: "monospace" }}>
                        ICD-10: {dx.icd10}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 800, color }}>{pct}%</span>
                </div>
                <div style={{ height: 8, borderRadius: 99, background: C.border }}>
                  <div style={{
                    height: "100%", borderRadius: 99,
                    width: `${pct}%`, background: color,
                    transition: "width .6s ease",
                  }} />
                </div>
                {dx.reasoning && (
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
                    {dx.reasoning}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {riskPathway && (
        <div style={{
          background: C.purpleL, borderRadius: 10, padding: "10px 14px",
          fontSize: 12, color: C.purple, lineHeight: 1.7,
          border: `1px solid ${C.purple}20`, marginBottom: 12,
        }}>
          <strong>Risk pathway:</strong> {riskPathway}
        </div>
      )}

      {followUpDays != null && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: followUpDays <= 7 ? C.redL : followUpDays <= 14 ? C.amberL : C.greenL,
          borderRadius: 10, padding: "10px 14px",
        }}>
          <span style={{ fontSize: 12, color: C.muted }}>AI recommended follow-up</span>
          <Badge
            label={`Within ${followUpDays} days`}
            color={followUpDays <= 7 ? C.red : followUpDays <= 14 ? C.amber : C.green}
            bg={C.surface}
          />
        </div>
      )}
    </Card>
  );
}

// ─── ADDITION 6: VitalsTrendCard ───────────────────────────────
function VitalsTrendCard({ vitalsTrend }) {
  if (!vitalsTrend) return null;

  const { trend, visitHistory = [], prediction, recommendedAction } = vitalsTrend;
  const trendColor = trend === "deteriorating" ? C.red : trend === "improving" ? C.green : C.amber;
  const trendIcon  = trend === "deteriorating" ? "📉" : trend === "improving" ? "📈" : "➡️";

  return (
    <Card>
      <CardTitle action={
        <Badge
          label={`${trendIcon} ${trend?.charAt(0).toUpperCase() + trend?.slice(1) || "Unknown"}`}
          color={trendColor}
          bg={trend === "deteriorating" ? C.redL : trend === "improving" ? C.greenL : C.amberL}
        />
      }>
        📊 Vitals Trend — Predictive Timeline
      </CardTitle>

      {visitHistory.length > 1 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>Risk score over visits</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 60 }}>
            {visitHistory.map((v, i) => {
              const h   = Math.max(4, ((v.riskScore || 0) / 8) * 60);
              const col = (v.riskScore || 0) >= 4 ? C.red : (v.riskScore || 0) >= 2 ? C.amber : C.green;
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <span style={{ fontSize: 9, color: C.subtle, fontWeight: 700 }}>{v.riskScore ?? "?"}</span>
                  <div style={{ width: "100%", height: h, borderRadius: "3px 3px 0 0", background: col }} />
                  <span style={{ fontSize: 8, color: C.subtle }}>{v.date?.slice(5) || ""}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {prediction && (
        <div style={{
          background: trendColor === C.red ? C.redL : C.blueL,
          borderRadius: 10, padding: "10px 14px",
          fontSize: 12, color: C.text, lineHeight: 1.6,
          border: `1px solid ${trendColor}20`, marginBottom: 10,
        }}>
          🤖 {prediction}
        </div>
      )}

      {recommendedAction && (
        <div style={{ fontSize: 12, color: C.muted, padding: "8px 0" }}>
          📋 <strong style={{ color: C.text }}>Recommended:</strong> {recommendedAction}
        </div>
      )}
    </Card>
  );
}

// ─── ADDITION 7: DrugInteractionCard ───────────────────────────
function DrugInteractionCard({ drugAlerts }) {
  if (!drugAlerts?.length) return null;

  const sevColor = (sev) => sev === "high" ? C.red : sev === "medium" ? C.amber : C.blue;
  const sevBg    = (sev) => sev === "high" ? C.redL : sev === "medium" ? C.amberL : C.blueL;

  return (
    <Card style={{ border: `1.5px solid ${C.red}40` }}>
      <CardTitle action={
        <Badge label={`${drugAlerts.length} interaction${drugAlerts.length > 1 ? "s" : ""}`} color={C.red} bg={C.redL} />
      }>
        💊 Drug Interaction Alerts
      </CardTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {drugAlerts.map((alert, i) => (
          <div key={i} style={{
            background: sevBg(alert.severity),
            borderRadius: 10, padding: "12px 14px",
            border: `1px solid ${sevColor(alert.severity)}30`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                {alert.drug1} + {alert.drug2}
              </span>
              <Badge
                label={alert.severity?.toUpperCase() || "ALERT"}
                color={sevColor(alert.severity)}
                bg={C.surface}
              />
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>{alert.effect}</div>
            {alert.action && (
              <div style={{ fontSize: 11, color: sevColor(alert.severity), fontWeight: 600 }}>
                ⚠ Action: {alert.action}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── ADDITION 8: DailyBriefBanner ──────────────────────────────
function DailyBriefBanner({ dailyBrief, aiOnline }) {
  if (!dailyBrief || !aiOnline) return null;

  return (
    <div style={{
      background: "linear-gradient(135deg, #EFF6FF 0%, #F5F3FF 100%)",
      border: `1.5px solid #4338CA20`,
      borderRadius: 14, padding: "16px 20px", marginBottom: 20,
      display: "flex", gap: 14, alignItems: "flex-start",
    }}>
      <div style={{ fontSize: 28, flexShrink: 0 }}>🤖</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#0B1437", marginBottom: 4 }}>
          AI Daily Brief
        </div>
        <div style={{ fontSize: 13, color: "#5A6A8A", lineHeight: 1.7 }}>
          {dailyBrief.summary || dailyBrief.brief || "Loading AI analysis…"}
        </div>
        {dailyBrief.priorityPatient && (
          <div style={{
            marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6,
            background: C.redL, borderRadius: 8, padding: "4px 12px",
            fontSize: 11, fontWeight: 700, color: C.red,
          }}>
            🚨 Priority: {dailyBrief.priorityPatient}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ADDITION 9: PredictionAuditTab ────────────────────────────
function PredictionAuditTab({ patients, appointments, aiOnline }) {
  const [audit, setAudit] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const runAudit = async () => {
    setLoading(true);
    try {
      const predictions = patients.map(p => ({
        patient_id:     p.id,
        patient_name:   p.name,
        ai_risk:        p.predictedRisk ?? p.predicted_risk ?? 0,
        actual_outcome: appointments
          .filter(a => String(a.patientId) === String(p.id) && a.status === "completed")
          .length > 0 ? "treated" : "pending",
        disease:        p.disease,
        symptoms_count: [p.fever, p.cough, p.fatigue, p.breathShortness].filter(Boolean).length,
      }));
      const result = await getPredictionAudit(predictions);
      setAudit(result);
    } catch (e) {
      console.error("Audit failed:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <CardTitle>AI Prediction Audit Trail</CardTitle>
        <p style={{ fontSize: 13, color: C.muted, marginBottom: 14, lineHeight: 1.6 }}>
          Analyses how accurate MedVision's AI predictions have been vs actual doctor diagnoses.
          Required for ABDM compliance and model improvement.
        </p>
        <button
          onClick={runAudit}
          disabled={loading || !aiOnline}
          style={{
            background: aiOnline ? C.indigo : C.border,
            color: aiOnline ? "#fff" : C.muted,
            border: "none", borderRadius: 9, padding: "10px 20px",
            fontWeight: 700, fontSize: 13, cursor: aiOnline ? "pointer" : "not-allowed",
          }}
        >
          {loading ? "Running audit…" : "🔬 Run Prediction Audit"}
        </button>
      </Card>

      {audit && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Card style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: C.subtle, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Total Predictions</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: C.blue, marginTop: 4 }}>{audit.totalPredictions ?? patients.length}</div>
          </Card>
          <Card style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: C.subtle, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Accuracy</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: (audit.accuracy || 0) >= 80 ? C.green : C.amber, marginTop: 4 }}>
              {audit.accuracy ? `${audit.accuracy.toFixed(1)}%` : "—"}
            </div>
          </Card>
          <Card style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: C.subtle, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Model Drift</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: audit.modelDrift === "stable" ? C.green : C.red, marginTop: 8 }}>
              {audit.modelDrift || "stable"}
            </div>
          </Card>
          {audit.topMissedConditions?.length > 0 && (
            <Card style={{ gridColumn: "1/-1" }}>
              <CardTitle>Top Missed Conditions</CardTitle>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {audit.topMissedConditions.map((c, i) => (
                  <Badge key={i} label={c} color={C.amber} bg={C.amberL} />
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  TABS — updated with Prediction Audit
// ═══════════════════════════════════════════════════════════════
const TABS = [
  { key: "overview", label: "Overview",          icon: "📊" },
  { key: "patient",  label: "Patient Report",    icon: "👤" },
  { key: "doctor",   label: "Doctor Report",     icon: "🩺" },
  { key: "trends",   label: "Disease Trends",    icon: "📈" },
  { key: "alerts",   label: "AI Alerts",         icon: "🚨" },
  { key: "custom",   label: "Custom Analysis",   icon: "🔬" },
  { key: "audit",    label: "Prediction Audit",  icon: "🔬" },
];

// ═══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function Reports() {
  const { user } = useContext(AuthContext);
  const [tab, setTab]                     = useState("overview");
  const [patients, setPatients]           = useState([]);
  const [doctors, setDoctors]             = useState([]);
  const [appointments, setAppointments]   = useState([]);
  const [trends, setTrends]               = useState(null);
  const [apptStats, setApptStats]         = useState(null);
  const [cohort, setCohort]               = useState(null);
  const [outbreak, setOutbreak]           = useState(null);
  const [aiOnline, setAiOnline]           = useState(false);
  const [loading, setLoading]             = useState(true);
  const [pdfLoading, setPdfLoading]       = useState({});
  const [selPatient, setSelPatient]       = useState("");
  const [patRpt, setPatRpt]               = useState(null);
  const [patRptLoading, setPatRptLoading] = useState(false);
  const [selDoctor, setSelDoctor]         = useState("");
  const [docRpt, setDocRpt]               = useState(null);
  const [docRptLoading, setDocRptLoading] = useState(false);
  const [riskFilter, setRiskFilter]       = useState("all");
  const [ageMin, setAgeMin]               = useState(0);
  const [ageMax, setAgeMax]               = useState(120);

  // ── Notification state ──────────────────────────────────────
  const [notifOpen, setNotifOpen]   = useState(false);
  const [notifications, setNotifs]  = useState([]);

  // ── Doctor verify modal ─────────────────────────────────────
  const [verifyOpen, setVerifyOpen]           = useState(false);
  const [verifiedReport, setVerifiedReport]   = useState(null);

  // ── ADDITION 2: New state variables ────────────────────────
  const [dailyBrief,    setDailyBrief]    = useState(null);
  const [vitalsTrend,   setVitalsTrend]   = useState(null);
  const [drugAlerts,    setDrugAlerts]    = useState(null);
  const [predAudit,     setPredAudit]     = useState(null);
  const [diagnosisList, setDiagnosisList] = useState([]);
  const [briefLoading,  setBriefLoading]  = useState(false);

  const addNotif = useCallback((notif) => {
    setNotifs(prev => [{ ...notif, id: Date.now(), time: new Date().toLocaleTimeString(), read: false }, ...prev]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [p, d, a, tr, as_, ai] = await Promise.all([
        getAllPatients(), getDoctors(), getAllAppointments(),
        getTrendReport(), getApptAnalytics(), checkAiHealth(),
      ]);
      setPatients(Array.isArray(p) ? p : []);
      setDoctors(Array.isArray(d) ? d : []);
      setAppointments(Array.isArray(a) ? a : []);
      setTrends(tr); setApptStats(as_); setAiOnline(ai);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!patients.length || !aiOnline) return;
    getCohortAnalysis(patients, { risk_filter: riskFilter, age_min: ageMin, age_max: ageMax }).then(setCohort).catch(() => {});
    checkOutbreak(patients).then(setOutbreak).catch(() => {});
  }, [patients, aiOnline, riskFilter, ageMin, ageMax]);

  // ── ADDITION 3: Fetch daily brief when data loads ───────────
  useEffect(() => {
    if (!patients.length || !aiOnline) return;
    const highRisk   = patients.filter(p => (p.predictedRisk ?? p.predicted_risk) === 1);
    const todayAppts = appointments.filter(a => a.appointmentDate === TODAY);
    getDailyBrief("Admin", todayAppts, highRisk, [])
      .then(setDailyBrief)
      .catch(() => {});
  }, [patients, appointments, aiOnline]);

  // ── Load notifications from Supabase ───────────────────────
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (data?.length) {
        setNotifs(data.map(n => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          time: new Date(n.created_at).toLocaleTimeString(),
          read: n.read || false,
        })));
      }
    };
    load();
  }, []);

  // ── ADDITION 4: Enhanced patient report handler ─────────────
  const handlePatientReport = async () => {
    if (!selPatient) return;
    setPatRptLoading(true);
    setVerifiedReport(null);
    setDiagnosisList([]);
    setVitalsTrend(null);
    setDrugAlerts(null);

    try {
      const patient  = patients.find(p => String(p.id) === selPatient);
      const patAppts = appointments.filter(a => String(a.patientId) === selPatient);
      const baseData = await getPatientReport(selPatient);
      let finalData  = baseData;

      if (aiOnline && patient) {
        // Run all AI analyses in parallel
        const [aiReport, trend, drugs] = await Promise.allSettled([
          (async () => {
            const { getAiPatientReport } = await import("../api/reportApi");
            return getAiPatientReport(patient, patAppts);
          })(),
          getVitalsTrend(patient.id, patAppts.map(a => ({
            date: a.appointmentDate, status: a.status, reason: a.reason,
          }))),
          checkDrugInteractions(
            (patient.medications || patient.current_meds || "")
              .split(",").map(m => m.trim()).filter(Boolean),
            patient.id
          ),
        ]);

        if (aiReport.status === "fulfilled") {
          const ai = aiReport.value;
          finalData = { ...baseData, ...ai };
          if (ai.differentialDiagnosis?.length) {
            setDiagnosisList(ai.differentialDiagnosis);
          }
        }

        if (trend.status === "fulfilled") {
          setVitalsTrend(trend.value);
        }

        if (drugs.status === "fulfilled" && drugs.value?.hasInteractions) {
          setDrugAlerts(drugs.value.alerts || []);
        }
      }

      setPatRpt(finalData);

      // Notifications
      try {
        const riskScore = finalData.riskScore ?? finalData.risk_score ?? 0;
        const riskLevel = finalData.riskLevel ?? finalData.risk_level ?? 0;
        let docRow = null;

        if (patient?.doctor_id) {
          const { data: found } = await supabase
            .from("doctors").select("id,name").eq("id", patient.doctor_id).maybeSingle();
          docRow = found;
        }

        if (!docRow && doctors.length > 0) {
          docRow = { id: doctors[0].id, name: doctors[0].name };
        }

        if (docRow) {
          await createReportReadyNotification({
            doctorId: docRow.id, doctorName: docRow.name,
            patientId: patient?.id, patientName: patient?.name,
            riskLevel, riskScore,
          });
          if (riskScore >= 4) {
            await createHighRiskAlert({
              doctorId: docRow.id, doctorName: docRow.name,
              patientId: patient?.id, patientName: patient?.name, riskScore,
            });
            addNotif({ type: "high_risk", title: "🚨 High Risk Alert", message: `${patient?.name} scored ${riskScore}/8 — Dr. ${docRow.name} notified immediately.` });
          } else {
            addNotif({ type: "report_ready", title: "📄 Report Ready for Review", message: `AI report for ${patient?.name} sent to Dr. ${docRow.name} for verification.` });
          }
        } else {
          addNotif({ type: "report_ready", title: "📄 Report Generated", message: `Report for ${patient?.name} ready. No doctor available to notify — add one in the Doctors section.` });
        }
      } catch (notifErr) {
        console.warn("Notification send failed (non-critical):", notifErr);
      }

    } catch (err) { console.error(err); }
    finally { setPatRptLoading(false); }
  };

  const handleDoctorReport = async () => {
    if (!selDoctor) return;
    setDocRptLoading(true);
    try { setDocRpt(await getDoctorReport(selDoctor)); }
    catch (err) { console.error(err); }
    finally { setDocRptLoading(false); }
  };

  const handlePdfDownload = async (key, data, title) => {
    setPdfLoading(l => ({ ...l, [key]: true }));
    try { await downloadPDF(data, title); }
    finally { setPdfLoading(l => ({ ...l, [key]: false })); }
  };

  const handleVerified = (vReport) => {
    setVerifiedReport(vReport);
    setPatRpt(vReport);
    const patient = patients.find(p => String(p.id) === selPatient);
    addNotif({ type: "verified", title: "Report Verified", message: `Dr. ${vReport.doctorName} verified the report for ${patient?.name}. Now visible in patient portal.` });
  };

  // ── Derived data ────────────────────────────────────────────
  const highCount     = patients.filter(p => (p.predictedRisk ?? p.predicted_risk) === 1).length;
  const lowCount      = patients.length - highCount;
  const riskRate      = patients.length > 0 ? Math.round((highCount / patients.length) * 100) : 0;
  const todayAppts    = appointments.filter(a => a.appointmentDate === TODAY);
  const urgentAppts   = appointments.filter(a => a.urgency === "urgent" && a.status === "scheduled");
  const pieData       = [{ name: "High Risk", value: highCount }, { name: "Low Risk", value: lowCount }];
  const apptPieData   = apptStats ? [{ name: "Scheduled", value: Number(apptStats.scheduled || 0) }, { name: "Completed", value: Number(apptStats.completed || 0) }, { name: "Cancelled", value: Number(apptStats.cancelled || 0) }, { name: "No Show", value: Number(apptStats.noShow || 0) }].filter(d => d.value > 0) : [];
  const diseaseData   = trends?.diseaseBreakdown ? Object.entries(trends.diseaseBreakdown).map(([name, value]) => ({ name, value: Number(value) })).sort((a, b) => b.value - a.value).slice(0, 6) : [];
  const symptomData   = trends?.symptomCounts ? Object.entries(trends.symptomCounts).map(([name, value]) => ({ name, value: Number(value) })) : [];
  const ageData       = trends?.ageBuckets ? Object.entries(trends.ageBuckets).map(([name, value]) => ({ name, value: Number(value) })) : [];
  const currentPatient = patients.find(p => String(p.id) === selPatient);

  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", background: C.bg }}>
        <Sidebar />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexDirection: "column" }}>
          <Spin size={36} /><span style={{ color: C.muted, fontSize: 14 }}>Loading reports…</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans',system-ui,sans-serif" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Header user={user} />
        <main style={{ flex: 1, padding: "24px 28px", maxWidth: 1440, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>

          {/* Page header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0, letterSpacing: "-.02em" }}>Reports & Intelligence</h1>
              <p style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>AI-powered analytics · clinical decision support · exportable reports</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 12, background: aiOnline ? C.greenL : C.redL, color: aiOnline ? C.green : C.red, padding: "5px 12px", borderRadius: 99, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: aiOnline ? C.green : C.red }} />
                Python AI {aiOnline ? "Online" : "Offline"}
              </div>

              {/* Notification Bell */}
              <button onClick={() => setNotifOpen(o => !o)} style={{ position: "relative", width: 38, height: 38, borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
                🔔
                {unreadCount > 0 && (
                  <div style={{ position: "absolute", top: 4, right: 4, width: 16, height: 16, borderRadius: "50%", background: C.red, color: "#fff", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
            <StatPill label="Total Patients"   value={patients.length}     color={C.blue}   bg={C.blueL} />
            <StatPill label="High Risk"        value={highCount}           color={C.red}    bg={C.redL} />
            <StatPill label="Risk Rate"        value={`${riskRate}%`}      color={C.amber}  bg={C.amberL} />
            <StatPill label="Appointments"     value={appointments.length} color={C.teal}   bg={C.tealL} />
            <StatPill label="Today"            value={todayAppts.length}   color={C.indigo} bg={C.indigoL} />
            <StatPill label="Urgent Pending"   value={urgentAppts.length}  color={C.red}    bg={C.redL} />
          </div>

          {/* Outbreak banner */}
          {outbreak?.hasOutbreak && (
            <div style={{ background: C.redL, border: `1.5px solid ${C.red}40`, borderRadius: 12, padding: "12px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 22 }}>🚨</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13, color: C.red }}>Disease Outbreak Alert</div>
                {outbreak.outbreakAlerts.map((a, i) => <div key={i} style={{ fontSize: 12, color: C.muted }}>{a.message}</div>)}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {TABS.map(({ key, label, icon }) => (
              <Tab
                key={key}
                label={label}
                icon={icon}
                active={tab === key}
                onClick={() => setTab(key)}
              />
            ))}
          </div>

          {/* ── OVERVIEW TAB ── */}
          {tab === "overview" && (
            <div>
              {/* ADDITION 8: Daily brief banner at top of overview */}
              <DailyBriefBanner dailyBrief={dailyBrief} aiOnline={aiOnline} />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                <Card>
                  <CardTitle>Risk distribution</CardTitle>
                  {highCount === 0 && lowCount === 0 ? <Empty msg="No patient risk data" /> : (
                    <>
                      <ResponsiveContainer width="100%" height={170}>
                        <PieChart><Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={44} outerRadius={68} paddingAngle={3}><Cell fill={C.red} /><Cell fill={C.green} /></Pie><Tooltip content={<Tip />} /></PieChart>
                      </ResponsiveContainer>
                      <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 6 }}>
                        {pieData.map((d, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.muted }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: [C.red, C.green][i] }} />{d.name} ({d.value})</div>)}
                      </div>
                    </>
                  )}
                </Card>
                <Card>
                  <CardTitle>Appointment status</CardTitle>
                  {apptPieData.length === 0 ? <Empty msg="No appointment data" /> : (
                    <ResponsiveContainer width="100%" height={200}><PieChart><Pie data={apptPieData} dataKey="value" cx="50%" cy="50%" outerRadius={68} paddingAngle={2} label={({ name, value }) => `${name} (${value})`} labelLine>{apptPieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Pie><Tooltip content={<Tip />} /></PieChart></ResponsiveContainer>
                  )}
                </Card>
                <Card>
                  <CardTitle>Age distribution</CardTitle>
                  {ageData.length === 0 ? <Empty msg="No data" /> : (
                    <ResponsiveContainer width="100%" height={200}><BarChart data={ageData} barSize={24}><CartesianGrid strokeDasharray="3 3" stroke="#EEF2FF" /><XAxis dataKey="name" tick={{ fontSize: 10, fill: C.subtle }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 10, fill: C.subtle }} axisLine={false} tickLine={false} /><Tooltip content={<Tip />} /><Bar dataKey="value" name="Patients" fill={C.blue} radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer>
                  )}
                </Card>
                <Card>
                  <CardTitle>Disease distribution</CardTitle>
                  {diseaseData.length === 0 ? <Empty msg="No disease data" /> : (
                    <ResponsiveContainer width="100%" height={200}><BarChart data={diseaseData} layout="vertical" barSize={14}><CartesianGrid strokeDasharray="3 3" stroke="#EEF2FF" horizontal={false} /><XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: C.subtle }} axisLine={false} tickLine={false} /><YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: C.muted }} axisLine={false} tickLine={false} width={90} /><Tooltip content={<Tip />} /><Bar dataKey="value" name="Patients" fill={C.teal} radius={[0, 5, 5, 0]} /></BarChart></ResponsiveContainer>
                  )}
                </Card>
                <Card>
                  <CardTitle>Symptom prevalence</CardTitle>
                  {symptomData.length === 0 ? <Empty msg="No symptom data" /> : (
                    <ResponsiveContainer width="100%" height={200}><BarChart data={symptomData} layout="vertical" barSize={14}><CartesianGrid strokeDasharray="3 3" stroke="#EEF2FF" horizontal={false} /><XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: C.subtle }} axisLine={false} tickLine={false} /><YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: C.muted }} axisLine={false} tickLine={false} width={90} /><Tooltip content={<Tip />} /><Bar dataKey="value" name="Patients" fill={C.purple} radius={[0, 5, 5, 0]} /></BarChart></ResponsiveContainer>
                  )}
                </Card>
                <Card>
                  <CardTitle>AI insights</CardTitle>
                  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    {[
                      { label: "Total patients",       value: patients.length,                         color: C.blue },
                      { label: "High risk rate",       value: `${riskRate}%`,                          color: riskRate > 40 ? C.red : C.green },
                      { label: "Total appointments",   value: appointments.length,                     color: C.teal },
                      { label: "Today's appointments", value: todayAppts.length,                       color: C.amber },
                      { label: "Urgent pending",       value: urgentAppts.length,                      color: C.red },
                      { label: "Doctors on staff",     value: doctors.length,                          color: C.indigo },
                      { label: "Most common disease",  value: diseaseData[0]?.name || "—",             color: C.purple },
                      { label: "AI service",           value: aiOnline ? "Online" : "Offline",         color: aiOnline ? C.green : C.red },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
                        <span style={{ color: C.muted }}>{label}</span>
                        <span style={{ fontWeight: 700, color }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* ── PATIENT REPORT TAB ── */}
          {tab === "patient" && (
            <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20 }}>
              <Card>
                <CardTitle>Select patient</CardTitle>
                <select value={selPatient} onChange={e => { setSelPatient(e.target.value); setPatRpt(null); setVerifiedReport(null); setDiagnosisList([]); setVitalsTrend(null); setDrugAlerts(null); }} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, fontSize: 13, border: `1.5px solid ${C.border}`, background: C.bg, color: C.text, outline: "none", marginBottom: 12, fontFamily: "inherit" }}>
                  <option value="">Choose patient…</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.name} — {p.disease || "No diagnosis"} ({(p.predictedRisk ?? p.predicted_risk) === 1 ? "High" : "Low"} Risk)</option>)}
                </select>
                <button onClick={handlePatientReport} disabled={!selPatient || patRptLoading} style={{ width: "100%", background: selPatient ? C.blue : C.border, color: selPatient ? "#fff" : C.muted, border: "none", borderRadius: 9, padding: "11px 0", fontWeight: 700, fontSize: 13, cursor: selPatient ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {patRptLoading ? <><Spin color="#fff" size={14} />Generating…</> : "🔍 Generate Report"}
                </button>
                {selPatient && currentPatient?.doctor_id && (
                  <div style={{ marginTop: 10, padding: "8px 12px", background: C.greenL, borderRadius: 8, fontSize: 11, color: C.green, fontWeight: 600 }}>
                    ✓ Doctor will be notified when report is generated
                  </div>
                )}
                {selPatient && !currentPatient?.doctor_id && (
                  <div style={{ marginTop: 10, padding: "8px 12px", background: C.amberL, borderRadius: 8, fontSize: 11, color: C.amber, fontWeight: 600 }}>
                    No doctor assigned — will notify first available doctor
                  </div>
                )}
              </Card>

              <div>
                {!patRpt ? (
                  <Card style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
                    <Empty msg="Select a patient and click Generate Report" />
                  </Card>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {/* Report header */}
                    <Card>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                          <div style={{ width: 56, height: 56, borderRadius: "50%", background: (patRpt.riskLevel === 1 || patRpt.risk_level === 1) ? C.redL : C.blueL, color: (patRpt.riskLevel === 1 || patRpt.risk_level === 1) ? C.red : C.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800 }}>
                            {(patRpt.patient?.name || patRpt.patientName || "?")[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: 17, fontWeight: 800, color: C.text }}>{patRpt.patient?.name || patRpt.patientName}</div>
                            <div style={{ fontSize: 12, color: C.muted }}>Age {patRpt.patient?.age || patRpt.age} · {patRpt.patient?.disease || patRpt.disease || "No diagnosis"}</div>
                            {currentPatient?.doctor_id && <div style={{ fontSize: 11, color: C.green, marginTop: 4, fontWeight: 600 }}>🔔 Doctor has been notified</div>}
                            {verifiedReport?.doctorVerified && <div style={{ fontSize: 11, color: C.teal, marginTop: 2, fontWeight: 600 }}>✅ Verified by Dr. {verifiedReport.doctorName} · Visible in patient portal</div>}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <Badge label={verifiedReport?.riskLabel || ((patRpt.riskLevel === 1 || patRpt.risk_level === 1) ? "High Risk" : "Low Risk")} color={(patRpt.riskLevel === 1 || patRpt.risk_level === 1) ? C.red : C.green} bg={(patRpt.riskLevel === 1 || patRpt.risk_level === 1) ? C.redL : C.greenL} />
                          <button onClick={() => setVerifyOpen(true)} style={{ background: verifiedReport?.doctorVerified ? C.greenL : C.tealL, color: verifiedReport?.doctorVerified ? C.green : C.teal, border: `1.5px solid ${verifiedReport?.doctorVerified ? C.green : C.teal}`, borderRadius: 8, padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                            {verifiedReport?.doctorVerified ? "✅ Verified" : "🩺 Doctor Verify"}
                          </button>
                          <DownloadBtn onClick={() => handlePdfDownload("patient", verifiedReport || patRpt, "Patient Risk Report")} loading={pdfLoading.patient} />
                        </div>
                      </div>
                    </Card>

                    {/* Doctor notes display (post-verification) */}
                    {verifiedReport?.doctorNotes && (
                      <Card style={{ borderLeft: `4px solid ${C.teal}` }}>
                        <CardTitle>🩺 Doctor's Notes</CardTitle>
                        <div style={{ fontSize: 13, color: C.text, lineHeight: 1.7 }}>{verifiedReport.doctorNotes}</div>
                        <div style={{ fontSize: 11, color: C.subtle, marginTop: 8 }}>Verified by Dr. {verifiedReport.doctorName} · {verifiedReport.doctorVerifiedAt}</div>
                      </Card>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <Card>
                        <CardTitle>Risk score</CardTitle>
                        <div style={{ textAlign: "center", padding: "10px 0" }}>
                          <div style={{ fontSize: 48, fontWeight: 800, color: (patRpt.riskScore || 0) >= 4 ? C.red : C.green, lineHeight: 1 }}>{patRpt.riskScore ?? patRpt.risk_score ?? 0}</div>
                          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>out of 8 points</div>
                          <div style={{ height: 8, borderRadius: 99, background: C.border, margin: "12px 0 6px" }}><div style={{ height: "100%", borderRadius: 99, width: `${Math.min(((patRpt.riskScore ?? 0) / 8) * 100, 100)}%`, background: (patRpt.riskScore ?? 0) >= 4 ? C.red : C.green, transition: "width .5s" }} /></div>
                          <div style={{ fontSize: 12, color: C.muted }}>{patRpt.riskSummary || patRpt.risk_summary || ""}</div>
                        </div>
                      </Card>
                      <Card>
                        <CardTitle>Symptom flags</CardTitle>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {[
                            { label: "Fever",          value: patRpt.patient?.fever          || patRpt.symptoms?.fever },
                            { label: "Cough",          value: patRpt.patient?.cough          || patRpt.symptoms?.cough },
                            { label: "Fatigue",        value: patRpt.patient?.fatigue        || patRpt.symptoms?.fatigue },
                            { label: "Breathlessness", value: patRpt.patient?.breathShortness || patRpt.symptoms?.breathShortness },
                          ].map(({ label, value }) => (
                            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: 13, color: C.muted }}>{label}</span>
                              <Badge label={value ? "Present" : "Absent"} color={value ? C.red : C.green} bg={value ? C.redL : C.greenL} />
                            </div>
                          ))}
                        </div>
                      </Card>
                    </div>

                    {/* ADDITION 5: Predictive Diagnosis Card */}
                    <PredictiveDiagnosisCard
                      diagnosisList={diagnosisList}
                      riskPathway={patRpt?.riskPathway}
                      followUpDays={patRpt?.followUpDays}
                      urgencyFlag={patRpt?.urgencyFlag}
                      triageScore={patRpt?.triageScore}
                    />

                    {/* ADDITION 6: Vitals Trend Card */}
                    <VitalsTrendCard vitalsTrend={vitalsTrend} />

                    {/* ADDITION 7: Drug Interaction Card */}
                    <DrugInteractionCard drugAlerts={drugAlerts} />

                    {(patRpt.clinicalSummary || patRpt.summary) && (
                      <Card>
                        <CardTitle>AI clinical summary {verifiedReport?.doctorVerified && <Badge label="Doctor Edited" color={C.teal} bg={C.tealL} />}</CardTitle>
                        <div style={{ background: C.purpleL, borderRadius: 10, padding: "14px 16px", fontSize: 13, color: C.text, lineHeight: 1.75, border: `1px solid ${C.purple}25` }}>
                          {verifiedReport?.clinicalSummary || patRpt.clinicalSummary || patRpt.summary}
                        </div>
                        {(patRpt.specialist || patRpt.recommendedSpecialist) && (
                          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 12, color: C.muted }}>Recommended specialist:</span>
                            <Badge label={patRpt.specialist || patRpt.recommendedSpecialist} color={C.indigo} bg={C.indigoL} />
                          </div>
                        )}
                      </Card>
                    )}

                    {patRpt.factorBreakdown && Object.keys(patRpt.factorBreakdown).length > 0 && (
                      <Card>
                        <CardTitle>Risk factor breakdown (Explainable AI)</CardTitle>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {Object.entries(patRpt.factorBreakdown).map(([factor, pts]) => (
                            <div key={factor}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}><span style={{ color: C.muted }}>{factor}</span><span style={{ fontWeight: 700, color: Number(pts) >= 2 ? C.red : C.amber }}>+{pts} pts</span></div>
                              <div style={{ height: 7, borderRadius: 99, background: C.border }}><div style={{ height: "100%", borderRadius: 99, width: `${(Number(pts) / 8) * 100}%`, background: Number(pts) >= 2 ? C.red : C.amber, transition: "width .5s" }} /></div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}

                    {patRpt.appointments?.length > 0 && (
                      <Card>
                        <CardTitle>Appointment history</CardTitle>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                          <thead><tr style={{ borderBottom: `2px solid ${C.border}` }}>{["Date", "Doctor", "Specialization", "Status", "Reason"].map(h => <th key={h} style={{ padding: "5px 8px", textAlign: "left", color: C.subtle, fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em" }}>{h}</th>)}</tr></thead>
                          <tbody>{patRpt.appointments.map((a, i) => <tr key={i} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? C.surface : C.bg }}><td style={{ padding: "8px" }}>{a.appointmentDate || "—"}</td><td style={{ padding: "8px", color: C.muted }}>Dr. {a.doctorName || "—"}</td><td style={{ padding: "8px", color: C.muted }}>{a.specialization || "—"}</td><td style={{ padding: "8px" }}><Badge label={a.status || "—"} color={a.status === "completed" ? C.green : a.status === "cancelled" ? C.red : C.blue} bg={a.status === "completed" ? C.greenL : a.status === "cancelled" ? C.redL : C.blueL} /></td><td style={{ padding: "8px", color: C.muted }}>{a.reason || "—"}</td></tr>)}</tbody>
                        </table>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── DOCTOR REPORT TAB ── */}
          {tab === "doctor" && (
            <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20 }}>
              <Card>
                <CardTitle>Select doctor</CardTitle>
                <select value={selDoctor} onChange={e => { setSelDoctor(e.target.value); setDocRpt(null); }} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, fontSize: 13, border: `1.5px solid ${C.border}`, background: C.bg, color: C.text, outline: "none", marginBottom: 12, fontFamily: "inherit" }}>
                  <option value="">Choose doctor…</option>
                  {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.name} — {d.specialization}</option>)}
                </select>
                <button onClick={handleDoctorReport} disabled={!selDoctor || docRptLoading} style={{ width: "100%", background: selDoctor ? C.teal : C.border, color: selDoctor ? "#fff" : C.muted, border: "none", borderRadius: 9, padding: "11px 0", fontWeight: 700, fontSize: 13, cursor: selDoctor ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {docRptLoading ? <><Spin color="#fff" size={14} />Loading…</> : "🔍 Generate Report"}
                </button>
              </Card>
              <div>
                {!docRpt ? <Card style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}><Empty msg="Select a doctor to generate report" /></Card> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <Card>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div><div style={{ fontSize: 17, fontWeight: 800, color: C.text }}>Dr. {docRpt.doctor?.name}</div><div style={{ fontSize: 12, color: C.muted }}>{docRpt.doctor?.specialization} · {docRpt.doctor?.experience} yrs experience</div></div>
                        <DownloadBtn onClick={() => handlePdfDownload("doctor", { ...docRpt, clinicalSummary: `Dr. ${docRpt.doctor?.name} — ${docRpt.doctor?.specialization}. Total appointments: ${docRpt.totalAppts}. Completion rate: ${docRpt.completionRate}%.` }, "Doctor Performance Report")} loading={pdfLoading.doctor} />
                      </div>
                    </Card>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                      {[{ label: "Total Appts", value: docRpt.totalAppts, color: C.blue, bg: C.blueL }, { label: "Completed", value: docRpt.completed, color: C.green, bg: C.greenL }, { label: "Cancelled", value: docRpt.cancelled, color: C.red, bg: C.redL }, { label: "Completion Rate", value: `${docRpt.completionRate}%`, color: docRpt.completionRate >= 85 ? C.green : C.amber, bg: docRpt.completionRate >= 85 ? C.greenL : C.amberL }].map(s => (
                        <Card key={s.label} style={{ textAlign: "center", padding: "16px 12px" }}><div style={{ fontSize: 10, color: C.subtle, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>{s.label}</div><div style={{ fontSize: 28, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</div></Card>
                      ))}
                    </div>
                    <Card>
                      <CardTitle>Completion rate</CardTitle>
                      <div style={{ height: 10, borderRadius: 99, background: C.border }}><div style={{ height: "100%", borderRadius: 99, background: docRpt.completionRate >= 85 ? C.green : C.amber, width: `${docRpt.completionRate}%`, transition: "width .5s" }} /></div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.subtle, marginTop: 6 }}><span>0%</span><span>Target: 85%</span><span>100%</span></div>
                    </Card>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TRENDS TAB ── */}
          {tab === "trends" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Card><CardTitle>Disease breakdown</CardTitle>{diseaseData.length === 0 ? <Empty msg="No disease data" /> : (<ResponsiveContainer width="100%" height={260}><BarChart data={diseaseData} layout="vertical" barSize={18}><CartesianGrid strokeDasharray="3 3" stroke="#EEF2FF" horizontal={false} /><XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: C.subtle }} axisLine={false} tickLine={false} /><YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} width={90} /><Tooltip content={<Tip />} /><Bar dataKey="value" name="Patients" fill={C.teal} radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer>)}</Card>
              <Card><CardTitle>Symptom prevalence</CardTitle>{symptomData.length === 0 ? <Empty msg="No symptom data" /> : (<ResponsiveContainer width="100%" height={260}><BarChart data={symptomData} barSize={32}><CartesianGrid strokeDasharray="3 3" stroke="#EEF2FF" /><XAxis dataKey="name" tick={{ fontSize: 11, fill: C.subtle }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 11, fill: C.subtle }} axisLine={false} tickLine={false} /><Tooltip content={<Tip />} /><Bar dataKey="value" name="Patients" fill={C.purple} radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>)}</Card>
              <Card style={{ gridColumn: "1/-1" }}><CardTitle>Age distribution</CardTitle>{ageData.length === 0 ? <Empty msg="No age data" /> : (<ResponsiveContainer width="100%" height={200}><BarChart data={ageData} barSize={48}><CartesianGrid strokeDasharray="3 3" stroke="#EEF2FF" /><XAxis dataKey="name" tick={{ fontSize: 12, fill: C.subtle }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 11, fill: C.subtle }} axisLine={false} tickLine={false} /><Tooltip content={<Tip />} /><Bar dataKey="value" name="Patients" fill={C.blue} radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>)}</Card>
            </div>
          )}

          {/* ── ALERTS TAB ── */}
          {tab === "alerts" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {!aiOnline && <Card><div style={{ textAlign: "center", color: C.amber, fontWeight: 700, padding: "20px 0" }}>⚠️ Python AI service offline — start with: uvicorn main:app --port 8001</div></Card>}
              <Card>
                <CardTitle action={<Badge label={`${patients.filter(p => (p.predictedRisk ?? p.predicted_risk) === 1 && !appointments.some(a => String(a.patientId) === String(p.id))).length} alerts`} color={C.red} bg={C.redL} />}>High risk patients without appointments</CardTitle>
                {(() => {
                  const noAppt = patients.filter(p => (p.predictedRisk ?? p.predicted_risk) === 1 && !appointments.some(a => String(a.patientId) === String(p.id)));
                  return noAppt.length === 0 ? <Empty msg="All high-risk patients have appointments" /> : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {noAppt.map(p => (
                        <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, background: C.redL, border: `1px solid ${C.red}30` }}>
                          <div style={{ width: 34, height: 34, borderRadius: "50%", background: C.red, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{(p.name || "?")[0].toUpperCase()}</div>
                          <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{p.name}</div><div style={{ fontSize: 11, color: C.muted }}>Age {p.age} · {p.disease || "No diagnosis"}</div></div>
                          <Badge label="High Risk — No Appointment" color={C.red} bg={C.surface} />
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </Card>
              <Card>
                <CardTitle action={<Badge label={`${urgentAppts.length} urgent`} color={C.amber} bg={C.amberL} />}>Urgent appointments pending</CardTitle>
                {urgentAppts.length === 0 ? <Empty msg="No urgent appointments pending" /> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {urgentAppts.map((a, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, background: C.amberL, border: `1px solid ${C.amber}30` }}>
                        <span style={{ fontSize: 22 }}>🚨</span>
                        <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{a.patientName}</div><div style={{ fontSize: 11, color: C.muted }}>Dr. {a.doctorName} · {a.specialization} · {a.appointmentDate}</div></div>
                        <Badge label="URGENT" color={C.amber} bg={C.surface} />
                      </div>
                    ))}
                  </div>
                )}
              </Card>
              {outbreak && (
                <Card>
                  <CardTitle>Disease outbreak detection</CardTitle>
                  {!outbreak.hasOutbreak ? <div style={{ textAlign: "center", padding: "20px 0", color: C.green, fontWeight: 700 }}>✅ No outbreak patterns detected.</div> : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {outbreak.outbreakAlerts.map((a, i) => (
                        <div key={i} style={{ padding: "12px 16px", borderRadius: 10, background: a.severity === "critical" ? C.redL : C.amberL, border: `1px solid ${a.severity === "critical" ? C.red : C.amber}40` }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: a.severity === "critical" ? C.red : C.amber }}>{a.severity === "critical" ? "🔴" : "🟡"} {a.disease} — {a.rate}% of patients</div>
                          <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{a.message}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )}
            </div>
          )}

          {/* ── CUSTOM ANALYSIS TAB ── */}
          {tab === "custom" && (
            <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20 }}>
              <Card>
                <CardTitle>Filters</CardTitle>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div><label style={formLbl}>Risk Level</label><select value={riskFilter} onChange={e => setRiskFilter(e.target.value)} style={{ ...formInp, marginBottom: 0 }}><option value="all">All patients</option><option value="high">High Risk only</option><option value="low">Low Risk only</option></select></div>
                  <div><label style={formLbl}>Age Range: {ageMin} – {ageMax}</label><input type="range" min={0} max={120} value={ageMin} onChange={e => setAgeMin(Number(e.target.value))} style={{ width: "100%", marginBottom: 6 }} /><input type="range" min={0} max={120} value={ageMax} onChange={e => setAgeMax(Number(e.target.value))} style={{ width: "100%" }} /></div>
                </div>
              </Card>
              <div>
                {!cohort ? (
                  <Card style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
                    {aiOnline ? <><Spin /><span style={{ marginLeft: 12, color: C.muted }}>Analysing cohort…</span></> : <Empty msg="Python AI service offline — cannot run cohort analysis" />}
                  </Card>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <Card>
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                        {[{ label: "Cohort Size", value: cohort.total, color: C.blue, bg: C.blueL }, { label: "High Risk", value: cohort.highRisk, color: C.red, bg: C.redL }, { label: "Low Risk", value: cohort.lowRisk, color: C.green, bg: C.greenL }, { label: "Risk Rate", value: `${cohort.riskRate}%`, color: cohort.riskRate > 40 ? C.red : C.green, bg: cohort.riskRate > 40 ? C.redL : C.greenL }].map(s => <StatPill key={s.label} {...s} />)}
                      </div>
                      {cohort.aiNarrative && <div style={{ background: C.indigoL, borderRadius: 10, padding: "12px 16px", fontSize: 13, color: C.text, lineHeight: 1.7, border: `1px solid ${C.indigo}20` }}>🤖 {cohort.aiNarrative}</div>}
                    </Card>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── ADDITION 9: PREDICTION AUDIT TAB ── */}
          {tab === "audit" && (
            <PredictionAuditTab
              patients={patients}
              appointments={appointments}
              aiOnline={aiOnline}
            />
          )}

        </main>
      </div>

      {/* Notification Panel */}
      <NotificationPanel
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        notifications={notifications}
        onMarkRead={(i) => setNotifs(prev => prev.map((n, idx) => idx === i ? { ...n, read: true } : n))}
        onClearAll={() => setNotifs([])}
      />

      {/* Doctor Verify Modal */}
      {verifyOpen && patRpt && (
        <DoctorVerifyModal
          report={verifiedReport || patRpt}
          patient={currentPatient}
          doctors={doctors}
          onClose={() => setVerifyOpen(false)}
          onVerified={handleVerified}
        />
      )}
    </div>
  );
}
