import { useState } from "react";

export default function AIAssistant(props){
  var T=props.theme;var dk=props.dk;
  var cl=props.clients||[];var fu=props.followups||[];var le=props.leads||[];var fis=props.fisio||[];
  var actions=props.actions||{};
  var _=useState;
  var o_=_(false),open=o_[0],setOpen=o_[1];
  var m_=_([]),msgs=m_[0],setMsgs=m_[1];
  var i_=_(""),input=i_[0],setInput=i_[1];
  var l_=_(false),loading=l_[0],setLoading=l_[1];

  function getClientExerciseData(name){
    var found=cl.filter(function(c){return c.name.toLowerCase().indexOf(name.toLowerCase())>=0;});
    if(!found.length)return"";
    return found.slice(0,3).map(function(c){
      if(!c.exercises||!c.exercises.length)return c.name+": sin datos de ejercicios";
      var exData=c.exercises.map(function(e){
        if(!e.records||!e.records.length)return null;
        var last=e.records[e.records.length-1];
        var best=e.records.reduce(function(a,b){return(b.weight>a.weight)?b:a;},e.records[0]);
        return e.name+": "+e.records.length+" registros. Última marca: "+last.date+" S:"+last.series+" P:"+last.weight+"kg R:"+last.reps+(last.notes?" ("+last.notes+")":"")+". Mejor peso: "+best.weight+"kg ("+best.date+")";
      }).filter(Boolean);
      return c.name+" ("+c.status+")"+(c.observations?" — "+c.observations:"")+"\n  "+exData.join("\n  ");
    }).join("\n\n");
  }

  function buildSystemPrompt(userInput){
    var td=new Date().toISOString().split("T")[0];
    var activos=cl.filter(function(c){return c.status==="activo";});
    var pausados=cl.filter(function(c){return c.status==="pausado";});
    var bajas=cl.filter(function(c){return c.status==="baja";});
    var pendFu=fu.filter(function(f){return!f.done&&f.date<=td;});

    var clientNames=cl.slice(0,200).map(function(c){return c.name+" ("+c.status+")";}).join(", ");
    var pendList=pendFu.slice(0,10).map(function(f){return f.clientName+" - "+f.date+" - "+(f.message||"sin msg");}).join("; ");
    var leadsList=le.slice(0,50).map(function(l){return l.name+" ("+l.status+") "+(l.month||"")+" "+(l.year||"");}).join(", ");

    // Search for client exercise data if user mentions a name
    var exerciseInfo="";
    if(userInput){
      var words=userInput.toLowerCase().split(/\s+/);
      cl.forEach(function(c){
        var nameParts=c.name.toLowerCase().split(/\s+/);
        var match=nameParts.some(function(np){return np.length>2&&words.some(function(w){return w.length>2&&w===np;});});
        if(match)exerciseInfo+="\n"+getClientExerciseData(c.name);
      });
    }

    return "Eres el asistente IA de T2Tcrm, el CRM de Time2Train, un centro de entrenamiento personal en Alicante. Habla en español, sé directo y útil.\n\n"+
    "DATOS ACTUALES ("+td+"):\n"+
    "- Clientes totales: "+cl.length+" ("+activos.length+" activos, "+pausados.length+" pausados, "+bajas.length+" bajas)\n"+
    "- Seguimientos pendientes: "+pendFu.length+"\n"+
    "- Leads totales: "+le.length+"\n"+
    "- Reportes fisio: "+fis.length+"\n\n"+
    "CLIENTES: "+clientNames+"\n\n"+
    (exerciseInfo?("DATOS DE EJERCICIOS DEL CLIENTE MENCIONADO:"+exerciseInfo+"\n\n"):"")+
    "SEGUIMIENTOS PENDIENTES: "+(pendList||"Ninguno")+"\n\n"+
    "LEADS RECIENTES: "+leadsList+"\n\n"+
    "ACCIONES DISPONIBLES - Responde con JSON dentro de ```action``` cuando el usuario pida una acción:\n"+
    "1. Navegar: ```action{\"type\":\"navigate\",\"to\":\"fichas|clientes|seguimiento|leads|horarios|fisio|home\",\"search\":\"nombre\"}```\n"+
    "2. Crear seguimiento: ```action{\"type\":\"followup\",\"client\":\"nombre\",\"reason\":\"baja|op|vac|padre|sin|les|otro\",\"date\":\"YYYY-MM-DD\",\"message\":\"texto\"}```\n"+
    "3. Crear lead: ```action{\"type\":\"lead\",\"name\":\"nombre\",\"phone\":\"tel\",\"source\":\"origen\",\"status\":\"nada|negociacion|prueba|alta|perdido\",\"month\":\"Mes\",\"year\":\"2026\"}```\n"+
    "4. Cambiar estado cliente: ```action{\"type\":\"status\",\"client\":\"nombre\",\"status\":\"activo|pausado|baja\"}```\n\n"+
    "REGLAS:\n"+
    "- Si preguntan por marcas, ejercicios o progresión de un cliente, usa los DATOS DE EJERCICIOS que tienes\n"+
    "- Si preguntan datos, responde con los datos reales que tienes\n"+
    "- Si piden una acción, SIEMPRE incluye el bloque action para que el sistema la ejecute\n"+
    "- Si piden navegar a una ficha de cliente, usa navigate con search=nombre del cliente\n"+
    "- Sé conciso, máximo 2-3 frases + acción si aplica\n"+
    "- Si no tienes información suficiente, pregunta lo que falta";
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

  var btnStyle={position:"fixed",bottom:20,right:20,width:56,height:56,borderRadius:28,background:"linear-gradient(135deg,#394265,#4a5580)",border:"none",color:"#fff",fontSize:24,cursor:"pointer",boxShadow:"0 4px 20px rgba(57,66,101,.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999};

  if(!open)return<button onClick={function(){setOpen(true);}} style={btnStyle}>🤖</button>;

  return(<div style={{position:"fixed",bottom:20,right:20,width:380,maxWidth:"calc(100vw - 40px)",height:500,maxHeight:"calc(100vh - 40px)",background:T.bg2,borderRadius:16,border:"1px solid "+T.border,boxShadow:"0 8px 32px rgba(0,0,0,.3)",display:"flex",flexDirection:"column",zIndex:1000,overflow:"hidden"}}>
    {/* Header */}
    <div style={{padding:"14px 16px",background:"#394265",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:22}}>🤖</span>
        <div><div style={{fontSize:14,fontWeight:700,color:"#fff"}}>Asistente T2T</div><div style={{fontSize:10,color:"rgba(255,255,255,.6)"}}>IA de Time2Train</div></div>
      </div>
      <button onClick={function(){setOpen(false);}} style={{background:"rgba(255,255,255,.15)",border:"none",borderRadius:8,width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#fff",fontSize:16}}>✕</button>
    </div>
    
    {/* Messages */}
    <div style={{flex:1,overflowY:"auto",padding:12,display:"flex",flexDirection:"column",gap:8}}>
      {msgs.length===0&&<div style={{textAlign:"center",padding:30,color:T.text3}}>
        <div style={{fontSize:40,marginBottom:10}}>🤖</div>
        <div style={{fontSize:13,fontWeight:600,marginBottom:6}}>¡Hola! Soy tu asistente</div>
        <div style={{fontSize:11}}>Puedo buscar clientes, crear seguimientos, añadir leads, consultar datos y mucho más.</div>
        <div style={{marginTop:16,display:"flex",flexDirection:"column",gap:6}}>
          {["¿Cuántos clientes activos hay?","Llévame a la ficha de Miguel","Pon a seguimiento por lesión a...","Añade un lead nuevo"].map(function(s){return<button key={s} onClick={function(){setInput(s);}} style={{padding:"8px 12px",background:T.bg3,border:"1px solid "+T.border,borderRadius:8,color:T.text2,fontSize:11,cursor:"pointer",textAlign:"left"}}>{s}</button>;})}
        </div>
      </div>}
      {msgs.map(function(m,i){var isUser=m.role==="user";return<div key={i} style={{alignSelf:isUser?"flex-end":"flex-start",maxWidth:"85%"}}>
        <div style={{padding:"10px 14px",borderRadius:isUser?"14px 14px 4px 14px":"14px 14px 14px 4px",background:isUser?"#394265":T.bg3,color:isUser?"#fff":T.text,fontSize:12,lineHeight:"1.5"}}>
          {m.text}
          {m.action&&<div style={{marginTop:6,padding:"4px 8px",borderRadius:6,background:"rgba(34,197,94,.1)",color:"#22c55e",fontSize:10,fontWeight:600}}>✓ Acción ejecutada</div>}
        </div>
      </div>;})}
      {loading&&<div style={{alignSelf:"flex-start",padding:"10px 14px",borderRadius:"14px 14px 14px 4px",background:T.bg3,color:T.text3,fontSize:12}}>
        <span style={{animation:"pulse 1s infinite"}}>Pensando...</span>
      </div>}
    </div>
    
    {/* Input */}
    <div style={{padding:12,borderTop:"1px solid "+T.border,display:"flex",gap:8}}>
      <input value={input} onChange={function(e){setInput(e.target.value);}} onKeyDown={function(e){if(e.key==="Enter")sendMessage();}} placeholder="Escribe algo..." style={{flex:1,padding:"10px 14px",background:T.bg3,border:"1px solid "+T.border2,borderRadius:10,color:T.text,fontSize:13,outline:"none"}}/>
      <button onClick={sendMessage} disabled={loading||!input.trim()} style={{padding:"10px 16px",background:loading?"#475569":"#394265",border:"none",borderRadius:10,color:"#fff",fontSize:14,cursor:loading?"not-allowed":"pointer"}}>➤</button>
    </div>
  </div>);
}
