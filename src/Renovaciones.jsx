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
  var todayStr = now.toISOString().split("T")[0];

  var allBonos = [];
  bonos.forEach(function (b) {
    var fv = b.fechaValor ? new Date(b.fechaValor) : null;
    var ff = b.fechaFin ? new Date(b.fechaFin) : null;
    if (!fv || isNaN(fv)) return;
    allBonos.push({
      nombre: b.nombre, tipo: b.tipoBono || b.concepto || "",
      fechaValor: fv, fechaFin: ff, fechaValorMonday: getMonday(fv),
      precio: b.precio || b.total || 0, pagado: !!b.pagado,
      fechaPago: b.fechaPago || "", suscriptionUuid: b.suscriptionUuid || ""
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
      var monday = bono.fechaValorMonday;
      var weekKey = monday.toISOString().split("T")[0];
      if (addedWeeks[weekKey]) return;
      addedWeeks[weekKey] = true;
      entries.push({
        nombre: client.nombre, tipo: bono.tipo, precio: bono.precio,
        pagado: bono.pagado, fechaPago: bono.fechaPago,
        renewMonday: monday, fechaValor: bono.fechaValor, fechaFin: bono.fechaFin,
        source: "bono", nextBooking: nextBooking,
        clientId: crmClient ? crmClient.id : null, clientStatus: crmClient ? crmClient.status : null
      });
    });

    var latest = sorted[sorted.length - 1];
    if (latest && latest.fechaFin) {
      var nextMon = getNextMonday(latest.fechaFin);
      var nextKey = nextMon.toISOString().split("T")[0];
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

  // Build week map
  var weekMap = {};
  entries.forEach(function (e) {
    var key = e.renewMonday.toISOString().split("T")[0];
    if (!weekMap[key]) weekMap[key] = { monday: e.renewMonday, key: key, clients: [] };
    weekMap[key].clients.push(e);
  });

  // Fixed tabs: 1 back + current + 8 ahead
  var weekList = [];
  for (var wi = -1; wi <= 8; wi++) {
    var mon = new Date(thisMonday); mon.setDate(mon.getDate() + wi * 7);
    var key = mon.toISOString().split("T")[0];
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
      if (d.renovacion === "renovado" || d.renovacion === "baja" || r.pagado) return;
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

  function wc(w) {
    var r = 0, p = 0, b = 0;
    w.clients.forEach(function (c) {
      var d = rd(c.nombre, w.key);
      if (d.renovacion === "renovado" || c.pagado) r++;
      else if (d.renovacion === "baja") b++;
      else p++;
    });
    return { renovados: r, pendientes: p, bajas: b, total: w.clients.length };
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
          return <option key={w.key} value={w.key}>
            {weekShort(w.monday)}{isThis ? " ← Esta semana" : ""} ({counts.total} clientes)
          </option>;
        })}
      </select>

      {selWeek && <div style={{ display: "flex", gap: 16, fontSize: 14, fontWeight: 700 }}>
        <span style={{ color: "#22c55e" }}>✅ {selCounts.renovados}</span>
        <span style={{ color: "#f59e0b" }}>⏳ {selCounts.pendientes}</span>
        <span style={{ color: "#ef4444" }}>🚫 {selCounts.bajas}</span>
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

      {selWeek.clients.map(function (r, i) {
        var data = rd(r.nombre, selWeek.key);
        var isRenovado = data.renovacion === "renovado" || r.pagado;
        var isBaja = data.renovacion === "baja";
        var isPending = !isRenovado && !isBaja;
        var noteKey = rk(r.nombre, selWeek.key);
        var isEditingNote = editNote === noteKey;

        var initials = r.nombre.split(" ").map(function (x) { return x[0]; }).slice(0, 2).join("");

        var rowBg = "transparent";
        if (isBaja) rowBg = dk ? "rgba(239,68,68,.04)" : "#fef2f2";
        if (isRenovado) rowBg = dk ? "rgba(34,197,94,.04)" : "#f0fdf4";

        // Status color
        var stColor = isRenovado ? "#22c55e" : isBaja ? "#ef4444" : "#f59e0b";
        var stBg = stColor + "12";
        var stBorder = stColor + "35";

        return <div key={i} style={{
          padding: "16px 20px", borderBottom: "1px solid " + T.border,
          background: rowBg, opacity: isBaja ? 0.5 : 1
        }}>
          {/* Row: name + status + price */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            {/* Avatar */}
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: stBg, border: "2px solid " + stBorder,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 800, color: stColor, flexShrink: 0
            }}>{initials}</div>

            {/* Name + price */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 15, fontWeight: 700, color: T.text,
                textDecoration: isBaja ? "line-through" : "none"
              }}>{r.nombre}</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 2 }}>
                <span style={{ fontSize: 12, color: T.text3 }}>{r.precio}€</span>
                {r.source === "calculado" && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "#f59e0b15", color: "#f59e0b", fontWeight: 700 }}>sin bono nuevo</span>}
              </div>
            </div>

            {/* STATUS — big select */}
            <select
              value={r.pagado ? "renovado" : (data.renovacion || "pendiente")}
              onChange={function (e) {
                upd(r.nombre, selWeek.key, "renovacion", e.target.value);
                if (e.target.value === "baja" && r.clientId && r.clientStatus !== "baja") {
                  if (confirm("¿Dar de baja a " + r.nombre + " en el CRM?")) {
                    if (onChangeStatus) onChangeStatus(r.nombre, "baja");
                  }
                }
              }}
              disabled={r.pagado}
              style={{
                padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 800,
                outline: "none", cursor: r.pagado ? "default" : "pointer",
                border: "2px solid " + stBorder,
                background: stBg, color: stColor,
                minWidth: 150, flexShrink: 0
              }}
            >
              <option value="pendiente">⏳ Pendiente</option>
              <option value="renovado">✅ Renovado</option>
              <option value="baja">🚫 No renueva</option>
            </select>

            {/* Avisado checkbox */}
            <button onClick={function () { upd(r.nombre, selWeek.key, "avisado", !data.avisado); }}
              title="Avisado"
              style={{
                width: 36, height: 36, borderRadius: 9,
                border: data.avisado ? "2px solid #3b82f6" : "2px solid " + T.border2,
                background: data.avisado ? "#3b82f615" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", fontSize: 14, color: data.avisado ? "#3b82f6" : T.text3,
                padding: 0, flexShrink: 0
              }}>{data.avisado ? "✓" : "📢"}</button>
          </div>

          {/* Notes — always visible, click to edit */}
          <div style={{ marginLeft: 52 }}>
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
                    flex: 1, padding: "8px 12px", background: T.bg3,
                    border: "1px solid " + T.navy, borderRadius: 8,
                    color: T.text, fontSize: 12, outline: "none"
                  }}
                />
                <button onClick={function () { upd(r.nombre, selWeek.key, "notas", noteTmp); setEditNote(null); }}
                  style={{
                    padding: "8px 14px", background: T.navy, border: "none",
                    borderRadius: 8, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer"
                  }}>OK</button>
              </div>
            ) : (
              <div onClick={function () { setEditNote(noteKey); setNoteTmp(data.notas || ""); }}
                style={{
                  padding: "6px 10px", borderRadius: 8, cursor: "pointer",
                  background: data.notas ? (dk ? "rgba(99,102,241,.06)" : "#f8f9ff") : "transparent",
                  border: data.notas ? "1px solid " + T.border : "1px dashed " + T.border2,
                  fontSize: 12, color: data.notas ? T.text : T.text3,
                  minHeight: 28, display: "flex", alignItems: "center", gap: 6
                }}>
                <span style={{ fontSize: 11 }}>📝</span>
                {data.notas || "Añadir nota..."}
              </div>
            )}
          </div>
        </div>;
      })}
    </div>}
  </div>);
}
