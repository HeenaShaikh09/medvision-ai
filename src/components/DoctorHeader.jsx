// src/components/DoctorHeader.jsx
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import NotificationPanel from "./NotificationPanel";

export default function DoctorHeader({ user, doctorId = null }) {
  const navigate = useNavigate();
  const email    = user?.email || "";
  const initial  = email[0]?.toUpperCase() || "D";
  const id       = doctorId || user?.user_metadata?.doctor_id || null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/doctor-login");
  };

  return (
    <header style={{
      background:"#FFFFFF",borderBottom:"1px solid #C2E8E0",
      padding:"0 28px",height:56,
      display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,
    }}>
      <div style={{fontSize:15,fontWeight:800,color:"#082C26"}}>Doctor Portal</div>

      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <NotificationPanel role="doctor" userId={id} />

        <span style={{background:"#CCFBF1",color:"#0F766E",fontSize:10,fontWeight:800,padding:"3px 12px",borderRadius:999,textTransform:"uppercase",letterSpacing:".06em"}}>
          Doctor
        </span>

        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:32,height:32,borderRadius:"50%",background:"#CCFBF1",color:"#0D9488",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:13,flexShrink:0}}>
            {initial}
          </div>
          <span style={{fontSize:12,color:"#5A6A8A",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{email}</span>
        </div>

        <button onClick={handleLogout} style={{background:"transparent",border:"1.5px solid #C2E8E0",borderRadius:9,padding:"6px 14px",fontSize:12,fontWeight:700,color:"#2D6E63",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}
          onMouseEnter={e=>{e.currentTarget.style.background="#FEF2F2";e.currentTarget.style.color="#DC2626";e.currentTarget.style.borderColor="#DC2626"}}
          onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="#2D6E63";e.currentTarget.style.borderColor="#C2E8E0"}}
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
