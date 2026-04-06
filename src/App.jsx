import { useState, useEffect } from "react";

var SUPA_URL = "https://yvzearwbwwthquekqnnk.supabase.co";
var SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2emVhcndid3d0aHF1ZWtxbm5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMTMwNTMsImV4cCI6MjA5MDg4OTA1M30.1BhalulMlEJ3am_D0e8Y3rRyM_qz0VR4_34VNV76FNE";

function dbGet(table) {
  return fetch(SUPA_URL + "/rest/v1/" + table + "?select=*", {
    headers: { "apikey": SUPA_KEY, "Authorization": "Bearer " + SUPA_KEY }
  }).then(function(r) { return r.json(); });
}
function dbSave(table, id, data) {
  return fetch(SUPA_URL + "/rest/v1/" + table, {
    method: "POST",
    headers: { "apikey": SUPA_KEY, "Authorization": "Bearer " + SUPA_KEY, "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates" },
    body: JSON.stringify({ id: id, data: data, updated_at: new Date().toISOString() })
  });
}
function dbDel(table, id) {
  return fetch(SUPA_URL + "/rest/v1/" + table + "?id=eq." + id, {
    method: "DELETE",
    headers: { "apikey": SUPA_KEY, "Authorization": "Bearer " + SUPA_KEY }
  });
}

var ST={activo:{l:"Activo",c:"#22c55e"},pausado:{l:"Pausado",c:"#f59e0b"},baja:{l:"Baja",c:"#ef4444"}};
var OBJ=["Pérdida de peso","Ganancia muscular","Tonificación","Rendimiento","Rehabilitación","Salud general"];
var EX=["Press Banca","Globe Squat","Peso Muerto","Hip-Thrust","Press Hombro","Remo","Jalón"];
var EXC=["#3b82f6","#22c55e","#a78bfa","#ec4899","#f59e0b","#06b6d4","#f97316"];
var FR=[{v:"baja",l:"Baja",i:"🤕",c:"#f59e0b"},{v:"op",l:"Operación",i:"🏥",c:"#ef4444"},{v:"vac",l:"Vacaciones",i:"✈️",c:"#3b82f6"},{v:"padre",l:"Padre/madre",i:"👶",c:"#ec4899"},{v:"sin",l:"Sin venir",i:"⏰",c:"#f97316"},{v:"les",l:"Lesión",i:"🩹",c:"#a78bfa"},{v:"otro",l:"Otro",i:"📋",c:"#64748b"}];
var LS=[{v:"nada",l:"Nada",c:"#94a3b8",i:"⚪"},{v:"negociacion",l:"En Negociación",c:"#f59e0b",i:"🔄"},{v:"prueba",l:"Entreno de Prueba",c:"#a78bfa",i:"🏋️"},{v:"alta",l:"Alta",c:"#22c55e",i:"✅"},{v:"perdido",l:"Perdido",c:"#ef4444",i:"❌"}];
var gid=function(){return Math.random().toString(36).substr(2,9);};
var eEx=function(){return EX.map(function(n){return{name:n,records:[]};});};
var cV=function(s,w,r){var a=+s,b=+w,c=+r;return(a&&b&&c)?a*b*c:null;};
var cS=function(s,w,r){var a=+s,b=+w,c=+r;return(a&&b&&c)?+((a*a*b*Math.log(c+1))/100).toFixed(2):null;};
var ini=function(c){return c.name.split(" ").map(function(n){return n[0];}).slice(0,2).join("");};

export default function App(){
  var _=useState;
  var c_=_([]),cl=c_[0],setCl=c_[1];
  var s_=_(""),sr=s_[0],setSr=s_[1];
  var f_=_("todos"),fs=f_[0],setFs=f_[1];
  var sl_=_(null),sel=sl_[0],setSel=sl_[1];
  var sa_=_(false),sA=sa_[0],setSA=sa_[1];
  var se_=_(false),sE=se_[0],setSE=se_[1];
  var fm_=_({}),fm=fm_[0],setFm=fm_[1];
  var ef_=_({ei:0,date:"",series:"",weight:"",reps:"",notes:""}),ef=ef_[0],setEf=ef_[1];
  var t_=_("perfil"),tab=t_[0],setTab=t_[1];
  var et_=_(0),et=et_[0],setEt=et_[1];
  var l_=_(false),ld=l_[0],setLd=l_[1];
  var mv_=_("panel"),mv=mv_[0],setMv=mv_[1];
  var fu_=_([]),fu=fu_[0],setFu=fu_[1];
  var sf_=_(false),sFu=sf_[0],setSFu=sf_[1];
  var ff_=_({cn:"",reason:"baja",date:"",msg:""}),ff=ff_[0],setFf=ff_[1];
  var fuf_=_("pendientes"),fuf=fuf_[0],setFuf=fuf_[1];
  var le_=_([]),le=le_[0],setLe=le_[1];
  var sl2_=_(false),sL=sl2_[0],setSL=sl2_[1];
  var lf_=_({name:"",phone:"",source:"",interest:"",status:"nada",contactDate:"",month:"",year:""}),lf=lf_[0],setLf=lf_[1];
  var lfl_=_("activos"),lfl=lfl_[0],setLfl=lfl_[1];
  var lyear_=_("todos"),lyear=lyear_[0],setLyear=lyear_[1];
  var lmonth_=_("todos"),lmonth=lmonth_[0],setLmonth=lmonth_[1];

  useEffect(function(){
    dbGet("clients").then(function(rows){
      if(rows && rows.length > 0) setCl(rows.map(function(r){ return r.data; }));
      setLd(true);
    }).catch(function(){ setLd(true); });
    dbGet("followups").then(function(rows){
      if(rows && rows.length > 0) setFu(rows.map(function(r){ return r.data; }));
    }).catch(function(){});
    dbGet("leads").then(function(rows){
      if(rows && rows.length > 0) setLe(rows.map(function(r){ return r.data; }));
    }).catch(function(){});
  },[]);

  function saveClient(c){ dbSave("clients", c.id, c).catch(function(){}); }
  function deleteClient(id){ dbDel("clients", id).catch(function(){}); }
  function saveFu(f){ dbSave("followups", f.id, f).catch(function(){}); }
  function deleteFu(id){ dbDel("followups", id).catch(function(){}); }
  function saveLead(l){ dbSave("leads", l.id, l).catch(function(){}); }
  function deleteLead(id){ dbDel("leads", id).catch(function(){}); }

  var td=new Date().toISOString().split("T")[0];
  var pc=fu.filter(function(f){return!f.done&&f.date<=td;}).length;
  var sv=function(fn){
    setCl(function(p){
      var next = fn(p);
      next.forEach(function(c){
        var old = p.find(function(x){ return x.id === c.id; });
        if(!old || JSON.stringify(old) !== JSON.stringify(c)) saveClient(c);
      });
      return next;
    });
  };
  var fi=cl.filter(function(c){return c.name.toLowerCase().indexOf(sr.toLowerCase())>=0;});
  var cn={t:cl.length,a:cl.filter(function(c){return c.status==="activo";}).length,p:cl.filter(function(c){return c.status==="pausado";}).length,b:cl.filter(function(c){return c.status==="baja";}).length};
  var sx=sel?(sel.exercises||eEx()):eEx();
  var B={background:"#141820",borderRadius:14,border:"1px solid #1e2330",overflow:"hidden"};
  var iS={width:"100%",padding:"9px 12px",background:"#0d1017",border:"1px solid #2a2f3a",borderRadius:9,color:"#e2e8f0",fontSize:13,outline:"none",boxSizing:"border-box"};

  if(!ld)return <div style={{minHeight:"100vh",background:"#0a0d14",display:"flex",alignItems:"center",justifyContent:"center",color:"#6366f1",flexDirection:"column",gap:12}}><div style={{width:40,height:40,borderRadius:10,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>⚡</div>Cargando FitCRM...</div>;

  return(<div style={{minHeight:"100vh",background:"#0a0d14",color:"#e2e8f0",fontFamily:"'DM Sans',sans-serif"}}>
  <div style={{background:"linear-gradient(135deg,#12082a,#0a0d14)",borderBottom:"1px solid #1e2330",position:"sticky",top:0,zIndex:50}}>
  <div style={{maxWidth:1100,margin:"0 auto",padding:"0 20px"}}>
  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",height:56}}>
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      <div style={{width:34,height:34,borderRadius:9,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>⚡</div>
      <span style={{fontSize:19,fontWeight:800}}>FitCRM</span>
    </div>
    <div style={{display:"flex",gap:8}}>
      <button onClick={function(){setMv("seguimiento");}} style={{position:"relative",width:36,height:36,borderRadius:9,background:pc>0?"rgba(245,158,11,.1)":"#1e2330",border:"1px solid #2a2f3a",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:16}}>🔔{pc>0&&<span style={{position:"absolute",top:-4,right:-4,width:16,height:16,borderRadius:8,background:"#ef4444",color:"#fff",fontSize:9,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>{pc}</span>}</button>
      <button onClick={function(){setFm({});setSA(true);}} style={{padding:"8px 16px",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",borderRadius:9,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Cliente</button>
    </div>
  </div>
  <div style={{display:"flex"}}>{[["panel","👥 Clientes"],["clientes","📊 Fichas"],["seguimiento","📋 Seguim."],["leads","🎯 Leads"]].map(function(x){return<button key={x[0]} onClick={function(){setMv(x[0]);}} style={{padding:"9px 14px",border:"none",borderBottom:mv===x[0]?"2px solid #6366f1":"2px solid transparent",background:mv===x[0]?"rgba(99,102,241,.08)":"transparent",color:mv===x[0]?"#e2e8f0":"#64748b",fontSize:11,fontWeight:600,cursor:"pointer"}}>{x[1]}</button>;})}</div>
  </div></div>

  <div style={{maxWidth:1100,margin:"0 auto",padding:"20px"}}>

  {mv==="panel"&&<div>
    <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:24}}>
      {[["Total",cn.t,"#e2e8f0"],["Activos",cn.a,"#22c55e"],["Pausados",cn.p,"#f59e0b"],["Baja",cn.b,"#ef4444"]].map(function(x){return<div key={x[0]} style={{background:"#141820",borderRadius:14,padding:"18px 22px",border:"1px solid #1e2330",flex:"1 1 120px",minWidth:120}}><div style={{fontSize:28,fontWeight:900,color:x[2]}}>{x[1]}</div><div style={{fontSize:10,color:"#8892a4",marginTop:4,fontWeight:600,textTransform:"uppercase"}}>{x[0]}</div></div>;})}
    </div>
    <div style={{display:"flex",gap:6,marginBottom:16}}>
      {[["todos","Todos",cn.t],["activo","Activos",cn.a],["pausado","Pausados",cn.p],["baja","Baja",cn.b]].map(function(x){return<button key={x[0]} onClick={function(){setFs(x[0]);}} style={{padding:"7px 14px",borderRadius:9,border:fs===x[0]?"1px solid #6366f1":"1px solid #2a2f3a",background:fs===x[0]?"rgba(99,102,241,.1)":"transparent",color:fs===x[0]?"#e2e8f0":"#64748b",fontSize:11,fontWeight:600,cursor:"pointer"}}>{x[1]}({x[2]})</button>;})}
    </div>
    <div style={B}>{(function(){var ls=cl;if(fs!=="todos")ls=ls.filter(function(c){return c.status===fs;});if(!ls.length)return<div style={{padding:40,textAlign:"center",color:"#475569"}}>Sin clientes</div>;return ls.map(function(c){var s=ST[c.status]||ST.activo;return<div key={c.id} onClick={function(){setSel(c);setTab("perfil");setMv("clientes");}} style={{padding:"12px 18px",borderBottom:"1px solid #1e2330",display:"flex",alignItems:"center",gap:12,cursor:"pointer"}}><div style={{width:36,height:36,borderRadius:9,background:s.c+"15",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:s.c}}>{ini(c)}</div><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</div><div style={{fontSize:10,color:"#64748b"}}>{c.objective}</div></div><select value={c.status} onClick={function(e){e.stopPropagation();}} onChange={function(e){var v=e.target.value;sv(function(p){return p.map(function(x){return x.id===c.id?Object.assign({},x,{status:v}):x;});});}} style={{padding:"4px 8px",background:s.c+"10",border:"1px solid "+s.c+"25",borderRadius:7,color:s.c,fontSize:10,fontWeight:600,outline:"none"}}>{Object.entries(ST).map(function(e){return<option key={e[0]} value={e[0]}>{e[1].l}</option>;})}</select><button onClick={function(e){e.stopPropagation();if(confirm("¿Eliminar DEFINITIVAMENTE a "+c.name+"? Esta acción no se puede deshacer.")){setCl(function(p){return p.filter(function(x){return x.id!==c.id;});});deleteClient(c.id);if(sel&&sel.id===c.id)setSel(null);}}} style={{padding:"6px 10px",background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",borderRadius:7,color:"#ef4444",fontSize:11,cursor:"pointer",fontWeight:600,flexShrink:0}}>🗑️</button></div>;});})()}</div>
  </div>}

  {mv==="clientes"&&<div>
    <div style={{marginBottom:18,position:"relative",maxWidth:400}}>
      <input placeholder="🔍 Buscar cliente..." value={sr} onChange={function(e){setSr(e.target.value);}} style={Object.assign({},iS,{padding:"11px 14px"})}/>
      {sr.length>0&&<div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:100,marginTop:4,background:"#141820",borderRadius:11,border:"1px solid #2a2f3a",maxHeight:240,overflowY:"auto"}}>
        {fi.length===0?<div style={{padding:16,textAlign:"center",color:"#64748b",fontSize:12}}>Sin resultados</div>
        :fi.slice(0,6).map(function(c){var s=ST[c.status]||ST.activo;return<div key={c.id} onClick={function(){setSel(c);setSr("");setTab("perfil");}} style={{padding:"10px 14px",borderBottom:"1px solid #1e2330",display:"flex",alignItems:"center",gap:9,cursor:"pointer"}}><div style={{width:30,height:30,borderRadius:8,background:s.c+"15",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:s.c}}>{ini(c)}</div><div style={{flex:1,fontSize:12,fontWeight:600}}>{c.name}</div></div>;})}
      </div>}
    </div>
    {sel?<div style={B}>
      <div style={{padding:"18px 20px 14px",borderBottom:"1px solid #1e2330"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:46,height:46,borderRadius:12,background:(ST[sel.status]||ST.activo).c+"15",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:800,color:(ST[sel.status]||ST.activo).c}}>{ini(sel)}</div>
          <div><h2 style={{margin:0,fontSize:18,fontWeight:700}}>{sel.name}</h2><div style={{fontSize:11,color:"#64748b"}}>{sel.age?sel.age+"a":""}{sel.objective?" · "+sel.objective:""}{sel.level?" · "+sel.level:""}</div></div>
        </div>
        <button onClick={function(){setEf({ei:et,date:td,series:"",weight:"",reps:"",notes:""});setSE(true);}} style={{marginTop:12,padding:"6px 14px",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",borderRadius:8,color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer"}}>🏋️ Marca</button>
      </div>
      <div style={{display:"flex",borderBottom:"1px solid #1e2330"}}>{[["perfil","👤 Perfil"],["ex","🏋️ Marcas"]].map(function(t){return<button key={t[0]} onClick={function(){setTab(t[0]);}} style={{flex:1,padding:"11px",background:"transparent",border:"none",borderBottom:tab===t[0]?"2px solid #6366f1":"2px solid transparent",color:tab===t[0]?"#e2e8f0":"#64748b",fontSize:12,fontWeight:600,cursor:"pointer"}}>{t[1]}</button>;})}</div>
      <div style={{padding:20}}>
        {tab==="perfil"&&<div>
          <div style={{marginBottom:14}}><label style={{fontSize:11,color:"#8892a4",fontWeight:600,display:"block",marginBottom:5}}>EDAD</label><input type="number" value={sel.age||""} onChange={function(e){var v=e.target.value;setSel(function(p){return Object.assign({},p,{age:v});});sv(function(p){return p.map(function(c){return c.id===sel.id?Object.assign({},c,{age:v}):c;});});}} style={{width:100,padding:"9px 12px",background:"#0d1017",border:"1px solid #2a2f3a",borderRadius:9,color:"#e2e8f0",fontSize:14,outline:"none"}}/></div>
          <div style={{marginBottom:14}}><label style={{fontSize:11,color:"#8892a4",fontWeight:600,display:"block",marginBottom:5}}>OBJETIVO</label><select value={sel.objective||""} onChange={function(e){var v=e.target.value;setSel(function(p){return Object.assign({},p,{objective:v});});sv(function(p){return p.map(function(c){return c.id===sel.id?Object.assign({},c,{objective:v}):c;});});}} style={iS}><option value="">—</option>{OBJ.map(function(o){return<option key={o} value={o}>{o}</option>;})}</select></div>
          <div style={{marginBottom:16}}><label style={{fontSize:11,color:"#8892a4",fontWeight:600,display:"block",marginBottom:8}}>CONDICIÓN FÍSICA</label><div style={{display:"flex",gap:8}}>{[["principiante","Principiante","🌱","#38bdf8"],["medio","Medio","💪","#f59e0b"],["avanzado","Avanzado","🔥","#ef4444"]].map(function(lv){return<button key={lv[0]} onClick={function(){setSel(function(p){return Object.assign({},p,{level:lv[0]});});sv(function(p){return p.map(function(c){return c.id===sel.id?Object.assign({},c,{level:lv[0]}):c;});});}} style={{flex:1,padding:"12px 6px",borderRadius:11,border:sel.level===lv[0]?"2px solid "+lv[3]:"2px solid #2a2f3a",background:sel.level===lv[0]?lv[3]+"10":"transparent",cursor:"pointer",textAlign:"center"}}><div style={{fontSize:24,marginBottom:3}}>{lv[2]}</div><div style={{fontSize:10,fontWeight:700,color:sel.level===lv[0]?lv[3]:"#64748b"}}>{lv[1]}</div></button>;})}</div></div>
          <div><label style={{fontSize:11,color:"#8892a4",fontWeight:600,display:"block",marginBottom:5}}>OBSERVACIONES</label><textarea value={sel.observations||""} onChange={function(e){var v=e.target.value;setSel(function(p){return Object.assign({},p,{observations:v});});sv(function(p){return p.map(function(c){return c.id===sel.id?Object.assign({},c,{observations:v}):c;});});}} style={{width:"100%",minHeight:60,padding:10,background:"#0d1017",border:"1px solid #2a2f3a",borderRadius:9,color:"#e2e8f0",fontSize:13,outline:"none",resize:"vertical",fontFamily:"inherit",boxSizing:"border-box"}}/></div>
        </div>}
        {tab==="ex"&&<div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>{EX.map(function(x,i){var icons=["🏋️","🦵","💪","🍑","🏋️","💪","🏋️"];return<button key={i} onClick={function(){setEt(i);}} style={{padding:"10px 16px",borderRadius:10,border:et===i?"2px solid "+EXC[i]:"2px solid #2a2f3a",background:et===i?EXC[i]+"15":"#0d1017",color:et===i?EXC[i]:"#64748b",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:16}}>{icons[i]}</span>{EX[i]}</button>;})}</div>
          <h3 style={{margin:"0 0 12px",fontSize:18,fontWeight:800,color:EXC[et]}}>{EX[et]}</h3>
          <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead><tr style={{borderBottom:"1px solid #2a2f3a"}}>{["#","Fecha","S","Peso","R","Vol","Score","Δ%"].map(function(h){return<th key={h} style={{padding:"7px 5px",textAlign:"left",color:"#64748b",fontWeight:600,fontSize:9}}>{h}</th>;})}</tr></thead>
            <tbody>{(!sx[et]||!sx[et].records||sx[et].records.length===0)?<tr><td colSpan={8} style={{padding:20,textAlign:"center",color:"#475569"}}>Sin registros</td></tr>
            :sx[et].records.map(function(r,ri){var vol=cV(r.series,r.weight,r.reps),sc=cS(r.series,r.weight,r.reps),d=null;if(ri>0){var pr=sx[et].records[ri-1],ps=cS(pr.series,pr.weight,pr.reps);if(ps&&sc)d=((sc/ps)-1)*100;}
              return<tr key={ri} style={{borderBottom:"1px solid #1e2330"}}><td style={{padding:"7px 5px",color:"#8892a4"}}>{ri+1}</td><td style={{padding:"7px 5px"}}>{r.date}</td><td style={{padding:"7px 5px"}}>{r.series}</td><td style={{padding:"7px 5px",color:EXC[et],fontWeight:700}}>{r.weight}</td><td style={{padding:"7px 5px"}}>{r.reps}</td><td style={{padding:"7px 5px",color:"#94a3b8"}}>{vol?vol.toFixed(0):"-"}</td><td style={{padding:"7px 5px",color:"#a78bfa",fontWeight:600}}>{sc||"-"}</td><td style={{padding:"7px 5px",color:d===null?"#475569":d>=0?"#22c55e":"#ef4444",fontWeight:600}}>{d!==null?(d>=0?"+":"")+d.toFixed(1)+"%":"—"}</td></tr>;})}</tbody>
          </table></div>
        </div>}
      </div>
    </div>:<div style={{background:"#141820",borderRadius:14,border:"1px solid #1e2330",padding:50,textAlign:"center",color:"#475569"}}>🔍 Busca un cliente</div>}
  </div>}

  {mv==="seguimiento"&&<div>
    <div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}><h2 style={{margin:0,fontSize:20,fontWeight:800}}>📋 Seguimiento</h2><button onClick={function(){setFf({cn:"",reason:"baja",date:td,msg:""});setSFu(true);}} style={{padding:"8px 16px",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",borderRadius:9,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Nuevo</button></div>
    <div style={{display:"flex",gap:5,marginBottom:14}}>{[["pendientes","Pend."],["hoy","Hoy"],["todos","Todos"]].map(function(x){var n=x[0]==="pendientes"?fu.filter(function(f){return!f.done;}).length:x[0]==="hoy"?fu.filter(function(f){return!f.done&&f.date<=td;}).length:fu.length;return<button key={x[0]} onClick={function(){setFuf(x[0]);}} style={{padding:"7px 14px",borderRadius:9,border:fuf===x[0]?"1px solid #6366f1":"1px solid #2a2f3a",background:fuf===x[0]?"rgba(99,102,241,.1)":"transparent",color:fuf===x[0]?"#e2e8f0":"#64748b",fontSize:11,fontWeight:600,cursor:"pointer"}}>{x[1]}({n})</button>;})}</div>
    <div style={B}>{(function(){var ls=fu.slice();if(fuf==="pendientes")ls=ls.filter(function(f){return!f.done;});else if(fuf==="hoy")ls=ls.filter(function(f){return!f.done&&f.date<=td;});ls.sort(function(a,b){return a.date<b.date?-1:1;});if(!ls.length)return<div style={{padding:40,textAlign:"center",color:"#475569"}}>Sin seguimientos</div>;return ls.map(function(f){var r=FR.find(function(x){return x.v===f.reason;})||FR[6];var ov=!f.done&&f.date<td,it=f.date===td;return<div key={f.id} style={{padding:"12px 18px",borderBottom:"1px solid #1e2330",display:"flex",alignItems:"center",gap:10,opacity:f.done?0.45:1}}><button onClick={function(){var u=Object.assign({},f,{done:!f.done});setFu(function(p){return p.map(function(x){return x.id===f.id?u:x;});});saveFu(u);}} style={{width:20,height:20,borderRadius:6,border:f.done?"2px solid #22c55e":"2px solid #2a2f3a",background:f.done?"#22c55e":"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:10,color:"#fff"}}>{f.done?"✓":""}</button><span style={{fontSize:18}}>{r.i}</span><div style={{flex:1,minWidth:0}}><span style={{fontSize:13,fontWeight:700,textDecoration:f.done?"line-through":"none"}}>{f.clientName}</span> <span style={{fontSize:9,padding:"2px 6px",borderRadius:5,background:r.c+"15",color:r.c,fontWeight:600}}>{r.l}</span>{f.message&&<div style={{fontSize:10,color:"#94a3b8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.message}</div>}</div><div style={{textAlign:"right"}}><div style={{fontSize:11,fontWeight:700,color:f.done?"#64748b":ov?"#ef4444":it?"#f59e0b":"#64748b"}}>{f.date}</div><div style={{fontSize:9,color:f.done?"#475569":ov?"#ef4444":it?"#f59e0b":"#475569",fontWeight:600}}>{f.done?"Hecho":ov?"⚠️Pasado":it?"📌HOY":"Prog."}</div></div><button onClick={function(){setFu(function(p){return p.filter(function(x){return x.id!==f.id;});});deleteFu(f.id);}} style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:12}}>🗑️</button></div>;});})()}</div>
  </div>}

  {mv==="leads"&&<div>
    <div style={{display:"flex",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:10}}><h2 style={{margin:0,fontSize:20,fontWeight:800}}>🎯 Leads</h2><button onClick={function(){setLf({name:"",phone:"",source:"",interest:"",status:"nada",contactDate:"",month:["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"][new Date().getMonth()],year:String(new Date().getFullYear())});setSL(true);}} style={{padding:"8px 16px",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",borderRadius:9,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Lead</button></div>

    {/* Year filter */}
    <div style={{marginBottom:10}}>
      <div style={{fontSize:10,color:"#8892a4",fontWeight:600,textTransform:"uppercase",marginBottom:6}}>Año</div>
      <div style={{display:"flex",gap:5}}>{(function(){var years=["todos"];le.forEach(function(l){if(l.year&&years.indexOf(l.year)===-1)years.push(l.year);});years.sort();return years.map(function(y){var n=y==="todos"?le.length:le.filter(function(l){return l.year===y;}).length;return<button key={y} onClick={function(){setLyear(y);setLmonth("todos");}} style={{padding:"6px 14px",borderRadius:8,border:lyear===y?"1px solid #6366f1":"1px solid #1e2330",background:lyear===y?"rgba(99,102,241,.1)":"transparent",color:lyear===y?"#e2e8f0":"#64748b",fontSize:11,fontWeight:600,cursor:"pointer"}}>{y==="todos"?"Todos":y} ({n})</button>;});})()}</div>
    </div>

    {/* Month filter */}
    {lyear!=="todos"&&<div style={{marginBottom:10}}>
      <div style={{fontSize:10,color:"#8892a4",fontWeight:600,textTransform:"uppercase",marginBottom:6}}>Mes</div>
      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{(function(){var months=["todos"];var order=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];le.forEach(function(l){if(l.year===lyear&&l.month&&months.indexOf(l.month)===-1)months.push(l.month);});months.sort(function(a,b){if(a==="todos")return-1;if(b==="todos")return 1;return order.indexOf(a)-order.indexOf(b);});return months.map(function(m){var n=m==="todos"?le.filter(function(l){return l.year===lyear;}).length:le.filter(function(l){return l.year===lyear&&l.month===m;}).length;return<button key={m} onClick={function(){setLmonth(m);}} style={{padding:"5px 12px",borderRadius:8,border:lmonth===m?"1px solid #a78bfa":"1px solid #1e2330",background:lmonth===m?"rgba(167,139,250,.1)":"transparent",color:lmonth===m?"#a78bfa":"#64748b",fontSize:10,fontWeight:600,cursor:"pointer"}}>{m==="todos"?"Todos":m} ({n})</button>;});})()}</div>
    </div>}

    {/* Status filter */}
    <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:14}}>{LS.map(function(st){var c=le.filter(function(l){return l.status===st.v;}).length;return<button key={st.v} onClick={function(){setLfl(st.v);}} style={{padding:"5px 10px",borderRadius:8,border:lfl===st.v?"1px solid "+st.c:"1px solid #1e2330",background:lfl===st.v?st.c+"12":"transparent",color:lfl===st.v?st.c:"#94a3b8",fontSize:10,fontWeight:600,cursor:"pointer"}}>{st.i}{c}</button>;})} <button onClick={function(){setLfl("activos");}} style={{padding:"5px 10px",borderRadius:8,border:lfl==="activos"?"1px solid #6366f1":"1px solid #1e2330",color:lfl==="activos"?"#e2e8f0":"#64748b",background:lfl==="activos"?"rgba(99,102,241,.1)":"transparent",fontSize:10,fontWeight:600,cursor:"pointer"}}>Activos</button></div>

    {/* Leads list */}
    <div style={B}>{(function(){var ls=le.slice();if(lyear!=="todos")ls=ls.filter(function(l){return l.year===lyear;});if(lmonth!=="todos")ls=ls.filter(function(l){return l.month===lmonth;});if(lfl==="activos")ls=ls.filter(function(l){return l.status!=="alta"&&l.status!=="perdido";});else ls=ls.filter(function(l){return l.status===lfl;});if(!ls.length)return<div style={{padding:40,textAlign:"center",color:"#475569"}}>{le.length===0?"Añade tu primer lead":"Sin leads con estos filtros"}</div>;return ls.map(function(l){var st=LS.find(function(x){return x.v===l.status;})||LS[0];var isAlta=l.status==="alta";return<div key={l.id} style={{padding:"12px 18px",borderBottom:isAlta?"1px solid rgba(34,197,94,.15)":"1px solid #1e2330",display:"flex",alignItems:"center",gap:10,background:isAlta?"rgba(34,197,94,.08)":"transparent"}}><span style={{fontSize:18}}>{st.i}</span><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:700,color:isAlta?"#22c55e":"#e2e8f0"}}>{l.name}{l.source?<span style={{fontSize:9,padding:"2px 5px",borderRadius:5,background:isAlta?"rgba(34,197,94,.15)":"#1e2330",color:isAlta?"#22c55e":"#94a3b8",marginLeft:6}}>{l.source}</span>:null}{l.month?<span style={{fontSize:9,padding:"2px 5px",borderRadius:5,background:"#0d1017",color:"#64748b",marginLeft:4}}>{l.month} {l.year}</span>:null}</div><div style={{display:"flex",gap:10,fontSize:10,color:"#64748b"}}>{l.phone&&<span>📱 {l.phone}</span>}{l.contactDate&&<span>📅 {l.contactDate}</span>}{l.responsable&&<span>👤 {l.responsable}</span>}</div>{l.notes&&<div style={{fontSize:10,color:"#475569",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:400}}>{l.notes}</div>}</div><select value={l.status} onChange={function(e){var v=e.target.value;var u=Object.assign({},l,{status:v});setLe(function(p){return p.map(function(x){return x.id===l.id?u:x;});});saveLead(u);}} style={{padding:"4px 6px",background:st.c+"10",border:"1px solid "+st.c+"25",borderRadius:7,color:st.c,fontSize:9,fontWeight:600,outline:"none"}}>{LS.map(function(x){return<option key={x.v} value={x.v}>{x.i} {x.l}</option>;})}</select><button onClick={function(){setLe(function(p){return p.filter(function(x){return x.id!==l.id;});});deleteLead(l.id);}} style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:12}}>🗑️</button></div>;});})()}</div>
  </div>}

  </div>

  {sA&&<div onClick={function(){setSA(false);}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}><div onClick={function(e){e.stopPropagation();}} style={{background:"#141820",borderRadius:16,padding:24,width:"90%",maxWidth:460,border:"1px solid #2a2f3a"}}><h2 style={{margin:"0 0 16px",fontSize:17,fontWeight:700}}>➕ Nuevo Cliente</h2><div style={{marginBottom:10}}><label style={{fontSize:11,color:"#8892a4",display:"block",marginBottom:4,fontWeight:600}}>NOMBRE</label><input value={fm.name||""} onChange={function(e){setFm(Object.assign({},fm,{name:e.target.value}));}} style={iS}/></div><div style={{marginBottom:10}}><label style={{fontSize:11,color:"#8892a4",display:"block",marginBottom:4,fontWeight:600}}>TELÉFONO</label><input value={fm.phone||""} onChange={function(e){setFm(Object.assign({},fm,{phone:e.target.value}));}} style={iS}/></div><div style={{display:"flex",gap:8}}><button onClick={function(){setSA(false);}} style={{flex:1,padding:10,background:"#1e2330",border:"1px solid #2a2f3a",borderRadius:9,color:"#94a3b8",fontSize:12,fontWeight:600,cursor:"pointer"}}>Cancelar</button><button onClick={function(){if(!fm.name)return;var nc=Object.assign({id:gid(),status:"activo",objective:OBJ[0],exercises:eEx(),observations:"",age:"",level:""},fm);setCl(function(p){return[nc].concat(p);});saveClient(nc);setSA(false);setFm({});}} style={{flex:1,padding:10,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",borderRadius:9,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>Añadir</button></div></div></div>}

  {sE&&<div onClick={function(){setSE(false);}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}><div onClick={function(e){e.stopPropagation();}} style={{background:"#141820",borderRadius:16,padding:24,width:"90%",maxWidth:460,border:"1px solid #2a2f3a"}}><h2 style={{margin:"0 0 14px",fontSize:17,fontWeight:700}}>🏋️ Marca - {sel?sel.name:""}</h2><div style={{marginBottom:10}}><label style={{fontSize:11,color:"#8892a4",display:"block",marginBottom:4,fontWeight:600}}>EJERCICIO</label><select value={ef.ei} onChange={function(e){setEf(Object.assign({},ef,{ei:+e.target.value}));}} style={iS}>{EX.map(function(x,i){return<option key={i} value={i}>{x}</option>;})}</select></div><div style={{marginBottom:10}}><label style={{fontSize:11,color:"#8892a4",display:"block",marginBottom:4,fontWeight:600}}>FECHA</label><input type="date" value={ef.date} onChange={function(e){setEf(Object.assign({},ef,{date:e.target.value}));}} style={iS}/></div><div style={{display:"flex",gap:6,marginBottom:10}}><div style={{flex:1}}><label style={{fontSize:11,color:"#8892a4",display:"block",marginBottom:4,fontWeight:600}}>SERIES</label><input type="number" value={ef.series} onChange={function(e){setEf(Object.assign({},ef,{series:e.target.value}));}} placeholder="3" style={iS}/></div><div style={{flex:1}}><label style={{fontSize:11,color:"#8892a4",display:"block",marginBottom:4,fontWeight:600}}>PESO</label><input type="number" value={ef.weight} onChange={function(e){setEf(Object.assign({},ef,{weight:e.target.value}));}} placeholder="40" style={iS}/></div><div style={{flex:1}}><label style={{fontSize:11,color:"#8892a4",display:"block",marginBottom:4,fontWeight:600}}>REPS</label><input type="number" value={ef.reps} onChange={function(e){setEf(Object.assign({},ef,{reps:e.target.value}));}} placeholder="10" style={iS}/></div></div><div style={{display:"flex",gap:8}}><button onClick={function(){setSE(false);}} style={{flex:1,padding:10,background:"#1e2330",border:"1px solid #2a2f3a",borderRadius:9,color:"#94a3b8",fontSize:12,fontWeight:600,cursor:"pointer"}}>Cancelar</button><button onClick={function(){if(!ef.date||!ef.weight)return;var rec={date:ef.date,series:+ef.series||1,weight:+ef.weight,reps:+ef.reps||1,notes:ef.notes||""};var idx=ef.ei;sv(function(p){return p.map(function(c){if(c.id!==sel.id)return c;var exs=(c.exercises||eEx()).slice();exs[idx]=Object.assign({},exs[idx],{records:(exs[idx].records||[]).concat([rec]).sort(function(a,b){return a.date<b.date?-1:1;})});return Object.assign({},c,{exercises:exs});});});setSel(function(p){var exs=(p.exercises||eEx()).slice();exs[idx]=Object.assign({},exs[idx],{records:(exs[idx].records||[]).concat([rec]).sort(function(a,b){return a.date<b.date?-1:1;})});return Object.assign({},p,{exercises:exs});});setSE(false);}} style={{flex:1,padding:10,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",borderRadius:9,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>Guardar</button></div></div></div>}

  {sFu&&<div onClick={function(){setSFu(false);}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}><div onClick={function(e){e.stopPropagation();}} style={{background:"#141820",borderRadius:16,padding:24,width:"90%",maxWidth:460,border:"1px solid #2a2f3a"}}><h2 style={{margin:"0 0 14px",fontSize:17,fontWeight:700}}>📋 Seguimiento</h2><div style={{marginBottom:10}}><label style={{fontSize:11,color:"#8892a4",display:"block",marginBottom:4,fontWeight:600}}>CLIENTE</label><input value={ff.cn} onChange={function(e){setFf(Object.assign({},ff,{cn:e.target.value}));}} style={iS}/></div><div style={{marginBottom:10}}><label style={{fontSize:11,color:"#8892a4",display:"block",marginBottom:4,fontWeight:600}}>MOTIVO</label><select value={ff.reason} onChange={function(e){setFf(Object.assign({},ff,{reason:e.target.value}));}} style={iS}>{FR.map(function(r){return<option key={r.v} value={r.v}>{r.i} {r.l}</option>;})}</select></div><div style={{marginBottom:10}}><label style={{fontSize:11,color:"#8892a4",display:"block",marginBottom:4,fontWeight:600}}>FECHA</label><input type="date" value={ff.date} onChange={function(e){setFf(Object.assign({},ff,{date:e.target.value}));}} style={iS}/></div><div style={{marginBottom:10}}><label style={{fontSize:11,color:"#8892a4",display:"block",marginBottom:4,fontWeight:600}}>MENSAJE</label><textarea value={ff.msg} onChange={function(e){setFf(Object.assign({},ff,{msg:e.target.value}));}} style={{width:"100%",minHeight:50,padding:10,background:"#0d1017",border:"1px solid #2a2f3a",borderRadius:9,color:"#e2e8f0",fontSize:13,outline:"none",resize:"vertical",boxSizing:"border-box"}}/></div><div style={{display:"flex",gap:8}}><button onClick={function(){setSFu(false);}} style={{flex:1,padding:10,background:"#1e2330",border:"1px solid #2a2f3a",borderRadius:9,color:"#94a3b8",fontSize:12,fontWeight:600,cursor:"pointer"}}>Cancelar</button><button onClick={function(){if(!ff.cn||!ff.date)return;var nf={id:gid(),clientName:ff.cn,reason:ff.reason,date:ff.date,message:ff.msg,done:false};setFu(function(p){return p.concat([nf]);});saveFu(nf);setSFu(false);}} style={{flex:1,padding:10,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",borderRadius:9,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>Crear</button></div></div></div>}

  {sL&&<div onClick={function(){setSL(false);}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}><div onClick={function(e){e.stopPropagation();}} style={{background:"#141820",borderRadius:16,padding:24,width:"90%",maxWidth:460,border:"1px solid #2a2f3a"}}><h2 style={{margin:"0 0 14px",fontSize:17,fontWeight:700}}>🎯 Nuevo Lead</h2><div style={{marginBottom:10}}><label style={{fontSize:11,color:"#8892a4",display:"block",marginBottom:4,fontWeight:600}}>NOMBRE</label><input value={lf.name} onChange={function(e){setLf(Object.assign({},lf,{name:e.target.value}));}} style={iS}/></div><div style={{marginBottom:10}}><label style={{fontSize:11,color:"#8892a4",display:"block",marginBottom:4,fontWeight:600}}>TELÉFONO</label><input value={lf.phone} onChange={function(e){setLf(Object.assign({},lf,{phone:e.target.value}));}} style={iS}/></div><div style={{marginBottom:10}}><label style={{fontSize:11,color:"#8892a4",display:"block",marginBottom:4,fontWeight:600}}>ORIGEN</label><input value={lf.source} onChange={function(e){setLf(Object.assign({},lf,{source:e.target.value}));}} placeholder="Instagram, calle, llamada..." style={iS}/></div><div style={{marginBottom:10}}><label style={{fontSize:11,color:"#8892a4",display:"block",marginBottom:4,fontWeight:600}}>FECHA DE CONTACTO</label><input type="date" value={lf.contactDate||""} onChange={function(e){setLf(Object.assign({},lf,{contactDate:e.target.value}));}} style={iS}/></div><div style={{display:"flex",gap:6,marginBottom:10}}><div style={{flex:1}}><label style={{fontSize:11,color:"#8892a4",display:"block",marginBottom:4,fontWeight:600}}>MES</label><select value={lf.month||""} onChange={function(e){setLf(Object.assign({},lf,{month:e.target.value}));}} style={iS}>{["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"].map(function(m){return<option key={m} value={m}>{m}</option>;})}</select></div><div style={{flex:1}}><label style={{fontSize:11,color:"#8892a4",display:"block",marginBottom:4,fontWeight:600}}>AÑO</label><select value={lf.year||""} onChange={function(e){setLf(Object.assign({},lf,{year:e.target.value}));}} style={iS}>{["2025","2026","2027"].map(function(y){return<option key={y} value={y}>{y}</option>;})}</select></div></div><div style={{marginBottom:10}}><label style={{fontSize:11,color:"#8892a4",display:"block",marginBottom:4,fontWeight:600}}>ESTADO DE VENTA</label><select value={lf.status} onChange={function(e){setLf(Object.assign({},lf,{status:e.target.value}));}} style={iS}>{LS.map(function(x){return<option key={x.v} value={x.v}>{x.i} {x.l}</option>;})}</select></div><div style={{marginBottom:10}}><label style={{fontSize:11,color:"#8892a4",display:"block",marginBottom:4,fontWeight:600}}>INTERÉS / NOTAS</label><input value={lf.interest} onChange={function(e){setLf(Object.assign({},lf,{interest:e.target.value}));}} placeholder="Perder peso, ganar fuerza..." style={iS}/></div><div style={{display:"flex",gap:8}}><button onClick={function(){setSL(false);}} style={{flex:1,padding:10,background:"#1e2330",border:"1px solid #2a2f3a",borderRadius:9,color:"#94a3b8",fontSize:12,fontWeight:600,cursor:"pointer"}}>Cancelar</button><button onClick={function(){if(!lf.name)return;var nl=Object.assign({id:gid()},lf);setLe(function(p){return p.concat([nl]);});saveLead(nl);setSL(false);}} style={{flex:1,padding:10,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",borderRadius:9,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>Añadir</button></div></div></div>}

  </div>);
}
