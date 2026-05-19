// src/pages/DoctorDashboard.jsx
// ✅ FIX 3: TodaySchedule and DoctorAppointments only show status IN ("scheduled","confirmed")
//           — "requested" appointments are invisible to doctors until admin approves them

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

const C = {
  navy:"#0B1437", teal:"#0D9488", tealLt:"#F0FDFA", tealMid:"#99F6E4",
  blue:"#2563EB", blueLt:"#EFF6FF", red:"#DC2626", redLt:"#FEF2F2",
  amber:"#D97706", amberLt:"#FFFBEB", green:"#059669", greenLt:"#F0FDF4",
  purple:"#7C3AED", purpleLt:"#F5F3FF", slate:"#64748B", border:"#E2E8F0",
  bg:"#F8FAFC", white:"#FFFFFF",
};
const font = "'Segoe UI', system-ui, sans-serif";

const parseDbId = (id) => {
  if (id == null) return null;
  const str = String(id).split(":")[0];
  const n = parseInt(str, 10);
  return isNaN(n) ? null : n;
};

// ── Shared UI ────────────────────────────────────────────────────
const Badge = ({ color=C.teal, bg=C.tealLt, children }) => (
  <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 10px", borderRadius:99, background:bg, color, fontSize:11, fontWeight:700, letterSpacing:".04em", textTransform:"uppercase" }}>{children}</span>
);
const RiskBadge = ({ risk }) => {
  const map = { high:{color:C.red,bg:C.redLt,label:"High Risk"}, medium:{color:C.amber,bg:C.amberLt,label:"Medium"}, low:{color:C.green,bg:C.greenLt,label:"Low"} };
  const s = map[risk?.toLowerCase()] || map.low;
  return <Badge color={s.color} bg={s.bg}>{s.label}</Badge>;
};
const Card = ({ children, style={} }) => (
  <div style={{ background:C.white, borderRadius:16, border:`1px solid ${C.border}`, boxShadow:"0 2px 12px rgba(0,0,0,.04)", ...style }}>{children}</div>
);
const EmptyState = ({ icon, title, sub }) => (
  <div style={{ textAlign:"center", padding:"52px 24px", color:C.slate }}>
    <div style={{ fontSize:48, marginBottom:12 }}>{icon}</div>
    <div style={{ fontSize:16, fontWeight:700, color:C.navy, marginBottom:6 }}>{title}</div>
    <div style={{ fontSize:13 }}>{sub}</div>
  </div>
);
const Spinner = ({ size=20 }) => (
  <><div style={{ width:size, height:size, borderRadius:"50%", border:`2px solid ${C.border}`, borderTopColor:C.teal, animation:"_sp .7s linear infinite", flexShrink:0 }} /><style>{`@keyframes _sp{to{transform:rotate(360deg)}}`}</style></>
);
const LoadingBlock = ({ rows=4 }) => (
  <div style={{ padding:24 }}>
    {Array.from({length:rows}).map((_,i)=>(
      <div key={i} style={{ height:56, borderRadius:10, marginBottom:12, background:"linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize:"200% 100%", animation:"_sh 1.4s ease infinite", animationDelay:`${i*.1}s` }} />
    ))}
    <style>{`@keyframes _sh{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
  </div>
);
const Avatar = ({ name="?", size=36, bg=C.teal }) => {
  const initials = (name||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  return <div style={{ width:size, height:size, borderRadius:"50%", background:bg, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*.38, fontWeight:700, flexShrink:0 }}>{initials}</div>;
};
const StatCard = ({ icon, label, value, sub, accent=C.teal }) => (
  <Card style={{ padding:"20px 22px", flex:1, minWidth:130 }}>
    <div style={{ width:40, height:40, borderRadius:12, background:accent+"18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, marginBottom:12 }}>{icon}</div>
    <div style={{ fontSize:11, fontWeight:700, color:C.slate, textTransform:"uppercase", letterSpacing:".06em", marginBottom:4 }}>{label}</div>
    <div style={{ fontSize:28, fontWeight:800, color:C.navy, lineHeight:1 }}>{value}</div>
    {sub && <div style={{ fontSize:11, color:C.slate, marginTop:4 }}>{sub}</div>}
  </Card>
);
const lbl = { fontSize:11, fontWeight:700, color:C.slate, display:"block", textTransform:"uppercase", letterSpacing:".06em", marginBottom:6 };
const inp = { width:"100%", boxSizing:"border-box", padding:"10px 13px", borderRadius:10, border:`1.5px solid ${C.border}`, fontSize:13, color:C.navy, background:C.bg, fontFamily:font, outline:"none" };

// ── Notification Panel ────────────────────────────────────────────
function NotifPanel({ open, onClose, notifications, onMarkRead, onClearAll }) {
  if (!open) return null;
  return (
    <div style={{ position:"fixed", inset:0, zIndex:400 }} onClick={onClose}>
      <div style={{ position:"absolute", top:68, right:20, width:360, background:C.white, borderRadius:16, boxShadow:"0 8px 40px rgba(0,0,0,.18)", border:`1px solid ${C.border}`, overflow:"hidden" }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:"14px 18px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontWeight:800, fontSize:14, color:C.navy }}>🔔 Notifications</span>
          <div style={{ display:"flex", gap:8 }}>
            {notifications.length>0&&<button onClick={onClearAll} style={{ fontSize:11, color:C.slate, background:"none", border:"none", cursor:"pointer", fontWeight:600 }}>Mark all read</button>}
            <button onClick={onClose} style={{ fontSize:18, color:C.slate, background:"none", border:"none", cursor:"pointer" }}>×</button>
          </div>
        </div>
        <div style={{ maxHeight:440, overflowY:"auto" }}>
          {notifications.length===0?(
            <div style={{ padding:"36px 18px", textAlign:"center", color:C.slate, fontSize:13 }}>
              <div style={{ fontSize:36, marginBottom:10 }}>🔔</div>No notifications yet
            </div>
          ):notifications.map((n,i)=>(
            <div key={n.id||i} onClick={()=>onMarkRead(n.id)} style={{ padding:"12px 18px", borderBottom:`1px solid ${C.border}`, background:n.read?C.white:n.type==="high_risk"?C.redLt:n.type==="verified"?C.greenLt:C.blueLt, cursor:"pointer", transition:"background .15s" }}>
              <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                <span style={{ fontSize:18, flexShrink:0 }}>{n.type==="high_risk"?"🚨":n.type==="report_ready"?"📄":n.type==="verified"?"✅":"🔔"}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:C.navy }}>{n.title}</div>
                  <div style={{ fontSize:11, color:C.slate, marginTop:2, lineHeight:1.45 }}>{n.message}</div>
                  <div style={{ fontSize:10, color:C.slate, marginTop:4, opacity:.65 }}>{n.time}</div>
                </div>
                {!n.read&&<div style={{ width:7, height:7, borderRadius:"50%", background:C.teal, flexShrink:0, marginTop:5 }} />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Patient Queue ─────────────────────────────────────────────────
function PatientQueue({ doctorDbId, doctorEmail }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [reviewed, setReviewed] = useState({});
  const [filter, setFilter]     = useState("all");

  useEffect(()=>{
    (async()=>{
      setLoading(true);
      let data = [];
      if (doctorDbId) {
        const { data: assigned } = await supabase
          .from("patients")
          .select("*")
          .eq("doctor_id", doctorDbId)
          .order("created_at", { ascending: false });
        data = assigned || [];
      }
      setPatients(data);
      setLoading(false);
    })();
  },[doctorDbId]);

  const markReviewed = async (id) => {
    await supabase.from("patients").update({ ai_verified:true, verified_by:doctorEmail }).eq("id",id);
    setReviewed(r=>({...r,[id]:true}));
    setPatients(p=>p.map(pt=>pt.id===id?{...pt,ai_verified:true}:pt));
  };

  const filtered = patients.filter(p=>{
    if(filter==="high")    return p.risk_level?.toLowerCase()==="high";
    if(filter==="pending") return !p.ai_verified;
    return true;
  });
  const highCount    = patients.filter(p=>p.risk_level?.toLowerCase()==="high").length;
  const pendingCount = patients.filter(p=>!p.ai_verified).length;

  return (
    <div>
      <div style={{ display:"flex", gap:14, marginBottom:24, flexWrap:"wrap" }}>
        <StatCard icon="❤️" label="My Patients"    value={patients.length} sub="Assigned to you" accent={C.teal} />
        <StatCard icon="⚠️" label="High Risk"      value={highCount}       sub="Need attention"  accent={C.red}  />
        <StatCard icon="🔍" label="Pending Review" value={pendingCount}    sub="AI unverified"   accent={C.amber}/>
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:18 }}>
        {[{key:"all",label:"All Patients"},{key:"high",label:`High Risk (${highCount})`},{key:"pending",label:`Pending Review (${pendingCount})`}].map(f=>(
          <button key={f.key} onClick={()=>setFilter(f.key)} style={{ padding:"7px 16px", borderRadius:99, border:"1.5px solid", borderColor:filter===f.key?C.teal:C.border, background:filter===f.key?C.teal:C.white, color:filter===f.key?"#fff":C.slate, fontSize:12, fontWeight:700, cursor:"pointer", transition:"all .15s" }}>{f.label}</button>
        ))}
      </div>
      {loading?<LoadingBlock />:filtered.length===0?<EmptyState icon="✅" title="All caught up!" sub="No patients match this filter." />:(
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {filtered.map(p=>(
            <Card key={p.id} style={{ padding:"16px 20px", display:"flex", alignItems:"center", gap:16 }}>
              <Avatar name={p.name||p.full_name||"P"} size={44} bg={p.risk_level?.toLowerCase()==="high"?C.red:p.risk_level?.toLowerCase()==="medium"?C.amber:C.teal} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, color:C.navy, fontSize:14, marginBottom:3 }}>{p.name||p.full_name||"Unnamed Patient"}</div>
                <div style={{ fontSize:12, color:C.slate, display:"flex", gap:12, flexWrap:"wrap" }}>
                  {p.age&&<span>Age {p.age}</span>}{p.gender&&<span>{p.gender}</span>}{p.diagnosis&&<span>· {p.diagnosis}</span>}
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
                <RiskBadge risk={p.risk_level} />
                {p.ai_verified||reviewed[p.id]
                  ?<Badge color={C.green} bg={C.greenLt}>✓ Verified</Badge>
                  :<button onClick={()=>markReviewed(p.id)} style={{ padding:"7px 14px", borderRadius:10, border:"none", background:C.teal, color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>Verify AI</button>
                }
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Today's Schedule ──────────────────────────────────────────────
function TodaySchedule({ doctorDbId }) {
  const [appts, setAppts]     = useState([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split("T")[0];

  useEffect(()=>{
    (async()=>{
      setLoading(true);

      // ✅ FIX 3: Only fetch appointments with status "scheduled" or "confirmed"
      //    "requested" appointments must NOT appear in the doctor's schedule — they
      //    haven't been approved by admin yet.
      let q = supabase
        .from("appointments")
        .select("*, patients(id, name, full_name, risk_level, age, gender, email)")
        .eq("appointment_date", today)
        .in("status", ["scheduled", "confirmed"])   // ← key change
        .order("appointment_time", { ascending: true });

      if (doctorDbId) q = q.eq("doctor_id", doctorDbId);

      const { data, error } = await q;
      if (error) console.error("TodaySchedule error:", error);
      setAppts(data || []);
      setLoading(false);
    })();
  },[doctorDbId, today]);

  const updateStatus = async (id, status) => {
    await supabase.from("appointments").update({ status }).eq("id", id);
    setAppts(a => a.map(ap => ap.id===id ? {...ap, status} : ap));
  };

  const fmtTime = (t) => {
    if (!t) return "—";
    const [h, m] = t.split(":").map(Number);
    return `${h%12||12}:${String(m).padStart(2,"0")} ${h<12?"AM":"PM"}`;
  };

  const getPatientName = (a) =>
    a.patients?.name || a.patients?.full_name ||
    extractPatientName(a.notes) ||
    a.patient_name ||
    `Patient #${a.patient_id}`;

  const now = new Date();
  const upcoming = appts.filter(a => {
    if (!a.appointment_time) return true;
    const [h,m] = a.appointment_time.split(":").map(Number);
    const dt = new Date(); dt.setHours(h,m,0,0);
    return dt >= now;
  });
  const past = appts.filter(a => {
    if (!a.appointment_time) return false;
    const [h,m] = a.appointment_time.split(":").map(Number);
    const dt = new Date(); dt.setHours(h,m,0,0);
    return dt < now;
  });

  return (
    <div>
      <div style={{ display:"flex", gap:14, marginBottom:24, flexWrap:"wrap" }}>
        <StatCard icon="📅" label="Total Today" value={appts.length}    sub="Confirmed"    accent={C.blue}  />
        <StatCard icon="⏭️" label="Upcoming"    value={upcoming.length} sub="Still to come" accent={C.teal}  />
        <StatCard icon="✅" label="Completed"   value={past.length}     sub="Done today"   accent={C.green} />
      </div>
      {loading?<LoadingBlock />:appts.length===0?(
        <EmptyState icon="📭" title="No confirmed appointments today" sub="Your schedule is clear. Pending patient requests are awaiting admin approval." />
      ):(
        <>
          {upcoming.length>0&&(
            <>
              <div style={{ fontSize:12, fontWeight:700, color:C.slate, textTransform:"uppercase", letterSpacing:".06em", marginBottom:10 }}>Upcoming</div>
              <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:24 }}>
                {upcoming.map(a=><ApptRow key={a.id} appt={a} patientName={getPatientName(a)} onStatusChange={updateStatus} fmtTime={fmtTime} highlight />)}
              </div>
            </>
          )}
          {past.length>0&&(
            <>
              <div style={{ fontSize:12, fontWeight:700, color:C.slate, textTransform:"uppercase", letterSpacing:".06em", marginBottom:10 }}>Earlier today</div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {past.map(a=><ApptRow key={a.id} appt={a} patientName={getPatientName(a)} onStatusChange={updateStatus} fmtTime={fmtTime} />)}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── String extraction helpers ─────────────────────────────────────
function extractPatientName(notes = "") {
  const match = notes.match(/Patient:\s*(.*?)(\||$)/i);
  return match?.[1]?.trim() || null;
}

function extractSpecialization(notes = "") {
  const match = notes.match(/Specialization:\s*(.*?)(\||$)/i);
  return match?.[1]?.trim() || "";
}

function extractReason(notes = "") {
  const match = notes.match(/Reason:\s*(.*?)(\||$)/i);
  return match?.[1]?.trim() || "";
}

// ── All Patients — only patients assigned to THIS doctor ──────────
function AllPatients({ doctorDbId }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [riskFilter, setRisk]   = useState("all");
  const [selected, setSelected] = useState(null);

  useEffect(()=>{
    // ✅ Only load patients assigned to this doctor via doctor_id
    // Each doctor sees ONLY their own patients — not the full list
    let q = supabase.from("patients").select("*").order("created_at",{ascending:false});
    if (doctorDbId) q = q.eq("doctor_id", doctorDbId);
    q.then(({data})=>{ setPatients(data||[]); setLoading(false); });
  },[doctorDbId]);

  const filtered = patients.filter(p=>{
    const name=(p.name||p.full_name||"").toLowerCase();
    return (!search||name.includes(search.toLowerCase())||(p.email||"").toLowerCase().includes(search.toLowerCase())||(p.diagnosis||"").toLowerCase().includes(search.toLowerCase()))
      &&(riskFilter==="all"||p.risk_level?.toLowerCase()===riskFilter);
  });

  return (
    <div>
      <div style={{ display:"flex", gap:14, marginBottom:24, flexWrap:"wrap" }}>
        <StatCard icon="👥" label="Total Patients" value={patients.length} accent={C.blue} />
        <StatCard icon="🔴" label="High Risk"   value={patients.filter(p=>p.risk_level?.toLowerCase()==="high").length}   accent={C.red}   />
        <StatCard icon="🟡" label="Medium Risk"  value={patients.filter(p=>p.risk_level?.toLowerCase()==="medium").length} accent={C.amber} />
        <StatCard icon="🟢" label="Low Risk"    value={patients.filter(p=>p.risk_level?.toLowerCase()==="low").length}    accent={C.green} />
      </div>
      <div style={{ display:"flex", gap:10, marginBottom:18, flexWrap:"wrap" }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Search by name, email, diagnosis…" style={{ flex:1, minWidth:220, padding:"10px 14px", borderRadius:10, border:`1.5px solid ${C.border}`, fontSize:13, color:C.navy, background:C.bg, fontFamily:font, outline:"none" }} />
        <select value={riskFilter} onChange={e=>setRisk(e.target.value)} style={{ padding:"10px 14px", borderRadius:10, border:`1.5px solid ${C.border}`, fontSize:13, color:C.navy, background:C.bg, fontFamily:font, cursor:"pointer", outline:"none" }}>
          <option value="all">All Risk Levels</option><option value="high">High Risk</option><option value="medium">Medium Risk</option><option value="low">Low Risk</option>
        </select>
      </div>
      {loading?<LoadingBlock />:filtered.length===0?<EmptyState icon="🔍" title="No patients found" sub="Try adjusting your search or filters." />:(
        <>
          <div style={{ fontSize:12, color:C.slate, marginBottom:10 }}>Showing {filtered.length} of {patients.length} patients</div>
          <Card><div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:font }}>
              <thead><tr style={{ background:C.bg }}>{["Patient","Age / Gender","Diagnosis","Risk","AI Verified","Actions"].map(h=><th key={h} style={{ padding:"12px 16px", textAlign:"left", fontSize:11, fontWeight:700, color:C.slate, textTransform:"uppercase", letterSpacing:".06em", borderBottom:`1px solid ${C.border}` }}>{h}</th>)}</tr></thead>
              <tbody>
                {filtered.map((p,i)=>(
                  <tr key={p.id} style={{ background:i%2===0?C.white:"#FAFBFC" }} onMouseEnter={e=>e.currentTarget.style.background=C.tealLt} onMouseLeave={e=>e.currentTarget.style.background=i%2===0?C.white:"#FAFBFC"}>
                    <td style={{ padding:"12px 16px", borderBottom:`1px solid ${C.border}` }}><div style={{ display:"flex", alignItems:"center", gap:10 }}><Avatar name={p.name||p.full_name||"P"} size={32} /><div><div style={{ fontSize:13, fontWeight:700, color:C.navy }}>{p.name||p.full_name||"—"}</div><div style={{ fontSize:11, color:C.slate }}>{p.email||"—"}</div></div></div></td>
                    <td style={{ padding:"12px 16px", borderBottom:`1px solid ${C.border}`, fontSize:13, color:C.navy }}>{p.age?`${p.age} yrs`:"—"}{p.gender?` · ${p.gender}`:""}</td>
                    <td style={{ padding:"12px 16px", borderBottom:`1px solid ${C.border}`, fontSize:13, color:C.slate }}>{p.diagnosis||"—"}</td>
                    <td style={{ padding:"12px 16px", borderBottom:`1px solid ${C.border}` }}><RiskBadge risk={p.risk_level} /></td>
                    <td style={{ padding:"12px 16px", borderBottom:`1px solid ${C.border}` }}>{p.ai_verified?<Badge color={C.green} bg={C.greenLt}>✓ Yes</Badge>:<Badge color={C.amber} bg={C.amberLt}>⏳ Pending</Badge>}</td>
                    <td style={{ padding:"12px 16px", borderBottom:`1px solid ${C.border}` }}><button onClick={()=>setSelected(p)} style={{ padding:"5px 12px", borderRadius:8, border:`1px solid ${C.teal}`, background:"transparent", color:C.teal, fontSize:12, fontWeight:700, cursor:"pointer" }}>View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div></Card>
        </>
      )}
      {selected&&<PatientModal patient={selected} onClose={()=>setSelected(null)} />}
    </div>
  );
}

function PatientModal({ patient:p, onClose }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(11,20,55,.45)", backdropFilter:"blur(4px)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }} onClick={onClose}>
      <Card style={{ maxWidth:520, width:"100%", padding:32 }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
          <div style={{ display:"flex", gap:14, alignItems:"center" }}><Avatar name={p.name||p.full_name||"P"} size={52} /><div><div style={{ fontSize:17, fontWeight:800, color:C.navy }}>{p.name||p.full_name||"—"}</div><div style={{ fontSize:12, color:C.slate }}>{p.email||"—"}</div></div></div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:"50%", border:`1px solid ${C.border}`, background:C.bg, cursor:"pointer", fontSize:16, color:C.slate, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {[["Age",p.age?`${p.age} years`:null],["Gender",p.gender],["Blood Type",p.blood_type],["Phone",p.phone],["AI Verified",p.ai_verified?"✓ Yes":"⏳ Pending"]].map(([label,val])=>(
            <div key={label} style={{ background:C.bg, borderRadius:10, padding:"12px 14px", border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:10, fontWeight:700, color:C.slate, textTransform:"uppercase", letterSpacing:".06em", marginBottom:4 }}>{label}</div>
              <div style={{ fontSize:14, fontWeight:700, color:C.navy }}>{val||"—"}</div>
            </div>
          ))}
          <div style={{ background:C.bg, borderRadius:10, padding:"12px 14px", border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.slate, textTransform:"uppercase", letterSpacing:".06em", marginBottom:4 }}>Risk Level</div>
            <RiskBadge risk={p.risk_level} />
          </div>
        </div>
        {p.diagnosis&&<div style={{ marginTop:12, background:C.bg, borderRadius:10, padding:"12px 14px", border:`1px solid ${C.border}` }}><div style={{ fontSize:10, fontWeight:700, color:C.slate, textTransform:"uppercase", letterSpacing:".06em", marginBottom:4 }}>Diagnosis</div><div style={{ fontSize:13, color:C.navy }}>{p.diagnosis}</div></div>}
        {p.notes&&<div style={{ marginTop:12, background:C.amberLt, borderRadius:10, padding:"12px 14px", border:`1px solid ${C.amber}30` }}><div style={{ fontSize:10, fontWeight:700, color:C.amber, textTransform:"uppercase", letterSpacing:".06em", marginBottom:4 }}>Clinical Notes</div><div style={{ fontSize:13, color:C.navy }}>{p.notes}</div></div>}
      </Card>
    </div>
  );
}

// ── Appointments Tab ──────────────────────────────────────────────
function DoctorAppointments({ doctorDbId }) {
  const [appts, setAppts]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [dateFilter, setDate]     = useState("upcoming");
  const [statusFilter, setStatus] = useState("all");
  const [search, setSearch]       = useState("");

  const load = useCallback(async () => {
    setLoading(true);

    // ✅ FIX 3: Exclude "requested" — doctors must never see unapproved requests.
    //    Only show statuses that have been approved/actioned by admin.
    let q = supabase
      .from("appointments")
      .select("*, patients(id, name, full_name)")
      .in("status", ["scheduled", "confirmed", "completed", "cancelled", "no-show"])
      .order("appointment_date", { ascending: true });

    if (doctorDbId) q = q.eq("doctor_id", doctorDbId);

    const { data, error } = await q;
    if (error) console.error("DoctorAppointments error:", error);
    setAppts(data || []);
    setLoading(false);
  }, [doctorDbId]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id, status) => {
    await supabase.from("appointments").update({ status }).eq("id", id);
    setAppts(a => a.map(ap => ap.id===id ? {...ap, status} : ap));
  };

  const fmtFull = (date, time) => {
    if (!date) return "—";
    const d = new Date(date + "T00:00:00");
    const dateStr = d.toLocaleDateString([], { month:"short", day:"numeric", year:"numeric" });
    const timeStr = time ? (() => { const [h,m]=time.split(":").map(Number); return `${h%12||12}:${String(m).padStart(2,"0")} ${h<12?"AM":"PM"}`; })() : "";
    return timeStr ? `${dateStr} · ${timeStr}` : dateStr;
  };

  const getPatientName = (a) =>
    a.patients?.name || a.patients?.full_name ||
    a.patient_name || extractPatientName(a.notes) ||
    `Patient #${a.patient_id}`;

  const filtered = appts.filter(a => {
    if (dateFilter==="upcoming" && a.appointment_date < new Date().toISOString().split("T")[0]) return false;
    if (dateFilter==="past"     && a.appointment_date >= new Date().toISOString().split("T")[0]) return false;
    if (statusFilter!=="all" && a.status?.toLowerCase()!==statusFilter) return false;
    const name = getPatientName(a).toLowerCase();
    if (search && !name.includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div style={{ display:"flex", gap:14, marginBottom:24, flexWrap:"wrap" }}>
        <StatCard icon="📋" label="Total"     value={appts.length}                                                               accent={C.blue}  />
        <StatCard icon="⏭️" label="Upcoming"  value={appts.filter(a=>a.appointment_date>=new Date().toISOString().split("T")[0]).length} accent={C.teal}  />
        <StatCard icon="✅" label="Completed" value={appts.filter(a=>a.status?.toLowerCase()==="completed").length}              accent={C.green} />
        <StatCard icon="❌" label="Cancelled" value={appts.filter(a=>a.status?.toLowerCase()==="cancelled").length}              accent={C.red}   />
      </div>
      <div style={{ display:"flex", gap:10, marginBottom:18, flexWrap:"wrap", alignItems:"center" }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Search patient…" style={{ flex:1, minWidth:180, padding:"10px 14px", borderRadius:10, border:`1.5px solid ${C.border}`, fontSize:13, color:C.navy, background:C.bg, fontFamily:font, outline:"none" }} />
        <select value={dateFilter} onChange={e=>setDate(e.target.value)} style={{ padding:"10px 14px", borderRadius:10, border:`1.5px solid ${C.border}`, fontSize:13, background:C.bg, fontFamily:font, cursor:"pointer", outline:"none" }}>
          <option value="upcoming">Upcoming</option><option value="past">Past</option><option value="all">All Time</option>
        </select>
        {/* ✅ FIX 3: "requested" removed from doctor's status filter — they cannot see or action requests */}
        {/* ✅ "requested" removed — doctors cannot see or action requests */}
        <select value={statusFilter} onChange={e=>setStatus(e.target.value)} style={{ padding:"10px 14px", borderRadius:10, border:`1.5px solid ${C.border}`, fontSize:13, background:C.bg, fontFamily:font, cursor:"pointer", outline:"none" }}>
          <option value="all">All Statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="no-show">No Show</option>
        </select>
        {/* ✅ Removed "+ New Appointment" — admin handles all booking, not doctors */}
      </div>
      {loading?<LoadingBlock />:filtered.length===0?(
        <EmptyState
          icon="📭"
          title="No appointments"
          sub="Admin will assign appointments to you. Check back after approval."
        />
      ):(
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {filtered.map(a=>(
            <ApptRow
              key={a.id}
              appt={a}
              patientName={getPatientName(a)}
              onStatusChange={updateStatus}
              fmtTime={(date, time) => fmtFull(date, time)}
              full
            />
          ))}
        </div>
      )}
      {/* ✅ Removed NewApptModal — doctors don't book appointments */}
    </div>
  );
}

// ── Appointment Row ───────────────────────────────────────────────
function ApptRow({ appt:a, patientName, onStatusChange, fmtTime, highlight=false, full=false }) {
  const name = patientName || "Unknown Patient";
  const specialization = extractSpecialization(a.notes) || a.type || "";

  return (
    <Card style={{ padding:"14px 18px", display:"flex", alignItems:"center", gap:14, borderLeft:highlight?`4px solid ${C.teal}`:undefined }}>
      <div style={{ minWidth:58, textAlign:"center", background:highlight?C.tealLt:C.bg, borderRadius:10, padding:"8px 4px", border:`1px solid ${highlight?C.tealMid:C.border}` }}>
        <div style={{ fontSize:18 }}>📅</div>
        <div style={{ fontSize:10, fontWeight:700, color:highlight?C.teal:C.slate, marginTop:2 }}>
          {a.appointment_date ? new Date(a.appointment_date+"T00:00:00").toLocaleDateString([],{month:"short",day:"numeric"}) : "—"}
        </div>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:700, color:C.navy, fontSize:14 }}>{name}</div>
        <div style={{ fontSize:12, color:C.slate, marginTop:2 }}>
          {full
            ? fmtTime(a.appointment_date, a.appointment_time)
            : a.appointment_time ? (() => { const [h,m]=a.appointment_time.split(":").map(Number); return `${h%12||12}:${String(m).padStart(2,"0")} ${h<12?"AM":"PM"}`; })() : "—"
          }
          {specialization && ` · ${specialization}`}
          {a.urgency && ` · ${a.urgency}`}
        </div>
        {extractReason(a.notes) && (
          <div style={{ fontSize:11, color:C.slate, marginTop:3 }}>
            📝 {extractReason(a.notes)}
          </div>
        )}
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
        {/* ✅ FIX 3: "requested" deliberately absent from the doctor's status dropdown */}
        <select value={a.status||"scheduled"} onChange={e=>onStatusChange(a.id,e.target.value)} style={{ padding:"5px 8px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:11, background:C.bg, cursor:"pointer", outline:"none", fontFamily:font }}>
          <option value="scheduled">Scheduled</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="no-show">No Show</option>
        </select>
      </div>
    </Card>
  );
}


// ═══════════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════════
const TABS = [
  { key:"queue",    icon:"❤️",  label:"Patient Queue"    },
  { key:"schedule", icon:"📅",  label:"Today's Schedule" },
  { key:"patients", icon:"👥",  label:"All Patients"     },
  { key:"appts",    icon:"📋",  label:"Appointments"     },
];

export default function DoctorDashboard() {
  const [tab, setTab]                   = useState("queue");
  const [user, setUser]                 = useState(null);
  const [loading, setLoading]           = useState(true);
  const [doctorRecord, setDoctorRecord] = useState(null);
  const [noRecord, setNoRecord]         = useState(false);
  const [notifOpen, setNotifOpen]       = useState(false);
  const [notifications, setNotifs]      = useState([]);
  const subRef                          = useRef(null);
  const navigate = useNavigate();

  const fmtNotif = n => ({ id:n.id, type:n.type, title:n.title, message:n.message, time:new Date(n.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}), read:n.read||false });

  const loadNotifs = useCallback(async (doctorId) => {
    let q = supabase.from("notifications").select("*").order("created_at",{ascending:false}).limit(40);
    if (doctorId) q = q.eq("doctor_id", doctorId);
    const { data } = await q;
    if (data) setNotifs(data.map(fmtNotif));
  },[]);

  const subscribeNotifs = useCallback((doctorId) => {
    if (subRef.current) supabase.removeChannel(subRef.current);
    const filter = doctorId ? { filter:`doctor_id=eq.${doctorId}` } : {};
    const ch = supabase.channel("doctor-notifs-"+Date.now())
      .on("postgres_changes",{ event:"INSERT", schema:"public", table:"notifications", ...filter }, payload => {
        setNotifs(prev => [fmtNotif(payload.new), ...prev]);
      }).subscribe();
    subRef.current = ch;
  },[]);

  useEffect(()=>{
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) { navigate("/doctor-login"); return; }
      const meta = data.user.user_metadata || {};
      if (meta.role && meta.role!=="doctor" && meta.role!=="admin") { navigate("/doctor-login"); return; }
      setUser(data.user);

      let docRecord = null;
      const metaDoctorId = parseDbId(meta.doctor_id);

      if (metaDoctorId) {
        const { data:doc } = await supabase.from("doctors").select("*").eq("id", metaDoctorId).maybeSingle();
        if (doc) docRecord = doc;
      }
      if (!docRecord) {
        const { data:docByEmail } = await supabase.from("doctors").select("*").eq("email", data.user.email).maybeSingle();
        if (docByEmail) {
          docRecord = docByEmail;
          await supabase.auth.updateUser({ data:{ ...meta, doctor_id: parseDbId(docByEmail.id) } });
        }
      }

      if (docRecord) setDoctorRecord(docRecord);
      else setNoRecord(true);

      const dId = docRecord?.id || null;
      await loadNotifs(dId);
      subscribeNotifs(dId);
      setLoading(false);
    };
    init();
    return () => { if (subRef.current) supabase.removeChannel(subRef.current); };
  },[navigate, loadNotifs, subscribeNotifs]);

  const markRead = async (id) => {
    setNotifs(prev => prev.map(n => n.id===id ? {...n,read:true} : n));
    await supabase.from("notifications").update({read:true}).eq("id",id);
  };

  const clearAll = async () => {
    setNotifs(prev => prev.map(n=>({...n,read:true})));
    if (doctorRecord?.id) await supabase.from("notifications").update({read:true}).eq("doctor_id", parseDbId(doctorRecord.id));
  };

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/doctor-login"); };

  if (loading) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:C.bg }}>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>
        <Spinner size={40}/><div style={{ fontSize:14, color:C.slate }}>Loading Doctor Portal…</div>
      </div>
    </div>
  );

  const meta       = user?.user_metadata || {};
  const email      = user?.email || "";
  const name       = doctorRecord?.name || meta.display_name || meta.full_name || email.split("@")[0];
  const doctorDbId = parseDbId(doctorRecord?.id);
  const unread     = notifications.filter(n=>!n.read).length;

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:C.bg, fontFamily:font }}>
      {/* Sidebar */}
      <div style={{ width:240, background:C.navy, display:"flex", flexDirection:"column", flexShrink:0, position:"sticky", top:0, height:"100vh" }}>
        <div style={{ padding:"24px 20px 20px", borderBottom:"1px solid rgba(255,255,255,.08)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:C.teal, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>⚕️</div>
            <div><div style={{ fontSize:15, fontWeight:800, color:"#fff" }}>MedVision AI</div><div style={{ fontSize:10, color:"rgba(255,255,255,.45)", textTransform:"uppercase", letterSpacing:".08em" }}>Doctor Portal</div></div>
          </div>
        </div>
        <div style={{ padding:"16px 20px", borderBottom:"1px solid rgba(255,255,255,.08)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <Avatar name={name} size={36} bg={C.teal} />
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{name}</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,.45)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{email}</div>
            </div>
          </div>
          <div style={{ marginTop:8 }}><Badge color={C.tealMid} bg="rgba(13,148,136,.2)">DOCTOR</Badge></div>
          {doctorRecord?.specialization&&<div style={{ marginTop:6, fontSize:11, color:"rgba(255,255,255,.4)" }}>{doctorRecord.specialization}</div>}
          {noRecord&&<div style={{ marginTop:8, fontSize:10, color:C.amber, background:"rgba(217,119,6,.12)", padding:"6px 8px", borderRadius:6, lineHeight:1.5 }}>⚠️ No doctor record for {email}.<br/>Ask admin to add your email to the doctors table.</div>}
        </div>
        <nav style={{ flex:1, padding:"12px 10px" }}>
          {TABS.map(t=>(
            <button key={t.key} onClick={()=>setTab(t.key)} style={{ width:"100%", display:"flex", alignItems:"center", gap:12, padding:"11px 12px", borderRadius:10, border:"none", background:tab===t.key?"rgba(13,148,136,.18)":"transparent", color:tab===t.key?C.tealMid:"rgba(255,255,255,.55)", fontSize:13, fontWeight:tab===t.key?700:500, cursor:"pointer", textAlign:"left", marginBottom:2, transition:"all .15s" }}>
              <span style={{ fontSize:16 }}>{t.icon}</span>{t.label}
              {tab===t.key&&<div style={{ marginLeft:"auto", width:6, height:6, borderRadius:"50%", background:C.teal }} />}
            </button>
          ))}
        </nav>
        <div style={{ padding:"12px 10px", borderTop:"1px solid rgba(255,255,255,.08)" }}>
          <button onClick={handleLogout} style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:"none", background:"rgba(220,38,38,.12)", color:"#FCA5A5", fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:8 }}><span>→</span> Logout</button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>
        <div style={{ background:C.white, borderBottom:`1px solid ${C.border}`, padding:"0 28px", height:64, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:C.navy }}>{TABS.find(t=>t.key===tab)?.icon} {TABS.find(t=>t.key===tab)?.label}</div>
            <div style={{ fontSize:12, color:C.slate }}>
              {email} · Verify AI reports · Manage your patients
              {doctorRecord&&<span style={{ color:C.green, marginLeft:8, fontWeight:600 }}>✓ Linked</span>}
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <button onClick={()=>setNotifOpen(o=>!o)} style={{ position:"relative", width:38, height:38, borderRadius:10, border:`1px solid ${C.border}`, background:C.bg, cursor:"pointer", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center" }}>
              🔔
              {unread>0&&<div style={{ position:"absolute", top:3, right:3, minWidth:16, height:16, borderRadius:99, background:C.red, color:"#fff", fontSize:9, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 3px" }}>{unread>9?"9+":unread}</div>}
            </button>
            <Badge color={C.teal} bg={C.tealLt}>DOCTOR</Badge>
            <Avatar name={name} size={34} />
          </div>
        </div>

        <div style={{ flex:1, padding:"28px 28px 40px", maxWidth:1100 }}>
          {tab==="queue"    && <PatientQueue       doctorDbId={doctorDbId} doctorEmail={email} />}
          {tab==="schedule" && <TodaySchedule      doctorDbId={doctorDbId} />}
          {tab==="patients" && <AllPatients        doctorDbId={doctorDbId} />}
          {tab==="appts"    && <DoctorAppointments doctorDbId={doctorDbId} />}
        </div>
      </div>

      <NotifPanel open={notifOpen} onClose={()=>setNotifOpen(false)} notifications={notifications} onMarkRead={markRead} onClearAll={clearAll} />
    </div>
  ); 
}
