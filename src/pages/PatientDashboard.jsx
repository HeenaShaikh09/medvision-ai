// src/pages/PatientDashboard.jsx
// ✅ FIX 1: Booking sends status:"requested" — patient sees "Pending Admin Approval" not "Booked"
// ✅ Appointments list correctly renders "requested" status with pending badge

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

// ─── Design tokens ─────────────────────────────────────────────
const C = {
  navy: "#0B1437",
  purple: "#7C3AED",
  purpleLt: "#F5F3FF",
  purpleMd: "#DDD6FE",
  teal: "#0D9488",
  tealLt: "#F0FDFA",
  blue: "#2563EB",
  blueLt: "#EFF6FF",
  red: "#DC2626",
  redLt: "#FEF2F2",
  amber: "#D97706",
  amberLt: "#FFFBEB",
  green: "#059669",
  greenLt: "#F0FDF4",
  slate: "#64748B",
  border: "#E2E8F0",
  bg: "#F8FAFC",
  white: "#FFFFFF",
};
const font = "'Segoe UI', system-ui, sans-serif";

// ─── Shared UI ──────────────────────────────────────────────────
const Card = ({ children, style = {} }) => (
  <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, boxShadow: "0 2px 12px rgba(0,0,0,.04)", ...style }}>
    {children}
  </div>
);

const Badge = ({ color = C.purple, bg = C.purpleLt, children }) => (
  <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 99, background: bg, color, fontSize: 11, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase" }}>
    {children}
  </span>
);

const RiskBadge = ({ risk }) => {
  const map = { high: { color: C.red, bg: C.redLt, label: "High Risk" }, medium: { color: C.amber, bg: C.amberLt, label: "Medium" }, low: { color: C.green, bg: C.greenLt, label: "Low Risk" } };
  const s = map[risk?.toLowerCase()] || map.low;
  return <Badge color={s.color} bg={s.bg}>{s.label}</Badge>;
};

const EmptyState = ({ icon, title, sub }) => (
  <div style={{ textAlign: "center", padding: "52px 24px", color: C.slate }}>
    <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
    <div style={{ fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 6 }}>{title}</div>
    <div style={{ fontSize: 13 }}>{sub}</div>
  </div>
);

const Spinner = ({ size = 20, color = C.purple }) => (
  <>
    <div style={{ width: size, height: size, borderRadius: "50%", border: `2px solid ${C.border}`, borderTopColor: color, animation: "_sp .7s linear infinite", flexShrink: 0 }} />
    <style>{`@keyframes _sp{to{transform:rotate(360deg)}}`}</style>
  </>
);

const LoadingBlock = ({ rows = 3 }) => (
  <div style={{ padding: 24 }}>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} style={{ height: 56, borderRadius: 10, marginBottom: 12, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "_sh 1.4s ease infinite", animationDelay: `${i * .1}s` }} />
    ))}
    <style>{`@keyframes _sh{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
  </div>
);

const Avatar = ({ name = "?", size = 36, bg = C.purple }) => {
  const initials = (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: bg, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * .38, fontWeight: 700, flexShrink: 0 }}>
      {initials}
    </div>
  );
};

const StatCard = ({ icon, label, value, accent = C.purple }) => (
  <Card style={{ padding: "20px 22px", flex: 1, minWidth: 130 }}>
    <div style={{ width: 40, height: 40, borderRadius: 12, background: accent + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 12 }}>{icon}</div>
    <div style={{ fontSize: 11, fontWeight: 700, color: C.slate, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 28, fontWeight: 800, color: C.navy, lineHeight: 1 }}>{value}</div>
  </Card>
);

const InfoRow = ({ label, value }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
    <span style={{ fontSize: 12, fontWeight: 700, color: C.slate, textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</span>
    <span style={{ fontSize: 14, color: C.navy, fontWeight: 600 }}>{value || "—"}</span>
  </div>
);

const lbl = { fontSize: 11, fontWeight: 700, color: C.slate, display: "block", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 };
const inp = { width: "100%", boxSizing: "border-box", padding: "10px 13px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.navy, background: C.bg, fontFamily: font, outline: "none" };

// ─── Appointment status display helpers ─────────────────────────
// FIX 1: Added "requested" status so patient sees correct badge
const APPT_STATUS = {
  requested: { color: C.amber, bg: C.amberLt, icon: "⏳", label: "Pending Approval" },
  scheduled: { color: C.blue, bg: C.blueLt, icon: "📅", label: "Scheduled" },
  confirmed: { color: C.green, bg: C.greenLt, icon: "✅", label: "Confirmed" },
  completed: { color: C.teal, bg: C.tealLt, icon: "✔️", label: "Completed" },
  cancelled: { color: C.red, bg: C.redLt, icon: "❌", label: "Cancelled" },
};

const getApptStatus = (a) => {
  const key = a.status?.toLowerCase() || "scheduled";
  return APPT_STATUS[key] || APPT_STATUS.scheduled;
};

// ─── Specializations list ────────────────────────────────────────
const SPECIALIZATIONS = [
  "General Physician", "Cardiology", "Dermatology", "Neurology",
  "Orthopedics", "Pediatrics", "Psychiatry", "Gynecology",
  "Ophthalmology", "ENT", "Oncology", "Urology",
  "Endocrinology", "Pulmonology", "Gastroenterology",
];

// ═══════════════════════════════════════════════════════════════
//  BOOKING MODAL — Patient Self-Booking
//  FIX 1: Sends status:"requested" so admin must approve before doctor sees it.
//         Success screen explicitly says "pending admin approval."
// ═══════════════════════════════════════════════════════════════

function BookingModal({ patientId, patientName, onClose, onBooked }) {
  const [slotConflict, setSlotConflict] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    specialization: "",
    doctor_id: "",
    date: "",
    time: "",
    reason: "",
    urgency: "routine",
  });

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!form.specialization) { setDoctors([]); setLoadingDocs(false); return; }
    setLoadingDocs(true);
    setForm(f => ({ ...f, doctor_id: "" }));
    supabase
      .from("doctors")
      .select("id, name, specialization, experience")
      .ilike("specialization", `%${form.specialization}%`)
      .then(({ data }) => {
        setDoctors(data || []);
        setLoadingDocs(false);
      });
  }, [form.specialization]);

  const handleSubmit = async () => {
    if (!form.specialization) return setError("Please select a specialization.");
    if (!form.date) return setError("Please select a date.");
    if (!form.time) return setError("Please select a time.");
    if (!form.reason.trim()) return setError("Please describe your reason for visit.");

    setError("");
    setSubmitting(true);

    const appointmentData = {
      patient_id: patientId,
      patient_name: patientName,
      specialization: form.specialization,
      appointment_date: form.date,
      appointment_time: form.time,
      doctor_id: form.doctor_id || null,
      reason: form.reason,
      urgency: form.urgency,
      status: "requested",
    };

    try {
      const response = await fetch("http://localhost:8080/api/appointment/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(appointmentData),
      });

      let result = {};
      try { result = await response.json(); } catch { result = {}; }

      // ✅ Handle slot conflict — show next available slot clearly
      if (response.status === 409) {
        if (result.nextSlot) {
          setSlotConflict(result.nextSlot); // triggers the conflict UI below
        } else {
          setError("This time slot is fully booked. Please choose another time.");
        }
        return;
      }

      if (!response.ok) {
        throw new Error(result.message || result.error || "Failed to submit appointment request");
      }

      setSuccess(true);
      setTimeout(() => { onBooked(); onClose(); }, 3500);

    } catch (err) {
      console.error("Booking error:", err);
      setError(err.message || "Server connection failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(11,20,55,.5)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <Card style={{ maxWidth: 520, width: "100%", padding: 32, maxHeight: "90vh", overflowY: "auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.navy }}>📅 Request Appointment</div>
            <div style={{ fontSize: 12, color: C.slate, marginTop: 3 }}>
              Submit a request — admin will review and confirm
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", border: `1px solid ${C.border}`, background: C.bg, cursor: "pointer", fontSize: 16, color: C.slate, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        {/* ✅ FIX 1: Success screen explicitly mentions admin approval */}
        {success ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>📋</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.amber, marginBottom: 10 }}>
              Request Submitted!
            </div>
            <div style={{ background: C.amberLt, border: `1px solid rgba(217,119,6,.25)`, borderRadius: 12, padding: "16px 20px", textAlign: "left", marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.amber, marginBottom: 6 }}>⏳ Pending Admin Approval</div>
              <div style={{ fontSize: 13, color: C.navy, lineHeight: 1.6 }}>
                Your appointment request has been received. An admin will review it, assign a doctor if needed, and confirm your slot. You'll see the status update in your Appointments tab.
              </div>
            </div>
            <div style={{ fontSize: 12, color: C.slate }}>This window will close automatically…</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Specialization */}
            <div>
              <label style={lbl}>Specialization *</label>
              <select value={form.specialization} onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))} style={{ ...inp, cursor: "pointer" }}>
                <option value="">Select specialization…</option>
                {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Doctor */}
            {form.specialization && (
              <div>
                <label style={lbl}>Preferred Doctor (optional)</label>
                {loadingDocs ? (
                  <div style={{ fontSize: 12, color: C.slate, padding: "8px 0" }}>Loading doctors…</div>
                ) : doctors.length === 0 ? (
                  <div style={{ fontSize: 12, color: C.amber, padding: "8px 12px", background: C.amberLt, borderRadius: 8 }}>
                    No doctors found for this specialization. Admin will assign one.
                  </div>
                ) : (
                  <select value={form.doctor_id} onChange={e => setForm(f => ({ ...f, doctor_id: e.target.value }))} style={{ ...inp, cursor: "pointer" }}>
                    <option value="">Any available doctor</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>Dr. {d.name}{d.experience ? ` · ${d.experience} yrs exp` : ""}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Date */}
            <div>
              <label style={lbl}>Preferred Date *</label>
              <input type="date" min={today} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inp} />
            </div>

            {/* Time */}
            <div>
              <label style={lbl}>Preferred Time *</label>
              <select value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} style={{ ...inp, cursor: "pointer" }}>
                <option value="">Select time slot…</option>
                {["09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
                  "12:00", "14:00", "14:30", "15:00", "15:30", "16:00",
                  "16:30", "17:00", "17:30"].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Urgency */}
            <div>
              <label style={lbl}>Urgency</label>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { key: "routine", label: "🟢 Routine", desc: "Regular checkup" },
                  { key: "urgent", label: "🟡 Urgent", desc: "Needs attention soon" },
                  { key: "emergency", label: "🔴 Emergency", desc: "Immediate attention" },
                ].map(u => (
                  <button key={u.key} onClick={() => setForm(f => ({ ...f, urgency: u.key }))} style={{
                    flex: 1, padding: "10px 8px", borderRadius: 10, cursor: "pointer",
                    border: `2px solid ${form.urgency === u.key ? C.purple : C.border}`,
                    background: form.urgency === u.key ? C.purpleLt : C.white,
                    fontSize: 11, fontWeight: 700, color: form.urgency === u.key ? C.purple : C.slate,
                    textAlign: "center", transition: "all .15s",
                  }}>
                    <div>{u.label}</div>
                    <div style={{ fontWeight: 400, marginTop: 2, fontSize: 10 }}>{u.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Reason */}
            <div>
              <label style={lbl}>Reason for Visit *</label>
              <textarea
                value={form.reason}
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="Briefly describe your symptoms or reason for the appointment…"
                rows={3}
                style={{ ...inp, resize: "vertical", lineHeight: 1.5 }}
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{ background: C.redLt, border: `1px solid rgba(220,38,38,.2)`, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: C.red, fontWeight: 600 }}>
                ⚠ {error}
              </div>
            )}
            {/* ✅ Slot conflict — shown when doctor is fully booked */}
            {slotConflict && (
              <div style={{
                background: "#FFF7ED",
                border: "1px solid rgba(249,115,22,.3)",
                borderRadius: 12,
                padding: "16px 18px",
              }}>
                <div style={{
                  fontSize: 13, fontWeight: 800,
                  color: "#C2410C", marginBottom: 8,
                  display: "flex", alignItems: "center", gap: 8
                }}>
                  🚫 This slot is fully booked
                </div>
                <div style={{ fontSize: 13, color: "#0B1437", marginBottom: 12, lineHeight: 1.6 }}>
                  Dr. {doctors.find(d => String(d.id) === form.doctor_id)?.name || "Selected doctor"}
                  {" "}is not available at your chosen time.
                </div>
                <div style={{
                  background: "#F0FDF4",
                  border: "1px solid rgba(5,150,105,.2)",
                  borderRadius: 8, padding: "10px 14px",
                  marginBottom: 12,
                }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: "#059669",
                    textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4
                  }}>
                    Next Available Slot
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#0B1437" }}>
                    📅 {slotConflict}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {/* Auto-fill the suggested slot */}
                  <button
                    onClick={() => {
                      // Parse "2026-05-21 at 09:30" → date and time
                      const parts = slotConflict.split(" at ");
                      if (parts.length === 2) {
                        setForm(f => ({ ...f, date: parts[0].trim(), time: parts[1].trim() }));
                      }
                      setSlotConflict(null);
                    }}
                    style={{
                      flex: 2, padding: "10px 0", borderRadius: 10, border: "none",
                      background: "#059669", color: "#fff",
                      fontSize: 13, fontWeight: 700, cursor: "pointer",
                    }}
                  >
                    ✅ Use This Slot Instead
                  </button>
                  <button
                    onClick={() => setSlotConflict(null)}
                    style={{
                      flex: 1, padding: "10px 0", borderRadius: 10,
                      border: "1.5px solid #E2E8F0", background: "#fff",
                      color: "#64748B", fontSize: 13, fontWeight: 700, cursor: "pointer",
                    }}
                  >
                    Pick Manually
                  </button>
                </div>
              </div>
            )}

            {/* Info banner — FIX 1: tell patient this is a request, not instant booking */}
            <div style={{ background: C.amberLt, border: `1px solid rgba(217,119,6,.2)`, borderRadius: 10, padding: "10px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>ℹ️</span>
              <div style={{ fontSize: 12, color: C.amber, fontWeight: 600, lineHeight: 1.5 }}>
                This submits a <strong>request</strong>. An admin will review and approve it before it appears in your doctor's schedule.
              </div>
            </div>

            {/* Summary preview */}
            {form.date && form.time && form.specialization && (
              <div style={{ background: C.purpleLt, border: `1px solid ${C.purpleMd}`, borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.purple, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Request Summary</div>
                <div style={{ fontSize: 13, color: C.navy, display: "flex", flexDirection: "column", gap: 4 }}>
                  <div>📋 <strong>{form.specialization}</strong></div>
                  <div>📅 <strong>{new Date(`${form.date}T${form.time}`).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })} at {form.time}</strong></div>
                  {form.doctor_id && doctors.find(d => String(d.id) === form.doctor_id) && (
                    <div>👨‍⚕️ <strong>Dr. {doctors.find(d => String(d.id) === form.doctor_id)?.name}</strong></div>
                  )}
                  <div>⚡ <strong style={{ textTransform: "capitalize" }}>{form.urgency}</strong></div>
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
                background: submitting ? C.purpleMd : C.purple,
                color: "#fff", fontSize: 14, fontWeight: 800,
                cursor: submitting ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                transition: "all .15s", marginTop: 4,
              }}
            >
              {submitting ? <><Spinner size={16} color="#fff" /> Submitting…</> : "📋 Submit Appointment Request"}
            </button>

          </div>
        )}
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  TAB: My Health (overview)
// ═══════════════════════════════════════════════════════════════
function MyHealth({ patientRecord, appts, reports }) {
  const nextAppt = appts
    .filter(a => {
      const s = a.status?.toLowerCase();
      // Only show confirmed/scheduled as "next" — not pending requests
      return (s === "scheduled" || s === "confirmed") && new Date(a.appointment_date) >= new Date();
    })
    .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date))[0];

  // Pending requests count — shown as separate info
  const pendingCount = appts.filter(a => a.status?.toLowerCase() === "requested").length;

  const apptLabel = (a) => a?.doctor_name ? `Dr. ${a.doctor_name}` : "Consultation";

  return (
    <div>
      <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
        <StatCard icon="📋" label="Total Appointments" value={appts.length} accent={C.purple} />
        <StatCard icon="⏳" label="Pending Approval" value={pendingCount} accent={C.amber} />
        <StatCard icon="📅" label="Confirmed" value={appts.filter(a => ["scheduled", "confirmed"].includes(a.status?.toLowerCase())).length} accent={C.blue} />
        <StatCard icon="📄" label="Reports" value={reports.length} accent={C.teal} />
      </div>

      {/* Pending request banner */}
      {pendingCount > 0 && (
        <div style={{ background: C.amberLt, border: `1px solid rgba(217,119,6,.25)`, borderRadius: 12, padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 24 }}>⏳</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.amber }}>
              {pendingCount} appointment request{pendingCount > 1 ? "s" : ""} awaiting admin approval
            </div>
            <div style={{ fontSize: 12, color: C.slate, marginTop: 2 }}>
              You'll be notified once confirmed. Check the Appointments tab for details.
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.navy, marginBottom: 16 }}>🩺 Health Summary</div>
          {patientRecord ? (
            <>
              <InfoRow label="Risk Level" value={<RiskBadge risk={patientRecord.risk_level} />} />
              <InfoRow label="Diagnosis" value={patientRecord.diagnosis} />
              <InfoRow label="Blood Type" value={patientRecord.blood_type} />
              <InfoRow label="Age" value={patientRecord.age ? `${patientRecord.age} years` : null} />
              <InfoRow label="Gender" value={patientRecord.gender} />
              <InfoRow label="AI Verified" value={patientRecord.ai_verified ? "✓ Yes" : "⏳ Pending"} />
            </>
          ) : (
            <EmptyState icon="📋" title="No health record yet" sub="Your doctor will add your details." />
          )}
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card style={{ padding: "20px 24px", flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.navy, marginBottom: 16 }}>📅 Next Appointment</div>
            {nextAppt ? (
              <>
                <div style={{ fontSize: 22, fontWeight: 800, color: C.purple, marginBottom: 4 }}>
                  {new Date(nextAppt.appointment_date).toLocaleDateString([], { month: "short", day: "numeric" })}
                </div>
                <div style={{ fontSize: 13, color: C.slate }}>
                  {nextAppt.appointment_time ? nextAppt.appointment_time.slice(0, 5) : "Time TBC"}
                </div>
                <div style={{ marginTop: 10 }}>
                  <Badge color={C.purple} bg={C.purpleLt}>{apptLabel(nextAppt)}</Badge>
                </div>
              </>
            ) : (
              <EmptyState icon="📭" title="No confirmed appointments" sub="Book one from the Appointments tab." />
            )}
          </Card>

          {reports[0] && (
            <Card style={{ padding: "20px 24px", flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.navy, marginBottom: 12 }}>📄 Latest Report</div>
              <div style={{ fontSize: 13, color: C.slate, marginBottom: 8 }}>
                {new Date(reports[0].created_at).toLocaleDateString()}
              </div>
              <div style={{ fontSize: 13, color: C.navy, marginBottom: 10 }}>
                {reports[0].title || reports[0].report_type || "Medical Report"}
              </div>
              {reports[0].ai_verified
                ? <Badge color={C.green} bg={C.greenLt}>✓ AI Verified</Badge>
                : <Badge color={C.amber} bg={C.amberLt}>⏳ Pending Verification</Badge>}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  TAB: My Appointments
//  FIX 1: "requested" status renders as "Pending Approval" amber badge
//         Requested appointments are shown in a separate section at top
// ═══════════════════════════════════════════════════════════════
function MyAppointments({ appts, loading, patientId, patientName, onRefresh }) {
  const [filter, setFilter] = useState("upcoming");
  const [showBooking, setShowBooking] = useState(false);

  const now = new Date();

  const requested = appts.filter(a => a.status?.toLowerCase() === "requested");

  const filtered = appts.filter(a => {
    const s = a.status?.toLowerCase();
    // Requested appointments shown in their own section above, not in the main list
    if (s === "requested") return false;
    const dt = new Date(a.appointment_date);
    if (filter === "upcoming") return dt >= now;
    if (filter === "past") return dt < now;
    return true;
  }).sort((a, b) => {
    if (filter === "past") return new Date(b.appointment_date) - new Date(a.appointment_date);
    return new Date(a.appointment_date) - new Date(b.appointment_date);
  });

  const apptLabel = (a) => a.doctor_name ? `Dr. ${a.doctor_name}` : (a.specialization || "Consultation");

  const fmtFull = (date, time) => {
    if (!date) return "—";
    const d = new Date(date);
    const datePart = d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    const timePart = time ? time.slice(0, 5) : "";
    return timePart ? `${datePart} at ${timePart}` : datePart;
  };

  const urgencyIcon = (u) => {
    if (u === "emergency") return "🔴";
    if (u === "urgent") return "🟡";
    return "🟢";
  };

  return (
    <div>
      {/* Stats + Book button */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", flex: 1 }}>
          <StatCard icon="⏳" label="Pending" value={requested.length} accent={C.amber} />
          <StatCard icon="📅" label="Confirmed" value={appts.filter(a => ["scheduled", "confirmed"].includes(a.status?.toLowerCase())).length} accent={C.blue} />
          <StatCard icon="✅" label="Completed" value={appts.filter(a => a.status?.toLowerCase() === "completed").length} accent={C.green} />
        </div>
        <button
          onClick={() => setShowBooking(true)}
          style={{
            padding: "14px 24px", borderRadius: 12, border: "none",
            background: C.purple, color: "#fff",
            fontSize: 14, fontWeight: 800, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 8,
            boxShadow: "0 4px 14px rgba(124,58,237,.3)",
            transition: "all .15s", whiteSpace: "nowrap",
            alignSelf: "center",
          }}
        >
          + Request Appointment
        </button>
      </div>

      {/* ✅ FIX 1: Pending requests section */}
      {requested.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.amber, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            ⏳ Pending Admin Approval
            <span style={{ background: C.amberLt, color: C.amber, fontSize: 11, padding: "2px 8px", borderRadius: 99 }}>{requested.length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {requested.map(a => (
              <Card key={a.id} style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, borderLeft: `4px solid ${C.amber}` }}>
                <div style={{ minWidth: 56, textAlign: "center", borderRadius: 12, padding: "8px 4px", background: C.amberLt, border: `1px solid rgba(217,119,6,.2)` }}>
                  <div style={{ fontSize: 18 }}>⏳</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.amber, marginTop: 2 }}>
                    {new Date(a.appointment_date).toLocaleDateString([], { month: "short", day: "numeric" })}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: C.navy, fontSize: 14, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    {a.urgency && <span>{urgencyIcon(a.urgency)}</span>}
                    {apptLabel(a)}
                  </div>
                  <div style={{ fontSize: 12, color: C.slate, marginTop: 2 }}>
                    {fmtFull(a.appointment_date, a.appointment_time)}
                  </div>
                  {a.reason && (
                    <div style={{ fontSize: 12, color: C.slate, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      📝 {a.reason}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                  <Badge color={C.amber} bg={C.amberLt}>⏳ Pending Approval</Badge>
                  <div style={{ fontSize: 11, color: C.slate }}>Awaiting admin review</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Filters for confirmed/past appointments */}
      <div style={{ fontSize: 13, fontWeight: 800, color: C.navy, marginBottom: 12 }}>Confirmed Appointments</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {[{ key: "upcoming", label: "Upcoming" }, { key: "past", label: "Past" }, { key: "all", label: "All" }].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{
            padding: "7px 16px", borderRadius: 99, border: "1.5px solid",
            borderColor: filter === f.key ? C.purple : C.border,
            background: filter === f.key ? C.purple : C.white,
            color: filter === f.key ? "#fff" : C.slate,
            fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all .15s",
          }}>{f.label}</button>
        ))}
      </div>

      {/* Appointment list */}
      {loading ? <LoadingBlock /> : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "52px 24px" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 6 }}>No confirmed appointments</div>
          <div style={{ fontSize: 13, color: C.slate, marginBottom: 20 }}>
            {filter === "upcoming"
              ? requested.length > 0
                ? "Your requests are pending admin approval."
                : "You have no upcoming appointments."
              : "No appointments in this category."}
          </div>
          {filter === "upcoming" && requested.length === 0 && (
            <button
              onClick={() => setShowBooking(true)}
              style={{ padding: "11px 24px", borderRadius: 10, border: "none", background: C.purple, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              + Request Your First Appointment
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(a => {
            const statusMeta = getApptStatus(a);
            return (
              <Card key={a.id} style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{
                  minWidth: 56, textAlign: "center", borderRadius: 12, padding: "8px 4px",
                  background: new Date(a.appointment_date) >= now ? C.purpleLt : C.bg,
                  border: `1px solid ${new Date(a.appointment_date) >= now ? C.purpleMd : C.border}`,
                }}>
                  <div style={{ fontSize: 18 }}>📅</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: new Date(a.appointment_date) >= now ? C.purple : C.slate, marginTop: 2 }}>
                    {new Date(a.appointment_date).toLocaleDateString([], { month: "short", day: "numeric" })}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: C.navy, fontSize: 14, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    {a.urgency && <span>{urgencyIcon(a.urgency)}</span>}
                    {apptLabel(a)}
                  </div>
                  <div style={{ fontSize: 12, color: C.slate, marginTop: 2 }}>
                    {fmtFull(a.appointment_date, a.appointment_time)}
                  </div>
                  {a.reason && (
                    <div style={{ fontSize: 12, color: C.slate, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      📝 {a.reason}
                    </div>
                  )}
                </div>
                {/* ✅ FIX 1: Status badge uses APPT_STATUS map including "requested" */}
                <Badge color={statusMeta.color} bg={statusMeta.bg}>
                  {statusMeta.icon} {statusMeta.label}
                </Badge>
              </Card>
            );
          })}
        </div>
      )}

      {showBooking && (
        <BookingModal
          patientId={patientId}
          patientName={patientName}
          onClose={() => setShowBooking(false)}
          onBooked={() => { setShowBooking(false); onRefresh(); }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  TAB: My Reports
// ═══════════════════════════════════════════════════════════════
function parseFindingsDisplay(findings) {
  if (!findings) return null;
  try {
    const parsed = JSON.parse(findings);
    if (typeof parsed === "object" && !Array.isArray(parsed)) {
      return Object.entries(parsed)
        .map(([symptom, score]) => `${symptom}: +${score} pts`)
        .join(" · ");
    }
  } catch { /* not JSON */ }
  return findings;
}

function MyReports({ patientId }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!patientId) { setLoading(false); return; }
    supabase
      .from("reports")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .then(({ data }) => { setReports(data || []); setLoading(false); });
  }, [patientId]);

  return (
    <div>
      <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
        <StatCard icon="📄" label="Total Reports" value={reports.length} accent={C.teal} />
        <StatCard icon="✅" label="AI Verified" value={reports.filter(r => r.ai_verified).length} accent={C.green} />
        <StatCard icon="⏳" label="Pending Review" value={reports.filter(r => !r.ai_verified).length} accent={C.amber} />
      </div>

      {loading ? <LoadingBlock /> : reports.length === 0 ? (
        <EmptyState icon="📄" title="No reports yet" sub="Your doctor will upload reports here after analysis." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {reports.map(r => (
            <Card key={r.id} style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: r.ai_verified ? C.tealLt : C.amberLt, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                {r.ai_verified ? "✅" : "📄"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: C.navy, fontSize: 14 }}>
                  {r.title || r.report_type || "Medical Report"}
                </div>
                <div style={{ fontSize: 12, color: C.slate, marginTop: 2 }}>
                  {r.created_at ? new Date(r.created_at).toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" }) : "—"}
                  {r.doctor_name && ` · Dr. ${r.doctor_name}`}
                </div>
                {r.summary && <div style={{ fontSize: 12, color: C.slate, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.summary}</div>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                {r.ai_verified
                  ? <Badge color={C.green} bg={C.greenLt}>✓ AI Verified</Badge>
                  : <Badge color={C.amber} bg={C.amberLt}>⏳ Pending</Badge>}
                <button onClick={() => setSelected(r)} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${C.purple}`, background: "transparent", color: C.purple, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>View</button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {selected && <ReportModal report={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function ReportModal({ report: r, onClose }) {
  const findingsDisplay = parseFindingsDisplay(r.findings);
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(11,20,55,.45)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <Card style={{ maxWidth: 540, width: "100%", padding: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: C.navy }}>{r.title || r.report_type || "Medical Report"}</div>
            <div style={{ fontSize: 12, color: C.slate, marginTop: 4 }}>
              {r.created_at ? new Date(r.created_at).toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" }) : "—"}
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", border: `1px solid ${C.border}`, background: C.bg, cursor: "pointer", fontSize: 16, color: C.slate, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[
            ["Report Type", r.report_type],
            ["Doctor", r.doctor_name ? `Dr. ${r.doctor_name}` : null],
            ["AI Status", r.ai_verified ? "✓ Verified" : "⏳ Pending"],
            ["Date", r.created_at ? new Date(r.created_at).toLocaleDateString() : null],
          ].map(([label, val]) => (
            <div key={label} style={{ background: C.bg, borderRadius: 10, padding: "10px 14px", border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.slate, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>{val || "—"}</div>
            </div>
          ))}
        </div>
        {r.summary && (
          <div style={{ background: C.purpleLt, borderRadius: 12, padding: "14px 16px", border: `1px solid ${C.purpleMd}`, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.purple, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>Summary</div>
            <div style={{ fontSize: 13, color: C.navy, lineHeight: 1.6 }}>{r.summary}</div>
          </div>
        )}
        {findingsDisplay && (
          <div style={{ background: C.bg, borderRadius: 12, padding: "14px 16px", border: `1px solid ${C.border}`, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.slate, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>Findings</div>
            <div style={{ fontSize: 13, color: C.navy, lineHeight: 1.6 }}>{findingsDisplay}</div>
          </div>
        )}
        {r.recommendations && (
          <div style={{ background: C.greenLt, borderRadius: 12, padding: "14px 16px", border: `1px solid rgba(5,150,105,.2)` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.green, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>Recommendations</div>
            <div style={{ fontSize: 13, color: C.navy, lineHeight: 1.6 }}>{r.recommendations}</div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  TAB: My Profile
// ═══════════════════════════════════════════════════════════════
function MyProfile({ user, patientRecord, onUpdate }) {
  const meta = user?.user_metadata || {};
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ display_name: meta.display_name || "", phone: patientRecord?.phone || "", date_of_birth: meta.date_of_birth || patientRecord?.date_of_birth || "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const handleSave = async () => {
    setLoading(true);
    await supabase.auth.updateUser({ data: { display_name: form.display_name, date_of_birth: form.date_of_birth } });
    if (patientRecord?.id) {
      await supabase.from("patients").update({ phone: form.phone, date_of_birth: form.date_of_birth }).eq("id", patientRecord.id);
    }
    setLoading(false);
    setEditing(false);
    setSuccess("Profile updated!");
    setTimeout(() => setSuccess(""), 3000);
    onUpdate?.();
  };

  const name = meta.display_name || meta.full_name || user?.email?.split("@")[0] || "Patient";
  const email = user?.email || "—";

  return (
    <div style={{ maxWidth: 600 }}>
      {success && (
        <div style={{ background: C.greenLt, border: `1px solid rgba(5,150,105,.2)`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: C.green, marginBottom: 16, fontWeight: 600 }}>
          ✓ {success}
        </div>
      )}
      <Card style={{ padding: "28px 32px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 24 }}>
          <Avatar name={name} size={64} bg={C.purple} />
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.navy }}>{name}</div>
            <div style={{ fontSize: 13, color: C.slate }}>{email}</div>
            <div style={{ marginTop: 6 }}><Badge color={C.purple} bg={C.purpleLt}>PATIENT</Badge></div>
          </div>
        </div>
        {editing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={lbl}>Display Name</label>
              <input value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={lbl}>Phone</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 00000 00000" style={inp} />
            </div>
            <div>
              <label style={lbl}>Date of Birth</label>
              <input type="date" value={form.date_of_birth} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} style={inp} />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button onClick={() => setEditing(false)} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.white, color: C.slate, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleSave} disabled={loading} style={{ flex: 2, padding: "11px 0", borderRadius: 10, border: "none", background: loading ? C.purpleMd : C.purple, color: "#fff", fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}>
                {loading ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <InfoRow label="Email" value={email} />
            <InfoRow label="Display Name" value={form.display_name} />
            <InfoRow label="Phone" value={form.phone} />
            <InfoRow label="Date of Birth" value={form.date_of_birth} />
            <button onClick={() => setEditing(true)} style={{ marginTop: 16, padding: "10px 20px", borderRadius: 10, border: `1.5px solid ${C.purple}`, background: "transparent", color: C.purple, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              ✏️ Edit Profile
            </button>
          </>
        )}
      </Card>
      {patientRecord && (
        <Card style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.navy, marginBottom: 16 }}>🩺 Medical Record</div>
          <InfoRow label="Diagnosis" value={patientRecord.diagnosis} />
          <InfoRow label="Risk Level" value={<RiskBadge risk={patientRecord.risk_level} />} />
          <InfoRow label="Blood Type" value={patientRecord.blood_type} />
          <InfoRow label="Age" value={patientRecord.age ? `${patientRecord.age} years` : null} />
          <InfoRow label="Gender" value={patientRecord.gender} />
          <InfoRow label="AI Verified" value={patientRecord.ai_verified ? "✓ Yes" : "⏳ Pending"} />
          {patientRecord.notes && (
            <div style={{ marginTop: 14, background: C.amberLt, borderRadius: 10, padding: "12px 14px", border: `1px solid rgba(217,119,6,.2)` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.amber, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>Clinical Notes</div>
              <div style={{ fontSize: 13, color: C.navy }}>{patientRecord.notes}</div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MAIN: Patient Dashboard
// ═══════════════════════════════════════════════════════════════
const TABS = [
  { key: "health", icon: "❤️", label: "My Health" },
  { key: "appts", icon: "📅", label: "Appointments" },
  { key: "reports", icon: "📄", label: "My Reports" },
  { key: "profile", icon: "👤", label: "My Profile" },
];

export default function PatientDashboard() {
  const [tab, setTab] = useState("health");
  const [user, setUser] = useState(null);
  const [patientRecord, setRecord] = useState(null);
  const [appts, setAppts] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadData = async (u) => {
    const email = u.email;
    const { data: recs } = await supabase
      .from("patients")
      .select("*")
      .eq("email", email)
      .maybeSingle();
    setRecord(recs || null);

    if (recs?.id) {
      const { data: ap } = await supabase
        .from("appointments")
        .select("*")
        .eq("patient_id", recs.id)
        .order("appointment_date", { ascending: true });
      setAppts(ap || []);

      const { data: rep } = await supabase
        .from("reports")
        .select("*")
        .eq("patient_id", recs.id)
        .order("created_at", { ascending: false });
      setReports(rep || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user) { navigate("/patient-login"); return; }
      const role = data.user.user_metadata?.role;
      if (role === "admin" || role === "doctor") { navigate("/patient-login"); return; }
      setUser(data.user);
      loadData(data.user);
    });
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/patient-login");
  };

  const refreshAppts = async () => {
    if (!patientRecord?.id) return;
    const { data: ap } = await supabase
      .from("appointments")
      .select("*")
      .eq("patient_id", patientRecord.id)
      .order("appointment_date", { ascending: true });
    setAppts(ap || []);
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <Spinner size={40} color={C.purple} />
        <div style={{ fontSize: 14, color: C.slate }}>Loading your health portal…</div>
      </div>
    </div>
  );

  const meta = user?.user_metadata || {};
  const name = meta.display_name || meta.full_name || user?.email?.split("@")[0] || "Patient";

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg, fontFamily: font }}>
      <div style={{ width: 240, background: "#1E0B4B", display: "flex", flexDirection: "column", flexShrink: 0, position: "sticky", top: 0, height: "100vh" }}>
        <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: C.purple, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⚕️</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>MedVision AI</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: ".08em" }}>Patient Portal</div>
            </div>
          </div>
        </div>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar name={name} size={36} bg={C.purple} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email}</div>
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <Badge color={C.purpleMd} bg="rgba(124,58,237,.2)">PATIENT</Badge>
          </div>
          {patientRecord?.risk_level && (
            <div style={{ marginTop: 8 }}>
              <RiskBadge risk={patientRecord.risk_level} />
            </div>
          )}
        </div>
        <nav style={{ flex: 1, padding: "12px 10px" }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 12,
              padding: "11px 12px", borderRadius: 10, border: "none",
              background: tab === t.key ? "rgba(124,58,237,.2)" : "transparent",
              color: tab === t.key ? C.purpleMd : "rgba(255,255,255,.5)",
              fontSize: 13, fontWeight: tab === t.key ? 700 : 500,
              cursor: "pointer", textAlign: "left", marginBottom: 2, transition: "all .15s",
            }}>
              <span style={{ fontSize: 16 }}>{t.icon}</span>
              {t.label}
              {tab === t.key && <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: C.purple }} />}
            </button>
          ))}
        </nav>
        <div style={{ padding: "12px 10px", borderTop: "1px solid rgba(255,255,255,.08)" }}>
          <button onClick={handleLogout} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "none", background: "rgba(220,38,38,.12)", color: "#FCA5A5", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
            <span>→</span> Logout
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: "0 28px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.navy }}>
              {TABS.find(t => t.key === tab)?.icon} {TABS.find(t => t.key === tab)?.label}
            </div>
            <div style={{ fontSize: 12, color: C.slate }}>{user?.email} · My Health Portal</div>
          </div>
          <Badge color={C.purple} bg={C.purpleLt}>PATIENT</Badge>
        </div>

        <div style={{ flex: 1, padding: "28px 28px 40px", maxWidth: 1100 }}>
          {tab === "health" && <MyHealth patientRecord={patientRecord} appts={appts} reports={reports} />}
          {tab === "appts" && (
            <MyAppointments
              appts={appts}
              loading={loading}
              patientId={patientRecord?.id}
              patientName={name}
              onRefresh={refreshAppts}
            />
          )}
          {tab === "reports" && <MyReports patientId={patientRecord?.id} />}
          {tab === "profile" && <MyProfile user={user} patientRecord={patientRecord} onUpdate={() => loadData(user)} />}
        </div>
      </div>
    </div>
  );
}
