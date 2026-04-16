import { useState } from "react";

var DAYS_ES = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
var MONTHS_ES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

function getMonday(d) {
  var date = new Date(d);
  var day = date.getDay();
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  date.setHours(0, 0, 0, 0);
  return date;
}

function getNextMonday(d) {
  var date = new Date(d);
  var day = date.getDay();
  var add = day === 0 ? 1 : day === 1 ? 7 : (8 - day);
  date.setDate(date.getDate() + add);
  date.setHours(0, 0, 0, 0);
  return date;
}

function fmtDate(d) {
  try { return new Date(d).toLocaleDateString("es-ES", { day: "numeric", month: "short" }); }
  catch (e) { return String(d || ""); }
}

// Generate week key using LOCAL date (avoids UTC timezone mismatch)
function localKey(d) {
  var dd = new Date(d);
  var y = dd.getFullYear();
  var m = dd.getMonth() + 1;
  var day = dd.getDate();
  return y + "-" + (m < 10 ? "0" : "") + m + "-" + (day < 10 ? "0" : "") + day;
}

function weekLabel(monday) {
  var d = monday.getDate();
  var m = MONTHS_ES[monday.getMonth()];
  var sun = new Date(monday); sun.setDate(sun.getDate() + 6);
  return "Semana del " + d + " de " + m + " — " + sun.getDate() + " de " + MONTHS_ES[sun.getMonth()];
}

function weekShort(monday) {
  var d = monday.getDate();
  var m = (monday.getMonth() + 1);
  return (d < 10 ? "0" : "") + d + "/" + (m < 10 ? "0" : "") + m;
}

export default function Renovaciones(props) {
  var T = props.theme;
  var dk = props.dk;
  var bonos = props.bonos || [];
  var clients = props.clients || [];
  var cuotasExcel = props.cuotasExcel || [];
  var renData = props.renData || {};
  var setRenData = props.setRenData;
  var onSaveRenData = props.onSaveRenData;
  var onChangeStatus = props.onChangeStatus;
  var importCuotas = props.importCuotas;

  var _ = useState;
  var rw_ = _("auto"), renWeek = rw_[0], setRenWeek = rw_[1];
  var nf_ = _(true), showNotifs = nf_[0], setShowNotifs = nf_[1];
  var editNote_ = _(null), editNote = editNote_[0], setEditNote = editNote_[1];
  var noteTmp_ = _(""), noteTmp = noteTmp_[0], setNoteTmp = noteTmp_[1];
  var moveClient_ = _(null), moveClient = moveClient_[0], setMoveClient = moveClient_[1];
  var moveTarget_ = _(""), moveTarget = moveTarget_[0], setMoveTarget = moveTarget_[1];

  if (!bonos.length) {
    return (<div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>🔄 Renovaciones</h2>
        <label style={{ padding: "8px 16px", background: "linear-gradient(135deg,#394265,#4a5580)", border: "none", borderRadius: 9, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          📤 Importar Cuotas<input type="file" accept=".xls,.xlsx" onChange={importCuotas} style={{ display: "none" }} />
        </label>
      </div>
      <div style={{ background: T.bg2, borderRadius: 14, border: "1px solid " + T.border, padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 40, opacity: 0.2, marginBottom: 10 }}>🔄</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: T.text2 }}>Cargando datos de TIMP...</div>
      </div>
    </div>);
  }

  // ══ BUILD ENTRIES ══
  var now = new Date();
  var thisMonday = getMonday(now);
  var todayStr = localKey(now);

  var allBonos = [];
  bonos.forEach(function (b) {
    var fv = b.fechaValor ? new Date(b.fechaValor) : null;
    var ff = b.fechaFin ? new Date(b.fechaFin) : null;
    if (!fv || isNaN(fv)) return;
    allBonos.push({
      nombre: b.nombre, tipo: b.tipoBono || b.concepto || "",
      fechaValor: fv, fechaFin: ff, fechaValorMonday: getMonday(fv),
      precio: b.precio || b.total || 0, pagado: !!b.pagado,
      fechaPago: b.fechaPago || "", suscriptionUuid: b.suscriptionUuid || "",
      fraccionado: !!b.fraccionado, mitadPagada: !!b.mitadPagada,
      esReserva: !!b.esReserva, importePagado: b.importePagado || 0
    });
  });

  var bySub = {};
  allBonos.forEach(function (b) {
    var key = b.suscriptionUuid || b.nombre.toLowerCase().trim();
    if (!bySub[key]) bySub[key] = { nombre: b.nombre, bonos: [] };
    bySub[key].bonos.push(b);
  });

  var entries = [];
  Object.values(bySub).forEach(function (client) {
    var sorted = client.bonos.slice().sort(function (a, b) { return a.fechaValor - b.fechaValor; });
    var crmClient = clients.find(function (cl) {
      var cn = (cl.name || "").toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      var bn = client.nombre.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (cn === bn) return true;
      var wa = cn.split(" "), wb = bn.split(" ");
      if (wa.length >= 2 && wb.length >= 2 && wa[0] === wb[0] && wa[1] === wb[1]) return true;
      return false;
    });
    var nextBooking = crmClient && crmClient.timpNextBooking ? crmClient.timpNextBooking : null;
    var addedWeeks = {};

    sorted.forEach(function (bono) {
      // Skip session-based bonos (bono 5, 10, 20) from renewals by fechaValor
      // They only appear when Excel shows 1 session left or when fechaFin expires
      var caption = (bono.tipo || "").toLowerCase();
      var isBonoSesiones = caption.includes("bono 5") || caption.includes("bono 10") || caption.includes("bono 20") ||
        (caption.includes("bono") && caption.includes("sesion"));
      if (isBonoSesiones) return;

      var monday = bono.fechaValorMonday;
      var weekKey = localKey(monday);
      if (addedWeeks[weekKey]) return;
      addedWeeks[weekKey] = true;
      entries.push({
        nombre: client.nombre, tipo: bono.tipo, precio: bono.precio,
        pagado: bono.pagado, fechaPago: bono.fechaPago,
        renewMonday: monday, fechaValor: bono.fechaValor, fechaFin: bono.fechaFin,
        source: "bono", nextBooking: nextBooking,
        clientId: crmClient ? crmClient.id : null, clientStatus: crmClient ? crmClient.status : null,
        fraccionado: bono.fraccionado, mitadPagada: bono.mitadPagada,
        esReserva: bono.esReserva, importePagado: bono.importePagado
      });
    });

    var latest = sorted[sorted.length - 1];
    if (latest && latest.fechaFin) {
      var nextMon = getNextMonday(latest.fechaFin);
      var nextKey = localKey(nextMon);
      var hasNext = sorted.some(function (b) { return b.fechaValorMonday.getTime() >= nextMon.getTime(); });
      if (!hasNext && !addedWeeks[nextKey]) {
        addedWeeks[nextKey] = true;
        entries.push({
          nombre: client.nombre, tipo: latest.tipo, precio: latest.precio,
          pagado: false, fechaPago: "", renewMonday: nextMon, fechaValor: nextMon,
          fechaFin: null, source: "calculado", nextBooking: nextBooking,
          clientId: crmClient ? crmClient.id : null, clientStatus: crmClient ? crmClient.status : null
        });
      }
    }
  });

  // ── Check cuotasExcel for clients who exhausted their bono or have 1 session left ──
  if (cuotasExcel.length > 0) {
    var thisKey = localKey(thisMonday);
    cuotasExcel.forEach(function (cx) {
      if (!cx.nombre || !cx.totalSesiones) return;
      var total = +cx.totalSesiones;
      var consumidas = (+cx.usadas || 0) + (+cx.caducadas || 0) + (+cx.sinCanjear || 0);
      var restantes = total - consumidas;

      // Skip if more than 1 session remaining
      if (restantes > 1) return;

      // Check if this client already has an entry this week
      var nameNorm = cx.nombre.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      var alreadyThisWeek = entries.some(function (e) {
        var en = e.nombre.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return (en === nameNorm || en.indexOf(nameNorm) >= 0 || nameNorm.indexOf(en) >= 0) &&
          e.renewMonday.getTime() === thisMonday.getTime();
      });
      if (alreadyThisWeek) return;

      // Skip if client already has a NEWER paid bono from API (already renewed)
      var hasNewerPaidBono = allBonos.some(function (b) {
        var bn = b.nombre.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return (bn === nameNorm || bn.indexOf(nameNorm) >= 0 || nameNorm.indexOf(bn) >= 0) &&
          b.pagado && b.fechaValor && b.fechaValor >= thisMonday;
      });
      if (hasNewerPaidBono) return;

      // Find matching CRM client
      var crmClient = clients.find(function (cl) {
        var cn = (cl.name || "").toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return cn === nameNorm || cn.indexOf(nameNorm) >= 0 || nameNorm.indexOf(cn) >= 0;
      });

      var isAgotado = restantes <= 0;
      var isUltima = restantes === 1;

      entries.push({
        nombre: cx.nombre,
        tipo: cx.tipoBono || "",
        precio: 0,
        pagado: false, fechaPago: "",
        renewMonday: thisMonday,
        fechaValor: thisMonday,
        fechaFin: null,
        source: isAgotado ? "agotado" : "ultima_sesion",
        nextBooking: crmClient && crmClient.timpNextBooking ? crmClient.timpNextBooking : null,
        clientId: crmClient ? crmClient.id : null,
        clientStatus: crmClient ? crmClient.status : null,
        sesiones: { total: total, usadas: +cx.usadas || 0, caducadas: +cx.caducadas || 0, sinCanjear: +cx.sinCanjear || 0, enUso: +cx.enUso || 0, restantes: restantes }
      });
    });
  }

  // Build week map
  var weekMap = {};
  entries.forEach(function (e) {
    var key = localKey(e.renewMonday);
    if (!weekMap[key]) weekMap[key] = { monday: e.renewMonday, key: key, clients: [] };
    weekMap[key].clients.push(e);
  });

  // Add "segundo pago" entries from renData (created when someone selects "mitad pagada")
  Object.keys(renData).forEach(function (k) {
    var d = renData[k];
    if (!d || !d.segundoPago || !d.clientName) return;
    var weekKey = k.split("__")[1];
    if (!weekKey) return;
    if (weekMap[weekKey]) {
      var already = weekMap[weekKey].clients.some(function (c) { return c.nombre.toLowerCase().trim() === d.clientName.toLowerCase().trim(); });
      if (already) return;
    }
    var origClient = entries.find(function (e) { return e.nombre.toLowerCase().trim() === d.clientName.toLowerCase().trim(); });
    var mon = new Date(weekKey + "T00:00:00");
    if (isNaN(mon)) return;
    if (!weekMap[weekKey]) weekMap[weekKey] = { monday: mon, key: weekKey, clients: [] };
    weekMap[weekKey].clients.push({
      nombre: d.clientName, tipo: origClient ? origClient.tipo : "",
      precio: origClient ? origClient.precio : 0,
      pagado: false, fechaPago: "",
      renewMonday: mon, fechaValor: mon, fechaFin: null,
      source: "segundo_pago", nextBooking: origClient ? origClient.nextBooking : null,
      clientId: origClient ? origClient.clientId : null,
      clientStatus: origClient ? origClient.clientStatus : null
    });
  });

  // Auto-create 2nd payment entries for API-detected mitadPagada (pago fraccionado from TIMP)
  entries.forEach(function (e) {
    if (!e.mitadPagada || e.pagado) return;
    var sixWeeks = new Date(e.renewMonday);
    sixWeeks.setDate(sixWeeks.getDate() + 42);
    var spKey = localKey(sixWeeks);
    // Check not already there
    if (weekMap[spKey]) {
      var already = weekMap[spKey].clients.some(function (c) { return c.nombre.toLowerCase().trim() === e.nombre.toLowerCase().trim(); });
      if (already) return;
    }
    if (!weekMap[spKey]) weekMap[spKey] = { monday: sixWeeks, key: spKey, clients: [] };
    weekMap[spKey].clients.push({
      nombre: e.nombre, tipo: e.tipo, precio: e.precio,
      pagado: false, fechaPago: "",
      renewMonday: sixWeeks, fechaValor: sixWeeks, fechaFin: null,
      source: "segundo_pago", nextBooking: e.nextBooking,
      clientId: e.clientId, clientStatus: e.clientStatus
    });
  });

  // Auto-create "pago restante" entries for API-detected reservas (at next booking week)
  entries.forEach(function (e) {
    if (!e.esReserva || e.pagado || !e.nextBooking) return;
    var bookDate = new Date(e.nextBooking);
    if (isNaN(bookDate)) return;
    var bookMonday = getMonday(bookDate);
    var brKey = localKey(bookMonday);
    if (weekMap[brKey]) {
      var already = weekMap[brKey].clients.some(function (c) { return c.nombre.toLowerCase().trim() === e.nombre.toLowerCase().trim(); });
      if (already) return;
    }
    var restante = Math.round(e.precio - (e.importePagado || e.precio * 0.25));
    if (!weekMap[brKey]) weekMap[brKey] = { monday: bookMonday, key: brKey, clients: [] };
    weekMap[brKey].clients.push({
      nombre: e.nombre, tipo: e.tipo, precio: e.precio,
      pagado: false, fechaPago: "",
      renewMonday: bookMonday, fechaValor: bookMonday, fechaFin: null,
      source: "pago_restante", nextBooking: e.nextBooking,
      clientId: e.clientId, clientStatus: e.clientStatus,
      importePagado: e.importePagado, restante: restante
    });
  });

  // Fixed tabs: 1 back + current + 8 ahead
  var weekList = [];
  for (var wi = -1; wi <= 8; wi++) {
    var mon = new Date(thisMonday); mon.setDate(mon.getDate() + wi * 7);
    var key = localKey(mon);
    weekList.push(weekMap[key] || { monday: mon, key: key, clients: [] });
  }

  // Auto-select
  var selWeek = weekList.find(function (w) { return w.key === renWeek; });
  if (!selWeek || renWeek === "auto") {
    selWeek = weekList.find(function (w) { return w.monday.getTime() === thisMonday.getTime(); }) || weekList[1];
    if (selWeek) setRenWeek(selWeek.key);
  }

  // Helpers
  function rk(nombre, weekKey) { return nombre.toLowerCase().trim() + "__" + weekKey; }
  function rd(nombre, weekKey) { return renData[rk(nombre, weekKey)] || {}; }
  function upd(nombre, weekKey, field, value) {
    var k = rk(nombre, weekKey);
    var cur = Object.assign({}, renData[k] || {});
    cur[field] = value;
    var n = Object.assign({}, renData); n[k] = cur;
    if (setRenData) setRenData(n);
    if (onSaveRenData) onSaveRenData(n);
  }

  // Notifications
  var thisWeekData = weekList.find(function (w) { return w.monday.getTime() === thisMonday.getTime(); });
  var todayNotifs = [];
  if (thisWeekData) {
    thisWeekData.clients.forEach(function (r) {
      var d = rd(r.nombre, thisWeekData.key);
      if (d.renovacion === "renovado" || d.renovacion === "baja" || d.renovacion === "mitad" || d.renovacion === "reserva" || r.pagado || r.mitadPagada || r.esReserva) return;
      if (r.nextBooking) {
        try {
          var bd = new Date(r.nextBooking);
          if (localKey(bd) === todayStr) {
            todayNotifs.push({ nombre: r.nombre, hora: bd.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }), tipo: r.tipo, precio: r.precio });
          }
        } catch (e) { }
      }
    });
  }

  function wc(w) {
    var r = 0, p = 0, b = 0, pendientesPago = 0;
    var today = new Date(); today.setHours(0,0,0,0);
    var isPastWeek = w.monday < thisMonday;
    w.clients.forEach(function (c) {
      var d = rd(c.nombre, w.key);
      if (d.renovacion === "renovado" || c.pagado) r++;
      else if (d.renovacion === "baja") b++;
      else {
        p++;
        // Si la semana ya pasó y no está renovado ni en baja → pago pendiente
        if (isPastWeek) pendientesPago++;
      }
    });
    return { renovados: r, pendientes: p, bajas: b, total: w.clients.length, pendientesPago: pendientesPago };
  }

  var selCounts = selWeek ? wc(selWeek) : { renovados: 0, pendientes: 0, bajas: 0, total: 0 };

  // ══ RENDER ══
  return (<div>
    {/* Header */}
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 10 }}>
      <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>🔄 Renovaciones</h2>
      <label style={{ padding: "8px 16px", background: "linear-gradient(135deg,#394265,#4a5580)", border: "none", borderRadius: 9, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
        📤 Importar Cuotas<input type="file" accept=".xls,.xlsx" onChange={importCuotas} style={{ display: "none" }} />
      </label>
    </div>

    {/* Notifications */}
    {todayNotifs.length > 0 && showNotifs && <div style={{ background: dk ? "rgba(245,158,11,.06)" : "#fefce8", border: "1px solid " + (dk ? "rgba(245,158,11,.2)" : "#fde68a"), borderRadius: 14, padding: "16px 20px", marginBottom: 20, position: "relative" }}>
      <button onClick={function () { setShowNotifs(false); }} style={{ position: "absolute", top: 10, right: 14, background: "none", border: "none", color: T.text3, fontSize: 14, cursor: "pointer" }}>✕</button>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}><span style={{ fontSize: 20 }}>🔔</span><span style={{ fontSize: 14, fontWeight: 800, color: "#f59e0b" }}>¡Hoy vienen {todayNotifs.length} cliente{todayNotifs.length > 1 ? "s" : ""} que tienen que renovar!</span></div>
      {todayNotifs.map(function (n, i) {
        return <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: dk ? "rgba(245,158,11,.08)" : "#fffbeb", borderRadius: 10, marginBottom: i < todayNotifs.length - 1 ? 6 : 0 }}>
          <div style={{ flex: 1 }}><span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{n.nombre}</span><span style={{ fontSize: 11, color: T.text3, marginLeft: 8 }}>{n.precio}€</span></div>
          <span style={{ fontSize: 14, fontWeight: 800, color: "#f59e0b" }}>🕐 {n.hora}</span>
        </div>;
      })}
    </div>}

    {/* ── WEEK DROPDOWN ── */}
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
      <select value={selWeek ? selWeek.key : ""} onChange={function (e) { setRenWeek(e.target.value); }}
        style={{
          padding: "12px 18px", fontSize: 15, fontWeight: 700,
          background: T.bg2, border: "2px solid " + T.navy, borderRadius: 12,
          color: T.text, outline: "none", cursor: "pointer", minWidth: 220
        }}>
        {weekList.map(function (w) {
          var isThis = w.monday.getTime() === thisMonday.getTime();
          var counts = wc(w);
          var alertMark = counts.pendientesPago > 0 ? " ⚠️" + counts.pendientesPago + " pago pend." : "";
          return <option key={w.key} value={w.key}>
            {weekShort(w.monday)}{isThis ? " ← Esta semana" : ""} ({counts.total}){alertMark}
          </option>;
        })}
      </select>

      {selWeek && <div style={{ display: "flex", gap: 16, fontSize: 14, fontWeight: 700, alignItems: "center" }}>
        <span style={{ color: "#22c55e" }}>✅ {selCounts.renovados}</span>
        <span style={{ color: "#f59e0b" }}>⏳ {selCounts.pendientes}</span>
        <span style={{ color: "#ef4444" }}>🚫 {selCounts.bajas}</span>
        {selCounts.pendientesPago > 0 && <span style={{
          color: "#ef4444", padding: "4px 10px", borderRadius: 8,
          background: "#ef444415", border: "1px solid #ef444440",
          fontSize: 12
        }}>⚠️ {selCounts.pendientesPago} pago{selCounts.pendientesPago > 1 ? "s" : ""} pendiente{selCounts.pendientesPago > 1 ? "s" : ""}</span>}
      </div>}
    </div>

    {/* Week range label */}
    {selWeek && <div style={{ fontSize: 13, color: T.text3, marginBottom: 14 }}>{weekLabel(selWeek.monday)}</div>}

    {/* ── CLIENT LIST ── */}
    {selWeek && <div style={{ background: T.bg2, borderRadius: 14, border: "1px solid " + T.border, overflow: "hidden" }}>
      {selWeek.clients.length === 0 && <div style={{ padding: 40, textAlign: "center", color: T.text3 }}>
        <div style={{ fontSize: 30, opacity: 0.3, marginBottom: 8 }}>📋</div>
        Sin renovaciones esta semana
      </div>}

      {selWeek.clients.slice().sort(function (a, b) {
        var da = rd(a.nombre, selWeek.key);
        var db = rd(b.nombre, selWeek.key);
        var aMitad = da.renovacion === "mitad" || (a.mitadPagada && !a.pagado && da.renovacion !== "baja");
        var bMitad = db.renovacion === "mitad" || (b.mitadPagada && !b.pagado && db.renovacion !== "baja");
        var aReserva = da.renovacion === "reserva" || (a.esReserva && !a.pagado && da.renovacion !== "baja");
        var bReserva = db.renovacion === "reserva" || (b.esReserva && !b.pagado && db.renovacion !== "baja");
        var sa = (da.renovacion === "renovado" || a.pagado) ? 0 : aReserva ? 0.5 : aMitad ? 1 : da.renovacion === "baja" ? 3 : 2;
        var sb = (db.renovacion === "renovado" || b.pagado) ? 0 : bReserva ? 0.5 : bMitad ? 1 : db.renovacion === "baja" ? 3 : 2;
        return sa - sb;
      }).map(function (r, i) {
        var data = rd(r.nombre, selWeek.key);
        // Auto-detect mitad pagada or reserva from TIMP API
        var autoMitad = r.mitadPagada && !r.pagado;
        var autoReserva = r.esReserva && !r.pagado;
        var isRenovado = data.renovacion === "renovado" || r.pagado;
        var isReserva = data.renovacion === "reserva" || (autoReserva && !isRenovado && data.renovacion !== "baja");
        var isMitad = data.renovacion === "mitad" || (autoMitad && !isRenovado && !isReserva && data.renovacion !== "baja");
        var isBaja = data.renovacion === "baja";
        var isPending = !isRenovado && !isBaja && !isMitad && !isReserva;
        var noteKey = rk(r.nombre, selWeek.key);
        var isEditingNote = editNote === noteKey;

        var rowBg = "transparent";
        if (isBaja) rowBg = dk ? "rgba(239,68,68,.04)" : "#fef2f2";
        if (isRenovado) rowBg = dk ? "rgba(34,197,94,.04)" : "#f0fdf4";
        if (isMitad) rowBg = dk ? "rgba(99,102,241,.04)" : "#f0f0ff";
        if (isReserva) rowBg = dk ? "rgba(6,182,212,.04)" : "#f0fdfa";

        // Status color
        var stColor = isRenovado ? "#22c55e" : isReserva ? "#06b6d4" : isMitad ? "#6366f1" : isBaja ? "#ef4444" : "#f59e0b";
        var stBg = stColor + "12";
        var stBorder = stColor + "35";

        // Is this a "segundo pago" entry?
        var isSegundoPago = r.source === "segundo_pago";

        return <div key={i} style={{
          padding: "8px 16px", borderBottom: "1px solid " + T.border,
          background: rowBg, opacity: isBaja ? 0.5 : 1
        }}>
          {/* Row: name + price + status */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

            {/* Name + price */}
            <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div style={{
                fontSize: 13, fontWeight: 700, color: T.text,
                textDecoration: isBaja ? "line-through" : "none"
              }}>{r.nombre}</div>
              <span style={{ fontSize: 14, fontWeight: 900, color: stColor }}>{isSegundoPago ? Math.round(r.precio / 2) + "€" : isMitad ? Math.round(r.precio / 2) + "€ pag." : isReserva ? r.importePagado + "€ res." : r.precio + "€"}</span>
              {r.source === "calculado" && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "#f59e0b15", color: "#f59e0b", fontWeight: 700 }}>sin bono nuevo</span>}
              {isSegundoPago && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "#6366f115", color: "#6366f1", fontWeight: 700 }}>2º pago</span>}
              {isMitad && !isSegundoPago && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "#6366f115", color: "#6366f1", fontWeight: 700 }}>💰 Pago fraccionado</span>}
              {isReserva && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "#06b6d415", color: "#06b6d4", fontWeight: 700 }}>🔒 Reserva</span>}
              {r.source === "pago_restante" && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "#06b6d415", color: "#06b6d4", fontWeight: 700 }}>💰 Pago restante</span>}
              {r.source === "agotado" && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "#ef444415", color: "#ef4444", fontWeight: 700 }}>⚡ Bono agotado ({r.sesiones.usadas + r.sesiones.caducadas}/{r.sesiones.total})</span>}
              {r.source === "ultima_sesion" && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "#f59e0b15", color: "#f59e0b", fontWeight: 700 }}>⚠️ Última sesión ({r.sesiones.restantes} de {r.sesiones.total})</span>}
            </div>

            {/* STATUS — big select */}
            <select
              value={r.pagado ? "renovado" : isReserva ? "reserva" : isMitad ? "mitad" : (data.renovacion || "pendiente")}
              onChange={function (e) {
                var val = e.target.value;
                upd(r.nombre, selWeek.key, "renovacion", val);

                // If "mitad pagada" → create entry 6 weeks later for 2nd payment
                if (val === "mitad") {
                  var sixWeeks = new Date(selWeek.monday);
                  sixWeeks.setDate(sixWeeks.getDate() + 42);
                  var spKey = localKey(sixWeeks);
                  var spRk = r.nombre.toLowerCase().trim() + "__" + spKey;
                  var existing = renData[spRk];
                  if (!existing || !existing.notas) {
                    var newData = Object.assign({}, renData);
                    newData[spRk] = { notas: "2º pago trimestral — faltan " + Math.round(r.precio / 2) + "€", segundoPago: true, fromWeek: selWeek.key, clientName: r.nombre };
                    if (setRenData) setRenData(newData);
                    if (onSaveRenData) onSaveRenData(newData);
                  }
                }

                // If "reserva" → create entry at next booking week for remaining payment
                if (val === "reserva" && r.nextBooking) {
                  var bookDate = new Date(r.nextBooking);
                  var bookMonday = getMonday(bookDate);
                  var brKey = localKey(bookMonday);
                  var brRk = r.nombre.toLowerCase().trim() + "__" + brKey;
                  var existingR = renData[brRk];
                  if (!existingR || !existingR.notas) {
                    var restante = Math.round(r.precio - (r.importePagado || r.precio * 0.25));
                    var nd = Object.assign({}, renData);
                    nd[brRk] = { notas: "Pago restante reserva — faltan " + restante + "€", segundoPago: true, fromWeek: selWeek.key, clientName: r.nombre };
                    if (setRenData) setRenData(nd);
                    if (onSaveRenData) onSaveRenData(nd);
                  }
                }

                if (val === "baja" && r.clientId && r.clientStatus !== "baja") {
                  if (confirm("¿Dar de baja a " + r.nombre + " en el CRM?")) {
                    if (onChangeStatus) onChangeStatus(r.nombre, "baja");
                  }
                }
              }}
              disabled={r.pagado}
              style={{
                padding: "6px 10px", borderRadius: 7, fontSize: 11, fontWeight: 800,
                outline: "none", cursor: r.pagado ? "default" : "pointer",
                border: "1.5px solid " + stBorder,
                background: stBg, color: stColor,
                minWidth: 130, flexShrink: 0
              }}
            >
              <option value="pendiente">⏳ Pendiente</option>
              <option value="reserva">🔒 Reserva</option>
              <option value="mitad">💰 Mitad pagada</option>
              <option value="renovado">✅ Renovado</option>
              <option value="baja">🚫 No renueva</option>
            </select>

            {/* Avisado checkbox */}
            <button onClick={function () { upd(r.nombre, selWeek.key, "avisado", !data.avisado); }}
              title="Avisado"
              style={{
                width: 26, height: 26, borderRadius: 6,
                border: data.avisado ? "1.5px solid #3b82f6" : "1.5px solid " + T.border2,
                background: data.avisado ? "#3b82f615" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", fontSize: 11, color: data.avisado ? "#3b82f6" : T.text3,
                padding: 0, flexShrink: 0
              }}>{data.avisado ? "✓" : "📢"}</button>

            {/* Move to another week */}
            <button onClick={function () { setMoveClient(r); setMoveTarget(""); }}
              title="Mover a otra semana"
              style={{
                width: 26, height: 26, borderRadius: 6,
                border: "1.5px solid " + T.border2,
                background: "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", fontSize: 11, color: T.text3,
                padding: 0, flexShrink: 0
              }}>📅</button>
          </div>

          {/* Notes — compact, click to edit */}
          {(isEditingNote || data.notas) && <div style={{ marginTop: 4 }}>
            {isEditingNote ? (
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  autoFocus
                  value={noteTmp}
                  onChange={function (e) { setNoteTmp(e.target.value); }}
                  onKeyDown={function (e) {
                    if (e.key === "Enter") { upd(r.nombre, selWeek.key, "notas", noteTmp); setEditNote(null); }
                    if (e.key === "Escape") { setEditNote(null); }
                  }}
                  placeholder="Escribe una nota..."
                  style={{
                    flex: 1, padding: "5px 10px", background: T.bg3,
                    border: "1px solid " + T.navy, borderRadius: 6,
                    color: T.text, fontSize: 11, outline: "none"
                  }}
                />
                <button onClick={function () { upd(r.nombre, selWeek.key, "notas", noteTmp); setEditNote(null); }}
                  style={{
                    padding: "5px 10px", background: T.navy, border: "none",
                    borderRadius: 6, color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer"
                  }}>OK</button>
              </div>
            ) : (
              <div onClick={function () { setEditNote(noteKey); setNoteTmp(data.notas || ""); }}
                style={{
                  padding: "3px 8px", borderRadius: 5, cursor: "pointer",
                  background: dk ? "rgba(99,102,241,.06)" : "#f8f9ff",
                  border: "1px solid " + T.border,
                  fontSize: 10, color: T.text,
                  display: "inline-flex", alignItems: "center", gap: 4
                }}>
                📝 {data.notas}
              </div>
            )}
          </div>}
          {!isEditingNote && !data.notas && <button onClick={function () { setEditNote(noteKey); setNoteTmp(""); }}
            style={{
              marginTop: 2, padding: "1px 6px", background: "transparent",
              border: "none", color: T.text3, fontSize: 9, cursor: "pointer",
              opacity: 0.5
            }}>+ nota</button>}
        </div>;
      })}
    </div>}

    {/* ═══ MOVE MODAL ═══ */}
    {moveClient && <div onClick={function () { setMoveClient(null); }} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.6)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
    }}>
      <div onClick={function (e) { e.stopPropagation(); }} style={{
        background: T.bg2, borderRadius: 16, padding: 24, width: "90%", maxWidth: 380,
        border: "1px solid " + T.border2
      }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 800 }}>📅 Mover renovación</h3>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 12 }}>{moveClient.nombre}</div>
        <div style={{ fontSize: 12, color: T.text3, marginBottom: 16 }}>Selecciona la semana destino:</div>
        <select value={moveTarget} onChange={function (e) { setMoveTarget(e.target.value); }}
          style={{
            width: "100%", padding: "12px 16px", fontSize: 14, fontWeight: 700,
            background: T.bg3, border: "2px solid " + T.navy, borderRadius: 10,
            color: T.text, outline: "none", cursor: "pointer", marginBottom: 16, boxSizing: "border-box"
          }}>
          <option value="">— Elige semana —</option>
          {weekList.filter(function (w) { return w.key !== selWeek.key; }).map(function (w) {
            var isThis = w.monday.getTime() === thisMonday.getTime();
            return <option key={w.key} value={w.key}>
              {weekShort(w.monday)}{isThis ? " ← Esta semana" : ""} ({w.clients.length} clientes)
            </option>;
          })}
        </select>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={function () { setMoveClient(null); }}
            style={{ flex: 1, padding: 10, background: T.bg3, border: "1px solid " + T.border2, borderRadius: 9, color: T.text2, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
          <button onClick={function () {
            if (!moveTarget) return;
            var fromKey = selWeek.key;
            var n = Object.assign({}, renData);
            var fk = moveClient.nombre.toLowerCase().trim() + "__" + fromKey;
            var tk = moveClient.nombre.toLowerCase().trim() + "__" + moveTarget;
            n[fk] = Object.assign({}, n[fk] || {}, { renovacion: "renovado", notas: (n[fk] && n[fk].notas ? n[fk].notas + " | " : "") + "→ Movido a " + moveTarget });
            n[tk] = Object.assign({}, n[tk] || {}, { notas: "Movido desde " + fromKey, segundoPago: true, clientName: moveClient.nombre });
            if (setRenData) setRenData(n);
            if (onSaveRenData) onSaveRenData(n);
            setMoveClient(null);
          }}
            style={{ flex: 1, padding: 10, background: "linear-gradient(135deg,#394265,#4a5580)", border: "none", borderRadius: 9, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Mover</button>
        </div>
        <button onClick={function () {
          if (!confirm("¿Eliminar a " + moveClient.nombre + " de renovaciones de esta semana?")) return;
          var fromKey = selWeek.key;
          var n = Object.assign({}, renData);
          var fk = moveClient.nombre.toLowerCase().trim() + "__" + fromKey;
          n[fk] = Object.assign({}, n[fk] || {}, { renovacion: "renovado", notas: (n[fk] && n[fk].notas ? n[fk].notas + " | " : "") + "Eliminado de esta semana" });
          if (setRenData) setRenData(n);
          if (onSaveRenData) onSaveRenData(n);
          setMoveClient(null);
        }}
          style={{ width: "100%", padding: 10, background: "#ef444410", border: "1px solid #ef444430", borderRadius: 9, color: "#ef4444", fontSize: 12, fontWeight: 700, cursor: "pointer", marginTop: 10 }}>🗑️ Eliminar de esta semana</button>
      </div>
    </div>}
  </div>);
}
