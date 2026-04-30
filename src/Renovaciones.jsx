import { useState } from "react";
import RetrasosPago from "./RetrasosPago.jsx";

var DAYS_ES = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
var MONTHS_ES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

// ══════════════════════════════════════════════════════════════════════
//  HELPERS de matching seguro (evitan falsos positivos tipo Luis ↔ Luisa)
// ══════════════════════════════════════════════════════════════════════
function normName(s){
  if(!s)return "";
  return String(s).toLowerCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/\s+/g," ");
}
function matchesName(a,b){
  var na=normName(a),nb=normName(b);
  if(!na||!nb)return false;
  if(na===nb)return true;
  var wa=na.split(" "),wb=nb.split(" ");
  if(wa.length<2||wb.length<2)return false;
  return wa[0]===wb[0]&&wa[1]===wb[1];
}

// Match preferente por UUID con fallback a nombre.
// crmCl: cliente del CRM (con .name y .timpUuid)
// other: objeto con .uuid/.timpUuid/.suscriptionUuid o .nombre/.full_name/.name
function matchesClient(crmCl, other){
  if(!crmCl||!other)return false;
  var uuidA=crmCl.timpUuid;
  var uuidB=other.uuid||other.timpUuid||other.suscriptionUuid;
  if(uuidA&&uuidB)return uuidA===uuidB;
  var nameB=other.name||other.full_name||other.nombre;
  return matchesName(crmCl.name,nameB);
}

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
  var reservasExcel = props.reservasExcel || [];
  var importReservas = props.importReservas;
  var blacklist = props.blacklist || [];
  var saveBlacklist = props.saveBlacklist || function(){};
  var renData = props.renData || {};
  var setRenData = props.setRenData;
  var onSaveRenData = props.onSaveRenData;
  var onChangeStatus = props.onChangeStatus;
  var importCuotas = props.importCuotas;

  // Tab activo: "renovaciones" o "retrasos"
  var tab_ = useState("renovaciones"), tab = tab_[0], setTab = tab_[1];

  // Helper: normalizar nombre para comparación
  function normN(s){return (s||"").toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"");}
  // Helper: cliente está en la blacklist?
  function inBlacklist(nombre){
    if(!blacklist.length)return false;
    var n=normN(nombre);
    return blacklist.some(function(b){
      var bn=normN(b);
      if(!bn)return false;
      var wa=n.split(" ").filter(Boolean);
      var wb=bn.split(" ").filter(Boolean);
      if(wa.length>=1&&wb.length>=1&&wa[0]===wb[0]){
        if(wb.length===1)return true;
        if(wa.length>=2&&wb.length>=2&&wa[1]===wb[1])return true;
      }
      return n.indexOf(bn)>=0;
    });
  }

  var _ = useState;
  var rw_ = _("auto"), renWeek = rw_[0], setRenWeek = rw_[1];
  var nf_ = _(true), showNotifs = nf_[0], setShowNotifs = nf_[1];
  var editNote_ = _(null), editNote = editNote_[0], setEditNote = editNote_[1];
  var noteTmp_ = _(""), noteTmp = noteTmp_[0], setNoteTmp = noteTmp_[1];
  var moveClient_ = _(null), moveClient = moveClient_[0], setMoveClient = moveClient_[1];
  var moveTarget_ = _(""), moveTarget = moveTarget_[0], setMoveTarget = moveTarget_[1];
  var bl_ = _(false), showBl = bl_[0], setShowBl = bl_[1];
  var blNew_ = _(""), blNew = blNew_[0], setBlNew = blNew_[1];

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
    // Blacklist: excluir cliente completo
    if (inBlacklist(client.nombre)) return;

    var sorted = client.bonos.slice().sort(function (a, b) { return a.fechaValor - b.fechaValor; });
    // Match por UUID si lo tenemos en cliente CRM y bono (más fiable). Fallback a nombre.
    var crmClient = clients.find(function (cl) {
      if (cl.timpUuid && client.uuid) return cl.timpUuid === client.uuid;
      return matchesName(cl.name, client.nombre);
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

  // ══════════════════════════════════════════════════════════════════════
  //  REGLA EXCEL (Jesús) — Lógica híbrida
  // ══════════════════════════════════════════════════════════════════════
  //  Si tenemos el REPORTE DE RESERVAS cargado:
  //    → Usamos cuenta real: para cada bono, contamos reservas (Aceptadas,
  //      Canjeada Si o No) cuyo Inicio cae entre fechaValor del bono
  //      y domingo de la semana del Excel de Cuotas.
  //    → Si esas reservas >= total → bono agotado → Renovaciones semana siguiente.
  //
  //  Si NO tenemos Reservas (fallback):
  //    → Lógica antigua: consumido = usadas + caducadas del Excel de Cuotas
  //    → Agotado si consumido >= total AND enUso == 0.
  //
  //  Filtros comunes:
  //    - Blacklist
  //    - Apaños (caducadas = total)
  //    - Otro bono activo en paralelo
  //    - Dedup por cliente
  //    - Ya renovó (hasNewerBono)
  //    - Status = baja
  // ══════════════════════════════════════════════════════════════════════

  // Helper: match de tipo de bono entre Excel Cuotas y campo Venta del reporte Reservas
  function matchBonoType(ventaReserva, tipoCuota) {
    if (!ventaReserva || !tipoCuota) return false;
    var v = ventaReserva.toLowerCase();
    var t = tipoCuota.toLowerCase().trim();
    // Hacer match estricto: el tipo del Cuota debe aparecer completo en la Venta
    // Ejemplo: "Time partner plus trimestral" debe estar en "Time partner plus trimestral (Time dual)"
    return v.indexOf(t) >= 0;
  }

  // Helper: cuenta reservas reales de un cliente/bono hasta domingo semana Excel
  function contarReservasReales(nombreCliente, tipoBono, fechaValorBono, domingoSemanaExcel) {
    if (!reservasExcel.length) return null; // sin datos: fallback
    var count = 0;
    reservasExcel.forEach(function (rv) {
      if (rv.estado !== "Aceptada") return; // canceladas no cuentan
      // Regaladas (cortesía) tampoco son del bono
      if (rv.canjeada !== "Si" && rv.canjeada !== "No") return;
      if (!matchesName(rv.nombre, nombreCliente)) return;
      if (!matchBonoType(rv.venta, tipoBono)) return;
      var ini = new Date(rv.inicio);
      if (isNaN(ini.getTime())) return;
      if (ini < fechaValorBono) return; // anterior al bono actual
      if (ini > domingoSemanaExcel) return; // futura (fuera de ventana)
      count++;
    });
    return count;
  }

  if (cuotasExcel.length > 0) {
    // Domingo de la semana del Excel de Cuotas
    var domingoSemanaExcel = null;
    cuotasExcel.forEach(function (cx) {
      if (cx.semanaExcel && !domingoSemanaExcel) {
        var d = new Date(cx.semanaExcel + "T00:00:00");
        d.setDate(d.getDate() + 6);
        d.setHours(23, 59, 59, 999);
        domingoSemanaExcel = d;
      }
    });

    // Clientes con OTRO bono aún activo (para evitar falsos agotados)
    var clientesConBonoActivo = {};
    cuotasExcel.forEach(function (cx) {
      var tot = +cx.totalSesiones || 0;
      var usa = +cx.usadas || 0;
      var cad = +cx.caducadas || 0;
      var eu = +cx.enUso || 0;
      var cons = usa + cad;
      if (eu > 0 || cons < tot) {
        var k = (cx.nombre || "").toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        clientesConBonoActivo[k] = true;
      }
    });

    var candidatos = [];
    cuotasExcel.forEach(function (cx) {
      if (!cx.nombre || !cx.totalSesiones) return;

      // Blacklist
      if (inBlacklist(cx.nombre)) return;

      var tot = +cx.totalSesiones || 0;
      var usa = +cx.usadas || 0;
      var cad = +cx.caducadas || 0;
      var eu = +cx.enUso || 0;

      // Apaños: bono 100% caducado
      if (cad >= tot) return;

      // Cliente con otro bono activo
      var k = (cx.nombre || "").toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (clientesConBonoActivo[k]) return;

      // ═══ DETECCIÓN DE AGOTAMIENTO ═══
      var agotado = false;

      // Método preferido: usar el reporte de Reservas si está cargado
      if (reservasExcel.length > 0 && domingoSemanaExcel) {
        // Buscar fecha de inicio del bono en TIMP API (allBonos)
        var bonosCliente = allBonos.filter(function (b) {
          if (!matchesName(b.nombre, cx.nombre)) return false;
          return matchBonoType(b.tipo, cx.tipoBono);
        });
        // Coger el más reciente
        var fechaValorBono = null;
        if (bonosCliente.length > 0) {
          bonosCliente.sort(function (a, b) {
            return (b.fechaValor ? b.fechaValor.getTime() : 0) - (a.fechaValor ? a.fechaValor.getTime() : 0);
          });
          fechaValorBono = bonosCliente[0].fechaValor;
        }
        // Fallback: fecha Valor del Excel de Cuotas
        if (!fechaValorBono && cx.fechaValor) {
          var fv = new Date(cx.fechaValor);
          if (!isNaN(fv.getTime())) fechaValorBono = fv;
        }
        if (fechaValorBono) {
          var consumidoReal = contarReservasReales(cx.nombre, cx.tipoBono, fechaValorBono, domingoSemanaExcel);
          if (consumidoReal !== null && consumidoReal >= tot) {
            agotado = true;
          }
        }
      } else {
        // Fallback: lógica antigua con Cuotas
        var cons = usa + cad;
        if (tot > 0 && cons >= tot && eu === 0) agotado = true;
      }

      if (!agotado) return;

      candidatos.push({ cx: cx, total: tot });
    });

    // Deduplicar por cliente (mayor total)
    var dedupMap = {};
    candidatos.forEach(function (c) {
      var k = (c.cx.nombre || "").toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (!dedupMap[k] || c.total > dedupMap[k].total) dedupMap[k] = c;
    });

    Object.keys(dedupMap).forEach(function (k) {
      var c = dedupMap[k];
      var cx = c.cx;

      // Semana destino: lunes semana Excel + 7 días
      var renewMon;
      if (cx.semanaExcel) {
        var d = new Date(cx.semanaExcel + "T00:00:00");
        d.setDate(d.getDate() + 7);
        d.setHours(0, 0, 0, 0);
        renewMon = getMonday(d);
      } else {
        var d2 = new Date(thisMonday);
        d2.setDate(d2.getDate() + 7);
        renewMon = getMonday(d2);
      }

      // Evitar duplicado con entry TIMP esa semana
      var alreadyThatWeek = entries.some(function (e) {
        return matchesName(e.nombre, cx.nombre) &&
          e.renewMonday.getTime() === renewMon.getTime();
      });
      if (alreadyThatWeek) return;

      // Ya renovó
      var hasNewerBono = allBonos.some(function (b) {
        return matchesName(b.nombre, cx.nombre) &&
          b.fechaValor && b.fechaValor >= renewMon;
      });
      if (hasNewerBono) return;

      // Cliente
      var crmClient = clients.find(function (cl) { return matchesName(cl.name, cx.nombre); });
      if (crmClient && crmClient.status === "baja") return;

      var total = +cx.totalSesiones || 0;
      var consumidasTotal = (+cx.usadas || 0) + (+cx.caducadas || 0);
      var restantes = total - consumidasTotal;

      entries.push({
        nombre: cx.nombre,
        tipo: cx.tipoBono || "",
        precio: 0,
        pagado: false, fechaPago: "",
        renewMonday: renewMon,
        fechaValor: renewMon,
        fechaFin: null,
        source: "agotado_excel",
        nextBooking: crmClient && crmClient.timpNextBooking ? crmClient.timpNextBooking : null,
        clientId: crmClient ? crmClient.id : null,
        clientStatus: crmClient ? crmClient.status : null,
        sesiones: {
          total: total,
          usadas: +cx.usadas || 0,
          caducadas: +cx.caducadas || 0,
          sinCanjear: +cx.sinCanjear || 0,
          enUso: +cx.enUso || 0,
          restantes: restantes
        }
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
    // Compatibilidad retroactiva: antes los movidos manualmente se guardaban como segundoPago.
    // Si las notas contienen "Movido desde", lo tratamos como movido (precio completo) en otro bloque.
    if (d.notas && d.notas.indexOf("Movido desde") >= 0) return;
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

  // ══ Procesar entries movidos manualmente (renData con flag "movido") ══
  // Diferencia clave con segundoPago: el precio es el COMPLETO del bono,
  // no la mitad. Es una renovación aplazada, no un 2º pago de fraccionado.
  // También captura entries antiguos que tenían segundoPago:true por error
  // pero cuyas notas dicen "Movido desde" (compatibilidad retroactiva).
  Object.keys(renData).forEach(function (k) {
    var d = renData[k];
    if (!d || !d.clientName) return;
    var esMovido = d.movido || (d.segundoPago && d.notas && d.notas.indexOf("Movido desde") >= 0);
    if (!esMovido) return;
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
      nombre: d.clientName,
      tipo: origClient ? origClient.tipo : "",
      precio: origClient ? origClient.precio : 0,
      pagado: false, fechaPago: "",
      renewMonday: mon, fechaValor: mon, fechaFin: null,
      source: "movido", // distinto de segundo_pago para mantener precio completo
      nextBooking: origClient ? origClient.nextBooking : null,
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

  // ═══ AUTO-DRAG: unpaid entries from past weeks → move to current week ═══
  // ONLY drag if: not paid AND not manually marked as renovado/baja/mitad/reserva in renData
  var thisWeekKey = localKey(thisMonday);
  if (!weekMap[thisWeekKey]) weekMap[thisWeekKey] = { monday: thisMonday, key: thisWeekKey, clients: [] };
  var thisWeekRef = weekList.find(function (w) { return w.key === thisWeekKey; });
  if (thisWeekRef) {
    Object.keys(weekMap).forEach(function (wk) {
      var wMonday = new Date(wk + "T00:00:00");
      if (isNaN(wMonday) || wMonday >= thisMonday) return;
      var wData = weekMap[wk];
      if (!wData || !wData.clients) return;
      wData.clients.forEach(function (c) {
        if (c.pagado) return;
        // Check renData for THIS specific entry's week
        var d = rd(c.nombre, wk);
        if (d.renovacion === "renovado" || d.renovacion === "baja" || d.renovacion === "mitad" || d.renovacion === "reserva") return;
        // Only drag "segundo_pago", "pago_restante", or "arrastre_impago" sources
        // Do NOT drag regular bono entries — those are just unpaid in TIMP but may have paid by cash
        if (c.source !== "segundo_pago" && c.source !== "pago_restante" && c.source !== "arrastre_impago") return;
        // Match seguro: ya hay otra fila del mismo cliente esta semana (cualquier source)
        var alreadyThisWeek = thisWeekRef.clients.some(function (tc) { return matchesName(tc.nombre, c.nombre); });
        if (alreadyThisWeek) return;
        thisWeekRef.clients.push({
          nombre: c.nombre, tipo: c.tipo, precio: c.precio,
          pagado: false, fechaPago: "",
          renewMonday: thisMonday, fechaValor: thisMonday, fechaFin: null,
          source: "arrastre_impago", nextBooking: c.nextBooking,
          clientId: c.clientId, clientStatus: c.clientStatus,
          importePagado: c.importePagado, restante: c.restante,
          originalWeek: c.originalWeek || wk
        });
      });
    });
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

  // Calcular nº de retrasos (bonos sin pagar) para el badge.
  // No fraccionados: 7-60 días sin pagar.
  // Fraccionados: solo a partir del día 49 (7 semanas) sin liquidar 2º pago.
  function countRetrasos(){
    var count = 0;
    var seen = {};
    bonos.forEach(function(b){
      var caption = (b.tipoBono || b.concepto || "").toLowerCase();
      var isEntrenamiento = caption.indexOf("time") >= 0 || caption.indexOf("partner") >= 0 || caption.indexOf("pro") >= 0 || caption.indexOf("bono") >= 0 || caption.indexOf("sesion") >= 0 || caption.indexOf("dual") >= 0;
      if(!isEntrenamiento) return;
      var key = b.nombre + "__" + (b.fechaValor || "");
      if(seen[key]) return;
      seen[key] = true;
      var precio = +b.precio || +b.total || 0;
      var pagado = !!b.pagado;
      var importePagado = +b.importePagado || 0;
      var fraccionado = !!b.fraccionado;
      var pendiente = pagado ? 0 : (fraccionado ? precio - importePagado : precio);
      if(pendiente <= 0) return;
      if(!b.fechaValor) return;
      var f = new Date(b.fechaValor);
      if(isNaN(f.getTime())) return;
      var hoy = new Date(); hoy.setHours(0,0,0,0); f.setHours(0,0,0,0);
      var dias = Math.floor((hoy - f) / (1000*60*60*24));
      if(dias > 60) return;
      // Umbral según tipo: fraccionado 49d (semana 7), pago único 7d
      var umbral = fraccionado ? 49 : 7;
      if(dias < umbral) return;
      count++;
    });
    return count;
  }
  var nRetrasos = countRetrasos();

  // ══ RENDER ══
  return (<div>
    {/* Header */}
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
      <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>🔄 Renovaciones</h2>
      <div style={{ display: "flex", gap: 8, flexWrap:"wrap" }}>
        <button onClick={function(){setShowBl(true);}} style={{ padding: "8px 12px", background: "transparent", border: "1px solid " + T.border, borderRadius: 9, color: T.text2, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
          🚫 Ignorados ({blacklist.length})
        </button>
        <label style={{ padding: "8px 16px", background: "linear-gradient(135deg,#394265,#4a5580)", border: "none", borderRadius: 9, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          📤 Cuotas<input type="file" accept=".xls,.xlsx" onChange={importCuotas} style={{ display: "none" }} />
        </label>
        <label style={{ padding: "8px 16px", background: "linear-gradient(135deg,#2d4a5a,#3c6478)", border: "none", borderRadius: 9, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          📤 Reservas{reservasExcel.length>0?" ("+reservasExcel.length+")":""}<input type="file" accept=".xls,.xlsx" onChange={importReservas} style={{ display: "none" }} />
        </label>
      </div>
    </div>

    {/* Tabs Renovaciones / Retrasos */}
    <div style={{ display: "flex", gap: 6, marginBottom: 20, borderBottom: "1.5px solid " + T.border }}>
      <button onClick={function(){setTab("renovaciones");}} style={{
        padding: "10px 16px",
        border: "none",
        borderBottom: tab === "renovaciones" ? "3px solid #394265" : "3px solid transparent",
        background: "transparent",
        color: tab === "renovaciones" ? T.text : T.text3,
        fontSize: 13, fontWeight: 700, cursor: "pointer",
        marginBottom: -1.5
      }}>📅 Esta semana</button>
      <button onClick={function(){setTab("retrasos");}} style={{
        padding: "10px 16px",
        border: "none",
        borderBottom: tab === "retrasos" ? "3px solid #dc2626" : "3px solid transparent",
        background: "transparent",
        color: tab === "retrasos" ? T.text : T.text3,
        fontSize: 13, fontWeight: 700, cursor: "pointer",
        marginBottom: -1.5,
        display: "flex", alignItems: "center", gap: 6
      }}>🚨 Retrasos {nRetrasos > 0 && <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 9, background: "#dc2626", color: "#fff", fontWeight: 800 }}>{nRetrasos}</span>}</button>
    </div>

    {/* Si tab=retrasos: render directo del componente RetrasosPago */}
    {tab === "retrasos" && <RetrasosPago theme={T} dk={dk} bonos={bonos} clients={clients} />}

    {/* Si tab=renovaciones: continúa con la vista normal */}
    {tab === "renovaciones" && <div>


    {/* Modal Lista Negra */}
    {showBl && <div onClick={function(){setShowBl(false);}} style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,padding:16}}>
      <div onClick={function(e){e.stopPropagation();}} style={{background:T.bg2,borderRadius:14,border:"1px solid "+T.border,padding:24,maxWidth:500,width:"100%",maxHeight:"80vh",overflow:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <h3 style={{margin:0,fontSize:18,fontWeight:800,color:T.text}}>🚫 Clientes ignorados</h3>
          <button onClick={function(){setShowBl(false);}} style={{background:"none",border:"none",color:T.text3,fontSize:20,cursor:"pointer"}}>✕</button>
        </div>
        <div style={{fontSize:12,color:T.text3,marginBottom:12}}>Estos clientes no aparecerán en Renovaciones ni se crearán desde el Excel. Útil para Gympass sin marcar, cuentas de prueba, etc.</div>
        <div style={{display:"flex",gap:6,marginBottom:14}}>
          <input
            type="text"
            value={blNew}
            onChange={function(e){setBlNew(e.target.value);}}
            placeholder="Nombre a ignorar (ej: Cristhina)"
            onKeyDown={function(e){
              if(e.key==="Enter"&&blNew.trim()){
                var nuevo=blacklist.concat([blNew.trim()]);
                saveBlacklist(nuevo);
                setBlNew("");
              }
            }}
            style={{flex:1,padding:"9px 12px",background:T.bg,border:"1px solid "+T.border,borderRadius:8,color:T.text,fontSize:13}}
          />
          <button onClick={function(){
            if(!blNew.trim())return;
            var nuevo=blacklist.concat([blNew.trim()]);
            saveBlacklist(nuevo);
            setBlNew("");
          }} style={{padding:"9px 16px",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",borderRadius:8,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Añadir</button>
        </div>
        {blacklist.length===0 && <div style={{textAlign:"center",padding:20,color:T.text3,fontSize:13}}>Lista vacía</div>}
        {blacklist.map(function(n,i){
          return <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:T.bg,borderRadius:8,marginBottom:6,border:"1px solid "+T.border}}>
            <span style={{fontSize:13,color:T.text}}>{n}</span>
            <button onClick={function(){
              var nuevo=blacklist.filter(function(_,idx){return idx!==i;});
              saveBlacklist(nuevo);
            }} style={{background:"none",border:"none",color:"#ef4444",fontSize:12,cursor:"pointer",fontWeight:700}}>Quitar</button>
          </div>;
        })}
      </div>
    </div>}

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
        if (isBaja) rowBg = dk ? "rgba(239,68,68,.13)" : "rgba(239,68,68,.13)";
        if (isPending) rowBg = dk ? "rgba(245,158,11,.16)" : "rgba(245,158,11,.16)";
        if (isRenovado) rowBg = dk ? "rgba(34,197,94,.18)" : "rgba(34,197,94,.18)";
        if (isMitad) rowBg = dk ? "rgba(99,102,241,.24)" : "rgba(99,102,241,.24)";
        if (isReserva) rowBg = dk ? "rgba(6,182,212,.16)" : "rgba(6,182,212,.16)";

        // Status color
        var stColor = isRenovado ? "#22c55e" : isReserva ? "#06b6d4" : isMitad ? "#6366f1" : isBaja ? "#ef4444" : "#f59e0b";
        var stBg = stColor + "12";
        var stBorder = stColor + "35";

        // Is this a "segundo pago" entry?
        var isSegundoPago = r.source === "segundo_pago";

        return <div key={i} style={{
          padding: "4px 12px", borderBottom: "1.5px solid " + (dk ? "rgba(255,255,255,.20)" : "rgba(0,0,0,.18)"),
          background: rowBg, opacity: isBaja ? 0.6 : 1
        }}>
          {/* Row: name + price + status */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>

            {/* Name + price */}
            <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{
                fontSize: 12, fontWeight: 700, color: T.text,
                textDecoration: isBaja ? "line-through" : "none",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flexShrink: 1, minWidth: 0
              }}>{r.nombre}</div>
              <span style={{ fontSize: 12, fontWeight: 900, color: stColor, whiteSpace: "nowrap", flexShrink: 0 }}>{isSegundoPago ? Math.round(r.precio / 2) + "€" : isMitad ? Math.round(r.importePagado || r.precio / 2) + "€ pag." : isReserva ? (r.importePagado||0) + "€ res." : (r.deudaReal && r.deudaReal < r.precio) ? Math.round(r.deudaReal) + "€" : r.precio + "€"}</span>
              {r.fraccionado && r.importePagado > 0 && !isRenovado && !isMitad && !isReserva && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "#6366f115", color: "#6366f1", fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>💰 {Math.round(r.importePagado)}€/{r.precio}€</span>}
              {r.source === "calculado" && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "#f59e0b15", color: "#f59e0b", fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>sin bono nuevo</span>}
              {isSegundoPago && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "#6366f115", color: "#6366f1", fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>2º pago</span>}
              {isMitad && !isSegundoPago && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "#6366f115", color: "#6366f1", fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>💰 Fraccionado</span>}
              {isReserva && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "#06b6d415", color: "#06b6d4", fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>🔒 Reserva</span>}
              {r.source === "pago_restante" && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "#06b6d415", color: "#06b6d4", fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>💰 Pago restante</span>}
              {r.source === "agotado" && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "#ef444415", color: "#ef4444", fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>⚡ {r.sesiones.usadas + r.sesiones.caducadas}/{r.sesiones.total}</span>}
              {r.source === "agotado_excel" && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "#ef444415", color: "#ef4444", fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>⚡ Agotado</span>}
              {r.source === "ultima_sesion" && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "#f59e0b15", color: "#f59e0b", fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>⚠️ {r.sesiones.restantes}/{r.sesiones.total}</span>}
              {r.source === "arrastre_impago" && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "#ef444415", color: "#ef4444", fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>⚠️ Impago {r.originalWeek}</span>}
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
                padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 800,
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
                width: 22, height: 22, borderRadius: 5,
                border: data.avisado ? "1px solid #3b82f6" : "1px solid " + T.border2,
                background: data.avisado ? "#3b82f615" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", fontSize: 10, color: data.avisado ? "#3b82f6" : T.text3,
                padding: 0, flexShrink: 0
              }}>{data.avisado ? "✓" : "📢"}</button>

            {/* Move to another week */}
            <button onClick={function () { setMoveClient(r); setMoveTarget(""); }}
              title="Mover a otra semana"
              style={{
                width: 22, height: 22, borderRadius: 5,
                border: "1px solid " + T.border2,
                background: "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", fontSize: 10, color: T.text3,
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
            // Mover NO es un segundoPago: es una renovación aplazada manualmente.
            // Usamos "movido: true" para diferenciarlo y que mantenga el precio completo.
            n[tk] = Object.assign({}, n[tk] || {}, { notas: "Movido desde " + fromKey, movido: true, clientName: moveClient.nombre });
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

    </div>}{/* /tab renovaciones */}
  </div>);
}
