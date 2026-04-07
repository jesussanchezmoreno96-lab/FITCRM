import { useState, useEffect } from "react";

var WORKERS=["Jesús","Miguel","Diego","Marcelo","Maribel","Mari Carmen"];
var WCOLORS={"Jesús":"#22c55e","Miguel":"#3b82f6","Diego":"#06b6d4","Marcelo":"#f59e0b","Maribel":"#a78bfa","Mari Carmen":"#ec4899","Laura":"#f97316"};

var ALL_WORKERS=[
  {name:"Miguel",type:"rotating"},
  {name:"Jesús",type:"rotating"},
  {name:"Marcelo",type:"fixed",schedule:{L:"14:00-22:00",M:"14:00-22:00",X:"14:00-22:00",J:"14:00-22:00",V:"14:00-20:00",S:""}},
  {name:"Mari Carmen",type:"fixed",schedule:{L:"14:00-22:00",M:"14:00-22:00",X:"14:00-22:00",J:"14:00-22:00",V:"14:00-20:00",S:""}},
  {name:"Maribel",type:"fixed",schedule:{L:"7:00-12:00",M:"7:00-12:00",X:"7:00-12:00",J:"7:00-12:00",V:"7:00-12:00",S:""}},
  {name:"Diego",type:"fixed",schedule:{L:"7:00-11:00 / 18:00-21:00",M:"7:00-11:00 / 18:00-21:00",X:"7:00-13:00",J:"7:00-11:00 / 18:00-21:00",V:"7:00-13:00",S:""}},
  {name:"Laura",type:"fixed",schedule:{L:"",M:"",X:"",J:"17:00-22:00",V:"15:00-20:00",S:"9:00-14:00"}}
];

var DAYS=["L","M","X","J","V","S"];
var DAYNAMES=["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
var MONTHS=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

var DEFAULT_HOLIDAYS=[
  {id:"f1",date:"2026-05-01",name:"Fiesta del Trabajo",day:"Viernes",p1:"Marcelo",p2:"Maribel"},
  {id:"f2",date:"2026-05-02",name:"Fiesta Comunidad de Madrid",day:"Sábado",p1:"Jesús",p2:"Mari Carmen"},
  {id:"f3",date:"2026-05-15",name:"San Isidro Labrador",day:"Viernes",p1:"Miguel",p2:"Diego"},
  {id:"f4",date:"2026-10-12",name:"Fiesta Nacional de España",day:"Lunes",p1:"Maribel",p2:"Mari Carmen"},
  {id:"f5",date:"2026-11-02",name:"Traslado Todos los Santos",day:"Lunes",p1:"Diego",p2:"Marcelo"},
  {id:"f6",date:"2026-11-09",name:"Ntra. Sra. de La Almudena",day:"Lunes",p1:"Jesús",p2:"Miguel"},
  {id:"f7",date:"2026-12-07",name:"Traslado Día Constitución",day:"Lunes",p1:"Miguel",p2:"Marcelo"},
  {id:"f8",date:"2026-12-08",name:"Inmaculada Concepción",day:"Martes",p1:"Jesús",p2:"Maribel"}
];

function getRotatingSchedule(weekNum,name){
  var isMiguelMorning=weekNum%2===0;
  if(name==="Miguel") return isMiguelMorning?{L:"7:00-14:00",M:"7:00-14:00",X:"7:00-14:00",J:"7:00-14:00",V:"7:00-14:00",S:"9:00-14:00"}:{L:"14:00-22:00",M:"14:00-22:00",X:"14:00-22:00",J:"14:00-22:00",V:"14:00-20:00",S:""};
  return isMiguelMorning?{L:"14:00-22:00",M:"14:00-22:00",X:"14:00-22:00",J:"14:00-22:00",V:"14:00-20:00",S:""}:{L:"7:00-14:00",M:"7:00-14:00",X:"7:00-14:00",J:"7:00-14:00",V:"7:00-14:00",S:"9:00-14:00"};
}

function getWeekNumber(d){var date=new Date(d);var jan1=new Date(date.getFullYear(),0,1);return Math.ceil(((date-jan1)/86400000+jan1.getDay()+1)/7);}

export default function Horarios(props){
  var T=props.theme;var dk=props.dk;
  var _=useState;
  var m_=_(new Date().getMonth()),selMonth=m_[0],setSelMonth=m_[1];
  var v_=_("horarios"),view=v_[0],setView=v_[1];
  var h_=_(DEFAULT_HOLIDAYS),holidays=h_[0],setHolidays=h_[1];

  // Load saved holidays from localStorage
  useEffect(function(){
    try{
      var saved=window.localStorage&&window.localStorage.getItem("t2t_holidays");
      if(saved){setHolidays(JSON.parse(saved));}
    }catch(e){}
  },[]);

  function saveHolidays(h){
    setHolidays(h);
    try{window.localStorage&&window.localStorage.setItem("t2t_holidays",JSON.stringify(h));}catch(e){}
  }

  function swapWorker(holidayId,position,newWorker){
    var updated=holidays.map(function(h){
      if(h.id===holidayId){
        var copy=Object.assign({},h);
        if(position===1)copy.p1=newWorker;
        else copy.p2=newWorker;
        return copy;
      }
      return h;
    });
    saveHolidays(updated);
  }

  // Count per worker
  var counts={};
  WORKERS.forEach(function(w){counts[w]=0;});
  holidays.forEach(function(h){if(counts[h.p1]!==undefined)counts[h.p1]++;if(counts[h.p2]!==undefined)counts[h.p2]++;});

  var weekNum=getWeekNumber(new Date(2026,selMonth,1));
  var B={background:T.bg2,borderRadius:14,border:"1px solid "+T.border,overflow:"hidden"};

  return(<div>
    <div style={{display:"flex",gap:8,marginBottom:20}}>
      <button onClick={function(){setView("horarios");}} style={{padding:"10px 20px",borderRadius:10,border:view==="horarios"?"2px solid "+T.navy:"2px solid "+T.border,background:view==="horarios"?T.navy+"15":"transparent",color:view==="horarios"?T.navy:T.text3,fontSize:13,fontWeight:700,cursor:"pointer"}}>📅 Horarios</button>
      <button onClick={function(){setView("festivos");}} style={{padding:"10px 20px",borderRadius:10,border:view==="festivos"?"2px solid #ef4444":"2px solid "+T.border,background:view==="festivos"?"#ef444410":"transparent",color:view==="festivos"?"#ef4444":T.text3,fontSize:13,fontWeight:700,cursor:"pointer"}}>🎉 Festivos</button>
    </div>

    {view==="horarios"&&<div>
      <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:20}}>
        {MONTHS.map(function(m,i){return<button key={i} onClick={function(){setSelMonth(i);}} style={{padding:"7px 14px",borderRadius:8,border:selMonth===i?"1px solid "+T.navy:"1px solid "+T.border,background:selMonth===i?T.navy+"12":"transparent",color:selMonth===i?T.navy:T.text3,fontSize:11,fontWeight:600,cursor:"pointer"}}>{m}</button>;})}
      </div>
      <h3 style={{margin:"0 0 16px",fontSize:18,fontWeight:800,color:T.text}}>{MONTHS[selMonth]} 2026</h3>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr style={{borderBottom:"2px solid "+T.border}}>
            <th style={{padding:"12px 10px",textAlign:"left",color:T.text,fontWeight:800,fontSize:14,minWidth:120}}>Trabajador</th>
            {DAYS.map(function(d,i){return<th key={d} style={{padding:"12px 8px",textAlign:"center",color:T.navy,fontWeight:700,fontSize:12,minWidth:100}}>{DAYNAMES[i]}</th>;})}
          </tr></thead>
          <tbody>
            {ALL_WORKERS.map(function(w){
              var sched=w.type==="rotating"?getRotatingSchedule(weekNum,w.name):w.schedule;
              var color=WCOLORS[w.name]||"#64748b";
              return<tr key={w.name} style={{borderBottom:"1px solid "+T.border}}>
                <td style={{padding:"14px 10px"}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:8,height:8,borderRadius:4,background:color,flexShrink:0}}></div><span style={{fontWeight:700,color:T.text,fontSize:13}}>{w.name}</span></div>{w.type==="rotating"&&<span style={{fontSize:9,color:T.text3,marginLeft:16}}>↔️ Rotativo</span>}</td>
                {DAYS.map(function(d){var h=sched[d];return<td key={d} style={{padding:"10px 6px",textAlign:"center"}}>{h?<span style={{fontSize:11,padding:"4px 8px",borderRadius:6,background:color+"15",color:color,fontWeight:600,display:"inline-block"}}>{h}</span>:<span style={{color:T.text3,fontSize:10}}>—</span>}</td>;})}
              </tr>;
            })}
          </tbody>
        </table>
      </div>
      <div style={{marginTop:16,padding:12,background:T.bg3,borderRadius:10,border:"1px solid "+T.border}}>
        <div style={{fontSize:11,color:T.text3}}><b style={{color:T.text}}>Horario del centro:</b> L-J 7:00-22:00 · V 7:00-20:00 · S 9:00-14:00</div>
        <div style={{fontSize:11,color:T.text3,marginTop:4}}><b style={{color:T.text}}>Miguel y Jesús:</b> Rotan semanalmente mañana (7-14) / tarde (14-22)</div>
      </div>
    </div>}

    {view==="festivos"&&<div>
      <h3 style={{margin:"0 0 10px",fontSize:18,fontWeight:800,color:T.text}}>🎉 Festivos 2026</h3>
      <p style={{fontSize:12,color:T.text3,marginBottom:16}}>2 personas por festivo · 9:00-14:00 · Puedes cambiar las asignaciones con los desplegables</p>

      {/* Equity summary */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:20}}>
        {WORKERS.map(function(w){var c=counts[w]||0;var color=WCOLORS[w];return<div key={w} style={{padding:"8px 14px",borderRadius:10,background:color+"10",border:"1px solid "+color+"25",display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:8,height:8,borderRadius:4,background:color}}></div>
          <span style={{fontSize:12,fontWeight:700,color:color}}>{w}</span>
          <span style={{fontSize:18,fontWeight:900,color:color}}>{c}</span>
          <span style={{fontSize:9,color:T.text3}}>festivos</span>
        </div>;})}
      </div>

      <div style={B}>
        {holidays.map(function(h){
          var d=new Date(h.date);
          var monthName=MONTHS[d.getMonth()];
          var c1=WCOLORS[h.p1]||"#64748b";
          var c2=WCOLORS[h.p2]||"#64748b";
          return<div key={h.id} style={{padding:"16px 20px",borderBottom:"1px solid "+T.border}}>
            <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
              {/* Date */}
              <div style={{width:55,textAlign:"center",flexShrink:0}}>
                <div style={{fontSize:24,fontWeight:900,color:"#ef4444"}}>{d.getDate()}</div>
                <div style={{fontSize:9,color:T.text3,fontWeight:600,textTransform:"uppercase"}}>{monthName.substr(0,3)}</div>
              </div>
              {/* Info */}
              <div style={{flex:1,minWidth:150}}>
                <div style={{fontSize:14,fontWeight:700,color:T.text}}>{h.name}</div>
                <div style={{fontSize:11,color:T.text3}}>{h.day} · 9:00-14:00</div>
              </div>
              {/* Worker 1 dropdown */}
              <div style={{display:"flex",flexDirection:"column",gap:2}}>
                <span style={{fontSize:9,color:T.text3,fontWeight:600}}>PERSONA 1</span>
                <select value={h.p1} onChange={function(e){swapWorker(h.id,1,e.target.value);}} style={{padding:"6px 10px",borderRadius:8,background:c1+"15",border:"1px solid "+c1+"30",color:c1,fontSize:12,fontWeight:700,outline:"none",cursor:"pointer"}}>
                  {WORKERS.map(function(w){return<option key={w} value={w}>{w}</option>;})}
                </select>
              </div>
              {/* Worker 2 dropdown */}
              <div style={{display:"flex",flexDirection:"column",gap:2}}>
                <span style={{fontSize:9,color:T.text3,fontWeight:600}}>PERSONA 2</span>
                <select value={h.p2} onChange={function(e){swapWorker(h.id,2,e.target.value);}} style={{padding:"6px 10px",borderRadius:8,background:c2+"15",border:"1px solid "+c2+"30",color:c2,fontSize:12,fontWeight:700,outline:"none",cursor:"pointer"}}>
                  {WORKERS.map(function(w){return<option key={w} value={w}>{w}</option>;})}
                </select>
              </div>
            </div>
          </div>;
        })}
      </div>

      <div style={{marginTop:16,display:"flex",gap:8}}>
        <button onClick={function(){saveHolidays(DEFAULT_HOLIDAYS);}} style={{padding:"8px 16px",background:T.bg3,border:"1px solid "+T.border,borderRadius:8,color:T.text3,fontSize:11,fontWeight:600,cursor:"pointer"}}>🔄 Restablecer original</button>
      </div>

      <div style={{marginTop:12,padding:12,background:T.bg3,borderRadius:10,border:"1px solid "+T.border}}>
        <div style={{fontSize:11,color:T.text3}}>
          <b style={{color:T.text}}>Reglas:</b> 2 personas por festivo · Nadie repite hasta que todos hayan hecho el mismo número · Horario festivo: 9:00-14:00
        </div>
      </div>
    </div>}
  </div>);
}
