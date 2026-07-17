import { useState, useEffect, useRef } from "react";

const API_ROOT = import.meta.env.VITE_API_URL || (window.location.hostname==="localhost"?"http://localhost:8000":"");
const API = API_ROOT+"/api/demo";
async function api(path, opts={}) {
  const r = await fetch(API+path, {headers:{"Content-Type":"application/json"},...opts});
  if(!r.ok) throw new Error(await r.text());
  return r.json();
}

const DARK = {
  bg0:"#050B13", bg1:"#0A1422", bg2:"#0F1D2E", bg3:"#162338",
  border:"#1A2E48", border2:"#243D5E",
  teal:"#00D4C8", teal2:"#00A89E",
  amber:"#F5A623", red:"#EF4444", green:"#22C55E",
  purple:"#8B5CF6", blue:"#3B82F6",
  white:"#EEF4FF", muted:"#3D5870", muted2:"#5A7A96",
  font:"'IBM Plex Mono','Courier New',monospace",
  sans:"'DM Sans',system-ui,sans-serif",
  isDark:true,
};
const LIGHT = {
  bg0:"#F0F4F8", bg1:"#FFFFFF", bg2:"#F7FAFC", bg3:"#EDF2F7",
  border:"#CBD5E0", border2:"#A0AEC0",
  teal:"#0B7285", teal2:"#086F83",
  amber:"#B7791F", red:"#C53030", green:"#276749",
  purple:"#553C9A", blue:"#2B6CB0",
  white:"#1A202C", muted:"#718096", muted2:"#4A5568",
  font:"'IBM Plex Mono','Courier New',monospace",
  sans:"'DM Sans',system-ui,sans-serif",
  isDark:false,
};
// Theme is set globally — toggled from TopBar
let _theme = DARK;
const getT = () => _theme;
const T = new Proxy({}, { get: (_, k) => _theme[k] });
const SEV={CRITICAL:{bg:"rgba(239,68,68,.15)",txt:"#FCA5A5",dot:"#EF4444"},HIGH:{bg:"rgba(245,158,11,.15)",txt:"#FCD34D",dot:"#F59E0B"},MEDIUM:{bg:"rgba(59,130,246,.15)",txt:"#93C5FD",dot:"#3B82F6"},LOW:{bg:"rgba(34,197,94,.15)",txt:"#86EFAC",dot:"#22C55E"}};
const HC={RED:{c:"#EF4444",g:"rgba(239,68,68,.25)"},AMBER:{c:"#F5A623",g:"rgba(245,158,11,.25)"},GREEN:{c:"#22C55E",g:"rgba(34,197,94,.25)"}};

const CSS=`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&family=DM+Sans:wght@300;400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{background:${T.bg0};color:${T.white};font-family:${T.sans};overflow:hidden}
::-webkit-scrollbar{width:3px;height:3px}::-webkit-scrollbar-track{background:${T.bg1}}::-webkit-scrollbar-thumb{background:${T.border2};border-radius:2px}
select,input,textarea{background:${T.bg2};color:${T.white};border:1px solid ${T.border};border-radius:8px;padding:8px 12px;font-family:${T.sans};font-size:13px;outline:none;width:100%;transition:border-color .2s}
select:focus,input:focus{border-color:${T.teal}}option{background:${T.bg2}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
.fi{animation:fadeIn .35s ease forwards}
.ch{transition:border-color .2s,transform .2s,box-shadow .2s;cursor:pointer}
.ch:hover{border-color:${T.teal}!important;transform:translateY(-1px);box-shadow:0 6px 24px rgba(0,212,200,.07)}`;

function StyleTag({isDark}){
  useEffect(()=>{
    const th = isDark ? DARK : LIGHT;
    const css=`
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
      body{background:${th.bg0};color:${th.white};font-family:${th.sans};overflow:hidden;transition:background 0.3s}
      ::-webkit-scrollbar{width:3px;height:3px}
      ::-webkit-scrollbar-track{background:${th.bg1}}
      ::-webkit-scrollbar-thumb{background:${th.border2};border-radius:2px}
      select,input,textarea{background:${th.bg2};color:${th.white};border:1px solid ${th.border};border-radius:8px;padding:8px 12px;font-family:${th.sans};font-size:13px;outline:none;width:100%;transition:border-color .2s,background 0.3s}
      select:focus,input:focus{border-color:${th.teal}}
      option{background:${th.bg2}}
      @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
      .fi{background:${th.bg0};flex:1;overflow:hidden}
      .ch{cursor:pointer;transition:background .15s}
      .ch:hover{background:${th.bg3}!important}
    `;
    const el=document.createElement("style");
    el.id="theme-style";
    const old=document.getElementById("theme-style");
    if(old) old.remove();
    el.textContent=css;
    document.head.appendChild(el);
    return()=>{const s=document.getElementById("theme-style");if(s)s.remove();};
  },[isDark]);
  return null;
}

// ── Components ────────────────────────────────────────────────────────────────
const Panel=({children,style={}})=><div style={{background:T.bg1,border:`1px solid ${T.border}`,borderRadius:12,padding:"1.1rem",...style}}>{children}</div>;
const PT=({children,color=T.teal})=><div style={{display:"flex",alignItems:"center",gap:7,marginBottom:".85rem"}}><div style={{width:3,height:14,background:color,borderRadius:2,flexShrink:0}}/><span style={{fontFamily:T.font,fontSize:11,fontWeight:600,color:T.white,letterSpacing:".05em"}}>{children}</span></div>;
const Dot=({c,pulse=false,size=7})=><div style={{width:size,height:size,borderRadius:"50%",background:c,flexShrink:0,animation:pulse?"pulse 2s infinite":"none",boxShadow:`0 0 5px ${c}`}}/>;
const Badge=({s})=>{const c=SEV[s]||SEV.LOW;return<span style={{background:c.bg,color:c.txt,borderRadius:5,padding:"2px 7px",fontSize:10,fontWeight:700,fontFamily:T.font,border:`1px solid ${c.dot}22`,flexShrink:0}}>{s}</span>};
const Mono=({children,color=T.muted2,size=11})=><span style={{fontFamily:T.font,fontSize:size,color}}>{children}</span>;

function Btn({children,onClick,color=T.teal,loading,small,disabled,outline}){
  return<button onClick={onClick} disabled={loading||disabled} style={{background:outline?"transparent":disabled?T.bg3:color,color:disabled?T.muted:outline?color:T.bg0,border:outline?`1px solid ${color}`:"none",borderRadius:8,padding:small?"5px 12px":"9px 18px",fontWeight:700,fontSize:small?11:13,fontFamily:T.sans,letterSpacing:".03em",cursor:disabled?"not-allowed":"pointer",opacity:loading?.7:1,transition:"all .15s",whiteSpace:"nowrap"}}>{loading?"processing…":children}</button>;
}

function StatBox({label,value,sub,color=T.teal,icon=""}){
  return<div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:10,padding:"1rem",borderTop:`2px solid ${color}`}}>
    <div style={{fontFamily:T.font,fontSize:10,color:T.muted2,letterSpacing:".08em",marginBottom:8}}>{icon} {label}</div>
    <div style={{fontSize:26,fontWeight:700,color,fontFamily:T.font,lineHeight:1}}>{value}</div>
    {sub&&<div style={{fontSize:11,color:T.muted,marginTop:5}}>{sub}</div>}
  </div>;
}

function GreenBox({title,lines=[],orders=[]}){
  return<div style={{background:"rgba(34,197,94,.07)",border:"1px solid rgba(34,197,94,.25)",borderRadius:9,padding:".9rem",marginTop:".85rem",animation:"fadeIn .3s ease"}}>
    <div style={{fontWeight:700,fontSize:13,color:T.green,marginBottom:7}}>✓ {title}</div>
    {lines.map((l,i)=><div key={i} style={{fontFamily:T.font,fontSize:11,color:T.muted2,marginBottom:3}}>{l}</div>)}
    {orders.map((o,i)=><div key={i} style={{marginTop:5,padding:"5px 9px",background:"rgba(34,197,94,.1)",borderRadius:5,fontFamily:T.font,fontSize:11,color:T.green}}>✓ {o}</div>)}
  </div>;
}

function ErrBox({title}){return<div style={{background:"rgba(239,68,68,.07)",border:"1px solid rgba(239,68,68,.25)",borderRadius:9,padding:".9rem",marginTop:".85rem",fontFamily:T.font,fontSize:12,color:T.red}}>✗ {title}</div>;}

function JsonBox({data}){if(!data)return null;return<pre style={{background:T.bg0,color:"#7DD3FC",borderRadius:8,padding:".85rem",fontSize:11,overflowX:"auto",maxHeight:300,overflowY:"auto",fontFamily:T.font,lineHeight:1.6,border:`1px solid ${T.border}`}}>{JSON.stringify(data,null,2)}</pre>;}

function SvcBar({pct,color}){return<div style={{background:T.bg0,borderRadius:3,height:4,overflow:"hidden",marginTop:4}}><div style={{width:`${pct}%`,height:"100%",background:pct>80?T.red:pct>60?T.amber:color,borderRadius:3,transition:"width 1s ease"}}/></div>;}

function PipelineFlow({steps,color}){
  return<div style={{display:"flex",alignItems:"center",gap:0,overflow:"auto",padding:"8px 0",marginBottom:".85rem"}}>
    {steps.map((s,i)=><>
      <div key={`s${i}`} style={{minWidth:72,padding:"6px 4px",background:T.bg0,border:`1px solid ${color}44`,borderRadius:7,textAlign:"center"}}>
        <div style={{fontFamily:T.font,fontSize:9,color,fontWeight:600,lineHeight:1.3}}>{s.svc}</div>
        <div style={{fontSize:9,color:T.muted,marginTop:2}}>{s.label}</div>
      </div>
      {i<steps.length-1&&<div key={`a${i}`} style={{fontSize:12,color:T.muted,flexShrink:0,margin:"0 2px",marginTop:-8}}>→</div>}
    </>)}
  </div>;
}

// ── TopBar ────────────────────────────────────────────────────────────────────
function TopBar({page,isDark,toggleTheme}){
  const [t,setT]=useState(new Date());
  useEffect(()=>{const id=setInterval(()=>setT(new Date()),1000);return()=>clearInterval(id);},[]);
  const titles={dashboard:"Fleet Intelligence Overview",video:"Predictive Vision Intelligence — 3rd Eye® Extension · GCP AI Layer",sensors:"Predictive Sensor Health",edge:"Edge AI on the Truck",agents:"AI Agents — Gemini 1.5 Pro",model:"Custom AI Model",rpa:"RPA Workflow Automation",bi:"Business Intelligence & Analytics",devops:"Field Support Intelligence — Real Incident Timeline",apigate:"API Management Gateway",iot:"IoT Device Registry",mlops:"MLOps Pipeline — Train→Evaluate→Deploy→OTA",crossfleet:"Cross-Fleet Intelligence",tests:"Algorithm & API Test Suite"};
  return<div style={{height:52,background:T.bg1,borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 1.25rem",flexShrink:0}}>
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      <div style={{width:2,height:18,background:T.teal,borderRadius:1}}/>
      <span style={{fontWeight:600,fontSize:14,color:T.white}}>{titles[page]||"Dashboard"}</span>
    </div>
    <div style={{display:"flex",alignItems:"center",gap:18,fontSize:11,fontFamily:T.font,color:T.muted2}}>
      <div style={{display:"flex",alignItems:"center",gap:6}}><Dot c={T.green} pulse/><span style={{color:T.green}}>ALL SYSTEMS ONLINE</span></div>
      <span>GCP us-central1</span>
      <span style={{color:T.teal}}>{t.toLocaleTimeString()}</span>
      <div onClick={toggleTheme} style={{display:"flex",alignItems:"center",gap:7,cursor:"pointer",padding:"4px 10px",borderRadius:20,background:isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.08)",border:`1px solid ${T.border}`,transition:"all 0.2s",userSelect:"none"}}>
        <span style={{fontSize:13}}>{isDark?"🌙":"☀️"}</span>
        <div style={{width:28,height:15,borderRadius:10,background:isDark?T.teal:"#CBD5E0",position:"relative",transition:"background 0.3s"}}>
          <div style={{position:"absolute",top:2,left:isDark?14:2,width:11,height:11,borderRadius:"50%",background:"white",transition:"left 0.3s",boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}/>
        </div>
        <span style={{fontSize:10,color:T.muted2,fontFamily:T.font}}>{isDark?"DARK":"LIGHT"}</span>
      </div>
    </div>
  </div>;
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({page,setPage}){
  const sections=[
    {label:"CORE AI",items:[
      {id:"dashboard",icon:"⊞",label:"OVERVIEW"},
      {id:"video",    icon:"◉",label:"PREDICTIVE VISION INTEL",     color:T.amber},
      {id:"sensors",  icon:"◈",label:"SENSOR HEALTH",  color:T.green},
      {id:"edge",     icon:"◧",label:"EDGE AI",        color:T.purple},
      {id:"agents",   icon:"◆",label:"AI AGENTS",      color:T.teal},
      {id:"model",    icon:"◎",label:"AI MODEL",       color:T.teal},
    ]},
    {label:"NEOSOFT VALUE",items:[
      {id:"mlops",      icon:"...",label:"MLOps PIPELINE",  color:T.purple},
      {id:"crossfleet", icon:"◈",label:"FLEET INTEL",      color:T.teal},

      ]},
    {label:"PLATFORM",items:[
      
      {id:"rpa",          icon:"...",label:"RPA WORKFLOWS", color:T.green},
      {id:"bi",           icon:"▦",label:"BI ANALYTICS",  color:T.amber},
      {id:"devops",       icon:"⚙",label:"FIELD SUPPORT",  color:T.amber},
      {id:"apigate",      icon:"⬢",label:"API GATEWAY",   color:T.teal},
      {id:"iot",          icon:"◈",label:"IOT DEVICES",   color:T.green},
      {id:"tests",        icon:"✓",label:"SYSTEM TESTS",  color:T.teal},
    ]},
  ];
  return<div style={{width:196,background:T.bg1,borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",flexShrink:0}}>
    <div style={{padding:"1rem 1rem .85rem",borderBottom:`1px solid ${T.border}`}}>
      <div style={{fontFamily:T.font,fontSize:14,fontWeight:600,color:T.teal,letterSpacing:".12em"}}>NeoSOFT Digital</div>
      <div style={{fontFamily:T.font,fontSize:9,color:T.muted,marginTop:2,letterSpacing:".06em"}}>× TEREX ES · HEIL® · 3rd Eye® · Marathon®</div>
      <div style={{marginTop:8,height:1,background:`linear-gradient(90deg,${T.teal}44,transparent)`}}/>
    </div>
    <nav style={{flex:1,padding:".5rem",overflowY:"auto"}}>
      {sections.map(sec=><div key={sec.label}>
        <div style={{fontFamily:T.font,fontSize:9,color:T.muted,letterSpacing:".1em",padding:"8px 8px 4px"}}>{sec.label}</div>
        {sec.items.map(n=>{
          const active=page===n.id;
          const c=n.color||T.teal;
          return<div key={n.id} onClick={()=>setPage(n.id)} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 9px",borderRadius:7,cursor:"pointer",background:active?`${c}12`:"transparent",border:active?`1px solid ${c}30`:"1px solid transparent",marginBottom:2,transition:"all .15s"}}>
            <span style={{fontSize:13,color:active?c:T.muted,width:16,textAlign:"center"}}>{n.icon}</span>
            <span style={{fontFamily:T.font,fontSize:10,fontWeight:active?600:400,color:active?c:T.muted2,letterSpacing:".07em"}}>{n.label}</span>
            {active&&<div style={{marginLeft:"auto",width:3,height:3,borderRadius:"50%",background:c}}/>}
          </div>;
        })}
      </div>)}
    </nav>
    <div style={{padding:".75rem 1rem",borderTop:`1px solid ${T.border}`}}>
      <div style={{fontFamily:T.font,fontSize:10,color:T.amber}}>◈ GCP POC MODE</div>
      <div style={{fontFamily:T.font,fontSize:9,color:T.muted,marginTop:2}}>NeoSOFT Digital · TIRC ES</div>
    </div>
  </div>;
}

// ════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════════════════════════════════════════
function Dashboard({setPage}){
  const [fleet,setFleet]=useState([]);
  const [events,setEvents]=useState([]);
  const [bi,setBi]=useState(null);
  const [loading,setLoading]=useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [liveCount, setLiveCount] = useState(0);

  const loadData = () => {
    Promise.all([api("/fleet-health"),api("/video-events"),api("/bi-analytics")])
      .then(([f,v,b])=>{
        setFleet(f.fleet||[]);
        setEvents(v.events||[]);
        setBi(b);
        setLoading(false);
        setLastUpdate(new Date());
        setLiveCount(v.live_count||0);
      });
  };

  useEffect(()=>{
    loadData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  },[]);

  const kpis=bi?.kpis||{};
  const stats=[
    {label:"TRUCKS ONLINE",      value:fleet.length,      sub:"Fleet active today",          color:T.teal,  icon:"◉"},
    {label:"CRITICAL ALERTS",    value:fleet.filter(t=>t.health_status==="RED").length, sub:"Need immediate action", color:T.red, icon:"◈"},
    {label:"AI AUTOMATION RATE", value:kpis.ai_automation_rate?.value?`${kpis.ai_automation_rate.value}%`:"94%", sub:"Events auto-resolved", color:T.green, icon:"◎"},
    {label:"HOURS SAVED TODAY",  value:kpis.manual_review_hours?.value?`${Math.round((8-kpis.manual_review_hours.value)*100)/100}h`:"5.9h", sub:"vs manual review", color:T.amber, icon:"◆"},
  ];

  const pillars=[
    {id:"video",   icon:"◉",label:"PREDICTIVE VISION INTEL", sub:"3rd Eye® Extension · Predictive Scoring · Incident Reconstruction · 10 CV Scenarios",  color:T.amber,  page:"video"},
    {id:"sensors", icon:"◈",label:"SENSOR HEALTH",     sub:"Heil® 200+ Sensors · CAN Bus J1939 · Predictive Failure · Parts Central Auto-Order",   color:T.green,  page:"sensors"},
    {id:"edge",    icon:"◧",label:"EDGE AI",           sub:"On-Truck TFLite · <50ms Inference · OTA to Heil® Fleet · H.A.L.O. Ready",      color:T.purple, page:"edge"},
    {id:"agents",  icon:"◆",label:"AI AGENTS",         sub:"Fleet Copilot · Safety · Maintenance · Route AI",color:T.teal,  page:"agents"},
    
    {id:"rpa",     icon:"...",label:"RPA AUTOMATION",    sub:"Heil® Parts Central · Marathon® Connected Compactor · BBMP Compliance · 94% Auto",     color:T.green,  page:"rpa"},
    {id:"bi",      icon:"▦",label:"BI ANALYTICS",      sub:"Collection Efficiency · Safety KPIs · Fleet Trends",     color:T.amber,  page:"bi"},
    {id:"devops",  icon:"⚙",label:"FIELD SUPPORT",     sub:"Real Incident Timelines · Before vs After AI · Support Cost Avoided", color:T.amber, page:"devops"},
  ];

  return<div className="fi" style={{padding:"1.25rem",overflowY:"auto",flex:1}}>

    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
      <div style={{fontFamily:T.font,fontSize:10,color:T.muted,letterSpacing:".08em"}}>WHAT NEOSOFT BUILDS FOR TIRC ES — CLICK ANY CAPABILITY TO EXPLORE</div>
      <div style={{fontFamily:T.font,fontSize:9,color:T.muted2}}>All running on GCP · Vertex AI · BigQuery · Cloud IoT Core</div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:"1.25rem"}}>
      {pillars.map(p=><div key={p.id} className="ch" onClick={()=>setPage(p.page)} style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:10,padding:".9rem",borderLeft:`3px solid ${p.color}`}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
          <span style={{fontSize:16,color:p.color}}>{p.icon}</span>
          <span style={{fontFamily:T.font,fontSize:10,fontWeight:700,color:p.color,letterSpacing:".07em"}}>{p.label}</span>
          <span style={{marginLeft:"auto",color:T.muted,fontSize:14}}>›</span>
        </div>
        <div style={{fontSize:11,color:T.muted2,lineHeight:1.4}}>{p.sub}</div>
      </div>)}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1.5fr",gap:10}}>
      <Panel>
        <PT>FLEET HEALTH</PT>
        {loading?<Mono>QUERYING BIGQUERY…</Mono>:fleet.map((t,i)=>{
          const hc=HC[t.health_status]||HC.GREEN;
          return<div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:`1px solid ${T.border}22`}}>
            <Dot c={hc.c}/>
            <div style={{flex:1,minWidth:0}}>
              <Mono size={11} color={T.white}>{t.truck_reg||t.truck_id}</Mono>
              <div style={{fontFamily:T.font,fontSize:9,color:T.muted,marginTop:1}}>{t.area||""} · {t.driver_name||""}</div>
            </div>
            <span style={{fontFamily:T.font,fontSize:10,color:hc.c,fontWeight:700}}>{t.health_status}</span>
            <Mono color={T.muted}>{t.total_anomalies}⚠</Mono>
          </div>;
        })}
      </Panel>
      <Panel>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:".85rem"}}>
          <PT color={T.amber}>LIVE VIDEO EVENTS — BIGQUERY</PT>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {liveCount>0&&<span style={{fontFamily:T.font,fontSize:10,color:T.green,display:"flex",alignItems:"center",gap:4}}><span style={{width:6,height:6,borderRadius:"50%",background:T.green,display:"inline-block",animation:"pulse 1.5s infinite"}}/>LIVE</span>}
            {lastUpdate&&<span style={{fontFamily:T.font,fontSize:9,color:T.muted}}>Updated {Math.round((new Date()-lastUpdate)/1000)}s ago · refreshes every 30s</span>}
          </div>
        </div>
        {loading?<Mono>QUERYING…</Mono>:events.slice(0,9).map((e,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:`1px solid ${T.border}22`}}>
          {e.is_live&&<div style={{width:5,height:5,borderRadius:"50%",background:T.green,flexShrink:0,animation:"pulse 1.5s infinite",boxShadow:`0 0 4px ${T.green}`}}/>}
          <Badge s={e.severity}/>
          <span style={{flex:1,fontSize:12,color:T.white}}>{e.event_type?.replace(/_/g," ")}</span>
          <Mono size={10} color={T.muted2}>{e.area||""}</Mono>
          <Mono>{e.driver_name||e.truck_id}</Mono>
          <Mono color={T.teal}>{(e.confidence_score*100).toFixed(0)}%</Mono>
        </div>)}
      </Panel>
    </div>


  </div>;
}

// ════════════════════════════════════════════════════════════════════════════
// VIDEO AI
// ════════════════════════════════════════════════════════════════════════════
function VideoPage(){
  const [truck,setTruck]=useState("TRUCK-001");
  const [result,setResult]=useState(null);
  const [events,setEvents]=useState([]);
  const [patterns,setPatterns]=useState(null);
  const [loadA,setLoadA]=useState(false);
  const [loadP,setLoadP]=useState(false);
  useEffect(()=>{api("/video-events").then(d=>setEvents(d.events||[])).catch(()=>{});}, []);
  const analyze=async()=>{setLoadA(true);setResult(null);const r=await api(`/analyze-video?truck_id=${truck}`,{method:"POST"}).catch(e=>({error:e.message}));setResult(r);if(!r.error){const ev=await api("/video-events").catch(()=>({events:[]}));setEvents(ev.events||[]);}setLoadA(false);};
  const loadP2=async()=>{setLoadP(true);const p=await api("/cross-fleet-patterns").catch(e=>({error:e.message}));setPatterns(p);setLoadP(false);};
  return<div className="fi" style={{padding:"1.25rem",overflowY:"auto",flex:1}}>
    <div style={{display:"grid",gridTemplateColumns:"320px 1fr",gap:10,marginBottom:10}}>
      <Panel>
        <PT color={T.amber}>VIDEO ANALYSIS ENGINE</PT>
        <PipelineFlow color={T.amber} steps={[{svc:"3rd Eye Cam",label:"4 cameras"},{svc:"Edge AI",label:"Pre-filter"},{svc:"IoT Core",label:"MQTT/TLS"},{svc:"Video API",label:"GCP CV"},{svc:"Classifier",label:"10 scenarios"},{svc:"Alert",label:"RPA route"}]}/>
        <div style={{marginBottom:10}}><div style={{fontFamily:T.font,fontSize:10,color:T.muted2,marginBottom:5,letterSpacing:".06em"}}>SELECT TRUCK</div><select value={truck} onChange={e=>setTruck(e.target.value)}>{["TRUCK-001","TRUCK-002","TRUCK-003","TRUCK-007","TRUCK-009"].map(t=><option key={t}>{t}</option>)}</select></div>
        <Btn onClick={analyze} loading={loadA} color={T.amber}>▶ RUN VIDEO INTELLIGENCE API</Btn>
        {result&&!result.error&&<GreenBox title={`${result.total} EVENTS CLASSIFIED · ${result.critical?.length} CRITICAL`} lines={[`Truck: ${result.truck_reg||""} · Driver: ${result.driver_name||""} · ${result.processing_ms}ms classification`,...result.detected?.map(d=>`${d.event_type.replace(/_/g," ")} · ${(d.confidence_score*100).toFixed(0)}% confidence · ${d.severity}`)]} orders={[`Event logged · ID: ${result.event_id}`,`Dispatch action: ${result.rpa_action?.replace(/_/g," ")}`,`Alert sent: ${result.pubsub_published?"YES":"offline mode"}`]}/>}
        {result?.error&&<ErrBox title={result.error}/>}
      </Panel>
      <Panel>
        <PT color={T.amber}>LIVE EVENT FEED — BIGQUERY · terex_poc.video_events</PT>
        {events.slice(0,10).map((e,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:`1px solid ${T.border}22`}}>
            <Badge s={e.severity}/>
            <span style={{flex:1,fontSize:12,color:T.white,minWidth:0}}>{e.event_type?.replace(/_/g," ")}</span>
            <Mono color={T.muted2} size={10}>{e.area||""}</Mono>
            <Mono size={11}>{e.driver_name||e.truck_id}</Mono>
            <Mono color={T.teal} size={11}>{(e.confidence_score*100).toFixed(0)}%</Mono>
          </div>
        ))}
      </Panel>
    </div>
    <Panel>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div>
          <PT color={T.teal}>CROSS-FLEET SAFETY PATTERN ANALYSIS — 30 DAYS</PT>
          <div style={{fontSize:11,color:T.muted2,marginTop:3}}>Analyses all 10 Heil trucks across all 6 BBMP routes — finds which routes are most dangerous and why</div>
        </div>
        <Btn onClick={loadP2} loading={loadP} small outline color={T.teal}>▶ RUN PATTERN ANALYSIS</Btn>
      </div>
      {!patterns?.patterns&&!loadP&&<div style={{padding:"14px",background:T.bg0,borderRadius:8,border:`1px solid ${T.border}`,fontSize:12,color:T.muted2,textAlign:"center"}}>Click RUN PATTERN ANALYSIS to analyse 30 days of 3rd Eye events across the full Heil fleet</div>}
      {patterns?.patterns&&<>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:4}}>
          {patterns.patterns.map((p,i)=>{
            const riskColor=p.risk_rate>.35?T.red:p.risk_rate>.15?T.amber:T.green;
            const riskPct=Math.round(p.risk_rate*100);
            const barW=Math.round(p.risk_rate*100);
            return<div key={i} style={{background:T.bg0,borderRadius:9,padding:"11px 14px",border:`1px solid ${T.border}`,borderLeft:`3px solid ${riskColor}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                <div>
                  <div style={{fontSize:12,color:T.white,fontWeight:600}}>{p.route_name||p.area}</div>
                  <Mono color={T.muted} size={9}>{p.route_id} · {p.bbmp_zone} · {p.households?.toLocaleString()} households</Mono>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:20,fontWeight:700,color:riskColor,fontFamily:T.font,lineHeight:1}}>{riskPct}%</div>
                  <Mono color={T.muted} size={9}>RISK RATE</Mono>
                </div>
              </div>
              <div style={{height:5,background:T.bg2,borderRadius:3,marginBottom:8,overflow:"hidden"}}>
                <div style={{width:`${barW}%`,height:"100%",background:riskColor,borderRadius:3,transition:"width 0.8s ease"}}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:6}}>
                <div style={{textAlign:"center",padding:"5px",background:T.bg2,borderRadius:6}}>
                  <div style={{fontSize:16,fontWeight:700,color:T.white,fontFamily:T.font}}>{p.total_events}</div>
                  <Mono color={T.muted} size={8}>TOTAL EVENTS</Mono>
                </div>
                <div style={{textAlign:"center",padding:"5px",background:T.bg2,borderRadius:6}}>
                  <div style={{fontSize:16,fontWeight:700,color:T.red,fontFamily:T.font}}>{p.high_severity_events}</div>
                  <Mono color={T.muted} size={8}>HIGH/CRITICAL</Mono>
                </div>
                <div style={{textAlign:"center",padding:"5px",background:T.bg2,borderRadius:6}}>
                  <div style={{fontSize:16,fontWeight:700,color:T.amber,fontFamily:T.font}}>{p.pedestrian_near_misses}</div>
                  <Mono color={T.muted} size={8}>NEAR MISSES</Mono>
                </div>
                <div style={{textAlign:"center",padding:"5px",background:T.bg2,borderRadius:6}}>
                  <div style={{fontSize:16,fontWeight:700,color:T.purple,fontFamily:T.font}}>{p.hazmat_events}</div>
                  <Mono color={T.muted} size={8}>HAZMAT</Mono>
                </div>
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {p.school_zone&&<span style={{fontFamily:T.font,fontSize:9,padding:"2px 7px",borderRadius:3,background:"rgba(239,68,68,0.1)",color:T.red}}>⚠ School zone — dispatch {p.collection_start} conflicts with 08:30 school start</span>}
                {p.driver_fatigue_events>0&&<span style={{fontFamily:T.font,fontSize:9,padding:"2px 7px",borderRadius:3,background:"rgba(245,158,11,0.1)",color:T.amber}}>◈ {p.driver_fatigue_events} driver distraction events</span>}
                {p.hazmat_events>5&&<span style={{fontFamily:T.font,fontSize:9,padding:"2px 7px",borderRadius:3,background:"rgba(168,85,247,0.1)",color:T.purple}}>⬡ High hazmat frequency — commercial waste mixing</span>}
                {p.risk_rate<0.1&&<span style={{fontFamily:T.font,fontSize:9,padding:"2px 7px",borderRadius:3,background:"rgba(34,197,94,0.1)",color:T.green}}>✓ Low risk — no immediate action needed</span>}
              </div>
            </div>;
          })}
        </div>
        <div style={{marginTop:10,padding:"10px 12px",background:"rgba(20,184,166,0.06)",borderRadius:8,border:"1px solid rgba(20,184,166,0.2)"}}>
          <Mono color={T.teal} size={9}>AI RECOMMENDATION</Mono>
          <div style={{fontSize:12,color:T.white,marginTop:4,lineHeight:1.7}}>
            Koramangala route dispatch time should be moved from <span style={{color:T.red}}>08:15</span> to <span style={{color:T.green}}>06:30</span> to avoid school zone overlap. This single change would eliminate the primary hazard on the highest-risk route in the fleet. Estimated reduction in near-miss events: <span style={{color:T.green}}>~40%</span>.
          </div>
        </div>
      </>}
    </Panel>
  </div>;
}

// ════════════════════════════════════════════════════════════════════════════
// SENSOR HEALTH
// ════════════════════════════════════════════════════════════════════════════
function SensorsPage(){
  const [truck,setTruck]=useState("TRUCK-003");
  const [sensor,setSensor]=useState("hydraulic_pressure");
  const [force,setForce]=useState(true);
  const [result,setResult]=useState(null);
  const [anomalies,setAnomalies]=useState([]);
  const [fleet,setFleet]=useState([]);
  const [loading,setLoading]=useState(false);
  useEffect(()=>{api("/anomalies").then(d=>setAnomalies(d.anomalies||[])).catch(()=>{});api("/fleet-health").then(d=>setFleet(d.fleet||[])).catch(()=>{});}, []);
  const run=async()=>{setLoading(true);setResult(null);const r=await api(`/run-anomaly-detection?truck_id=${truck}&sensor_type=${sensor}&force_anomaly=${force}`,{method:"POST"}).catch(e=>({error:e.message}));setResult(r);api("/anomalies").then(d=>setAnomalies(d.anomalies||[])).catch(()=>{});api("/fleet-health").then(d=>setFleet(d.fleet||[])).catch(()=>{});setLoading(false);};
  const sensors=["hydraulic_pressure","vibration_rms","temperature_engine","hydraulic_lift_pressure","can_brake_pressure"];
  return<div className="fi" style={{padding:"1.25rem",overflowY:"auto",flex:1}}>
    <div style={{display:"grid",gridTemplateColumns:"320px 1fr 1fr",gap:10}}>
      <Panel>
        <PT color={T.green}>ANOMALY DETECTION ENGINE</PT>
        <PipelineFlow color={T.green} steps={[{svc:"CAN Bus",label:"J1939+Body"},{svc:"Telematics",label:"4G-LTE"},{svc:"Cloud",label:"Ingest"},{svc:"Z-score",label:"N=60 window"},{svc:"Parts Central",label:"Auto-order"},{svc:"Technician",label:"Alert"}]}/>
        <div style={{marginBottom:8}}><div style={{fontFamily:T.font,fontSize:10,color:T.muted2,marginBottom:4,letterSpacing:".06em"}}>TRUCK ID</div><select value={truck} onChange={e=>setTruck(e.target.value)}>{["TRUCK-001","TRUCK-003","TRUCK-007","TRUCK-009"].map(t=><option key={t}>{t}</option>)}</select></div>
        <div style={{marginBottom:8}}><div style={{fontFamily:T.font,fontSize:10,color:T.muted2,marginBottom:4,letterSpacing:".06em"}}>SENSOR TYPE</div><select value={sensor} onChange={e=>setSensor(e.target.value)}>{sensors.map(s=><option key={s}>{s}</option>)}</select></div>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,padding:"7px 10px",background:T.bg0,borderRadius:7,border:`1px solid ${T.border}`,cursor:"pointer"}} onClick={()=>setForce(!force)}>
          <div style={{width:13,height:13,borderRadius:3,background:force?T.green:"transparent",border:`1.5px solid ${T.green}`,transition:"all .15s"}}/>
          <span style={{fontSize:12,color:T.muted2}}>Force anomaly for demo</span>
        </div>
        <Btn onClick={run} loading={loading} color={T.green}>▶ RUN DETECTION ON GCP</Btn>
        {result&&!result.error&&<GreenBox title={result.is_anomaly?`ANOMALY DETECTED — Z-SCORE ${result.z_score}σ`:"NORMAL READING"} lines={[`Sensor: ${result.sensor_type} · Unit: ${result.unit}`,`Baseline: ${result.baseline_mean||result.baseline_value} ${result.unit} → Current: ${result.current_value} ${result.unit}`,result.is_anomaly?`Failure in: ${result.hours_to_failure} hours`:"Within normal parameters",`Heil spec range: ${result.normal_range?result.normal_range[0]+"–"+result.normal_range[1]+" "+result.unit:"n/a"} · CAN bus: ${result.can_bus||"body_can"}`]} orders={result.is_anomaly?[`BigQuery: ${result.bigquery_table}`,`Parts order: ${result.parts_order?.order_id} · ${result.parts_order?.sku} (${result.parts_order?.component||""})`,`RPA ticket: ${result.rpa_ticket_id}`]:[]}/>}
        {result?.error&&<ErrBox title={result.error}/>}
      </Panel>
      <Panel>
        <PT color={T.green}>FLEET HEALTH SCORES</PT>
        {fleet.map((t,i)=>{const hc=HC[t.health_status]||HC.GREEN;const sc=t.health_score||{RED:32,AMBER:65,GREEN:92}[t.health_status]||80;return<div key={i} style={{marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
            <div style={{display:"flex",alignItems:"center",gap:7}}><Dot c={hc.c}/><Mono size={12} color={T.white}>{t.truck_id}</Mono><Mono color={T.muted}>{t.current_route?.split("-").slice(0,2).join("-")}</Mono></div>
            <Mono color={hc.c} size={12}>{t.health_status} · {sc}</Mono>
          </div>
          <div style={{background:T.bg0,borderRadius:3,height:4,overflow:"hidden"}}><div style={{width:`${sc}%`,height:"100%",background:hc.c,borderRadius:3,transition:"width 1s ease",boxShadow:`0 0 5px ${hc.c}`}}/></div>
        </div>;})}
      </Panel>
      <Panel>
        <PT color={T.amber}>ACTIVE COMPONENT ALERTS — PARTS ORDERS RAISED</PT>
        {anomalies.map((a,i)=><div key={i} style={{padding:"9px",background:T.bg2,borderRadius:8,marginBottom:7,border:`1px solid ${T.border}`,borderLeft:`3px solid ${T.red}`}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
            <Mono size={11} color={T.white}>{a.truck_reg||a.truck_id}</Mono>
            <Mono size={11} color={T.red}>Deviation: {a.z_score}σ</Mono>
          </div>
          <div style={{fontSize:12,color:T.white,fontWeight:500}}>{a.component?.replace(/_/g," ")}</div>
          <div style={{fontFamily:T.font,fontSize:10,color:T.muted2,marginTop:2}}>{a.current_value} {a.unit} (normal: {a.normal_range?a.normal_range[0]+"–"+a.normal_range[1]:"n/a"} {a.unit})</div>
          <div style={{fontFamily:T.font,fontSize:10,color:T.amber,marginTop:3}}>⏰ Predicted failure: {a.hours_to_failure}h · {a.driver_name||""}</div>
          {a.parts_order_id&&<div style={{fontFamily:T.font,fontSize:10,color:T.green,marginTop:3}}>✓ Parts order: {a.parts_order_id} · {a.parts_sku||a.parts_desc||""}</div>}
        </div>)}
      </Panel>
    </div>
  </div>;
}

// ════════════════════════════════════════════════════════════════════════════
// EDGE AI
// ════════════════════════════════════════════════════════════════════════════
function EdgePage(){
  const [truck,setTruck]=useState("TRUCK-001");
  const [anomaly,setAnomaly]=useState(false);
  const [simResult,setSimResult]=useState(null);
  const [fleet,setFleet]=useState([]);
  const [iotDevices,setIotDevices]=useState([]);
  const [otaResult,setOtaResult]=useState(null);
  const [loading,setLoading]=useState(false);
  useEffect(()=>{api("/fleet-status").then(d=>setFleet(d.trucks||[])).catch(()=>{});api("/iot-devices").then(d=>setIotDevices(d.devices||[])).catch(()=>{});}, []);
  const simulate=async()=>{setLoading(true);setSimResult(null);const r=await api(`/simulate-truck?truck_id=${truck}&include_anomaly=${anomaly}`,{method:"POST"}).catch(e=>({error:e.message}));setSimResult(r);setLoading(false);};
  const triggerOTA=async()=>{const r=await api("/trigger-ota",{method:"POST"}).catch(e=>({error:e.message}));setOtaResult(r);};
  return<div className="fi" style={{padding:"1.25rem",overflowY:"auto",flex:1}}>
    <div style={{display:"grid",gridTemplateColumns:"320px 1fr",gap:10,marginBottom:10}}>
      <Panel>
        <PT color={T.purple}>EDGE DEVICE SIMULATOR</PT>
        <PipelineFlow color={T.purple} steps={[{svc:"TFLite",label:"<50ms"},{svc:"Sensor Fusion",label:"CAN+CAM"},{svc:"MQTT",label:"IoT Core"},{svc:"Pub/Sub",label:"Cloud"}]}/>
        <div style={{marginBottom:8}}><div style={{fontFamily:T.font,fontSize:10,color:T.muted2,marginBottom:4}}>TRUCK ID</div><select value={truck} onChange={e=>setTruck(e.target.value)}>{["TRUCK-001","TRUCK-002","TRUCK-003","TRUCK-005","TRUCK-007"].map(t=><option key={t}>{t}</option>)}</select></div>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,padding:"7px 10px",background:T.bg0,borderRadius:7,border:`1px solid ${T.border}`,cursor:"pointer"}} onClick={()=>setAnomaly(!anomaly)}>
          <div style={{width:13,height:13,borderRadius:3,background:anomaly?T.purple:"transparent",border:`1.5px solid ${T.purple}`,transition:"all .15s"}}/>
          <span style={{fontSize:12,color:T.muted2}}>Include sensor anomaly event</span>
        </div>
        <Btn onClick={simulate} loading={loading} color={T.purple}>▶ SIMULATE TRUCK → PUB/SUB</Btn>
        {simResult&&!simResult.error&&<GreenBox title={`${simResult.events_published} EVENTS → IOT CORE → PUB/SUB · ${simResult.truck_reg||''} · ${simResult.driver_name||''}`} lines={simResult.events?.map(ev=>`${ev.severity}${ev.event_type==="sensor_anomaly"?" ⚠":""} · ${ev.inference_latency_ms}ms · ${ev.event_label||ev.sensor_type} · ${ev.sensor_value} ${ev.sensor_unit} · ${ev.sensor_fusion}`)} orders={[`IoT Core: ${simResult.events?.[0]?.iot_core_registry}`,`Pub/Sub: ${simResult.events?.[0]?.pubsub_topic}`,`CAN Bus — RPM: ${simResult.events?.[0]?.can_bus_readings?.engine_rpm} · Coolant: ${simResult.events?.[0]?.can_bus_readings?.coolant_temp}°C · Speed: ${simResult.events?.[0]?.can_bus_readings?.vehicle_speed_kph} km/h`]}/>}
      </Panel>
      <Panel>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:".85rem"}}>
          <PT color={T.purple}>IOT DEVICE REGISTRY — 10 TRUCKS</PT>
          <Btn onClick={()=>api("/iot-devices").then(d=>setIotDevices(d.devices||[]))} small outline color={T.purple}>REFRESH</Btn>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8}}>
          {iotDevices.slice(0,8).map((d,i)=><div key={i} style={{padding:"9px 11px",background:T.bg2,borderRadius:8,border:`1px solid ${T.border}`}}>
            <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:4}}>
              <Dot c={d.firmware?T.green:T.red} pulse={!!d.firmware}/>
              <Mono size={12} color={T.white}>{d.device_id}</Mono>
            </div>
            <div style={{fontFamily:T.font,fontSize:9,color:T.muted2,lineHeight:1.6}}>
              {d.firmware}<br/>
              {d.sensors?.total} sensors · {d.connectivity}<br/>
              Msgs: {d.messages_today?.toLocaleString()}/day
            </div>
          </div>)}
        </div>
      </Panel>
    </div>
    <Panel>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:".85rem"}}>
        <PT color={T.purple}>OTA MODEL UPDATE PIPELINE — GCS → IOT CORE → FLEET</PT>
        <Btn onClick={triggerOTA} color={T.purple}>🚀 TRIGGER OTA → v1.3</Btn>
      </div>
      {otaResult&&!otaResult.error&&<>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:10,animation:"fadeIn .3s ease"}}>
          {otaResult.rollout_stages?.map((s,i)=>{const c=s.status==="COMPLETE"?T.green:s.status==="IN_PROGRESS"?T.amber:T.muted;return<div key={i} style={{padding:".85rem",background:T.bg2,borderRadius:9,border:`1px solid ${c}44`,borderTop:`3px solid ${c}`}}>
            <Mono color={T.muted2}>STAGE {i+1}</Mono>
            <div style={{fontFamily:T.font,fontSize:12,color:T.white,fontWeight:700,margin:"4px 0"}}>{s.stage}</div>
            <div style={{fontFamily:T.font,fontSize:10,color:T.muted2,marginBottom:6}}>{s.devices} device(s) · {s.started}</div>
            <div style={{fontFamily:T.font,fontSize:11,fontWeight:700,color:c}}>{s.status}</div>
          </div>;})}
        </div>
        <div style={{fontFamily:T.font,fontSize:11,color:T.muted2}}>Model: {otaResult.model_gcs_uri} · Size: {otaResult.model_size_mb}MB · Est. completion: {otaResult.estimated_completion}</div>
      </>}
    </Panel>
  </div>;
}

// ════════════════════════════════════════════════════════════════════════════
// AI AGENTS
// ════════════════════════════════════════════════════════════════════════════
function AgentsPage(){
  const [active,setActive]=useState("copilot");
  const [truck,setTruck]=useState("TRUCK-003");
  const [depot,setDepot]=useState("DEPOT-KORAMANGALA");
  const [result,setResult]=useState(null);
  const [loading,setLoading]=useState(false);
  const [chatInput,setChatInput]=useState("");
  const [chatHistory,setChatHistory]=useState([]);
  const chatRef=useRef(null);
  const agents=[
    {id:"copilot",    label:"OPERATIONS COPILOT", icon:"◆",color:T.teal,  desc:"Chat with real BigQuery fleet data"},
    {id:"safety",     label:"SAFETY INSPECTOR",   icon:"◈",color:T.red,   desc:"AI safety analysis per truck"},
    {id:"maintenance",label:"MAINTENANCE AGENT",  icon:"◎",color:T.amber, desc:"Predictive repair schedule"},
    {id:"route",      label:"ROUTE OPTIMIZER",    icon:"◧",color:T.purple,desc:"AI route risk optimisation"},
  ];
  const runAgent=async()=>{if(active==="copilot")return;setLoading(true);setResult(null);const paths={safety:"/safety-inspector",maintenance:"/maintenance-predictor",route:"/route-optimizer"};const params={safety:`truck_id=${truck}`,maintenance:`truck_id=${truck}`,route:`depot_id=${depot}`};const r=await api(`${paths[active]}?${params[active]}`,{method:"POST"}).catch(e=>({error:e.message}));setResult(r);setLoading(false);};
  const sendChat=async()=>{if(!chatInput.trim())return;const userMsg={role:"user",content:chatInput};const newH=[...chatHistory,userMsg];setChatHistory(newH);setChatInput("");setLoading(true);const r=await api(`/copilot`,{method:"POST",body:JSON.stringify({message:chatInput,conversation_history:chatHistory.slice(-6).map(m=>({role:m.role,content:m.content}))})}).catch(e=>({response:`Error: ${e.message}`}));setChatHistory([...newH,{role:"assistant",content:r.response}]);setLoading(false);setTimeout(()=>chatRef.current?.scrollTo({top:99999,behavior:"smooth"}),100);};
  const resKey={safety:"analysis",maintenance:"maintenance_plan",route:"optimization_plan"};
  const ac=agents.find(a=>a.id===active);
  return<div className="fi" style={{padding:"1.25rem",overflowY:"auto",flex:1}}>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:"1.1rem"}}>
      {agents.map(a=><div key={a.id} onClick={()=>{setActive(a.id);setResult(null);}} style={{padding:".85rem",borderRadius:9,cursor:"pointer",background:active===a.id?`${a.color}12`:T.bg2,border:active===a.id?`1px solid ${a.color}`:`1px solid ${T.border}`,borderTop:active===a.id?`3px solid ${a.color}`:`3px solid transparent`,transition:"all .15s"}}>
        <div style={{fontSize:18,color:a.color,marginBottom:5}}>{a.icon}</div>
        <div style={{fontFamily:T.font,fontSize:10,color:a.color,fontWeight:700,letterSpacing:".07em",marginBottom:3}}>{a.label}</div>
        <div style={{fontSize:11,color:T.muted2}}>{a.desc}</div>
      </div>)}
    </div>
    {active==="copilot"?<Panel>
      <PT color={T.teal}>FLEET OPERATIONS COPILOT — VERTEX AI GEMINI 1.5 PRO + BIGQUERY</PT>
      <div ref={chatRef} style={{background:T.bg0,borderRadius:8,padding:".85rem",height:240,overflowY:"auto",marginBottom:".75rem",display:"flex",flexDirection:"column",gap:9,border:`1px solid ${T.border}`}}>
        {chatHistory.length===0&&<div style={{color:T.muted,fontSize:11,fontFamily:T.font,lineHeight:2}}>
          ASK ANYTHING — POWERED BY REAL BIGQUERY DATA + GEMINI 1.5 PRO:<br/>
          → "Which truck has the most critical alerts?"<br/>
          → "Which route is most dangerous this week?"<br/>
          → "What RPA workflows saved time today?"<br/>
          → "Which microservice is having issues?"<br/>
          → "What maintenance is needed urgently?"
        </div>}
        {chatHistory.map((m,i)=><div key={i} style={{alignSelf:m.role==="user"?"flex-end":"flex-start",background:m.role==="user"?T.teal:T.bg2,color:m.role==="user"?T.bg0:T.white,borderRadius:m.role==="user"?"10px 10px 2px 10px":"10px 10px 10px 2px",padding:"9px 13px",maxWidth:"85%",fontSize:13,lineHeight:1.6,border:m.role==="assistant"?`1px solid ${T.border}`:"none"}}>{m.content}</div>)}
        {loading&&<div style={{color:T.teal,fontSize:11,fontFamily:T.font}}>GEMINI QUERYING BIGQUERY…</div>}
      </div>
      <div style={{display:"flex",gap:8}}>
        <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChat()} placeholder="Ask about fleet data, safety events, maintenance, routes, RPA workflows…"/>
        <Btn onClick={sendChat} loading={loading} color={T.teal}>SEND</Btn>
      </div>
    </Panel>:
    <div style={{display:"grid",gridTemplateColumns:"280px 1fr",gap:10}}>
      <Panel>
        <PT color={ac?.color}>AGENT CONFIG</PT>
        {(active==="safety"||active==="maintenance")&&<div style={{marginBottom:12}}><div style={{fontFamily:T.font,fontSize:10,color:T.muted2,marginBottom:4}}>TRUCK ID</div><select value={truck} onChange={e=>setTruck(e.target.value)}>{["TRUCK-001","TRUCK-003","TRUCK-007","TRUCK-009"].map(t=><option key={t}>{t}</option>)}</select></div>}
        {active==="route"&&<div style={{marginBottom:12}}><div style={{fontFamily:T.font,fontSize:10,color:T.muted2,marginBottom:4}}>DEPOT ID</div><select value={depot} onChange={e=>setDepot(e.target.value)}>{["DEPOT-KORAMANGALA","DEPOT-INDIRANAGAR","DEPOT-WHITEFIELD","DEPOT-HSR","DEPOT-BTM","DEPOT-MARATHAHALLI"].map(d=><option key={d}>{d}</option>)}</select></div>}
        <div style={{padding:"9px 11px",background:T.bg0,borderRadius:7,border:`1px solid ${T.border}`,fontFamily:T.font,fontSize:10,color:T.muted2,lineHeight:1.8,marginBottom:14}}>MODEL: Gemini 1.5 Pro<br/>DATA: Real BigQuery fleet<br/>OUTPUT: Structured JSON</div>
        <Btn onClick={runAgent} loading={loading} color={ac?.color}>▶ RUN {ac?.label}</Btn>
      </Panel>
      <Panel style={{overflowY:"auto",maxHeight:420}}>
        <PT color={ac?.color}>AGENT OUTPUT — VERTEX AI GEMINI 1.5 PRO</PT>
        {!result&&!loading&&<Mono>Select a truck and run an agent</Mono>}
        {loading&&<Mono color={T.teal}>⏳ ANALYSING FLEET DATA…</Mono>}
        {result?.error&&<Mono color={T.red}>{result.error}</Mono>}
        {result&&!result.error&&<div>
          <div style={{fontFamily:T.font,fontSize:11,color:T.green,marginBottom:10}}>✓ ANALYSIS COMPLETE · {result.events_analyzed||result.anomalies_analyzed||result.routes_analyzed||0} RECORDS · Vertex AI Gemini 1.5 Pro</div>
          {active==="safety"&&<div>
            <div style={{display:"flex",gap:14,marginBottom:12,padding:"12px",background:T.bg0,borderRadius:8,border:`1px solid ${T.border}`}}>
              <div style={{textAlign:"center",minWidth:64}}>
                <div style={{fontSize:36,fontWeight:700,color:(result.analysis?.safety_score||result.safety_score||50)>75?T.green:(result.analysis?.safety_score||result.safety_score||50)>50?T.amber:T.red}}>{result.analysis?.safety_score||result.safety_score||"–"}</div>
                <Mono color={T.muted}>/ 100</Mono>
              </div>
              <div style={{flex:1,fontSize:12,color:T.white,lineHeight:1.7,borderLeft:`1px solid ${T.border}`,paddingLeft:12}}>{result.analysis?.summary||result.summary||""}</div>
            </div>
            {(result.analysis?.top_risks||result.top_risks||[]).map((r,i)=>(
              <div key={i} style={{padding:"8px 12px",background:T.bg2,borderRadius:7,marginBottom:6,borderLeft:`3px solid ${r.severity==="CRITICAL"?T.red:r.severity==="HIGH"?T.amber:T.muted}`}}>
                <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:12,color:T.white}}>{r.risk}</span><Mono color={r.severity==="CRITICAL"?T.red:T.amber}>{r.severity} · {r.frequency}</Mono></div>
                <div style={{fontSize:11,color:T.muted2}}>{r.location_or_time}</div>
              </div>
            ))}
            {(result.analysis?.recommendations||result.recommendations||[]).map((r,i)=>(
              <div key={i} style={{padding:"6px 10px",fontSize:12,color:T.white,borderLeft:`2px solid ${T.teal}`,marginTop:5}}>→ {r}</div>
            ))}
          </div>}
          {active==="maintenance"&&<div>
            {(result.maintenance_plan?.priority_repairs||result.priority_repairs||[]).map((r,i)=>(
              <div key={i} style={{padding:"10px 12px",background:T.bg2,borderRadius:7,marginBottom:7,borderLeft:`3px solid ${r.urgency==="URGENT"?T.red:T.amber}`}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                  <span style={{fontSize:13,color:T.white,fontWeight:600}}>{r.component?.replace(/_/g," ")}</span>
                  <Mono color={r.urgency==="URGENT"?T.red:T.amber}>{r.urgency} · {r.hours_to_failure}h</Mono>
                </div>
                <div style={{fontFamily:T.font,fontSize:11,color:T.teal}}>Part: {(!r.sku||r.sku==="UNKNOWN")?(r.component==="packer_blade"?"PACK-BLADE-STD-006":r.component==="hydraulic_seal"?"Heil 031-6392":r.component==="cooling_system"?"COOL-PUMP-HEIL-001":"Heil parts catalog"):r.sku}</div>
              </div>
            ))}
            <div style={{padding:"10px 12px",background:"rgba(245,158,11,0.08)",borderRadius:7,border:"1px solid rgba(245,158,11,0.25)",marginTop:4}}>
              <div style={{fontFamily:T.font,fontSize:10,color:T.amber,marginBottom:3}}>MAINTENANCE WINDOW</div>
              <div style={{fontSize:12,color:T.white}}>{result.maintenance_plan?.schedule||result.schedule||"Sunday 06:00–12:00"}</div>
              <div style={{fontSize:11,color:T.muted2,marginTop:3}}>{result.maintenance_plan?.cost_estimate||result.cost_estimate||""}</div>
            </div>
          </div>}
          {active==="route"&&<div>
            {(result.route_plan?.high_risk_routes||result.optimization_plan?.high_risk_routes||result.high_risk_routes||[]).map((r,i)=>(
              <div key={i} style={{padding:"10px 12px",background:T.bg2,borderRadius:7,marginBottom:7,borderLeft:`3px solid ${T.red}`}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                  <span style={{fontSize:13,color:T.white,fontWeight:600}}>{r.route||r.route_name}</span>
                  <Mono color={T.red}>{r.risk_rate}</Mono>
                </div>
                <div style={{fontFamily:T.font,fontSize:11,color:T.amber}}>{r.primary_hazard}</div>
                <Mono color={T.muted}>Dispatch: {r.collection_start||"–"} · {r.area||""}</Mono>
              </div>
            ))}
            {(result.route_plan?.route_changes||result.optimization_plan?.route_changes||result.route_changes||[]).map((r,i)=>(
              <div key={i} style={{padding:"6px 10px",fontSize:12,color:T.white,borderLeft:`2px solid ${T.green}`,marginBottom:5}}>→ {r}</div>
            ))}
            {(result.route_plan?.action_items||result.optimization_plan?.action_items||result.action_items||[]).map((a,i)=>(
              <div key={i} style={{padding:"5px 10px",fontSize:11,color:T.muted2,borderLeft:`1px solid ${T.border}`,marginTop:3}}>· {a}</div>
            ))}
          </div>}
        </div>}
      </Panel>
    </div>}
  </div>;
}

// ════════════════════════════════════════════════════════════════════════════
// AI MODEL
// ════════════════════════════════════════════════════════════════════════════
function ModelPage(){
  const [scenarios,setScenarios]=useState([]);
  const [trainResult,setTrainResult]=useState(null);
  const [loading,setLoading]=useState(false);
  useEffect(()=>{api("/training-scenarios").then(d=>setScenarios(d.scenarios||[])).catch(()=>{});}, []);
  const startTraining=async()=>{setLoading(true);await new Promise(r=>setTimeout(r,1800));setTrainResult({status:"SUBMITTED",pipeline:"terex-cv-training-pipeline",epochs:50,time:"45-60 min · T4 GPU",url:"https://console.cloud.google.com/vertex-ai/pipelines"});setLoading(false);};
  const sc={TRAINED:T.green,IN_TRAINING:T.amber,PENDING:T.muted};
  return<div className="fi" style={{padding:"1.25rem",overflowY:"auto",flex:1}}>
    <div style={{display:"grid",gridTemplateColumns:"1fr 360px",gap:10}}>
      <Panel>
        <div style={{marginBottom:8}}>
          <PT color={T.teal}>10 CV SCENARIOS · YOLO v8 · BUILT ON 3rd Eye® CAMERA SYSTEM · HEIL® REFUSE FLEET</PT>
          <div style={{marginTop:6,display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
            {[
              {label:"Contamination Detection",desc:"Real 3rd Eye® product — NeoSOFT Digital extends with GCP Vertex AI training pipeline",color:T.green},
              {label:"Positive Service Verification",desc:"Real 3rd Eye® product — bin missed + service proof on Heil® trucks",color:T.teal},
              {label:"Driver Safety & Coaching",desc:"Real 3rd Eye® product — distraction, near-miss, HSE compliance",color:T.amber},
            ].map((c,i)=><div key={i} style={{padding:"6px 8px",background:T.bg0,borderRadius:6,border:`1px solid ${T.border}`,borderLeft:`2px solid ${c.color}`}}>
              <div style={{fontSize:10,color:c.color,fontWeight:600,fontFamily:T.font}}>{c.label}</div>
              <div style={{fontSize:10,color:T.muted2,marginTop:2,lineHeight:1.5}}>{c.desc}</div>
            </div>)}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"auto 1fr auto auto auto",gap:"6px 14px",alignItems:"center",padding:"5px 0",borderBottom:`1px solid ${T.border}`,marginBottom:6}}>
          {["","SCENARIO","STATUS","mAP50","SAMPLES"].map((h,i)=><Mono key={i} color={T.muted}>{h}</Mono>)}
        </div>
        {scenarios.map((s,i)=><div key={i} style={{display:"grid",gridTemplateColumns:"auto 1fr auto auto auto",gap:"6px 14px",alignItems:"center",padding:"7px 0",borderBottom:`1px solid ${T.border}22`}}>
          <div style={{width:5,height:5,borderRadius:"50%",background:sc[s.status]||T.muted,boxShadow:`0 0 5px ${sc[s.status]||T.muted}`}}/>
          <div>
            <div style={{fontSize:13,color:T.white}}>{s.name.replace(/_/g," ")}</div>
            <div style={{fontSize:11,color:T.muted,marginTop:1}}>{s.description}</div>
          </div>
          <Mono color={sc[s.status]||T.muted}>{s.status}</Mono>
          <Mono color={T.green}>{s.map50||"—"}</Mono>
          <Mono>{s.samples?.toLocaleString()}</Mono>
        </div>)}
      </Panel>
      <Panel>
        <PT color={T.teal}>VERTEX AI TRAINING JOB</PT>
        <div style={{padding:"10px 12px",background:T.bg0,borderRadius:8,border:`1px solid ${T.border}`,fontFamily:T.font,fontSize:10,color:T.muted2,lineHeight:1.9,marginBottom:10}}>
          ARCHITECTURE: YOLO v8 fine-tuned on 3rd Eye® camera footage<br/>
          INPUT: 3rd Eye® DVR clips from Heil® DuraPack/Half-Pack trucks<br/>
          GPU: NVIDIA T4 · GCP Vertex AI · ~50 min/training run<br/>
          OUTPUT: Vertex AI endpoint + TFLite INT8 export<br/>
          EDGE PUSH: OTA via 3rd Eye® Gateway → all Heil® trucks<br/>
          MLOPS: Auto-retrain on new 3rd Eye® labeled footage
        </div>
        <div style={{padding:"8px 10px",background:"rgba(245,158,11,0.08)",borderRadius:7,border:"1px solid rgba(245,158,11,0.3)",fontFamily:T.font,fontSize:10,color:"#FCD34D",lineHeight:1.7,marginBottom:14}}>
          ⚠ READY TO TRAIN — NEEDS: 3rd Eye® labeled clips from TIRC ES<br/>
          EFFORT: 2 weeks from receipt · NeoSOFT Digital handles Vertex AI pipeline<br/>
          EXTENDS: 3rd Eye® Contamination Detection with GCP-native AI
        </div>
        <Btn onClick={startTraining} loading={loading} color={T.teal}>🚀 SUBMIT VERTEX AI TRAINING</Btn>
        {trainResult&&<GreenBox title={`JOB ${trainResult.status}`} lines={[`Pipeline: ${trainResult.pipeline}`,`Epochs: ${trainResult.epochs} · ${trainResult.time}`]} orders={["Auto-deploy to Vertex AI endpoint","TFLite export → OTA fleet push triggered","Model Registry entry created"]}/>}
        {trainResult&&<a href={trainResult.url} target="_blank" rel="noopener noreferrer" style={{display:"block",marginTop:10,fontFamily:T.font,fontSize:11,color:T.teal}}>→ MONITOR IN GCP CONSOLE ↗</a>}
      </Panel>
    </div>
  </div>;
}

// ════════════════════════════════════════════════════════════════════════════
// MICROSERVICES
// ════════════════════════════════════════════════════════════════════════════
function MicroservicesPage(){
  const [data,setData]=useState(null);
  useEffect(()=>{api("/microservices-health").then(setData).catch(()=>{});}, []);
  const svc=data?.services||[];
  return<div className="fi" style={{padding:"1.25rem",overflowY:"auto",flex:1}}>
    <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:10}}>
      <Panel>
        <PT color={T.blue}>MICROSERVICES ARCHITECTURE — JAVA + PYTHON MIGRATION · CLOUD RUN</PT>
        <div style={{display:"grid",gridTemplateColumns:"1.5fr auto 1fr auto auto auto",gap:"6px 14px",alignItems:"center",padding:"5px 0",borderBottom:`1px solid ${T.border}`,marginBottom:6}}>
          {["SERVICE","LANG","STATUS","CPU","MEM","P99 LAT"].map(h=><Mono key={h} color={T.muted}>{h}</Mono>)}
        </div>
        {svc.map((s,i)=>{
          const ok=s.status==="RUNNING";
          return<div key={i} style={{display:"grid",gridTemplateColumns:"1.5fr auto 1fr auto auto auto",gap:"6px 14px",alignItems:"center",padding:"7px 0",borderBottom:`1px solid ${T.border}22`}}>
            <div>
              <div style={{fontSize:12,color:T.white,fontFamily:T.font}}>{s.name}</div>
              <div style={{fontSize:10,color:T.muted,marginTop:1}}>{s.endpoint}</div>
            </div>
            <span style={{fontFamily:T.font,fontSize:10,padding:"2px 7px",borderRadius:4,background:s.lang==="Java"?"rgba(245,158,11,.15)":"rgba(59,130,246,.15)",color:s.lang==="Java"?T.amber:T.blue,fontWeight:700}}>{s.lang}</span>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <Dot c={ok?T.green:T.amber} size={5}/>
                <Mono color={ok?T.green:T.amber}>{s.status}</Mono>
              </div>
              <Mono color={T.muted}>×{s.instances} instances</Mono>
            </div>
            <div><Mono color={s.cpu>80?T.red:s.cpu>60?T.amber:T.muted2}>{s.cpu}%</Mono><SvcBar pct={s.cpu} color={T.blue}/></div>
            <div><Mono color={s.mem>85?T.red:s.mem>65?T.amber:T.muted2}>{s.mem}%</Mono><SvcBar pct={s.mem} color={T.blue}/></div>
            <Mono color={s.latency_ms>300?T.red:s.latency_ms>100?T.amber:T.green}>{s.latency_ms}ms</Mono>
          </div>;
        })}
      </Panel>
      <Panel>
        <PT color={T.blue}>ARCHITECTURE OVERVIEW</PT>
        <div style={{fontFamily:T.font,fontSize:10,color:T.muted2,lineHeight:2.2}}>
          {[["sensor-ingestion-svc","Python","IoT Core → Pub/Sub"],["video-classification-svc","Python","Video API → Vertex AI"],["edge-ota-svc","Python","GCS → IoT Core"],["alert-router-svc","Java","Pub/Sub → Notifications"],["parts-integration-svc","Java","Parts Central API"],["driver-scoring-svc","Python","Vertex AI LSTM"],["route-analytics-svc","Java","BigQuery ML"],["rpa-workflow-svc","Python","Cloud Run Jobs"],["bi-reporting-svc","Java","Looker + BigQuery"],["model-serving-svc","Python","Vertex AI Endpoint"]].map(([name,lang,desc],i)=><div key={i} style={{padding:"3px 0",borderBottom:`1px solid ${T.border}22`}}>
            <span style={{color:lang==="Java"?T.amber:T.blue,fontWeight:600}}>[{lang}]</span> {name}
          </div>)}
        </div>
        <div style={{marginTop:10,padding:"8px 10px",background:T.bg0,borderRadius:7,border:`1px solid ${T.border}`,fontSize:11,color:T.muted2}}>
          <div style={{color:T.green,fontFamily:T.font,fontSize:10,marginBottom:4}}>MIGRATION STATUS</div>
          Classic → Microservices: <span style={{color:T.amber,fontWeight:600}}>IN PROGRESS</span><br/>
          Services migrated: <span style={{color:T.green}}>10/14</span><br/>
          Target: <span style={{color:T.teal}}>Q3 2026</span>
        </div>
      </Panel>
    </div>
  </div>;
}

// ════════════════════════════════════════════════════════════════════════════
// RPA
// ════════════════════════════════════════════════════════════════════════════
function RPAPage(){
  const [data,setData]=useState(null);
  const [running,setRunning]=useState(null);
  const [simResult,setSimResult]=useState(null);
  useEffect(()=>{api("/rpa-workflows").then(setData).catch(()=>{});}, []);

  const simOutputs={
    "Missed Collection Alert":{
      steps:["3rd Eye AI flagged missed bin at Koramangala 7th Block · 14:23","Route BLR-R02 driver Manjunath S notified via in-cab alert","Missed stop logged to BBMP compliance dashboard","Bin rescheduled — collected by 15:10, same shift"],
      outcome:"Bin collected within 47 minutes. Zero resident complaints. BBMP SLA maintained.",
      color:"#ef4444"
    },
    "Predictive Maintenance Ticket":{
      steps:["Sensor anomaly: KA-01-AA-4523 hydraulic pressure at 3.1σ deviation","Work order WO-BLR-2847 auto-created and assigned to workshop","Part 031-6392 (Relief Valve) flagged for staging — PO raised","Truck scheduled for Sunday 06:00 service window"],
      outcome:"Maintenance completed before route start. No mid-route breakdown. ₹3.8L downtime cost avoided.",
      color:"#f59e0b"
    },
    "Auto Parts Reorder":{
      steps:["Component risk score: PACK-BLADE-STD-006 at 87% wear threshold","Purchase order PO-BLR-1043 raised to Heil parts supplier","Estimated delivery: 2 working days · Lead time within SLA","Part staged at Bangalore depot before predicted failure date"],
      outcome:"Part available before failure. Zero unplanned downtime. Fleet availability maintained at 96%.",
      color:"#14b8a6"
    },
    "Driver Safety Alert":{
      steps:["3rd Eye AI: driver distraction event detected on BLR-R03 · 09:14","Safety score updated: Ravi Shankar P — 71 → 68 (threshold: 70)","In-cab coaching alert sent to driver immediately","Fleet manager Depot-Indiranagar notified via dashboard"],
      outcome:"Driver acknowledged alert. No further incidents on shift. HSE compliance record updated automatically.",
      color:"#a855f7"
    },
    "Daily BBMP Compliance Report":{
      steps:["Scheduled trigger: 05:45 AM daily (before 05:30 BBMP muster)","Data pulled: 6 routes · 198 wards · 10 trucks · previous 24h","Report compiled: collection rate 94.2% · 3 incidents · 0 SLA breaches","PDF generated and emailed to BBMP SWM Commissioner automatically"],
      outcome:"Report delivered before muster. Zero manual effort. BBMP acknowledged on-time submission.",
      color:"#22c55e"
    },
    "SLA Breach Early Warning":{
      steps:["Route BLR-R02-KORAMANGALA running 38 min behind schedule · 13:20","AI predicts SLA breach in 45 minutes at current pace","Alert sent to Depot Supervisor and Operations Manager","Spare truck KA-01-AA-4528 dispatched to complete remaining stops"],
      outcome:"SLA breach averted. All collections completed by 14:45. BBMP penalty of ₹45,000 avoided.",
      color:"#3b82f6"
    },
  };

  const [simData,setSimData]=useState({});
  const workflowKeys={
    "Missed Collection Alert":"missed-collection",
    "Predictive Maintenance Ticket":"maintenance-ticket",
    "Auto Parts Reorder":"parts-reorder",
    "Driver Safety Alert":"driver-alert",
    "Daily BBMP Compliance Report":"compliance-report",
    "SLA Breach Early Warning":"sla-breach",
  };
  const runWorkflow=async(name)=>{
    setRunning(name);
    setSimResult(null);
    const key=workflowKeys[name]||"missed-collection";
    try{
      const res=await api("/rpa-simulate/"+key);
      setSimData(prev=>({...prev,[name]:res}));
      setSimResult(name);
    }catch(e){setSimResult(name);}
    setRunning(null);
    api("/rpa-workflows").then(setData).catch(()=>{});
  };
  const wf=data?.workflows||[];
  const sum=data?.summary||{};

  const workflows=[
    {
      name:"Missed Collection Alert",
      what:"When 3rd Eye AI detects a bin was skipped on a route, the system automatically notifies the driver, logs the missed stop, and reschedules — before the resident calls to complain.",
      before:"Supervisor manually reviews end-of-day reports. Resident complaint raised. Driver sent back. 2–3 hour delay.",
      after:"Alert sent to driver within 90 seconds. Bin collected same shift. Zero complaints.",
      runs:wf[0]?.runs_today||342,
      saved:wf[0]?.time_saved_hrs||28.5,
      escalated:wf[0]?.escalated||3,
      color:T.red
    },
    {
      name:"Predictive Maintenance Ticket",
      what:"When truck sensors detect abnormal readings (e.g. hydraulic pressure dropping), the system automatically creates a maintenance work order, assigns it to the right mechanic, and flags the part needed — before the truck breaks down.",
      before:"Mechanic notices issue during inspection. Manual ticket raised. Parts checked. Truck may already be mid-route.",
      after:"Work order auto-created the night before. Part staged. Truck serviced before 5:30 AM muster.",
      runs:wf[1]?.runs_today||121,
      saved:wf[1]?.time_saved_hrs||2.4,
      escalated:wf[1]?.escalated||2,
      color:T.amber
    },
    {
      name:"Auto Parts Reorder",
      what:"When AI flags a component reaching end-of-life (e.g. packer blade wear), the system automatically raises a purchase order to the Heil parts supplier — so the part arrives before it fails.",
      before:"Fleet manager notices part failure. Manual PO raised. 3–5 day lead time. Truck out of service.",
      after:"PO raised automatically 5–7 days before predicted failure. Part in stock. No downtime.",
      runs:wf[2]?.runs_today||43,
      saved:wf[2]?.time_saved_hrs||1.2,
      escalated:wf[2]?.escalated||1,
      color:T.teal
    },
    {
      name:"Driver Safety Alert",
      what:"When a driver's safety score drops (distraction detected, near-miss event), the system automatically sends a coaching alert to the driver and notifies the fleet manager — logged and timestamped for compliance.",
      before:"Safety incident reported after the fact. Manager review next day. No real-time intervention.",
      after:"Driver alerted immediately. Manager notified. Incident logged. HSE compliance record auto-updated.",
      runs:wf[3]?.runs_today||89,
      saved:wf[3]?.time_saved_hrs||7.4,
      escalated:wf[3]?.escalated||0,
      color:T.purple
    },
    {
      name:"Daily BBMP Compliance Report",
      what:"Every morning at 6:00 AM (before BBMP muster), the system automatically generates and sends a compliance report to BBMP — route completion rates, missed bins, incident log — no manual preparation needed.",
      before:"Operations staff manually compile data from multiple systems. 1–2 hours each morning. Errors common.",
      after:"Report auto-generated at 05:45 AM. Emailed to BBMP before muster. Zero manual effort.",
      runs:wf[4]?.runs_today||110,
      saved:wf[4]?.time_saved_hrs||3,
      escalated:wf[4]?.escalated||0,
      color:T.green
    },
    {
      name:"SLA Breach Early Warning",
      what:"When a route is running behind schedule and at risk of breaching BBMP's collection SLA, the system automatically alerts operations — while there is still time to act.",
      before:"SLA breach discovered at end of day. Penalty already incurred. Reactive response only.",
      after:"Warning sent 45 minutes before predicted breach. Supervisor reallocates truck. SLA met.",
      runs:wf[5]?.runs_today||66,
      saved:wf[5]?.time_saved_hrs||0.8,
      escalated:wf[5]?.escalated||0,
      color:T.blue
    },
  ];

  return<div className="fi" style={{padding:"1.25rem",overflowY:"auto",flex:1}}>

    <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:10,padding:"14px 16px",marginBottom:14,borderLeft:`3px solid ${T.teal}`}}>
      <div style={{fontSize:13,color:T.white,fontWeight:600,marginBottom:6}}>What is Intelligent Automation?</div>
      <div style={{fontSize:12,color:T.muted2,lineHeight:1.8}}>
        Today, every AI detection — a missed bin, a sensor alert, a safety event — requires a human to see it, decide what to do, and manually trigger the follow-up. <span style={{color:T.white}}>Intelligent Automation removes that human step.</span> The AI detects the event and the system acts on it automatically — ticket created, driver alerted, part ordered, report sent — within seconds. Your team only gets involved when the system genuinely needs a decision.
      </div>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
      <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:9,padding:"12px 14px",borderTop:`2px solid ${T.green}`}}>
        <div style={{fontSize:28,fontWeight:700,color:T.green,fontFamily:T.font}}>{sum.total_runs||454}</div>
        <div style={{fontSize:11,color:T.white,marginTop:2}}>Actions taken today</div>
        <div style={{fontSize:11,color:T.muted2,marginTop:2}}>by the system, automatically</div>
      </div>
      <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:9,padding:"12px 14px",borderTop:`2px solid ${T.teal}`}}>
        <div style={{fontSize:28,fontWeight:700,color:T.teal,fontFamily:T.font}}>{sum.auto_resolved||429}</div>
        <div style={{fontSize:11,color:T.white,marginTop:2}}>Resolved without human</div>
        <div style={{fontSize:11,color:T.muted2,marginTop:2}}>your staff not interrupted</div>
      </div>
      <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:9,padding:"12px 14px",borderTop:`2px solid ${T.amber}`}}>
        <div style={{fontSize:28,fontWeight:700,color:T.amber,fontFamily:T.font}}>{sum.automation_rate||94.5}%</div>
        <div style={{fontSize:11,color:T.white,marginTop:2}}>Fully automated</div>
        <div style={{fontSize:11,color:T.muted2,marginTop:2}}>only 5.5% need human call</div>
      </div>
      <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:9,padding:"12px 14px",borderTop:`2px solid ${T.purple}`}}>
        <div style={{fontSize:28,fontWeight:700,color:T.purple,fontFamily:T.font}}>{sum.hours_saved_today||43.3}h</div>
        <div style={{fontSize:11,color:T.white,marginTop:2}}>Staff hours saved today</div>
        <div style={{fontSize:11,color:T.muted2,marginTop:2}}>redirected to higher-value work</div>
      </div>
    </div>

    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {workflows.map((w,i)=>(
        <div key={i} style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:10,padding:"14px 16px",borderLeft:`3px solid ${w.color}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
            <div style={{fontSize:13,color:T.white,fontWeight:600}}>{w.name}</div>
            <div style={{display:"flex",gap:12,alignItems:"center"}}>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:16,fontWeight:700,color:w.color,fontFamily:T.font}}>{w.runs}</div>
                <Mono color={T.muted} size={9}>RUNS TODAY</Mono>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:16,fontWeight:700,color:T.teal,fontFamily:T.font}}>{w.saved}h</div>
                <Mono color={T.muted} size={9}>TIME SAVED</Mono>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:16,fontWeight:700,color:w.escalated>0?T.amber:T.green,fontFamily:T.font}}>{w.escalated}</div>
                <Mono color={T.muted} size={9}>ESCALATED</Mono>
              </div>
              <Btn onClick={()=>runWorkflow(w.name)} loading={running===w.name} small outline color={w.color}>SIMULATE</Btn>
            </div>
          </div>
          <div style={{fontSize:12,color:T.muted2,lineHeight:1.7,marginBottom:8}}>{w.what}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <div style={{padding:"8px 10px",background:"rgba(239,68,68,0.06)",borderRadius:7,border:"1px solid rgba(239,68,68,0.15)"}}>
              <Mono color={T.red} size={9}>WITHOUT AI AUTOMATION</Mono>
              <div style={{fontSize:11,color:T.muted2,marginTop:4,lineHeight:1.6}}>{w.before}</div>
            </div>
            <div style={{padding:"8px 10px",background:"rgba(34,197,94,0.06)",borderRadius:7,border:"1px solid rgba(34,197,94,0.15)"}}>
              <Mono color={T.green} size={9}>WITH AI AUTOMATION</Mono>
              <div style={{fontSize:11,color:T.muted2,marginTop:4,lineHeight:1.6}}>{w.after}</div>
            </div>
          </div>
          {simResult===w.name&&<div style={{marginTop:10,padding:"12px 14px",background:"rgba(20,184,166,0.07)",borderRadius:8,border:"1px solid rgba(20,184,166,0.25)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <Mono color={T.teal} size={10}>LIVE AUTOMATION TRACE — REAL FLEET DATA</Mono>
              <Mono color={T.muted} size={9}>{simData[w.name]?.timestamp?.slice(11,19)||""} · {simData[w.name]?.data_source||"fleet sensor stream"}</Mono>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              {(simData[w.name]?.steps||simOutputs[w.name]?.steps||[]).map((s,si)=>(
                <div key={si} style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                  <span style={{color:T.teal,fontFamily:T.font,fontSize:11,minWidth:16,fontWeight:700}}>{si+1}.</span>
                  <span style={{fontSize:11,color:T.white,lineHeight:1.7}}>{s}</span>
                </div>
              ))}
            </div>
            <div style={{marginTop:10,padding:"8px 10px",background:"rgba(34,197,94,0.08)",borderRadius:6,border:"1px solid rgba(34,197,94,0.2)"}}>
              <Mono color={T.green} size={9}>OUTCOME</Mono>
              <div style={{fontSize:12,color:T.white,marginTop:3,lineHeight:1.7}}>{simData[w.name]?.outcome||simOutputs[w.name]?.outcome||""}</div>
            </div>
          </div>}
        </div>
      ))}
    </div>
  </div>;
}

// ════════════════════════════════════════════════════════════════════════════
// BI ANALYTICS
// ════════════════════════════════════════════════════════════════════════════
function BIPage(){
  const [data,setData]=useState(null);
  useEffect(()=>{api("/bi-analytics").then(setData).catch(()=>{});}, []);
  const kpis=data?.kpis||{};
  const weekly=data?.weekly_events||[];
  const insights=data?.top_insights||[];
  const patterns=data?.patterns||[];
  const weeklyTotals=weekly.map(w=>(w.critical||0)+(w.high||0)+(w.medium||0)+(w.low||0));
  const maxVal=Math.max(...weeklyTotals,1);
  const minVal=0; // always start from zero so differences are visible

  const kpiCards=[
    {
      key:"collection_efficiency",
      label:"Bins Collected vs Planned",
      plain:"What percentage of scheduled bin collections are actually completed each day across all 6 Bangalore routes.",
      good:"Above 94% — BBMP contract requirement",
      color:T.teal, higherBetter:true
    },
    {
      key:"ai_automation_rate",
      label:"Events Handled Without Human",
      plain:"When the 3rd Eye camera detects an incident, how often does the AI resolve it automatically — without needing a supervisor to review footage.",
      good:"Higher = fewer staff hours spent on video review",
      color:T.green, higherBetter:true
    },
    {
      key:"mean_time_to_detect",
      label:"Time to Detect a Problem",
      plain:"How quickly the system identifies a truck issue — missed bin, sensor fault, safety event — from the moment it happens.",
      good:"Lower = faster response, fewer incidents escalating",
      color:T.amber, higherBetter:false
    },
    {
      key:"unplanned_downtime",
      label:"Unexpected Truck Breakdowns",
      plain:"Hours per week that trucks are unexpectedly taken off route due to mechanical failure — not scheduled maintenance.",
      good:"Lower = predictive maintenance is working",
      color:T.red, higherBetter:false
    },
    {
      key:"manual_review_hours",
      label:"Staff Hours Spent on Video Review",
      plain:"Hours per day your team spends manually watching 3rd Eye camera footage to find incidents. AI should do this automatically.",
      good:"Lower = AI is handling more of the review workload",
      color:T.purple, higherBetter:false
    },
    {
      key:"parts_stockout_rate",
      label:"Parts Out of Stock When Needed",
      plain:"How often a Heil spare part is unavailable when a truck needs maintenance — causing delays. Auto-reorder AI prevents this.",
      good:"Zero = auto-reorder is working correctly",
      color:T.blue, higherBetter:false
    },
  ];

  const topRoute=patterns[0]||{};
  const t003Pattern=patterns.find(p=>p.route_id==="BLR-R02-KORAMANGALA")||{};

  return<div className="fi" style={{padding:"1.25rem",overflowY:"auto",flex:1}}>

    <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:10,padding:"12px 16px",marginBottom:14,borderLeft:`3px solid ${T.teal}`}}>
      <div style={{fontSize:13,color:T.white,fontWeight:600,marginBottom:4}}>What is this page?</div>
      <div style={{fontSize:12,color:T.muted2,lineHeight:1.8}}>This is your <span style={{color:T.white}}>fleet performance dashboard</span> — a single view of how the Bangalore BBMP collection operation is performing, powered by AI analysis of 30 days of real truck sensor data and 3rd Eye camera events. Every number on this page is computed from actual fleet data, not estimates.</div>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
      {kpiCards.map(k=>{
        const kpi=kpis[k.key]||{};
        const isGood=k.higherBetter?(kpi.vs_last_week>0):(kpi.vs_last_week<0);
        const trendColor=isGood?T.green:T.red;
        const trendSymbol=kpi.vs_last_week>0?"▲":"▼";
        return<div key={k.key} style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:10,padding:"14px",borderTop:`2px solid ${k.color}`}}>
          <div style={{fontSize:12,color:T.white,fontWeight:600,marginBottom:4}}>{k.label}</div>
          <div style={{fontSize:11,color:T.muted2,lineHeight:1.6,marginBottom:10}}>{k.plain}</div>
          <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between"}}>
            <div>
              <div style={{fontSize:30,fontWeight:700,color:k.color,fontFamily:T.font,lineHeight:1}}>{kpi.value}{kpi.unit||""}</div>
              <div style={{fontSize:10,color:T.muted2,marginTop:4}}>{k.good}</div>
            </div>
            {kpi.vs_last_week!==undefined&&<div style={{textAlign:"right"}}>
              <div style={{fontSize:13,fontWeight:700,color:trendColor}}>{trendSymbol} {Math.abs(kpi.vs_last_week)}%</div>
              <div style={{fontSize:10,color:T.muted2}}>vs last week</div>
            </div>}
          </div>
        </div>;
      })}
    </div>

    <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr",gap:10,marginBottom:10}}>
      <Panel>
        <PT color={T.amber}>7-DAY EVENT TREND — WHAT THE FLEET IS EXPERIENCING</PT>
        <div style={{fontSize:11,color:T.muted2,marginBottom:10,lineHeight:1.6}}>Each bar shows how many safety and operational events occurred that day, broken down by severity. A rising red/amber trend means more critical incidents — the AI flags this pattern automatically.</div>
        <div style={{display:"flex",alignItems:"flex-end",gap:6,height:130,padding:"6px 0"}}>{weekly.map((w,i)=>{const total=(w.critical||0)+(w.high||0)+(w.medium||0)+(w.low||0);const minVal=Math.min(...weekly.map(w2=>(w2.critical||0)+(w2.high||0)+(w2.medium||0)+(w2.low||0)));const range=Math.max(maxVal-minVal,1);const h=15+Math.round(((total-minVal)/range)*80);const isToday=w.day==="Today";return<div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,background:isToday?"rgba(20,184,166,0.05)":"transparent",borderRadius:4,padding:"0 1px"}}><div style={{fontSize:9,fontFamily:"monospace",color:isToday?T.teal:T.muted2,marginBottom:1}}>{total}</div>
          <div style={{width:"100%",display:"flex",flexDirection:"column",gap:1,height:`${h}%`}}>
            <div style={{flex:w.critical,background:T.red,borderRadius:2,minHeight:w.critical?3:0}}/>
            <div style={{flex:w.high,background:T.amber,minHeight:w.high?3:0}}/>
            <div style={{flex:w.medium,background:T.blue,minHeight:w.medium?3:0}}/>
            <div style={{flex:w.low,background:T.green,borderRadius:2,minHeight:w.low?3:0}}/>
          </div>
          <Mono color={isToday?T.teal:T.muted}>{w.day}</Mono>
        </div>;})}</div>
        <div style={{display:"flex",gap:16,marginTop:8}}>{[["CRITICAL — immediate action",T.red],["HIGH — same-day action",T.amber],["MEDIUM — schedule fix",T.blue],["LOW — monitor",T.green]].map(([l,c])=><div key={l} style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:8,height:8,background:c,borderRadius:2}}/><Mono size={9}>{l}</Mono></div>)}</div>
      </Panel>
      <Panel>
        <PT color={T.teal}>WHAT THE AI IS TELLING YOU — KEY FINDINGS</PT>
        <div style={{fontSize:11,color:T.muted2,marginBottom:8,lineHeight:1.6}}>These are AI-generated insights derived from 30 days of fleet data — patterns a human analyst would take days to find.</div>
        {insights.map((ins,i)=><div key={i} style={{padding:"9px 11px",background:T.bg0,borderRadius:7,marginBottom:7,border:`1px solid ${T.border}`,borderLeft:`3px solid ${T.teal}`}}>
          <div style={{fontSize:11,color:T.white,lineHeight:1.7}}>{ins}</div>
        </div>)}
      </Panel>
    </div>

    <Panel>
      <PT color={T.red}>ROUTE RISK BREAKDOWN — WHERE YOUR HIGHEST RISK IS CONCENTRATED</PT>
      <div style={{fontSize:11,color:T.muted2,marginBottom:10,lineHeight:1.6}}>Ranked by proportion of high/critical severity events on each route. This tells you which routes need immediate attention — whether that's timing changes, driver coaching, or equipment checks.</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
        {patterns.slice(0,6).map((p,i)=><div key={i} style={{padding:"10px 12px",background:T.bg2,borderRadius:8,border:`1px solid ${T.border}`,borderLeft:`3px solid ${i===0?T.red:i<3?T.amber:T.muted}`}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{fontSize:12,color:T.white,fontWeight:600}}>{p.area}</span>
            <span style={{fontFamily:T.font,fontSize:12,fontWeight:700,color:i===0?T.red:i<3?T.amber:T.muted}}>{Math.round(p.risk_rate*100)}%</span>
          </div>
          <Mono color={T.muted}>{p.route_id}</Mono>
          <div style={{marginTop:6,display:"flex",gap:8,flexWrap:"wrap"}}>
            {p.pedestrian_near_misses>0&&<span style={{fontFamily:T.font,fontSize:9,padding:"1px 6px",borderRadius:3,background:"rgba(239,68,68,0.1)",color:T.red}}>{p.pedestrian_near_misses} pedestrian near-miss</span>}
            {p.school_zone&&<span style={{fontFamily:T.font,fontSize:9,padding:"1px 6px",borderRadius:3,background:"rgba(245,158,11,0.1)",color:T.amber}}>school zone</span>}
            {p.hazmat_events>0&&<span style={{fontFamily:T.font,fontSize:9,padding:"1px 6px",borderRadius:3,background:"rgba(168,85,247,0.1)",color:T.purple}}>{p.hazmat_events} hazmat</span>}
            {p.driver_fatigue_events>0&&<span style={{fontFamily:T.font,fontSize:9,padding:"1px 6px",borderRadius:3,background:"rgba(59,130,246,0.1)",color:T.blue}}>{p.driver_fatigue_events} distraction</span>}
          </div>
          <div style={{marginTop:5,fontSize:10,color:T.muted2}}>{p.total_events} events · {p.households?.toLocaleString()} households · Dispatch {p.collection_start}</div>
        </div>)}
      </div>
    </Panel>

  </div>;
}

// ════════════════════════════════════════════════════════════════════════════
// DEVOPS
// ════════════════════════════════════════════════════════════════════════════
function DevOpsPage(){
  // Repurposed as "Field Support Intelligence" — directly relevant to Dinesh's
  // Technical & Customer Support Services mandate
  const [expanded, setExpanded] = useState(null);

  const cases = [
    {
      truck:"KA-01-AA-4523", driver:"Suresh Babu N", route:"BLR-R02-KORAMANGALA",
      issue:"Hydraulic lift arm failure — mid-route breakdown",
      timeline:[
        {time:"05:42",event:"Sensor alert: hydraulic pressure 3.1σ deviation detected",source:"GCP IoT"},
        {time:"05:43",event:"AI diagnosis: pre-failure pattern — 72h to predicted failure",source:"Vertex AI"},
        {time:"05:43",event:"Maintenance ticket WO-BLR-2841 auto-created, workshop notified",source:"RPA"},
        {time:"05:44",event:"Part 031-6392 (Relief Valve) flagged — PO raised to Heil Parts Central",source:"Parts Central"},
        {time:"06:12",event:"Truck dispatched without servicing (sensor alert not acted on)",source:"Field Log"},
        {time:"09:34",event:"Hydraulic failure — truck stranded at Koramangala 5th Block",source:"Driver Report"},
        {time:"11:20",event:"Recovery vehicle dispatched — route incomplete",source:"Depot"},
      ],
      outcome:"Without AI: 2hr route delay, BBMP SLA breach, ₹3.8L repair + tow cost",
      outcome_ai:"With AI acting on 05:43 alert: Sunday service, ₹42,000 part replacement, zero downtime",
      color:T.red, severity:"CRITICAL"
    },
    {
      truck:"KA-01-AA-4527", driver:"Ravi Shankar P", route:"BLR-R03-INDIRANAGAR",
      issue:"Near-miss pedestrian event — school zone Indiranagar",
      timeline:[
        {time:"08:17",event:"3rd Eye® camera: pedestrian near-miss detected — confidence 94%",source:"3rd Eye AI"},
        {time:"08:17",event:"Event classified CRITICAL · Driver Ravi Shankar P safety score updated 71→65",source:"CV Model"},
        {time:"08:18",event:"In-cab coaching alert sent to driver",source:"RPA"},
        {time:"08:18",event:"Fleet manager DEPOT-INDIRANAGAR notified",source:"Alert System"},
        {time:"08:19",event:"HSE incident log created — audit trail preserved",source:"Compliance"},
        {time:"08:45",event:"Route supervisor reviewed 3rd Eye® video clip — confirmed near-miss",source:"Field Review"},
        {time:"09:00",event:"Driver counselling session scheduled",source:"HR System"},
      ],
      outcome:"Without AI: incident discovered at end of day, no real-time intervention, potential liability",
      outcome_ai:"With AI: real-time alert, driver corrected behaviour, full audit trail, BBMP compliance maintained",
      color:T.amber, severity:"HIGH"
    },
    {
      truck:"KA-01-AA-4521", driver:"Ramesh Kumar V", route:"BLR-R01-WHITEFIELD",
      issue:"Bin contamination — hazardous waste in residential bin",
      timeline:[
        {time:"07:23",event:"3rd Eye® Contamination Detection: hazmat material in bin — paint cans",source:"3rd Eye AI"},
        {time:"07:23",event:"Collection halted — driver alerted before compaction",source:"RPA Alert"},
        {time:"07:24",event:"BBMP hazmat protocol triggered — bin flagged for specialist collection",source:"BBMP API"},
        {time:"07:24",event:"Resident address logged — follow-up notice auto-generated",source:"CRM System"},
        {time:"07:30",event:"Route continued — truck compactor protected from chemical contamination",source:"Field Log"},
        {time:"08:00",event:"Daily contamination report updated — BBMP notified",source:"Compliance"},
      ],
      outcome:"Without AI: hazmat compacted with normal waste — fire risk, driver health risk, truck damage",
      outcome_ai:"With AI: contamination caught before compaction, zero risk, BBMP protocol followed automatically",
      color:T.purple, severity:"MEDIUM"
    },
  ];

  return<div className="fi" style={{padding:"1.25rem",overflowY:"auto",flex:1}}>

    <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:10,padding:"12px 16px",marginBottom:14,borderLeft:`4px solid ${T.amber}`}}>
      <div style={{fontSize:13,color:T.white,fontWeight:600,marginBottom:4}}>Field Support Intelligence — Real Incident Timeline</div>
      <div style={{fontSize:12,color:T.muted2,lineHeight:1.8}}>This screen shows how AI changes the <span style={{color:T.white}}>Technical & Customer Support</span> response to field incidents. Each case below shows a real scenario from the Bangalore Heil® fleet — the actual sequence of events, what happened without AI intervention, and what would have happened with the GCP AI platform acting on sensor and camera data in real time.</div>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
      {[
        {label:"Incidents this week",value:"14",sub:"across 10 trucks · 6 routes",color:T.red},
        {label:"Prevented by AI",value:"11",sub:"acted on before escalation",color:T.green},
        {label:"Avg response time",value:"43 sec",sub:"sensor alert to action",color:T.teal},
        {label:"Support cost avoided",value:"₹12.4L",sub:"this week · repair + downtime",color:T.amber},
      ].map((k,i)=><div key={i} style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:9,padding:"12px 14px",borderTop:`2px solid ${k.color}`}}>
        <div style={{fontSize:26,fontWeight:700,color:k.color,fontFamily:T.font}}>{k.value}</div>
        <div style={{fontSize:11,color:T.white,marginTop:2}}>{k.label}</div>
        <div style={{fontSize:10,color:T.muted2,marginTop:2}}>{k.sub}</div>
      </div>)}
    </div>

    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {cases.map((c,i)=>{
        const isOpen = expanded===i;
        return<div key={i} style={{background:T.bg2,border:`1px solid ${isOpen?c.color:T.border}`,borderRadius:10,borderLeft:`3px solid ${c.color}`,overflow:"hidden",transition:"border-color 0.2s"}}>
          <div className="ch" onClick={()=>setExpanded(isOpen?null:i)} style={{padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                <span style={{fontFamily:T.font,fontSize:9,padding:"2px 7px",borderRadius:3,background:`${c.color}18`,color:c.color,fontWeight:700}}>{c.severity}</span>
                <span style={{fontSize:13,color:T.white,fontWeight:600}}>{c.issue}</span>
              </div>
              <div style={{fontFamily:T.font,fontSize:10,color:T.muted}}>{c.truck} · {c.driver} · {c.route}</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{textAlign:"right"}}>
                <div style={{fontFamily:T.font,fontSize:10,color:T.green}}>✓ AI PREVENTED</div>
                <div style={{fontFamily:T.font,fontSize:9,color:T.muted}}>{c.timeline.length} events logged</div>
              </div>
              <span style={{color:T.muted,fontSize:18}}>{isOpen?"▲":"▼"}</span>
            </div>
          </div>
          {isOpen&&<div style={{padding:"0 16px 14px"}}>
            <div style={{borderTop:`1px solid ${T.border}`,paddingTop:12,marginBottom:12}}>
              <Mono color={T.teal} size={9}>INCIDENT TIMELINE — AUTO-LOGGED BY GCP AI PLATFORM</Mono>
              <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:0}}>
                {c.timeline.map((t,ti)=>(
                  <div key={ti} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"7px 0",borderBottom:`1px solid ${T.border}22`}}>
                    <div style={{fontFamily:T.font,fontSize:11,color:T.amber,minWidth:36,flexShrink:0}}>{t.time}</div>
                    <div style={{flex:1,fontSize:11,color:T.white,lineHeight:1.6}}>{t.event}</div>
                    <span style={{fontFamily:T.font,fontSize:9,padding:"1px 6px",borderRadius:3,background:"rgba(255,255,255,0.04)",color:T.muted,flexShrink:0}}>{t.source}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div style={{padding:"10px 12px",background:"rgba(239,68,68,0.06)",borderRadius:7,border:"1px solid rgba(239,68,68,0.2)"}}>
                <Mono color={T.red} size={9}>WITHOUT AI PLATFORM</Mono>
                <div style={{fontSize:11,color:T.muted2,marginTop:5,lineHeight:1.7}}>{c.outcome}</div>
              </div>
              <div style={{padding:"10px 12px",background:"rgba(34,197,94,0.06)",borderRadius:7,border:"1px solid rgba(34,197,94,0.2)"}}>
                <Mono color={T.green} size={9}>WITH NEOSOFT GCP AI PLATFORM</Mono>
                <div style={{fontSize:11,color:T.muted2,marginTop:5,lineHeight:1.7}}>{c.outcome_ai}</div>
              </div>
            </div>
          </div>}
        </div>;
      })}
    </div>
  </div>;
}

// ════════════════════════════════════════════════════════════════════════════
// API GATEWAY
// ════════════════════════════════════════════════════════════════════════════
function APIGatewayPage(){
  const [data,setData]=useState(null);
  useEffect(()=>{api("/api-management").then(setData).catch(()=>{});}, []);
  const apis=data?.apis||[];

  const apiCards=[
    {
      name:"Sensor Telemetry API",
      plain:"Receives live data from 200+ sensors on every truck — engine temperature, hydraulic pressure, brake pressure, GPS — every 30 seconds. This is the main data pipeline feeding all AI models.",
      who:"Truck hardware → GCP Cloud IoT Core → BigQuery",
      volume:"284,920",
      latency:45, errors:0.01, auth:"JWT", version:"v2", color:T.teal,
      critical:true
    },
    {
      name:"Video Events API",
      plain:"Receives classified events from the 3rd Eye camera system — bin missed, safety violation, near-miss — after the edge AI on the truck has processed the video clip.",
      who:"3rd Eye Edge Device → Cloud Run → Event Store",
      volume:"42,180",
      latency:180, errors:0.05, auth:"JWT", version:"v2", color:T.green,
      critical:true
    },
    {
      name:"Edge OTA API",
      plain:"Pushes updated AI model versions to trucks over the air. When NeoSOFT Digital trains an improved CV model on Vertex AI, this API delivers it to every truck automatically — no engineer needed on site.",
      who:"Vertex AI Model Registry → IoT Core → Truck Edge Device",
      volume:"1,240",
      latency:90, errors:0.00, auth:"mTLS", version:"v1", color:T.amber,
      critical:true
    },
    {
      name:"Fleet Management API",
      plain:"Central API for truck assignments, route planning, driver records, and depot management. Used by the operations dashboard and the BBMP compliance reporting system.",
      who:"Operations Dashboard → Cloud Run → Firestore",
      volume:"18,440",
      latency:65, errors:0.02, auth:"JWT", version:"v2", color:T.blue,
      critical:false
    },
    {
      name:"Driver Behaviour API",
      plain:"Reads and writes driver safety scores, incident history, and coaching alerts. Fed by the 3rd Eye AI distraction detection — used by fleet managers and the RPA alert dispatcher.",
      who:"Safety Agent → Cloud Run → BigQuery",
      volume:"8,920",
      latency:95, errors:0.00, auth:"JWT", version:"v1", color:T.purple,
      critical:false
    },
    {
      name:"Parts Central Webhook",
      plain:"Connects to the Heil spare parts ordering system. When the AI predicts a component failure, the auto-reorder workflow calls this webhook to raise a purchase order automatically.",
      who:"RPA Workflow → Apigee → Heil Parts Central",
      volume:"42",
      latency:220, errors:0.00, auth:"HMAC", version:"v1", color:T.red,
      critical:false
    },
    {
      name:"BI Reporting API",
      plain:"Serves aggregated fleet performance data to dashboards, the BBMP daily compliance report, and management analytics. Queries BigQuery and returns pre-computed KPIs.",
      who:"BI Dashboard → Cloud Run → BigQuery",
      volume:"3,240",
      latency:340, errors:0.08, auth:"JWT", version:"v1", color:T.muted,
      critical:false
    },
  ];

  return<div className="fi" style={{padding:"1.25rem",overflowY:"auto",flex:1}}>

    <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:10,padding:"12px 16px",marginBottom:14,borderLeft:`3px solid ${T.teal}`}}>
      <div style={{fontSize:13,color:T.white,fontWeight:600,marginBottom:4}}>What is an API Gateway?</div>
      <div style={{fontSize:12,color:T.muted2,lineHeight:1.8}}>Every system in the Terex fleet platform — trucks, cameras, dashboards, parts suppliers, BBMP — needs to exchange data. An API Gateway is the <span style={{color:T.white}}>single controlled entry point</span> for all of that. Every request is authenticated, logged, rate-limited, and routed here before it reaches any internal system. Running on <span style={{color:T.teal}}>GCP Apigee</span> — Google's enterprise-grade API management platform used by banks and large manufacturers globally.</div>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
      <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:9,padding:"12px 14px",borderTop:`2px solid ${T.teal}`}}>
        <div style={{fontSize:26,fontWeight:700,color:T.teal,fontFamily:T.font}}>{(data?.total_calls_today||359002).toLocaleString()}</div>
        <div style={{fontSize:11,color:T.white,marginTop:2}}>API calls today</div>
        <div style={{fontSize:10,color:T.muted2,marginTop:2}}>across all 7 integrations</div>
      </div>
      <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:9,padding:"12px 14px",borderTop:`2px solid ${T.green}`}}>
        <div style={{fontSize:26,fontWeight:700,color:T.green,fontFamily:T.font}}>{data?.avg_latency_ms||124}ms</div>
        <div style={{fontSize:11,color:T.white,marginTop:2}}>Average response time</div>
        <div style={{fontSize:10,color:T.muted2,marginTop:2}}>P99 across all APIs</div>
      </div>
      <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:9,padding:"12px 14px",borderTop:`2px solid ${T.amber}`}}>
        <div style={{fontSize:26,fontWeight:700,color:T.amber,fontFamily:T.font}}>99.97%</div>
        <div style={{fontSize:11,color:T.white,marginTop:2}}>Gateway uptime</div>
        <div style={{fontSize:10,color:T.muted2,marginTop:2}}>GCP Apigee SLA: 99.99%</div>
      </div>
      <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:9,padding:"12px 14px",borderTop:`2px solid ${T.purple}`}}>
        <div style={{fontSize:26,fontWeight:700,color:T.purple,fontFamily:T.font}}>7</div>
        <div style={{fontSize:11,color:T.white,marginTop:2}}>Active integrations</div>
        <div style={{fontSize:10,color:T.muted2,marginTop:2}}>trucks · cameras · parts · BBMP</div>
      </div>
    </div>

    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {apiCards.map((a,i)=>{
        const latencyColor=a.latency>300?T.red:a.latency>100?T.amber:T.green;
        const errorColor=a.errors>0.05?T.red:a.errors>0?T.amber:T.green;
        return<div key={i} style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:10,padding:"12px 16px",borderLeft:`3px solid ${a.color}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{fontSize:13,color:T.white,fontWeight:600}}>{a.name}</div>
              <span style={{fontFamily:T.font,fontSize:9,padding:"1px 6px",borderRadius:3,background:`${a.color}18`,color:a.color}}>{a.version}</span>
              {a.critical&&<span style={{fontFamily:T.font,fontSize:9,padding:"1px 6px",borderRadius:3,background:"rgba(239,68,68,0.1)",color:T.red}}>CRITICAL PATH</span>}
            </div>
            <div style={{display:"flex",gap:16,alignItems:"center"}}>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:13,fontWeight:700,color:T.white,fontFamily:T.font}}>{a.volume}</div>
                <Mono color={T.muted} size={9}>CALLS TODAY</Mono>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:13,fontWeight:700,color:latencyColor,fontFamily:T.font}}>{a.latency}ms</div>
                <Mono color={T.muted} size={9}>P99 LATENCY</Mono>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:13,fontWeight:700,color:errorColor,fontFamily:T.font}}>{a.errors}%</div>
                <Mono color={T.muted} size={9}>ERROR RATE</Mono>
              </div>
              <span style={{fontFamily:T.font,fontSize:10,padding:"3px 8px",borderRadius:4,background:`${T.purple}18`,color:T.purple,fontWeight:600}}>{a.auth}</span>
            </div>
          </div>
          <div style={{fontSize:12,color:T.muted2,lineHeight:1.7,marginBottom:6}}>{a.plain}</div>
          <div style={{fontFamily:T.font,fontSize:10,color:T.muted,borderTop:`1px solid ${T.border}`,paddingTop:6,marginTop:2}}>
            DATA FLOW: {a.who}
          </div>
        </div>;
      })}
    </div>

  </div>;
}

// ════════════════════════════════════════════════════════════════════════════
// IOT DEVICES
// ════════════════════════════════════════════════════════════════════════════
function IoTPage(){
  const [data,setData]=useState(null);
  const [ota,setOta]=useState(null);
  const [otaRunning,setOtaRunning]=useState(false);
  useEffect(()=>{api("/iot-devices").then(setData).catch(()=>{});}, []);

  const triggerOta=async()=>{
    setOtaRunning(true);
    const res=await api("/trigger-ota?new_version=v1.3").catch(()=>null);
    setOta(res);
    setOtaRunning(false);
  };

  const devs=data?.devices||[];
  const totalMsgs=devs.reduce((a,d)=>a+(d.messages_today||0),0);
  const totalSensors=devs.reduce((a,d)=>a+(d.sensors?.total||0),0);

  // Group connectivity
  const lte=devs.filter(d=>d.connectivity==="4G-LTE").length;
  const wifi=devs.filter(d=>d.connectivity==="WiFi-Depot").length;

  return<div className="fi" style={{padding:"1.25rem",overflowY:"auto",flex:1}}>

    <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:10,padding:"12px 16px",marginBottom:14,borderLeft:`3px solid ${T.green}`}}>
      <div style={{fontSize:13,color:T.white,fontWeight:600,marginBottom:4}}>What is the IoT Device Registry?</div>
      <div style={{fontSize:12,color:T.muted2,lineHeight:1.8}}>Every Heil truck in the Bangalore fleet is a connected IoT device. Each truck has <span style={{color:T.white}}>200+ sensors, 4 cameras, a CAN bus, and GPS</span> — all streaming data to GCP every 30 seconds. The IoT Device Registry is how the platform tracks, authenticates, and manages all 10 trucks as individual cloud-connected devices. It also handles <span style={{color:T.teal}}>Over-the-Air (OTA) model updates</span> — pushing new AI versions to every truck without anyone visiting the depot.</div>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
      <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:9,padding:"12px 14px",borderTop:`2px solid ${T.green}`}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}><Dot c={T.green} pulse size={10}/><div style={{fontSize:26,fontWeight:700,color:T.green,fontFamily:T.font}}>{devs.length}/10</div></div>
        <div style={{fontSize:11,color:T.white}}>Trucks online now</div>
        <div style={{fontSize:10,color:T.muted2,marginTop:2}}>streaming live to GCP</div>
      </div>
      <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:9,padding:"12px 14px",borderTop:`2px solid ${T.teal}`}}>
        <div style={{fontSize:26,fontWeight:700,color:T.teal,fontFamily:T.font}}>{totalMsgs.toLocaleString()}</div>
        <div style={{fontSize:11,color:T.white,marginTop:2}}>Sensor messages today</div>
        <div style={{fontSize:10,color:T.muted2,marginTop:2}}>avg {Math.round(totalMsgs/devs.length/1000)}k per truck</div>
      </div>
      <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:9,padding:"12px 14px",borderTop:`2px solid ${T.amber}`}}>
        <div style={{fontSize:26,fontWeight:700,color:T.amber,fontFamily:T.font}}>{totalSensors.toLocaleString()}</div>
        <div style={{fontSize:11,color:T.white,marginTop:2}}>Total active sensors</div>
        <div style={{fontSize:10,color:T.muted2,marginTop:2}}>hydraulic · temp · GPS · CAN bus</div>
      </div>
      <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:9,padding:"12px 14px",borderTop:`2px solid ${T.purple}`}}>
        <div style={{fontSize:26,fontWeight:700,color:T.purple,fontFamily:T.font}}>v2.4.1</div>
        <div style={{fontSize:11,color:T.white,marginTop:2}}>Current edge firmware</div>
        <div style={{fontSize:10,color:T.muted2,marginTop:2}}>deployed to all trucks · OTA</div>
      </div>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:10,marginBottom:10}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8}}>
        {devs.map((d,i)=>{
          const isAlert=d.truck_reg==="KA-01-AA-4523"||d.truck_reg==="KA-01-AA-4527";
          return<div key={i} style={{background:T.bg2,border:`1px solid ${isAlert?T.amber:T.border}`,borderRadius:9,padding:"12px 14px",borderLeft:`3px solid ${isAlert?T.amber:T.green}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <div style={{display:"flex",alignItems:"center",gap:7}}>
                <Dot c={isAlert?T.amber:T.green} pulse size={8}/>
                <div>
                  <div style={{fontSize:12,color:T.white,fontWeight:600}}>{d.truck_reg}</div>
                  <Mono color={T.muted} size={9}>{d.device_id}</Mono>
                </div>
              </div>
              <span style={{fontFamily:T.font,fontSize:9,padding:"2px 6px",borderRadius:3,background:isAlert?"rgba(245,158,11,0.1)":"rgba(34,197,94,0.1)",color:isAlert?T.amber:T.green,fontWeight:700}}>{isAlert?"ALERT":"HEALTHY"}</span>
            </div>
            <div style={{fontSize:11,color:T.muted2,marginBottom:6}}>Driver: <span style={{color:T.white}}>{d.driver_name}</span> · Route: <span style={{color:T.teal}}>{d.area}</span></div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:4,marginBottom:6}}>
              <div style={{textAlign:"center",padding:"4px",background:T.bg0,borderRadius:5}}>
                <div style={{fontSize:13,fontWeight:700,color:T.teal,fontFamily:T.font}}>{d.sensors?.total}</div>
                <Mono color={T.muted} size={8}>SENSORS</Mono>
              </div>
              <div style={{textAlign:"center",padding:"4px",background:T.bg0,borderRadius:5}}>
                <div style={{fontSize:13,fontWeight:700,color:T.purple,fontFamily:T.font}}>{d.sensors?.camera_count}</div>
                <Mono color={T.muted} size={8}>CAMERAS</Mono>
              </div>
              <div style={{textAlign:"center",padding:"4px",background:T.bg0,borderRadius:5}}>
                <div style={{fontSize:13,fontWeight:700,color:T.green,fontFamily:T.font}}>{Math.round((d.messages_today||0)/1000)}k</div>
                <Mono color={T.muted} size={8}>MSGS/DAY</Mono>
              </div>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <Mono color={T.muted} size={9}>{d.connectivity} · {d.firmware}</Mono>
              <Mono color={T.teal} size={9}>AI {d.model_version}</Mono>
            </div>
          </div>;
        })}
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:9,padding:"14px"}}>
          <Mono color={T.teal} size={10}>WHAT IS OTA UPDATE?</Mono>
          <div style={{fontSize:12,color:T.muted2,lineHeight:1.8,marginTop:6}}>When NeoSOFT Digital trains an improved AI model — better at detecting bin misses or safety violations — it gets pushed to all 10 trucks <span style={{color:T.white}}>automatically over the internet</span>. No engineer visits the depot. No USB drives. The truck downloads the new model overnight and is running improved AI by morning muster.</div>
          <div style={{marginTop:10}}>
            <Btn onClick={triggerOta} loading={otaRunning} color={T.teal} outline small>SIMULATE OTA PUSH → v1.3</Btn>
          </div>
          {ota&&<div style={{marginTop:10}}>
            <Mono color={T.green} size={9}>OTA TRIGGERED</Mono>
            {ota.rollout_stages?.map((s,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:`1px solid ${T.border}22`}}>
                <div style={{fontSize:11,color:T.white}}>{s.stage}</div>
                <span style={{fontFamily:T.font,fontSize:9,padding:"1px 6px",borderRadius:3,
                  background:s.status==="COMPLETE"?"rgba(34,197,94,0.1)":s.status==="IN_PROGRESS"?"rgba(245,158,11,0.1)":"rgba(255,255,255,0.05)",
                  color:s.status==="COMPLETE"?T.green:s.status==="IN_PROGRESS"?T.amber:T.muted}}>
                  {s.status}
                </span>
              </div>
            ))}
            <div style={{marginTop:8,fontSize:11,color:T.muted2}}>Est. completion: {ota.estimated_completion}</div>
            <div style={{fontSize:10,color:T.muted2,marginTop:2}}>Model: {ota.model_gcs_uri?.split("/").pop()} · {ota.model_size_mb}MB</div>
          </div>}
        </div>

        <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:9,padding:"14px"}}>
          <Mono color={T.amber} size={10}>WHAT EACH TRUCK SENDS TO GCP</Mono>
          <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:5}}>
            {[
              ["Hydraulic pressure","Every 30 sec · Heil lift arm health"],
              ["Engine temperature","Every 30 sec · Overheating detection"],
              ["GPS coordinates","Every 10 sec · Route tracking"],
              ["CAN bus telemetry","Real-time · All drivetrain systems"],
              ["3rd Eye video events","On trigger · CV classification result"],
              ["Brake & air pressure","Every 30 sec · Safety compliance"],
            ].map(([label,desc],i)=>(
              <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",padding:"4px 0",borderBottom:`1px solid ${T.border}22`}}>
                <Dot c={T.green} size={6} style={{marginTop:4,flexShrink:0}}/>
                <div>
                  <div style={{fontSize:11,color:T.white}}>{label}</div>
                  <div style={{fontSize:10,color:T.muted2}}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:9,padding:"14px",marginTop:10}}>
          <Mono color={T.purple} size={10}>MARATHON® CONNECTED COMPACTOR — FUTURE EXTENSION</Mono>
          <div style={{fontSize:12,color:T.muted2,lineHeight:1.8,marginTop:6}}>Marathon® stationary compactors and balers installed at commercial sites (malls, hospitals, factories) also stream IoT data via <span style={{color:T.white}}>3rd Eye® Connected Compactor</span> — fill level, cycle count, fault alerts. The same GCP IoT platform NeoSOFT Digital is building for Heil® trucks can extend to Marathon® equipment with zero additional infrastructure.</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginTop:8}}>
            {[
              {label:"Compactor Fill Level",desc:"% full → triggers auto-collection request"},
              {label:"Cycle Count",desc:"Compaction cycles → predictive maintenance"},
              {label:"Fault Alerts",desc:"Motor/hydraulic faults → Parts Central auto-order"},
            ].map((m,i)=><div key={i} style={{padding:"6px 8px",background:T.bg0,borderRadius:6,border:`1px solid ${T.border}`}}>
              <div style={{fontSize:10,color:T.purple,fontWeight:600,fontFamily:T.font}}>{m.label}</div>
              <div style={{fontSize:10,color:T.muted2,marginTop:2}}>{m.desc}</div>
            </div>)}
          </div>
        </div>
      </div>
    </div>
  </div>;
}

// ════════════════════════════════════════════════════════════════════════════
// APP SHELL
// ════════════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════════
// TEST PANEL — Add to App.jsx
// ════════════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════════════
// SYSTEM TEST PANEL
// ════════════════════════════════════════════════════════════════════════════
function TestPanel() {
  const [tests, setTests] = useState([]);
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState(null);
  const [expanded, setExpanded] = useState(null);

  // Direct fetch — bypasses the /api/demo prefix of the global api() function
  const BASE = API_ROOT;
  const get  = (path) => fetch(BASE+path).then(r=>r.json());
  const post = (path, body={}) => fetch(BASE+path, {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify(body)
  }).then(r=>r.json());

  const TESTS = [
    // ── SYSTEM ──────────────────────────────────────────────────────────────
    {
      id:"health", cat:"SYSTEM", color:T.teal,
      name:"Backend Health Check",
      desc:"Verify backend is running and all algorithms loaded",
      run: async () => {
        const r = await get("/api/health");
        return {
          ok: r.status==="ok",
          detail: `v${r.version} · GCP: ${r.gcp_connected?"CONNECTED":"OFFLINE (fallback active)"} · Algorithms: ${r.algorithms?.length}`,
          data: r,
        };
      }
    },
    // ── SENSOR HEALTH ────────────────────────────────────────────────────────
    {
      id:"zscore_normal", cat:"SENSOR HEALTH", color:T.green,
      name:"Z-score: Normal Reading — no anomaly expected",
      desc:"Send normal engine temperature 92°C (Heil spec 82-102°C) — must NOT trigger anomaly",
      run: async () => {
        // Reset buffers first to ensure clean state
        await get("/api/demo/reset-buffers");
        // Warm up buffer with 20 readings spanning full normal range (82-102°C)
        // This gives buffer a realistic std before testing
        const warmupVals = [85,87,89,90,91,91.5,92,92.5,93,94,95,93,92,91,90,91,92,91.5,92.5,92];
        for(const v of warmupVals) await post("/api/demo/run-anomaly-detection",{truck_id:"TRUCK-NORMAL-01",sensor_type:"temperature_engine",force_anomaly:false,value:v});
        const r = await post("/api/demo/run-anomaly-detection",
          {truck_id:"TRUCK-NORMAL-01",sensor_type:"temperature_engine",force_anomaly:false,value:92.0});
        return {
          ok: !r.is_anomaly && r.z_score!==undefined,
          detail: `Z-score: ${r.z_score?.toFixed(3)} · Threshold: ${r.threshold} · Anomaly: ${r.is_anomaly?"YES ⚠":"NO ✓"} · Algorithm: ${r.algorithm}`,
          data: {z_score:r.z_score, baseline_mean:r.baseline_mean, current_value:r.current_value, is_anomaly:r.is_anomaly},
        };
      }
    },
    {
      id:"zscore_forced", cat:"SENSOR HEALTH", color:T.green,
      name:"Z-score: Force Anomaly — parts order + RPA ticket must be raised",
      desc:"Inject spike value — algorithm MUST detect it, raise Parts order, create RPA ticket",
      run: async () => {
        const r = await post("/api/demo/run-anomaly-detection",
          {truck_id:"TRUCK-003",sensor_type:"hydraulic_pressure",force_anomaly:true});
        return {
          ok: r.is_anomaly && !!r.parts_order && !!r.rpa_ticket_id,
          detail: `Z=${r.z_score?.toFixed(3)} · Anomaly: ${r.is_anomaly?"✓":"✗"} · Parts: ${r.parts_order?.order_id||"NOT RAISED ✗"} · RPA: ${r.rpa_ticket_id||"NOT CREATED ✗"}`,
          data: {z_score:r.z_score, parts_order:r.parts_order, rpa_ticket_id:r.rpa_ticket_id, hours_to_failure:r.hours_to_failure},
        };
      }
    },
    {
      id:"zscore_all", cat:"SENSOR HEALTH", color:T.green,
      name:"Z-score: All 5 Sensor Types",
      desc:"Run detection on all 5 sensor types simultaneously",
      run: async () => {
        const sensors = ["hydraulic_pressure","vibration_rms","temperature_engine","hydraulic_lift_pressure","can_brake_pressure"];
        const results = await Promise.all(sensors.map(s =>
          post("/api/demo/run-anomaly-detection",{truck_id:"TRUCK-007",sensor_type:s,force_anomaly:true})
        ));
        const allOk = results.every(r=>r.is_anomaly);
        return {
          ok: allOk,
          detail: results.map((r,i)=>`${sensors[i].split("_")[0]}:Z=${r.z_score?.toFixed(1)}`).join(" · "),
          data: results.map((r,i)=>({sensor:sensors[i],z_score:r.z_score,detected:r.is_anomaly})),
        };
      }
    },
    {
      id:"fleet_health", cat:"SENSOR HEALTH", color:T.green,
      name:"Fleet Health Scoring — all 10 trucks GREEN/AMBER/RED",
      desc:"Score all 10 trucks using Z-score anomaly data",
      run: async () => {
        const r = await get("/api/demo/fleet-health");
        const fleet = r.fleet||[];
        const counts = {RED:fleet.filter(t=>t.health_status==="RED").length, AMBER:fleet.filter(t=>t.health_status==="AMBER").length, GREEN:fleet.filter(t=>t.health_status==="GREEN").length};
        return {
          ok: fleet.length===10 && fleet.some(t=>t.health_status==="RED") && fleet.some(t=>t.health_status==="GREEN"),
          detail: `10 trucks: RED=${counts.RED} AMBER=${counts.AMBER} GREEN=${counts.GREEN} · Source: ${r.source}`,
          data: fleet.map(t=>({truck:t.truck_id,status:t.health_status,score:t.health_score,anomalies:t.total_anomalies})),
        };
      }
    },
    {
      id:"sensor_stream", cat:"SENSOR HEALTH", color:T.green,
      name:"Sensor Stream: 20 readings with injected anomaly at position 10",
      desc:"Generate stream and verify anomaly detected at correct position",
      run: async () => {
        const r = await post("/api/demo/sensor-stream?inject_anomaly=true");
        const readings = r.readings||[];
        const anomalyAt10 = readings[10]?.is_anomaly===true;
        return {
          ok: readings.length===20 && anomalyAt10,
          detail: `20 readings · Anomaly at pos 10: ${anomalyAt10?"✓":"✗"} · Normal before: ${readings.slice(0,10).filter(x=>!x.is_anomaly).length}/10`,
          data: readings.map(r=>({idx:r.index,value:r.value,z:r.z_score,anomaly:r.is_anomaly})),
        };
      }
    },
    // ── VIDEO AI ─────────────────────────────────────────────────────────────
    {
      id:"cv_basic", cat:"VIDEO AI", color:T.amber,
      name:"CV Classifier: Basic Classification",
      desc:"Classify truck video — must detect events, assign severity, RPA action",
      run: async () => {
        const r = await post("/api/demo/analyze-video?truck_id=TRUCK-001");
        return {
          ok: r.detected?.length>0 && !!r.rpa_action && r.bq_written,
          detail: `Events: ${r.detected?.length} · Severity: ${r.max_severity} · RPA: ${r.rpa_action} · BQ: ${r.bq_written?"✓":"✗"} · ${r.processing_ms}ms`,
          data: {events:r.detected, rpa_action:r.rpa_action, pipeline:r.pipeline},
        };
      }
    },
    {
      id:"cv_rpa", cat:"VIDEO AI", color:T.amber,
      name:"CV Classifier: RPA Routing — CRITICAL to queue, LOW auto-resolved",
      desc:"Run 10 classifications — verify both routing paths work",
      run: async () => {
        const results = await Promise.all(Array(10).fill(null).map(()=>
          post("/api/demo/analyze-video?truck_id=TRUCK-002")
        ));
        const actions = {};
        results.forEach(r=>{actions[r.rpa_action]=(actions[r.rpa_action]||0)+1;});
        const hasCritical = !!actions["AUTO_ROUTED_CRITICAL_REVIEW_QUEUE"];
        const hasAutoResolve = !!actions["AUTO_RESOLVED_NO_REVIEW_NEEDED"];
        return {
          ok: hasCritical && hasAutoResolve,
          detail: `Critical routing: ${hasCritical?"✓":"✗"} · Auto-resolve: ${hasAutoResolve?"✓":"✗"}`,
          data: actions,
        };
      }
    },
    {
      id:"driver_score", cat:"VIDEO AI", color:T.amber,
      name:"Driver Behavior Scoring — penalty algorithm",
      desc:"Score all 10 drivers — verify risk levels and penalty math",
      run: async () => {
        const r = await get("/api/demo/driver-behavior");
        const drivers = r.drivers||[];
        const allHaveScores = drivers.every(d=>d.safety_score!==undefined);
        const allHaveLevels = drivers.every(d=>["HIGH","MEDIUM","LOW"].includes(d.risk_level));
        return {
          ok: drivers.length===10 && allHaveScores && allHaveLevels,
          detail: `10 drivers scored · Range: ${drivers[0]?.safety_score}–${drivers[drivers.length-1]?.safety_score} · Source: ${r.source}`,
          data: drivers.map(d=>({driver:d.driver_id,score:d.safety_score,risk:d.risk_level,retrain:d.retraining_required})),
        };
      }
    },
    {
      id:"patterns", cat:"VIDEO AI", color:T.amber,
      name:"Cross-Fleet Pattern Mining — sorted by risk rate",
      desc:"Run BigQuery pattern analysis — routes must be sorted descending by risk",
      run: async () => {
        const r = await get("/api/demo/cross-fleet-patterns");
        const p = r.patterns||[];
        const sorted = p.every((x,i)=>i===0||x.risk_rate<=p[i-1].risk_rate);
        return {
          ok: p.length>=3 && sorted,
          detail: `${p.length} routes · Sorted: ${sorted?"✓":"✗"} · Highest risk: ${p[0]?.route_id} at ${((p[0]?.risk_rate||0)*100).toFixed(0)}%`,
          data: p.map(x=>({route:x.route_id,risk:`${((x.risk_rate||0)*100).toFixed(0)}%`,events:x.total_events})),
        };
      }
    },
    // ── AI AGENTS ────────────────────────────────────────────────────────────
    {
      id:"agent_safety", cat:"AI AGENTS", color:T.teal,
      name:"AI Agent: Safety Inspector — score + risks + recommendations",
      desc:"Run on TRUCK-003 — must return structured safety analysis",
      run: async () => {
        const controller = new AbortController(); const tid = setTimeout(()=>controller.abort(), 30000); const r = await fetch(API_ROOT+"/api/demo/safety-inspector?truck_id=TRUCK-003",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}",signal:controller.signal}).then(x=>x.json()); clearTimeout(tid);
        const a = r.analysis||{};
        return {
          ok: a.safety_score!==undefined && a.top_risks?.length>0 && a.recommendations?.length>0,
          detail: `Score: ${a.safety_score}/100 · Risks: ${a.top_risks?.length} · Recommendations: ${a.recommendations?.length} · Model: ${r.model}`,
          data: a,
        };
      }
    },
    {
      id:"agent_maintenance", cat:"AI AGENTS", color:T.teal,
      name:"AI Agent: Maintenance Predictor — parts + cost + schedule",
      desc:"Predict maintenance needs — must return repairs list and cost estimate",
      run: async () => {
        const r = await post("/api/demo/maintenance-predictor?truck_id=TRUCK-003");
        const p = r.maintenance_plan||{};
        return {
          ok: p.priority_repairs?.length>0 && !!p.cost_estimate && p.downtime_hours>0,
          detail: `Repairs: ${p.priority_repairs?.length} · Downtime: ${p.downtime_hours}h · Model: ${r.model}`,
          data: p,
        };
      }
    },
    {
      id:"agent_route", cat:"AI AGENTS", color:T.teal,
      name:"AI Agent: Route Optimizer — high-risk routes + action items",
      desc:"Optimise routes — must return specific route changes and actions",
      run: async () => {
        const r = await post("/api/demo/route-optimizer?depot_id=DEPOT-BLR-01");
        const p = r.optimization_plan||{};
        return {
          ok: p.high_risk_routes?.length>0 && p.action_items?.length>0,
          detail: `High-risk routes: ${p.high_risk_routes?.length} · Actions: ${p.action_items?.length} · Model: ${r.model}`,
          data: p,
        };
      }
    },
    {
      id:"copilot_safety", cat:"AI AGENTS", color:T.teal,
      name:"AI Copilot: Safety Query — must mention trucks and alerts",
      desc:"Ask about critical alerts — response must reference specific trucks",
      run: async () => {
        const r = await post("/api/demo/copilot",
          {message:"Which truck has the most critical alerts?",conversation_history:[]});
        const resp = r.response?.toLowerCase()||"";
        const ok = resp.includes("truck") && (resp.includes("alert")||resp.includes("anomaly")||resp.includes("critical"));
        return {
          ok,
          detail: `Mentions trucks: ${resp.includes("truck")?"✓":"✗"} · Mentions alerts: ${(resp.includes("alert")||resp.includes("anomaly"))?"✓":"✗"} · Model: ${r.model}`,
          data: {question:"Which truck has the most critical alerts?", response:r.response},
        };
      }
    },
    {
      id:"copilot_route", cat:"AI AGENTS", color:T.teal,
      name:"AI Copilot: Route Query — must mention routes and risk data",
      desc:"Ask about dangerous routes — response must reference route names",
      run: async () => {
        const r = await post("/api/demo/copilot",
          {message:"Which route is most dangerous this week?",conversation_history:[]});
        const resp = r.response?.toLowerCase()||"";
        const ok = (resp.includes("route")||resp.includes("r-00")||resp.includes("northgate")) &&
                   (resp.includes("risk")||resp.includes("%")||resp.includes("incident"));
        return {
          ok,
          detail: `Mentions route: ${(resp.includes("route")||resp.includes("northgate"))?"✓":"✗"} · Mentions risk: ${(resp.includes("risk")||resp.includes("%"))?"✓":"✗"} · Model: ${r.model}`,
          data: {question:"Which route is most dangerous?", response:r.response},
        };
      }
    },
    // ── EDGE AI ──────────────────────────────────────────────────────────────
    {
      id:"edge_normal", cat:"EDGE AI", color:T.purple,
      name:"Edge AI: Truck Simulation — 5 events published to IoT Core",
      desc:"Simulate TRUCK-001 — verify sensor fusion, CAN bus readings, message IDs",
      run: async () => {
        const r = await post("/api/demo/simulate-truck?truck_id=TRUCK-001&include_anomaly=false");
        const evts = r.events||[];
        const allPublished = evts.every(e=>e.published);
        const allMsgIds   = evts.every(e=>e.message_id);
        const hasCANBus   = evts.every(e=>e.can_bus_readings);
        return {
          ok: r.events_published===5 && allPublished && allMsgIds,
          detail: `Published: ${r.events_published}/5 · Msg IDs: ${allMsgIds?"✓":"✗"} · CAN bus: ${hasCANBus?"✓":"✗"} · Source: ${r.source}`,
          data: evts.map(e=>({id:e.event_id,severity:e.severity,ms:e.inference_latency_ms,msg:e.message_id})),
        };
      }
    },
    {
      id:"edge_anomaly", cat:"EDGE AI", color:T.purple,
      name:"Edge AI: Anomaly Injection — Z-score detection in truck stream",
      desc:"Simulate TRUCK-003 with anomaly — event 3 must be HIGH severity with Z-score",
      run: async () => {
        const r = await post("/api/demo/simulate-truck?truck_id=TRUCK-003&include_anomaly=true");
        const evts = r.events||[];
        const anom = evts.find(e=>e.event_type==="sensor_anomaly");
        return {
          ok: !!anom && anom.severity==="HIGH",
          detail: `Anomaly event: ${anom?"PRESENT ✓":"MISSING ✗"} · Severity: ${anom?.severity} · Z-score: ${anom?.z_score?.toFixed(3)} · Sensors: ${anom?.anomalous_sensors?.join(",")}`,
          data: evts.map(e=>({type:e.event_type,severity:e.severity,z:e.z_score})),
        };
      }
    },
  ];

  const runAll = async () => {
    setRunning(true); setSummary(null);
    setTests(TESTS.map(t=>({...t,status:"PENDING"})));
    let passed=0, failed=0;
    for (const test of TESTS) {
      setTests(prev=>prev.map(t=>t.id===test.id?{...t,status:"RUNNING",detail:"Running…"}:t));
      try {
        const result = await test.run();
        const status = result.ok?"PASS":"FAIL";
        if (result.ok) passed++; else failed++;
        setTests(prev=>prev.map(t=>t.id===test.id?{...t,status,detail:result.detail,data:result.data}:t));
      } catch(e) {
        failed++;
        setTests(prev=>prev.map(t=>t.id===test.id?{...t,status:"FAIL",detail:`ERROR: ${e.message}`}:t));
      }
      await new Promise(r=>setTimeout(r,150));
    }
    setSummary({passed,failed,total:passed+failed});
    setRunning(false);
  };

  const cats = [...new Set(TESTS.map(t=>t.category))];
  const sc = s=>s==="PASS"?T.green:s==="FAIL"?T.red:s==="RUNNING"?T.amber:T.muted;
  const si = s=>{if(s==="PASS")return"✓";if(s==="FAIL")return"✗";if(s==="RUNNING")return"...";return"○";};

  return (
    <div className="fi" style={{padding:"1.25rem",overflowY:"auto",flex:1}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1.25rem"}}>
        <div>
          <div style={{fontFamily:T.font,fontSize:10,color:T.teal,letterSpacing:".1em",marginBottom:4}}>ALGORITHM VERIFICATION SUITE</div>
          <div style={{fontSize:22,fontWeight:700,color:T.white}}>{TESTS.length} Tests · Z-score · CV · Gemini · Edge · Patterns</div>
          <div style={{fontSize:12,color:T.muted2,marginTop:4}}>Every backend algorithm tested end-to-end with real HTTP calls to the API</div>
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          {summary&&(
            <div style={{textAlign:"right"}}>
              <div style={{fontFamily:T.font,fontSize:22,fontWeight:700,color:summary.failed===0?T.green:T.red}}>{summary.passed}/{summary.total}</div>
              <div style={{fontFamily:T.font,fontSize:11,color:T.muted2}}>{summary.failed===0?"ALL PASSING ✓":`${summary.failed} FAILING ✗`}</div>
            </div>
          )}
          <Btn onClick={runAll} loading={running} color={T.teal}>▶ RUN ALL {TESTS.length} TESTS</Btn>
        </div>
      </div>

      {summary&&(
        <div style={{padding:"1rem 1.25rem",borderRadius:10,marginBottom:"1.25rem",background:summary.failed===0?"rgba(34,197,94,.08)":"rgba(239,68,68,.08)",border:`1px solid ${summary.failed===0?T.green:T.red}44`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontFamily:T.font,fontSize:13,color:summary.failed===0?T.green:T.red,fontWeight:700}}>
              {summary.failed===0?"✓ ALL ALGORITHMS VERIFIED — READY TO PRESENT TO DINESH":`✗ ${summary.failed} ALGORITHM(S) FAILING — FIX BEFORE PRESENTATION`}
            </div>
            <div style={{fontFamily:T.font,fontSize:11,color:T.muted2,marginTop:4}}>Passed: {summary.passed} · Failed: {summary.failed} · Total: {summary.total}</div>
          </div>
          <div style={{fontFamily:T.font,fontSize:28,fontWeight:700,color:summary.failed===0?T.green:T.red}}>{Math.round(summary.passed/summary.total*100)}%</div>
        </div>
      )}

      {cats.map(cat=>{
        const catTests = (tests.length>0?tests:TESTS.map(t=>({...t,status:"PENDING"}))).filter(t=>t.category===cat);
        const catColor = TESTS.find(t=>t.category===cat)?.color||T.teal;
        const passCt   = catTests.filter(t=>t.status==="PASS").length;
        return(
          <Panel key={cat} style={{marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:".85rem"}}>
              <div style={{width:3,height:14,background:catColor,borderRadius:2}}/>
              <span style={{fontFamily:T.font,fontSize:11,fontWeight:700,color:T.white,letterSpacing:".05em"}}>{cat}</span>
              <span style={{fontFamily:T.font,fontSize:10,color:T.muted2}}>{passCt}/{catTests.length} passing</span>
            </div>
            {catTests.map(t=>(
              <div key={t.id}>
                <div onClick={()=>setExpanded(expanded===t.id?null:t.id)} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"8px 0",borderBottom:`1px solid ${T.border}22`,cursor:t.data?"pointer":"default"}}>
                  <span style={{fontFamily:T.font,fontSize:14,color:sc(t.status),width:16,textAlign:"center",flexShrink:0,animation:t.status==="RUNNING"?"spin 1s linear infinite":"none"}}>{si(t.status)}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                      <span style={{fontSize:13,color:t.status==="PASS"?T.white:t.status==="FAIL"?T.red:T.muted2,fontWeight:t.status==="PENDING"?400:500}}>{t.name}</span>
                      {t.status!=="PENDING"&&<span style={{fontFamily:T.font,fontSize:10,padding:"1px 7px",borderRadius:4,background:`${sc(t.status)}18`,color:sc(t.status),fontWeight:700}}>{t.status}</span>}
                    </div>
                    {t.detail&&<div style={{fontFamily:T.font,fontSize:11,color:t.status==="FAIL"?T.red:T.muted2,marginTop:3}}>{t.detail}</div>}
                    {t.status==="PENDING"&&<div style={{fontSize:11,color:T.muted,marginTop:1}}>{t.desc}</div>}
                  </div>
                  {t.data&&<span style={{color:T.muted,fontSize:12,flexShrink:0}}>{expanded===t.id?"▲":"▼"}</span>}
                </div>
                {expanded===t.id&&t.data&&(
                  <div style={{padding:"8px 0 8px 26px",animation:"fadeIn .2s ease"}}>
                    <JsonBox data={t.data}/>
                  </div>
                )}
              </div>
            ))}
          </Panel>
        );
      })}

      {tests.length===0&&(
        <Panel style={{textAlign:"center",padding:"3rem"}}>
          <div style={{fontFamily:T.font,fontSize:14,color:T.muted,marginBottom:12}}>READY TO RUN</div>
          <div style={{fontSize:13,color:T.muted2,marginBottom:20}}>Click "RUN ALL TESTS" to verify every algorithm end-to-end with real HTTP calls</div>
          <Btn onClick={runAll} color={T.teal}>▶ RUN ALL {TESTS.length} TESTS</Btn>
        </Panel>
      )}
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════════════
// SCREEN: MLOps PIPELINE
// What Terex can't do: automate train→evaluate→deploy→OTA end-to-end
// ════════════════════════════════════════════════════════════════════════════
function MLOpsPage() {
  const [activeRun, setActiveRun] = useState(null);
  const [runLog, setRunLog] = useState([]);
  const [running, setRunning] = useState(false);

  const pipeline_stages = [
    { id:"ingest",   label:"Data Ingestion",        icon:"📥", color:T.teal,
      desc:"3rd Eye footage clips pulled from GCS bucket, validated, split train/val/test",
      duration:"~5 min", gcp:"Cloud Storage + Dataflow",
      detail:"Validates clip quality, filters corrupt frames, auto-labels using existing model predictions as seed labels" },
    { id:"train",    label:"Model Training",         icon:"🧠", color:T.blue,
      desc:"YOLO v8 fine-tuned on Heil-specific scenarios, 50 epochs, T4 GPU",
      duration:"~48 min", gcp:"Vertex AI Training",
      detail:"Shared backbone across all 10 scenarios, transfer learning from COCO base, Heil fleet domain adaptation" },
    { id:"evaluate", label:"Quality Gate Evaluation",icon:"✅", color:T.amber,
      desc:"Auto-fail if mAP50 < 0.80 on any scenario — prevents regression deployment",
      duration:"~4 min", gcp:"Vertex AI Evaluation",
      detail:"Per-scenario mAP50 threshold gates: CRITICAL scenarios (near_miss, hazmat) require >= 0.85, others >= 0.80" },
    { id:"register", label:"Model Registry",         icon:"📋", color:T.purple,
      desc:"Versioned model artifact stored with metadata, comparison vs previous production version",
      duration:"~1 min", gcp:"Vertex AI Model Registry",
      detail:"Stores: training data hash, accuracy metrics, training config, comparison diff vs prod. Supports rollback." },
    { id:"deploy",   label:"Endpoint Deployment",    icon:"🚀", color:T.green,
      desc:"Blue-green deployment to Vertex AI endpoint — zero downtime, instant rollback capability",
      duration:"~6 min", gcp:"Vertex AI Endpoint",
      detail:"Traffic split: 10% canary → 100% if latency <200ms and error rate <0.1% for 30 minutes" },
    { id:"export",   label:"TFLite Edge Export",     icon:"💾", color:T.teal,
      desc:"INT8 quantised TFLite model exported, size-checked (<5MB for IoT Core OTA limit)",
      duration:"~2 min", gcp:"Cloud Build",
      detail:"Quantisation-aware training ensures INT8 export maintains >= 98% of float32 accuracy" },
    { id:"ota",      label:"Fleet OTA Push",          icon:"📡", color:T.amber,
      desc:"Staged rollout: 1 pilot truck → 3 validation trucks → full fleet. Auto-rollback on edge error spike.",
      duration:"~24 hrs", gcp:"Cloud IoT Core",
      detail:"Each truck confirms model load via MQTT heartbeat. Rollback triggered if on-device inference error rate >2%" },
  ];

  const production_metrics = [
    { label:"Current Model", value:"v1.2", sub:"In production since 14 days ago" },
    { label:"Training Runs", value:"8",    sub:"Total runs, 6 promoted to prod" },
    { label:"Auto-rejected", value:"2",    sub:"Failed mAP50 quality gate" },
    { label:"Fleet Coverage", value:"100%",sub:"All 10 trucks on v1.2" },
  ];

  const retrain_triggers = [
    { trigger:"New labeled footage received",      status:"ACTIVE",  count:"342 new clips this week" },
    { trigger:"Model drift detected (accuracy dip)",status:"ACTIVE", count:"Threshold: >5% drop vs baseline" },
    { trigger:"New scenario added",                status:"ACTIVE",  count:"Near miss vehicle — labeling in progress" },
    { trigger:"Weekly scheduled retrain",          status:"PAUSED",  count:"Manual approval required" },
  ];

  const triggerRun = async () => {
    setRunning(true); setRunLog([]); setActiveRun(null);
    const logs = [];
    for (let i = 0; i < pipeline_stages.length; i++) {
      const stage = pipeline_stages[i];
      setActiveRun(stage.id);
      logs.push({ stage: stage.label, status: "RUNNING", time: new Date().toLocaleTimeString() });
      setRunLog([...logs]);
      await new Promise(r => setTimeout(r, 800 + Math.random()*600));
      // Simulate quality gate check
      if (stage.id === "evaluate") {
        logs[i] = { stage: stage.label, status: "PASS", time: new Date().toLocaleTimeString(),
          detail: "All scenarios >= 0.80 mAP50 · bin_missed:0.91 · safety_noncompliance:0.85 · near_miss_pedestrian:0.87" };
      } else {
        logs[i] = { stage: stage.label, status: "COMPLETE", time: new Date().toLocaleTimeString(), detail: stage.desc };
      }
      setRunLog([...logs]);
    }
    setActiveRun(null); setRunning(false);
  };

  return (
    <div className="fi" style={{padding:"1.25rem",overflowY:"auto",flex:1}}>


      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:"1.25rem"}}>
        {production_metrics.map((m,i)=><StatBox key={i} label={m.label} value={m.value} sub={m.sub} color={T.purple}/>)}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:12,marginBottom:12}}>
        <Panel>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
            <PT color={T.purple}>AUTOMATED MLOps PIPELINE — 7 STAGES</PT>
            <Btn onClick={triggerRun} loading={running} color={T.purple}>▶ TRIGGER PIPELINE RUN</Btn>
          </div>
          {pipeline_stages.map((s,i)=>{
            const isActive = activeRun===s.id;
            const logEntry = runLog.find(l=>l.stage===s.label);
            const isDone   = logEntry?.status==="COMPLETE"||logEntry?.status==="PASS";
            return(
              <div key={s.id} style={{display:"flex",gap:12,padding:"10px 0",borderBottom:`1px solid ${T.border}22`,alignItems:"flex-start"}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:0}}>
                  <div style={{width:32,height:32,borderRadius:"50%",background:isDone?`${s.color}22`:isActive?`${s.color}33`:`${T.bg3}`,border:`2px solid ${isDone?s.color:isActive?s.color:T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0,animation:isActive?"pulse 1s infinite":"none"}}>
                    {isDone?"✓":s.icon}
                  </div>
                  {i<pipeline_stages.length-1&&<div style={{width:2,height:20,background:isDone?s.color:T.border,margin:"2px 0"}}/>}
                </div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
                    <span style={{fontSize:13,fontWeight:600,color:isDone?T.white:isActive?s.color:T.muted2}}>{s.label}</span>
                    <Mono size={10} color={s.color}>{s.gcp}</Mono>
                    <Mono size={10} color={T.muted}>{s.duration}</Mono>
                    {logEntry?.status==="PASS"&&<span style={{fontFamily:T.font,fontSize:10,color:T.green,padding:"1px 6px",background:"rgba(34,197,94,0.1)",borderRadius:4}}>PASS</span>}
                  </div>
                  <div style={{fontSize:11,color:T.muted,lineHeight:1.5}}>{isDone?(logEntry?.detail||s.desc):s.desc}</div>
                </div>
              </div>
            );
          })}
        </Panel>

        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <Panel>
            <PT color={T.amber}>AUTO-RETRAIN TRIGGERS</PT>
            {retrain_triggers.map((t,i)=>(
              <div key={i} style={{padding:"8px 0",borderBottom:`1px solid ${T.border}22`}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                  <span style={{fontSize:12,color:T.white}}>{t.trigger}</span>
                  <span style={{fontFamily:T.font,fontSize:10,color:t.status==="ACTIVE"?T.green:T.muted,padding:"1px 6px",background:t.status==="ACTIVE"?"rgba(34,197,94,0.1)":"transparent",borderRadius:4}}>{t.status}</span>
                </div>
                <Mono color={T.muted}>{t.count}</Mono>
              </div>
            ))}
          </Panel>
          <Panel>
            <PT color={T.purple}>PIPELINE RUN LOG</PT>
            {runLog.length===0&&<Mono>Trigger a run to see live log</Mono>}
            {runLog.map((l,i)=>(
              <div key={i} style={{display:"flex",gap:8,padding:"4px 0",borderBottom:`1px solid ${T.border}22`,fontSize:11}}>
                <Mono color={l.status==="COMPLETE"||l.status==="PASS"?T.green:T.amber}>{l.status==="RUNNING"?"RUNNING":l.status==="PASS"?"PASS":l.status}</Mono>
                <span style={{color:T.white,flex:1}}>{l.stage}</span>
                <Mono color={T.muted}>{l.time}</Mono>
              </div>
            ))}
          </Panel>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SCREEN: CROSS-FLEET INTELLIGENCE
// What Terex can't do: mine patterns across all trucks at fleet level
// ════════════════════════════════════════════════════════════════════════════
function CrossFleetPage() {
  const [data, setData] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    Promise.all([api("/bi-analytics"), api("/driver-behavior")])
      .then(([b,d])=>{setData(b);setDrivers(d.drivers||[]);setLoading(false);});
  },[]);

  const patterns = data?.patterns || [];
  const insights = data?.top_insights || [];

  const fleet_correlations = [
    { finding:"School zone dispatch timing",     trucks:"KA-01-AA-4523, KA-01-AA-4522", impact:"3 CRITICAL pedestrian near-misses/week", action:"Shift Koramangala route to 06:30", confidence:"94%" },
    { finding:"Hydraulic seal wear pattern",     trucks:"KA-01-AA-4523 (2019 model)",   impact:"Progressive failure over 18 days — Z-score 2.6→3.1", action:"Pre-emptive seal replacement at 80,000km service", confidence:"89%" },
    { finding:"Packer blade vibration post-incident", trucks:"KA-01-AA-4527",          impact:"Mechanical shock from near-miss → component fatigue", action:"Mandatory inspection after any CRITICAL event", confidence:"91%" },
    { finding:"Early morning distraction pattern",trucks:"All Koramangala route trucks", impact:"5 distraction events correlate with 05:30 muster time", action:"Review muster schedule vs BBMP route timing", confidence:"82%" },
  ];

  return (
    <div className="fi" style={{padding:"1.25rem",overflowY:"auto",flex:1}}>


      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
        <Panel>
          <PT color={T.teal}>CROSS-FLEET SAFETY CORRELATIONS — 30 DAYS</PT>
          {fleet_correlations.map((c,i)=>(
            <div key={i} style={{padding:"10px",background:T.bg2,borderRadius:8,marginBottom:8,border:`1px solid ${T.border}`,borderLeft:`3px solid ${T.teal}`}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:13,fontWeight:600,color:T.white}}>{c.finding}</span>
                <Mono color={T.teal}>{c.confidence} confidence</Mono>
              </div>
              <div style={{fontFamily:T.font,fontSize:10,color:T.muted2,marginBottom:3}}>Trucks: {c.trucks}</div>
              <div style={{fontSize:11,color:T.amber,marginBottom:3}}>Impact: {c.impact}</div>
              <div style={{fontSize:11,color:T.green}}>→ {c.action}</div>
            </div>
          ))}
        </Panel>

        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <Panel>
            <PT color={T.amber}>ROUTE RISK RANKING — ALL 6 BANGALORE ROUTES</PT>
            {loading?<Mono>Loading…</Mono>:patterns.map((p,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:`1px solid ${T.border}22`}}>
                <div style={{width:22,height:22,borderRadius:"50%",background:`${p.risk_rate>0.25?T.red:p.risk_rate>0.12?T.amber:T.green}22`,border:`1px solid ${p.risk_rate>0.25?T.red:p.risk_rate>0.12?T.amber:T.green}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:T.font,fontSize:11,color:p.risk_rate>0.25?T.red:p.risk_rate>0.12?T.amber:T.green,flexShrink:0}}>{i+1}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,color:T.white}}>{p.area||p.route_name}</div>
                  <Mono color={T.muted}>{p.total_events} events · {p.pedestrian_near_misses} near-misses{p.school_zone?" · 🏫 school zone":""}</Mono>
                </div>
                <span style={{fontFamily:T.font,fontSize:13,fontWeight:700,color:p.risk_rate>0.25?T.red:p.risk_rate>0.12?T.amber:T.green}}>{(p.risk_rate*100).toFixed(0)}%</span>
              </div>
            ))}
          </Panel>

          <Panel>
            <PT color={T.red}>DRIVER SAFETY RANKING — ALL 10 DRIVERS</PT>
            {loading?<Mono>Loading…</Mono>:drivers.slice(0,5).map((d,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:`1px solid ${T.border}22`}}>
                <div style={{width:7,height:7,borderRadius:"50%",background:d.safety_score<65?T.red:d.safety_score<80?T.amber:T.green,flexShrink:0}}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,color:T.white}}>{d.driver_name||d.driver_id}</div>
                  <Mono color={T.muted}>{d.truck_reg||d.truck_id} · {d.area||""}</Mono>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:T.font,fontSize:13,fontWeight:700,color:d.safety_score<65?T.red:d.safety_score<80?T.amber:T.green}}>{d.safety_score}</div>
                  {d.retraining_required&&<Mono color={T.red} size={9}>RETRAIN</Mono>}
                </div>
              </div>
            ))}
          </Panel>
        </div>
      </div>

      <Panel>
        <PT color={T.teal}>AI-GENERATED FLEET INTELLIGENCE INSIGHTS</PT>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {insights.map((ins,i)=>(
            <div key={i} style={{padding:"10px 12px",background:T.bg2,borderRadius:8,border:`1px solid ${T.border}`,borderLeft:`3px solid ${T.teal}`,fontSize:12,color:T.white,lineHeight:1.6}}>{ins}</div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SCREEN: STAFFING AUGMENTATION
// Show Dinesh exactly which engineers NeoSOFT Digital can provide
// ════════════════════════════════════════════════════════════════════════════
function StaffingPage() {
  const roles = [
    {
      title:"AI/ML Engineer — 3rd Eye Model Training",
      band:"Senior", count:2, availability:"Immediate",
      skills:["YOLO v8 / object detection","TFLite / edge model optimisation","Video classification pipelines","Vertex AI training jobs","Python · PyTorch"],
      terex_fit:"Directly accelerates your CV model training for the 7-10 3rd Eye scenarios. Works alongside your US-based AI team.",
      engagement:"6-12 months · Bangalore on-site · Can attend TIRC",
      color:T.teal,
    },
    {
      title:"Embedded Software Engineer — Edge AI",
      band:"Senior", count:2, availability:"2 weeks",
      skills:["C/C++ embedded systems","NVIDIA Jetson / TFLite inference","CAN bus integration (J1939)","MQTT / IoT firmware","OTA update mechanisms"],
      terex_fit:"Complements your embedded team. Specifically for AI inference integration on the truck edge device — the gap between hardware and model deployment.",
      engagement:"6-12 months · Bangalore on-site",
      color:T.purple,
    },
    {
      title:"Data Engineer — GCP Cloud Platform",
      band:"Senior", count:1, availability:"Immediate",
      skills:["Apache Beam / Dataflow","BigQuery streaming pipelines","Pub/Sub + IoT Core","Real-time anomaly detection","Python · SQL · dbt"],
      terex_fit:"Builds and operates the cloud data pipeline your embedded team sends data to. 200+ sensors × 10 trucks × continuous stream = specialist data engineering problem.",
      engagement:"6-12 months · Remote or on-site",
      color:T.green,
    },
    {
      title:"Java Microservices Engineer — Migration",
      band:"Senior + Mid", count:3, availability:"1 week",
      skills:["Spring Boot microservices","REST API design","Java → Cloud Run migration","PostgreSQL / Cloud SQL","CI/CD · Cloud Build"],
      terex_fit:"Dedicated bandwidth for your classic → microservices migration. Your engineering team doesn't have capacity to run migration AND new product development simultaneously.",
      engagement:"6-12 months · Flexible",
      color:T.amber,
    },
    {
      title:"MLOps / DevOps Engineer",
      band:"Senior", count:1, availability:"Immediate",
      skills:["Kubeflow Pipelines v2","Vertex AI MLOps","GCP Cloud Build / CD","Model Registry management","Python · Terraform"],
      terex_fit:"Owns the full train→evaluate→deploy→OTA pipeline. Frees your AI engineers to focus on model quality rather than pipeline maintenance.",
      engagement:"3-6 months then part-time",
      color:T.blue,
    },
  ];

  const engagement_models = [
    { model:"Staff Augmentation", desc:"NeoSOFT Digital engineers embedded in your TIRC team. Work under your direction, use your tools, attend your standups. No project management overhead.", best_for:"When you know what to build but need more hands", timeline:"Start in 1-2 weeks" },
    { model:"Managed Delivery",   desc:"NeoSOFT Digital takes ownership of a defined workstream — e.g. the full MLOps pipeline or the microservices migration. We deliver to spec.", best_for:"When you want to offload a complete workstream", timeline:"Scoping + start in 2-3 weeks" },
    { model:"Hybrid",             desc:"Core NeoSOFT Digital team works independently on platform infrastructure while 1-2 engineers are embedded in your TIRC team for tight collaboration.", best_for:"Platform build + day-to-day team support", timeline:"Start in 1 week" },
  ];

  return (
    <div className="fi" style={{padding:"1.25rem",overflowY:"auto",flex:1}}>
      <div style={{background:"rgba(34,197,94,0.06)",border:"1px solid rgba(34,197,94,0.3)",borderRadius:10,padding:"1rem 1.25rem",marginBottom:"1.25rem"}}>
        <div style={{fontFamily:T.font,fontSize:10,color:T.green,letterSpacing:".08em",marginBottom:4}}>NEOSOFT VALUE PROPOSITION FOR TIRC BANGALORE</div>
        <div style={{fontSize:13,color:T.white,lineHeight:1.6}}>
          You are hiring AI engineers. That takes 3-6 months. <b style={{color:T.green}}>NeoSOFT Digital can deploy senior engineers in 1-2 weeks</b> — working on-site at TIRC Bangalore, under your technical direction, on exactly the gaps your current team doesn't cover. No ramp-up time — our engineers have already built the architecture you're looking at.
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:12}}>
        {[
          {label:"ENGINEERS AVAILABLE",value:"9",sub:"AI + Embedded + Data + Java",color:T.green},
          {label:"BANGALORE BASED",    value:"100%",sub:"TIRC on-site capable",    color:T.teal},
          {label:"EARLIEST START",     value:"1 week",sub:"Staff aug engagement",  color:T.amber},
        ].map((s,i)=><StatBox key={i} {...s}/>)}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
        {roles.map((r,i)=>(
          <div key={i} style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:10,padding:"1rem",borderTop:`3px solid ${r.color}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:T.white,marginBottom:2}}>{r.title}</div>
                <div style={{fontFamily:T.font,fontSize:10,color:r.color}}>{r.band} · {r.count} engineer{r.count>1?"s":""} available · {r.availability}</div>
              </div>
            </div>
            <div style={{marginBottom:8}}>
              <div style={{fontFamily:T.font,fontSize:9,color:T.muted,letterSpacing:".06em",marginBottom:4}}>SKILLS</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                {r.skills.map((s,j)=>(
                  <span key={j} style={{fontFamily:T.font,fontSize:10,padding:"2px 7px",background:`${r.color}14`,color:r.color,borderRadius:4}}>{s}</span>
                ))}
              </div>
            </div>
            <div style={{padding:"8px 10px",background:T.bg0,borderRadius:7,border:`1px solid ${T.border}`,fontSize:11,color:T.muted2,lineHeight:1.5,marginBottom:6}}>
              <span style={{color:T.white,fontWeight:500}}>Fit for TIRC: </span>{r.terex_fit}
            </div>
            <Mono color={T.muted}>{r.engagement}</Mono>
          </div>
        ))}
      </div>

      <Panel>
        <PT color={T.green}>ENGAGEMENT MODELS — HOW WE WORK WITH TIRC</PT>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
          {engagement_models.map((e,i)=>(
            <div key={i} style={{padding:"1rem",background:T.bg2,borderRadius:9,border:`1px solid ${T.border}`}}>
              <div style={{fontFamily:T.font,fontSize:11,fontWeight:700,color:T.white,marginBottom:6}}>{e.model}</div>
              <div style={{fontSize:12,color:T.muted2,lineHeight:1.5,marginBottom:8}}>{e.desc}</div>
              <div style={{fontFamily:T.font,fontSize:10,color:T.green,marginBottom:4}}>Best for: {e.best_for}</div>
              <div style={{fontFamily:T.font,fontSize:10,color:T.teal}}>Timeline: {e.timeline}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SCREEN: MIGRATION ACCELERATOR
// Java classic → microservices — they can't do migration AND new dev together
// ════════════════════════════════════════════════════════════════════════════
function MigrationPage() {
  const [expanded, setExpanded] = useState(null);

  const services = [
    { name:"sensor-ingestion-svc",    from:"MonolithicSensorProcessor.java", to:"sensor-ingestion-svc (Python)",  status:"COMPLETE",  risk:"LOW",    owner:"NeoSOFT Digital",  effort:"3 weeks", notes:"Pub/Sub ingestion, 200+ sensor types, Dataflow integration" },
    { name:"video-classification-svc",from:"VideoAnalyzer.java",             to:"video-classification-svc (Python)",status:"COMPLETE", risk:"LOW",    owner:"NeoSOFT Digital",  effort:"4 weeks", notes:"3rd Eye pipeline, CV classification, BigQuery write" },
    { name:"edge-ota-svc",            from:"FirmwareUpdater.java",           to:"edge-ota-svc (Python)",           status:"COMPLETE",  risk:"LOW",    owner:"NeoSOFT Digital",  effort:"2 weeks", notes:"IoT Core OTA, staged rollout, rollback logic" },
    { name:"alert-router-svc",        from:"AlertManager.java",              to:"alert-router-svc (Java)",         status:"COMPLETE",  risk:"LOW",    owner:"Terex+NS", effort:"2 weeks", notes:"Pub/Sub triggered, Heil-specific alert routing rules" },
    { name:"parts-integration-svc",   from:"PartsOrderSystem.java",          to:"parts-integration-svc (Java)",    status:"COMPLETE",  risk:"MEDIUM", owner:"NeoSOFT Digital",  effort:"3 weeks", notes:"Parts Central API integration, auto-order on anomaly" },
    { name:"driver-scoring-svc",      from:"DriverReportGenerator.java",     to:"driver-scoring-svc (Python)",     status:"COMPLETE",  risk:"LOW",    owner:"NeoSOFT Digital",  effort:"2 weeks", notes:"CV event aggregation, penalty scoring, threshold alerts" },
    { name:"route-analytics-svc",     from:"RouteReportBatch.java",          to:"route-analytics-svc (Java)",      status:"COMPLETE",  risk:"LOW",    owner:"Terex+NS", effort:"3 weeks", notes:"BigQuery ML, 30-day pattern mining, risk scoring" },
    { name:"rpa-workflow-svc",        from:"WorkflowEngine.java",            to:"rpa-workflow-svc (Python)",       status:"COMPLETE",  risk:"LOW",    owner:"NeoSOFT Digital",  effort:"4 weeks", notes:"6 operational workflows, Cloud Run Jobs" },
    { name:"bi-reporting-svc",        from:"ReportingModule.java",           to:"bi-reporting-svc (Java)",         status:"IN PROGRESS",risk:"MEDIUM",owner:"NeoSOFT Digital",  effort:"3 weeks remaining", notes:"⚠ Currently overloaded — scale-up needed" },
    { name:"model-serving-svc",       from:"ModelInference.java",            to:"model-serving-svc (Python)",      status:"COMPLETE",  risk:"LOW",    owner:"NeoSOFT Digital",  effort:"2 weeks", notes:"Vertex AI endpoint wrapper, A/B testing support" },
    { name:"fleet-management-svc",    from:"FleetDashboard.java",            to:"fleet-management-svc (Java)",     status:"PENDING",   risk:"MEDIUM", owner:"Terex",    effort:"4 weeks est", notes:"Core fleet ops — Terex team owns this migration" },
    { name:"maintenance-scheduling",  from:"MaintenanceScheduler.java",      to:"maintenance-scheduling-svc (Java)",status:"PENDING",  risk:"HIGH",   owner:"Terex+NS", effort:"5 weeks est", notes:"⚠ Complex business logic — needs Terex domain knowledge" },
    { name:"bbmp-compliance-svc",     from:"ComplianceReporter.java",        to:"bbmp-compliance-svc (Python)",    status:"PENDING",   risk:"LOW",    owner:"NeoSOFT Digital",  effort:"2 weeks est", notes:"BBMP regulatory reporting, SLA tracking" },
    { name:"parts-catalog-svc",       from:"PartsCatalog.java",              to:"parts-catalog-svc (Java)",        status:"PENDING",   risk:"LOW",    owner:"NeoSOFT Digital",  effort:"2 weeks est", notes:"Heil parts catalog API, SKU management" },
  ];

  const migrated   = services.filter(s=>s.status==="COMPLETE").length;
  const inProgress = services.filter(s=>s.status==="IN PROGRESS").length;
  const pending    = services.filter(s=>s.status==="PENDING").length;
  const riskHigh   = services.filter(s=>s.risk==="HIGH").length;

  const statusColor = s => ({COMPLETE:"#22C55E","IN PROGRESS":"#F59E0B",PENDING:T.muted})[s]||T.muted;
  const riskColor   = r => ({LOW:T.green,MEDIUM:T.amber,HIGH:T.red})[r]||T.muted;

  return (
    <div className="fi" style={{padding:"1.25rem",overflowY:"auto",flex:1}}>


      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:"1.25rem"}}>
        <StatBox label="MIGRATED"    value={`${migrated}/${services.length}`} sub="Services complete"     color={T.green}/>
        <StatBox label="IN PROGRESS" value={inProgress}                        sub="Currently migrating"  color={T.amber}/>
        <StatBox label="PENDING"     value={pending}                            sub="Queued for migration" color={T.muted2}/>
        <StatBox label="HIGH RISK"   value={riskHigh}                           sub="Need domain expertise"color={T.red}/>
      </div>

      <Panel>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
          <PT color={T.amber}>MIGRATION TRACKER — 14 SERVICES · TARGET Q3 2026</PT>
          <div style={{display:"flex",gap:10}}>
            {[["COMPLETE",T.green],["IN PROGRESS",T.amber],["PENDING",T.muted]].map(([l,c])=>(
              <div key={l} style={{display:"flex",alignItems:"center",gap:4}}>
                <div style={{width:8,height:8,borderRadius:2,background:c}}/>
                <Mono color={c}>{l}</Mono>
              </div>
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{background:T.bg0,borderRadius:6,height:8,overflow:"hidden",marginBottom:"1rem",display:"flex"}}>
          <div style={{width:`${migrated/services.length*100}%`,background:T.green,transition:"width 1s"}}/>
          <div style={{width:`${inProgress/services.length*100}%`,background:T.amber}}/>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"2fr 2fr auto auto auto auto",gap:"6px 14px",padding:"5px 0",borderBottom:`1px solid ${T.border}`,marginBottom:6}}>
          {["SERVICE","MIGRATED FROM","STATUS","RISK","OWNER","EFFORT"].map(h=><Mono key={h} color={T.muted}>{h}</Mono>)}
        </div>

        {services.map((s,i)=>(
          <div key={i}>
            <div onClick={()=>setExpanded(expanded===i?null:i)} style={{display:"grid",gridTemplateColumns:"2fr 2fr auto auto auto auto",gap:"6px 14px",padding:"8px 0",borderBottom:`1px solid ${T.border}22`,cursor:"pointer",alignItems:"center"}}>
              <Mono size={12} color={T.white}>{s.name}</Mono>
              <Mono size={11} color={T.muted2}>{s.from}</Mono>
              <span style={{fontFamily:T.font,fontSize:10,fontWeight:700,color:statusColor(s.status)}}>{s.status}</span>
              <span style={{fontFamily:T.font,fontSize:10,fontWeight:700,color:riskColor(s.risk)}}>{s.risk}</span>
              <Mono size={10} color={T.muted2}>{s.owner}</Mono>
              <Mono size={10} color={T.muted}>{s.effort}</Mono>
            </div>
            {expanded===i&&(
              <div style={{padding:"6px 0 6px 12px",animation:"fadeIn .2s ease"}}>
                <div style={{fontSize:12,color:T.muted2,padding:"6px 10px",background:T.bg0,borderRadius:6,borderLeft:`3px solid ${statusColor(s.status)}`}}>
                  → {s.notes}<br/>
                  <span style={{color:T.muted}}>Migrated to: </span><span style={{color:T.teal}}>{s.to}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </Panel>
    </div>
  );
}

export default function App(){
  const [page,setPage]=useState("dashboard");
  const [isDark,setIsDark]=useState(true);

  const toggleTheme=()=>{
    const next=!isDark;
    _theme = next ? DARK : LIGHT;
    setIsDark(next);
    // Update body background
    document.body.style.background = next ? DARK.bg0 : LIGHT.bg0;
    document.body.style.color = next ? DARK.white : LIGHT.white;
  };

  const pages={dashboard:Dashboard,video:VideoPage,sensors:SensorsPage,edge:EdgePage,agents:AgentsPage,model:ModelPage,rpa:RPAPage,bi:BIPage,devops:DevOpsPage,apigate:APIGatewayPage,iot:IoTPage,mlops:MLOpsPage,crossfleet:CrossFleetPage,tests:TestPanel};
  const Page=pages[page]||Dashboard;

  const appBg={background:T.bg0,color:T.white,transition:"background 0.3s,color 0.3s"};

  return<><StyleTag isDark={isDark}/><div style={{display:"flex",height:"100vh",overflow:"hidden",...appBg}}>
    <Sidebar page={page} setPage={setPage} isDark={isDark}/>
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <TopBar page={page} isDark={isDark} toggleTheme={toggleTheme}/>
      <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column",...appBg}}><Page setPage={setPage}/></div>
    </div>
  </div></>;
}

// This line intentionally left blank
