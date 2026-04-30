import { useState, useEffect, lazy, Suspense } from "react";
// Lazy loading: cada componente se carga solo cuando se entra en él.
// Esto reduce el tamaño inicial del JS y hace la primera carga mucho más rápida.
// Una vez cargado, queda en memoria y los cambios entre secciones son instantáneos.
const Horarios = lazy(() => import("./Horarios.jsx"));
const Bonus = lazy(() => import("./Bonus.jsx"));
const AIAssistant = lazy(() => import("./AIAssistant.jsx"));
const Dashboard = lazy(() => import("./Dashboard.jsx"));
const Renovaciones = lazy(() => import("./Renovaciones.jsx"));
const Pagos = lazy(() => import("./Pagos.jsx"));
const Cancelaciones = lazy(() => import("./Cancelaciones.jsx"));

var SUPA_URL = "https://yvzearwbwwthquekqnnk.supabase.co";
var SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2emVhcndid3d0aHF1ZWtxbm5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMTMwNTMsImV4cCI6MjA5MDg4OTA1M30.1BhalulMlEJ3am_D0e8Y3rRyM_qz0VR4_34VNV76FNE";

function dbGet(t){return fetch(SUPA_URL+"/rest/v1/"+t+"?select=*",{headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY}}).then(function(r){return r.json();});}
// Fetch puntual de un único registro (para auto-refresh al abrir fichas)
function dbGetOne(t,id){return fetch(SUPA_URL+"/rest/v1/"+t+"?id=eq."+encodeURIComponent(id)+"&select=*",{headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY}}).then(function(r){return r.json();}).then(function(rows){return rows&&rows[0]?rows[0]:null;});}
function dbSave(t,id,d){return fetch(SUPA_URL+"/rest/v1/"+t,{method:"POST",headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY,"Content-Type":"application/json","Prefer":"resolution=merge-duplicates"},body:JSON.stringify({id:id,data:d,updated_at:new Date().toISOString()})});}
function dbDel(t,id){return fetch(SUPA_URL+"/rest/v1/"+t+"?id=eq."+id,{method:"DELETE",headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY}});}

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
  var cl_=_([]),cl=cl_[0],setCl=cl_[1];
  var sr_=_(""),sr=sr_[0],setSr=sr_[1];
  var fs_=_("todos"),fs=fs_[0],setFs=fs_[1];
  var sel_=_(null),sel=sel_[0],setSel=sel_[1];
  var sA_=_(false),sA=sA_[0],setSA=sA_[1];
  var homeAI_=_(false),homeAI=homeAI_[0],setHomeAI=homeAI_[1];
  var sE_=_(false),sE=sE_[0],setSE=sE_[1];
  var fm_=_({}),fm=fm_[0],setFm=fm_[1];
  var ef_=_({ei:0,date:"",series:"",weight:"",reps:"",notes:""}),ef=ef_[0],setEf=ef_[1];
  var tab_=_("perfil"),tab=tab_[0],setTab=tab_[1];
  var et_=_(0),et=et_[0],setEt=et_[1];
  var ld_=_(false),ld=ld_[0],setLd=ld_[1];
  // section: "home" | "entrenamiento" | "nutricion" | "fisio"
  var sec_=_("home"),sec=sec_[0],setSec=sec_[1];
  // mv: sub-view inside entrenamiento
  var mv_=_("clientes"),mv=mv_[0],setMv=mv_[1];
  var fu_=_([]),fu=fu_[0],setFu=fu_[1];
  var sf_=_(false),sFu=sf_[0],setSFu=sf_[1];
  var ff_=_({cn:"",reason:"baja",date:"",msg:""}),ff=ff_[0],setFf=ff_[1];
  var fuf_=_("pendientes"),fuf=fuf_[0],setFuf=fuf_[1];
  var le_=_([]),le=le_[0],setLe=le_[1];
  var sL_=_(false),sL=sL_[0],setSL=sL_[1];
  var lf_=_({name:"",phone:"",source:"",interest:"",status:"nada",contactDate:"",month:"",year:""}),lf=lf_[0],setLf=lf_[1];
  var lfl_=_("activos"),lfl=lfl_[0],setLfl=lfl_[1];
  var ly_=_("todos"),lyear=ly_[0],setLyear=ly_[1];
  var lm_=_("todos"),lmonth=lm_[0],setLmonth=lm_[1];
  // Fisio
  var fis_=_([]),fis=fis_[0],setFis=fis_[1];
  var sFis_=_(false),sFis=sFis_[0],setSFis=sFis_[1];
  var fisF_=_({client:"",date:"",trainDate:"",zones:"",notes:"",plan:""}),fisF=fisF_[0],setFisF=fisF_[1];
  // TIMP
  var timp_=_(null),timpData=timp_[0],setTimpData=timp_[1];
  var timpSync_=_(false),timpSyncing=timpSync_[0],setTimpSyncing=timpSync_[1];
  var timpLast_=_(null),timpLast=timpLast_[0],setTimpLast=timpLast_[1];
  // Bonos TIMP
  var bonos_=_([]),bonos=bonos_[0],setBonos=bonos_[1];
  var renWeek_=_("esta"),renWeek=renWeek_[0],setRenWeek=renWeek_[1];
  var renTicks_=_({}),renTicks=renTicks_[0],setRenTicks=renTicks_[1];
  var renData_=_({}),renData=renData_[0],setRenData=renData_[1];
  // Theme
  var th_=_("dark"),theme=th_[0],setTheme=th_[1];
  var dk=theme==="dark";
  var T={bg:dk?"#1a2140":"#f0f2f5",bg2:dk?"#212a4a":"#ffffff",bg3:dk?"#182038":"#f8f9fa",border:dk?"#2d3660":"#e2e5ea",border2:dk?"#3a4570":"#d0d5dd",text:dk?"#e2e8f0":"#1a1a2e",text2:dk?"#94a3b8":"#64748b",text3:dk?"#7080a0":"#94a3b8",navy:"#394265",navyLight:"#4a5580",white:"#ffffff"};

  useEffect(function(){
    dbGet("clients").then(function(r){if(r&&r.length>0)setCl(r.map(function(x){return x.data;}));setLd(true);}).catch(function(){setLd(true);});
    dbGet("followups").then(function(r){if(r&&r.length>0)setFu(r.map(function(x){return x.data;}));}).catch(function(){});
    dbGet("leads").then(function(r){if(r&&r.length>0)setLe(r.map(function(x){return x.data;}));}).catch(function(){});
    dbGet("fisio_reports").then(function(r){if(r&&r.length>0)setFis(r.map(function(x){return x.data;}));}).catch(function(){});
    dbGet("bonos_timp").then(function(r){if(r&&r.length>0){r.forEach(function(x){if(x.id==="cuotas_vigentes")setBonos(x.data);if(x.id==="renovacion_ticks")setRenTicks(x.data);if(x.id==="renovacion_data")setRenData(x.data);});}}).catch(function(){});
  },[]);

  // ══════════════════════════════════════════════════════════════════════
  //  CACHE LOCAL + AUTO-SYNC
  //  Mejora 1: cache → CRM abre con datos viejos al instante
  //  Mejora 3: bandera "ya sincronizando" → evita llamadas duplicadas
  //  Mejora 5: auto-sync cada 60 segundos
  // ══════════════════════════════════════════════════════════════════════
  var SYNC_INTERVAL_MS = 60 * 1000; // 60 segundos. Subir si hay problemas con TIMP.
  var syncInProgress_=_(false), syncInProgress=syncInProgress_[0], setSyncInProgress=syncInProgress_[1];
  var lastSyncAt_=_(null), lastSyncAt=lastSyncAt_[0], setLastSyncAt=lastSyncAt_[1];
  // Tick cada 30s para refrescar el indicador "hace X segundos" en la UI
  var clockTick_=_(0), clockTick=clockTick_[0], setClockTick=clockTick_[1];
  useEffect(function(){
    var i=setInterval(function(){setClockTick(function(t){return t+1;});},30000);
    return function(){clearInterval(i);};
  },[]);

  // Cargar cache local de TIMP al inicio (datos rápidos)
  useEffect(function(){
    // Inyectar animación spin para el botón refrescar
    if(!document.getElementById("t2t-spin-anim")){
      var st=document.createElement("style");
      st.id="t2t-spin-anim";
      st.innerHTML="@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}";
      document.head.appendChild(st);
    }
    try{
      var cached=localStorage.getItem("t2tcrm_timp_cache");
      if(cached){
        var data=JSON.parse(cached);
        if(data.subs&&Array.isArray(data.subs))setTimpData(data.subs);
        if(data.lastSync)setTimpLast(data.lastSync);
        if(data.lastSyncAt)setLastSyncAt(new Date(data.lastSyncAt));
      }
    }catch(e){console.warn("[cache] No se pudo cargar cache local:",e);}
  },[]);

  // Auto-sync TIMP when clients are loaded (primera vez)
  useEffect(function(){
    if(ld&&cl.length>0&&!timpData){syncTimpSafe();}
  },[ld]);

  // Auto-sync cada 60 segundos mientras el CRM esté abierto
  useEffect(function(){
    if(!ld)return;
    var interval=setInterval(function(){
      if(!syncInProgress&&cl.length>0){syncTimpSafe();syncBonos();}
    },SYNC_INTERVAL_MS);
    return function(){clearInterval(interval);};
  },[ld,cl.length,syncInProgress]);

  // ══════════════════════════════════════════════════════════════════════
  //  BACKUP MANUAL — descarga JSON con todo Supabase
  //  Útil para tener una copia de seguridad puntual antes de cambios
  //  importantes, o para auditoría. Se guarda con la fecha en el nombre.
  // ══════════════════════════════════════════════════════════════════════
  function downloadBackup(){
    var tablas=["clients","leads","followups","fisio_reports","bonos_timp"];
    var msg="Descargando backup de "+tablas.length+" tablas... Espera unos segundos.";
    console.log("[backup] "+msg);
    Promise.all(tablas.map(function(t){return dbGet(t).then(function(rows){return {tabla:t,rows:rows||[]};});})).then(function(results){
      var bk={
        timestamp:new Date().toISOString(),
        date:new Date().toLocaleString("es-ES"),
        version:"1.0",
        tables:{}
      };
      var totalRows=0;
      results.forEach(function(r){
        bk.tables[r.tabla]=r.rows;
        totalRows+=r.rows.length;
      });
      // Crear archivo descargable
      var blob=new Blob([JSON.stringify(bk,null,2)],{type:"application/json"});
      var url=URL.createObjectURL(blob);
      var a=document.createElement("a");
      a.href=url;
      var d=new Date();
      var fname="t2tcrm_backup_"+d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")+"_"+String(d.getHours()).padStart(2,"0")+String(d.getMinutes()).padStart(2,"0")+".json";
      a.download=fname;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert("✅ Backup descargado: "+fname+"\n\n"+totalRows+" registros guardados\n\nGuárdalo en sitio seguro (Drive, Dropbox, USB).");
    }).catch(function(err){
      console.error("[backup] Error:",err);
      alert("❌ Error al hacer backup: "+err.message);
    });
  }

  // Wrapper seguro de syncTimp con bandera anti-duplicados
  function syncTimpSafe(){
    if(syncInProgress){console.log("[sync] Ya hay un sync en curso, ignoro");return;}
    setSyncInProgress(true);
    syncTimp();
  }

  // ══════════════════════════════════════════════════════════════════════
  //  REFRESH COMPLETO: actualiza todo de un golpe
  //  - TIMP API (subscriptions, autopurchases, purchases)
  //  - Datos persistidos en Supabase (clients, leads, followups, fisio, bonos_timp)
  //  - Cancelaciones (a través del refreshTrigger contador)
  // ══════════════════════════════════════════════════════════════════════
  var refreshTrigger_=_(0), refreshTrigger=refreshTrigger_[0], setRefreshTrigger=refreshTrigger_[1];
  function refreshAll(){
    syncTimpSafe();
    syncBonos();
    // Recargar datos persistidos por si Miguel u otra sesión los modificó
    dbGet("clients").then(function(r){if(r&&r.length>0)setCl(r.map(function(x){return x.data;}));}).catch(function(){});
    dbGet("followups").then(function(r){if(r&&r.length>0)setFu(r.map(function(x){return x.data;}));}).catch(function(){});
    dbGet("leads").then(function(r){if(r&&r.length>0)setLe(r.map(function(x){return x.data;}));}).catch(function(){});
    dbGet("fisio_reports").then(function(r){if(r&&r.length>0)setFis(r.map(function(x){return x.data;}));}).catch(function(){});
    dbGet("bonos_timp").then(function(r){if(r&&r.length>0){r.forEach(function(x){
      if(x.id==="cuotas_vigentes")setBonos(x.data);
      if(x.id==="renovacion_ticks")setRenTicks(x.data);
      if(x.id==="renovacion_data")setRenData(x.data);
      if(x.id==="cuotas_excel")setCuotasExcel(x.data);
      if(x.id==="reservas_excel")setReservasExcel(x.data);
      if(x.id==="client_blacklist")setBlacklist(x.data||[]);
    });}}).catch(function(){});
    // Trigger refresh de Cancelaciones
    setRefreshTrigger(function(t){return t+1;});
  }

  function saveClient(c){dbSave("clients",c.id,c).catch(function(){});}
  function deleteClient(id){dbDel("clients",id).catch(function(){});}
  function saveFu(f){dbSave("followups",f.id,f).catch(function(){});}
  function deleteFu(id){dbDel("followups",id).catch(function(){});}
  function saveLead(l){dbSave("leads",l.id,l).catch(function(){});}
  function deleteLead(id){dbDel("leads",id).catch(function(){});}
  function saveFisio(f){dbSave("fisio_reports",f.id,f).catch(function(){});}
  function deleteFisio(id){dbDel("fisio_reports",id).catch(function(){});}

  // ══════════════════════════════════════════════════════════════════════
  //  HELPER: saveRenDataAtomic — actualiza estado Y persiste el MISMO snapshot.
  //  Antes: setRenData(prev=>...) + dbSave(renData) → renData stale = race.
  //  Ahora: calculamos el next una sola vez y lo usamos para ambos.
  // ══════════════════════════════════════════════════════════════════════
  function saveRenDataAtomic(updater){
    setRenData(function(prev){
      var next=updater(prev);
      // Persistir con el snapshot que acabamos de calcular
      dbSave("bonos_timp","renovacion_data",next).catch(function(err){
        console.error("[saveRenDataAtomic] error persistiendo:",err);
      });
      return next;
    });
  }
  function changeRenovacion(clientName,weekKey,field,value){
    var k=clientName.toLowerCase().trim()+"__"+weekKey;
    saveRenDataAtomic(function(prev){
      var n=Object.assign({},prev);
      n[k]=Object.assign({},n[k]||{});
      n[k][field]=value;
      return n;
    });
  }
  function moveRenovacion(clientName,fromWeek,toWeek,notas){
    var fk=clientName.toLowerCase().trim()+"__"+fromWeek;
    var tk=clientName.toLowerCase().trim()+"__"+toWeek;
    saveRenDataAtomic(function(prev){
      var n=Object.assign({},prev);
      n[fk]=Object.assign({},n[fk]||{},{renovacion:"renovado"});
      n[tk]=Object.assign({},n[tk]||{},{notas:notas||"Movido desde semana "+fromWeek,segundoPago:true,clientName:clientName});
      return n;
    });
  }

  var TIMP_CENTER="ebb9a2c0-782e-4d77-b5eb-17d18a1f8949";
  function timpFetch(endpoint){return fetch("/api/timp?path=branch_buildings/"+TIMP_CENTER+"/"+endpoint).then(function(r){return r.json();});}

  // ══════════════════════════════════════════════════════════════════════
  //  HELPER: Normalizar nombre (quitar tildes, lowercase, trim, colapsar espacios)
  // ══════════════════════════════════════════════════════════════════════
  function normName(s){
    if(!s)return "";
    return String(s).toLowerCase().trim()
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ");
  }

  // ══════════════════════════════════════════════════════════════════════
  //  HELPER: Match de nombres SEGURO (exige nombre + 1er apellido)
  //  Reemplaza el antiguo matching por indexOf que daba falsos positivos
  //  ("Luis" ↔ "Luisa", "Mari" ↔ "Mari Carmen", etc.)
  // ══════════════════════════════════════════════════════════════════════
  function matchesName(a,b){
    var na=normName(a),nb=normName(b);
    if(!na||!nb)return false;
    if(na===nb)return true;
    var wa=na.split(" "),wb=nb.split(" ");
    // Exigir al menos 2 palabras coincidentes (nombre + 1er apellido)
    if(wa.length<2||wb.length<2)return false;
    return wa[0]===wb[0]&&wa[1]===wb[1];
  }

  // ══════════════════════════════════════════════════════════════════════
  //  HELPER: openClient — abre la ficha de un cliente con auto-refresh
  //  Antes de mostrar el modal, pide la última versión a Supabase para que
  //  veas los cambios que Miguel haya hecho recientemente. Reduce conflictos.
  // ══════════════════════════════════════════════════════════════════════
  function openClient(c){
    if(!c){setSel(null);return;}
    // Mostrar inmediatamente con datos en memoria (rápido)
    setSel(c);
    // En paralelo, traer la versión más reciente desde Supabase
    dbGetOne("clients",c.id).then(function(row){
      if(!row||!row.data)return;
      var fresh=row.data;
      // Si hay cambios respecto a lo que tenemos en memoria, actualizar
      var hasChanges=JSON.stringify(fresh)!==JSON.stringify(c);
      if(hasChanges){
        // Actualizar lista global
        setCl(function(prev){return prev.map(function(x){return x.id===fresh.id?fresh:x;});});
        // Actualizar el sel solo si todavía está abierto este cliente
        setSel(function(s){return (s&&s.id===fresh.id)?fresh:s;});
        console.log("[openClient] Datos refrescados desde Supabase para "+fresh.name);
      }
    }).catch(function(err){console.warn("[openClient] No se pudo refrescar:",err);});
  }

  //  Usar SIEMPRE este helper en lugar de matchesName cuando trabajemos
  //  con clientes del CRM, para evitar confusiones por nombres similares.
  //  - clientCrm: objeto cliente del CRM (con .name y opcional .timpUuid)
  //  - other: { name?, full_name?, uuid?, timpUuid? } — TIMP, Excel, etc.
  // ══════════════════════════════════════════════════════════════════════
  function matchesClient(clientCrm, other){
    if(!clientCrm||!other)return false;
    // Match estricto por UUID si ambos lo tienen
    var uuidA=clientCrm.timpUuid;
    var uuidB=other.uuid||other.timpUuid;
    if(uuidA&&uuidB)return uuidA===uuidB;
    // Fallback a nombre
    var nameA=clientCrm.name;
    var nameB=other.name||other.full_name;
    return matchesName(nameA,nameB);
  }

  // ══════════════════════════════════════════════════════════════════════
  //  HELPER: Paginación TIMP — recorre todas las páginas
  //  TIMP devuelve { collection: [...], ... } por página.
  //  Se detiene cuando: collection vacío, sin cambios, o hard cap.
  // ══════════════════════════════════════════════════════════════════════
  function fetchAllPages(basePath,qs){
    var MAX_PAGES=80; // hard cap de seguridad (767 clientes / 25 ~ 31 páginas)
    var results=[];
    function getOne(page){
      var sep=qs?"%26":"%3F";
      var suffix=qs?qs+sep+"page="+page:"%3Fpage="+page;
      return fetch("/api/timp?path=branch_buildings/"+TIMP_CENTER+"/"+basePath+suffix)
        .then(function(r){return r.json();});
    }
    function loop(page){
      if(page>MAX_PAGES){console.warn("[TIMP] MAX_PAGES alcanzado en "+basePath);return results;}
      return getOne(page).then(function(data){
        if(!data||!data.collection||data.collection.length===0)return results;
        results=results.concat(data.collection);
        // Si la página devuelve menos de lo normal (default 25), asumimos fin
        if(data.collection.length<25)return results;
        return loop(page+1);
      }).catch(function(err){
        console.error("[TIMP] Error en "+basePath+" page "+page+":",err);
        return results;
      });
    }
    return loop(1);
  }

  function syncTimp(){
    setTimpSyncing(true);
    fetchAllPages("subscriptions","").then(function(subs){
      if(!subs||subs.length===0){setTimpSyncing(false);return;}
      console.log("[syncTimp] Cargadas "+subs.length+" subscriptions de TIMP");
      setTimpData(subs);
      setTimpLast(new Date().toLocaleString("es-ES"));
      var now=new Date();
      // Update CRM clients with TIMP data
      setCl(function(prev){
        var updated=prev.map(function(c){
          // Match prioritario: UUID si ya lo tenemos guardado (100% fiable).
          // Fallback: nombre + 1er apellido (para clientes nuevos sin UUID asignado).
          var match=null;
          if(c.timpUuid){match=subs.find(function(s){return s.uuid===c.timpUuid;});}
          if(!match){match=subs.find(function(s){return matchesName(s.full_name,c.name);});}
          if(match){
            var upd=Object.assign({},c);
            upd.timpUuid=match.uuid;
            upd.timpActive=match.active_membership;
            upd.timpPaymentPending=match.payment_pending;
            upd.timpNextBooking=match.next_booking_for;
            upd.timpPhone=match.phone;
            upd.timpEmail=match.email;
            upd.timpNif=match.nif;
            upd.timpAddress=match.address;
            // Auto-rellenar tarjeta guardada si alguna vez pagó in-app.
            // Solo enciende el flag — nunca lo apaga (respeta marcados manuales).
            var algunInapp=bonos.some(function(b){return b.suscriptionUuid===match.uuid&&b.formaPago==="inapp";});
            if(algunInapp&&!c.timpHasCard)upd.timpHasCard=true;
            // Cliente con bono = active_membership OR tiene reserva futura
            var tieneBono=match.active_membership||!!match.next_booking_for;
            // Check if client has a future autopurchase (bono con fecha de valor adelantada)
            var tienBonoFuturo=bonos.some(function(b){
              if(!b.suscriptionUuid||b.suscriptionUuid!==match.uuid)return false;
              if(!b.fechaValor)return false;
              var fv=new Date(b.fechaValor);
              return fv>now;
            });
            // Check if client has ANY training bono (not only fisio)
            // bonos array is already filtered: only contains training bonos
            var tieneEntrenamiento=bonos.some(function(b){return b.suscriptionUuid===match.uuid;});
            // ALTA: tiene bono activo de entrenamiento → CRM activo
            if((tieneBono||tienBonoFuturo)&&tieneEntrenamiento&&c.status!=="activo"){
              upd.status="activo";
              upd.timpAlert="Alta automática desde TIMP";
              upd.timpAltaDate=now.toISOString();
            }
            // BAJA: solo damos baja si YA tenemos bonos cargados (evita bajas fantasma
            // si syncTimp corre antes que syncBonos). Condición: sin bono activo Y sin
            // bono futuro Y sin bonos de entrenamiento (con paréntesis explícitos).
            else if(bonos.length>0 && !tieneBono && !tienBonoFuturo && !tieneEntrenamiento && c.status==="activo"){
              upd.status="baja";
              upd.timpAlert="Baja automática (sin bono activo ni de entrenamiento en TIMP)";
              upd.motivoBaja="Sin bono activo en TIMP";
            }
            // Tiene entrenamiento pero ni bono activo ni futuro → baja
            else if(bonos.length>0 && !tieneBono && !tienBonoFuturo && tieneEntrenamiento && c.status==="activo"){
              upd.status="baja";
              upd.timpAlert="Baja automática (sin bono activo en TIMP)";
              upd.motivoBaja="Sin bono activo en TIMP";
            }
            // Solo tiene fisio/nutrición, nunca entrenamiento → marcar pero NO dar de baja automáticamente
            else if(bonos.length>0 && (tieneBono||tienBonoFuturo) && !tieneEntrenamiento && c.status==="activo"){
              upd.timpAlert="Solo tiene bonos de fisio/nutrición";
            }
            // Activo en ambos, todo OK
            else if((tieneBono||tienBonoFuturo)&&tieneEntrenamiento&&c.status==="activo"){
              upd.timpAlert=null;
            }
            return upd;
          }
          return c;
        });
        // Save updated clients
        updated.forEach(function(c){if(c.timpUuid)saveClient(c);});
        // Auto-create new clients from TIMP that are active but not in CRM
        var newFromTimp=subs.filter(function(s){
          if(!s.full_name)return false;
          var tieneBono=s.active_membership||!!s.next_booking_for;
          // Also check for future autopurchase
          var tieneBonoFuturo=bonos.some(function(b){
            return b.suscriptionUuid===s.uuid&&b.fechaValor&&new Date(b.fechaValor)>now;
          });
          // Must have had at least one autopurchase (not just a profile in TIMP)
          var haComprado=bonos.some(function(b){return b.suscriptionUuid===s.uuid;});
          if(!haComprado)return false;
          if(!tieneBono&&!tieneBonoFuturo)return false;
          // Match seguro: no dar de alta si ya existe cliente con mismo UUID O mismo nombre
          return !updated.some(function(c){
            if(c.timpUuid&&c.timpUuid===s.uuid)return true;
            return matchesName(c.name,s.full_name);
          });
        });
        newFromTimp.forEach(function(s){
          var nc={
            id:gid(),
            name:s.full_name,
            status:"activo",
            timpUuid:s.uuid,
            timpActive:true,
            timpPaymentPending:s.payment_pending,
            timpNextBooking:s.next_booking_for,
            timpPhone:s.phone,
            timpEmail:s.email,
            timpNif:s.nif,
            timpAddress:s.address,
            timpAlert:"Alta automática desde TIMP",
            timpAltaDate:now.toISOString(),
            procedencia:"TIMP",
            observations:"",
            exercises:["Press Banca","Globe Squat","Peso Muerto","Hip-Thrust","Press Hombro","Remo","Jalón"].map(function(n){return{name:n,records:[]};})
          };
          updated.push(nc);
          saveClient(nc);
        });
        return updated;
      });
      setTimpSyncing(false);
      setSyncInProgress(false);
      var nowDate=new Date();
      setLastSyncAt(nowDate);
      // Guardar cache local para próxima carga rápida
      try{
        localStorage.setItem("t2tcrm_timp_cache",JSON.stringify({
          subs:subs,
          lastSync:nowDate.toLocaleString("es-ES"),
          lastSyncAt:nowDate.toISOString()
        }));
      }catch(e){console.warn("[cache] No se pudo guardar cache local:",e);}
    }).catch(function(err){console.error("[syncTimp] Error:",err);setTimpSyncing(false);setSyncInProgress(false);});
  }

  // Auto-fetch bonos from TIMP API (autopurchases + subscriptions together)
  function syncBonos(){
    // Paginación en las 3 llamadas — antes solo se leía page=1 (25 registros)
    var autoQs="%3Fdate_from=2025-01-01%26date_to=2027-01-01";
    var purchQs="%3Fdate_from=2025-01-01%26date_to=2027-01-01";
    Promise.all([
      fetchAllPages("autopurchases",autoQs),
      fetchAllPages("subscriptions",""),
      fetchAllPages("purchases",purchQs)
    ]).then(function(results){
      var autos=results[0]||[];
      var subs=results[1]||[];
      var purchases=results[2]||[];
      if(autos.length===0){console.warn("[syncBonos] Sin autopurchases de TIMP");return;}
      console.log("[syncBonos] Cargados "+autos.length+" autopurchases, "+subs.length+" subs, "+purchases.length+" purchases");
      var parsed=[];
      // SOLO estos bonos cuentan para renovaciones de entrenamiento (lista blanca)
      var ENTRENAMIENTO_BONOS=[
        "bono 10 sesiones duales","bono 20 sesiones duales","bono 5 sesiones duales",
        "entrenamiento sesión","entrenamiento sesion",
        "time partner","time partner plus","time partner plus trimestral",
        "time partner pro","time partner pro trimestral","time partner trimestral",
        "time pro+","time pro trimestral+","time pro trimestral +"
      ];
      function isTrainingBono(caption){
        if(!caption)return false;
        var c=caption.toLowerCase().trim();
        return ENTRENAMIENTO_BONOS.some(function(tb){return c===tb||c.indexOf(tb)>=0;});
      }
      autos.forEach(function(a){
        if(a.removed)return;
        var sub=subs.find(function(s){return s.uuid===a.suscription_uuid;});
        if(!sub||!sub.full_name)return;
        // Only accept training bonos (whitelist)
        if(!isTrainingBono(a.caption))return;
        // Skip clients without active membership UNLESS they have:
        //   - next_booking_for (reserva futura)
        //   - bono futuro (available_at empieza después de hoy)
        //   - bono recién vencido (fechaFin dentro de las últimas 4 semanas → aparece en renovaciones)
        if(!sub.active_membership&&!sub.next_booking_for){
          if(!a.available_at)return;
          var checkParts=a.available_at.split("..");
          if(checkParts.length!==2)return;
          var checkFv=new Date(checkParts[0].trim());
          var checkFf=new Date(checkParts[1].trim());
          var now=new Date();
          var cutoff=new Date();cutoff.setDate(cutoff.getDate()-28); // hace 4 semanas
          if(isNaN(checkFv))return;
          // Pasa si: el bono empieza en el futuro OR acabó hace menos de 4 semanas
          var empiezaFuturo=checkFv>now;
          var acabadoReciente=!isNaN(checkFf)&&checkFf>=cutoff;
          if(!empiezaFuturo&&!acabadoReciente)return;
        }
        var fechaValor=null;var fechaFin=null;
        if(a.available_at){
          var parts=a.available_at.split("..");
          if(parts.length===2){fechaValor=new Date(parts[0].trim());fechaFin=new Date(parts[1].trim());}
        }
        if(!fechaValor||isNaN(fechaValor))return;
        var pagado=!!a.paid_at;
        // Pago fraccionado / reserva detection
        var esFraccionado=!!a.purchase_installment;
        var mitadPagada=false;
        var esReserva=false;
        var importePagado=0;
        var precioTotal=parseFloat(a.final_price)||0;
        var impagoRealFraccionado=false; // plazo individual sin pagar aunque TIMP marque pagado
        if(esFraccionado&&a.installments&&a.installments.length>0){
          var instPaidCount=0;
          var instTotal=a.installments.length;
          a.installments.forEach(function(inst){
            if(inst.paid){importePagado+=parseFloat(inst.paid_amount)||0;instPaidCount++;}
          });
          // ─ CASO CRÍTICO ─ TIMP marca paid_at pero hay plazos sin pagar.
          // Pasa cuando la SUMA total cobrada llega al precio por otras vías,
          // pero un plazo intermedio quedó pendiente (ej: in-app rechazado).
          // Ejemplo: Jose Alvaro — 4 plazos, 3 pagados = 625€, 1 sin pagar = 208€.
          if(pagado&&instPaidCount<instTotal){
            impagoRealFraccionado=true;
            pagado=false; // desmarcamos para que el CRM lo trate como impago
          }
          if(importePagado>0&&!pagado&&precioTotal>0){
            // <= 30% del total → reserva; > 30% → mitad pagada
            if(importePagado<=precioTotal*0.3){
              esReserva=true;
            }else{
              mitadPagada=true;
            }
          }
        }
        // Save dates in LOCAL timezone to avoid UTC day shift
        function toLocalISO(d){var y=d.getFullYear(),m=d.getMonth()+1,dd=d.getDate(),h=d.getHours(),mi=d.getMinutes();return y+"-"+(m<10?"0":"")+m+"-"+(dd<10?"0":"")+dd+"T"+(h<10?"0":"")+h+":"+(mi<10?"0":"")+mi+":00";}
        // Cross-reference with purchases to get real payment data
        var clientPurchases=purchases.filter(function(p){return p.suscription_uuid===a.suscription_uuid;});
        var totalPagadoReal=0;var totalDevoluciones=0;var purchaseMethod="";
        clientPurchases.forEach(function(p){
          var amt=parseFloat(p.final_price)||0;
          if(amt<0){totalDevoluciones+=Math.abs(amt);}
          else if(p.paid_at){totalPagadoReal+=amt;if(p.payment_method)purchaseMethod=p.payment_method;}
        });
        // ══════════════════════════════════════════════════════════════════
        //  Cálculo de mejorPagado (importe realmente pagado de este bono)
        // ══════════════════════════════════════════════════════════════════
        //  Para FRACCIONADOS: la única fuente fiable son los plazos de ESTE bono.
        //  Mezclar totalPagadoReal (suma de TODAS las purchases históricas del
        //  cliente) es un bug: inflaba el importe pagado con bonos anteriores.
        //  Ejemplo bug: Maribel paga 485€ de un bono de 970€, pero tenía 1890€
        //  en purchases históricas → CRM dice "pagó 1890€" y oculta deuda real.
        //
        //  Para NO fraccionados con precio conocido: también preferimos el valor
        //  exacto. Solo usamos totalPagadoReal como fallback si no hay otro dato
        //  (ej: bono sin fecha de pago pero con transacción en purchases).
        var mejorPagado;
        if(esFraccionado){
          // Verdad = solo plazos con paid:true, acotado al precio total del bono
          mejorPagado=Math.min(importePagado,precioTotal);
        }else if(pagado){
          // Bono no fraccionado marcado pagado → cobrado al precio total
          mejorPagado=precioTotal;
        }else{
          // Bono no fraccionado no marcado pagado → no se ha cobrado
          mejorPagado=0;
        }
        var deudaReal=precioTotal-mejorPagado;
        if(deudaReal<0)deudaReal=0;
        if(pagado)deudaReal=0; // pagado ya fue desmarcado si había impago real
        // Use purchase payment method if autopurchase doesn't have one
        var metodoFinal=a.payment_method||purchaseMethod||"";
        parsed.push({
          nombre:sub.full_name,concepto:a.caption||"",tipoBono:a.caption||"",
          fechaValor:toLocalISO(fechaValor),
          fechaFin:fechaFin?toLocalISO(fechaFin):"",
          precio:precioTotal,pagado:pagado,
          fechaPago:a.paid_at||"",formaPago:metodoFinal,
          suscriptionUuid:a.suscription_uuid||"",
          totalSesiones:0,usadas:0,sinCanjear:0,enUso:0,caducadas:0,
          total:precioTotal,
          pendientePago:deudaReal,
          fraccionado:esFraccionado,
          mitadPagada:mitadPagada,
          esReserva:esReserva,
          importePagado:mejorPagado,
          totalDevoluciones:totalDevoluciones,
          deudaReal:deudaReal,
          impagoRealFraccionado:impagoRealFraccionado,
          telefono:sub.phone||"",
          email:sub.email||"",
          nextBooking:sub.next_booking_for||""
        });
      });
      console.log("[syncBonos] Parsed "+parsed.length+" bonos from API");
      // ── Deduplicación: mismo suscriptionUuid + misma fechaValor → quedarnos con el pagado o el más reciente
      var dedupeMap={};
      parsed.forEach(function(b){
        var key=(b.suscriptionUuid||b.nombre)+"__"+(b.fechaValor||"");
        if(!dedupeMap[key]){dedupeMap[key]=b;return;}
        // Si ya había uno, priorizar el pagado; si ambos pagados, el de precio mayor
        var prev=dedupeMap[key];
        if(b.pagado&&!prev.pagado)dedupeMap[key]=b;
        else if(b.pagado===prev.pagado&&b.precio>prev.precio)dedupeMap[key]=b;
      });
      var deduped=Object.values(dedupeMap);
      if(deduped.length<parsed.length)console.log("[syncBonos] Deduplicados: "+(parsed.length-deduped.length)+" duplicados eliminados");
      setBonos(deduped);
      dbSave("bonos_timp","cuotas_vigentes",deduped).catch(function(){});
    }).catch(function(err){console.error("[syncBonos] Error:",err);});
  }

  // Auto-sync bonos: UN SOLO useEffect — dispara al cargar la app. syncTimp se encarga de subs.
  // Antes había DOS useEffects (en ld y en timpData) que hacían doble fetch a TIMP al arrancar.
  useEffect(function(){
    if(ld){syncBonos();}
  },[ld]);

  // Import cuotas from TIMP Excel — se guarda aparte para sesiones consumidas
  var cuotasExcel_=_([]),cuotasExcel=cuotasExcel_[0],setCuotasExcel=cuotasExcel_[1];

  // Reporte de Reservas de TIMP (sesiones realizadas/pendientes por cliente y fecha)
  var reservasExcel_=_([]),reservasExcel=reservasExcel_[0],setReservasExcel=reservasExcel_[1];

  // Lista negra de clientes que nunca deben aparecer (Gympass sin marcar, ex-clientes, etc)
  var blacklist_=_([]),blacklist=blacklist_[0],setBlacklist=blacklist_[1];

  // Load cuotas excel, reservas excel y blacklist desde Supabase on init
  useEffect(function(){
    dbGet("bonos_timp").then(function(r){
      var blFound=false;
      if(r&&r.length>0){r.forEach(function(x){
        if(x.id==="cuotas_excel")setCuotasExcel(x.data);
        if(x.id==="reservas_excel")setReservasExcel(x.data);
        if(x.id==="client_blacklist"){setBlacklist(x.data||[]);blFound=true;}
      });}
      // Si nunca se ha creado la blacklist, inicializar con los clientes Gympass conocidos
      if(!blFound){
        var inicial=["Cristhina","Javier Anitua","Fatima Albizuri","Laura Guerin","Rafaella Lopez"];
        setBlacklist(inicial);
        dbSave("bonos_timp","client_blacklist",inicial).catch(function(){});
      }
    }).catch(function(){});
  },[]);

  // Normalizar nombre para comparar (sin tildes, lowercase, trim)
  function normName(s){
    return (s||"").toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  }
  // Comprobar si un nombre está en la blacklist (coincide primer nombre o substring)
  function isBlacklisted(nombre){
    if(!blacklist||!blacklist.length)return false;
    var n=normName(nombre);
    return blacklist.some(function(b){
      var bn=normName(b);
      if(!bn)return false;
      // Match: primer nombre igual o el nombre de la lista es substring
      var wa=n.split(" ").filter(Boolean);
      var wb=bn.split(" ").filter(Boolean);
      if(wa.length>=1&&wb.length>=1&&wa[0]===wb[0]){
        if(wb.length===1)return true; // solo nombre → match por primer nombre
        if(wa.length>=2&&wb.length>=2&&wa[1]===wb[1])return true; // nombre+apellido
      }
      return n.indexOf(bn)>=0; // fallback por substring
    });
  }
  // Guardar blacklist en Supabase
  function saveBlacklist(list){
    setBlacklist(list);
    dbSave("bonos_timp","client_blacklist",list).catch(function(){});
  }

  function importCuotas(e){
    var file=e.target.files[0];
    if(!file)return;
    var reader=new FileReader();
    reader.onload=function(ev){
      try{
        var XLSX=window.XLSX||null;
        if(!XLSX){alert("Cargando librería...");return;}
        var wb=XLSX.read(ev.target.result,{type:"array",cellDates:true});
        var ws=wb.Sheets[wb.SheetNames[0]];
        var rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:null});

        // ══════════════════════════════════════════════════════════════
        //  PARSER MULTI-SECCIÓN
        // ══════════════════════════════════════════════════════════════
        // El Excel "Cuotas Vigentes" de TIMP tiene múltiples secciones (una por tipo de bono).
        // Cada sección tiene:
        //   Fila N:   Título del bono (ej: "Time partner plus") — sólo en columna 0
        //   Fila N+2: Cabecera (contiene "Número de factura", "Cliente (nombre)", etc.)
        //   Fila N+3..M: Filas de cliente
        //   Fila M+1: "No existen compras para esta cuota" o nueva sección o fin
        // También hay títulos de grupo como "Time dual - Time dual 2026-04-20/2026-04-26"
        // y "Bonos - Bonos 2026-04-20/2026-04-26" que debemos ignorar como secciones.

        // Whitelist: solo importamos estos tipos de bono (el resto se ignora: fisio, nutrición, etc.)
        var WHITELIST_TIPOS = [
          "time partner","time partner plus","time partner trimestral","time partner plus trimestral",
          "time pro","time pro trimestral","time pro+","time pro plus","time pro+ trimestral",
          "bono 5 sesiones","bono 10 sesiones","bono 20 sesiones",
          "bono 5 sesiones duales","bono 10 sesiones duales","bono 20 sesiones duales",
          "entrenamiento sesion","entrenamiento sesión"
        ];
        function isWhitelisted(tipo){
          if(!tipo)return false;
          var t=(""+tipo).toLowerCase().trim();
          return WHITELIST_TIPOS.some(function(w){return t.indexOf(w)>=0;});
        }

        function isSectionTitle(r){
          // Una sola celda con texto, resto vacías
          if(!r)return false;
          var vals=r.filter(function(x){return x!=null&&x!=="";});
          return vals.length===1 && typeof vals[0]==="string";
        }
        function isHeaderRow(r){
          return r && r.some && r.some(function(c){return c==="Cliente (nombre)";});
        }
        function isGroupHeader(txt){
          // Títulos como "Time dual - Time dual 2026-04-20/2026-04-26" son encabezados de grupo
          return /\d{4}-\d{2}-\d{2}/.test(txt) || /^Bonos?\s*-/i.test(txt);
        }

        // Intentar extraer la semana del Excel desde cualquier título con formato YYYY-MM-DD/YYYY-MM-DD
        // Ejemplo: "Time dual - Time dual 2026-04-20/2026-04-26" → {inicio: 2026-04-20, fin: 2026-04-26}
        var semanaExcel=null;
        for(var iHdr=0;iHdr<Math.min(20,rows.length);iHdr++){
          var rHdr=rows[iHdr];
          if(!rHdr)continue;
          var txtFull=rHdr.filter(function(x){return x!=null&&x!=="";}).join(" ");
          var mFecha=txtFull.match(/(\d{4}-\d{2}-\d{2})\/(\d{4}-\d{2}-\d{2})/);
          if(mFecha){semanaExcel=mFecha[1];break;}
        }

        // Recorremos el Excel identificando secciones
        var parsed=[];
        var tipoBonoActual="";
        var enSeccion=false;  // true cuando estamos dentro de datos de una sección
        var cabeceraCols={};  // mapeo de nombre de columna -> índice

        for(var i=0;i<rows.length;i++){
          var r=rows[i];
          if(!r)continue;

          // Detectar título de sección (tipo de bono)
          if(isSectionTitle(r)){
            var txt=(""+r.find(function(x){return x!=null&&x!=="";})).trim();
            // Ignorar títulos de grupo y mensajes "No existen..."
            if(/^no existen/i.test(txt)){enSeccion=false;continue;}
            if(isGroupHeader(txt)){enSeccion=false;continue;}
            // Es un tipo de bono
            tipoBonoActual=txt;
            enSeccion=false;  // aún no hemos visto la cabecera
            continue;
          }

          // Detectar cabecera de la sección
          if(isHeaderRow(r)){
            cabeceraCols={};
            for(var c=0;c<r.length;c++){
              if(r[c])cabeceraCols[r[c]]=c;
            }
            enSeccion=true;
            continue;
          }

          // Si estamos en una sección activa y es fila de cliente
          if(enSeccion && tipoBonoActual){
            // ¿Este tipo está en la whitelist?
            if(!isWhitelisted(tipoBonoActual)){continue;}

            var cNombre=cabeceraCols["Cliente (nombre)"];
            var cApe=cabeceraCols["Cliente (apellidos)"];
            var cTotal=cabeceraCols["Saldo total"];
            var cUsado=cabeceraCols["Saldo usado"];
            var cSinCanj=cabeceraCols["Saldo sin canjear"];
            var cEnUso=cabeceraCols["Saldo en uso"];
            var cCaducado=cabeceraCols["Saldo caducado"];
            var cValor=cabeceraCols["Valor"];
            var cPagado=cabeceraCols["Pagado"];
            var cPendiente=cabeceraCols["Pendiente de pago"];
            var cTotalCobro=cabeceraCols["Total"];

            var nombre=r[cNombre];
            var apellidos=r[cApe];
            if(!nombre)continue; // fila vacía
            // Descartar filas que sean cabeceras repetidas por error
            if(typeof nombre==="string" && nombre.indexOf("Cliente")===0)continue;

            var fullName=((nombre||"")+" "+(apellidos||"")).trim();
            if(!fullName)continue;

            // ══════════════════════════════════════════════════
            //  EXCLUSIÓN: Gympass y blacklist no cuentan para renovaciones
            // ══════════════════════════════════════════════════
            var lowerName=fullName.toLowerCase();
            if(lowerName.indexOf("gympass")>=0)continue;
            if(isBlacklisted(fullName))continue;

            // ══════════════════════════════════════════════════
            //  CÁLCULO DE ESTADO DEL BONO (regla Jesús)
            // ══════════════════════════════════════════════════
            //  consumido = usadas + caducadas   (SOLO lo ya gastado)
            //
            //  "sinCanjear" NO cuenta: son sesiones FUTURAS ya reservadas
            //  en semanas posteriores. Ej: Jimena tiene bono hasta junio con
            //  19 "sin canjear" que son sus 2 sesiones/semana por delante.
            //
            //  "enUso" son reservas pendientes de hacer. Si enUso > 0, el
            //  cliente AÚN tiene clases por delante en este bono → NO agotado.
            //
            //  AGOTADO requiere: consumido >= total AND enUso == 0
            var totalSes=+r[cTotal]||0;
            var usadas=+r[cUsado]||0;
            var sinCanj=+r[cSinCanj]||0;
            var enUso=+r[cEnUso]||0;
            var caduc=+r[cCaducado]||0;
            var consumido=usadas+caduc;
            var restante=totalSes-consumido;

            var estadoBono;
            if(totalSes>0 && consumido>=totalSes && enUso===0)estadoBono="agotado";
            else estadoBono="activo";

            parsed.push({
              nombre:fullName,
              tipoBono:tipoBonoActual,
              totalSesiones:totalSes,
              usadas:usadas,
              sinCanjear:sinCanj,
              enUso:enUso,
              caducadas:caduc,
              consumido:consumido,
              restante:restante,
              estadoBono:estadoBono,
              semanaExcel:semanaExcel,
              fechaValor:r[cValor]||"",
              totalCobro:+r[cTotalCobro]||0,
              totalPagado:+r[cPagado]||0,
              pendientePago:+r[cPendiente]||0
            });
          }
        }

        setCuotasExcel(parsed);
        dbSave("bonos_timp","cuotas_excel",parsed).catch(function(){});
        var porTipo={},porEstado={agotado:0,activo:0};
        parsed.forEach(function(p){
          porTipo[p.tipoBono]=(porTipo[p.tipoBono]||0)+1;
          porEstado[p.estadoBono]=(porEstado[p.estadoBono]||0)+1;
        });
        // Calcular la semana siguiente en formato legible
        var semSig="(desconocida)";
        if(semanaExcel){
          var d=new Date(semanaExcel+"T00:00:00");
          d.setDate(d.getDate()+7);
          var y=d.getFullYear(),m=d.getMonth()+1,dd=d.getDate();
          semSig=(dd<10?"0":"")+dd+"/"+(m<10?"0":"")+m+"/"+y;
        }
        var msg="✅ "+parsed.length+" registros importados\n";
        if(semanaExcel)msg+="📅 Semana del Excel: "+semanaExcel+"\n\n";
        msg+="Por tipo:\n";
        Object.keys(porTipo).forEach(function(t){msg+="• "+t+": "+porTipo[t]+"\n";});
        msg+="\n🔴 Bonos AGOTADOS esta semana: "+porEstado.agotado+"\n";
        msg+="→ Aparecerán en Renovaciones del "+semSig+"\n";
        msg+="\n🟢 Aún con sesiones disponibles: "+porEstado.activo;
        alert(msg);
      }catch(err){alert("Error: "+err.message);}
    };
    reader.readAsArrayBuffer(file);
    e.target.value="";
  }

  // ══════════════════════════════════════════════════════════════════
  //  IMPORTAR REPORTE DE RESERVAS de TIMP
  // ══════════════════════════════════════════════════════════════════
  // Se usa cada lunes junto con el Excel de Cuotas.
  // Cubre desde 01/01/AAAA hasta el domingo de la semana del Excel de Cuotas.
  // Para cada reserva guarda: nombre, venta (tipo bono), fecha, estado, canjeada.
  // Luego en Renovaciones se cruza con los bonos de TIMP para contar sesiones reales.
  function importReservas(e){
    var file=e.target.files[0];
    if(!file)return;
    var reader=new FileReader();
    reader.onload=function(ev){
      try{
        var XLSX=window.XLSX||null;
        if(!XLSX){alert("Cargando librería...");return;}
        var wb=XLSX.read(ev.target.result,{type:"array",cellDates:false});
        var ws=wb.Sheets[wb.SheetNames[0]];
        var rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:null});

        // La cabecera está en la fila 3 (índice 3): ID, Servicio, Recurso, Inicio, Fin, Cliente(ID)...
        var hIdx=rows.findIndex(function(r){
          return r && r.some && r.some(function(c){return c==="Cliente (nombre)";});
        });
        if(hIdx<0){alert("No se encontró la cabecera del reporte de Reservas");return;}

        var header=rows[hIdx];
        var col={};
        for(var c=0;c<header.length;c++){if(header[c])col[header[c]]=c;}

        var cServicio=col["Servicio"];
        var cInicio=col["Inicio"];
        var cNom=col["Cliente (nombre)"];
        var cApe=col["Cliente (apellidos)"];
        var cCanj=col["Canjeada"];
        var cEstado=col["Estado de reserva"];
        var cVenta=col["Venta"];
        var cSesBono=col["Sesiones del bono"];

        // Parsear fecha española "DD/MM/YYYY HH:mm" → ISO
        function parseDate(s){
          if(!s)return null;
          if(typeof s!=="string")return null;
          var m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
          if(!m)return null;
          return m[3]+"-"+m[2]+"-"+m[1]+"T"+(m[4].length===1?"0":"")+m[4]+":"+m[5]+":00";
        }

        var parsed=[];
        for(var i=hIdx+1;i<rows.length;i++){
          var r=rows[i];
          if(!r||!r[cNom])continue;
          var servicio=r[cServicio]||"";
          // Solo nos interesa Time dual (entrenamiento). Excluimos Fisio, Nutrición, etc.
          if((""+servicio).toLowerCase().indexOf("time dual")<0)continue;

          var fullName=((r[cNom]||"")+" "+(r[cApe]||"")).trim();
          if(!fullName)continue;

          var iso=parseDate(r[cInicio]);
          if(!iso)continue; // sin fecha no sirve

          parsed.push({
            nombre:fullName,
            inicio:iso,                    // ISO string
            estado:r[cEstado]||"",         // "Aceptada" | "Cancelada" | "En cola"
            canjeada:r[cCanj]||"",         // "Si" | "No" | "Regalada"
            venta:r[cVenta]||"",           // "Time partner plus trimestral (Time dual)"...
            sesionesBono:+r[cSesBono]||0
          });
        }

        setReservasExcel(parsed);
        dbSave("bonos_timp","reservas_excel",parsed).catch(function(){});

        // Resumen
        var total=parsed.length;
        var aceptSi=parsed.filter(function(p){return p.estado==="Aceptada"&&p.canjeada==="Si";}).length;
        var aceptNo=parsed.filter(function(p){return p.estado==="Aceptada"&&p.canjeada==="No";}).length;
        var canceladas=parsed.filter(function(p){return p.estado==="Cancelada";}).length;
        var msg="✅ "+total+" reservas importadas (Time dual)\n\n";
        msg+="✅ Canjeadas (hechas): "+aceptSi+"\n";
        msg+="⏳ Pendientes de canjeo: "+aceptNo+"\n";
        msg+="❌ Canceladas: "+canceladas+"\n\n";
        msg+="Esto mejora la detección de bonos agotados\n";
        msg+="en Renovaciones cruzando con el Excel de Cuotas.";
        alert(msg);
      }catch(err){alert("Error: "+err.message);}
    };
    reader.readAsArrayBuffer(file);
    e.target.value="";
  }

  // Get bonos for a specific client
  function getClientBonos(name){
    if(!bonos.length||!name)return[];
    var n=name.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
    return bonos.filter(function(b){
      var bn=b.nombre.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
      if(bn===n)return true;
      var wa=n.split(" "),wb=bn.split(" ");
      if(wa.length>=2&&wb.length>=2&&wa[0]===wb[0]&&wa[1]===wb[1])return true;
      return false;
    });
  }

  var td=new Date().toISOString().split("T")[0];
  var pc=fu.filter(function(f){return!f.done&&f.date<=td;}).length;
  var fisioAlerts=fis.filter(function(f){return!f.done&&f.trainDate&&f.trainDate<=td;});
  var totalAlerts=pc+fisioAlerts.length;
  var sv=function(fn){setCl(function(p){var next=fn(p);next.forEach(function(c){var old=p.find(function(x){return x.id===c.id;});if(!old||JSON.stringify(old)!==JSON.stringify(c))saveClient(c);});return next;});};
  var fi=cl.filter(function(c){return c.name.toLowerCase().indexOf(sr.toLowerCase())>=0;});
  var cn={t:cl.length,a:cl.filter(function(c){return c.status==="activo";}).length,p:cl.filter(function(c){return c.status==="pausado";}).length,b:cl.filter(function(c){return c.status==="baja";}).length};
  var sx=sel?(sel.exercises||eEx()):eEx();
  var B={background:T.bg2,borderRadius:14,border:"1px solid "+T.border,overflow:"hidden"};
  var iS={width:"100%",padding:"9px 12px",background:T.bg3,border:"1px solid "+T.border2,borderRadius:9,color:T.text,fontSize:13,outline:"none",boxSizing:"border-box"};

  if(!ld)return <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}><img src="/logo.png" alt="time2train" style={{height:60,filter:dk?"brightness(0) invert(1)":"none"}}/><div style={{color:T.text3,fontSize:14,fontWeight:600}}>Cargando T2Tcrm...</div></div>;

  /* ═══ HOME SCREEN ═══ */  if(sec==="home") {
    // Calculate home KPIs
    var homeDeuda=0;var homePagosPend=0;
    var seenHomePagos={};
    (bonos||[]).forEach(function(b){
      var caption=(b.tipoBono||b.concepto||"").toLowerCase();
      var isEnt=caption.indexOf("time")>=0||caption.indexOf("partner")>=0||caption.indexOf("pro")>=0||caption.indexOf("bono")>=0||caption.indexOf("sesion")>=0||caption.indexOf("dual")>=0;
      if(!isEnt)return;
      var key=b.nombre+"__"+(b.fechaValor||"");
      if(seenHomePagos[key])return;seenHomePagos[key]=true;
      if(!b.pagado){
        var pend=b.fraccionado?((b.precio||0)-(b.importePagado||0)):(b.precio||0);
        if(pend>0){homeDeuda+=pend;homePagosPend++;}
      }
    });
    var now=new Date();var day=now.getDay();var mon=new Date(now);mon.setDate(mon.getDate()-(day===0?6:day-1));mon.setHours(0,0,0,0);
    var homeRenovaciones=0;var homeRenovadosEsta=0;
    var seenHomeRen={};
    (bonos||[]).forEach(function(b){
      var fv=b.fechaValor?new Date(b.fechaValor):null;
      if(!fv||isNaN(fv))return;
      var bm=new Date(fv);var bd=bm.getDay();bm.setDate(bm.getDate()-(bd===0?6:bd-1));bm.setHours(0,0,0,0);
      if(bm.getTime()!==mon.getTime())return;
      if(seenHomeRen[b.nombre])return;seenHomeRen[b.nombre]=true;
      homeRenovaciones++;
      if(b.pagado)homeRenovadosEsta++;
    });
    var homePendRen=homeRenovaciones-homeRenovadosEsta;
    return(
    <div style={{minHeight:"100vh",background:T.bg,color:T.text,fontFamily:"'DM Sans',sans-serif",padding:"20px 24px"}}>
      {/* Top bar */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:28,maxWidth:1100,margin:"0 auto 28px"}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <img src="/logo.png" alt="time2train" style={{height:36,filter:dk?"brightness(0) invert(1)":"none"}}/>
          <div>
            <div style={{fontSize:16,fontWeight:900,color:T.text}}>T2Tcrm</div>
            <div style={{fontSize:10,color:T.text3}}>Hola Jesús · {new Date().toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"})}</div>
          </div>
        </div>
        <button onClick={function(){setTheme(dk?"light":"dark");}} style={{padding:"6px 12px",background:T.bg2,border:"1px solid "+T.border,borderRadius:8,color:T.text2,fontSize:12,cursor:"pointer"}}>{dk?"☀️":"🌙"}</button>
      </div>

      <div style={{maxWidth:1100,margin:"0 auto"}}>
        {/* ═══ AI ASSISTANT BAR ═══ */}
        <div style={{background:T.bg2,borderRadius:16,border:"1px solid "+T.border,padding:"16px 20px",marginBottom:24,display:"flex",alignItems:"center",gap:14,cursor:"pointer"}} onClick={function(){setHomeAI(true);}}>
          <span style={{fontSize:28}}>🤖</span>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:700,color:T.text}}>Asistente T2T</div>
            <div style={{fontSize:11,color:T.text3}}>Pregúntame lo que quieras sobre el CRM...</div>
          </div>
          <span style={{fontSize:16,color:T.text3}}>›</span>
        </div>

        {/* AI Chat inline */}
        {homeAI&&<div style={{marginBottom:24}}>
          <Suspense fallback={<div style={{padding:30,textAlign:"center",color:T.text3,fontSize:13}}>⏳ Cargando asistente...</div>}>
          <AIAssistant theme={T} dk={dk} clients={cl} followups={fu} leads={le} fisio={fis} bonos={bonos} timpData={timpData} renData={renData} inline={true} onClose={function(){setHomeAI(false);}} actions={{
            navigate:function(section,subview){setSec(section);if(subview)setMv(subview);setHomeAI(false);},
            selectClient:function(c){openClient(c);setTab("perfil");setSec("entrenamiento");setMv("clientes");setHomeAI(false);},
            createFollowup:function(data){var nf={id:gid(),clientName:data.client,reason:data.reason,date:data.date,message:data.message,done:false};setFu(function(p){return p.concat([nf]);});saveFu(nf);},
            createLead:function(data){var nl={id:gid(),name:data.name,phone:data.phone,source:data.source,interest:"",status:data.status,month:data.month,year:data.year};setLe(function(p){return p.concat([nl]);});saveLead(nl);},
            changeStatus:function(name,status){sv(function(p){return p.map(function(c){return c.name.toLowerCase().indexOf(name.toLowerCase())>=0?Object.assign({},c,{status:status}):c;});});},
            changeRenovacion:changeRenovacion,
            moveRenovacion:moveRenovacion
          }}/>
          </Suspense>
        </div>}

        {/* ═══ 3 MÓDULOS PRINCIPALES ═══ */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:24}}>

          {/* ── ENTRENAMIENTO ── */}
          <div style={{background:dk?"linear-gradient(135deg,#151a2e,#0f1320)":T.bg2,borderRadius:18,border:"2px solid "+T.navy+"40",overflow:"hidden"}}>
            <div style={{padding:"20px 22px 14px",borderBottom:"1px solid "+T.border}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <span style={{fontSize:28}}>🏋️</span>
                <div>
                  <div style={{fontSize:18,fontWeight:900,color:T.text}}>Entrenamiento</div>
                  <div style={{fontSize:10,color:T.text3}}>{cn.a} activos · {cn.b} bajas</div>
                </div>
              </div>
              {/* Mini alerts */}
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {homePagosPend>0&&<span style={{fontSize:9,padding:"3px 8px",borderRadius:5,background:"#ef444415",color:"#ef4444",fontWeight:700}}>{homePagosPend} pagos pend.</span>}
                {homePendRen>0&&<span style={{fontSize:9,padding:"3px 8px",borderRadius:5,background:"#f59e0b15",color:"#f59e0b",fontWeight:700}}>{homePendRen} renovaciones pend.</span>}
                {pc>0&&<span style={{fontSize:9,padding:"3px 8px",borderRadius:5,background:"#6366f115",color:"#6366f1",fontWeight:700}}>{pc} seguimientos</span>}
              </div>
            </div>
            {/* Sub-modules */}
            <div style={{padding:"8px 10px"}}>
              {[
                {icon:"🔄",label:"Renovaciones",sub:homeRenovaciones+" esta sem.",view:"renovaciones",alert:homePendRen>0},
                {icon:"💰",label:"Pagos",sub:homePagosPend+" pendientes",view:"pagos",alert:homePagosPend>0},
                {icon:"🚫",label:"Cancelaciones",sub:"ver hoy",view:"cancelaciones"},
                {icon:"👥",label:"Clientes",sub:cn.a+" activos",view:"panel"},
                {icon:"📇",label:"Fichas",sub:"ejercicios",view:"clientes"},
                {icon:"📋",label:"Seguimiento",sub:pc+" pend.",view:"seguimiento",alert:pc>0},
                {icon:"🎯",label:"Leads",sub:le.length+" total",view:"leads"},
                {icon:"📅",label:"Horarios",sub:"equipo",view:"horarios"}
              ].map(function(item){return<button key={item.view} onClick={function(){setSec("entrenamiento");setMv(item.view);}} style={{
                width:"100%",padding:"10px 14px",background:"transparent",border:"none",borderBottom:"1px solid "+T.border+"60",
                cursor:"pointer",display:"flex",alignItems:"center",gap:10,color:T.text,textAlign:"left"
              }}>
                <span style={{fontSize:16}}>{item.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:700}}>{item.label}</div>
                  <div style={{fontSize:9,color:item.alert?"#f59e0b":T.text3}}>{item.sub}</div>
                </div>
                <span style={{fontSize:12,color:T.text3}}>›</span>
              </button>;})}
            </div>
          </div>

          {/* ── FISIOTERAPIA ── */}
          <div style={{background:dk?"linear-gradient(135deg,#1a0f2e,#0f1320)":T.bg2,borderRadius:18,border:"2px solid #a78bfa30",overflow:"hidden"}}>
            <div style={{padding:"20px 22px 14px",borderBottom:"1px solid "+T.border}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <span style={{fontSize:28}}>🩺</span>
                <div>
                  <div style={{fontSize:18,fontWeight:900,color:T.text}}>Fisioterapia</div>
                  <div style={{fontSize:10,color:T.text3}}>{fis.length} reportes</div>
                </div>
              </div>
              {fisioAlerts.length>0&&<span style={{fontSize:9,padding:"3px 8px",borderRadius:5,background:"#a78bfa15",color:"#a78bfa",fontWeight:700}}>{fisioAlerts.length} avisos hoy</span>}
            </div>
            <div style={{padding:"8px 10px"}}>
              <button onClick={function(){setSec("fisio");}} style={{
                width:"100%",padding:"10px 14px",background:"transparent",border:"none",borderBottom:"1px solid "+T.border+"60",
                cursor:"pointer",display:"flex",alignItems:"center",gap:10,color:T.text,textAlign:"left"
              }}>
                <span style={{fontSize:16}}>📋</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:700}}>Reportes y valoraciones</div>
                  <div style={{fontSize:9,color:T.text3}}>{fis.length} informes</div>
                </div>
                <span style={{fontSize:12,color:T.text3}}>›</span>
              </button>
            </div>
          </div>

          {/* ── NUTRICIÓN ── */}
          <div style={{background:dk?"linear-gradient(135deg,#0f1e15,#0f1320)":T.bg2,borderRadius:18,border:"2px solid #22c55e30",overflow:"hidden"}}>
            <div style={{padding:"20px 22px 14px",borderBottom:"1px solid "+T.border}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <span style={{fontSize:28}}>🥗</span>
                <div>
                  <div style={{fontSize:18,fontWeight:900,color:T.text}}>Nutrición</div>
                  <div style={{fontSize:10,color:T.text3}}>Próximamente</div>
                </div>
              </div>
            </div>
            <div style={{padding:"20px 22px",textAlign:"center"}}>
              <div style={{fontSize:36,opacity:0.15,marginBottom:8}}>🥗</div>
              <div style={{fontSize:11,color:T.text3}}>Módulo en desarrollo</div>
            </div>
          </div>
        </div>

        {/* ═══ DASHBOARD BUTTON ═══ */}
        <button onClick={function(){setSec("dashboard");}} style={{
          width:"100%",padding:"14px 22px",background:T.bg2,border:"1px solid "+T.border,borderRadius:14,
          cursor:"pointer",display:"flex",alignItems:"center",gap:12,color:T.text,textAlign:"left",marginBottom:16
        }}>
          <span style={{fontSize:22}}>📊</span>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:800}}>Dashboard</div>
            <div style={{fontSize:10,color:T.text3}}>Reportes mensuales · Métricas · Leads</div>
          </div>
          <span style={{fontSize:14,color:T.text3}}>→</span>
        </button>

        {/* TIMP Sync status */}
        <div style={{textAlign:"center",marginTop:8}}>
          {timpSyncing&&<div style={{fontSize:10,color:T.text3}}>🔄 Sincronizando...</div>}
          {timpData&&!timpSyncing&&<div style={{fontSize:9,color:"#22c55e"}}>✓ TIMP sync — {timpData.filter(function(s){return s.active_membership;}).length} activos {timpLast?" · "+timpLast:""}</div>}
          {timpData&&!timpSyncing&&<button onClick={refreshAll} title="Refrescar ahora" style={{marginTop:4,padding:"4px 10px",background:"transparent",border:"1px solid "+T.border2,borderRadius:6,color:T.text3,fontSize:10,fontWeight:600,cursor:"pointer"}}>🔄 Refrescar</button>}
          {!timpData&&!timpSyncing&&<button onClick={syncTimpSafe} style={{padding:"6px 16px",background:"#394265",border:"none",borderRadius:8,color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer"}}>🔗 Sincronizar TIMP</button>}
        </div>

        {/* Backup manual */}
        <div style={{textAlign:"center",marginTop:6,paddingTop:8,borderTop:"1px solid "+T.border}}>
          <button onClick={downloadBackup} title="Descargar backup completo de todos los datos del CRM" style={{padding:"4px 10px",background:"transparent",border:"1px solid "+T.border2,borderRadius:6,color:T.text3,fontSize:10,fontWeight:600,cursor:"pointer"}}>💾 Backup</button>
        </div>
      </div>
    </div>
  );}

  /* ═══ DASHBOARD ═══ */
  if(sec==="dashboard") return(
    <div style={{minHeight:"100vh",background:T.bg,color:T.text,fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{background:dk?"linear-gradient(135deg,#1a1a10,#1a2140)":"#394265",borderBottom:"1px solid "+T.border,padding:"16px 20px"}}>
        <div style={{maxWidth:1100,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <button onClick={function(){setSec("home");}} style={{padding:"6px 14px",background:dk?"#2d3660":"rgba(255,255,255,.15)",border:"1px solid "+(dk?"#3a4570":"rgba(255,255,255,.2)"),borderRadius:8,color:dk?"#94a3b8":"#fff",fontSize:12,fontWeight:600,cursor:"pointer"}}>← Inicio</button>
            <span style={{fontSize:20}}>📊</span><h1 style={{margin:0,fontSize:20,fontWeight:800,color:dk?T.text:"#fff"}}>Dashboard — Reportes</h1>
          </div>
          <button onClick={function(){setTheme(dk?"light":"dark");}} style={{width:36,height:36,borderRadius:9,background:dk?"#2d3660":"rgba(255,255,255,.15)",border:"1px solid "+(dk?"#3a4570":"rgba(255,255,255,.2)"),display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:16}}>{dk?"☀️":"🌙"}</button>
        </div>
      </div>
      <div style={{maxWidth:1100,margin:"0 auto",padding:20}}>
        <Suspense fallback={<div style={{padding:40,textAlign:"center",color:T.text3,fontSize:13}}>⏳ Cargando dashboard...</div>}>
          <Dashboard theme={T} dk={dk} clients={cl} leads={le} followups={fu} fisio={fis} timpData={timpData} bonos={bonos}/>
        </Suspense>
      </div>
      <Suspense fallback={null}>
      <AIAssistant theme={T} dk={dk} clients={cl} followups={fu} leads={le} fisio={fis} bonos={bonos} timpData={timpData} renData={renData} actions={{
        navigate:function(section,subview){setSec(section);if(subview)setMv(subview);},
        selectClient:function(c){openClient(c);setTab("perfil");setSec("entrenamiento");setMv("clientes");},
        createFollowup:function(data){var nf={id:gid(),clientName:data.client,reason:data.reason,date:data.date,message:data.message,done:false};setFu(function(p){return p.concat([nf]);});saveFu(nf);},
        createLead:function(data){var nl={id:gid(),name:data.name,phone:data.phone,source:data.source,interest:"",status:data.status,month:data.month,year:data.year};setLe(function(p){return p.concat([nl]);});saveLead(nl);},
        changeStatus:function(name,status){sv(function(p){return p.map(function(c){return c.name.toLowerCase().indexOf(name.toLowerCase())>=0?Object.assign({},c,{status:status}):c;});});}
      }}/>
      </Suspense>
    </div>
  );

  /* ═══ NUTRICIÓN ═══ */
  if(sec==="nutricion") return(
    <div style={{minHeight:"100vh",background:"#1a2140",color:T.text,fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{background:"linear-gradient(135deg,#0a1a10,#1a2140)",borderBottom:"1px solid #2d3660",padding:"16px 20px"}}>
        <div style={{maxWidth:1100,margin:"0 auto",display:"flex",alignItems:"center",gap:12}}>
          <button onClick={function(){setSec("home");}} style={{padding:"6px 14px",background:"#2d3660",border:"1px solid "+T.border2,borderRadius:8,color:T.text2,fontSize:12,fontWeight:600,cursor:"pointer"}}>← Inicio</button>
          <span style={{fontSize:20}}>🥗</span><h1 style={{margin:0,fontSize:20,fontWeight:800}}>Nutrición</h1>
        </div>
      </div>
      <div style={{maxWidth:1100,margin:"0 auto",padding:40,textAlign:"center"}}><div style={{fontSize:60,opacity:0.2,marginBottom:16}}>🥗</div><div style={{color:"#475569",fontSize:16}}>Próximamente</div></div>
    </div>
  );

  /* ═══ FISIOTERAPIA ═══ */
  if(sec==="fisio") return(
    <div style={{minHeight:"100vh",background:"#1a2140",color:T.text,fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{background:"linear-gradient(135deg,#1a0a1a,#1a2140)",borderBottom:"1px solid #2d3660",padding:"16px 20px"}}>
        <div style={{maxWidth:1100,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <button onClick={function(){setSec("home");}} style={{padding:"6px 14px",background:"#2d3660",border:"1px solid "+T.border2,borderRadius:8,color:T.text2,fontSize:12,fontWeight:600,cursor:"pointer"}}>← Inicio</button>
            <span style={{fontSize:20}}>🩺</span><h1 style={{margin:0,fontSize:20,fontWeight:800}}>Fisioterapia — Reportes</h1>
          </div>
          <button onClick={function(){setFisF({client:"",date:td,trainDate:"",zones:"",notes:"",plan:""});setSFis(true);}} style={{padding:"8px 16px",background:"linear-gradient(135deg,#a78bfa,#7c3aed)",border:"none",borderRadius:9,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Nuevo Reporte</button>
        </div>
      </div>
      <div style={{maxWidth:1100,margin:"0 auto",padding:20}}>
        {/* Alertas de hoy */}
        {fisioAlerts.length>0&&<div style={{background:"rgba(167,139,250,.06)",border:"1px solid rgba(167,139,250,.2)",borderRadius:14,padding:"14px 20px",marginBottom:20}}>
          <div style={{fontSize:13,fontWeight:700,color:"#a78bfa",marginBottom:8}}>⚠️ {fisioAlerts.length} cliente{fisioAlerts.length>1?"s":""} con entreno hoy tras fisio</div>
          {fisioAlerts.map(function(f){return<div key={f.id} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",fontSize:12}}>
            <span style={{fontWeight:700}}>{f.client}</span>
            <span style={{color:T.text2}}>— {f.zones}</span>
            <span style={{color:"#a78bfa",marginLeft:"auto",fontSize:11}}>Entrenar: {f.trainDate}</span>
          </div>;})}
        </div>}
        {/* Lista de reportes */}
        <div style={B}>{(function(){
          var ls=fis.slice().sort(function(a,b){return(b.date||"").localeCompare(a.date||"");});
          if(!ls.length)return<div style={{padding:40,textAlign:"center",color:"#475569"}}><div style={{fontSize:40,opacity:0.2,marginBottom:10}}>🩺</div>Sin reportes aún</div>;
          return ls.map(function(f){
            var isAlert=!f.done&&f.trainDate&&f.trainDate<=td;
            var isPast=f.trainDate&&f.trainDate<td&&!f.done;
            return<div key={f.id} style={{padding:"14px 18px",borderBottom:"1px solid #2d3660",background:isAlert?"rgba(167,139,250,.04)":"transparent",opacity:f.done?0.45:1}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                <button onClick={function(){var u=Object.assign({},f,{done:!f.done});setFis(function(p){return p.map(function(x){return x.id===f.id?u:x;});});saveFisio(u);}} style={{width:20,height:20,borderRadius:6,border:f.done?"2px solid #22c55e":"2px solid #3a4570",background:f.done?"#22c55e":"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:10,color:"#fff"}}>{f.done?"✓":""}</button>
                <span style={{fontSize:15,fontWeight:700,textDecoration:f.done?"line-through":"none"}}>{f.client}</span>
                {isAlert&&<span style={{fontSize:9,padding:"2px 8px",borderRadius:6,background:isPast?"#ef444415":"#a78bfa15",color:isPast?"#ef4444":"#a78bfa",fontWeight:700}}>{isPast?"⚠️ PASADO":"📌 ENTRENAR HOY"}</span>}
              </div>
              <div style={{display:"flex",gap:14,fontSize:11,color:"#64748b",marginBottom:4}}>
                <span>📅 Sesión fisio: {f.date}</span>
                {f.trainDate&&<span>🏋️ Entreno: {f.trainDate}</span>}
              </div>
              {f.zones&&<div style={{fontSize:12,color:"#a78bfa",marginBottom:3}}>🎯 Zonas: {f.zones}</div>}
              {f.notes&&<div style={{fontSize:11,color:T.text2,marginBottom:3}}>📋 Valoración: {f.notes}</div>}
              {f.plan&&<div style={{fontSize:11,color:"#22c55e"}}>💪 Plan entreno: {f.plan}</div>}
              <button onClick={function(){setFis(function(p){return p.filter(function(x){return x.id!==f.id;});});deleteFisio(f.id);}} style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:11,marginTop:4}}>🗑️ Eliminar</button>
            </div>;
          });
        })()}</div>
      </div>
      {/* Modal nuevo reporte */}
      {sFis&&<div onClick={function(){setSFis(false);}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}><div onClick={function(e){e.stopPropagation();}} style={{background:T.bg2,borderRadius:16,padding:24,width:"92%",maxWidth:500,border:"1px solid "+T.border2,maxHeight:"90vh",overflowY:"auto"}}>
        <h2 style={{margin:"0 0 16px",fontSize:17,fontWeight:700}}>🩺 Nuevo Reporte de Fisioterapia</h2>
        <div style={{marginBottom:10}}><label style={{fontSize:11,color:"#8892a4",display:"block",marginBottom:4,fontWeight:600}}>CLIENTE</label><select value={fisF.client} onChange={function(e){setFisF(Object.assign({},fisF,{client:e.target.value}));}} style={iS}><option value="">Seleccionar cliente...</option>{cl.map(function(c){return<option key={c.id} value={c.name}>{c.name}</option>;})}</select></div>
        <div style={{display:"flex",gap:8,marginBottom:10}}>
          <div style={{flex:1}}><label style={{fontSize:11,color:"#8892a4",display:"block",marginBottom:4,fontWeight:600}}>FECHA SESIÓN FISIO</label><input type="date" value={fisF.date} onChange={function(e){setFisF(Object.assign({},fisF,{date:e.target.value}));}} style={iS}/></div>
          <div style={{flex:1}}><label style={{fontSize:11,color:"#8892a4",display:"block",marginBottom:4,fontWeight:600}}>1er ENTRENO DESPUÉS</label><input type="date" value={fisF.trainDate} onChange={function(e){setFisF(Object.assign({},fisF,{trainDate:e.target.value}));}} style={iS}/></div>
        </div>
        <div style={{marginBottom:10}}><label style={{fontSize:11,color:"#8892a4",display:"block",marginBottom:4,fontWeight:600}}>ZONAS TRABAJADAS</label><input value={fisF.zones} onChange={function(e){setFisF(Object.assign({},fisF,{zones:e.target.value}));}} placeholder="Lumbar, cervical, rodilla..." style={iS}/></div>
        <div style={{marginBottom:10}}><label style={{fontSize:11,color:"#8892a4",display:"block",marginBottom:4,fontWeight:600}}>VALORACIÓN DE LA SESIÓN</label><textarea value={fisF.notes} onChange={function(e){setFisF(Object.assign({},fisF,{notes:e.target.value}));}} placeholder="Cómo ha ido la sesión, qué se ha encontrado..." style={{width:"100%",minHeight:70,padding:10,background:T.bg3,border:"1px solid "+T.border2,borderRadius:9,color:T.text,fontSize:13,outline:"none",resize:"vertical",boxSizing:"border-box"}}/></div>
        <div style={{marginBottom:10}}><label style={{fontSize:11,color:"#8892a4",display:"block",marginBottom:4,fontWeight:600}}>QUÉ TRABAJAR EN ENTRENAMIENTO</label><textarea value={fisF.plan} onChange={function(e){setFisF(Object.assign({},fisF,{plan:e.target.value}));}} placeholder="Evitar carga lumbar, trabajar core, estiramientos..." style={{width:"100%",minHeight:70,padding:10,background:T.bg3,border:"1px solid "+T.border2,borderRadius:9,color:T.text,fontSize:13,outline:"none",resize:"vertical",boxSizing:"border-box"}}/></div>
        <div style={{display:"flex",gap:8}}><button onClick={function(){setSFis(false);}} style={{flex:1,padding:10,background:"#2d3660",border:"1px solid "+T.border2,borderRadius:9,color:T.text2,fontSize:12,fontWeight:600,cursor:"pointer"}}>Cancelar</button><button onClick={function(){if(!fisF.client)return;var nf=Object.assign({id:gid(),done:false},fisF);setFis(function(p){return p.concat([nf]);});saveFisio(nf);setSFis(false);}} style={{flex:1,padding:10,background:"linear-gradient(135deg,#a78bfa,#7c3aed)",border:"none",borderRadius:9,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>Crear Reporte</button></div>
      </div></div>}
    </div>
  );

  /* ═══ ENTRENAMIENTO ═══ */
  return(<div style={{minHeight:"100vh",background:T.bg,color:T.text,fontFamily:"'DM Sans',sans-serif"}}>
  <div style={{background:dk?"linear-gradient(135deg,#1a2040,#1a2140)":"#394265",borderBottom:"1px solid "+T.border,position:"sticky",top:0,zIndex:50}}>
  <div style={{maxWidth:1100,margin:"0 auto",padding:"0 20px"}}>
  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",height:56}}>
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      <button onClick={function(){setSec("home");}} style={{padding:"6px 12px",background:dk?"#2d3660":"rgba(255,255,255,.15)",border:"1px solid "+(dk?"#3a4570":"rgba(255,255,255,.2)"),borderRadius:8,color:dk?"#94a3b8":"#fff",fontSize:11,fontWeight:600,cursor:"pointer"}}>← Inicio</button>
      <img src="/logo.png" alt="time2train" style={{height:24,filter:"brightness(0) invert(1)"}}/>
      <span style={{fontSize:16,fontWeight:800,color:dk?"#e2e8f0":"#fff"}}>T2Tcrm</span>
    </div>
    <div style={{display:"flex",gap:8,alignItems:"center"}}>
      {/* Indicador última actualización */}
      {lastSyncAt&&(function(){
        var secs=Math.floor((Date.now()-lastSyncAt.getTime())/1000);
        var mins=Math.floor(secs/60);
        var stale=secs>5*60; // >5min = datos antiguos
        var label=secs<60?"hace "+secs+"s":mins<60?"hace "+mins+"min":"hace "+Math.floor(mins/60)+"h";
        return <span style={{fontSize:10,color:stale?"#fbbf24":(dk?"#94a3b8":"rgba(255,255,255,.7)"),fontWeight:600,padding:"4px 8px",borderRadius:6,background:stale?"rgba(251,191,36,.15)":"transparent",border:stale?"1px solid rgba(251,191,36,.4)":"none",whiteSpace:"nowrap"}} title={"Última sincronización: "+lastSyncAt.toLocaleString("es-ES")}>{stale?"⚠️ ":"✓ "}{label}</span>;
      })()}
      <button onClick={refreshAll} title={timpSyncing?"Sincronizando...":"Refrescar TODO el CRM"} disabled={timpSyncing} style={{width:36,height:36,borderRadius:9,background:timpSyncing?"rgba(34,197,94,.2)":(dk?"#2d3660":"rgba(255,255,255,.15)"),border:"1px solid "+(dk?"#3a4570":"rgba(255,255,255,.2)"),display:"flex",alignItems:"center",justifyContent:"center",cursor:timpSyncing?"wait":"pointer",fontSize:16,position:"relative"}}>
        <span style={{display:"inline-block",animation:timpSyncing?"spin 1s linear infinite":"none"}}>🔄</span>
      </button>
      <button onClick={function(){setTheme(dk?"light":"dark");}} style={{width:36,height:36,borderRadius:9,background:dk?"#2d3660":"rgba(255,255,255,.15)",border:"1px solid "+(dk?"#3a4570":"rgba(255,255,255,.2)"),display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:16}}>{dk?"☀️":"🌙"}</button>
      <button onClick={function(){setMv("seguimiento");}} style={{position:"relative",width:36,height:36,borderRadius:9,background:pc>0?"rgba(245,158,11,.1)":dk?"#2d3660":"rgba(255,255,255,.15)",border:"1px solid "+(dk?"#3a4570":"rgba(255,255,255,.2)"),display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:16}}>🔔{pc>0&&<span style={{position:"absolute",top:-4,right:-4,width:16,height:16,borderRadius:8,background:"#ef4444",color:"#fff",fontSize:9,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>{pc}</span>}</button>
      <button onClick={function(){setFm({});setSA(true);}} style={{padding:"8px 16px",background:dk?"linear-gradient(135deg,#394265,#4a5580)":"rgba(255,255,255,.2)",border:"none",borderRadius:9,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Cliente</button>
    </div>
  </div>
  <div style={{display:"flex",gap:4,padding:"6px 0",overflowX:"auto"}}>{[["clientes","📊","Fichas"],["panel","👥","Clientes"],["seguimiento","📋","Seguimiento"],["leads","🎯","Leads"],["renovaciones","🔄","Renovaciones"],["pagos","💰","Pagos"],["cancelaciones","🚫","Cancelaciones"],["horarios","📅","Horarios"],["bonus","🏆","Bonus"]].map.map(function(x){var active=mv===x[0];return<button key={x[0]} onClick={function(){setMv(x[0]);}} style={{padding:"12px 16px",border:"none",borderBottom:active?"3px solid "+(dk?"#8ba3d9":"#fff"):"3px solid transparent",background:active?(dk?"rgba(99,102,241,.1)":"rgba(255,255,255,.15)"):"transparent",color:active?(dk?"#e2e8f0":"#fff"):(dk?"#64748b":"rgba(255,255,255,.5)"),fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6,borderRadius:"8px 8px 0 0",whiteSpace:"nowrap"}}><span style={{fontSize:16}}>{x[1]}</span>{x[2]}{x[0]==="seguimiento"&&pc>0?<span style={{fontSize:9,padding:"2px 6px",borderRadius:8,background:"#ef4444",color:"#fff",fontWeight:800}}>{pc}</span>:null}</button>;})}</div>
  </div></div>

  <div style={{maxWidth:1100,margin:"0 auto",padding:"20px"}}>

  {/* Fisio alerts in entrenamiento */}
  {fisioAlerts.length>0&&mv==="clientes"&&<div style={{background:"rgba(167,139,250,.06)",border:"1px solid rgba(167,139,250,.2)",borderRadius:12,padding:"12px 16px",marginBottom:16}}>
    <div style={{fontSize:12,fontWeight:700,color:"#a78bfa"}}>🩺 {fisioAlerts.length} cliente{fisioAlerts.length>1?"s":""} con indicaciones de fisio para hoy</div>
    {fisioAlerts.slice(0,3).map(function(f){return<div key={f.id} style={{fontSize:11,color:T.text2,marginTop:4}}><b style={{color:T.text}}>{f.client}</b> — {f.plan||f.zones}</div>;})}
  </div>}

  {mv==="panel"&&<div>
    <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16}}>
      {[["Total",cn.t,"#e2e8f0"],["Activos",cn.a,"#22c55e"],["Pausados",cn.p,"#f59e0b"],["Baja",cn.b,"#ef4444"]].map(function(x){return<div key={x[0]} style={{background:T.bg2,borderRadius:14,padding:"22px 26px",border:"1px solid "+T.border,flex:"1 1 120px",minWidth:120}}><div style={{fontSize:34,fontWeight:900,color:x[2]}}>{x[1]}</div><div style={{fontSize:10,color:"#8892a4",marginTop:4,fontWeight:600,textTransform:"uppercase"}}>{x[0]}</div></div>;})}
    </div>
    {/* Search bar */}
    <div style={{marginBottom:14}}>
      <input placeholder="🔍 Buscar cliente..." value={sr} onChange={function(e){setSr(e.target.value);}} style={{width:"100%",padding:"11px 16px",background:T.bg3,border:"1px solid "+T.border2,borderRadius:10,color:T.text,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
    </div>
    <div style={{display:"flex",gap:6,marginBottom:16}}>{[["todos","Todos",cn.t],["activo","Activos",cn.a],["pausado","Pausados",cn.p],["baja","Baja",cn.b]].map(function(x){return<button key={x[0]} onClick={function(){setFs(x[0]);}} style={{padding:"7px 14px",borderRadius:9,border:fs===x[0]?"1px solid #6366f1":"1px solid #3a4570",background:fs===x[0]?"rgba(99,102,241,.1)":"transparent",color:fs===x[0]?"#e2e8f0":"#64748b",fontSize:11,fontWeight:600,cursor:"pointer"}}>{x[1]}({x[2]})</button>;})}</div>
    <div style={B}>{(function(){var ls=cl;if(fs!=="todos")ls=ls.filter(function(c){return c.status===fs;});if(sr.trim())ls=ls.filter(function(c){return c.name&&c.name.toLowerCase().indexOf(sr.toLowerCase())>=0;});if(!ls.length)return<div style={{padding:40,textAlign:"center",color:"#475569"}}>Sin clientes</div>;return ls.map(function(c){var s=ST[c.status]||ST.activo;return<div key={c.id} onClick={function(){openClient(c);setTab("perfil");setMv("clientes");}} style={{padding:"16px 20px",borderBottom:"1px solid #2d3660",display:"flex",alignItems:"center",gap:14,cursor:"pointer"}}><div style={{width:36,height:36,borderRadius:9,background:s.c+"15",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:s.c}}>{ini(c)}</div><div style={{flex:1,minWidth:0}}><div style={{fontSize:15,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</div><div style={{fontSize:10,color:"#64748b"}}>{c.objective}</div></div><select value={c.status} onClick={function(e){e.stopPropagation();}} onChange={function(e){var v=e.target.value;sv(function(p){return p.map(function(x){return x.id===c.id?Object.assign({},x,{status:v}):x;});});}} style={{padding:"4px 8px",background:s.c+"10",border:"1px solid "+s.c+"25",borderRadius:7,color:s.c,fontSize:10,fontWeight:600,outline:"none"}}>{Object.entries(ST).map(function(e){return<option key={e[0]} value={e[0]}>{e[1].l}</option>;})}</select><button onClick={function(e){e.stopPropagation();if(confirm("¿Eliminar DEFINITIVAMENTE a "+c.name+"?")){setCl(function(p){return p.filter(function(x){return x.id!==c.id;});});deleteClient(c.id);if(sel&&sel.id===c.id)setSel(null);}}} style={{padding:"6px 10px",background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",borderRadius:7,color:"#ef4444",fontSize:11,cursor:"pointer",fontWeight:600,flexShrink:0}}>🗑️</button></div>;});})()}</div>
  </div>}

  {mv==="clientes"&&<div>
    <div style={{marginBottom:18,position:"relative",maxWidth:400}}>
      <input placeholder="🔍 Buscar cliente..." value={sr} onChange={function(e){setSr(e.target.value);}} style={Object.assign({},iS,{padding:"11px 14px"})}/>
      {sr.length>0&&<div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:100,marginTop:4,background:T.bg2,borderRadius:11,border:"1px solid "+T.border2,maxHeight:240,overflowY:"auto"}}>
        {fi.length===0?<div style={{padding:16,textAlign:"center",color:"#64748b",fontSize:12}}>Sin resultados</div>
        :fi.slice(0,6).map(function(c){var s=ST[c.status]||ST.activo;return<div key={c.id} onClick={function(){openClient(c);setSr("");setTab("perfil");}} style={{padding:"10px 14px",borderBottom:"1px solid #2d3660",display:"flex",alignItems:"center",gap:9,cursor:"pointer"}}><div style={{width:30,height:30,borderRadius:8,background:s.c+"15",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:s.c}}>{ini(c)}</div><div style={{flex:1,fontSize:12,fontWeight:600}}>{c.name}</div></div>;})}
      </div>}
    </div>
    {sel?<div style={B}>
      <div style={{padding:"18px 20px 14px",borderBottom:"1px solid #2d3660"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:46,height:46,borderRadius:12,background:(ST[sel.status]||ST.activo).c+"15",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:800,color:(ST[sel.status]||ST.activo).c}}>{ini(sel)}</div>
          <div><h2 style={{margin:0,fontSize:22,fontWeight:800}}>{sel.name}</h2><div style={{fontSize:12,color:"#64748b",marginTop:3}}>{sel.age?sel.age+"a":""}{sel.objective?" · "+sel.objective:""}{sel.level?" · "+sel.level:""}</div></div>
        </div>
        <button onClick={function(){setEf({ei:et,date:td,series:"",weight:"",reps:"",notes:""});setSE(true);}} style={{marginTop:12,padding:"6px 14px",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",borderRadius:8,color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer"}}>🏋️ Marca</button>
      </div>
      <div style={{display:"flex",borderBottom:"1px solid #2d3660"}}>{[["perfil","👤 Perfil"],["bonos","💳 Bonos"],["ex","🏋️ Marcas"]].map(function(t){return<button key={t[0]} onClick={function(){setTab(t[0]);}} style={{flex:1,padding:"14px",background:"transparent",border:"none",borderBottom:tab===t[0]?"3px solid #6366f1":"3px solid transparent",color:tab===t[0]?"#e2e8f0":"#64748b",fontSize:13,fontWeight:700,cursor:"pointer"}}>{t[1]}</button>;})}</div>
      <div style={{padding:20}}>
        {tab==="bonos"&&<div>
          {(function(){
            var cb=getClientBonos(sel.name);
            if(!cb.length)return<div style={{textAlign:"center",padding:30,color:T.text3}}>
              <div style={{fontSize:40,opacity:0.2,marginBottom:10}}>💳</div>
              <div style={{fontSize:13}}>Sin datos de bonos</div>
              <div style={{fontSize:11,marginTop:6}}>Importa las cuotas vigentes desde la pantalla de inicio</div>
            </div>;
            // Sort: most recent first
            cb.sort(function(a,b){
              var da=a.fechaValor?new Date(a.fechaValor):new Date(0);
              var db=b.fechaValor?new Date(b.fechaValor):new Date(0);
              return db-da;
            });
            // Summary
            var totalSes=cb.reduce(function(s,b){return s+(b.totalSesiones||0);},0);
            var usadas=cb.reduce(function(s,b){return s+(b.usadas||0);},0);
            var sinCanjear=cb.reduce(function(s,b){return s+(b.sinCanjear||0);},0);
            var enUso=cb.reduce(function(s,b){return s+(b.enUso||0);},0);
            var caducadas=cb.reduce(function(s,b){return s+(b.caducadas||0);},0);
            var pendientes=totalSes-usadas-caducadas;
            return<div>
              {/* Summary cards */}
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:18}}>
                {[["Total",totalSes,"#e2e8f0"],["Usadas",usadas,"#22c55e"],["Sin canjear",sinCanjear,"#f59e0b"],["En uso",enUso,"#3b82f6"],["Caducadas",caducadas,"#ef4444"]].map(function(x){
                  return<div key={x[0]} style={{flex:"1 1 80px",background:T.bg3,borderRadius:10,padding:"12px 10px",textAlign:"center",border:"1px solid "+T.border}}>
                    <div style={{fontSize:22,fontWeight:900,color:x[2]}}>{x[1]}</div>
                    <div style={{fontSize:9,color:T.text3,fontWeight:600,textTransform:"uppercase",marginTop:2}}>{x[0]}</div>
                  </div>;
                })}
              </div>
              {/* Bono list */}
              {cb.map(function(b,i){
                var pct=b.totalSesiones>0?Math.round((b.usadas/b.totalSesiones)*100):0;
                var isActive=b.sinCanjear>0||b.enUso>0;
                var fv=b.fechaValor;
                var fechaStr="";
                if(fv){
                  try{var d=new Date(fv);fechaStr=d.toLocaleDateString("es-ES",{day:"numeric",month:"short",year:"numeric"});}catch(e){fechaStr=String(fv);}
                }
                return<div key={i} style={{background:T.bg3,borderRadius:12,padding:16,marginBottom:10,border:"1px solid "+(isActive?"#6366f130":T.border)}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <div>
                      <div style={{fontSize:14,fontWeight:700,color:T.text}}>{b.tipoBono||b.concepto}</div>
                      <div style={{fontSize:11,color:T.text3,marginTop:2}}>{fechaStr}{b.formaPago?" · "+b.formaPago:""}</div>
                    </div>
                    <span style={{fontSize:10,padding:"3px 10px",borderRadius:6,background:isActive?"#6366f115":"#47556915",color:isActive?"#818cf8":"#64748b",fontWeight:700}}>{isActive?"En curso":"Finalizado"}</span>
                  </div>
                  {/* Progress bar */}
                  <div style={{background:T.border,borderRadius:6,height:8,marginBottom:10,overflow:"hidden"}}>
                    <div style={{display:"flex",height:"100%"}}>
                      <div style={{width:pct+"%",background:"#22c55e",transition:"width .3s"}}></div>
                      {b.caducadas>0&&<div style={{width:Math.round((b.caducadas/b.totalSesiones)*100)+"%",background:"#ef4444"}}></div>}
                    </div>
                  </div>
                  {/* Session details */}
                  <div style={{display:"flex",gap:12,fontSize:11,color:T.text2,flexWrap:"wrap"}}>
                    <span>📊 Total: <b style={{color:T.text}}>{b.totalSesiones}</b></span>
                    <span>✅ Usadas: <b style={{color:"#22c55e"}}>{b.usadas}</b></span>
                    {b.sinCanjear>0&&<span>🔄 Sin canjear: <b style={{color:"#f59e0b"}}>{b.sinCanjear}</b></span>}
                    {b.enUso>0&&<span>▶️ En uso: <b style={{color:"#3b82f6"}}>{b.enUso}</b></span>}
                    {b.caducadas>0&&<span>❌ Caducadas: <b style={{color:"#ef4444"}}>{b.caducadas}</b></span>}
                  </div>
                  {/* Payment info */}
                  {b.pendientePago>0&&<div style={{marginTop:8,fontSize:10,padding:"4px 10px",background:"#ef444410",borderRadius:6,color:"#ef4444",fontWeight:600}}>⚠️ Pendiente de pago: {b.pendientePago}€</div>}
                </div>;
              })}
            </div>;
          })()}
        </div>}
        {tab==="perfil"&&<div>
          <div style={{marginBottom:14}}><label style={{fontSize:11,color:"#8892a4",fontWeight:600,display:"block",marginBottom:5}}>EDAD</label><input type="number" value={sel.age||""} onChange={function(e){var v=e.target.value;setSel(function(p){return Object.assign({},p,{age:v});});sv(function(p){return p.map(function(c){return c.id===sel.id?Object.assign({},c,{age:v}):c;});});}} style={{width:100,padding:"9px 12px",background:T.bg3,border:"1px solid "+T.border2,borderRadius:9,color:T.text,fontSize:14,outline:"none"}}/></div>
          <div style={{marginBottom:14}}><label style={{fontSize:11,color:"#8892a4",fontWeight:600,display:"block",marginBottom:5}}>OBJETIVO</label><select value={sel.objective||""} onChange={function(e){var v=e.target.value;setSel(function(p){return Object.assign({},p,{objective:v});});sv(function(p){return p.map(function(c){return c.id===sel.id?Object.assign({},c,{objective:v}):c;});});}} style={iS}><option value="">—</option>{OBJ.map(function(o){return<option key={o} value={o}>{o}</option>;})}</select></div>
          <div style={{marginBottom:16}}><label style={{fontSize:11,color:"#8892a4",fontWeight:600,display:"block",marginBottom:8}}>CONDICIÓN FÍSICA</label><div style={{display:"flex",gap:8}}>{[["principiante","Principiante","🌱","#38bdf8"],["medio","Medio","💪","#f59e0b"],["avanzado","Avanzado","🔥","#ef4444"]].map(function(lv){return<button key={lv[0]} onClick={function(){setSel(function(p){return Object.assign({},p,{level:lv[0]});});sv(function(p){return p.map(function(c){return c.id===sel.id?Object.assign({},c,{level:lv[0]}):c;});});}} style={{flex:1,padding:"12px 6px",borderRadius:11,border:sel.level===lv[0]?"2px solid "+lv[3]:"2px solid #3a4570",background:sel.level===lv[0]?lv[3]+"10":"transparent",cursor:"pointer",textAlign:"center"}}><div style={{fontSize:24,marginBottom:3}}>{lv[2]}</div><div style={{fontSize:10,fontWeight:700,color:sel.level===lv[0]?lv[3]:"#64748b"}}>{lv[1]}</div></button>;})}</div></div>
          <div><label style={{fontSize:11,color:"#8892a4",fontWeight:600,display:"block",marginBottom:5}}>OBSERVACIONES</label><textarea value={sel.observations||""} onChange={function(e){var v=e.target.value;setSel(function(p){return Object.assign({},p,{observations:v});});sv(function(p){return p.map(function(c){return c.id===sel.id?Object.assign({},c,{observations:v}):c;});});}} style={{width:"100%",minHeight:60,padding:10,background:T.bg3,border:"1px solid "+T.border2,borderRadius:9,color:T.text,fontSize:13,outline:"none",resize:"vertical",fontFamily:"inherit",boxSizing:"border-box"}}/></div>
        </div>}
        {tab==="ex"&&<div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>{EX.map(function(x,i){var icons=["🏋️","🦵","💪","🍑","🏋️","💪","🏋️"];return<button key={i} onClick={function(){setEt(i);}} style={{padding:"10px 16px",borderRadius:10,border:et===i?"2px solid "+EXC[i]:"2px solid #3a4570",background:et===i?EXC[i]+"15":"#182038",color:et===i?EXC[i]:"#64748b",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:16}}>{icons[i]}</span>{EX[i]}</button>;})}</div>
          <h3 style={{margin:"0 0 12px",fontSize:18,fontWeight:800,color:EXC[et]}}>{EX[et]}</h3>
          <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead><tr style={{borderBottom:"1px solid #3a4570"}}>{["#","Fecha","S","Peso","R","Vol","Score","Δ%"].map(function(h){return<th key={h} style={{padding:"7px 5px",textAlign:"left",color:"#64748b",fontWeight:600,fontSize:9}}>{h}</th>;})}</tr></thead>
            <tbody>{(!sx[et]||!sx[et].records||sx[et].records.length===0)?<tr><td colSpan={8} style={{padding:20,textAlign:"center",color:"#475569"}}>Sin registros</td></tr>
            :sx[et].records.map(function(r,ri){var vol=cV(r.series,r.weight,r.reps),sc=cS(r.series,r.weight,r.reps),d=null;if(ri>0){var pr=sx[et].records[ri-1],ps=cS(pr.series,pr.weight,pr.reps);if(ps&&sc)d=((sc/ps)-1)*100;}
              return<tr key={ri} style={{borderBottom:"1px solid #2d3660"}}><td style={{padding:"7px 5px",color:"#8892a4"}}>{ri+1}</td><td style={{padding:"7px 5px"}}>{r.date}</td><td style={{padding:"7px 5px"}}>{r.series}</td><td style={{padding:"7px 5px",color:EXC[et],fontWeight:700}}>{r.weight}</td><td style={{padding:"7px 5px"}}>{r.reps}</td><td style={{padding:"7px 5px",color:T.text2}}>{vol?vol.toFixed(0):"-"}</td><td style={{padding:"7px 5px",color:"#a78bfa",fontWeight:600}}>{sc||"-"}</td><td style={{padding:"7px 5px",color:d===null?"#475569":d>=0?"#22c55e":"#ef4444",fontWeight:600}}>{d!==null?(d>=0?"+":"")+d.toFixed(1)+"%":"—"}</td></tr>;})}</tbody>
          </table></div>
        </div>}
      </div>
    </div>:<div style={{background:T.bg2,borderRadius:14,border:"1px solid "+T.border,padding:50,textAlign:"center",color:"#475569"}}>🔍 Busca un cliente</div>}
  </div>}

  {mv==="seguimiento"&&<div>
    <div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}><h2 style={{margin:0,fontSize:24,fontWeight:800}}>📋 Seguimiento</h2><button onClick={function(){setFf({cn:"",reason:"baja",date:td,msg:""});setSFu(true);}} style={{padding:"8px 16px",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",borderRadius:9,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Nuevo</button></div>
    <div style={{display:"flex",gap:5,marginBottom:14}}>{[["pendientes","Pend."],["hoy","Hoy"],["todos","Todos"]].map(function(x){var n=x[0]==="pendientes"?fu.filter(function(f){return!f.done;}).length:x[0]==="hoy"?fu.filter(function(f){return!f.done&&f.date<=td;}).length:fu.length;return<button key={x[0]} onClick={function(){setFuf(x[0]);}} style={{padding:"7px 14px",borderRadius:9,border:fuf===x[0]?"1px solid #6366f1":"1px solid #3a4570",background:fuf===x[0]?"rgba(99,102,241,.1)":"transparent",color:fuf===x[0]?"#e2e8f0":"#64748b",fontSize:11,fontWeight:600,cursor:"pointer"}}>{x[1]}({n})</button>;})}</div>
    <div style={B}>{(function(){var ls=fu.slice();if(fuf==="pendientes")ls=ls.filter(function(f){return!f.done;});else if(fuf==="hoy")ls=ls.filter(function(f){return!f.done&&f.date<=td;});ls.sort(function(a,b){return a.date<b.date?-1:1;});if(!ls.length)return<div style={{padding:40,textAlign:"center",color:"#475569"}}>Sin seguimientos</div>;return ls.map(function(f){var r=FR.find(function(x){return x.v===f.reason;})||FR[6];var ov=!f.done&&f.date<td,it=f.date===td;return<div key={f.id} style={{padding:"12px 18px",borderBottom:"1px solid #2d3660",display:"flex",alignItems:"center",gap:10,opacity:f.done?0.45:1}}><button onClick={function(){var u=Object.assign({},f,{done:!f.done});setFu(function(p){return p.map(function(x){return x.id===f.id?u:x;});});saveFu(u);}} style={{width:20,height:20,borderRadius:6,border:f.done?"2px solid #22c55e":"2px solid #3a4570",background:f.done?"#22c55e":"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:10,color:"#fff"}}>{f.done?"✓":""}</button><span style={{fontSize:18}}>{r.i}</span><div style={{flex:1,minWidth:0}}><span style={{fontSize:13,fontWeight:700,textDecoration:f.done?"line-through":"none"}}>{f.clientName}</span> <span style={{fontSize:9,padding:"2px 6px",borderRadius:5,background:r.c+"15",color:r.c,fontWeight:600}}>{r.l}</span>{f.message&&<div style={{fontSize:10,color:T.text2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.message}</div>}</div><div style={{textAlign:"right"}}><div style={{fontSize:11,fontWeight:700,color:f.done?"#64748b":ov?"#ef4444":it?"#f59e0b":"#64748b"}}>{f.date}</div><div style={{fontSize:9,color:f.done?"#475569":ov?"#ef4444":it?"#f59e0b":"#475569",fontWeight:600}}>{f.done?"Hecho":ov?"⚠️Pasado":it?"📌HOY":"Prog."}</div></div><button onClick={function(){setFu(function(p){return p.filter(function(x){return x.id!==f.id;});});deleteFu(f.id);}} style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:12}}>🗑️</button></div>;});})()}</div>
  </div>}

  {mv==="leads"&&<div>
    <div style={{display:"flex",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:10}}><h2 style={{margin:0,fontSize:24,fontWeight:800}}>🎯 Leads</h2><button onClick={function(){setLf({name:"",phone:"",source:"",interest:"",status:"nada",contactDate:"",month:["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"][new Date().getMonth()],year:String(new Date().getFullYear())});setSL(true);}} style={{padding:"8px 16px",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",borderRadius:9,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Lead</button></div>
    <div style={{marginBottom:10}}><div style={{fontSize:10,color:"#8892a4",fontWeight:600,textTransform:"uppercase",marginBottom:6}}>Año</div><div style={{display:"flex",gap:5}}>{(function(){var years=["todos"];le.forEach(function(l){if(l.year&&years.indexOf(l.year)===-1)years.push(l.year);});years.sort();return years.map(function(y){var n=y==="todos"?le.length:le.filter(function(l){return l.year===y;}).length;return<button key={y} onClick={function(){setLyear(y);setLmonth("todos");}} style={{padding:"6px 14px",borderRadius:8,border:lyear===y?"1px solid #6366f1":"1px solid #2d3660",background:lyear===y?"rgba(99,102,241,.1)":"transparent",color:lyear===y?"#e2e8f0":"#64748b",fontSize:11,fontWeight:600,cursor:"pointer"}}>{y==="todos"?"Todos":y} ({n})</button>;});})()}</div></div>
    {lyear!=="todos"&&<div style={{marginBottom:10}}><div style={{fontSize:10,color:"#8892a4",fontWeight:600,textTransform:"uppercase",marginBottom:6}}>Mes</div><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{(function(){var order=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];var months=["todos"].concat(order);return months.map(function(m){var n=m==="todos"?le.filter(function(l){return l.year===lyear;}).length:le.filter(function(l){return l.year===lyear&&l.month===m;}).length;return<button key={m} onClick={function(){setLmonth(m);}} style={{padding:"5px 12px",borderRadius:8,border:lmonth===m?"1px solid #a78bfa":"1px solid "+T.border,background:lmonth===m?"rgba(167,139,250,.1)":"transparent",color:lmonth===m?"#a78bfa":n>0?T.text3:"#333842",fontSize:10,fontWeight:600,cursor:"pointer"}}>{m==="todos"?"Todos":m} ({n})</button>;});})()}</div></div>}
    <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:14}}>{LS.map(function(st){var c=le.filter(function(l){return l.status===st.v;}).length;return<button key={st.v} onClick={function(){setLfl(st.v);}} style={{padding:"5px 10px",borderRadius:8,border:lfl===st.v?"1px solid "+st.c:"1px solid #2d3660",background:lfl===st.v?st.c+"12":"transparent",color:lfl===st.v?st.c:"#94a3b8",fontSize:10,fontWeight:600,cursor:"pointer"}}>{st.i}{c}</button>;})} <button onClick={function(){setLfl("activos");}} style={{padding:"5px 10px",borderRadius:8,border:lfl==="activos"?"1px solid #6366f1":"1px solid #2d3660",color:lfl==="activos"?"#e2e8f0":"#64748b",background:lfl==="activos"?"rgba(99,102,241,.1)":"transparent",fontSize:10,fontWeight:600,cursor:"pointer"}}>Activos</button></div>
    <div style={B}>{(function(){var ls=le.slice();if(lyear!=="todos")ls=ls.filter(function(l){return l.year===lyear;});if(lmonth!=="todos")ls=ls.filter(function(l){return l.month===lmonth;});if(lfl==="activos")ls=ls.filter(function(l){return l.status!=="alta"&&l.status!=="perdido";});else ls=ls.filter(function(l){return l.status===lfl;});if(!ls.length)return<div style={{padding:40,textAlign:"center",color:"#475569"}}>{le.length===0?"Añade tu primer lead":"Sin leads con estos filtros"}</div>;return ls.map(function(l){var st=LS.find(function(x){return x.v===l.status;})||LS[0];var isAlta=l.status==="alta";return<div key={l.id} style={{padding:"12px 18px",borderBottom:isAlta?"1px solid rgba(34,197,94,.15)":"1px solid #2d3660",display:"flex",alignItems:"center",gap:10,background:isAlta?"rgba(34,197,94,.08)":"transparent"}}><span style={{fontSize:18}}>{st.i}</span><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:700,color:isAlta?"#22c55e":"#e2e8f0"}}>{l.name}{l.source?<span style={{fontSize:9,padding:"2px 5px",borderRadius:5,background:isAlta?"rgba(34,197,94,.15)":"#2d3660",color:isAlta?"#22c55e":"#94a3b8",marginLeft:6}}>{l.source}</span>:null}{l.month?<span style={{fontSize:9,padding:"2px 5px",borderRadius:5,background:T.bg3,color:"#64748b",marginLeft:4}}>{l.month} {l.year}</span>:null}</div><div style={{display:"flex",gap:10,fontSize:10,color:"#64748b"}}>{l.phone&&<span>📱 {l.phone}</span>}{l.contactDate&&<span>📅 {l.contactDate}</span>}{l.responsable&&<span>👤 {l.responsable}</span>}</div>{l.notes&&<div style={{fontSize:10,color:"#475569",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:400}}>{l.notes}</div>}</div><select value={l.status} onChange={function(e){var v=e.target.value;var u=Object.assign({},l,{status:v});setLe(function(p){return p.map(function(x){return x.id===l.id?u:x;});});saveLead(u);}} style={{padding:"4px 6px",background:st.c+"10",border:"1px solid "+st.c+"25",borderRadius:7,color:st.c,fontSize:9,fontWeight:600,outline:"none"}}>{LS.map(function(x){return<option key={x.v} value={x.v}>{x.i} {x.l}</option>;})}</select><button onClick={function(){setLe(function(p){return p.filter(function(x){return x.id!==l.id;});});deleteLead(l.id);}} style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:12}}>🗑️</button></div>;});})()}</div>
  </div>}


  {/* Suspense para lazy loading: muestra un spinner mientras carga el chunk del componente */}
  <Suspense fallback={<div style={{padding:40,textAlign:"center",color:T.text3,fontSize:13}}>⏳ Cargando...</div>}>

  {mv==="renovaciones"&&<Renovaciones
    theme={T}
    dk={dk}
    bonos={bonos}
    clients={cl}
    cuotasExcel={cuotasExcel}
    reservasExcel={reservasExcel}
    importReservas={importReservas}
    blacklist={blacklist}
    saveBlacklist={saveBlacklist}
    renData={renData}
    setRenData={setRenData}
    onSaveRenData={function(newData){
      dbSave("bonos_timp","renovacion_data",newData).catch(function(){});
    }}
    onChangeStatus={function(name,status){
      sv(function(p){return p.map(function(c){
        return matchesName(c.name,name) ? Object.assign({},c,{status:status}) : c;
      });});
    }}
    importCuotas={importCuotas}
  />}

  {mv==="pagos"&&<Pagos
    theme={T}
    dk={dk}
    bonos={bonos}
    clients={cl}
    onToggleCard={function(clientName,value){
      // Marca/desmarca manualmente timpHasCard del cliente y persiste
      sv(function(p){return p.map(function(c){
        return matchesName(c.name,clientName) ? Object.assign({},c,{timpHasCard:value}) : c;
      });});
    }}
  />}

  {mv==="cancelaciones"&&<Cancelaciones
    theme={T}
    dk={dk}
    refreshTrigger={refreshTrigger}
  />}

  {mv==="horarios"&&<div>
    <h2 style={{margin:"0 0 20px",fontSize:24,fontWeight:800}}>📅 Horarios</h2>
    <Horarios theme={T} dk={dk}/>
  </div>}
{mv==="bonus"&&<Suspense fallback={<div/>}><Bonus theme={T} dk={dk} bonos={bonos} clients={cl}/></Suspense>}

  </div>

  {/* MODALS */}
  {sA&&<div onClick={function(){setSA(false);}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}><div onClick={function(e){e.stopPropagation();}} style={{background:T.bg2,borderRadius:16,padding:24,width:"90%",maxWidth:460,border:"1px solid "+T.border2}}><h2 style={{margin:"0 0 16px",fontSize:17,fontWeight:700}}>➕ Nuevo Cliente</h2><div style={{marginBottom:10}}><label style={{fontSize:11,color:"#8892a4",display:"block",marginBottom:4,fontWeight:600}}>NOMBRE</label><input value={fm.name||""} onChange={function(e){setFm(Object.assign({},fm,{name:e.target.value}));}} style={iS}/></div><div style={{marginBottom:10}}><label style={{fontSize:11,color:"#8892a4",display:"block",marginBottom:4,fontWeight:600}}>TELÉFONO</label><input value={fm.phone||""} onChange={function(e){setFm(Object.assign({},fm,{phone:e.target.value}));}} style={iS}/></div><div style={{display:"flex",gap:8}}><button onClick={function(){setSA(false);}} style={{flex:1,padding:10,background:"#2d3660",border:"1px solid "+T.border2,borderRadius:9,color:T.text2,fontSize:12,fontWeight:600,cursor:"pointer"}}>Cancelar</button><button onClick={function(){if(!fm.name)return;var nc=Object.assign({id:gid(),status:"activo",objective:OBJ[0],exercises:eEx(),observations:"",age:"",level:""},fm);setCl(function(p){return[nc].concat(p);});saveClient(nc);setSA(false);setFm({});}} style={{flex:1,padding:10,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",borderRadius:9,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>Añadir</button></div></div></div>}

  {sE&&<div onClick={function(){setSE(false);}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}><div onClick={function(e){e.stopPropagation();}} style={{background:T.bg2,borderRadius:16,padding:24,width:"90%",maxWidth:460,border:"1px solid "+T.border2}}><h2 style={{margin:"0 0 14px",fontSize:17,fontWeight:700}}>🏋️ Marca - {sel?sel.name:""}</h2><div style={{marginBottom:10}}><label style={{fontSize:11,color:"#8892a4",display:"block",marginBottom:4,fontWeight:600}}>EJERCICIO</label><select value={ef.ei} onChange={function(e){setEf(Object.assign({},ef,{ei:+e.target.value}));}} style={iS}>{EX.map(function(x,i){return<option key={i} value={i}>{x}</option>;})}</select></div><div style={{marginBottom:10}}><label style={{fontSize:11,color:"#8892a4",display:"block",marginBottom:4,fontWeight:600}}>FECHA</label><input type="date" value={ef.date} onChange={function(e){setEf(Object.assign({},ef,{date:e.target.value}));}} style={iS}/></div><div style={{display:"flex",gap:6,marginBottom:10}}><div style={{flex:1}}><label style={{fontSize:11,color:"#8892a4",display:"block",marginBottom:4,fontWeight:600}}>SERIES</label><input type="number" value={ef.series} onChange={function(e){setEf(Object.assign({},ef,{series:e.target.value}));}} placeholder="3" style={iS}/></div><div style={{flex:1}}><label style={{fontSize:11,color:"#8892a4",display:"block",marginBottom:4,fontWeight:600}}>PESO</label><input type="number" value={ef.weight} onChange={function(e){setEf(Object.assign({},ef,{weight:e.target.value}));}} placeholder="40" style={iS}/></div><div style={{flex:1}}><label style={{fontSize:11,color:"#8892a4",display:"block",marginBottom:4,fontWeight:600}}>REPS</label><input type="number" value={ef.reps} onChange={function(e){setEf(Object.assign({},ef,{reps:e.target.value}));}} placeholder="10" style={iS}/></div></div><div style={{display:"flex",gap:8}}><button onClick={function(){setSE(false);}} style={{flex:1,padding:10,background:"#2d3660",border:"1px solid "+T.border2,borderRadius:9,color:T.text2,fontSize:12,fontWeight:600,cursor:"pointer"}}>Cancelar</button><button onClick={function(){if(!ef.date||!ef.weight)return;var rec={date:ef.date,series:+ef.series||1,weight:+ef.weight,reps:+ef.reps||1,notes:ef.notes||""};var idx=ef.ei;sv(function(p){return p.map(function(c){if(c.id!==sel.id)return c;var exs=(c.exercises||eEx()).slice();exs[idx]=Object.assign({},exs[idx],{records:(exs[idx].records||[]).concat([rec]).sort(function(a,b){return a.date<b.date?-1:1;})});return Object.assign({},c,{exercises:exs});});});setSel(function(p){var exs=(p.exercises||eEx()).slice();exs[idx]=Object.assign({},exs[idx],{records:(exs[idx].records||[]).concat([rec]).sort(function(a,b){return a.date<b.date?-1:1;})});return Object.assign({},p,{exercises:exs});});setSE(false);}} style={{flex:1,padding:10,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",borderRadius:9,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>Guardar</button></div></div></div>}

  {sFu&&<div onClick={function(){setSFu(false);}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}><div onClick={function(e){e.stopPropagation();}} style={{background:T.bg2,borderRadius:16,padding:24,width:"90%",maxWidth:460,border:"1px solid "+T.border2}}><h2 style={{margin:"0 0 14px",fontSize:17,fontWeight:700}}>📋 Seguimiento</h2><div style={{marginBottom:10}}><label style={{fontSize:11,color:"#8892a4",display:"block",marginBottom:4,fontWeight:600}}>CLIENTE</label><input value={ff.cn} onChange={function(e){setFf(Object.assign({},ff,{cn:e.target.value}));}} style={iS}/></div><div style={{marginBottom:10}}><label style={{fontSize:11,color:"#8892a4",display:"block",marginBottom:4,fontWeight:600}}>MOTIVO</label><select value={ff.reason} onChange={function(e){setFf(Object.assign({},ff,{reason:e.target.value}));}} style={iS}>{FR.map(function(r){return<option key={r.v} value={r.v}>{r.i} {r.l}</option>;})}</select></div><div style={{marginBottom:10}}><label style={{fontSize:11,color:"#8892a4",display:"block",marginBottom:4,fontWeight:600}}>FECHA</label><input type="date" value={ff.date} onChange={function(e){setFf(Object.assign({},ff,{date:e.target.value}));}} style={iS}/></div><div style={{marginBottom:10}}><label style={{fontSize:11,color:"#8892a4",display:"block",marginBottom:4,fontWeight:600}}>MENSAJE</label><textarea value={ff.msg} onChange={function(e){setFf(Object.assign({},ff,{msg:e.target.value}));}} style={{width:"100%",minHeight:50,padding:10,background:T.bg3,border:"1px solid "+T.border2,borderRadius:9,color:T.text,fontSize:13,outline:"none",resize:"vertical",boxSizing:"border-box"}}/></div><div style={{display:"flex",gap:8}}><button onClick={function(){setSFu(false);}} style={{flex:1,padding:10,background:"#2d3660",border:"1px solid "+T.border2,borderRadius:9,color:T.text2,fontSize:12,fontWeight:600,cursor:"pointer"}}>Cancelar</button><button onClick={function(){if(!ff.cn||!ff.date)return;var nf={id:gid(),clientName:ff.cn,reason:ff.reason,date:ff.date,message:ff.msg,done:false};setFu(function(p){return p.concat([nf]);});saveFu(nf);setSFu(false);}} style={{flex:1,padding:10,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",borderRadius:9,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>Crear</button></div></div></div>}

  {sL&&<div onClick={function(){setSL(false);}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}><div onClick={function(e){e.stopPropagation();}} style={{background:T.bg2,borderRadius:16,padding:24,width:"90%",maxWidth:460,border:"1px solid "+T.border2,maxHeight:"90vh",overflowY:"auto"}}><h2 style={{margin:"0 0 14px",fontSize:17,fontWeight:700}}>🎯 Nuevo Lead</h2><div style={{marginBottom:10}}><label style={{fontSize:11,color:"#8892a4",display:"block",marginBottom:4,fontWeight:600}}>NOMBRE</label><input value={lf.name} onChange={function(e){setLf(Object.assign({},lf,{name:e.target.value}));}} style={iS}/></div><div style={{marginBottom:10}}><label style={{fontSize:11,color:"#8892a4",display:"block",marginBottom:4,fontWeight:600}}>TELÉFONO</label><input value={lf.phone} onChange={function(e){setLf(Object.assign({},lf,{phone:e.target.value}));}} style={iS}/></div><div style={{marginBottom:10}}><label style={{fontSize:11,color:"#8892a4",display:"block",marginBottom:4,fontWeight:600}}>ORIGEN</label><input value={lf.source} onChange={function(e){setLf(Object.assign({},lf,{source:e.target.value}));}} placeholder="Instagram, calle..." style={iS}/></div><div style={{marginBottom:10}}><label style={{fontSize:11,color:"#8892a4",display:"block",marginBottom:4,fontWeight:600}}>FECHA DE CONTACTO</label><input type="date" value={lf.contactDate||""} onChange={function(e){setLf(Object.assign({},lf,{contactDate:e.target.value}));}} style={iS}/></div><div style={{display:"flex",gap:6,marginBottom:10}}><div style={{flex:1}}><label style={{fontSize:11,color:"#8892a4",display:"block",marginBottom:4,fontWeight:600}}>MES</label><select value={lf.month||""} onChange={function(e){setLf(Object.assign({},lf,{month:e.target.value}));}} style={iS}>{["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"].map(function(m){return<option key={m} value={m}>{m}</option>;})}</select></div><div style={{flex:1}}><label style={{fontSize:11,color:"#8892a4",display:"block",marginBottom:4,fontWeight:600}}>AÑO</label><select value={lf.year||""} onChange={function(e){setLf(Object.assign({},lf,{year:e.target.value}));}} style={iS}>{["2025","2026","2027"].map(function(y){return<option key={y} value={y}>{y}</option>;})}</select></div></div><div style={{marginBottom:10}}><label style={{fontSize:11,color:"#8892a4",display:"block",marginBottom:4,fontWeight:600}}>ESTADO DE VENTA</label><select value={lf.status} onChange={function(e){setLf(Object.assign({},lf,{status:e.target.value}));}} style={iS}>{LS.map(function(x){return<option key={x.v} value={x.v}>{x.i} {x.l}</option>;})}</select></div><div style={{marginBottom:10}}><label style={{fontSize:11,color:"#8892a4",display:"block",marginBottom:4,fontWeight:600}}>INTERÉS</label><input value={lf.interest} onChange={function(e){setLf(Object.assign({},lf,{interest:e.target.value}));}} placeholder="Perder peso..." style={iS}/></div><div style={{display:"flex",gap:8}}><button onClick={function(){setSL(false);}} style={{flex:1,padding:10,background:"#2d3660",border:"1px solid "+T.border2,borderRadius:9,color:T.text2,fontSize:12,fontWeight:600,cursor:"pointer"}}>Cancelar</button><button onClick={function(){if(!lf.name)return;var nl=Object.assign({id:gid()},lf);setLe(function(p){return p.concat([nl]);});saveLead(nl);setSL(false);}} style={{flex:1,padding:10,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",borderRadius:9,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>Añadir</button></div></div></div>}

  <Suspense fallback={null}>
  <AIAssistant theme={T} dk={dk} clients={cl} followups={fu} leads={le} fisio={fis} bonos={bonos} timpData={timpData} renData={renData} actions={{
    navigate:function(section,subview){setSec(section);if(subview)setMv(subview);},
    selectClient:function(c){openClient(c);setTab("perfil");setSec("entrenamiento");setMv("clientes");},
    createFollowup:function(data){var nf={id:gid(),clientName:data.client,reason:data.reason,date:data.date,message:data.message,done:false};setFu(function(p){return p.concat([nf]);});saveFu(nf);},
    createLead:function(data){var nl={id:gid(),name:data.name,phone:data.phone,source:data.source,interest:"",status:data.status,month:data.month,year:data.year};setLe(function(p){return p.concat([nl]);});saveLead(nl);},
    changeStatus:function(name,status){sv(function(p){return p.map(function(c){return c.name.toLowerCase().indexOf(name.toLowerCase())>=0?Object.assign({},c,{status:status}):c;});});},
    changeRenovacion:changeRenovacion,
    moveRenovacion:moveRenovacion
  }}/>
  </Suspense>

  </div>);
}
