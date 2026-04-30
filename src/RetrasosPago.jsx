import { useState } from "react";

// ════════════════════════════════════════════════════════════════════════
//  RETRASOS DE PAGO — sección nueva del CRM
//  Detecta clientes que compraron bono hace >7 días, ≤30 días, y siguen
//  sin pagarlo (o sin liquidar el fraccionado). Casos puntuales que se
//  escapan y hay que rastrear.
// ════════════════════════════════════════════════════════════════════════

export default function RetrasosPago(props) {
  var T = props.theme;
  var dk = props.dk;
  var bonos = props.bonos || [];
  var clients = props.clients || [];

  var _ = useState;
  var buscar_ = _(""), buscar = buscar_[0], setBuscar = buscar_[1];
  var rangoDias_ = _(60), rangoDias = rangoDias_[0], setRangoDias = rangoDias_[1];

  // Helper: días desde una fecha hasta hoy
  function diasDesde(fechaStr) {
    if (!fechaStr) return -1;
    var f = new Date(fechaStr);
    if (isNaN(f.getTime())) return -1;
    var hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    f.setHours(0, 0, 0, 0);
    var diff = (hoy - f) / (1000 * 60 * 60 * 24);
    return Math.floor(diff);
  }

  // Helper: match nombre normalizado
  function matchesName(a, b) {
    var na = (a || "").toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    var nb = (b || "").toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (!na || !nb) return false;
    if (na === nb) return true;
    var wa = na.split(" "), wb = nb.split(" ");
    if (wa.length < 2 || wb.length < 2) return false;
    return wa[0] === wb[0] && wa[1] === wb[1];
  }

  // Construir lista de retrasos
  var retrasos = [];
  var seen = {};
  bonos.forEach(function (b) {
    // Solo bonos de entrenamiento
    var caption = (b.tipoBono || b.concepto || "").toLowerCase();
    var isEntrenamiento = caption.indexOf("time") >= 0 || caption.indexOf("partner") >= 0 ||
      caption.indexOf("pro") >= 0 || caption.indexOf("bono") >= 0 ||
      caption.indexOf("sesion") >= 0 || caption.indexOf("dual") >= 0;
    if (!isEntrenamiento) return;

    var key = b.nombre + "__" + (b.fechaValor || "");
    if (seen[key]) return;
    seen[key] = true;

    var precio = +b.precio || +b.total || 0;
    var pagado = !!b.pagado;
    var importePagado = +b.importePagado || 0;
    var fraccionado = !!b.fraccionado;
    var pendiente = pagado ? 0 : (fraccionado ? precio - importePagado : precio);

    // Si está pagado completo, no es retraso
    if (pendiente <= 0) return;

    // Calcular antigüedad
    var dias = diasDesde(b.fechaValor);
    if (dias > rangoDias) return;  // fuera del rango (default 30 días)

    // Umbral según tipo de bono:
    //   - Fraccionado: a partir del día 49 (= 7 semanas, después de que tocara el 2º pago)
    //   - Pago único: a partir del día 7
    var umbralDias = fraccionado ? 49 : 7;
    if (dias < umbralDias) return;

    // Para FRACCIONADOS: el segundo pago se hace a las 6 semanas (~42 días).
    // Antes de la semana 6 NO es retraso, está dentro del plazo del fraccionado.
    if (fraccionado && dias < 42) return;

    // Match cliente CRM para teléfono/email
    var crmClient = clients.find(function (cl) {
      return matchesName(cl.name, b.nombre);
    });

    retrasos.push({
      nombre: b.nombre,
      bono: b.tipoBono || b.concepto || "",
      precio: precio,
      importePagado: importePagado,
      pendiente: pendiente,
      fraccionado: fraccionado,
      fechaValor: b.fechaValor || "",
      dias: dias,
      phone: crmClient ? (crmClient.timpPhone || crmClient.phone || "") : "",
      email: crmClient ? (crmClient.timpEmail || "") : "",
      status: crmClient ? (crmClient.status || "activo") : "activo"
    });
  });

  // Ordenar de más antiguo a más reciente
  retrasos.sort(function (a, b) { return b.dias - a.dias; });

  // Filtro buscador
  var filtrados = buscar
    ? retrasos.filter(function (r) { return (r.nombre || "").toLowerCase().indexOf(buscar.toLowerCase()) >= 0; })
    : retrasos;

  // Totales
  var totalPendiente = filtrados.reduce(function (sum, r) { return sum + r.pendiente; }, 0);

  return (<div style={{ padding: 24 }}>

    {/* Header */}
    <div style={{ marginBottom: 24 }}>
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: T.text }}>🚨 Retrasos de pago</h1>
      <p style={{ margin: "4px 0 0", fontSize: 13, color: T.text3 }}>Bonos sin pagar fuera de plazo (fraccionados a partir de la semana 6)</p>
    </div>

    {/* Tarjetas resumen */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
      <div style={{ padding: 16, background: dk ? "rgba(239,68,68,.12)" : "#fef2f2", border: "1px solid " + (dk ? "rgba(239,68,68,.3)" : "#fecaca"), borderRadius: 10 }}>
        <div style={{ fontSize: 11, color: T.text3, fontWeight: 700, textTransform: "uppercase" }}>Total pendiente</div>
        <div style={{ fontSize: 26, fontWeight: 900, color: "#dc2626", marginTop: 4 }}>{totalPendiente.toFixed(0)}€</div>
      </div>
      <div style={{ padding: 16, background: dk ? "rgba(245,158,11,.12)" : "#fffbeb", border: "1px solid " + (dk ? "rgba(245,158,11,.3)" : "#fde68a"), borderRadius: 10 }}>
        <div style={{ fontSize: 11, color: T.text3, fontWeight: 700, textTransform: "uppercase" }}>Clientes en retraso</div>
        <div style={{ fontSize: 26, fontWeight: 900, color: "#b45309", marginTop: 4 }}>{filtrados.length}</div>
      </div>
      <div style={{ padding: 16, background: dk ? "rgba(99,102,241,.12)" : "#eef2ff", border: "1px solid " + (dk ? "rgba(99,102,241,.3)" : "#c7d2fe"), borderRadius: 10 }}>
        <div style={{ fontSize: 11, color: T.text3, fontWeight: 700, textTransform: "uppercase" }}>Más antiguo</div>
        <div style={{ fontSize: 26, fontWeight: 900, color: "#4338ca", marginTop: 4 }}>{filtrados[0] ? filtrados[0].dias + " días" : "—"}</div>
      </div>
    </div>

    {/* Buscador + selector rango */}
    <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
      <input
        type="text"
        placeholder="🔍 Buscar cliente..."
        value={buscar}
        onChange={function (e) { setBuscar(e.target.value); }}
        style={{ flex: 1, minWidth: 200, padding: "10px 14px", borderRadius: 9, border: "1px solid " + T.border, background: T.bg, color: T.text, fontSize: 13, outline: "none" }}
      />
      <select
        value={rangoDias}
        onChange={function (e) { setRangoDias(+e.target.value); }}
        style={{ padding: "10px 14px", borderRadius: 9, border: "1px solid " + T.border, background: T.bg, color: T.text, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
      >
        <option value={14}>Últimos 14 días</option>
        <option value={30}>Últimos 30 días</option>
        <option value={60}>Últimos 60 días</option>
        <option value={90}>Últimos 90 días</option>
      </select>
    </div>

    {/* Lista de retrasos */}
    {filtrados.length === 0 && (
      <div style={{ padding: 40, textAlign: "center", background: T.bg, borderRadius: 10, border: "1px solid " + T.border, color: T.text3, fontSize: 14 }}>
        ✅ No hay retrasos de pago en este rango. ¡Todo al día!
      </div>
    )}

    {filtrados.length > 0 && (
      <div style={{ background: T.bg, borderRadius: 10, border: "1px solid " + T.border, overflow: "hidden" }}>
        {filtrados.map(function (r, i) {
          var stColor = r.dias > 21 ? "#dc2626" : (r.dias > 14 ? "#ea580c" : "#b45309");
          var stBg = r.dias > 21 ? "rgba(239,68,68,.10)" : (r.dias > 14 ? "rgba(234,88,12,.08)" : "rgba(245,158,11,.06)");
          return (<div key={i} style={{
            padding: "10px 14px",
            borderBottom: i < filtrados.length - 1 ? "1.5px solid " + (dk ? "rgba(255,255,255,.20)" : "rgba(0,0,0,.18)") : "none",
            background: stBg,
            display: "flex",
            alignItems: "center",
            gap: 10
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{r.nombre}</span>
                <span style={{ fontSize: 13, fontWeight: 900, color: stColor }}>{r.pendiente.toFixed(0)}€</span>
                {r.fraccionado && <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, background: "#6366f120", color: "#6366f1", fontWeight: 700 }}>💰 Fraccionado · pagado {r.importePagado.toFixed(0)}€/{r.precio.toFixed(0)}€</span>}
                <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, background: stColor + "20", color: stColor, fontWeight: 700 }}>⏱ {r.dias} días</span>
                {r.status === "baja" && <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, background: "#9ca3af20", color: "#6b7280", fontWeight: 700 }}>BAJA</span>}
              </div>
              <div style={{ fontSize: 11, color: T.text3, marginTop: 2 }}>
                {r.bono} · desde {r.fechaValor ? new Date(r.fechaValor).toLocaleDateString("es-ES") : "?"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              {r.phone && <a href={"tel:" + r.phone} title={"Llamar a " + r.phone} style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid " + T.border2, background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", fontSize: 12 }}>📞</a>}
              {r.email && <a href={"mailto:" + r.email} title={"Email a " + r.email} style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid " + T.border2, background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", fontSize: 12 }}>✉️</a>}
              {r.phone && <a href={"https://wa.me/34" + r.phone.replace(/\D/g, "")} target="_blank" rel="noreferrer" title="WhatsApp" style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid " + T.border2, background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", fontSize: 12 }}>💬</a>}
            </div>
          </div>);
        })}
      </div>
    )}

    {/* Nota explicativa */}
    <div style={{ marginTop: 16, padding: 12, background: dk ? "rgba(59,130,246,.06)" : "#eff6ff", border: "1px solid " + (dk ? "rgba(59,130,246,.2)" : "#bfdbfe"), borderRadius: 8, fontSize: 11, color: T.text3, lineHeight: 1.5 }}>
      💡 <b>Cómo funciona</b>: detecta bonos sin pagar. Los <b>de pago único</b> aparecen como retraso desde el día 7. Los <b>fraccionados</b> solo aparecen si pasa la <b>semana 7 (día 49)</b> sin haberse cobrado el 2º pago — antes están dentro de su periodo válido. Para que un retraso desaparezca, márcalo como pagado en TIMP y refresca el CRM.
    </div>

  </div>);
}
