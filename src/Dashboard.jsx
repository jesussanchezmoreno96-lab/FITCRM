import { useState, useEffect } from "react";

var MONTHS=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

export default function Dashboard(props){
  var T=props.theme;var dk=props.dk;
  var cl=props.clients||[];var le=props.leads||[];var fu=props.followups||[];var fis=props.fisio||[];var timpData=props.timpData||null;
  var _=useState;
  var m_=_(new Date().getMonth()),selM=m_[0],setSelM=m_[1];
  var y_=_(2026),selY=y_[0],setSelY=y_[1];

  var td=new Date().toISOString().split("T")[0];
  var monthName=MONTHS[selM];

  // Filter data for selected month
  var mLeads=le.filter(function(l){return l.year===String(selY)&&l.month===monthName;});
  var prevMonth=selM>0?MONTHS[selM-1]:MONTHS[11];
  var prevYear=selM>0?selY:selY-1;
  var prevLeads=le.filter(function(l){return l.year===String(prevYear)&&l.month===prevMonth;});

  // Lead stats
  var totalLeads=mLeads.length;
  var prevTotalLeads=prevLeads.length;
  var leadGrowth=prevTotalLeads>0?Math.round(((totalLeads-prevTotalLeads)/prevTotalLeads)*100):0;
  var convertidos=mLeads.filter(function(l){return l.status==="alta";}).length;
  var enNego=mLeads.filter(function(l){return l.status==="negociacion";}).length;
  var prueba=mLeads.filter(function(l){return l.status==="prueba";}).length;
  var perdidos=mLeads.filter(function(l){return l.status==="perdido";}).length;
  var nada=mLeads.filter(function(l){return l.status==="nada";}).length;
  var tasaConversion=totalLeads>0?Math.round((convertidos/totalLeads)*100):0;

  // Lead sources
  var sources={};
  mLeads.forEach(function(l){var s=l.source||"Sin origen";sources[s]=(sources[s]||0)+1;});
  var sourceList=Object.entries(sources).sort(function(a,b){return b[1]-a[1];});

  // Best converting source
  var sourceConv={};
  mLeads.forEach(function(l){var s=l.source||"Sin origen";if(!sourceConv[s])sourceConv[s]={total:0,altas:0};sourceConv[s].total++;if(l.status==="alta")sourceConv[s].altas++;});
  var bestSource=Object.entries(sourceConv).sort(function(a,b){return(b[1].altas/b[1].total)-(a[1].altas/a[1].total);})[0];

  // Responsable stats
  var respStats={};
  mLeads.forEach(function(l){var r=l.responsable||"Sin asignar";if(!respStats[r])respStats[r]={total:0,altas:0};respStats[r].total++;if(l.status==="alta")respStats[r].altas++;});
  var respList=Object.entries(respStats).sort(function(a,b){return b[1].altas-a[1].altas;});

  // Client stats
  var activos=cl.filter(function(c){return c.status==="activo";});
  var pausados=cl.filter(function(c){return c.status==="pausado";});
  var bajas=cl.filter(function(c){return c.status==="baja";});

  // Clients by tarifa
  var mensuales=activos.filter(function(c){return c.tarifa==="Mensual";}).length;
  var trimestrales=activos.filter(function(c){return c.tarifa==="Trimestral";}).length;

  // Clients by days/week
  var dia1=activos.filter(function(c){return String(c.diasSemana)==="1";}).length;
  var dia2=activos.filter(function(c){return String(c.diasSemana)==="2";}).length;
  var dia3=activos.filter(function(c){return String(c.diasSemana)==="3"||parseInt(c.diasSemana)>=3;}).length;

  // Upsell opportunity
  var upsellClients=activos.filter(function(c){return String(c.diasSemana)==="1";});

  // Revenue estimate
  var PRICES={Mensual:{1:135,2:250,3:350,4:450,5:550},Trimestral:{1:125,2:232,3:323,4:416,5:480}};
  var estimatedRevenue=0;
  activos.forEach(function(c){
    var t=c.tarifa||"Mensual";var d=parseInt(c.diasSemana)||1;
    var prices=PRICES[t]||PRICES.Mensual;
    estimatedRevenue+=(prices[d]||prices[1]);
  });

  // Followup stats
  var pendFu=fu.filter(function(f){return!f.done;}).length;
  var doneFu=fu.filter(function(f){return f.done;}).length;
  var overdueFu=fu.filter(function(f){return!f.done&&f.date<td;}).length;

  // Pausados > 2 weeks
  var longPaused=pausados.length;

  // Fisio stats this month
  var mFisio=fis.length;

  // Day of week analysis for leads
  var dayCount=[0,0,0,0,0,0,0];
  var dayNames=["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
  mLeads.forEach(function(l){
    if(l.contactDate){var d=new Date(l.contactDate);if(!isNaN(d))dayCount[d.getDay()]++;}
  });
  var bestDay=dayCount.indexOf(Math.max.apply(null,dayCount));
  var maxDayCount=Math.max.apply(null,dayCount);

  // Is last day of month?
  var today=new Date();
  var lastDay=new Date(today.getFullYear(),today.getMonth()+1,0).getDate();
  var isLastDay=today.getDate()===lastDay;

  var B={background:T.bg2,borderRadius:14,border:"1px solid "+T.border,overflow:"hidden"};
  var card=function(title,value,color,sub){return{background:T.bg2,borderRadius:12,padding:"16px 20px",border:"1px solid "+T.border,flex:"1 1 140px",minWidth:140,textAlign:"center"};};

  return(<div>
    {/* Month selector */}
    <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:20}}>
      {MONTHS.map(function(m,i){return<button key={i} onClick={function(){setSelM(i);}} style={{padding:"7px 14px",borderRadius:8,border:selM===i?"1px solid "+T.navy:"1px solid "+T.border,background:selM===i?T.navy+"12":"transparent",color:selM===i?T.navy:T.text3,fontSize:11,fontWeight:600,cursor:"pointer"}}>{m}</button>;})}
    </div>

    <h2 style={{margin:"0 0 6px",fontSize:22,fontWeight:900,color:T.text}}>📊 Reporte {monthName} {selY}</h2>
    <p style={{fontSize:12,color:T.text3,marginBottom:24}}>{isLastDay?"⚡ Reporte de cierre de mes":"Datos en tiempo real"}</p>

    {/* KPI Cards */}
    <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:24}}>
      <div style={card()}><div style={{fontSize:30,fontWeight:900,color:"#22c55e"}}>{activos.length}</div><div style={{fontSize:10,color:T.text3,fontWeight:600}}>ACTIVOS</div></div>
      <div style={card()}><div style={{fontSize:30,fontWeight:900,color:T.text}}>{totalLeads}</div><div style={{fontSize:10,color:T.text3,fontWeight:600}}>LEADS MES</div>{prevTotalLeads>0&&<div style={{fontSize:10,color:leadGrowth>=0?"#22c55e":"#ef4444",fontWeight:700,marginTop:2}}>{leadGrowth>=0?"+":""}{leadGrowth}% vs {prevMonth}</div>}</div>
      <div style={card()}><div style={{fontSize:30,fontWeight:900,color:"#22c55e"}}>{convertidos}</div><div style={{fontSize:10,color:T.text3,fontWeight:600}}>ALTAS</div></div>
      <div style={card()}><div style={{fontSize:30,fontWeight:900,color:"#ef4444"}}>{perdidos}</div><div style={{fontSize:10,color:T.text3,fontWeight:600}}>PERDIDOS</div></div>
      <div style={card()}><div style={{fontSize:30,fontWeight:900,color:"#a78bfa"}}>{tasaConversion}%</div><div style={{fontSize:10,color:T.text3,fontWeight:600}}>CONVERSIÓN</div></div>
      <div style={card()}><div style={{fontSize:30,fontWeight:900,color:"#f59e0b"}}>{estimatedRevenue.toLocaleString()}€</div><div style={{fontSize:10,color:T.text3,fontWeight:600}}>FACTURACIÓN EST.</div></div>
    </div>

    {/* Two columns */}
    <div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:20}}>
      {/* Embudo de ventas */}
      <div style={Object.assign({},B,{flex:"1 1 300px",padding:20})}>
        <h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:800,color:T.text}}>🎯 Embudo de Ventas — {monthName}</h3>
        {[{l:"Nada",n:nada,c:"#94a3b8"},{l:"En Negociación",n:enNego,c:"#f59e0b"},{l:"Entreno Prueba",n:prueba,c:"#a78bfa"},{l:"Alta",n:convertidos,c:"#22c55e"},{l:"Perdido",n:perdidos,c:"#ef4444"}].map(function(s){var pct=totalLeads>0?Math.round((s.n/totalLeads)*100):0;return<div key={s.l} style={{marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}><span style={{color:T.text,fontWeight:600}}>{s.l}</span><span style={{color:s.c,fontWeight:700}}>{s.n} ({pct}%)</span></div>
          <div style={{height:8,background:T.bg3,borderRadius:4,overflow:"hidden"}}><div style={{height:8,width:pct+"%",background:s.c,borderRadius:4,minWidth:s.n>0?8:0}}></div></div>
        </div>;})}
      </div>

      {/* Origen de leads */}
      <div style={Object.assign({},B,{flex:"1 1 300px",padding:20})}>
        <h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:800,color:T.text}}>📡 Origen de Leads</h3>
        {sourceList.length===0?<div style={{color:T.text3,fontSize:12}}>Sin datos</div>:
        sourceList.map(function(s){var pct=totalLeads>0?Math.round((s[1]/totalLeads)*100):0;return<div key={s[0]} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <span style={{fontSize:12,fontWeight:600,color:T.text,flex:1}}>{s[0]}</span>
          <span style={{fontSize:18,fontWeight:900,color:T.navy}}>{s[1]}</span>
          <span style={{fontSize:10,color:T.text3}}>{pct}%</span>
        </div>;})}
        {bestSource&&<div style={{marginTop:10,padding:8,background:T.navy+"10",borderRadius:8,fontSize:11,color:T.navy}}>🏆 Mejor conversión: <b>{bestSource[0]}</b> ({bestSource[1].altas}/{bestSource[1].total} altas)</div>}
      </div>
    </div>

    <div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:20}}>
      {/* Responsables */}
      <div style={Object.assign({},B,{flex:"1 1 300px",padding:20})}>
        <h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:800,color:T.text}}>👤 Rendimiento por Responsable</h3>
        {respList.length===0?<div style={{color:T.text3,fontSize:12}}>Sin datos</div>:
        respList.map(function(r){return<div key={r[0]} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,padding:"6px 0",borderBottom:"1px solid "+T.border}}>
          <span style={{fontSize:13,fontWeight:700,color:T.text,flex:1}}>{r[0]}</span>
          <span style={{fontSize:11,color:T.text3}}>{r[1].total} leads</span>
          <span style={{fontSize:13,fontWeight:800,color:"#22c55e"}}>{r[1].altas} altas</span>
        </div>;})}
      </div>

      {/* Day analysis */}
      <div style={Object.assign({},B,{flex:"1 1 300px",padding:20})}>
        <h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:800,color:T.text}}>📅 Día de la semana con más leads</h3>
        <div style={{display:"flex",gap:6,alignItems:"flex-end",height:100,marginBottom:10}}>
          {dayCount.map(function(c,i){var h=maxDayCount>0?Math.round((c/maxDayCount)*80):0;return<div key={i} style={{flex:1,textAlign:"center"}}>
            <div style={{height:h||2,background:i===bestDay?"#22c55e":T.navy+"60",borderRadius:4,marginBottom:4}}></div>
            <div style={{fontSize:9,color:i===bestDay?"#22c55e":T.text3,fontWeight:600}}>{dayNames[i]}</div>
            <div style={{fontSize:11,fontWeight:700,color:i===bestDay?"#22c55e":T.text}}>{c}</div>
          </div>;})}
        </div>
        {maxDayCount>0&&<div style={{padding:8,background:"#22c55e10",borderRadius:8,fontSize:11,color:"#22c55e"}}>📌 Mejor día: <b>{dayNames[bestDay]}</b> con {dayCount[bestDay]} leads</div>}
      </div>
    </div>

    <div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:20}}>
      {/* Tarifas */}
      <div style={Object.assign({},B,{flex:"1 1 300px",padding:20})}>
        <h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:800,color:T.text}}>💰 Distribución de Tarifas</h3>
        <div style={{display:"flex",gap:16,marginBottom:14}}>
          <div style={{textAlign:"center",flex:1}}><div style={{fontSize:28,fontWeight:900,color:"#3b82f6"}}>{mensuales}</div><div style={{fontSize:10,color:T.text3}}>Mensuales</div></div>
          <div style={{textAlign:"center",flex:1}}><div style={{fontSize:28,fontWeight:900,color:"#22c55e"}}>{trimestrales}</div><div style={{fontSize:10,color:T.text3}}>Trimestrales</div></div>
        </div>
        <h4 style={{margin:"14px 0 8px",fontSize:13,fontWeight:700,color:T.text}}>Días/Semana</h4>
        <div style={{display:"flex",gap:16}}>
          <div style={{textAlign:"center",flex:1}}><div style={{fontSize:24,fontWeight:900,color:"#f59e0b"}}>{dia1}</div><div style={{fontSize:10,color:T.text3}}>1 día</div></div>
          <div style={{textAlign:"center",flex:1}}><div style={{fontSize:24,fontWeight:900,color:"#a78bfa"}}>{dia2}</div><div style={{fontSize:10,color:T.text3}}>2 días</div></div>
          <div style={{textAlign:"center",flex:1}}><div style={{fontSize:24,fontWeight:900,color:"#ec4899"}}>{dia3}</div><div style={{fontSize:10,color:T.text3}}>3+ días</div></div>
        </div>
      </div>

      {/* Upsell + Seguimiento */}
      <div style={Object.assign({},B,{flex:"1 1 300px",padding:20})}>
        <h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:800,color:T.text}}>🚀 Oportunidades y Seguimiento</h3>
        <div style={{marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:700,color:"#f59e0b",marginBottom:4}}>📈 Upsell potencial: {upsellClients.length} clientes de 1 día</div>
          {upsellClients.slice(0,5).map(function(c){return<div key={c.id} style={{fontSize:11,color:T.text3,padding:"2px 0"}}> · {c.name}</div>;})}
          {upsellClients.length>5&&<div style={{fontSize:10,color:T.text3}}>...y {upsellClients.length-5} más</div>}
        </div>
        <div style={{borderTop:"1px solid "+T.border,paddingTop:12}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}><span style={{color:T.text}}>Seguimientos pendientes</span><span style={{color:"#f59e0b",fontWeight:700}}>{pendFu}</span></div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}><span style={{color:T.text}}>Seguimientos vencidos</span><span style={{color:"#ef4444",fontWeight:700}}>{overdueFu}</span></div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}><span style={{color:T.text}}>Seguimientos completados</span><span style={{color:"#22c55e",fontWeight:700}}>{doneFu}</span></div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}><span style={{color:T.text}}>Clientes pausados</span><span style={{color:"#f59e0b",fontWeight:700}}>{longPaused}</span></div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12}}><span style={{color:T.text}}>Reportes fisioterapia</span><span style={{color:"#a78bfa",fontWeight:700}}>{mFisio}</span></div>
        </div>
      </div>
    </div>

    {/* Clientes sin observaciones */}
    {(function(){
      var sinObs=activos.filter(function(c){return!c.observations||c.observations.trim()==="";});
      if(!sinObs.length)return null;
      return<div style={Object.assign({},B,{padding:20,marginBottom:20})}>
        <h3 style={{margin:"0 0 10px",fontSize:15,fontWeight:800,color:T.text}}>📝 Fichas incompletas — {sinObs.length} clientes sin observaciones</h3>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{sinObs.slice(0,15).map(function(c){return<span key={c.id} style={{padding:"4px 10px",borderRadius:6,background:T.bg3,border:"1px solid "+T.border,fontSize:11,color:T.text3}}>{c.name}</span>;})}</div>
        {sinObs.length>15&&<div style={{fontSize:10,color:T.text3,marginTop:6}}>...y {sinObs.length-15} más</div>}
      </div>;
    })()}

    {/* TIMP Data */}
    {timpData&&<div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:20}}>
      <div style={Object.assign({},B,{flex:"1 1 300px",padding:20})}>
        <h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:800,color:T.text}}>🔗 Datos TIMP — Tiempo Real</h3>
        <div style={{display:"flex",gap:16,marginBottom:14}}>
          <div style={{textAlign:"center",flex:1}}><div style={{fontSize:28,fontWeight:900,color:"#22c55e"}}>{timpData.filter(function(s){return s.active_membership;}).length}</div><div style={{fontSize:10,color:T.text3}}>Activos TIMP</div></div>
          <div style={{textAlign:"center",flex:1}}><div style={{fontSize:28,fontWeight:900,color:"#ef4444"}}>{timpData.filter(function(s){return s.payment_pending;}).length}</div><div style={{fontSize:10,color:T.text3}}>Pagos pendientes</div></div>
          <div style={{textAlign:"center",flex:1}}><div style={{fontSize:28,fontWeight:900,color:"#3b82f6"}}>{timpData.filter(function(s){return s.next_booking_for;}).length}</div><div style={{fontSize:10,color:T.text3}}>Con reserva</div></div>
        </div>
        {/* Clients with payment pending */}
        {(function(){
          var pending=timpData.filter(function(s){return s.active_membership&&s.payment_pending;});
          if(!pending.length)return<div style={{padding:8,background:"#22c55e10",borderRadius:8,fontSize:11,color:"#22c55e"}}>✓ Todos los clientes activos al corriente de pago</div>;
          return<div>
            <div style={{fontSize:12,fontWeight:700,color:"#ef4444",marginBottom:6}}>⚠️ Activos con pago pendiente ({pending.length})</div>
            {pending.slice(0,8).map(function(s){return<div key={s.uuid} style={{fontSize:11,color:T.text3,padding:"2px 0"}}> · {s.full_name} — {s.phone||"sin tel"}</div>;})}
            {pending.length>8&&<div style={{fontSize:10,color:T.text3}}>...y {pending.length-8} más</div>}
          </div>;
        })()}
      </div>

      <div style={Object.assign({},B,{flex:"1 1 300px",padding:20})}>
        <h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:800,color:T.text}}>📅 Próximas reservas</h3>
        {(function(){
          var withBooking=timpData.filter(function(s){return s.next_booking_for;}).sort(function(a,b){return a.next_booking_for.localeCompare(b.next_booking_for);});
          if(!withBooking.length)return<div style={{fontSize:12,color:T.text3}}>Sin reservas próximas</div>;
          return withBooking.slice(0,10).map(function(s){
            var d=new Date(s.next_booking_for);
            var ds=d.toLocaleDateString("es-ES",{weekday:"short",day:"numeric",month:"short"});
            var ts=d.toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"});
            return<div key={s.uuid} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid "+T.border,fontSize:11}}>
              <span style={{color:T.text,fontWeight:600}}>{s.full_name}</span>
              <span style={{color:T.text3}}>{ds} {ts}</span>
            </div>;
          });
        })()}
      </div>

      {/* Alerts: active in CRM but not in TIMP */}
      <div style={Object.assign({},B,{flex:"1 1 300px",padding:20})}>
        <h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:800,color:T.text}}>⚡ Alertas CRM vs TIMP</h3>
        {(function(){
          var alerts=cl.filter(function(c){return c.timpAlert;});
          if(!alerts.length)return<div style={{padding:8,background:"#22c55e10",borderRadius:8,fontSize:11,color:"#22c55e"}}>✓ CRM y TIMP sincronizados</div>;
          return<div>
            <div style={{fontSize:12,fontWeight:700,color:"#f59e0b",marginBottom:6}}>⚠️ Discrepancias encontradas ({alerts.length})</div>
            {alerts.slice(0,8).map(function(c){return<div key={c.id} style={{fontSize:11,color:T.text3,padding:"2px 0"}}> · {c.name}: {c.timpAlert}</div>;})}
          </div>;
        })()}
      </div>
    </div>}

  </div>);
}
