import { useState } from "react";

var DAYS_ES = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];

function getMonday(d) {
  var date = new Date(d);
  var day = date.getDay();
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  date.setHours(0, 0, 0, 0);
  return date;
}

// Get the NEXT Monday after a date
function getNextMonday(d) {
  var date = new Date(d);
  var day = date.getDay();
  // If it's Monday (1), next Monday is +7. If Sunday (0), next is +1. Else, 8-day.
  var add = day === 0 ? 1 : day === 1 ? 7 : (8 - day);
  date.setDate(date.getDate() + add);
  date.setHours(0, 0, 0, 0);
  return date;
}

function fmtDate(d) {
  try { return new Date(d).toLocaleDateString("es-ES", { day: "numeric", month: "short" }); }
  catch (e) { return String(d || ""); }
}

function weekRangeLabel(monday) {
  var sun = new Date(monday); sun.setDate(sun.getDate() + 6);
  return monday.toLocaleDateString("es-ES", { day: "numeric", month: "long" }) +
    " — " + sun.toLocaleDateString("es-ES", { day: "numeric", month: "long" });
}

export default function Renovaciones(props) {
  var T = props.theme;
  var dk = props.dk;
  var bonos = props.bonos || [];
  var clients = props.clients || [];
  var renData = props.renData || {};
  var setRenData = props.setRenData;
  var onSaveRenData = props.onSaveRenData;
  var onChangeStatus = props.onChangeStatus;
  var importCuotas = props.importCuotas;

  var _ = useState;
  var rw_ = _("auto"), renWeek = rw_[0], setRenWeek = rw_[1];
  var nf_ = _(true), showNotifs = nf_[0], setShowNotifs = nf_[1];
  var ed_ = _(null), editingRow = ed_[0], setEditingRow = ed_[1];
  var notesTmp_ = _(""), notesTmp = notesTmp_[0], setNotesTmp = notesTmp_[1];

  var B = { background: T.bg2, borderRadius: 14, border: "1px solid " + T.border, overflow: "hidden" };
  var iS = { width: "100%", padding: "7px 10px", background: T.bg3, border: "1px solid " + T.border2, borderRadius: 8, color: T.text, fontSize: 12, outline: "none", boxSizing: "border-box" };

  if (!bonos.length) {
    return (<div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>🔄 Renovaciones</h2>
        <label style={{ padding: "8px 16px", background: "linear-gradient(135deg,#394265,#4a5580)", border: "none", borderRadius: 9, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          📤 Importar Cuotas<input type="file" accept=".xls,.xlsx" onChange={importCuotas} style={{ display: "none" }} />
        </label>
      </div>
      <div style={Object.assign({}, B, { padding: 40, textAlign: "center" })}>
        <div style={{ fontSize: 40, opacity: 0.2, marginBottom: 10 }}>🔄</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: T.text2 }}>Cargando datos de TIMP...</div>
        <div style={{ fontSize: 12, color: T.text3, marginTop: 6 }}>Los bonos se cargan automáticamente al sincronizar con TIMP</div>
      </div>
    </div>);
  }

  // ══════════════════════════════════════
  // LÓGICA SIMPLE:
  // 1. Cada bono tiene fechaValor (lunes que empieza) → ese cliente va en esa semana
  // 2. Si un bono acaba y el cliente NO tiene bono nuevo creado →
  //    ponerlo en la semana del lunes siguiente a su fechaFin
  // Solo mostrar: semana actual + 2 semanas siguientes (3 semanas)
  // ══════════════════════════════════════

  var now = new Date();
  var thisMonday = getMonday(now);
  var todayStr = now.toISOString().split("T")[0];

  // Parse all bonos with dates
  var allBonos = [];
  bonos.forEach(function (b) {
    var fv = b.fechaValor ? new Date(b.fechaValor) : null;
    var ff = b.fechaFin ? new Date(b.fechaFin) : null;
    if (!fv || isNaN(fv)) return;
    allBonos.push({
      nombre: b.nombre,
      tipo: b.tipoBono || b.concepto || "",
      fechaValor: fv,
      fechaFin: ff,
      fechaValorMonday: getMonday(fv),
      precio: b.precio || b.total || 0,
      pagado: !!b.pagado,
      fechaPago: b.fechaPago || "",
      suscriptionUuid: b.suscriptionUuid || ""
    });
  });

  // Group bonos by subscription (= client)
  var bySub = {};
  allBonos.forEach(function (b) {
    var key = b.suscriptionUuid || b.nombre.toLowerCase().trim();
    if (!bySub[key]) bySub[key] = { nombre: b.nombre, bonos: [] };
    bySub[key].bonos.push(b);
  });

  // Build renovation entries per week
  var entries = []; // {nombre, tipo, precio, pagado, fechaPago, renewMonday, source:"bono"|"calculado", ...}

  Object.values(bySub).forEach(function (client) {
    // Sort bonos by fechaValor ascending
    var sorted = client.bonos.slice().sort(function (a, b) { return a.fechaValor - b.fechaValor; });

    // Match CRM client for booking info
    var crmClient = clients.find(function (cl) {
      var cn = (cl.name || "").toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      var bn = client.nombre.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (cn === bn) return true;
      var wa = cn.split(" "), wb = bn.split(" ");
      if (wa.length >= 2 && wb.length >= 2 && wa[0] === wb[0] && wa[1] === wb[1]) return true;
      return false;
    });
    var nextBooking = crmClient && crmClient.timpNextBooking ? crmClient.timpNextBooking : null;

    // 1) For each bono, create an entry at its fechaValor Monday
    //    (this is the week the client starts the new bono = renovation week)
    var addedWeeks = {};
    sorted.forEach(function (bono) {
      var monday = bono.fechaValorMonday;
      var weekKey = monday.toISOString().split("T")[0];
      if (addedWeeks[weekKey]) return;
      addedWeeks[weekKey] = true;

      entries.push({
        nombre: client.nombre,
        tipo: bono.tipo,
        precio: bono.precio,
        pagado: bono.pagado,
        fechaPago: bono.fechaPago,
        renewMonday: monday,
        fechaValor: bono.fechaValor,
        fechaFin: bono.fechaFin,
        source: "bono",
        nextBooking: nextBooking,
        clientId: crmClient ? crmClient.id : null,
        clientStatus: crmClient ? crmClient.status : null
      });
    });

    // 2) Check the latest bono: if it ends and there's no next bono created,
    //    put the client in the week of the next Monday after fechaFin
    var latest = sorted[sorted.length - 1];
    if (latest && latest.fechaFin) {
      var nextMon = getNextMonday(latest.fechaFin);
      var nextKey = nextMon.toISOString().split("T")[0];

      // Check if there's already a bono starting that week or later
      var hasNextBono = sorted.some(function (b) {
        return b.fechaValorMonday.getTime() >= nextMon.getTime();
      });

      if (!hasNextBono && !addedWeeks[nextKey]) {
        addedWeeks[nextKey] = true;
        entries.push({
          nombre: client.nombre,
          tipo: latest.tipo,
          precio: latest.precio,
          pagado: false,
          fechaPago: "",
          renewMonday: nextMon,
          fechaValor: nextMon, // estimated
          fechaFin: null,
          source: "calculado", // no bono created yet, estimated from fechaFin
          nextBooking: nextBooking,
          clientId: crmClient ? crmClient.id : null,
          clientStatus: crmClient ? crmClient.status : null
        });
      }
    }
  });

  // Build weeks from entries
  var weekMap = {};
  entries.forEach(function (e) {
    var key = e.renewMonday.toISOString().split("T")[0];
    if (!weekMap[key]) weekMap[key] = { monday: e.renewMonday, key: key, clients: [] };
    weekMap[key].clients.push(e);
  });

  // ALWAYS create tabs for: 1 week back + current + 8 weeks ahead = 10 tabs
  var weekList = [];
  for (var wi = -1; wi <= 8; wi++) {
    var mon = new Date(thisMonday);
    mon.setDate(mon.getDate() + wi * 7);
    var key = mon.toISOString().split("T")[0];
    if (weekMap[key]) {
      weekList.push(weekMap[key]);
    } else {
      weekList.push({ monday: mon, key: key, clients: [] });
    }
  }

  var getWeekLabel = function (w) {
    // Show date: "13/04", "20/04", etc.
    var d = w.monday.getDate();
    var m = (w.monday.getMonth() + 1);
    return (d < 10 ? "0" : "") + d + "/" + (m < 10 ? "0" : "") + m;
  };

  // Auto-select
  var selWeek = weekList.find(function (w) { return w.key === renWeek; });
  if (!selWeek || renWeek === "auto") {
    selWeek = weekList.find(function (w) { return w.monday.getTime() === thisMonday.getTime(); });
    if (!selWeek) selWeek = weekList.find(function (w) { return w.monday >= thisMonday; });
    if (!selWeek) selWeek = weekList[0];
    if (selWeek && selWeek.key !== renWeek) setRenWeek(selWeek.key);
  }

  // Helpers
  function rowKey(nombre, weekKey) { return nombre.toLowerCase().trim() + "__" + weekKey; }
  function getRowData(nombre, weekKey) { return renData[rowKey(nombre, weekKey)] || {}; }
  function updateRowField(nombre, weekKey, field, value) {
    var k = rowKey(nombre, weekKey);
    var updated = Object.assign({}, renData[k] || {}); updated[field] = value;
    var newData = Object.assign({}, renData); newData[k] = updated;
    if (setRenData) setRenData(newData);
    if (onSaveRenData) onSaveRenData(newData);
  }

  // Notifications
  var thisWeekData = weekList.find(function (w) { return w.monday.getTime() === thisMonday.getTime(); });
  var todayNotifs = [];
  if (thisWeekData) {
    thisWeekData.clients.forEach(function (r) {
      var rd = getRowData(r.nombre, thisWeekData.key);
      if (rd.renovacion === "renovado" || rd.renovacion === "baja" || r.pagado) return;
      if (r.nextBooking) {
        try {
          var bd = new Date(r.nextBooking);
          if (bd.toISOString().split("T")[0] === todayStr) {
            todayNotifs.push({ nombre: r.nombre, hora: bd.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }), tipo: r.tipo, precio: r.precio });
          }
        } catch (e) { }
      }
    });
  }

  function weekCounts(w) {
    var renovados = 0, pendientes = 0, bajas = 0;
    w.clients.forEach(function (r) {
      var rd = getRowData(r.nombre, w.key);
      if (rd.renovacion === "renovado" || r.pagado) renovados++;
      else if (rd.renovacion === "baja") bajas++;
      else pendientes++;
    });
    return { renovados: renovados, pendientes: pendientes, bajas: bajas, total: w.clients.length };
  }
  var thisWeekCounts = thisWeekData ? weekCounts(thisWeekData) : { renovados: 0, pendientes: 0, bajas: 0, total: 0 };

  // ══ RENDER ══
  return (<div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
      <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>🔄 Renovaciones</h2>
      <label style={{ padding: "8px 16px", background: "linear-gradient(135deg,#394265,#4a5580)", border: "none", borderRadius: 9, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
        📤 Importar Cuotas<input type="file" accept=".xls,.xlsx" onChange={importCuotas} style={{ display: "none" }} />
      </label>
    </div>

    {/* Summary */}
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
      {[["Esta semana", thisWeekCounts.total, "#6366f1", "📅"], ["Pendientes", thisWeekCounts.pendientes, "#f59e0b", "⏳"], ["Renovados", thisWeekCounts.renovados, "#22c55e", "✅"], ["No renuevan", thisWeekCounts.bajas, "#ef4444", "🚫"]].map(function (x) {
        return <div key={x[0]} style={{ flex: "1 1 120px", background: T.bg2, borderRadius: 12, padding: "14px 16px", border: "1px solid " + T.border, minWidth: 120 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}><span style={{ fontSize: 16 }}>{x[3]}</span><span style={{ fontSize: 9, color: T.text3, fontWeight: 600, textTransform: "uppercase" }}>{x[0]}</span></div>
          <div style={{ fontSize: 26, fontWeight: 900, color: x[2] }}>{x[1]}</div>
        </div>;
      })}
    </div>

    {/* Notifications */}
    {todayNotifs.length > 0 && showNotifs && <div style={{ background: dk ? "rgba(245,158,11,.06)" : "#fefce8", border: "1px solid " + (dk ? "rgba(245,158,11,.2)" : "#fde68a"), borderRadius: 14, padding: "16px 20px", marginBottom: 20, position: "relative" }}>
      <button onClick={function () { setShowNotifs(false); }} style={{ position: "absolute", top: 10, right: 14, background: "none", border: "none", color: T.text3, fontSize: 14, cursor: "pointer" }}>✕</button>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><span style={{ fontSize: 20 }}>🔔</span><span style={{ fontSize: 14, fontWeight: 800, color: "#f59e0b" }}>¡Hoy vienen {todayNotifs.length} cliente{todayNotifs.length > 1 ? "s" : ""} que tienen que renovar!</span></div>
      {todayNotifs.map(function (n, i) {
        return <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: dk ? "rgba(245,158,11,.08)" : "#fffbeb", borderRadius: 10, marginBottom: i < todayNotifs.length - 1 ? 6 : 0, border: "1px solid " + (dk ? "rgba(245,158,11,.12)" : "#fde68a") }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#f59e0b15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "#f59e0b" }}>{n.nombre.split(" ").map(function (x) { return x[0]; }).slice(0, 2).join("")}</div>
          <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{n.nombre}</div><div style={{ fontSize: 11, color: T.text3 }}>{n.tipo} · {n.precio}€</div></div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#f59e0b" }}>🕐 {n.hora}</div>
        </div>;
      })}
    </div>}

    {/* Week selector */}
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
      {weekList.map(function (w) {
        var active = selWeek && w.key === selWeek.key;
        var isThis = w.monday.getTime() === thisMonday.getTime();
        var isPast = w.monday < thisMonday;
        var color = isThis ? "#6366f1" : isPast ? "#64748b" : "#f59e0b";
        var wc = weekCounts(w);
        var hasCalc = w.clients.some(function (r) { return r.source === "calculado"; });

        return <button key={w.key} onClick={function () { setRenWeek(w.key); }} style={{
          padding: "8px 18px", borderRadius: 10,
          border: active ? "2px solid " + color : "1px solid " + T.border,
          background: active ? color + "15" : "transparent",
          color: active ? color : T.text3,
          fontSize: 12, fontWeight: active ? 700 : 600, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6
        }}>
          {getWeekLabel(w)} <span style={{ fontWeight: 800 }}>({wc.total})</span>
          {wc.pendientes > 0 && <span style={{
            width: 18, height: 18, borderRadius: 9,
            background: color, color: "#fff", fontSize: 9, fontWeight: 800,
            display: "inline-flex", alignItems: "center", justifyContent: "center"
          }}>{wc.pendientes}</span>}
        </button>;
      })}
    </div>

    {/* Selected week */}
    {selWeek && (function () {
      var wc = weekCounts(selWeek);
      var pctRen = wc.total > 0 ? Math.round((wc.renovados / wc.total) * 100) : 0;
      var isThisWeek = selWeek.monday.getTime() === thisMonday.getTime();
      var isFuture = selWeek.monday > thisMonday;

      return <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 13, color: T.text2, fontWeight: 500 }}>{weekRangeLabel(selWeek.monday)}</span>
          {isThisWeek && <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 6, background: "#6366f115", color: "#6366f1", fontWeight: 700 }}>📌 Actual</span>}
          {isFuture && <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 6, background: "#f59e0b15", color: "#f59e0b", fontWeight: 700 }}>📅 Próxima</span>}
        </div>

        {/* Progress */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 16px", background: T.bg2, borderRadius: 12, border: "1px solid " + T.border, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", gap: 14, fontSize: 11, marginBottom: 6 }}>
              <span style={{ color: "#22c55e", fontWeight: 700 }}>✅ {wc.renovados}</span>
              <span style={{ color: "#f59e0b", fontWeight: 700 }}>⏳ {wc.pendientes}</span>
              <span style={{ color: "#ef4444", fontWeight: 700 }}>🚫 {wc.bajas}</span>
            </div>
            <div style={{ background: T.border, borderRadius: 6, height: 8, overflow: "hidden", display: "flex" }}>
              <div style={{ width: pctRen + "%", background: "#22c55e", transition: "width .3s" }}></div>
              <div style={{ width: (wc.total > 0 ? Math.round((wc.bajas / wc.total) * 100) : 0) + "%", background: "#ef4444", transition: "width .3s" }}></div>
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: wc.pendientes === 0 ? "#22c55e" : "#f59e0b" }}>{pctRen}%</div>
            <div style={{ fontSize: 9, color: T.text3 }}>renovación</div>
          </div>
        </div>

        {/* TABLE */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, background: T.bg2, borderRadius: 14, overflow: "hidden", border: "1px solid " + T.border }}>
            <thead><tr style={{ borderBottom: "2px solid " + T.border }}>
              {["Cliente", "Bono", "F. Valor", "Avisado", "Renovación", "Reserva", "F. Pago", "Notas", ""].map(function (h) {
                return <th key={h} style={{ padding: "12px 10px", textAlign: "left", color: T.navy, fontWeight: 700, fontSize: 10, textTransform: "uppercase", whiteSpace: "nowrap", letterSpacing: 0.5 }}>{h}</th>;
              })}
            </tr></thead>
            <tbody>
              {selWeek.clients.map(function (r, i) {
                var rd = getRowData(r.nombre, selWeek.key);
                var isRenovado = rd.renovacion === "renovado" || r.pagado;
                var isBaja = rd.renovacion === "baja";
                var isPending = !isRenovado && !isBaja;
                var rKey = rowKey(r.nombre, selWeek.key);
                var isEditing = editingRow === rKey;

                var reservaAuto = "";
                if (r.nextBooking) {
                  try { var bd = new Date(r.nextBooking); var bM = getMonday(bd); if (bM.getTime() === selWeek.monday.getTime()) { reservaAuto = DAYS_ES[bd.getDay()] + " " + bd.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }); } } catch (e) { }
                }
                var reservaDisplay = rd.reserva || reservaAuto;
                var isToday = false;
                if (r.nextBooking) { try { isToday = new Date(r.nextBooking).toISOString().split("T")[0] === todayStr; } catch (e) { } }
                var fechaPagoDisplay = rd.fechaPago || (r.pagado && r.fechaPago ? fmtDate(r.fechaPago) : "");
                var initials = r.nombre.split(" ").map(function (x) { return x[0]; }).slice(0, 2).join("");

                var rowBg = "transparent";
                if (isToday && isPending) rowBg = dk ? "rgba(245,158,11,.04)" : "#fffbeb";
                if (isBaja) rowBg = dk ? "rgba(239,68,68,.03)" : "#fef2f2";
                if (isRenovado) rowBg = dk ? "rgba(34,197,94,.03)" : "#f0fdf4";

                return <tr key={i} style={{ borderBottom: "1px solid " + T.border, background: rowBg, opacity: isBaja ? 0.5 : 1 }}>
                  <td style={{ padding: "12px 10px", minWidth: 140 }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: isRenovado ? "#22c55e15" : isPending ? "#f59e0b15" : "#ef444415", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: isRenovado ? "#22c55e" : isPending ? "#f59e0b" : "#ef4444", flexShrink: 0 }}>{initials}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.text, textDecoration: isBaja ? "line-through" : "none" }}>{r.nombre}</div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <span style={{ fontSize: 9, color: T.text3 }}>{r.precio}€</span>
                        {r.source === "calculado" && <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 4, background: "#f59e0b15", color: "#f59e0b", fontWeight: 700 }}>sin bono nuevo</span>}
                      </div>
                    </div>
                  </div></td>
                  <td style={{ padding: "10px 8px", fontSize: 11, color: T.text2, maxWidth: 140 }}><div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.tipo}</div></td>
                  <td style={{ padding: "10px 8px", fontSize: 11, color: T.text2, whiteSpace: "nowrap" }}>{fmtDate(r.fechaValor)}</td>
                  <td style={{ padding: "10px 8px", textAlign: "center" }}><button onClick={function () { updateRowField(r.nombre, selWeek.key, "avisado", !rd.avisado); }} style={{ width: 28, height: 28, borderRadius: 7, border: rd.avisado ? "2px solid #3b82f6" : "2px solid " + T.border2, background: rd.avisado ? "#3b82f615" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 12, color: rd.avisado ? "#3b82f6" : T.text3, padding: 0 }}>{rd.avisado ? "✓" : ""}</button></td>
                  <td style={{ padding: "10px 8px" }}><select value={r.pagado ? "renovado" : (rd.renovacion || "pendiente")} onChange={function (e) { updateRowField(r.nombre, selWeek.key, "renovacion", e.target.value); if (e.target.value === "baja" && r.clientId && r.clientStatus !== "baja") { if (confirm("¿Dar de baja a " + r.nombre + " en el CRM?")) { if (onChangeStatus) onChangeStatus(r.nombre, "baja"); } } }} disabled={r.pagado} style={{ padding: "5px 8px", borderRadius: 7, fontSize: 11, fontWeight: 700, outline: "none", cursor: r.pagado ? "default" : "pointer", border: "1px solid " + (isRenovado ? "#22c55e30" : isBaja ? "#ef444430" : "#f59e0b30"), background: isRenovado ? "#22c55e10" : isBaja ? "#ef444410" : "#f59e0b10", color: isRenovado ? "#22c55e" : isBaja ? "#ef4444" : "#f59e0b", width: "100%", minWidth: 100 }}><option value="pendiente">⏳ Pendiente</option><option value="renovado">✅ Renovado</option><option value="baja">🚫 No renueva</option></select></td>
                  <td style={{ padding: "10px 8px", whiteSpace: "nowrap" }}>{isEditing ? <input value={rd.reserva || reservaAuto} onChange={function (e) { updateRowField(r.nombre, selWeek.key, "reserva", e.target.value); }} placeholder="Ej: Martes 18:00" style={Object.assign({}, iS, { minWidth: 100, fontSize: 11 })} /> : <div style={{ display: "flex", alignItems: "center", gap: 4 }}>{isToday && isPending && <span style={{ fontSize: 12 }}>🔔</span>}<span style={{ fontSize: 11, color: isToday && isPending ? "#f59e0b" : T.text2, fontWeight: isToday && isPending ? 700 : 400 }}>{reservaDisplay || <span style={{ color: T.text3, fontSize: 10 }}>—</span>}</span></div>}</td>
                  <td style={{ padding: "10px 8px", whiteSpace: "nowrap" }}>{isEditing ? <input type="date" value={rd.fechaPago || ""} onChange={function (e) { updateRowField(r.nombre, selWeek.key, "fechaPago", e.target.value); }} style={Object.assign({}, iS, { minWidth: 110, fontSize: 11 })} /> : <span style={{ fontSize: 11, color: fechaPagoDisplay ? "#22c55e" : T.text3 }}>{fechaPagoDisplay || "—"}</span>}</td>
                  <td style={{ padding: "10px 8px", minWidth: 120 }}>{isEditing ? <input value={notesTmp} onChange={function (e) { setNotesTmp(e.target.value); }} onBlur={function () { updateRowField(r.nombre, selWeek.key, "notas", notesTmp); }} placeholder="Notas..." style={Object.assign({}, iS, { fontSize: 11 })} /> : <span style={{ fontSize: 11, color: rd.notas ? T.text : T.text3 }}>{rd.notas || "—"}</span>}</td>
                  <td style={{ padding: "10px 6px", textAlign: "center" }}><button onClick={function () { if (isEditing) { setEditingRow(null); } else { setEditingRow(rKey); setNotesTmp(rd.notas || ""); } }} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid " + T.border2, background: isEditing ? "#6366f115" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 12, color: isEditing ? "#6366f1" : T.text3, padding: 0 }}>{isEditing ? "💾" : "✏️"}</button></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 14, padding: "12px 16px", background: T.bg3, borderRadius: 10, border: "1px solid " + T.border, fontSize: 11, color: T.text3 }}>
          <b style={{ color: T.text }}>Cómo funciona:</b> Se muestra quién tiene un bono que <b>empieza</b> esa semana (fecha de valor = lunes).
          Si un cliente no tiene bono nuevo creado pero el anterior acaba, aparece con <span style={{ color: "#f59e0b" }}>sin bono nuevo</span> en la semana del lunes siguiente.
        </div>
      </div>;
    })()}
  </div>);
}
