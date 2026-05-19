// src/components/Header.jsx
// ── Admin Header — now includes NotificationPanel ─────────────────
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import NotificationPanel from "./NotificationPanel";

const ROLE_CONFIG = {
  admin:   { label:"Admin",   color:"#2563EB", bg:"#EFF6FF" },
  doctor:  { label:"Doctor",  color:"#0D9488", bg:"#CCFBF1" },
  patient: { label:"Patient", color:"#7C3AED", bg:"#EDE9FE" },
};

export default function Header({ user }) {
  const navigate  = useNavigate();
  const role      = user?.user_metadata?.role || "admin";
  const roleConf  = ROLE_CONFIG[role] || ROLE_CONFIG.admin;
  const email     = user?.email || "";
  const initial   = email[0]?.toUpperCase() || "?";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (role === "doctor")  { navigate("/doctor-login");  return; }
    if (role === "patient") { navigate("/patient-login"); return; }
    navigate("/");
  };

  return (
    <header style={{
      background:"#FFFFFF",borderBottom:"1px solid #DDE3F0",
      padding:"0 28px",height:56,
      display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,
    }}>
      <div style={{fontSize:15,fontWeight:700,color:"#0B1437"}}>
        {role==="doctor"?"Doctor Portal":role==="patient"?"Patient Portal":"MedVision AI"}
      </div>

      <div style={{display:"flex",alignItems:"center",gap:14}}>

        {/* Notification bell — admin sees all notifications */}
        <NotificationPanel role="admin" userId={null} />

        <span style={{background:roleConf.bg,color:roleConf.color,fontSize:10,fontWeight:800,padding:"3px 12px",borderRadius:999,letterSpacing:".06em",textTransform:"uppercase"}}>
          {roleConf.label}
        </span>

        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:32,height:32,borderRadius:"50%",background:roleConf.bg,color:roleConf.color,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:13,flexShrink:0}}>
            {initial}
          </div>
          <span style={{fontSize:12,color:"#5A6A8A",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            {email}
          </span>
        </div>

        <button onClick={handleLogout} style={{background:"transparent",border:"1.5px solid #DDE3F0",borderRadius:9,padding:"6px 14px",fontSize:12,fontWeight:700,color:"#5A6A8A",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}
          onMouseEnter={e=>{e.currentTarget.style.background="#FEF2F2";e.currentTarget.style.color="#DC2626";e.currentTarget.style.borderColor="#DC2626"}}
          onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="#5A6A8A";e.currentTarget.style.borderColor="#DDE3F0"}}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Logout
        </button>
      </div>
    </header>
  );
}
