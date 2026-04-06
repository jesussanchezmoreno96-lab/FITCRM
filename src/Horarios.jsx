import { useState, useEffect } from "react";

var WORKERS=[
  {name:"Miguel",type:"rotating",pair:"Jesús"},
  {name:"Jesús",type:"rotating",pair:"Miguel"},
  {name:"Marcelo",type:"fixed",schedule:{L:"14:00-22:00",M:"14:00-22:00",X:"14:00-22:00",J:"14:00-22:00",V:"14:00-20:00",S:""}},
  {name:"Mari Carmen",type:"fixed",schedule:{L:"14:00-22:00",M:"14:00-22:00",X:"14:00-22:00",J:"14:00-22:00",V:"14:00-20:00",S:""}},
  {name:"Maribel",type:"fixed",schedule:{L:"7:00-12:00",M:"7:00-12:00",X:"7:00-12:00",J:"7:00-12:00",V:"7:00-12:00",S:""}},
  {name:"Diego",type:"fixed",schedule:{L:"7:00-11:00 / 18:00-21:00",M:"7:00-11:00 / 18:00-21:00",X:"7:00-13:00",J:"7:00-11:00 / 18:00-21:00",V:"7:00-13:00",S:""}},
  {name:"Laura",type:"fixed",schedule:{L:"",M:"",X:"",J:"17:00-22:00",V:"15:00-20:00",S:"9:00-14:00"}}
];

var DAYS=["L","M","X","J","V","S"];
var DAYNAMES=["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
var MONTHS=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function getWeekNumber(d){var date=new Date(d);var jan1=new Date(date.getFullYear(),0,1);return Math.ceil(((date-jan1)/86400000+jan1.getDay()+1)/7);}

function getRotatingSchedule(weekNum,name){
  var isMiguelMorning=weekNum%2===0;
  if(name==="Miguel") return isMiguelMorning?{L:"7:00-14:00",M:"7:00-14:00",X:"7:00-14:00",J:"7:00-14:00",V:"7:00-14:00",S:"9:00-14:00"}:{L:"14:00-22:00",M:"14:00-22:00",X:"14:00-22:00",J:"14:00-22:00",V:"14:00-20:00",S:""};
  return isMiguelMorning?{L:"14:00-22:00",M:"14:00-22:00",X:"14:00-22:00",J:"14:00-22:00",V:"14:00-20:00",S:""}:{L:"7:00-14:00",M:"7:00-14:00",X:"7:00-14:00",J:"7:00-14:00",V:"7:00-14:00",S:"9:00-14:00"};
}

function getHolidays2026(){
  return[
    {date:"2026-01-01",name:"Año Nuevo"},{date:"2026-01-06",name:"Reyes"},
    {date:"2026-04-02",name:"Jueves Santo"},{date:"2026-04-03",name:"Viernes Santo"},
    {date:"2026-05-01",name:"Día del Trabajador"},{date:"2026-06-24",name:"San Juan"},
    {date:"2026-08-15",name:"Asunción"},{date:"2026-10-09",name:"Comunitat Valenciana"},
    {date:"2026-10-12",name:"Fiesta Nacional"},{date:"2026-11-01",name:"Todos los Santos"},
    {date:"2026-12-06",name:"Constitución"},{date:"2026-12-08",name:"Inmaculada"},
    {date:"2026-12-25",name:"Navidad"}
  ];
}

function assignHolidayWorkers(holidays,seed){
  var workers=WORKERS.map(function(w){return w.name;});
  var result=[];
  var counts={};
  workers.forEach(function(w){counts[w]=0;});
  holidays.forEach(function(h,i){
    var sorted=workers.slice().sort(function(a,b){
      if(counts[a]!==counts[b])return counts[a]-counts[b];
      return((i*7+a.charCodeAt(0))%workers.length)-((i*7+b.charCodeAt(0))%workers.length);
    });
    var w1=sorted[0];var w2=sorted[1];
    counts[w1]++;counts[w2]++;
    result.push({date:h.date,name:h.name,workers:[w1,w2],schedule:"9:00-14:00"});
  });
  return result;
}

export default function Horarios(props){
  var T=props.theme;var dk=props.dk;
  var _=useState;
  var m_=_(new Date().getMonth()),selMonth=m_[0],setSelMonth=m_[1];
  var y_=_(2026),selYear=y_[0],setSelYear=y_[1];
  var v_=_("horarios"),view=v_[0],setView=v_[1];

  var holidays=getHolidays2026();
  var assigned=assignHolidayWorkers(holidays,42);

  // Get week number for selected month to determine rotating schedule
  var firstDay=new Date(selYear,selMonth,1);
  var weekNum=getWeekNumber(firstDay);

  var B={background:T.bg2,borderRadius:14,border:"1px solid "+T.border,overflow:"hidden"};

  return(<div>
    {/* Sub-tabs */}
    <div style={{display:"flex",gap:8,marginBottom:20}}>
      <button onClick={function(){setView("horarios");}} style={{padding:"10px 20px",borderRadius:10,border:view==="horarios"?"2px solid "+T.navy:"2px solid "+T.border,background:view==="horarios"?T.navy+"15":"transparent",color:view==="horarios"?T.navy:T.text3,fontSize:13,fontWeight:700,cursor:"pointer"}}>📅 Horarios</button>
      <button onClick={function(){setView("festivos");}} style={{padding:"10px 20px",borderRadius:10,border:view==="festivos"?"2px solid #ef4444":"2px solid "+T.border,background:view==="festivos"?"#ef444410":"transparent",color:view==="festivos"?"#ef4444":T.text3,fontSize:13,fontWeight:700,cursor:"pointer"}}>🎉 Festivos</button>
    </div>

    {view==="horarios"&&<div>
      {/* Month selector */}
      <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:20}}>
        {MONTHS.map(function(m,i){return<button key={i} onClick={function(){setSelMonth(i);}} style={{padding:"7px 14px",borderRadius:8,border:selMonth===i?"1px solid "+T.navy:"1px solid "+T.border,background:selMonth===i?T.navy+"12":"transparent",color:selMonth===i?T.navy:T.text3,fontSize:11,fontWeight:600,cursor:"pointer"}}>{m}</button>;})}
      </div>

      <h3 style={{margin:"0 0 16px",fontSize:18,fontWeight:800,color:T.text}}>{MONTHS[selMonth]} {selYear}</h3>

      {/* Schedule table */}
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr style={{borderBottom:"2px solid "+T.border}}>
            <th style={{padding:"12px 10px",textAlign:"left",color:T.text,fontWeight:800,fontSize:14,minWidth:120}}>Trabajador</th>
            {DAYS.map(function(d,i){return<th key={d} style={{padding:"12px 8px",textAlign:"center",color:T.navy,fontWeight:700,fontSize:12,minWidth:100}}>{DAYNAMES[i]}</th>;})}
          </tr></thead>
          <tbody>
            {WORKERS.map(function(w){
              var sched=w.type==="rotating"?getRotatingSchedule(weekNum,w.name):w.schedule;
              var colors={"Miguel":"#3b82f6","Jesús":"#22c55e","Marcelo":"#f59e0b","Mari Carmen":"#ec4899","Maribel":"#a78bfa","Diego":"#06b6d4","Laura":"#f97316"};
              var color=colors[w.name]||"#64748b";
              return<tr key={w.name} style={{borderBottom:"1px solid "+T.border}}>
                <td style={{padding:"14px 10px"}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:8,height:8,borderRadius:4,background:color,flexShrink:0}}></div><span style={{fontWeight:700,color:T.text,fontSize:13}}>{w.name}</span></div>{w.type==="rotating"&&<span style={{fontSize:9,color:T.text3,marginLeft:16}}>↔️ Rotativo</span>}</td>
                {DAYS.map(function(d){var h=sched[d];return<td key={d} style={{padding:"10px 6px",textAlign:"center"}}>{h?<span style={{fontSize:11,padding:"4px 8px",borderRadius:6,background:color+"15",color:color,fontWeight:600,display:"inline-block"}}>{h}</span>:<span style={{color:T.text3,fontSize:10}}>—</span>}</td>;})}
              </tr>;
            })}
          </tbody>
        </table>
      </div>

      <div style={{marginTop:16,padding:12,background:T.bg3,borderRadius:10,border:"1px solid "+T.border}}>
        <div style={{fontSize:11,color:T.text3}}>
          <b style={{color:T.text}}>Horario del centro:</b> L-J 7:00-22:00 · V 7:00-20:00 · S 9:00-14:00
        </div>
        <div style={{fontSize:11,color:T.text3,marginTop:4}}>
          <b style={{color:T.text}}>Miguel y Jesús:</b> Rotan semanalmente mañana (7-14) / tarde (14-22). Semana par = Miguel mañana.
        </div>
      </div>
    </div>}

    {view==="festivos"&&<div>
      <h3 style={{margin:"0 0 16px",fontSize:18,fontWeight:800,color:T.text}}>🎉 Festivos 2026 — Asignación aleatoria</h3>
      <div style={B}>
        {assigned.map(function(h){
          var d=new Date(h.date);
          var dayName=["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"][d.getDay()];
          return<div key={h.date} style={{padding:"14px 18px",borderBottom:"1px solid "+T.border,display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:50,textAlign:"center",flexShrink:0}}>
              <div style={{fontSize:22,fontWeight:900,color:"#ef4444"}}>{d.getDate()}</div>
              <div style={{fontSize:9,color:T.text3,fontWeight:600,textTransform:"uppercase"}}>{MONTHS[d.getMonth()].substr(0,3)}</div>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:700,color:T.text}}>{h.name}</div>
              <div style={{fontSize:11,color:T.text3}}>{dayName} · {h.schedule}</div>
            </div>
            <div style={{display:"flex",gap:6}}>
              {h.workers.map(function(w){
                var colors={"Miguel":"#3b82f6","Jesús":"#22c55e","Marcelo":"#f59e0b","Mari Carmen":"#ec4899","Maribel":"#a78bfa","Diego":"#06b6d4","Laura":"#f97316"};
                return<span key={w} style={{padding:"4px 10px",borderRadius:6,background:(colors[w]||"#64748b")+"15",color:colors[w]||"#64748b",fontSize:11,fontWeight:700}}>{w}</span>;
              })}
            </div>
          </div>;
        })}
      </div>
      <div style={{marginTop:16,padding:12,background:T.bg3,borderRadius:10,border:"1px solid "+T.border}}>
        <div style={{fontSize:11,color:T.text3}}>Los festivos se asignan de forma equitativa — cada trabajador tiene un número similar de festivos. Horario festivo: 9:00-14:00.</div>
      </div>
    </div>}
  </div>);
}
