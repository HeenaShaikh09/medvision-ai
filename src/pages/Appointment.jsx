// src/pages/Appointments.jsx
// ✅ FIX 2: Admin "Requests" tab — approve / reject / assign-doctor actions
// ✅ FIX 4: Spring Boot API only — no Supabase dual-read or dual-write merge

import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { useEffect, useState, useRef, useContext, useCallback } from "react";
import { getAllAppointments, bookAppointment, updateAppointment, cancelAppointment, aiParseAppointment, aiSuggestSlot } from "../api/appointApi.js";
import { getAllPatients } from "../api/patientApi";
import { getDoctors } from "../api/doctorApi";
import { AuthContext } from "../context/AuthContext";

// ── Tokens ───────────────────────────────────────────────────────
const C = {
  bg: "#F0F4FF", surface: "#FFFFFF", border: "#DDE3F0",
  text: "#0B1437", muted: "#5A6A8A", subtle: "#8899BB",
  blue: "#3D6FF8", blueL: "#EBF0FF",
  indigo: "#5B4EF8", indigoL: "#EEECFF",
  teal: "#0EB8A4", tealL: "#E4FAF7",
  green: "#0DBD78", greenL: "#E4F9F1",
  amber: "#F5A623", amberL: "#FFF5E0",
  red: "#F04E4E", redL: "#FFF0F0",
  purple: "#9747FF", purpleL: "#F5EDFF",
  rose: "#F4366D", roseL: "#FFF0F5",
  navy: "#0B1437",
  orange: "#F97316", orangeL: "#FFF7ED",
};

// ✅ FIX 2: "requested" added to STATUS_META for admin view
const STATUS_META = {
  requested:  { color: C.amber,  bg: C.amberL,  icon: "⏳", label: "Requested"  },
  scheduled:  { color: C.blue,   bg: C.blueL,   icon: "📅", label: "Scheduled"  },
  confirmed:  { color: C.green,  bg: C.greenL,  icon: "✅", label: "Confirmed"  },
  completed:  { color: C.green,  bg: C.greenL,  icon: "✅", label: "Completed"  },
  cancelled:  { color: C.red,    bg: C.redL,    icon: "❌", label: "Cancelled"  },
  "no-show":  { color: C.amber,  bg: C.amberL,  icon: "⏰", label: "No Show"    },
};

const URGENCY_META = {
  urgent:     { color: C.red,    bg: C.redL,    icon: "🚨", label: "Urgent"     },
  emergency:  { color: C.red,    bg: C.redL,    icon: "🔴", label: "Emergency"  },
  routine:    { color: C.teal,   bg: C.tealL,   icon: "🗓️", label: "Routine"    },
  normal:     { color: C.teal,   bg: C.tealL,   icon: "🗓️", label: "Normal"     },
  "follow-up":{ color: C.purple, bg: C.purpleL, icon: "🔄", label: "Follow-up"  },
};

const TODAY = new Date().toISOString().split("T")[0];

const fmtDate = (d) => {
  if (!d) return "—";
  const dateStr = d.includes("T") ? d.split("T")[0] : d;
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric"
  });
};

const fmtTime = (t) => {
  if (!t) return "—";
  const timeStr = t.includes("T") ? t.split("T")[1]?.slice(0, 5) : t.slice(0, 5);
  const [h, m] = timeStr.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

// ── Atoms ────────────────────────────────────────────────────────
function Spin({ color = C.blue, size = 20 }) {
  return (
    <>
      <style>{`@keyframes _s{to{transform:rotate(360deg)}}`}</style>
      <span style={{
        display: "inline-block", width: size, height: size, borderRadius: "50%",
        border: `2.5px solid ${color}30`, borderTopColor: color,
        animation: "_s .7s linear infinite", flexShrink: 0
      }} />
    </>
  );
}

function Pill({ label, icon, color, bg }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: bg, color, fontSize: 11, fontWeight: 700,
      padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap"
    }}>
      {icon} {label}
    </span>
  );
}

function Inp({ label, value, onChange, type = "text", placeholder, icon, options }) {
  const [f, setF] = useState(false);
  const base = {
    width: "100%", padding: icon ? "9px 12px 9px 34px" : "9px 12px",
    borderRadius: 8, fontSize: 13, fontFamily: "inherit",
    border: `1.5px solid ${f ? C.blue : C.border}`,
    background: C.bg, color: C.text, outline: "none",
    boxSizing: "border-box", transition: "border-color .15s",
  };
  return (
    <div>
      {label && <label style={{
        display: "block", fontSize: 11, fontWeight: 700, color: C.muted,
        marginBottom: 4, textTransform: "uppercase", letterSpacing: ".05em"
      }}>{label}</label>}
      <div style={{ position: "relative" }}>
        {icon && <span style={{
          position: "absolute", left: 10, top: "50%",
          transform: "translateY(-50%)", fontSize: 15, pointerEvents: "none"
        }}>{icon}</span>}
        {options ? (
          <select value={value} onChange={onChange}
            onFocus={() => setF(true)} onBlur={() => setF(false)} style={base}>
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ) : (
          <input type={type} value={value} onChange={onChange} placeholder={placeholder}
            onFocus={() => setF(true)} onBlur={() => setF(false)} style={base} />
        )}
      </div>
    </div>
  );
}

// ── Voice Assistant ───────────────────────────────────────────────
function VoiceAssistant({ doctors, patients, onBooked }) {
  const [phase, setPhase] = useState("idle");
  const [transcript, setTranscript] = useState("");
  const [parsed, setParsed] = useState(null);
  const [error, setError] = useState("");
  const [aiMsg, setAiMsg] = useState("Hi! I'm your AI appointment assistant. Tap the mic and describe your appointment.");
  const [textInput, setTextInput] = useState("");
  const recognitionRef = useRef("null");

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const supported = !!SpeechRecognition;

  const speak = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95; u.pitch = 1.05;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.name.includes("Female") || v.name.includes("Samantha") || v.name.includes("Google UK English Female"));
    if (preferred) u.voice = preferred;
    window.speechSynthesis.speak(u);
  };

  const startListening = () => {
    if (!supported) { setError("Speech recognition not supported. Use Chrome."); return; }
    setError(""); setTranscript(""); setPhase("listening");
    setAiMsg("Listening… speak your appointment details clearly.");
    speak("Listening. Please describe your appointment.");
    const rec = new SpeechRecognition();
    rec.continuous = false; rec.interimResults = true; rec.lang = "en-IN";
    rec.onresult = (e) => {
      const t = Array.from(e.results).map(r => r[0].transcript).join(" ");
      setTranscript(t);
    };
    rec.onerror = (e) => { setError(`Mic error: ${e.error}`); setPhase("idle"); };
    rec.onend = () => { if (phase === "listening") handleParse(); };
    recognitionRef.current = rec;
    rec.start();
  };

  const stopListening = () => { recognitionRef.current?.stop(); handleParse(); };

  const handleParse = async () => {
    const text = transcript || textInput;
    if (!text.trim()) { setPhase("idle"); return; }
    setPhase("parsing");
    setAiMsg("Analysing your request with AI…");
    try {
      const result = await aiParseAppointment(text);
      if (!result.doctorId && result.specialization && doctors.length) {
        const match = doctors.find(d => d.specialization?.toLowerCase().includes(result.specialization.toLowerCase().split(" ")[0]));
        if (match) { result.doctorId = match.id; result.doctorName = match.name; }
      }
      if (!result.patientId && result.patientName && patients.length) {
        const match = patients.find(p => p.name?.toLowerCase().includes(result.patientName?.toLowerCase()));
        if (match) { result.patientId = match.id; result.patientName = match.name; }
      }
      setParsed(result);
      setPhase("confirming");
      const msg = `I found an appointment for ${result.patientName || "the patient"} with a ${result.specialization || "General Physician"} on ${result.date || "a date to be set"}. Please confirm.`;
      setAiMsg(msg); speak(msg);
    } catch {
      setError("Could not parse appointment. Try again."); setPhase("idle");
    }
  };

  // Admin-created appointments via voice are scheduled directly (not "requested")
  const handleConfirm = async () => {
    if (!parsed) return;
    setPhase("booking");
    setAiMsg("Booking your appointment…");
    try {
      const slot = await aiSuggestSlot(parsed.specialization, parsed.urgency || "routine");
      await bookAppointment({
        patientId: parsed.patientId || null, doctorId: parsed.doctorId || null,
        patientName: parsed.patientName || "Unknown", doctorName: parsed.doctorName || "TBD",
        specialization: parsed.specialization || "General Physician",
        appointmentDate: parsed.date || slot.date, appointmentTime: parsed.time || slot.time,
        reason: parsed.reason || transcript || textInput,
        urgency: parsed.urgency || "routine", status: "scheduled",
      });
      setPhase("done");
      const msg = `Appointment scheduled! ${parsed.patientName || "Patient"} is confirmed for ${fmtDate(parsed.date || slot.date)} at ${fmtTime(parsed.time || slot.time)}.`;
      setAiMsg(msg); speak(msg);
      setTimeout(() => { setPhase("idle"); setTranscript(""); setTextInput(""); setParsed(null); setAiMsg("Appointment booked! Tap the mic to book another."); onBooked(); }, 3000);
    } catch {
      setError("Booking failed. Check backend."); setPhase("idle");
    }
  };

  const reset = () => { setPhase("idle"); setTranscript(""); setTextInput(""); setParsed(null); setError(""); setAiMsg("Hi! Tap the mic or type your appointment details below."); };
  const pulseStyle = phase === "listening" ? { boxShadow: `0 0 0 8px ${C.red}22,0 0 0 16px ${C.red}11`, animation: "_pulse 1.2s ease-in-out infinite" } : {};

  return (
    <>
      <style>{`
        @keyframes _pulse{0%,100%{box-shadow:0 0 0 8px ${C.red}22,0 0 0 16px ${C.red}11}50%{box-shadow:0 0 0 14px ${C.red}18,0 0 0 26px ${C.red}08}}
        @keyframes _float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
        @keyframes _fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
      `}</style>
      <div style={{ background: C.surface, borderRadius: 20, padding: "28px 28px 24px", boxShadow: "0 4px 32px rgba(61,111,248,.10)", border: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: C.indigoL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, animation: "_float 3s ease-in-out infinite" }}>🤖</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: C.text }}>AI Voice Assistant</div>
            <div style={{ fontSize: 12, color: C.muted }}>Speak or type — I'll schedule the appointment directly</div>
          </div>
          {phase !== "idle" && <button onClick={reset} style={{ marginLeft: "auto", background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.subtle }}>×</button>}
        </div>
        <div style={{ background: C.blueL, borderRadius: 14, padding: "14px 18px", marginBottom: 20, fontSize: 13, color: C.text, lineHeight: 1.6, borderLeft: `3px solid ${C.blue}`, animation: "_fade .3s ease" }}>
          {phase === "parsing" || phase === "booking" ? <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Spin size={14} /> {aiMsg}</span> : aiMsg}
        </div>
        {transcript && <div style={{ background: C.bg, borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: C.muted, fontStyle: "italic", border: `1px dashed ${C.border}` }}>🎙️ "{transcript}"</div>}
        {phase === "confirming" && parsed && (
          <div style={{ background: C.bg, borderRadius: 14, padding: "16px 18px", marginBottom: 18, border: `1.5px solid ${C.blue}`, animation: "_fade .3s ease" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.blue, marginBottom: 12, textTransform: "uppercase", letterSpacing: ".06em" }}>Confirm Appointment</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
              {[["👤 Patient", parsed.patientName || "To be set"], ["🩺 Specialist", parsed.specialization || "General Physician"], ["📅 Date", parsed.date ? fmtDate(parsed.date) : "AI will suggest"], ["🕐 Time", parsed.time ? fmtTime(parsed.time) : "AI will suggest"], ["📝 Reason", parsed.reason || "—"], ["🚨 Urgency", parsed.urgency || "routine"]].map(([l, v]) => (
                <div key={l}><div style={{ fontSize: 10, color: C.subtle, fontWeight: 700 }}>{l}</div><div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{v}</div></div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={handleConfirm} style={{ flex: 1, background: C.green, color: "#fff", border: "none", borderRadius: 9, padding: "10px 0", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>✅ Confirm & Schedule</button>
              <button onClick={reset} style={{ flex: 1, background: C.bg, color: C.muted, border: `1.5px solid ${C.border}`, borderRadius: 9, padding: "10px 0", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>✏️ Edit</button>
            </div>
          </div>
        )}
        {phase === "done" && <div style={{ background: C.greenL, borderRadius: 12, padding: "14px 18px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10, border: `1px solid ${C.green}40`, animation: "_fade .3s ease" }}><span style={{ fontSize: 24 }}>🎉</span><span style={{ fontSize: 13, fontWeight: 600, color: C.green }}>Appointment scheduled successfully!</span></div>}
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={phase === "listening" ? stopListening : startListening} disabled={phase === "parsing" || phase === "booking" || phase === "confirming"} style={{ width: 52, height: 52, borderRadius: "50%", border: "none", background: phase === "listening" ? C.red : C.blue, color: "#fff", fontSize: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .2s", ...pulseStyle }}>
            {phase === "listening" ? "⏹" : "🎙️"}
          </button>
          <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
            <input value={textInput} onChange={e => setTextInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleParse()} placeholder='Or type: "Book Alice with Cardiologist tomorrow at 10am for chest pain"' style={{ width: "100%", padding: "10px 48px 10px 14px", borderRadius: 10, fontSize: 13, border: `1.5px solid ${C.border}`, background: C.bg, color: C.text, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
            <button onClick={handleParse} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: C.indigo, color: "#fff", border: "none", borderRadius: 7, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Parse</button>
          </div>
        </div>
        {error && <div style={{ marginTop: 12, fontSize: 12, color: C.red, fontWeight: 600 }}>⚠️ {error}</div>}
        <div style={{ marginTop: 16, padding: "10px 14px", background: C.bg, borderRadius: 10, fontSize: 11, color: C.subtle, lineHeight: 1.8 }}>
          💬 <b>Try saying:</b> "Book an urgent appointment for Farhat Khan with a cardiologist tomorrow at 9am for chest pain" · "Schedule routine checkup for Alice next Monday"
        </div>
      </div>
    </>
  );
}

// ── Appointment Card (scheduled/completed/etc.) ───────────────────
function ApptCard({ appt, onCancel, onEdit }) {
  const s = STATUS_META[appt.status] || STATUS_META.scheduled;
  const u = URGENCY_META[appt.urgency] || URGENCY_META.routine;
  const dateStr = appt.appointmentDate?.includes("T") ? appt.appointmentDate.split("T")[0] : appt.appointmentDate;
  const isToday = dateStr === TODAY;

  return (
    <div style={{
      background: C.surface, borderRadius: 16, padding: "18px 20px",
      boxShadow: "0 1px 4px rgba(0,0,0,.05),0 4px 20px rgba(0,0,0,.04)",
      borderLeft: `4px solid ${s.color}`, position: "relative", overflow: "hidden",
      transition: "transform .15s,box-shadow .15s"
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(0,0,0,.09)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,.05),0 4px 20px rgba(0,0,0,.04)"; }}>

      {isToday && <div style={{ position: "absolute", top: 12, right: 12, background: C.amber, color: "#fff", fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 999, letterSpacing: ".05em" }}>TODAY</div>}

      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
        <div style={{ width: 42, height: 42, borderRadius: "50%", flexShrink: 0, background: s.bg, color: s.color, fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>{s.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: C.text, marginBottom: 2 }}>
            {appt.patientName || "Unknown Patient"}
          </div>
          <div style={{ fontSize: 12, color: C.muted }}>
            Dr. {appt.doctorName || "TBD"} · {appt.specialization || "General"}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1, background: C.bg, borderRadius: 8, padding: "8px 12px" }}>
          <div style={{ fontSize: 10, color: C.subtle, fontWeight: 700 }}>DATE</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{fmtDate(appt.appointmentDate)}</div>
        </div>
        <div style={{ flex: 1, background: C.bg, borderRadius: 8, padding: "8px 12px" }}>
          <div style={{ fontSize: 10, color: C.subtle, fontWeight: 700 }}>TIME</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{fmtTime(appt.appointmentTime)}</div>
        </div>
      </div>

      {appt.reason && (
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 12, background: C.bg, borderRadius: 8, padding: "7px 10px" }}>
          📝 {appt.reason}
        </div>
      )}

      {appt.aiSuggestion && <div style={{ fontSize: 11, color: C.indigo, marginBottom: 12, background: C.indigoL, borderRadius: 8, padding: "7px 10px", border: `1px solid ${C.indigo}20` }}>🤖 {appt.aiSuggestion}</div>}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <Pill label={s.label} icon={s.icon} color={s.color} bg={s.bg} />
        <Pill label={u.label} icon={u.icon} color={u.color} bg={u.bg} />
      </div>

      {appt.status !== "cancelled" && appt.status !== "completed" && appt.status !== "requested" && (
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => onEdit(appt)} style={{ flex: 1, background: C.blueL, color: C.blue, border: "none", borderRadius: 8, padding: "7px 0", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✏️ Edit</button>
          <button onClick={() => onCancel(appt)} style={{ flex: 1, background: C.redL, color: C.red, border: "none", borderRadius: 8, padding: "7px 0", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>❌ Cancel</button>
        </div>
      )}
    </div>
  );
}

// ── FIX 2: Request Card — approve / reject / assign doctor ────────
function RequestCard({ appt, doctors, onApprove, onReject }) {
  const u = URGENCY_META[appt.urgency] || URGENCY_META.routine;
  const dateStr = appt.appointmentDate?.includes("T") ? appt.appointmentDate.split("T")[0] : appt.appointmentDate;
  const isToday = dateStr === TODAY;

  const [selectedDoctor, setSelectedDoctor] = useState(appt.doctorId ? String(appt.doctorId) : "");
  const [acting, setActing] = useState(null); // "approve" | "reject"

  const handleApprove = async () => {
    setActing("approve");
    await onApprove(appt, selectedDoctor);
    setActing(null);
  };

  const handleReject = async () => {
    setActing("reject");
    await onReject(appt);
    setActing(null);
  };

  return (
    <div style={{
      background: C.surface, borderRadius: 16, padding: "18px 20px",
      boxShadow: "0 1px 4px rgba(0,0,0,.05),0 4px 20px rgba(0,0,0,.04)",
      borderLeft: `4px solid ${C.amber}`, position: "relative",
      transition: "transform .15s,box-shadow .15s"
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(0,0,0,.09)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,.05),0 4px 20px rgba(0,0,0,.04)"; }}>

      {/* Request badge */}
      <div style={{ position: "absolute", top: 12, right: 12, background: C.amberL, color: C.amber, fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 999, border: `1px solid ${C.amber}40` }}>
        PATIENT REQUEST
      </div>
      {isToday && (
        <div style={{ position: "absolute", top: 32, right: 12, background: C.amber, color: "#fff", fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 999 }}>TODAY</div>
      )}

      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
        <div style={{ width: 42, height: 42, borderRadius: "50%", flexShrink: 0, background: C.amberL, color: C.amber, fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>⏳</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: C.text, marginBottom: 2 }}>
            {appt.patientName || "Unknown Patient"}
          </div>
          <div style={{ fontSize: 12, color: C.muted }}>
            {appt.specialization || "General"} · {appt.doctorName ? `Prefers Dr. ${appt.doctorName}` : "No doctor preference"}
          </div>
        </div>
      </div>

      {/* Date / Time */}
      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1, background: C.bg, borderRadius: 8, padding: "8px 12px" }}>
          <div style={{ fontSize: 10, color: C.subtle, fontWeight: 700 }}>REQUESTED DATE</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{fmtDate(appt.appointmentDate)}</div>
        </div>
        <div style={{ flex: 1, background: C.bg, borderRadius: 8, padding: "8px 12px" }}>
          <div style={{ fontSize: 10, color: C.subtle, fontWeight: 700 }}>REQUESTED TIME</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{fmtTime(appt.appointmentTime)}</div>
        </div>
      </div>

      {/* Reason */}
      {appt.reason && (
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 12, background: C.bg, borderRadius: 8, padding: "7px 10px" }}>
          📝 {appt.reason}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <Pill label="Pending Approval" icon="⏳" color={C.amber} bg={C.amberL} />
        <Pill label={u.label} icon={u.icon} color={u.color} bg={u.bg} />
      </div>

      {/* ✅ FIX 2: Assign doctor dropdown + approve/reject actions */}
      <div style={{ background: C.amberL, borderRadius: 12, padding: "14px 16px", border: `1px solid ${C.amber}30` }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.amber, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>
          Admin Action Required
        </div>

        {/* Doctor assignment */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: ".05em" }}>
            Assign Doctor
          </label>
          <select
            value={selectedDoctor}
            onChange={e => setSelectedDoctor(e.target.value)}
            style={{
              width: "100%", padding: "8px 10px", borderRadius: 8, fontSize: 13,
              border: `1.5px solid ${C.border}`, background: C.surface, color: C.text,
              fontFamily: "inherit", outline: "none", boxSizing: "border-box",
            }}
          >
            <option value="">— Select doctor —</option>
            {doctors.map(d => (
              <option key={d.id} value={String(d.id)}>
                Dr. {d.name}{d.specialization ? ` · ${d.specialization}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleApprove}
            disabled={!!acting}
            style={{
              flex: 2, background: acting === "approve" ? C.green + "90" : C.green,
              color: "#fff", border: "none", borderRadius: 9, padding: "9px 0",
              fontSize: 12, fontWeight: 700, cursor: acting ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            {acting === "approve" ? <><Spin color="#fff" size={12} /> Approving…</> : "✅ Approve & Schedule"}
          </button>
          <button
            onClick={handleReject}
            disabled={!!acting}
            style={{
              flex: 1, background: acting === "reject" ? C.redL : C.redL,
              color: C.red, border: `1.5px solid ${C.red}40`, borderRadius: 9, padding: "9px 0",
              fontSize: 12, fontWeight: 700, cursor: acting ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            {acting === "reject" ? <><Spin color={C.red} size={12} /> Rejecting…</> : "❌ Reject"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Book/Edit Modal ───────────────────────────────────────────────
function BookModal({ initial, patients, doctors, onSave, onClose }) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState({
    patientId: "", patientName: "", doctorId: "", doctorName: "",
    specialization: "", appointmentDate: TODAY, appointmentTime: "09:00",
    reason: "", urgency: "routine", status: "scheduled",
    ...(initial || {}),
  });
  const [loading, setLoading] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  const set = k => e => {
    const v = e.target.value;
    setForm(f => {
      const next = { ...f, [k]: v };
      if (k === "patientId") { const p = patients.find(p => String(p.id) === v); if (p) next.patientName = p.name; }
      if (k === "doctorId") { const d = doctors.find(d => String(d.id) === v); if (d) { next.doctorName = d.name; next.specialization = d.specialization || ""; } }
      return next;
    });
  };

  const suggestSlot = async () => {
    setSuggesting(true);
    const slot = await aiSuggestSlot(form.specialization, form.urgency);
    setForm(f => ({ ...f, appointmentDate: slot.date, appointmentTime: slot.time }));
    setSuggesting(false);
  };

  const handleSave = async () => {
    if (!form.patientName || !form.appointmentDate) { alert("Patient and date are required."); return; }
    setLoading(true);
    try {
      if (isEdit) await updateAppointment(initial.id, form);
      else await bookAppointment(form);
      onSave();
    } catch { alert("Failed to save. Check backend."); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(11,20,55,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, backdropFilter: "blur(6px)" }} onClick={onClose}>
      <div style={{ background: C.surface, borderRadius: 20, padding: "30px 34px", width: 520, maxWidth: "93vw", maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,.22)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: C.blueL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{isEdit ? "✏️" : "📅"}</div>
          <div><div style={{ fontWeight: 800, fontSize: 17, color: C.text }}>{isEdit ? "Edit Appointment" : "Book Appointment"}</div><div style={{ fontSize: 12, color: C.muted }}>{isEdit ? "Update appointment details" : "Manual booking form"}</div></div>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", fontSize: 22, cursor: "pointer", color: C.subtle }}>×</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ gridColumn: "1/-1" }}><Inp label="Patient" value={form.patientId} onChange={set("patientId")} options={[{ value: "", label: "Select patient…" }, ...patients.map(p => ({ value: String(p.id), label: p.name }))]} icon="👤" /></div>
          <div style={{ gridColumn: "1/-1" }}><Inp label="Doctor" value={form.doctorId} onChange={set("doctorId")} options={[{ value: "", label: "Select doctor…" }, ...doctors.map(d => ({ value: String(d.id), label: `Dr. ${d.name} — ${d.specialization || ""}` }))]} icon="🩺" /></div>
          <Inp label="Specialization" value={form.specialization} onChange={set("specialization")} placeholder="Cardiology" icon="🔬" />
          <Inp label="Urgency" value={form.urgency} onChange={set("urgency")} options={[{ value: "routine", label: "🗓️ Routine" }, { value: "urgent", label: "🚨 Urgent" }, { value: "follow-up", label: "🔄 Follow-up" }]} icon="⚡" />
          <Inp label="Date" value={form.appointmentDate} onChange={set("appointmentDate")} type="date" icon="📅" />
          <Inp label="Time" value={form.appointmentTime} onChange={set("appointmentTime")} type="time" icon="🕐" />
          {isEdit && <div style={{ gridColumn: "1/-1" }}><Inp label="Status" value={form.status} onChange={set("status")} options={[{ value: "scheduled", label: "📅 Scheduled" }, { value: "confirmed", label: "✅ Confirmed" }, { value: "completed", label: "✅ Completed" }, { value: "cancelled", label: "❌ Cancelled" }, { value: "no-show", label: "⏰ No Show" }]} icon="🔘" /></div>}
          <div style={{ gridColumn: "1/-1" }}><Inp label="Reason / Chief Complaint" value={form.reason} onChange={set("reason")} placeholder="e.g. Chest pain, routine checkup" icon="📝" /></div>
        </div>
        <button onClick={suggestSlot} disabled={suggesting} style={{ width: "100%", marginTop: 14, background: C.indigoL, color: C.indigo, border: `1.5px solid ${C.indigo}40`, borderRadius: 10, padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {suggesting ? <><Spin color={C.indigo} size={14} /> Finding best slot…</> : "✨ AI: Suggest Best Slot"}
        </button>
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button onClick={handleSave} disabled={loading} style={{ flex: 1, background: loading ? C.subtle : C.blue, color: "#fff", border: "none", borderRadius: 10, padding: "12px 0", fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {loading ? <><Spin color="#fff" size={14} /> Saving…</> : (isEdit ? "💾 Save Changes" : "📅 Book Appointment")}
          </button>
          <button onClick={onClose} style={{ flex: 1, background: C.bg, color: C.muted, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "12px 0", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function Appointments() {
  const { user } = useContext(AuthContext);

  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients]         = useState([]);
  const [doctors, setDoctors]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState("all");
  const [search, setSearch]             = useState("");
  const [showBook, setShowBook]         = useState(false);
  const [editing, setEditing]           = useState(null);

  // ✅ FIX 4: Spring Boot API only — no Supabase reads, no dual-write merge
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [apiAppts, pList, dList] = await Promise.all([
        getAllAppointments().catch(() => []),
        getAllPatients().catch(() => []),
        getDoctors().catch(() => []),
      ]);

      setPatients(Array.isArray(pList) ? pList : []);
      setDoctors(Array.isArray(dList) ? dList : []);
      setAppointments(Array.isArray(apiAppts) ? apiAppts : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, []);

  // ✅ FIX 4: Cancel always uses Spring Boot API only
  const handleCancel = async (appt) => {
    if (!window.confirm("Cancel this appointment?")) return;
    try {
      await cancelAppointment(appt.id);
      fetchAll();
    } catch { alert("Failed to cancel."); }
  };

  // ✅ FIX 2: Approve a patient request → set status "scheduled" and assign doctor
  const handleApprove = async (appt, doctorId) => {
    try {
      const selectedDoctor = doctorId ? doctors.find(d => String(d.id) === doctorId) : null;
      await updateAppointment(appt.id, {
        ...appt,
        status:     "scheduled",
        doctorId:   selectedDoctor?.id   || appt.doctorId,
        doctorName: selectedDoctor?.name || appt.doctorName,
      });
      fetchAll();
    } catch { alert("Failed to approve request."); }
  };

  // ✅ FIX 2: Reject a patient request → set status "cancelled"
  const handleReject = async (appt) => {
    if (!window.confirm("Reject this appointment request?")) return;
    try {
      await updateAppointment(appt.id, { ...appt, status: "cancelled" });
      fetchAll();
    } catch { alert("Failed to reject request."); }
  };

  // Split appointments: requests vs rest
  const requests = appointments.filter(a => a.status === "requested");

  const filtered = appointments.filter(a => {
    // ✅ FIX 2: "requests" tab shows only requested; all other filters exclude requested
    if (filter === "requests") return a.status === "requested";

    // Exclude requests from all other tabs
    if (a.status === "requested") return false;

    const dateStr = a.appointmentDate?.includes("T") ? a.appointmentDate.split("T")[0] : a.appointmentDate;
    const matchSearch = !search ||
      a.patientName?.toLowerCase().includes(search.toLowerCase()) ||
      a.doctorName?.toLowerCase().includes(search.toLowerCase()) ||
      a.specialization?.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all"      ? true :
      filter === "today"    ? dateStr === TODAY :
      filter === "upcoming" ? dateStr >= TODAY && a.status === "scheduled" :
      a.status === filter;
    return matchSearch && matchFilter;
  }).sort((a, b) => {
    const da = a.appointmentDate?.split("T")[0] || "";
    const db = b.appointmentDate?.split("T")[0] || "";
    if (da !== db) return da > db ? 1 : -1;
    return (a.appointmentTime || "") > (b.appointmentTime || "") ? 1 : -1;
  });

  const nonRequested = appointments.filter(a => a.status !== "requested");

  const stats = {
    total:     nonRequested.length,
    requests:  requests.length,
    today:     nonRequested.filter(a => (a.appointmentDate?.split("T")[0] || a.appointmentDate) === TODAY).length,
    scheduled: nonRequested.filter(a => a.status === "scheduled").length,
    urgent:    nonRequested.filter(a => (a.urgency === "urgent" || a.urgency === "emergency") && a.status === "scheduled").length,
  };

  // ✅ FIX 2: "Requests" tab added with count badge
  const FILTERS = [
    { key: "requests",  label: "⏳ Requests",  count: stats.requests,  highlight: stats.requests > 0 },
    { key: "all",       label: "All",           count: nonRequested.length },
    { key: "today",     label: "Today",         count: stats.today },
    { key: "upcoming",  label: "Upcoming",      count: stats.scheduled },
    { key: "scheduled", label: "Scheduled",     count: null },
    { key: "completed", label: "Completed",     count: null },
    { key: "cancelled", label: "Cancelled",     count: null },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Header user={user} />
        <main style={{ flex: 1, padding: "28px 32px", maxWidth: 1400, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>

          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: 0, letterSpacing: "-.02em" }}>Appointments</h1>
              <p style={{ fontSize: 14, color: C.muted, marginTop: 4 }}>AI-powered scheduling · voice booking · patient request approvals</p>
            </div>
            <button onClick={() => { setEditing(null); setShowBook(true); }} style={{ background: C.blue, color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              📅 Book Manually
            </button>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
            {/* ✅ FIX 2: Requests stat card */}
            {[
              { label: "Requests",  value: stats.requests,  color: C.amber, bg: C.amberL },
              { label: "Total",     value: stats.total,     color: C.blue,  bg: C.blueL  },
              { label: "Today",     value: stats.today,     color: C.indigo, bg: C.indigoL },
              { label: "Scheduled", value: stats.scheduled, color: C.green, bg: C.greenL },
              { label: "Urgent",    value: stats.urgent,    color: C.red,   bg: C.redL   },
            ].map(s => (
              <div key={s.label} style={{ background: s.bg, color: s.color, borderRadius: 12, padding: "10px 20px", display: "flex", alignItems: "center", gap: 10, fontWeight: 700, boxShadow: "0 1px 4px rgba(0,0,0,.05)", cursor: s.label === "Requests" && stats.requests > 0 ? "pointer" : "default" }}
                onClick={() => s.label === "Requests" && setFilter("requests")}>
                <span style={{ fontSize: 24, fontWeight: 800 }}>{s.value}</span>
                <span style={{ fontSize: 13, opacity: .75 }}>{s.label}</span>
                {s.label === "Requests" && stats.requests > 0 && <span style={{ fontSize: 10, background: C.amber, color: "#fff", padding: "2px 6px", borderRadius: 99, fontWeight: 800 }}>ACTION NEEDED</span>}
              </div>
            ))}
          </div>

          {/* Voice AI */}
          <div style={{ marginBottom: 24 }}>
            <VoiceAssistant doctors={doctors} patients={patients} onBooked={fetchAll} />
          </div>

          {/* Filter tabs + search */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {FILTERS.map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)} style={{
                  background: filter === f.key ? (f.key === "requests" ? C.amber : C.blue) : C.surface,
                  color: filter === f.key ? "#fff" : C.muted,
                  border: `1.5px solid ${filter === f.key ? (f.key === "requests" ? C.amber : C.blue) : f.highlight ? C.amber : C.border}`,
                  borderRadius: 9, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 5
                }}>
                  {f.label}
                  {f.count != null && (
                    <span style={{
                      background: filter === f.key ? "rgba(255,255,255,.25)" : f.highlight ? C.amber : C.blueL,
                      color: filter === f.key ? "#fff" : f.highlight ? "#fff" : C.blue,
                      fontSize: 10, fontWeight: 800, padding: "1px 6px", borderRadius: 99
                    }}>{f.count}</span>
                  )}
                </button>
              ))}
            </div>
            {filter !== "requests" && (
              <div style={{ flex: 1, minWidth: 200 }}>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by patient, doctor, or specialization…" style={{ width: "100%", padding: "8px 14px", borderRadius: 9, fontSize: 13, border: `1.5px solid ${C.border}`, background: C.surface, color: C.text, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
              </div>
            )}
          </div>

          {/* Grid */}
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: 64, color: C.muted }}>
              <Spin size={40} /><span style={{ fontSize: 14 }}>Loading appointments…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 64 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>
                {filter === "requests" ? "✅" : "📭"}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.muted }}>
                {filter === "requests" ? "No pending requests" : "No appointments found"}
              </div>
              <div style={{ fontSize: 13, color: C.subtle, marginTop: 6 }}>
               {filter === requests 
               ? "All patient requests have been handled." 
               : "Use the voice assistant above or click Book Manually to schedule one."
                }
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 18 }}>
              {/* ✅ FIX 2: Request cards rendered for the Requests tab */}
              {filter === "requests"
                ? filtered.map(a => (
                    <RequestCard
                      key={a.id}
                      appt={a}
                      doctors={doctors}
                      onApprove={handleApprove}
                      onReject={handleReject}
                    />
                  ))
                : filtered.map(a => (
                    <ApptCard
                      key={a.id}
                      appt={a}
                      onCancel={handleCancel}
                      onEdit={appt => { setEditing(appt); setShowBook(true); }}
                    />
                  ))
              }
            </div>
          )}
        </main>
      </div>

      {showBook && (
        <BookModal initial={editing} patients={patients} doctors={doctors}
          onSave={() => { setShowBook(false); setEditing(null); fetchAll(); }}
          onClose={() => { setShowBook(false); setEditing(null); }} />
      )}
    </div>
  );
}
