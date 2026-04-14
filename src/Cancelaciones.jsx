import { useState, useEffect } from "react";

var DAYS_ES = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];

function localKey(d) {
  var dd = new Date(d);
  return dd.getFullYear() + "-" + (dd.getMonth() + 1 < 10 ? "0" : "") + (dd.getMonth() + 1) + "-" + (dd.getDate() < 10 ? "0" : "") + dd.getDate();
}

export default function Cancelaciones(props) {
  var T = props.theme;
  var dk = props.dk;
  var timpCenter = "ebb9a2c0-782e-4d77-b5eb-17d18a1f8949";

  var _ = useState;
  var loading_ = _(true), loading = loading_[0], setLoading = loading_[1];
  var admissions_ = _([]), admissions = admissions_[0], setAdmissions = admissions_[1];
  var semanas_ = _(3), semanas = semanas_[0], setSemanas = semanas_[1];

  // Fetch admissions data
  useEffect(function () {
    var today = new Date();
    var from = localKey(today);
    var futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + semanas * 7);
    var to = localKey(futureDate);

    var url = "/api/timp?path=branch_buildings/" + timpCenter + "/admissions%3Fdate_from=" + from + "%26date_to=" + to + "%26page=1";
    fetch(url).then(function (r) { return r.json(); }).then(function (d) {
      if (d && d.collection) {
        // Check if there are more pages
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
          });
        } else {
          setAdmissions(allAdmissions);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    }).catch(function () { setLoading(false); });
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

  // Build client cancellation map
  var clientMap = {};
  var todayCancels = [];
  var queueAlerts = []; // Slots where someone canceled and there's someone in queue

  admissions.forEach(function (a) {
    var dateStr = a.starting_at ? a.starting_at.substring(0, 10) : "";
    var timeStr = a.starting_at ? a.starting_at.substring(11, 16) : "";
    var dateObj = new Date(a.starting_at);
    var dayName = DAYS_ES[dateObj.getDay()];
    var capacity = a.capacity || 0;

    var validBookings = [];
    var canceledBookings = [];
    var queueBookings = [];

    (a.bookings || []).forEach(function (b) {
      if (b.status === "valid") validBookings.push(b);
      else if (b.status === "canceled") canceledBookings.push(b);
      else if (b.status === "at_queue") queueBookings.push(b);
    });

    // Track cancellations per client
    canceledBookings.forEach(function (b) {
      var name = b.full_name;
      if (!clientMap[name]) clientMap[name] = { nombre: name, cancelaciones: 0, detalles: [] };
      clientMap[name].cancelaciones++;
      clientMap[name].detalles.push({
        fecha: dateStr,
        hora: timeStr,
        dia: dayName
      });

      // Today's cancellations
      if (dateStr === todayStr) {
        todayCancels.push({
          nombre: name,
          hora: timeStr,
          dia: dayName
        });
      }
    });

    // Queue alerts: someone canceled AND there are people in queue AND there's actually a free spot
    // After cancellation, if valid bookings < capacity → there IS a free spot → alert!
    if (canceledBookings.length > 0 && queueBookings.length > 0 && validBookings.length < capacity) {
      queueAlerts.push({
        fecha: dateStr,
        hora: timeStr,
        dia: dayName,
        cancelados: canceledBookings.map(function (b) { return b.full_name; }),
        enCola: queueBookings.map(function (b) { return b.full_name; }),
        capacidad: capacity,
        activos: validBookings.length,
        huecos: capacity - validBookings.length
      });
    }
  });

  // Sort clients by cancellations
  var clientList = Object.values(clientMap).sort(function (a, b) { return b.cancelaciones - a.cancelaciones; });
  var enRiesgo = clientList.filter(function (c) { return c.cancelaciones >= 3; });
  var totalCancels = clientList.reduce(function (s, c) { return s + c.cancelaciones; }, 0);

  // Sort queue alerts by date
  queueAlerts.sort(function (a, b) { return a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.hora < b.hora ? -1 : 1; });

  return (<div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 10 }}>
      <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>🚫 Cancelaciones</h2>
      <select value={semanas} onChange={function (e) { setSemanas(+e.target.value); setLoading(true); }}
        style={{
          padding: "8px 14px", fontSize: 13, fontWeight: 700,
          background: T.bg2, border: "2px solid " + T.navy, borderRadius: 10,
          color: T.text, outline: "none", cursor: "pointer"
        }}>
        <option value={2}>2 semanas</option>
        <option value={3}>3 semanas</option>
        <option value={4}>4 semanas</option>
      </select>
    </div>

    {/* ═══ QUEUE ALERTS — MOST IMPORTANT ═══ */}
    {queueAlerts.length > 0 && <div style={{
      background: dk ? "rgba(239,68,68,.06)" : "#fef2f2",
      border: "2px solid " + (dk ? "rgba(239,68,68,.3)" : "#fecaca"),
      borderRadius: 14, padding: "20px 24px", marginBottom: 20
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 22 }}>🔔</span>
        <span style={{ fontSize: 16, fontWeight: 800, color: "#ef4444" }}>¡Hay clientes en cola esperando plaza!</span>
      </div>
      {queueAlerts.map(function (q, i) {
        return <div key={i} style={{
          background: dk ? "rgba(239,68,68,.08)" : "#fff5f5",
          borderRadius: 12, padding: "14px 18px", marginBottom: i < queueAlerts.length - 1 ? 8 : 0,
          border: "1px solid " + (dk ? "rgba(239,68,68,.15)" : "#fee2e2")
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: "#ef4444" }}>{q.dia} {q.hora}</span>
            <span style={{ fontSize: 12, color: T.text3 }}>{q.fecha}</span>
          </div>
          <div style={{ fontSize: 13, color: T.text, marginBottom: 6 }}>
            <span style={{ color: "#ef4444", fontWeight: 700 }}>Canceló:</span> {q.cancelados.join(", ")}
          </div>
          <div style={{ fontSize: 13, color: T.text, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#22c55e", fontWeight: 700 }}>📱 En cola:</span>
            <span style={{ fontWeight: 700 }}>{q.enCola.join(", ")}</span>
            <span style={{ fontSize: 11, color: T.text3 }}>— {q.huecos} hueco{q.huecos > 1 ? "s" : ""} libre{q.huecos > 1 ? "s" : ""} — ¡Avisar por WhatsApp!</span>
          </div>
        </div>;
      })}
    </div>}

    {/* ═══ TODAY'S CANCELLATIONS ═══ */}
    {todayCancels.length > 0 && <div style={{
      background: dk ? "rgba(245,158,11,.06)" : "#fefce8",
      border: "1px solid " + (dk ? "rgba(245,158,11,.2)" : "#fde68a"),
      borderRadius: 14, padding: "16px 20px", marginBottom: 20
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 18 }}>⚠️</span>
        <span style={{ fontSize: 14, fontWeight: 800, color: "#f59e0b" }}>Cancelaciones de hoy ({todayCancels.length})</span>
      </div>
      {todayCancels.map(function (c, i) {
        return <div key={i} style={{
          display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
          background: dk ? "rgba(245,158,11,.08)" : "#fffbeb", borderRadius: 8,
          marginBottom: i < todayCancels.length - 1 ? 4 : 0
        }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{c.nombre}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b" }}>🕐 {c.hora}</span>
        </div>;
      })}
    </div>}

    {/* ═══ STATS CARDS ═══ */}
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

    {/* ═══ CLIENTS AT RISK (3+ cancellations) ═══ */}
    {enRiesgo.length > 0 && <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 16, fontWeight: 800, color: "#ef4444", margin: "0 0 12px" }}>⚠️ Clientes en riesgo — 3+ cancelaciones</h3>
      <div style={{ background: T.bg2, borderRadius: 14, border: "1px solid " + T.border, overflow: "hidden" }}>
        {enRiesgo.map(function (c, i) {
          return <div key={i} style={{
            padding: "14px 20px", borderBottom: "1px solid " + T.border,
            background: dk ? "rgba(239,68,68,.04)" : "#fef2f2"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{c.nombre}</span>
              <span style={{
                fontSize: 13, fontWeight: 900, color: "#ef4444",
                padding: "2px 10px", borderRadius: 8, background: "#ef444415"
              }}>{c.cancelaciones} cancelaciones</span>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {c.detalles.slice(0, 6).map(function (d, j) {
                return <span key={j} style={{
                  fontSize: 10, padding: "3px 8px", borderRadius: 6,
                  background: T.bg3, color: T.text3, fontWeight: 600
                }}>{d.dia} {d.hora}</span>;
              })}
            </div>
          </div>;
        })}
      </div>
    </div>}

    {/* ═══ ALL CANCELLATIONS RANKING ═══ */}
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

        return <div key={i} style={{
          padding: "12px 20px", borderBottom: "1px solid " + T.border,
          display: "flex", alignItems: "center", gap: 12
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: barColor + "15", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 12, fontWeight: 900, color: barColor
          }}>{i + 1}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{c.nombre}</span>
          </div>
          <span style={{
            fontSize: 14, fontWeight: 800, color: barColor,
            padding: "4px 12px", borderRadius: 8, background: barColor + "12"
          }}>{c.cancelaciones}</span>
        </div>;
      })}
    </div>
  </div>);
}
