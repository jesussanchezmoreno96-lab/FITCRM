import { useState, useEffect } from "react";

var DAYS_ES = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];

// Detecta días/semana según tipo de bono
function diasBono(tipoBono) {
  if (!tipoBono) return null;
  var t = tipoBono.toLowerCase();
  if (t.includes("pro+") || t.includes("pro trimestral+") || t.includes("4 dias")) return 4;
  if (t.includes("pro")) return 3;
  if (t.includes("plus")) return 2;
  if (t.includes("partner")) return 1;
  if (t.includes("bono 5") || t.includes("bono 6") || t.includes("bono 10") || t.includes("bono 20")) return null; // sesiones sueltas
  return null;
}

function localKey(d) {
  var dd = new Date(d);
  return dd.getFullYear() + "-" + (dd.getMonth() + 1 < 10 ? "0" : "") + (dd.getMonth() + 1) + "-" + (dd.getDate() < 10 ? "0" : "") + dd.getDate();
}

function getMonday(d) {
  var date = new Date(d);
  var day = date.getDay();
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  date.setHours(0, 0, 0, 0);
  return date;
}

export default function Cancelaciones(props) {
  var T = props.theme;
  var dk = props.dk;
  var bonos = props.bonos || [];
  var timpCenter = "ebb9a2c0-782e-4d77-b5eb-17d18a1f8949";

  var _ = useState;
  var loading_ = _(true), loading = loading_[0], setLoading = loading_[1];
  var admissions_ = _([]), admissions = admissions_[0], setAdmissions = admissions_[1];
  var semanas_ = _(3), semanas = semanas_[0], setSemanas = semanas_[1];
  var lastRefresh_ = _(null), lastRefresh = lastRefresh_[0], setLastRefresh = lastRefresh_[1];
  var tab_ = _("cancelaciones"), tab = tab_[0], setTab = tab_[1];

  // Fetch admissions — past week + future weeks
  function fetchAdmissions() {
    var today = new Date();
    // Fetch desde el lunes de esta semana para el reporte semanal
    var monday = getMonday(today);
    var from = localKey(monday);
    var futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + semanas * 7);
    var to = localKey(futureDate);

    var url = "/api/timp?path=branch_buildings/" + timpCenter + "/admissions%3Fdate_from=" + from + "%26date_to=" + to + "%26page=1";
    fetch(url).then(function (r) { return r.json(); }).then(function (d) {
      if (d && d.collection) {
        var allAdmissions = d.collection;
        var totalPages = d.page_data ? d.page_data.total_pages : 1;
        if (totalPages > 1) {
          var promises = [];
          for (var p = 2; p <= totalPages; p++) {
            var pageUrl = "/api/timp?path=branch_buildings/" + timpCenter + "/admissions%3Fdate_from=" + from + "%26date_to=" + to + "%26page=" + p;
            promises.push(fetch(pageUrl).then(function (r) { return r.json(); }));
          }
          Promise.all(promises).then(function (pages) {
            pages.forEach(function (pg) {
              if (pg && pg.collection) allAdmissions = allAdmissions.concat(pg.collection);
            });
            setAdmissions(allAdmissions);
            setLoading(false);
            setLastRefresh(new Date());
          });
        } else {
          setAdmissions(allAdmissions);
          setLoading(false);
          setLastRefresh(new Date());
        }
      } else {
        setLoading(false);
      }
    }).catch(function () { setLoading(false); });
  }

  useEffect(function () { fetchAdmissions(); }, [semanas]);
  useEffect(function () {
    var interval = setInterval(function () { fetchAdmissions(); }, 5 * 60 * 1000);
    return function () { clearInterval(interval); };
  }, [semanas]);

  if (loading) {
    return (<div>
      <h2 style={{ margin: "0 0 20px", fontSize: 24, fontWeight: 800 }}>🚫 Cancelaciones</h2>
      <div style={{ background: T.bg2, borderRadius: 14, border: "1px solid " + T.border, padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 40, opacity: 0.2, marginBottom: 10 }}>🔄</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: T.text2 }}>Cargando datos de TIMP...</div>
      </div>
    </div>);
  }

  // ══ PROCESS DATA ══
  var now = new Date();
  var todayStr = localKey(now);
  var thisMonday = getMonday(now);
  var thisMondayStr = localKey(thisMonday);

  // ══ FIRST PASS: build map of valid sessions per client per day ══
  var validSessionsByDay = {};
  admissions.forEach(function (a) {
    var dateStr = a.starting_at ? a.starting_at.substring(0, 10) : "";
    (a.bookings || []).forEach(function (b) {
      if (b.status === "valid") {
        validSessionsByDay[b.full_name + "__" + dateStr] = true;
      }
    });
  });

  // ══ SECOND PASS: process cancellations, queue alerts, unattended ══
  var clientMap = {};
  var todayCancels = [];
  var queueAlerts = [];

  // Reporte semanal: sesiones por cliente esta semana
  var weeklyReport = {}; // nombre → { diasContratados, sesionesVenidas, sesionesNoVino, sesionesCanceladas, tipoBono }

  admissions.forEach(function (a) {
    var dateStr = a.starting_at ? a.starting_at.substring(0, 10) : "";
    var timeStr = a.starting_at ? a.starting_at.substring(11, 16) : "";
    var dateObj = new Date(a.starting_at);
    var dayName = DAYS_ES[dateObj.getDay()];
    var capacity = a.capacity || 0;
    var isThisWeek = dateStr >= thisMondayStr && dateStr <= todayStr;

    var validBookings = [];
    var canceledBookings = [];
    var queueBookings = [];

    (a.bookings || []).forEach(function (b) {
      if (b.status === "valid") validBookings.push(b);
      else if (b.status === "canceled") canceledBookings.push(b);
      else if (b.status === "at_queue") queueBookings.push(b);
    });

    // Reporte semanal — sesiones de esta semana (hasta hoy)
    if (isThisWeek) {
      // Sesiones que vinieron (valid + attended o sin attendance_status)
      validBookings.forEach(function (b) {
        var name = b.full_name;
        if (!weeklyReport[name]) {
          // Buscar tipo de bono
          var bonoCliente = bonos.find(function (bo) {
            var bn = (bo.nombre || "").toLowerCase().trim();
            var nn = name.toLowerCase().trim();
            return bn === nn || (bn.split(" ")[0] === nn.split(" ")[0] && bn.split(" ")[1] === nn.split(" ")[1]);
          });
          var tipo = bonoCliente ? (bonoCliente.tipoBono || "") : "";
          weeklyReport[name] = { diasContratados: diasBono(tipo), tipoBono: tipo, vino: 0, noVino: 0, cancelo: 0 };
        }
        if (b.attendance_status === "unattended") {
          weeklyReport[name].noVino++;
        } else {
          weeklyReport[name].vino++;
        }
      });

      // Cancelaciones esta semana
      canceledBookings.forEach(function (b) {
        var name = b.full_name;
        var hasOtherSession = validSessionsByDay[name + "__" + dateStr];
        if (hasOtherSession) return;
        if (!weeklyReport[name]) {
          var bonoCliente = bonos.find(function (bo) {
            var bn = (bo.nombre || "").toLowerCase().trim();
            var nn = name.toLowerCase().trim();
            return bn === nn || (bn.split(" ")[0] === nn.split(" ")[0] && bn.split(" ")[1] === nn.split(" ")[1]);
          });
          var tipo = bonoCliente ? (bonoCliente.tipoBono || "") : "";
          weeklyReport[name] = { diasContratados: diasBono(tipo), tipoBono: tipo, vino: 0, noVino: 0, cancelo: 0 };
        }
        weeklyReport[name].cancelo++;
      });
    }

    // Cancelaciones generales (ranking)
    canceledBookings.forEach(function (b) {
      var name = b.full_name;
      var hasOtherSession = validSessionsByDay[name + "__" + dateStr];
      if (hasOtherSession) return;
      if (!clientMap[name]) clientMap[name] = { nombre: name, cancelaciones: 0, detalles: [] };
      clientMap[name].cancelaciones++;
      clientMap[name].detalles.push({ fecha: dateStr, hora: timeStr, dia: dayName });
      if (dateStr === todayStr) todayCancels.push({ nombre: name, hora: timeStr, dia: dayName });
    });

    // Queue alerts
    var realCancels = canceledBookings.filter(function (b) {
      return !validSessionsByDay[b.full_name + "__" + dateStr];
    });
    if (realCancels.length > 0 && queueBookings.length > 0 && validBookings.length < capacity) {
      queueAlerts.push({
        fecha: dateStr, hora: timeStr, dia: dayName,
        cancelados: realCancels.map(function (b) { return b.full_name; }),
        enCola: queueBookings.map(function (b) { return b.full_name; }),
        capacidad: capacity, activos: validBookings.length,
        huecos: capacity - validBookings.length
      });
    }
  });

  // Construir lista del reporte semanal — solo clientes con problema
  var reporteList = Object.keys(weeklyReport).map(function (name) {
    var r = weeklyReport[name];
    var totalAsistencias = r.vino;
    var diasContratados = r.diasContratados;
    // Si no tiene días contratados conocidos, no podemos evaluar
    if (!diasContratados) return null;
    // Si ha venido todos los días contratados → OK, no mostrar
    if (totalAsistencias >= diasContratados) return null;
    // Si ha cancelado o no ha venido
    var faltan = diasContratados - totalAsistencias;
    return {
      nombre: name,
      tipoBono: r.tipoBono,
      diasContratados: diasContratados,
      vino: r.vino,
      noVino: r.noVino,
      cancelo: r.cancelo,
      faltan: faltan,
      // Riesgo: no ha venido nada = rojo; ha venido algo pero no todo = naranja
      riesgo: totalAsistencias === 0 ? "alto" : "medio"
    };
  }).filter(Boolean).sort(function (a, b) {
    if (a.riesgo === "alto" && b.riesgo !== "alto") return -1;
    if (b.riesgo === "alto" && a.riesgo !== "alto") return 1;
    return b.faltan - a.faltan;
  });

  var clientList = Object.values(clientMap).sort(function (a, b) { return b.cancelaciones - a.cancelaciones; });
  var enRiesgo = clientList.filter(function (c) { return c.cancelaciones >= 3; });
  var totalCancels = clientList.reduce(function (s, c) { return s + c.cancelaciones; }, 0);
  queueAlerts.sort(function (a, b) { return a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.hora < b.hora ? -1 : 1; });

  // Día de la semana — mostrar reporte si es jueves o viernes
  var dayOfWeek = now.getDay(); // 4=Jueves, 5=Viernes
  var esJuevesoViernes = dayOfWeek === 4 || dayOfWeek === 5;

  return (<div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
      <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>🚫 Cancelaciones</h2>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {lastRefresh && <span style={{ fontSize: 10, color: T.text3 }}>🔄 {lastRefresh.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</span>}
        <button onClick={function () { setLoading(true); fetchAdmissions(); }}
          style={{ padding: "6px 12px", background: T.bg3, border: "1px solid " + T.border2, borderRadius: 8, color: T.text3, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>↻ Actualizar</button>
        <select value={semanas} onChange={function (e) { setSemanas(+e.target.value); setLoading(true); }}
          style={{ padding: "8px 14px", fontSize: 13, fontWeight: 700, background: T.bg2, border: "2px solid " + T.navy, borderRadius: 10, color: T.text, outline: "none", cursor: "pointer" }}>
          <option value={2}>2 semanas</option>
          <option value={3}>3 semanas</option>
          <option value={4}>4 semanas</option>
        </select>
      </div>
    </div>

    {/* ── TABS ── */}
    <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
      <button onClick={function () { setTab("cancelaciones"); }} style={{ padding: "10px 18px", borderRadius: 10, border: tab === "cancelaciones" ? "2px solid #ef4444" : "2px solid " + T.border, background: tab === "cancelaciones" ? "#ef444410" : "transparent", color: tab === "cancelaciones" ? "#ef4444" : T.text3, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
        🚫 Cancelaciones
      </button>
      <button onClick={function () { setTab("reporte"); }} style={{ padding: "10px 18px", borderRadius: 10, border: tab === "reporte" ? "2px solid #a78bfa" : "2px solid " + T.border, background: tab === "reporte" ? "#a78bfa10" : "transparent", color: tab === "reporte" ? "#a78bfa" : T.text3, fontSize: 13, fontWeight: 700, cursor: "pointer", position: "relative" }}>
        📋 Reporte Semanal
        {reporteList.length > 0 && <span style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: 9, background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{reporteList.length}</span>}
      </button>
    </div>

    {/* ══ TAB CANCELACIONES ══ */}
    {tab === "cancelaciones" && <div>

      {/* Queue alerts */}
      {queueAlerts.length > 0 && <div style={{ background: dk ? "rgba(239,68,68,.06)" : "#fef2f2", border: "2px solid " + (dk ? "rgba(239,68,68,.3)" : "#fecaca"), borderRadius: 14, padding: "20px 24px", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 22 }}>🔔</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: "#ef4444" }}>¡Hay clientes en cola esperando plaza!</span>
        </div>
        {queueAlerts.map(function (q, i) {
          return <div key={i} style={{ background: dk ? "rgba(239,68,68,.08)" : "#fff5f5", borderRadius: 12, padding: "14px 18px", marginBottom: i < queueAlerts.length - 1 ? 8 : 0, border: "1px solid " + (dk ? "rgba(239,68,68,.15)" : "#fee2e2") }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: "#ef4444" }}>{q.dia} {q.hora}</span>
              <span style={{ fontSize: 12, color: T.text3 }}>{q.fecha}</span>
            </div>
            <div style={{ fontSize: 13, color: T.text, marginBottom: 6 }}><span style={{ color: "#ef4444", fontWeight: 700 }}>Canceló:</span> {q.cancelados.join(", ")}</div>
            <div style={{ fontSize: 13, color: T.text, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "#22c55e", fontWeight: 700 }}>📱 En cola:</span>
              <span style={{ fontWeight: 700 }}>{q.enCola.join(", ")}</span>
              <span style={{ fontSize: 11, color: T.text3 }}>— {q.huecos} hueco{q.huecos > 1 ? "s" : ""} libre{q.huecos > 1 ? "s" : ""} — ¡Avisar por WhatsApp!</span>
            </div>
          </div>;
        })}
      </div>}

      {/* Today's cancellations */}
      {todayCancels.length > 0 && <div style={{ background: dk ? "rgba(245,158,11,.06)" : "#fefce8", border: "1px solid " + (dk ? "rgba(245,158,11,.2)" : "#fde68a"), borderRadius: 14, padding: "16px 20px", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: "#f59e0b" }}>Cancelaciones de hoy ({todayCancels.length})</span>
        </div>
        {todayCancels.map(function (c, i) {
          return <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: dk ? "rgba(245,158,11,.08)" : "#fffbeb", borderRadius: 8, marginBottom: i < todayCancels.length - 1 ? 4 : 0 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{c.nombre}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b" }}>🕐 {c.hora}</span>
          </div>;
        })}
      </div>}

      {/* Stats */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 140, background: T.bg2, borderRadius: 14, border: "1px solid " + T.border, padding: "16px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#ef4444" }}>{totalCancels}</div>
          <div style={{ fontSize: 11, color: T.text3, fontWeight: 600 }}>Cancelaciones totales</div>
        </div>
        <div style={{ flex: 1, minWidth: 140, background: T.bg2, borderRadius: 14, border: "1px solid " + T.border, padding: "16px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#f59e0b" }}>{enRiesgo.length}</div>
          <div style={{ fontSize: 11, color: T.text3, fontWeight: 600 }}>Clientes en riesgo (3+)</div>
        </div>
        <div style={{ flex: 1, minWidth: 140, background: T.bg2, borderRadius: 14, border: "1px solid " + T.border, padding: "16px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#22c55e" }}>{queueAlerts.length}</div>
          <div style={{ fontSize: 11, color: T.text3, fontWeight: 600 }}>Plazas liberadas con cola</div>
        </div>
      </div>

      {/* Clients at risk */}
      {enRiesgo.length > 0 && <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: "#ef4444", margin: "0 0 12px" }}>⚠️ Clientes en riesgo — 3+ cancelaciones</h3>
        <div style={{ background: T.bg2, borderRadius: 14, border: "1px solid " + T.border, overflow: "hidden" }}>
          {enRiesgo.map(function (c, i) {
            return <div key={i} style={{ padding: "14px 20px", borderBottom: "1px solid " + T.border, background: dk ? "rgba(239,68,68,.04)" : "#fef2f2" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{c.nombre}</span>
                <span style={{ fontSize: 13, fontWeight: 900, color: "#ef4444", padding: "2px 10px", borderRadius: 8, background: "#ef444415" }}>{c.cancelaciones} cancelaciones</span>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {c.detalles.slice(0, 6).map(function (d, j) {
                  return <span key={j} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: T.bg3, color: T.text3, fontWeight: 600 }}>{d.dia} {d.hora}</span>;
                })}
              </div>
            </div>;
          })}
        </div>
      </div>}

      {/* Ranking */}
      <h3 style={{ fontSize: 16, fontWeight: 800, color: T.text, margin: "0 0 12px" }}>📊 Ranking de cancelaciones</h3>
      <div style={{ background: T.bg2, borderRadius: 14, border: "1px solid " + T.border, overflow: "hidden" }}>
        {clientList.length === 0 && <div style={{ padding: 40, textAlign: "center", color: T.text3 }}>
          <div style={{ fontSize: 30, opacity: 0.3, marginBottom: 8 }}>✅</div>
          Sin cancelaciones en este periodo
        </div>}
        {clientList.map(function (c, i) {
          var isRisk = c.cancelaciones >= 3;
          var isWarning = c.cancelaciones >= 2;
          var barColor = isRisk ? "#ef4444" : isWarning ? "#f59e0b" : "#94a3b8";
          return <div key={i} style={{ padding: "12px 20px", borderBottom: "1px solid " + T.border, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: barColor + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color: barColor }}>{i + 1}</div>
            <div style={{ flex: 1 }}><span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{c.nombre}</span></div>
            <span style={{ fontSize: 14, fontWeight: 800, color: barColor, padding: "4px 12px", borderRadius: 8, background: barColor + "12" }}>{c.cancelaciones}</span>
          </div>;
        })}
      </div>
    </div>}

    {/* ══ TAB REPORTE SEMANAL ══ */}
    {tab === "reporte" && <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h3 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 800, color: T.text }}>📋 Socios que no han cumplido esta semana</h3>
          <div style={{ fontSize: 12, color: T.text3 }}>Semana del {thisMondayStr} · Datos hasta hoy</div>
        </div>
        {!esJuevesoViernes && <div style={{ fontSize: 11, padding: "6px 12px", borderRadius: 8, background: "#f59e0b15", color: "#f59e0b", fontWeight: 600 }}>
          📅 El reporte completo se genera los jueves y viernes
        </div>}
      </div>

      {reporteList.length === 0 && <div style={{ background: T.bg2, borderRadius: 14, border: "1px solid " + T.border, padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>¡Todos los socios han cumplido esta semana!</div>
        <div style={{ fontSize: 12, color: T.text3, marginTop: 6 }}>No hay incidencias de asistencia</div>
      </div>}

      {reporteList.length > 0 && <div>
        {/* Summary */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 120, background: "#ef444410", borderRadius: 12, border: "1px solid #ef444430", padding: "14px 18px", textAlign: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#ef4444" }}>{reporteList.filter(function (r) { return r.riesgo === "alto"; }).length}</div>
            <div style={{ fontSize: 10, color: "#ef4444", fontWeight: 700 }}>NO HAN VENIDO NADA</div>
          </div>
          <div style={{ flex: 1, minWidth: 120, background: "#f59e0b10", borderRadius: 12, border: "1px solid #f59e0b30", padding: "14px 18px", textAlign: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#f59e0b" }}>{reporteList.filter(function (r) { return r.riesgo === "medio"; }).length}</div>
            <div style={{ fontSize: 10, color: "#f59e0b", fontWeight: 700 }}>HAN VENIDO MENOS DÍAS</div>
          </div>
          <div style={{ flex: 1, minWidth: 120, background: "#6366f110", borderRadius: 12, border: "1px solid #6366f130", padding: "14px 18px", textAlign: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#6366f1" }}>{reporteList.length}</div>
            <div style={{ fontSize: 10, color: "#6366f1", fontWeight: 700 }}>TOTAL INCIDENCIAS</div>
          </div>
        </div>

        {/* List */}
        <div style={{ background: T.bg2, borderRadius: 14, border: "1px solid " + T.border, overflow: "hidden" }}>
          {reporteList.map(function (r, i) {
            var isAlto = r.riesgo === "alto";
            var color = isAlto ? "#ef4444" : "#f59e0b";
            var bg = isAlto ? (dk ? "rgba(239,68,68,.04)" : "#fef2f2") : (dk ? "rgba(245,158,11,.04)" : "#fefce8");
            return <div key={i} style={{ padding: "14px 20px", borderBottom: "1px solid " + T.border, background: bg }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                {/* Indicador */}
                <div style={{ width: 10, height: 10, borderRadius: 5, background: color, flexShrink: 0 }}></div>

                {/* Nombre */}
                <div style={{ flex: 1, minWidth: 150 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{r.nombre}</div>
                  {r.tipoBono && <div style={{ fontSize: 10, color: T.text3, marginTop: 2 }}>{r.tipoBono}</div>}
                </div>

                {/* Días contratados vs venidos */}
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, background: "#22c55e15", color: "#22c55e", fontWeight: 700 }}>
                    ✅ {r.vino} vino
                  </span>
                  {r.noVino > 0 && <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, background: "#ef444415", color: "#ef4444", fontWeight: 700 }}>
                    ❌ {r.noVino} no vino
                  </span>}
                  {r.cancelo > 0 && <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, background: "#f59e0b15", color: "#f59e0b", fontWeight: 700 }}>
                    🚫 {r.cancelo} canceló
                  </span>}
                  <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, background: color + "15", color: color, fontWeight: 800 }}>
                    {r.diasContratados}d/semana contratado{r.diasContratados > 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </div>;
          })}
        </div>

        <div style={{ marginTop: 12, padding: 12, background: T.bg3, borderRadius: 10, border: "1px solid " + T.border }}>
          <div style={{ fontSize: 11, color: T.text3 }}>
            🔴 <b style={{ color: T.text }}>Rojo</b> — No ha venido ningún día esta semana · 🟡 <b style={{ color: T.text }}>Naranja</b> — Ha venido menos días de los contratados · El reporte se completa los jueves/viernes
          </div>
        </div>
      </div>}
    </div>}
  </div>);
}
