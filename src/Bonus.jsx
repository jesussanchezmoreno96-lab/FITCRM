import { useState, useEffect } from "react";

var SUPA_URL = "https://yvzearwbwwthquekqnnk.supabase.co";
var SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2emVhcndid3d0aHF1ZWtxbm5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMTMwNTMsImV4cCI6MjA5MDg4OTA1M30.1BhalulMlEJ3am_D0e8Y3rRyM_qz0VR4_34VNV76FNE";
var TIMP_CENTER = "ebb9a2c0-782e-4d77-b5eb-17d18a1f8949";

var ENTRENADORES = ["Miguel", "Jesús", "Diego", "Marcelo", "Maribel", "Mari Carmen", "Laura"];
var TRAINER_COLORS = {
  "Miguel": "#3b82f6", "Jesús": "#22c55e", "Diego": "#06b6d4",
  "Marcelo": "#f59e0b", "Maribel": "#a78bfa", "Mari Carmen": "#ec4899", "Laura": "#f97316"
};

var ENTRENAMIENTO_BONOS = [
  "time partner", "time partner plus", "time partner pro",
  "time partner trimestral", "time partner plus trimestral", "time partner pro trimestral",
  "time pro+", "time pro trimestral+",
  "bono 5 sesiones", "bono 6 sesiones", "bono 10 sesiones", "bono 20 sesiones",
  "entrenamiento sesión", "entrenamiento sesion"
];

function isTrainingBono(caption) {
  if (!caption) return false;
  var c = caption.toLowerCase().trim();
  return ENTRENAMIENTO_BONOS.some(function (tb) { return c === tb || c.indexOf(tb) >= 0; });
}

function isTrimestraI(caption) {
  if (!caption) return false;
  return caption.toLowerCase().includes("trimestral");
}

function gid() { return Math.random().toString(36).substr(2, 9); }

function normName(s) {
  if (!s) return "";
  return String(s).toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
}

function matchesName(a, b) {
  var na = normName(a), nb = normName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  var wa = na.split(" "), wb = nb.split(" ");
  if (wa.length < 2 || wb.length < 2) return false;
  return wa[0] === wb[0] && wa[1] === wb[1];
}

function parseFechaValor(available_at) {
  if (!available_at) return null;
  var parts = available_at.split("..");
  if (parts.length !== 2) return null;
  var d = new Date(parts[0].trim());
  return isNaN(d) ? null : d;
}

// Calcular fidelización basada en historial de bonos
function calcFidelizacion(bonosCliente, subs) {
  if (!bonosCliente || bonosCliente.length === 0) return null;

  var sorted = bonosCliente.slice().sort(function (a, b) {
    var da = parseFechaValor(a.available_at);
    var db = parseFechaValor(b.available_at);
    return (da || 0) - (db || 0);
  });

  var primerBono = sorted[0];
  var fechaInicio = parseFechaValor(primerBono.available_at);
  if (!fechaInicio) return null;

  var ahora = new Date();
  var diasActivo = Math.floor((ahora - fechaInicio) / (1000 * 60 * 60 * 24));

  var trimestrales = sorted.filter(function (b) { return isTrimestraI(b.caption); });
  var mensuales = sorted.filter(function (b) { return !isTrimestraI(b.caption); });

  var fidelizado = false;
  var razon = "";

  // Caso 1: 2+ trimestrales
  if (trimestrales.length >= 2) {
    fidelizado = true;
    razon = trimestrales.length + " bonos trimestrales";
  }
  // Caso 2: 1 trimestral + al menos 1 renovación posterior
  else if (trimestrales.length === 1) {
    var fechaTrimestral = parseFechaValor(trimestrales[0].available_at);
    var renovacionesDespues = sorted.filter(function (b) {
      var fb = parseFechaValor(b.available_at);
      return fb && fechaTrimestral && fb > fechaTrimestral;
    });
    if (renovacionesDespues.length >= 1) {
      fidelizado = true;
      razon = "Trimestral + " + renovacionesDespues.length + " renovación" + (renovacionesDespues.length > 1 ? "es" : "");
    } else {
      razon = "1 trimestral (pendiente renovar)";
    }
  }
  // Caso 3: 4+ mensuales
  else if (mensuales.length >= 4) {
    fidelizado = true;
    razon = mensuales.length + " bonos mensuales";
  } else {
    razon = mensuales.length + " bono" + (mensuales.length !== 1 ? "s" : "") + " mensual" + (mensuales.length !== 1 ? "es" : "");
  }

  // Último bono — ver si sigue activo
  var ultimoBono = sorted[sorted.length - 1];
  var fechaFinUltimo = null;
  if (ultimoBono && ultimoBono.available_at) {
    var partsU = ultimoBono.available_at.split("..");
    if (partsU.length === 2) fechaFinUltimo = new Date(partsU[1].trim());
  }
  var sigueActivo = fechaFinUltimo && fechaFinUltimo > ahora;

  return {
    fidelizado: fidelizado,
    razon: razon,
    numBonos: sorted.length,
    trimestrales: trimestrales.length,
    mensuales: mensuales.length,
    fechaInicio: fechaInicio,
    diasActivo: diasActivo,
    sigueActivo: sigueActivo,
    ultimoBono: ultimoBono ? ultimoBono.caption : "",
    primerBono: primerBono.caption
  };
}

export default function Bonus(props) {
  var T = props.theme;
  var dk = props.dk;
  var clients = props.clients || [];

  var [tab, setTab] = useState("pruebas");
  var [pruebas, setPruebas] = useState([]);
  var [showForm, setShowForm] = useState(false);
  var [form, setForm] = useState({ cliente: "", entrenador: "", fecha: new Date().toISOString().split("T")[0], notas: "" });
  var [fidTab, setFidTab] = useState("todos");
  var [searchQ, setSearchQ] = useState("");
  var [fidData, setFidData] = useState([]);
  var [fidLoading, setFidLoading] = useState(false);
  var [fidLoaded, setFidLoaded] = useState(false);

  // Cargar pruebas de Supabase
  useEffect(function () {
    fetch(SUPA_URL + "/rest/v1/bonus_pruebas?select=*", {
      headers: { "apikey": SUPA_KEY, "Authorization": "Bearer " + SUPA_KEY }
    }).then(function (r) { return r.json(); }).then(function (r) {
      if (r && r.length > 0) setPruebas(r.map(function (x) { return x.data; }));
    }).catch(function () { });
  }, []);

  // Cargar fidelización desde TIMP
  function loadFidelizacion() {
    setFidLoading(true);
    var allAutos = [];

    function fetchPage(page) {
      return fetch("/api/timp?path=branch_buildings/" + TIMP_CENTER + "/autopurchases%3Fdate_from=2023-01-01%26date_to=2027-12-31%26page=" + page)
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (!d || !d.collection) return;
          allAutos = allAutos.concat(d.collection);
          var totalPages = d.page_data ? d.page_data.total_pages : 1;
          if (page < totalPages) return fetchPage(page + 1);
        });
    }

    // También necesitamos subscriptions para los nombres
    Promise.all([
      fetchPage(1),
      fetch("/api/timp?path=branch_buildings/" + TIMP_CENTER + "/subscriptions%3Fpage=1")
        .then(function (r) { return r.json(); })
    ]).then(function (results) {
      var subs = results[1] && results[1].collection ? results[1].collection : [];

      // Agrupar bonos de entrenamiento por suscription_uuid
      var bonosPorSub = {};
      allAutos.forEach(function (a) {
        if (!a.suscription_uuid) return;
        if (!isTrainingBono(a.caption)) return;
        if (a.removed) return;
        if (!bonosPorSub[a.suscription_uuid]) bonosPorSub[a.suscription_uuid] = [];
        bonosPorSub[a.suscription_uuid].push(a);
      });

      // Calcular fidelización por cliente
      var resultado = [];
      Object.keys(bonosPorSub).forEach(function (uuid) {
        var bonos = bonosPorSub[uuid];
        var sub = subs.find(function (s) { return s.uuid === uuid; });
        var nombre = sub ? sub.full_name : uuid;
        var fid = calcFidelizacion(bonos, subs);
        if (!fid) return;
        resultado.push({
          nombre: nombre,
          uuid: uuid,
          fidelizado: fid.fidelizado,
          razon: fid.razon,
          numBonos: fid.numBonos,
          trimestrales: fid.trimestrales,
          mensuales: fid.mensuales,
          fechaInicio: fid.fechaInicio,
          diasActivo: fid.diasActivo,
          sigueActivo: fid.sigueActivo,
          ultimoBono: fid.ultimoBono,
          primerBono: fid.primerBono
        });
      });

      // Ordenar: primero fidelizados, luego por días activo
      resultado.sort(function (a, b) {
        if (a.fidelizado && !b.fidelizado) return -1;
        if (!a.fidelizado && b.fidelizado) return 1;
        return b.diasActivo - a.diasActivo;
      });

      setFidData(resultado);
      setFidLoading(false);
      setFidLoaded(true);
    }).catch(function () { setFidLoading(false); });
  }

  function savePrueba(p) {
    fetch(SUPA_URL + "/rest/v1/bonus_pruebas", {
      method: "POST",
      headers: { "apikey": SUPA_KEY, "Authorization": "Bearer " + SUPA_KEY, "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates" },
      body: JSON.stringify({ id: p.id, data: p, updated_at: new Date().toISOString() })
    }).catch(function () { });
  }

  function deletePrueba(id) {
    fetch(SUPA_URL + "/rest/v1/bonus_pruebas?id=eq." + id, {
      method: "DELETE",
      headers: { "apikey": SUPA_KEY, "Authorization": "Bearer " + SUPA_KEY }
    }).catch(function () { });
  }

  function addPrueba() {
    if (!form.cliente || !form.entrenador || !form.fecha) return;
    var np = {
      id: gid(), cliente: form.cliente, entrenador: form.entrenador,
      fecha: form.fecha, notas: form.notas, convirtio: false,
      fechaRegistro: new Date().toISOString()
    };
    setPruebas(pruebas.concat([np]));
    savePrueba(np);
    setShowForm(false);
    setForm({ cliente: "", entrenador: "", fecha: new Date().toISOString().split("T")[0], notas: "" });
  }

  function toggleConvirtio(id) {
    var updated = pruebas.map(function (p) {
      if (p.id === id) {
        var upd = Object.assign({}, p, { convirtio: !p.convirtio });
        savePrueba(upd);
        return upd;
      }
      return p;
    });
    setPruebas(updated);
  }

  function removePrueba(id) {
    if (!confirm("¿Eliminar este entrenamiento de prueba?")) return;
    setPruebas(pruebas.filter(function (p) { return p.id !== id; }));
    deletePrueba(id);
  }

  // Stats por entrenador
  var statsByTrainer = {};
  ENTRENADORES.forEach(function (e) { statsByTrainer[e] = { pruebas: 0, conversiones: 0 }; });
  pruebas.forEach(function (p) {
    if (statsByTrainer[p.entrenador]) {
      statsByTrainer[p.entrenador].pruebas++;
      if (p.convirtio) statsByTrainer[p.entrenador].conversiones++;
    }
  });

  // Filtrar fidelización
  var fidFiltrada = fidData.filter(function (f) {
    if (fidTab === "mas90") return f.fidelizado && f.sigueActivo;
    if (fidTab === "menos90") return !f.fidelizado;
    if (fidTab === "inactivos") return f.fidelizado && !f.sigueActivo;
    return true;
  }).filter(function (f) {
    if (!searchQ) return true;
    return f.nombre.toLowerCase().includes(searchQ.toLowerCase());
  });

  var totalMas90 = fidData.filter(function (f) { return f.fidelizado && f.sigueActivo; }).length;
  var totalMenos90 = fidData.filter(function (f) { return !f.fidelizado; }).length;
  var totalInactivos = fidData.filter(function (f) { return f.fidelizado && !f.sigueActivo; }).length;

  var B = { background: T.bg2, borderRadius: 14, border: "1px solid " + T.border, overflow: "hidden" };

  function formatFecha(d) {
    if (!d) return "";
    try { return new Date(d).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }); }
    catch (e) { return ""; }
  }

  return (<div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
      <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>🏆 Bonus</h2>
    </div>

    {/* TABS */}
    <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
      <button onClick={function () { setTab("pruebas"); }} style={{ padding: "10px 18px", borderRadius: 10, border: tab === "pruebas" ? "2px solid #f59e0b" : "2px solid " + T.border, background: tab === "pruebas" ? "#f59e0b10" : "transparent", color: tab === "pruebas" ? "#f59e0b" : T.text3, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
        🎯 Entrenamientos de Prueba
        <span style={{ marginLeft: 8, fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "#f59e0b20", color: "#f59e0b" }}>{pruebas.length}</span>
      </button>
      <button onClick={function () { setTab("fidelizacion"); if (!fidLoaded) loadFidelizacion(); }} style={{ padding: "10px 18px", borderRadius: 10, border: tab === "fidelizacion" ? "2px solid #22c55e" : "2px solid " + T.border, background: tab === "fidelizacion" ? "#22c55e10" : "transparent", color: tab === "fidelizacion" ? "#22c55e" : T.text3, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
        📅 Fidelización 90 días
        {fidLoaded && <span style={{ marginLeft: 8, fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "#22c55e20", color: "#22c55e" }}>{totalMas90}/{fidData.length}</span>}
      </button>
    </div>

    {/* ══ TAB PRUEBAS ══ */}
    {tab === "pruebas" && <div>
      {/* Stats por entrenador */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        {ENTRENADORES.map(function (e) {
          var s = statsByTrainer[e];
          if (s.pruebas === 0) return null;
          var pct = Math.round((s.conversiones / s.pruebas) * 100);
          var color = TRAINER_COLORS[e] || "#64748b";
          var isGood = pct >= 60;
          return <div key={e} style={{ background: T.bg2, borderRadius: 12, border: "1px solid " + T.border, padding: "14px 18px", minWidth: 140, flex: "1 1 140px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: 4, background: color }}></div>
              <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{e}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: isGood ? "#22c55e" : pct > 0 ? "#f59e0b" : "#ef4444" }}>{pct}%</div>
            <div style={{ fontSize: 10, color: T.text3, marginTop: 2 }}>{s.conversiones} de {s.pruebas} pruebas</div>
            <div style={{ marginTop: 8, height: 4, borderRadius: 2, background: T.border, overflow: "hidden" }}>
              <div style={{ height: "100%", width: pct + "%", background: isGood ? "#22c55e" : "#f59e0b", borderRadius: 2 }}></div>
            </div>
            <div style={{ fontSize: 9, color: isGood ? "#22c55e" : "#f59e0b", fontWeight: 700, marginTop: 4 }}>
              {isGood ? "✅ Objetivo cumplido" : "⚠️ Por debajo del 60%"}
            </div>
          </div>;
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button onClick={function () { setShowForm(true); }} style={{ padding: "10px 20px", background: "linear-gradient(135deg,#f59e0b,#d97706)", border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + Añadir Entreno de Prueba
        </button>
      </div>

      <div style={B}>
        {pruebas.length === 0 && <div style={{ padding: 40, textAlign: "center", color: T.text3 }}>
          <div style={{ fontSize: 40, opacity: 0.2, marginBottom: 10 }}>🎯</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Sin entrenamientos de prueba registrados</div>
          <div style={{ fontSize: 12, marginTop: 6 }}>Añade el primero con el botón de arriba</div>
        </div>}
        {pruebas.slice().sort(function (a, b) { return b.fecha > a.fecha ? 1 : -1; }).map(function (p) {
          var color = TRAINER_COLORS[p.entrenador] || "#64748b";
          var meses = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"];
          return <div key={p.id} style={{ padding: "14px 20px", borderBottom: "1px solid " + T.border, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ textAlign: "center", minWidth: 45 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: T.text }}>{p.fecha.split("-")[2]}</div>
              <div style={{ fontSize: 9, color: T.text3, fontWeight: 600 }}>{meses[parseInt(p.fecha.split("-")[1])-1]}</div>
            </div>
            <div style={{ flex: 1, minWidth: 150 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{p.cliente}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                <div style={{ width: 6, height: 6, borderRadius: 3, background: color }}></div>
                <span style={{ fontSize: 11, color: color, fontWeight: 600 }}>{p.entrenador}</span>
              </div>
              {p.notas && <div style={{ fontSize: 10, color: T.text3, marginTop: 3 }}>{p.notas}</div>}
            </div>
            <button onClick={function () { toggleConvirtio(p.id); }} style={{ padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, background: p.convirtio ? "#22c55e15" : "#ef444415", color: p.convirtio ? "#22c55e" : "#ef4444" }}>
              {p.convirtio ? "✅ Convirtió" : "❌ No convirtió"}
            </button>
            <button onClick={function () { removePrueba(p.id); }} style={{ background: "none", border: "none", color: T.text3, cursor: "pointer", fontSize: 14, padding: 4 }}>🗑️</button>
          </div>;
        })}
      </div>
    </div>}

    {/* ══ TAB FIDELIZACIÓN ══ */}
    {tab === "fidelizacion" && <div>
      {fidLoading && <div style={{ textAlign: "center", padding: 40 }}>
        <div style={{ fontSize: 40, opacity: 0.2, marginBottom: 10 }}>🔄</div>
        <div style={{ fontSize: 14, color: T.text3 }}>Cargando historial de bonos desde TIMP...</div>
      </div>}

      {!fidLoading && fidLoaded && <div>
        {/* Stats */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 120, background: "#22c55e10", borderRadius: 12, border: "1px solid #22c55e30", padding: "14px 18px", textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#22c55e" }}>{totalMas90}</div>
            <div style={{ fontSize: 10, color: "#22c55e", fontWeight: 700 }}>+90 DÍAS ✅</div>
            <div style={{ fontSize: 9, color: T.text3, marginTop: 2 }}>activos y fidelizados</div>
          </div>
          <div style={{ flex: 1, minWidth: 120, background: "#ef444410", borderRadius: 12, border: "1px solid #ef444430", padding: "14px 18px", textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#ef4444" }}>{totalMenos90}</div>
            <div style={{ fontSize: 10, color: "#ef4444", fontWeight: 700 }}>-90 DÍAS ❌</div>
            <div style={{ fontSize: 9, color: T.text3, marginTop: 2 }}>no han llegado a 90 días</div>
          </div>
          <div style={{ flex: 1, minWidth: 120, background: "#94a3b810", borderRadius: 12, border: "1px solid #94a3b830", padding: "14px 18px", textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: T.text3 }}>{totalInactivos}</div>
            <div style={{ fontSize: 10, color: T.text3, fontWeight: 700 }}>FIDELIZADOS INACTIVOS</div>
            <div style={{ fontSize: 9, color: T.text3, marginTop: 2 }}>llegaron a 90d pero causaron baja</div>
          </div>
          <div style={{ flex: 1, minWidth: 120, background: T.bg2, borderRadius: 12, border: "1px solid " + T.border, padding: "14px 18px", textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: T.text }}>{fidData.length > 0 ? Math.round((totalMas90 / fidData.length) * 100) : 0}%</div>
            <div style={{ fontSize: 10, color: T.text3, fontWeight: 700 }}>TASA FIDELIZACIÓN</div>
          </div>
        </div>

        {/* Filtros */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {[["todos","Todos",fidData.length,T.navy],["mas90","+90 días activos",totalMas90,"#22c55e"],["menos90","-90 días",totalMenos90,"#ef4444"],["inactivos","Fidelizados inactivos",totalInactivos,"#94a3b8"]].map(function(x){
            return <button key={x[0]} onClick={function(){ setFidTab(x[0]); }} style={{ padding: "8px 14px", borderRadius: 9, border: fidTab===x[0]?"2px solid "+x[3]:"1px solid "+T.border, background: fidTab===x[0]?x[3]+"15":"transparent", color: fidTab===x[0]?x[3]:T.text3, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              {x[1]} ({x[2]})
            </button>;
          })}
        </div>

        {/* Búsqueda */}
        <div style={{ marginBottom: 16 }}>
          <input placeholder="🔍 Buscar cliente..." value={searchQ} onChange={function(e){ setSearchQ(e.target.value); }}
            style={{ width: "100%", padding: "10px 14px", background: T.bg3, border: "1px solid " + T.border2, borderRadius: 10, color: T.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
        </div>

        {/* Lista */}
        <div style={B}>
          {fidFiltrada.length === 0 && <div style={{ padding: 40, textAlign: "center", color: T.text3 }}>
            <div style={{ fontSize: 30, opacity: 0.3, marginBottom: 8 }}>📅</div>
            Sin clientes en este filtro
          </div>}
          {fidFiltrada.map(function (f, i) {
            var color = f.fidelizado && f.sigueActivo ? "#22c55e" : !f.fidelizado ? "#ef4444" : "#94a3b8";
            var badge = f.fidelizado && f.sigueActivo ? "+90 días ✅" : !f.fidelizado ? "-90 días ❌" : "Fidelizado inactivo";
            return <div key={i} style={{ padding: "14px 20px", borderBottom: "1px solid " + T.border, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ width: 10, height: 10, borderRadius: 5, background: color, flexShrink: 0 }}></div>
              <div style={{ flex: 1, minWidth: 150 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{f.nombre}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 3, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, color: T.text3 }}>Inicio: {formatFecha(f.fechaInicio)}</span>
                  <span style={{ fontSize: 10, color: T.text3 }}>· {f.diasActivo} días</span>
                  <span style={{ fontSize: 10, color: T.text3 }}>· {f.razon}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: T.bg3, color: T.text3, fontWeight: 600 }}>{f.numBonos} bonos</span>
                <span style={{ fontSize: 11, padding: "4px 12px", borderRadius: 8, background: color + "15", color: color, fontWeight: 700 }}>{badge}</span>
              </div>
            </div>;
          })}
        </div>

        <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
          <button onClick={function(){ setFidLoaded(false); loadFidelizacion(); }} style={{ padding: "8px 16px", background: T.bg3, border: "1px solid " + T.border, borderRadius: 8, color: T.text3, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
            🔄 Actualizar datos
          </button>
        </div>
      </div>}

      {!fidLoading && !fidLoaded && <div style={{ textAlign: "center", padding: 40 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>📅</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 8 }}>Fidelización automática desde TIMP</div>
        <div style={{ fontSize: 12, color: T.text3, marginBottom: 20 }}>Calcula automáticamente quién lleva +90 días basándose en el historial de bonos</div>
        <button onClick={loadFidelizacion} style={{ padding: "12px 24px", background: "linear-gradient(135deg,#22c55e,#16a34a)", border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          📊 Cargar Fidelización
        </button>
      </div>}
    </div>}

    {/* MODAL */}
    {showForm && <div onClick={function () { setShowForm(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div onClick={function (e) { e.stopPropagation(); }} style={{ background: T.bg, borderRadius: 16, padding: 28, width: "90%", maxWidth: 440, border: "1px solid " + T.border2 }}>
        <h3 style={{ margin: "0 0 20px", fontSize: 17, fontWeight: 800, color: T.text }}>🎯 Nuevo Entrenamiento de Prueba</h3>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, color: T.text3, fontWeight: 700, display: "block", marginBottom: 6 }}>CLIENTE</label>
          <input value={form.cliente} onChange={function (e) { setForm(Object.assign({}, form, { cliente: e.target.value })); }}
            placeholder="Nombre completo del cliente..."
            style={{ width: "100%", padding: "10px 14px", background: T.bg2, border: "1px solid " + T.border2, borderRadius: 10, color: T.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
          {form.cliente.length > 2 && <div style={{ background: T.bg2, border: "1px solid " + T.border, borderRadius: 8, marginTop: 4, maxHeight: 150, overflowY: "auto" }}>
            {clients.filter(function (c) { return c.name && c.name.toLowerCase().includes(form.cliente.toLowerCase()) && c.status === "activo"; }).slice(0, 5).map(function (c) {
              return <div key={c.id} onClick={function () { setForm(Object.assign({}, form, { cliente: c.name })); }}
                style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13, color: T.text, borderBottom: "1px solid " + T.border }}>
                {c.name}
              </div>;
            })}
          </div>}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, color: T.text3, fontWeight: 700, display: "block", marginBottom: 6 }}>ENTRENADOR</label>
          <select value={form.entrenador} onChange={function (e) { setForm(Object.assign({}, form, { entrenador: e.target.value })); }}
            style={{ width: "100%", padding: "10px 14px", background: T.bg2, border: "1px solid " + T.border2, borderRadius: 10, color: T.text, fontSize: 13, outline: "none", boxSizing: "border-box" }}>
            <option value="">Seleccionar entrenador...</option>
            {ENTRENADORES.map(function (e) { return <option key={e} value={e}>{e}</option>; })}
          </select>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, color: T.text3, fontWeight: 700, display: "block", marginBottom: 6 }}>FECHA DE LA PRUEBA</label>
          <input type="date" value={form.fecha} onChange={function (e) { setForm(Object.assign({}, form, { fecha: e.target.value })); }}
            style={{ width: "100%", padding: "10px 14px", background: T.bg2, border: "1px solid " + T.border2, borderRadius: 10, color: T.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, color: T.text3, fontWeight: 700, display: "block", marginBottom: 6 }}>NOTAS (opcional)</label>
          <input value={form.notas} onChange={function (e) { setForm(Object.assign({}, form, { notas: e.target.value })); }}
            placeholder="Observaciones..."
            style={{ width: "100%", padding: "10px 14px", background: T.bg2, border: "1px solid " + T.border2, borderRadius: 10, color: T.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={function () { setShowForm(false); }} style={{ flex: 1, padding: 12, background: T.bg3, border: "1px solid " + T.border, borderRadius: 10, color: T.text3, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
          <button onClick={addPrueba} style={{ flex: 1, padding: 12, background: "linear-gradient(135deg,#f59e0b,#d97706)", border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Guardar</button>
        </div>
      </div>
    </div>}
  </div>);
}
