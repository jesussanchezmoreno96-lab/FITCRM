import { useState } from "react";

function getMonday(d){var date=new Date(d);var day=date.getDay();date.setDate(date.getDate()-(day===0?6:day-1));date.setHours(0,0,0,0);return date;}
function localKey(d){var dd=new Date(d);var y=dd.getFullYear(),m=dd.getMonth()+1,day=dd.getDate();return y+"-"+(m<10?"0":"")+m+"-"+(day<10?"0":"")+day;}

export default function AIAssistant(props){
  var T=props.theme;var dk=props.dk;
  var cl=props.clients||[];var fu=props.followups||[];var le=props.leads||[];var fis=props.fisio||[];
  var bonos=props.bonos||[];var timpData=props.timpData||[];var renData=props.renData||{};
  var actions=props.actions||{};
  var _=useState;
  var o_=_(false),open=o_[0],setOpen=o_[1];
  var m_=_([]),msgs=m_[0],setMsgs=m_[1];
  var i_=_(""),input=i_[0],setInput=i_[1];
  var l_=_(false),loading=l_[0],setLoading=l_[1];

  function getClientData(name){
    var found=cl.filter(function(c){return c.name.toLowerCase().indexOf(name.toLowerCase())>=0;});
    if(!found.length)return"";
    return found.slice(0,3).map(function(c){
      var info=c.name+" ("+c.status+")";
      if(c.timpPhone)info+=" Tel:"+c.timpPhone;
      if(c.timpEmail)info+=" Email:"+c.timpEmail;
      if(c.observations)info+=" Obs:"+c.observations;
      if(c.timpActive!==undefined)info+=" TIMP:"+(c.timpActive?"activo":"inactivo");
      if(c.timpNextBooking)info+=" ProxReserva:"+c.timpNextBooking.substring(0,16);
      // Exercise data
      if(c.exercises&&c.exercises.length){
        var exData=c.exercises.map(function(e){
          if(!e.records||!e.records.length)return null;
          var last=e.records[e.records.length-1];
          var best=e.records.reduce(function(a,b){return(b.weight>a.weight)?b:a;},e.records[0]);
          return e.name+": "+e.records.length+" reg. Última:"+last.date+" "+last.weight+"kg×"+last.reps+". Mejor:"+best.weight+"kg";
        }).filter(Boolean);
        if(exData.length)info+="\n  Ejercicios: "+exData.join(" | ");
      }
      // Bono data
      var clientBonos=bonos.filter(function(b){
        return b.nombre&&c.name&&(b.nombre.toLowerCase()===c.name.toLowerCase()||
          b.nombre.toLowerCase().indexOf(c.name.toLowerCase())>=0||
          c.name.toLowerCase().indexOf(b.nombre.toLowerCase())>=0);
      });
      if(clientBonos.length){
        var latest=clientBonos.sort(function(a,b){return(b.fechaValor||"").localeCompare(a.fechaValor||"");})[0];
        info+="\n  Bono: "+latest.tipoBono+" | Precio:"+latest.precio+"€ | Pagado:"+(latest.pagado?"SI":"NO");
        if(latest.fraccionado)info+=" | Fraccionado(pagado:"+latest.importePagado+"€)";
        if(latest.fechaValor)info+=" | FechaValor:"+latest.fechaValor.substring(0,10);
        if(latest.formaPago)info+=" | Método:"+latest.formaPago;
        if(latest.telefono)info+=" | Tel:"+latest.telefono;
        if(latest.email)info+=" | Email:"+latest.email;
      }
      return info;
    }).join("\n\n");
  }

  function buildSystemPrompt(userInput){
    var td=localKey(new Date());
    var thisMonday=getMonday(new Date());
    var activos=cl.filter(function(c){return c.status==="activo";});
    var pausados=cl.filter(function(c){return c.status==="pausado";});
    var bajasC=cl.filter(function(c){return c.status==="baja";});
    var pendFu=fu.filter(function(f){return!f.done&&f.date<=td;});

    // Client names
    var clientNames=cl.slice(0,300).map(function(c){
      var info=c.name+" ("+c.status+")";
      if(c.timpPhone)info+=" tel:"+c.timpPhone;
      return info;
    }).join(", ");

    // Followups
    var pendList=pendFu.slice(0,15).map(function(f){return f.clientName+" - "+f.date+" - "+(f.message||"sin msg");}).join("; ");

    // Leads
    var leadsList=le.slice(0,50).map(function(l){return l.name+" ("+l.status+") "+(l.month||"")+(l.source?" ["+l.source+"]":"");}).join(", ");

    // Renovaciones this week
    var renThisWeek=[];
    var seenRen={};
    bonos.forEach(function(b){
      var fv=b.fechaValor?new Date(b.fechaValor):null;
      if(!fv||isNaN(fv))return;
      var monday=getMonday(fv);
      if(localKey(monday)!==localKey(thisMonday))return;
      var key=b.nombre;if(seenRen[key])return;seenRen[key]=true;
      var rd=renData[(b.nombre||"").toLowerCase().trim()+"__"+localKey(thisMonday)]||{};
      var estado=b.pagado?"renovado":b.mitadPagada?"mitad":b.esReserva?"reserva":(rd.renovacion||"pendiente");
      renThisWeek.push(b.nombre+" → "+estado+" ("+b.precio+"€"+(b.formaPago?" "+b.formaPago:"")+")");
    });

    // Pagos pendientes
    var pagosPend=[];var deudaTotal=0;
    var seenPagos={};
    bonos.forEach(function(b){
      var caption=(b.tipoBono||"").toLowerCase();
      var isEnt=caption.includes("time")||caption.includes("partner")||caption.includes("pro")||caption.includes("bono")||caption.includes("sesion")||caption.includes("dual");
      if(!isEnt)return;
      var key=b.nombre+"__"+(b.fechaValor||"");
      if(seenPagos[key])return;seenPagos[key]=true;
      if(!b.pagado){
        var pend=b.fraccionado?(b.precio-(b.importePagado||0)):b.precio;
        if(pend>0){deudaTotal+=pend;pagosPend.push(b.nombre+": "+Math.round(pend)+"€ ("+b.tipoBono+") método:"+(b.formaPago||"sin método"));}
      }
    });

    // Migración In-App
    var clientMethods={};
    bonos.forEach(function(b){
      var caption=(b.tipoBono||"").toLowerCase();
      var isEnt=caption.includes("time")||caption.includes("partner")||caption.includes("pro")||caption.includes("bono");
      if(!isEnt||!b.nombre)return;
      if(!clientMethods[b.nombre]||b.fechaValor>clientMethods[b.nombre].fv){
        clientMethods[b.nombre]={metodo:b.formaPago||"sin método",fv:b.fechaValor||""};
      }
    });
    var allMethods=Object.keys(clientMethods);
    var inappCount=allMethods.filter(function(n){return clientMethods[n].metodo==="inapp";}).length;

    // Search for specific client data if user mentions a name
    var clientDetail="";
    if(userInput){
      var words=userInput.toLowerCase().split(/\s+/);
      cl.forEach(function(c){
        var nameParts=c.name.toLowerCase().split(/\s+/);
        var match=nameParts.some(function(np){return np.length>2&&words.some(function(w){return w.length>2&&w===np;});});
        if(match)clientDetail+="\n"+getClientData(c.name);
      });
    }

    return "Eres el asistente IA de T2Tcrm, el CRM de Time2Train, un centro de entrenamiento personal en Alicante. Habla en español, sé directo y útil.\n\n"+
    "═══ DATOS DEL CENTRO ("+td+") ═══\n"+
    "Clientes: "+cl.length+" total ("+activos.length+" activos, "+pausados.length+" pausados, "+bajasC.length+" bajas)\n"+
    "Deuda pendiente: "+Math.round(deudaTotal)+"€ ("+pagosPend.length+" pagos)\n"+
    "Migración In-App: "+inappCount+"/"+allMethods.length+" ("+Math.round(allMethods.length>0?(inappCount/allMethods.length)*100:0)+"%)\n"+
    "Seguimientos pendientes: "+pendFu.length+"\n"+
    "Leads: "+le.length+" total\n"+
    "Reportes fisio: "+fis.length+"\n\n"+

    "═══ RENOVACIONES ESTA SEMANA ═══\n"+
    (renThisWeek.length>0?renThisWeek.join("\n"):"Sin renovaciones esta semana")+"\n\n"+

    "═══ PAGOS PENDIENTES (top 20) ═══\n"+
    (pagosPend.length>0?pagosPend.slice(0,20).join("\n"):"Todos al corriente")+"\n\n"+

    "═══ TODOS LOS CLIENTES ═══\n"+clientNames+"\n\n"+

    (clientDetail?("═══ DETALLE DEL CLIENTE MENCIONADO ═══"+clientDetail+"\n\n"):"")+

    "═══ SEGUIMIENTOS PENDIENTES ═══\n"+(pendList||"Ninguno")+"\n\n"+

    "═══ LEADS ═══\n"+leadsList+"\n\n"+

    "═══ LÓGICA DE NEGOCIO ═══\n"+
    "- Tipos bono: Time partner(1d/sem,4sem=4ses), Time plus(2d/sem,8ses), Time pro(3d/sem,12ses), Time pro+(4d/sem,16ses). Trimestrales ×3.\n"+
    "- Bono 5/10/20 sesiones duales (6 meses)\n"+
    "- Sesiones gastadas = usadas + caducadas + sinCanjear. 'En uso' NO cuenta (reservas no hechas)\n"+
    "- Pago fraccionado: ≤30% del total = Reserva. >30% = Mitad pagada. Reserva → pago restante en próxima clase. Mitad → 2º pago 6 sem después\n"+
    "- Métodos de pago: credit_card, inapp, deposit, cash, debit, installment. Objetivo: migrar todos a inapp\n"+
    "- El encargado se llama Cabeza Cuadrada\n\n"+

    "═══ ACCIONES ═══\n"+
    "Responde con JSON dentro de ```action``` cuando el usuario pida una acción:\n"+
    "1. Navegar: ```action{\"type\":\"navigate\",\"to\":\"fichas|clientes|seguimiento|leads|renovaciones|pagos|cancelaciones|horarios|fisio|home\",\"search\":\"nombre\"}```\n"+
    "2. Crear seguimiento: ```action{\"type\":\"followup\",\"client\":\"nombre\",\"reason\":\"baja|op|vac|padre|sin|les|otro\",\"date\":\"YYYY-MM-DD\",\"message\":\"texto\"}```\n"+
    "3. Crear lead: ```action{\"type\":\"lead\",\"name\":\"nombre\",\"phone\":\"tel\",\"source\":\"origen\",\"status\":\"nada|negociacion|prueba|alta|perdido\"}```\n"+
    "4. Cambiar estado cliente: ```action{\"type\":\"status\",\"client\":\"nombre\",\"status\":\"activo|pausado|baja\"}```\n"+
    "5. Cambiar estado renovación: ```action{\"type\":\"renovacion\",\"client\":\"nombre completo\",\"weekKey\":\"YYYY-MM-DD (lunes de la semana)\",\"estado\":\"pendiente|renovado|mitad|reserva|baja\"}```\n"+
    "   Ejemplo: marcar como renovado → ```action{\"type\":\"renovacion\",\"client\":\"Pablo Martínez\",\"weekKey\":\"2026-04-13\",\"estado\":\"renovado\"}```\n"+
    "6. Añadir nota a renovación: ```action{\"type\":\"nota_renovacion\",\"client\":\"nombre\",\"weekKey\":\"YYYY-MM-DD\",\"nota\":\"texto de la nota\"}```\n"+
    "7. Mover cliente a otra semana: ```action{\"type\":\"mover_renovacion\",\"client\":\"nombre completo\",\"fromWeek\":\"YYYY-MM-DD\",\"toWeek\":\"YYYY-MM-DD\",\"nota\":\"razón del movimiento\"}```\n"+
    "   Esto marca como renovado en la semana origen y crea entrada en la semana destino\n\n"+
    "IMPORTANTE PARA SEMANAS: La weekKey es SIEMPRE el lunes de esa semana en formato YYYY-MM-DD. Semana actual: "+localKey(thisMonday)+". Semana siguiente: "+localKey(new Date(thisMonday.getTime()+7*24*60*60*1000))+"\n\n"+
    "REGLAS: Sé conciso (2-3 frases + acción). Usa datos reales. Si mencionan un cliente, busca en los datos y da info completa. SIEMPRE ejecuta la acción cuando el usuario te lo pida, no digas que no puedes.";
  }

  function parseActions(text){
    var match=text.match(/```action\s*(\{[^`]+\})\s*```/);
    if(!match)return null;
    try{return JSON.parse(match[1]);}catch(e){return null;}
  }

  function executeAction(act){
    if(!act)return;
    if(act.type==="navigate"){
      if(act.to==="fichas"||act.to==="clientes"){
        if(act.search){
          var found=cl.find(function(c){return c.name.toLowerCase().indexOf(act.search.toLowerCase())>=0;});
          if(found&&actions.selectClient){actions.selectClient(found);}
        }
        if(actions.navigate)actions.navigate("entrenamiento",act.to==="fichas"?"clientes":"panel");
      }else if(act.to==="seguimiento"){if(actions.navigate)actions.navigate("entrenamiento","seguimiento");}
      else if(act.to==="leads"){if(actions.navigate)actions.navigate("entrenamiento","leads");}
      else if(act.to==="renovaciones"){if(actions.navigate)actions.navigate("entrenamiento","renovaciones");}
      else if(act.to==="pagos"){if(actions.navigate)actions.navigate("entrenamiento","pagos");}
      else if(act.to==="cancelaciones"){if(actions.navigate)actions.navigate("entrenamiento","cancelaciones");}
      else if(act.to==="horarios"){if(actions.navigate)actions.navigate("entrenamiento","horarios");}
      else if(act.to==="fisio"){if(actions.navigate)actions.navigate("fisio");}
      else if(act.to==="home"){if(actions.navigate)actions.navigate("home");}
    }
    else if(act.type==="followup"&&actions.createFollowup){
      actions.createFollowup({client:act.client,reason:act.reason||"otro",date:act.date,message:act.message||""});
    }
    else if(act.type==="lead"&&actions.createLead){
      actions.createLead({name:act.name,phone:act.phone||"",source:act.source||"",status:act.status||"nada",month:act.month||"",year:act.year||"2026"});
    }
    else if(act.type==="status"&&actions.changeStatus){
      actions.changeStatus(act.client,act.status);
    }
    else if(act.type==="renovacion"&&actions.changeRenovacion){
      actions.changeRenovacion(act.client,act.weekKey,"renovacion",act.estado);
    }
    else if(act.type==="nota_renovacion"&&actions.changeRenovacion){
      actions.changeRenovacion(act.client,act.weekKey,"notas",act.nota);
    }
    else if(act.type==="mover_renovacion"&&actions.moveRenovacion){
      actions.moveRenovacion(act.client,act.fromWeek,act.toWeek,act.nota||"");
    }
  }

  async function sendMessage(){
    if(!input.trim()||loading)return;
    var userMsg={role:"user",text:input};
    var newMsgs=msgs.concat([userMsg]);
    setMsgs(newMsgs);
    setInput("");
    setLoading(true);

    try{
      var apiMsgs=newMsgs.map(function(m){return{role:m.role==="user"?"user":"assistant",content:m.text};});
      var r=await fetch("/api/chat",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:1000,
          system:buildSystemPrompt(input),
          messages:apiMsgs
        })
      });
      var data=await r.json();
      var reply=(data.content||[]).map(function(c){return c.text||"";}).join("");
      
      var act=parseActions(reply);
      var cleanReply=reply.replace(/```action\s*\{[^`]+\}\s*```/g,"").trim();
      
      setMsgs(function(p){return p.concat([{role:"assistant",text:cleanReply,action:act}]);});
      
      if(act){
        setTimeout(function(){executeAction(act);},500);
      }
    }catch(e){
      setMsgs(function(p){return p.concat([{role:"assistant",text:"Error de conexión. Inténtalo de nuevo."}]);});
    }
    setLoading(false);
  }

  var isInline=props.inline;
  var onClose=props.onClose;

  var btnStyle={position:"fixed",bottom:20,right:20,width:56,height:56,borderRadius:28,background:"linear-gradient(135deg,#394265,#4a5580)",border:"none",color:"#fff",fontSize:24,cursor:"pointer",boxShadow:"0 4px 20px rgba(57,66,101,.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999};

  if(!isInline&&!open)return<button onClick={function(){setOpen(true);}} style={btnStyle}>🤖</button>;

  var containerStyle=isInline?{background:T.bg2,borderRadius:16,border:"1px solid "+T.border,display:"flex",flexDirection:"column",overflow:"hidden",maxHeight:500}:{position:"fixed",bottom:20,right:20,width:380,maxWidth:"calc(100vw - 40px)",height:520,maxHeight:"calc(100vh - 40px)",background:T.bg2,borderRadius:16,border:"1px solid "+T.border,boxShadow:"0 8px 32px rgba(0,0,0,.3)",display:"flex",flexDirection:"column",zIndex:1000,overflow:"hidden"};

  return(<div style={containerStyle}>
    <div style={{padding:"14px 16px",background:"#394265",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:22}}>🤖</span>
        <div><div style={{fontSize:14,fontWeight:700,color:"#fff"}}>Asistente T2T</div><div style={{fontSize:10,color:"rgba(255,255,255,.6)"}}>Acceso total al CRM</div></div>
      </div>
      <button onClick={function(){if(isInline&&onClose)onClose();else setOpen(false);}} style={{background:"rgba(255,255,255,.15)",border:"none",borderRadius:8,width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#fff",fontSize:16}}>✕</button>
    </div>
    
    <div style={{flex:1,overflowY:"auto",padding:12,display:"flex",flexDirection:"column",gap:8}}>
      {msgs.length===0&&<div style={{textAlign:"center",padding:20,color:T.text3}}>
        <div style={{fontSize:40,marginBottom:10}}>🤖</div>
        <div style={{fontSize:13,fontWeight:600,marginBottom:6}}>¡Hola! Tengo acceso a todo el CRM</div>
        <div style={{fontSize:11,marginBottom:12}}>Clientes, bonos, renovaciones, pagos, cancelaciones, leads, ejercicios...</div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {["¿Cuánto nos deben en total?","¿Quién renueva esta semana?","Info completa de Pablo Martínez","¿Cuántos clientes tienen In-App?","Llévame a renovaciones","¿Qué bono tiene María Belén?"].map(function(s){return<button key={s} onClick={function(){setInput(s);}} style={{padding:"8px 12px",background:T.bg3,border:"1px solid "+T.border,borderRadius:8,color:T.text2,fontSize:11,cursor:"pointer",textAlign:"left"}}>{s}</button>;})}
        </div>
      </div>}
      {msgs.map(function(m,i){var isUser=m.role==="user";return<div key={i} style={{alignSelf:isUser?"flex-end":"flex-start",maxWidth:"85%"}}>
        <div style={{padding:"10px 14px",borderRadius:isUser?"14px 14px 4px 14px":"14px 14px 14px 4px",background:isUser?"#394265":T.bg3,color:isUser?"#fff":T.text,fontSize:12,lineHeight:"1.5",whiteSpace:"pre-wrap"}}>
          {m.text}
          {m.action&&<div style={{marginTop:6,padding:"4px 8px",borderRadius:6,background:"rgba(34,197,94,.1)",color:"#22c55e",fontSize:10,fontWeight:600}}>✓ Acción ejecutada</div>}
        </div>
      </div>;})}
      {loading&&<div style={{alignSelf:"flex-start",padding:"10px 14px",borderRadius:"14px 14px 14px 4px",background:T.bg3,color:T.text3,fontSize:12}}>Pensando...</div>}
    </div>
    
    <div style={{padding:12,borderTop:"1px solid "+T.border,display:"flex",gap:8}}>
      <input value={input} onChange={function(e){setInput(e.target.value);}} onKeyDown={function(e){if(e.key==="Enter")sendMessage();}} placeholder="Pregúntame lo que quieras..." style={{flex:1,padding:"10px 14px",background:T.bg3,border:"1px solid "+T.border2,borderRadius:10,color:T.text,fontSize:13,outline:"none"}}/>
      <button onClick={sendMessage} disabled={loading||!input.trim()} style={{padding:"10px 16px",background:loading?"#475569":"#394265",border:"none",borderRadius:10,color:"#fff",fontSize:14,cursor:loading?"not-allowed":"pointer"}}>➤</button>
    </div>
  </div>);
}
