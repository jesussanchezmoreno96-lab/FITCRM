import { useState, useEffect } from "react";

var SUPA_URL = "https://yvzearwbwwthquekqnnk.supabase.co";
var SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2emVhcndid3d0aHF1ZWtxbm5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMTMwNTMsImV4cCI6MjA5MDg4OTA1M30.1BhalulMlEJ3am_D0e8Y3rRyM_qz0VR4_34VNV76FNE";
var TIMP_CENTER = "ebb9a2c0-782e-4d77-b5eb-17d18a1f8949";
var ENTRENADORES = ["Miguel", "Jesús", "Diego", "Marcelo", "Maria Isabel", "Mari Carmen", "Laura"];
var TRAINER_COLORS = {"Miguel":"#3b82f6","Jesús":"#22c55e","Diego":"#06b6d4","Marcelo":"#f59e0b","Maria Isabel":"#a78bfa","Mari Carmen":"#ec4899","Laura":"#f97316"};

function gid(){return Math.random().toString(36).substr(2,9);}
function normName(s){if(!s)return "";return String(s).toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ");}
function matchesName(a,b){var na=normName(a),nb=normName(b);if(!na||!nb)return false;if(na===nb)return true;var wa=na.split(" "),wb=nb.split(" ");if(wa.length<2||wb.length<2)return false;return wa[0]===wb[0]&&wa[1]===wb[1];}
function parseFechaInicio(available_at){if(!available_at)return null;var parts=available_at.split("..");if(parts.length!==2)return null;var d=new Date(parts[0].trim());return isNaN(d)?null:d;}
function parseFechaFin(available_at){if(!available_at)return null;var parts=available_at.split("..");if(parts.length!==2)return null;var d=new Date(parts[1].trim());return isNaN(d)?null:d;}
function formatFecha(d){if(!d)return "";try{return new Date(d).toLocaleDateString("es-ES",{day:"numeric",month:"short",year:"numeric"});}catch(e){return "";}}

function calcEstado(bonosCliente,fechaPrueba){
  var ahora=new Date();
  if(!bonosCliente||bonosCliente.length===0){
    var fechaP=fechaPrueba?new Date(fechaPrueba):null;
    if(fechaP&&(ahora-fechaP)<30*24*60*60*1000)return{estado:"pendiente",razon:"Pendiente de compra",numBonos:0,sigueActivo:false,fechaInicio:null};
    return{estado:"no_convirtio",razon:"No compró bono",numBonos:0,sigueActivo:false,fechaInicio:null};
  }
  var sorted=bonosCliente.slice().sort(function(a,b){return(parseFechaInicio(a.available_at)||0)-(parseFechaInicio(b.available_at)||0);});
  var fechaInicio=parseFechaInicio(sorted[0].available_at);
  var ultimoBono=sorted[sorted.length-1];
  var fechaFinUltimo=parseFechaFin(ultimoBono.available_at);
  var sigueActivo=fechaFinUltimo&&fechaFinUltimo>ahora;
  var trimestrales=sorted.filter(function(b){return(b.caption||"").toLowerCase().includes("trimestral");});
  var mensuales=sorted.filter(function(b){return!(b.caption||"").toLowerCase().includes("trimestral");});
  var fidelizado=false,razon="";
  if(trimestrales.length>=1&&sorted.length>=2){fidelizado=true;razon=trimestrales.length>1?trimestrales.length+" bonos trimestrales":"Trimestral + "+mensuales.length+" mensual"+(mensuales.length!==1?"es":"");}
  else if(trimestrales.length===1&&sorted.length===1){razon="1 trimestral (pendiente renovar)";}
  else if(mensuales.length>=4){fidelizado=true;razon=mensuales.length+" bonos mensuales";}
  else if(mensuales.length>=4){fidelizado=true;razon=mensuales.length+" bonos mensuales";}
  else{razon=mensuales.length+" bono"+(mensuales.length!==1?"s":"")+" mensual"+(mensuales.length!==1?"es":"");}
  var estado=fidelizado?(sigueActivo?"mas90":"inactivo"):"menos90";
  return{estado:estado,razon:razon,numBonos:sorted.length,sigueActivo:sigueActivo,fechaInicio:fechaInicio};
}

export default function Bonus(props){
  var T=props.theme,dk=props.dk,clients=props.clients||[];
  var [tab,setTab]=useState("pruebas");
  var [pruebas,setPruebas]=useState([]);
  var [showForm,setShowForm]=useState(false);
  var [form,setForm]=useState({cliente:"",entrenador:"",fecha:new Date().toISOString().split("T")[0],notas:""});
  var [fidTab,setFidTab]=useState("todos");
  var [searchQ,setSearchQ]=useState("");
  var [loadingTimp,setLoadingTimp]=useState(false);
  var [timpLoaded,setTimpLoaded]=useState(false);
  var [allAutopurchases,setAllAutopurchases]=useState([]);
  var [allSubs,setAllSubs]=useState([]);
  var bonosApp=props.bonos||[];

  useEffect(function(){
    fetch(SUPA_URL+"/rest/v1/bonus_pruebas?select=*",{headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY}})
    .then(function(r){return r.json();}).then(function(r){if(r&&Array.isArray(r)&&r.length>0)setPruebas(r.map(function(x){return x.data;}));}).catch(function(){});
  },[]);

  function loadPruebasTimp(){
    var hoy=new Date();
    var from=new Date(hoy);from.setDate(from.getDate()-7);
    var to=new Date(hoy);to.setDate(to.getDate()+90);
    var fromStr=from.toISOString().split("T")[0];
    var toStr=to.toISOString().split("T")[0];
    fetch("/api/timp?path=branch_buildings/"+TIMP_CENTER+"/admissions%3Fdate_from="+fromStr+"%26date_to="+toStr+"%26page=1")
    .then(function(r){return r.json();}).then(function(d){
      if(!d||!d.collection)return;
      d.collection.forEach(function(a){
        if(a.capacity!==1)return;
        var EXCLUIR_UUIDS=["8b21913c-2d52-40bf-9b25-9ce85c74afcb","7b6d30a5-5c85-462b-ab2c-acd8d7ba54d2"];
        if(EXCLUIR_UUIDS.indexOf(a.activity_uuid)>=0)return;
        var profName=a.professional_name||"";
        var entrenador=ENTRENADORES.find(function(e){return normName(profName).includes(normName(e));});
        if(!entrenador)return;
        (a.bookings||[]).forEach(function(b){
          if(b.status!=="valid")return;
          var fecha=a.starting_at?a.starting_at.substring(0,10):"";
          var clienteNombre=b.full_name;
          setPruebas(function(prev){
            var existente=prev.find(function(p){return matchesName(p.cliente,clienteNombre)&&p.fecha===fecha;});
            if(existente){if(existente.entrenador===entrenador)return prev;var upd=Object.assign({},existente,{entrenador:entrenador});savePrueba(upd);return prev.map(function(p){return p.id===existente.id?upd:p;});} 
            var np={id:gid(),cliente:clienteNombre,entrenador:entrenador,fecha:fecha,notas:"",convirtio:null,origen:"timp",fechaRegistro:new Date().toISOString()};
            savePrueba(np);
            return prev.concat([np]);
          });
        });
      });
    }).catch(function(){});
  }

  function loadTimpData(){
    setLoadingTimp(true);
    var allAutos=[];
    function fetchPage(page){
      return fetch("/api/timp?path=branch_buildings/"+TIMP_CENTER+"/purchases%3Fdate_from=2023-01-01%26date_to=2027-12-31%26page="+page)
      .then(function(r){return r.json();}).then(function(d){
        if(!d||!d.collection)return;
        var ent=d.collection.filter(function(a){if(!a.caption||!a.paid_at||a.removed)return false;var c=a.caption.toLowerCase();return c.includes("time partner")||c.includes("time pro")||c.includes("bono")||c.includes("entrenamiento");});
        allAutos=allAutos.concat(ent);
        var total=d.page_data?d.page_data.total_pages:1;
        if(page<total)return fetchPage(page+1);
      });
    }
    Promise.all([fetchPage(1),fetch("/api/timp?path=branch_buildings/"+TIMP_CENTER+"/subscriptions%3Fpage=1").then(function(r){return r.json();})])
    .then(function(results){
      var subs=results[1]&&results[1].collection?results[1].collection:[];
      setAllAutopurchases(allAutos);setAllSubs(subs);setLoadingTimp(false);setTimpLoaded(true);
    }).catch(function(){setLoadingTimp(false);});
  }

  useEffect(function(){
    if(tab==="pruebas")loadPruebasTimp();
    if(tab==="fidelizacion"&&!timpLoaded)loadTimpData();
  },[tab]);

  function savePrueba(p){fetch(SUPA_URL+"/rest/v1/bonus_pruebas",{method:"POST",headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY,"Content-Type":"application/json","Prefer":"resolution=merge-duplicates"},body:JSON.stringify({id:p.id,data:p,updated_at:new Date().toISOString()})}).catch(function(){});}
  function deletePrueba(id){fetch(SUPA_URL+"/rest/v1/bonus_pruebas?id=eq."+id,{method:"DELETE",headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY}}).catch(function(){});setPruebas(pruebas.filter(function(p){return p.id!==id;}));}

  function addPrueba(){
    if(!form.cliente||!form.entrenador||!form.fecha)return;
    var np={id:gid(),cliente:form.cliente,entrenador:form.entrenador,fecha:form.fecha,notas:form.notas,convirtio:null,origen:"manual",fechaRegistro:new Date().toISOString()};
    setPruebas(pruebas.concat([np]));savePrueba(np);setShowForm(false);
    setForm({cliente:"",entrenador:"",fecha:new Date().toISOString().split("T")[0],notas:""});
  }

  function setConvirtio(id,valor){
    var updated=pruebas.map(function(p){if(p.id===id){var upd=Object.assign({},p,{convirtio:valor});savePrueba(upd);return upd;}return p;});
    setPruebas(updated);
  }

  var statsByTrainer={};
  ENTRENADORES.forEach(function(e){statsByTrainer[e]={pruebas:0,conversiones:0};});
  pruebas.forEach(function(p){if(!statsByTrainer[p.entrenador])return;statsByTrainer[p.entrenador].pruebas++;if(p.convirtio===true)statsByTrainer[p.entrenador].conversiones++;});

  var fidelizacionData=[];
  if(timpLoaded){
    pruebas.forEach(function(p){
      var sub=allSubs.find(function(s){return matchesName(s.full_name,p.cliente);});
      var bonosCliente=sub?allAutopurchases.filter(function(a){return a.suscription_uuid===sub.uuid;}):[];
      if(bonosCliente.length>0&&p.convirtio===null)setConvirtio(p.id,true);
      var resultado=calcEstado(bonosCliente,p.fecha);
      fidelizacionData.push({cliente:p.cliente,entrenador:p.entrenador,fechaPrueba:p.fecha,estado:resultado.estado,razon:resultado.razon,numBonos:resultado.numBonos,sigueActivo:resultado.sigueActivo,fechaInicio:resultado.fechaInicio});
    });
  }

  var totalPendiente=fidelizacionData.filter(function(f){return f.estado==="pendiente";}).length;
  var totalMas90=fidelizacionData.filter(function(f){return f.estado==="mas90";}).length;
  var totalMenos90=fidelizacionData.filter(function(f){return f.estado==="menos90";}).length;
  var totalInactivos=fidelizacionData.filter(function(f){return f.estado==="inactivo";}).length;
  var totalNoConvirtio=fidelizacionData.filter(function(f){return f.estado==="no_convirtio";}).length;

  var fidFiltrada=fidelizacionData.filter(function(f){
    if(fidTab==="pendiente")return f.estado==="pendiente";
    if(fidTab==="mas90")return f.estado==="mas90";
    if(fidTab==="menos90")return f.estado==="menos90";
    if(fidTab==="inactivo")return f.estado==="inactivo";
    if(fidTab==="no_convirtio")return f.estado==="no_convirtio";
    return true;
  }).filter(function(f){return!searchQ||f.cliente.toLowerCase().includes(searchQ.toLowerCase());});

  var estadoConfig={"pendiente":{color:"#f59e0b",badge:"❓ Pendiente",bg:"#f59e0b15"},"mas90":{color:"#22c55e",badge:"+90 días ✅",bg:"#22c55e15"},"menos90":{color:"#ef4444",badge:"-90 días ❌",bg:"#ef444415"},"inactivo":{color:"#94a3b8",badge:"Inactivo 💤",bg:"#94a3b815"},"no_convirtio":{color:"#64748b",badge:"No convirtió ✖️",bg:"#64748b15"}};
  var B={background:T.bg2,borderRadius:14,border:"1px solid "+T.border,overflow:"hidden"};
  var meses=["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"];

  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <h2 style={{margin:0,fontSize:24,fontWeight:800}}>🏆 Bonus</h2>
    </div>
    <div style={{display:"flex",gap:8,marginBottom:20}}>
      <button onClick={function(){setTab("pruebas");}} style={{padding:"10px 18px",borderRadius:10,border:tab==="pruebas"?"2px solid #f59e0b":"2px solid "+T.border,background:tab==="pruebas"?"#f59e0b10":"transparent",color:tab==="pruebas"?"#f59e0b":T.text3,fontSize:13,fontWeight:700,cursor:"pointer"}}>
        🎯 Entrenamientos de Prueba <span style={{marginLeft:8,fontSize:11,padding:"2px 8px",borderRadius:6,background:"#f59e0b20",color:"#f59e0b"}}>{pruebas.length}</span>
      </button>
      <button onClick={function(){setTab("fidelizacion");}} style={{padding:"10px 18px",borderRadius:10,border:tab==="fidelizacion"?"2px solid #22c55e":"2px solid "+T.border,background:tab==="fidelizacion"?"#22c55e10":"transparent",color:tab==="fidelizacion"?"#22c55e":T.text3,fontSize:13,fontWeight:700,cursor:"pointer"}}>
        📅 Fidelización 90 días {timpLoaded&&<span style={{marginLeft:8,fontSize:11,padding:"2px 8px",borderRadius:6,background:"#22c55e20",color:"#22c55e"}}>{totalMas90}/{pruebas.length}</span>}
      </button>
    </div>

    {tab==="pruebas"&&<div>
      {Object.keys(statsByTrainer).some(function(e){return statsByTrainer[e].pruebas>0;})&&<div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:20}}>
        {ENTRENADORES.map(function(e){var s=statsByTrainer[e];if(s.pruebas===0)return null;var pct=Math.round((s.conversiones/s.pruebas)*100);var color=TRAINER_COLORS[e]||"#64748b";var isGood=pct>=60;
          return<div key={e} style={{background:T.bg2,borderRadius:12,border:"1px solid "+T.border,padding:"12px 16px",minWidth:120,flex:"1 1 120px"}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}><div style={{width:8,height:8,borderRadius:4,background:color}}></div><span style={{fontSize:12,fontWeight:700,color:T.text}}>{e}</span></div>
            <div style={{fontSize:24,fontWeight:900,color:isGood?"#22c55e":pct>0?"#f59e0b":T.text3}}>{pct}%</div>
            <div style={{fontSize:10,color:T.text3}}>{s.conversiones}/{s.pruebas} pruebas</div>
            <div style={{marginTop:6,height:4,borderRadius:2,background:T.border,overflow:"hidden"}}><div style={{height:"100%",width:pct+"%",background:isGood?"#22c55e":"#f59e0b",borderRadius:2}}></div></div>
          </div>;})}
      </div>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontSize:11,color:T.text3}}>🔄 Pruebas futuras detectadas automáticamente · Pasadas añádelas manualmente</div>
        <button onClick={function(){setShowForm(true);}} style={{padding:"9px 16px",background:"linear-gradient(135deg,#f59e0b,#d97706)",border:"none",borderRadius:9,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Añadir Manual</button>
      </div>
      <div style={B}>
        {pruebas.length===0&&<div style={{padding:40,textAlign:"center",color:T.text3}}><div style={{fontSize:40,opacity:0.2,marginBottom:10}}>🎯</div><div style={{fontSize:14,fontWeight:600}}>Sin entrenamientos de prueba</div></div>}
        {pruebas.slice().sort(function(a,b){return a.fecha<b.fecha?1:-1;}).map(function(p){
          var color=TRAINER_COLORS[p.entrenador]||"#64748b";
          var partes=p.fecha?p.fecha.split("-"):["","",""];
          var esFutura=p.fecha&&new Date(p.fecha)>new Date();
          return<div key={p.id} style={{padding:"12px 20px",borderBottom:"1px solid "+T.border,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",background:esFutura?(dk?"rgba(59,130,246,.04)":"#eff6ff"):"transparent"}}>
            <div style={{textAlign:"center",minWidth:38}}><div style={{fontSize:17,fontWeight:900,color:T.text}}>{partes[2]}</div><div style={{fontSize:9,color:T.text3,fontWeight:600}}>{meses[parseInt(partes[1])-1]}</div></div>
            <div style={{flex:1,minWidth:140}}>
              <div style={{fontSize:14,fontWeight:700,color:T.text}}>{p.cliente}</div>
              <div style={{display:"flex",alignItems:"center",gap:6,marginTop:2,flexWrap:"wrap"}}>
                <div style={{width:6,height:6,borderRadius:3,background:color}}></div>
                <span style={{fontSize:11,color:color,fontWeight:600}}>{p.entrenador}</span>
                {p.origen==="timp"&&<span style={{fontSize:9,padding:"1px 5px",borderRadius:4,background:"#3b82f615",color:"#3b82f6",fontWeight:600}}>Auto-TIMP</span>}
                {esFutura&&<span style={{fontSize:9,padding:"1px 5px",borderRadius:4,background:"#f59e0b15",color:"#f59e0b",fontWeight:600}}>Próxima</span>}
              </div>
            </div>
            <div style={{display:"flex",gap:6}}>
              <button onClick={function(){setConvirtio(p.id,true);}} style={{padding:"5px 10px",borderRadius:7,border:"none",cursor:"pointer",fontSize:11,fontWeight:700,background:p.convirtio===true?"#22c55e":T.bg3,color:p.convirtio===true?"#fff":T.text3}}>✅ Sí</button>
              <button onClick={function(){setConvirtio(p.id,false);}} style={{padding:"5px 10px",borderRadius:7,border:"none",cursor:"pointer",fontSize:11,fontWeight:700,background:p.convirtio===false?"#ef4444":T.bg3,color:p.convirtio===false?"#fff":T.text3}}>❌ No</button>
              {p.convirtio===null&&<span style={{fontSize:10,color:"#f59e0b",padding:"5px 8px"}}>❓</span>}
            </div>
            <button onClick={function(){if(confirm("¿Eliminar?"))deletePrueba(p.id);}} style={{background:"none",border:"none",color:T.text3,cursor:"pointer",fontSize:13}}>🗑️</button>
          </div>;
        })}
      </div>
    </div>}

    {tab==="fidelizacion"&&<div>
      {loadingTimp&&<div style={{textAlign:"center",padding:60}}><div style={{fontSize:40,opacity:0.2,marginBottom:12}}>🔄</div><div style={{fontSize:14,color:T.text3}}>Cargando historial de bonos desde TIMP...</div></div>}
      {!loadingTimp&&!timpLoaded&&<div style={{textAlign:"center",padding:60}}>
        <div style={{fontSize:40,marginBottom:16}}>📅</div>
        <div style={{fontSize:15,fontWeight:700,color:T.text,marginBottom:8}}>Fidelización desde TIMP</div>
        <div style={{fontSize:12,color:T.text3,marginBottom:24}}>Muestra todos los clientes que han hecho prueba con su estado actual</div>
        <button onClick={loadTimpData} style={{padding:"12px 28px",background:"linear-gradient(135deg,#22c55e,#16a34a)",border:"none",borderRadius:10,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>📊 Cargar Fidelización</button>
      </div>}
      {!loadingTimp&&timpLoaded&&<div>
        <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap"}}>
          {[{label:"❓ Pendiente",val:totalPendiente,color:"#f59e0b"},{label:"+90 días ✅",val:totalMas90,color:"#22c55e"},{label:"-90 días ❌",val:totalMenos90,color:"#ef4444"},{label:"Inactivos 💤",val:totalInactivos,color:"#94a3b8"},{label:"No convirtió",val:totalNoConvirtio,color:"#64748b"}].map(function(s){
            return<div key={s.label} style={{flex:"1 1 100px",background:s.color+"10",borderRadius:12,border:"1px solid "+s.color+"30",padding:"12px 14px",textAlign:"center"}}>
              <div style={{fontSize:24,fontWeight:900,color:s.color}}>{s.val}</div>
              <div style={{fontSize:9,color:s.color,fontWeight:700,marginTop:2}}>{s.label}</div>
            </div>;
          })}
        </div>
        {pruebas.length===0&&<div style={{background:T.bg2,borderRadius:14,border:"1px solid "+T.border,padding:40,textAlign:"center",color:T.text3}}>Añade entrenamientos de prueba para ver la fidelización</div>}
        {pruebas.length>0&&<div>
          <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
            {[["todos","Todos",fidelizacionData.length,T.navy],["pendiente","❓ Pendiente",totalPendiente,"#f59e0b"],["mas90","+90 días",totalMas90,"#22c55e"],["menos90","-90 días",totalMenos90,"#ef4444"],["inactivo","Inactivos",totalInactivos,"#94a3b8"],["no_convirtio","No convirtió",totalNoConvirtio,"#64748b"]].map(function(x){
              return<button key={x[0]} onClick={function(){setFidTab(x[0]);}} style={{padding:"6px 12px",borderRadius:8,border:fidTab===x[0]?"2px solid "+x[3]:"1px solid "+T.border,background:fidTab===x[0]?x[3]+"15":"transparent",color:fidTab===x[0]?x[3]:T.text3,fontSize:11,fontWeight:700,cursor:"pointer"}}>{x[1]} ({x[2]})</button>;
            })}
          </div>
          <div style={{marginBottom:14}}><input placeholder="🔍 Buscar cliente..." value={searchQ} onChange={function(e){setSearchQ(e.target.value);}} style={{width:"100%",padding:"10px 14px",background:T.bg3,border:"1px solid "+T.border2,borderRadius:10,color:T.text,fontSize:13,outline:"none",boxSizing:"border-box"}}/></div>
          <div style={B}>
            {fidFiltrada.length===0&&<div style={{padding:30,textAlign:"center",color:T.text3}}>Sin clientes en este filtro</div>}
            {fidFiltrada.map(function(f,i){
              var cfg=estadoConfig[f.estado]||estadoConfig["pendiente"];
              var tColor=TRAINER_COLORS[f.entrenador]||"#64748b";
              return<div key={i} style={{padding:"13px 20px",borderBottom:"1px solid "+T.border,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                <div style={{width:10,height:10,borderRadius:5,background:cfg.color,flexShrink:0}}></div>
                <div style={{flex:1,minWidth:150}}>
                  <div style={{fontSize:14,fontWeight:700,color:T.text}}>{f.cliente}</div>
                  <div style={{display:"flex",gap:8,marginTop:3,flexWrap:"wrap"}}>
                    <span style={{fontSize:10,color:tColor,fontWeight:600}}>Prueba con {f.entrenador}</span>
                    <span style={{fontSize:10,color:T.text3}}>· {f.fechaPrueba}</span>
                    <span style={{fontSize:10,color:T.text3}}>· {f.razon}</span>
                    {f.fechaInicio&&<span style={{fontSize:10,color:T.text3}}>· Inicio: {formatFecha(f.fechaInicio)}</span>}
                  </div>
                </div>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  {f.numBonos>0&&<span style={{fontSize:10,padding:"3px 8px",borderRadius:6,background:T.bg3,color:T.text3,fontWeight:600}}>{f.numBonos} bonos</span>}
                  <span style={{fontSize:11,padding:"4px 12px",borderRadius:8,background:cfg.bg,color:cfg.color,fontWeight:700}}>{cfg.badge}</span>
                </div>
              </div>;
            })}
          </div>
          <div style={{marginTop:12,display:"flex",justifyContent:"flex-end"}}><button onClick={function(){setTimpLoaded(false);loadTimpData();}} style={{padding:"8px 16px",background:T.bg3,border:"1px solid "+T.border,borderRadius:8,color:T.text3,fontSize:11,fontWeight:600,cursor:"pointer"}}>🔄 Actualizar datos</button></div>
        </div>}
      </div>}
    </div>}

    {showForm&&<div onClick={function(){setShowForm(false);}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
      <div onClick={function(e){e.stopPropagation();}} style={{background:T.bg,borderRadius:16,padding:28,width:"90%",maxWidth:440,border:"1px solid "+T.border2}}>
        <h3 style={{margin:"0 0 20px",fontSize:17,fontWeight:800,color:T.text}}>🎯 Añadir Entrenamiento de Prueba</h3>
        <div style={{marginBottom:14}}><label style={{fontSize:11,color:T.text3,fontWeight:700,display:"block",marginBottom:6}}>CLIENTE</label>
          <input value={form.cliente} onChange={function(e){setForm(Object.assign({},form,{cliente:e.target.value}));}} placeholder="Nombre completo..." style={{width:"100%",padding:"10px 14px",background:T.bg2,border:"1px solid "+T.border2,borderRadius:10,color:T.text,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
          {form.cliente.length>2&&<div style={{background:T.bg2,border:"1px solid "+T.border,borderRadius:8,marginTop:4,maxHeight:140,overflowY:"auto"}}>
            {clients.filter(function(c){return c.name&&c.name.toLowerCase().includes(form.cliente.toLowerCase());}).slice(0,5).map(function(c){return<div key={c.id} onClick={function(){setForm(Object.assign({},form,{cliente:c.name}));}} style={{padding:"8px 12px",cursor:"pointer",fontSize:13,color:T.text,borderBottom:"1px solid "+T.border}}>{c.name}</div>;})}
          </div>}
        </div>
        <div style={{marginBottom:14}}><label style={{fontSize:11,color:T.text3,fontWeight:700,display:"block",marginBottom:6}}>ENTRENADOR</label>
          <select value={form.entrenador} onChange={function(e){setForm(Object.assign({},form,{entrenador:e.target.value}));}} style={{width:"100%",padding:"10px 14px",background:T.bg2,border:"1px solid "+T.border2,borderRadius:10,color:T.text,fontSize:13,outline:"none",boxSizing:"border-box"}}>
            <option value="">Seleccionar entrenador...</option>
            {ENTRENADORES.map(function(e){return<option key={e} value={e}>{e}</option>;})}
          </select>
        </div>
        <div style={{marginBottom:14}}><label style={{fontSize:11,color:T.text3,fontWeight:700,display:"block",marginBottom:6}}>FECHA</label>
          <input type="date" value={form.fecha} onChange={function(e){setForm(Object.assign({},form,{fecha:e.target.value}));}} style={{width:"100%",padding:"10px 14px",background:T.bg2,border:"1px solid "+T.border2,borderRadius:10,color:T.text,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
        </div>
        <div style={{marginBottom:20}}><label style={{fontSize:11,color:T.text3,fontWeight:700,display:"block",marginBottom:6}}>NOTAS (opcional)</label>
          <input value={form.notas} onChange={function(e){setForm(Object.assign({},form,{notas:e.target.value}));}} placeholder="Observaciones..." style={{width:"100%",padding:"10px 14px",background:T.bg2,border:"1px solid "+T.border2,borderRadius:10,color:T.text,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={function(){setShowForm(false);}} style={{flex:1,padding:12,background:T.bg3,border:"1px solid "+T.border,borderRadius:10,color:T.text3,fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancelar</button>
          <button onClick={addPrueba} disabled={!form.cliente||!form.entrenador} style={{flex:1,padding:12,background:"linear-gradient(135deg,#f59e0b,#d97706)",border:"none",borderRadius:10,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",opacity:(!form.cliente||!form.entrenador)?0.5:1}}>Guardar</button>
        </div>
      </div>
    </div>}
  </div>);
}
