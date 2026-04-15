import { useState, useEffect } from "react";

var MONTHS=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
var DAYS_ES=["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

function getMonday(d){var date=new Date(d);var day=date.getDay();date.setDate(date.getDate()-(day===0?6:day-1));date.setHours(0,0,0,0);return date;}
function localKey(d){var dd=new Date(d);var y=dd.getFullYear(),m=dd.getMonth()+1,day=dd.getDate();return y+"-"+(m<10?"0":"")+m+"-"+(day<10?"0":"")+day;}

export default function Dashboard(props){
  var T=props.theme;var dk=props.dk;
  var cl=props.clients||[];var le=props.leads||[];var fu=props.followups||[];var fis=props.fisio||[];
  var timpData=props.timpData||null;var bonos=props.bonos||[];
  var _=useState;
  var m_=_(new Date().getMonth()),selM=m_[0],setSelM=m_[1];

  var now=new Date();var td=localKey(now);
  var thisMonday=getMonday(now);
  var monthName=MONTHS[selM];

  // Client stats
  var activos=cl.filter(function(c){return c.status==="activo";});
  var bajas=cl.filter(function(c){return c.status==="baja";});

  // ═══ RENOVACIONES THIS WEEK ═══
  var renThisWeek=[];
  var renPendientes=0;var renRenovados=0;var renMitad=0;
  if(bonos.length>0){
    var seen={};
    bonos.forEach(function(b){
      var fv=b.fechaValor?new Date(b.fechaValor):null;
      if(!fv||isNaN(fv))return;
      var monday=getMonday(fv);
      if(localKey(monday)!==localKey(thisMonday))return;
      var key=b.nombre+"__"+localKey(monday);
      if(seen[key])return;seen[key]=true;
      var pagado=!!b.pagado;var mitad=!!b.mitadPagada;var reserva=!!b.esReserva;
      renThisWeek.push({nombre:b.nombre,precio:b.precio||0,pagado:pagado,mitad:mitad,reserva:reserva});
      if(pagado)renRenovados++;
      else if(mitad||reserva)renMitad++;
      else renPendientes++;
    });
  }

  // ═══ DEUDA TOTAL ═══
  var deudaTotal=0;var pagosPendientes=0;
  var seenPagos={};
  bonos.forEach(function(b){
    var caption=(b.tipoBono||b.concepto||"").toLowerCase();
    var isEnt=caption.includes("time")||caption.includes("partner")||caption.includes("pro")||caption.includes("bono")||caption.includes("sesion")||caption.includes("dual");
    if(!isEnt)return;
    var key=b.nombre+"__"+(b.fechaValor||"");
    if(seenPagos[key])return;seenPagos[key]=true;
    if(!b.pagado){
      var precio=b.precio||b.total||0;
      var pagado=b.importePagado||0;
      var pend=b.fraccionado?precio-pagado:precio;
      if(pend>0){deudaTotal+=pend;pagosPendientes++;}
    }
  });

  // ═══ IN-APP MIGRATION ═══
  var clientMethods={};
  bonos.forEach(function(b){
    var caption=(b.tipoBono||b.concepto||"").toLowerCase();
    var isEnt=caption.includes("time")||caption.includes("partner")||caption.includes("pro")||caption.includes("bono")||caption.includes("sesion")||caption.includes("dual");
    if(!isEnt||!b.nombre)return;
    var fv=b.fechaValor||"";
    if(!clientMethods[b.nombre]||fv>clientMethods[b.nombre].fv){
      clientMethods[b.nombre]={metodo:b.formaPago||"sin método",fv:fv};
    }
  });
  var allMethodClients=Object.keys(clientMethods);
  var inappCount=allMethodClients.filter(function(n){return clientMethods[n].metodo==="inapp";}).length;
  var inappPct=allMethodClients.length>0?Math.round((inappCount/allMethodClients.length)*100):0;

  // ═══ LEADS THIS MONTH ═══
  var mLeads=le.filter(function(l){return l.month===monthName;});
  var convertidos=mLeads.filter(function(l){return l.status==="alta";}).length;
  var perdidos=mLeads.filter(function(l){return l.status==="perdido";}).length;
  var tasaConversion=mLeads.length>0?Math.round((convertidos/mLeads.length)*100):0;

  // ═══ FOLLOWUPS ═══
  var pendFu=fu.filter(function(f){return!f.done;}).length;
  var overdueFu=fu.filter(function(f){return!f.done&&f.date<td;}).length;

  // ═══ TIMP LIVE ═══
  var timpActivos=timpData?timpData.filter(function(s){return s.active_membership;}).length:0;
  var timpPagoPend=timpData?timpData.filter(function(s){return s.active_membership&&s.payment_pending;}).length:0;

  var B={background:T.bg2,borderRadius:14,border:"1px solid "+T.border,overflow:"hidden"};

  return(<div>
    <h2 style={{margin:"0 0 20px",fontSize:24,fontWeight:900}}>📊 Dashboard</h2>

    {/* ═══ TOP KPIs ═══ */}
    <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:24}}>
      <div style={{flex:"1 1 140px",minWidth:140,background:T.bg2,borderRadius:14,border:"1px solid "+T.border,padding:"18px 20px",textAlign:"center"}}>
        <div style={{fontSize:36,fontWeight:900,color:"#22c55e"}}>{activos.length}</div>
        <div style={{fontSize:11,color:T.text3,fontWeight:600}}>CLIENTES ACTIVOS</div>
      </div>
      <div style={{flex:"1 1 140px",minWidth:140,background:T.bg2,borderRadius:14,border:"1px solid "+T.border,padding:"18px 20px",textAlign:"center"}}>
        <div style={{fontSize:36,fontWeight:900,color:"#ef4444"}}>{Math.round(deudaTotal).toLocaleString("es-ES")}€</div>
        <div style={{fontSize:11,color:T.text3,fontWeight:600}}>DEUDA PENDIENTE</div>
        <div style={{fontSize:10,color:"#ef4444",marginTop:2}}>{pagosPendientes} pagos</div>
      </div>
      <div style={{flex:"1 1 140px",minWidth:140,background:T.bg2,borderRadius:14,border:"1px solid "+T.border,padding:"18px 20px",textAlign:"center"}}>
        <div style={{fontSize:36,fontWeight:900,color:"#22c55e"}}>{inappPct}%</div>
        <div style={{fontSize:11,color:T.text3,fontWeight:600}}>MIGRACIÓN IN-APP</div>
        <div style={{fontSize:10,color:"#22c55e",marginTop:2}}>{inappCount}/{allMethodClients.length}</div>
      </div>
      <div style={{flex:"1 1 140px",minWidth:140,background:T.bg2,borderRadius:14,border:"1px solid "+T.border,padding:"18px 20px",textAlign:"center"}}>
        <div style={{fontSize:36,fontWeight:900,color:"#a78bfa"}}>{tasaConversion}%</div>
        <div style={{fontSize:11,color:T.text3,fontWeight:600}}>CONVERSIÓN LEADS</div>
        <div style={{fontSize:10,color:T.text3,marginTop:2}}>{convertidos} altas / {mLeads.length} leads</div>
      </div>
    </div>

    {/* ═══ ROW 2: Renovaciones + Seguimiento ═══ */}
    <div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:20}}>
      {/* Renovaciones esta semana */}
      <div style={Object.assign({},B,{flex:"1 1 300px",padding:20})}>
        <h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:800,color:T.text}}>🔄 Renovaciones esta semana</h3>
        {renThisWeek.length===0?<div style={{fontSize:12,color:T.text3}}>Sin renovaciones esta semana</div>:(
          <div>
            <div style={{display:"flex",gap:16,marginBottom:14}}>
              <div style={{textAlign:"center",flex:1}}><div style={{fontSize:28,fontWeight:900,color:"#22c55e"}}>{renRenovados}</div><div style={{fontSize:10,color:T.text3}}>Renovados</div></div>
              <div style={{textAlign:"center",flex:1}}><div style={{fontSize:28,fontWeight:900,color:"#6366f1"}}>{renMitad}</div><div style={{fontSize:10,color:T.text3}}>Mitad/Reserva</div></div>
              <div style={{textAlign:"center",flex:1}}><div style={{fontSize:28,fontWeight:900,color:"#f59e0b"}}>{renPendientes}</div><div style={{fontSize:10,color:T.text3}}>Pendientes</div></div>
            </div>
            {/* Progress bar */}
            <div style={{background:T.border,borderRadius:6,height:8,overflow:"hidden",display:"flex",marginBottom:10}}>
              <div style={{width:Math.round((renRenovados/renThisWeek.length)*100)+"%",background:"#22c55e"}}></div>
              <div style={{width:Math.round((renMitad/renThisWeek.length)*100)+"%",background:"#6366f1"}}></div>
            </div>
            {/* Pendientes list */}
            {renPendientes>0&&<div>
              <div style={{fontSize:11,color:"#f59e0b",fontWeight:700,marginBottom:6}}>⏳ Pendientes de cobrar:</div>
              {renThisWeek.filter(function(r){return!r.pagado&&!r.mitad&&!r.reserva;}).slice(0,6).map(function(r,i){
                return<div key={i} style={{fontSize:12,color:T.text3,padding:"2px 0"}}> · {r.nombre} — {r.precio}€</div>;
              })}
            </div>}
          </div>
        )}
      </div>

      {/* Seguimiento + Alertas */}
      <div style={Object.assign({},B,{flex:"1 1 300px",padding:20})}>
        <h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:800,color:T.text}}>📋 Estado del centro</h3>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"8px 12px",background:T.bg3,borderRadius:8}}>
            <span style={{color:T.text}}>Clientes activos</span>
            <span style={{color:"#22c55e",fontWeight:800}}>{activos.length}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"8px 12px",background:T.bg3,borderRadius:8}}>
            <span style={{color:T.text}}>Bajas</span>
            <span style={{color:"#ef4444",fontWeight:800}}>{bajas.length}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"8px 12px",background:T.bg3,borderRadius:8}}>
            <span style={{color:T.text}}>Seguimientos pendientes</span>
            <span style={{color:"#f59e0b",fontWeight:800}}>{pendFu}</span>
          </div>
          {overdueFu>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"8px 12px",background:"#ef444410",borderRadius:8,border:"1px solid #ef444420"}}>
            <span style={{color:"#ef4444",fontWeight:700}}>⚠️ Seguimientos vencidos</span>
            <span style={{color:"#ef4444",fontWeight:800}}>{overdueFu}</span>
          </div>}
          <div style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"8px 12px",background:T.bg3,borderRadius:8}}>
            <span style={{color:T.text}}>Leads este mes</span>
            <span style={{color:T.navy,fontWeight:800}}>{mLeads.length}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"8px 12px",background:T.bg3,borderRadius:8}}>
            <span style={{color:T.text}}>Reportes fisioterapia</span>
            <span style={{color:"#a78bfa",fontWeight:800}}>{fis.length}</span>
          </div>
        </div>
      </div>
    </div>

    {/* ═══ ROW 3: TIMP Live + Pagos pendientes ═══ */}
    {timpData&&<div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:20}}>
      <div style={Object.assign({},B,{flex:"1 1 300px",padding:20})}>
        <h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:800,color:T.text}}>🔗 TIMP en vivo</h3>
        <div style={{display:"flex",gap:16,marginBottom:14}}>
          <div style={{textAlign:"center",flex:1}}><div style={{fontSize:28,fontWeight:900,color:"#22c55e"}}>{timpActivos}</div><div style={{fontSize:10,color:T.text3}}>Con bono activo</div></div>
          <div style={{textAlign:"center",flex:1}}><div style={{fontSize:28,fontWeight:900,color:"#ef4444"}}>{timpPagoPend}</div><div style={{fontSize:10,color:T.text3}}>Pago pendiente</div></div>
          <div style={{textAlign:"center",flex:1}}><div style={{fontSize:28,fontWeight:900,color:"#3b82f6"}}>{timpData.filter(function(s){return s.next_booking_for;}).length}</div><div style={{fontSize:10,color:T.text3}}>Con reserva</div></div>
        </div>
        {timpPagoPend>0&&<div>
          <div style={{fontSize:11,color:"#ef4444",fontWeight:700,marginBottom:4}}>⚠️ Con pago pendiente:</div>
          {timpData.filter(function(s){return s.active_membership&&s.payment_pending;}).slice(0,5).map(function(s){
            return<div key={s.uuid} style={{fontSize:11,color:T.text3,padding:"2px 0"}}> · {s.full_name}</div>;
          })}
        </div>}
      </div>

      {/* Alertas CRM vs TIMP */}
      <div style={Object.assign({},B,{flex:"1 1 300px",padding:20})}>
        <h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:800,color:T.text}}>⚡ Alertas</h3>
        {(function(){
          var alerts=cl.filter(function(c){return c.timpAlert;});
          if(!alerts.length)return<div style={{padding:10,background:"#22c55e10",borderRadius:8,fontSize:12,color:"#22c55e",fontWeight:600}}>✓ Todo sincronizado — sin alertas</div>;
          return<div>
            <div style={{fontSize:12,fontWeight:700,color:"#f59e0b",marginBottom:8}}>⚠️ {alerts.length} alertas</div>
            {alerts.slice(0,6).map(function(c){return<div key={c.id} style={{fontSize:11,color:T.text3,padding:"3px 0"}}> · {c.name}: <span style={{color:"#f59e0b"}}>{c.timpAlert}</span></div>;})}
          </div>;
        })()}
      </div>
    </div>}

  </div>);
}
