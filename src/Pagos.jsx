import { useState, useEffect } from "react";

var METODOS = {
  "credit_card": { label: "Tarjeta", icon: "💳", color: "#3b82f6" },
  "debit": { label: "Débito", icon: "💳", color: "#06b6d4" },
  "inapp": { label: "In-App", icon: "📱", color: "#8b5cf6" },
  "deposit": { label: "Transferencia", icon: "🏦", color: "#22c55e" },
  "cash": { label: "Efectivo", icon: "💵", color: "#f59e0b" },
  "installment": { label: "Fraccionado", icon: "💰", color: "#6366f1" },
  "sin método": { label: "Sin método", icon: "❓", color: "#64748b" },
  "desconocido": { label: "Desconocido", icon: "❓", color: "#64748b" }
};

function localKey(d) {
  var dd = new Date(d);
  return dd.getFullYear() + "-" + (dd.getMonth() + 1 < 10 ? "0" : "") + (dd.getMonth() + 1) + "-" + (dd.getDate() < 10 ? "0" : "") + dd.getDate();
}

function fmtDate(d) {
  try { return new Date(d).toLocaleDateString("es-ES", { day: "numeric", month: "short" }); }
  catch (e) { return ""; }
}

export default function Pagos(props) {
  var T = props.theme;
  var dk = props.dk;
  var bonos = props.bonos || [];
  var clients = props.clients || [];

  var _ = useState;
  var filtro_ = _("todos"), filtro = filtro_[0], setFiltro = filtro_[1];
  var buscar_ = _(""), buscar = buscar_[0], setBuscar = buscar_[1];
  var buscarMig_ = _(""), buscarMig = buscarMig_[0], setBuscarMig = buscarMig_[1];

  // Build pending payments list from bonos
  var pendientes = [];
  var pagados = [];

  // Group by subscription to get unique clients
  var seen = {};
  bonos.forEach(function (b) {
    // Only training bonos (exclude fisio, nutri, etc)
    var caption = (b.tipoBono || b.concepto || "").toLowerCase();
    var isEntrenamiento = caption.includes("time") || caption.includes("partner") ||
      caption.includes("pro") || caption.includes("bono") ||
      caption.includes("sesion") || caption.includes("dual");
    if (!isEntrenamiento) return;

    var key = b.nombre + "__" + (b.fechaValor || "");
    if (seen[key]) return;
    seen[key] = true;

    var precio = b.precio || b.total || 0;
    var pagado = !!b.pagado;
    var metodo = b.formaPago || "sin método";
    var importePagado = b.importePagado || 0;
    var fraccionado = !!b.fraccionado;
    var pendiente = pagado ? 0 : (fraccionado ? precio - importePagado : precio);

    // Match CRM client for extra info
    var crmClient = clients.find(function (cl) {
      var cn = (cl.name || "").toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      var bn = b.nombre.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (cn === bn) return true;
      var wa = cn.split(" "), wb = bn.split(" ");
      if (wa.length >= 2 && wb.length >= 2 && wa[0] === wb[0] && wa[1] === wb[1]) return true;
      return false;
    });

    var entry = {
      nombre: b.nombre,
      bono: b.tipoBono || b.concepto || "",
      precio: precio,
      pagado: pagado,
      metodo: metodo,
      importePagado: importePagado,
      fraccionado: fraccionado,
      pendiente: pendiente,
      fechaValor: b.fechaValor || "",
      phone: crmClient ? (crmClient.timpPhone || crmClient.phone || "") : "",
      email: crmClient ? (crmClient.timpEmail || "") : ""
    };

    if (pagado) {
      pagados.push(entry);
    } else if (pendiente > 0) {
      pendientes.push(entry);
    }
  });

  // Sort by amount descending
  pendientes.sort(function (a, b) { return b.pendiente - a.pendiente; });
  pagados.sort(function (a, b) { return b.precio - a.precio; });

  // Filter
  var filtered = pendientes;
  if (filtro !== "todos") {
    filtered = filtered.filter(function (p) { return p.metodo === filtro; });
  }
  if (buscar) {
    var q = buscar.toLowerCase();
    filtered = filtered.filter(function (p) { return p.nombre.toLowerCase().includes(q); });
  }

  // Totals
  var totalDeuda = pendientes.reduce(function (s, p) { return s + p.pendiente; }, 0);
  var totalFiltered = filtered.reduce(function (s, p) { return s + p.pendiente; }, 0);

  // Count by method
  var byMethod = {};
  pendientes.forEach(function (p) {
    var m = p.metodo;
    if (!byMethod[m]) byMethod[m] = { count: 0, total: 0 };
    byMethod[m].count++;
    byMethod[m].total += p.pendiente;
  });

  // ═══ ALL ACTIVE CLIENTS WITH LAST PAYMENT METHOD (for In-App migration) ═══
  var clientMethodMap = {};
  // Get latest payment method per client from all bonos
  bonos.forEach(function (b) {
    var caption = (b.tipoBono || b.concepto || "").toLowerCase();
    var isEntrenamiento = caption.includes("time") || caption.includes("partner") ||
      caption.includes("pro") || caption.includes("bono") ||
      caption.includes("sesion") || caption.includes("dual");
    if (!isEntrenamiento) return;
    var nombre = b.nombre;
    if (!nombre) return;
    var metodo = b.formaPago || "sin método";
    var fv = b.fechaValor || "";
    // Keep the most recent one
    if (!clientMethodMap[nombre] || fv > clientMethodMap[nombre].fechaValor) {
      clientMethodMap[nombre] = { nombre: nombre, metodo: metodo, bono: b.tipoBono || b.concepto || "", fechaValor: fv };
    }
  });
  var allClients = Object.values(clientMethodMap).sort(function (a, b) {
    // In-app first (green), then others (orange)
    var aInapp = a.metodo === "inapp" ? 0 : 1;
    var bInapp = b.metodo === "inapp" ? 0 : 1;
    if (aInapp !== bInapp) return aInapp - bInapp;
    return a.nombre.localeCompare(b.nombre);
  });
  var inappCount = allClients.filter(function (c) { return c.metodo === "inapp"; }).length;
  var filteredMig = allClients;
  if (buscarMig) {
    var qm = buscarMig.toLowerCase();
    filteredMig = allClients.filter(function (c) { return c.nombre.toLowerCase().includes(qm); });
  }

  var metodoInfo = function (m) { return METODOS[m] || METODOS["desconocido"]; };

  return (<div>
    {/* Header */}
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 10 }}>
      <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>💰 Pagos Pendientes</h2>
      <div style={{ fontSize: 14, color: T.text3 }}>{pendientes.length} clientes</div>
    </div>

    {/* Total card */}
    <div style={{
      background: dk ? "linear-gradient(135deg,#1a1020,#141820)" : "linear-gradient(135deg,#fef2f2,#fff)",
      borderRadius: 16, padding: "24px 28px", marginBottom: 24,
      border: "1px solid " + (dk ? "#ef444420" : "#fecaca"), display: "flex",
      alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16
    }}>
      <div>
        <div style={{ fontSize: 11, color: T.text3, fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Deuda total</div>
        <div style={{ fontSize: 36, fontWeight: 900, color: "#ef4444" }}>{Math.round(totalDeuda).toLocaleString("es-ES")}€</div>
        <div style={{ fontSize: 12, color: T.text3, marginTop: 4 }}>{pendientes.length} pagos pendientes</div>
      </div>
      {filtro !== "todos" && <div>
        <div style={{ fontSize: 11, color: T.text3, fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Filtrado</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: metodoInfo(filtro).color }}>{Math.round(totalFiltered).toLocaleString("es-ES")}€</div>
        <div style={{ fontSize: 12, color: T.text3 }}>{filtered.length} pagos</div>
      </div>}
    </div>

    {/* Method filters */}
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
      <button onClick={function () { setFiltro("todos"); }} style={{
        padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer",
        border: filtro === "todos" ? "2px solid " + T.navy : "1px solid " + T.border,
        background: filtro === "todos" ? T.navy + "15" : "transparent",
        color: filtro === "todos" ? T.navy : T.text3
      }}>Todos ({pendientes.length})</button>
      {Object.keys(byMethod).map(function (m) {
        var info = metodoInfo(m);
        return <button key={m} onClick={function () { setFiltro(m); }} style={{
          padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer",
          border: filtro === m ? "2px solid " + info.color : "1px solid " + T.border,
          background: filtro === m ? info.color + "15" : "transparent",
          color: filtro === m ? info.color : T.text3,
          display: "flex", alignItems: "center", gap: 4
        }}>{info.icon} {info.label} ({byMethod[m].count})</button>;
      })}
    </div>

    {/* Search */}
    <div style={{ marginBottom: 16 }}>
      <input value={buscar} onChange={function (e) { setBuscar(e.target.value); }}
        placeholder="🔍 Buscar cliente..."
        style={{
          width: "100%", maxWidth: 400, padding: "10px 14px",
          background: T.bg3, border: "1px solid " + T.border2, borderRadius: 10,
          color: T.text, fontSize: 13, outline: "none", boxSizing: "border-box"
        }} />
    </div>

    {/* Client list */}
    <div style={{ background: T.bg2, borderRadius: 14, border: "1px solid " + T.border, overflow: "hidden" }}>
      {filtered.length === 0 && <div style={{ padding: 40, textAlign: "center", color: T.text3 }}>
        <div style={{ fontSize: 30, opacity: 0.3, marginBottom: 8 }}>💰</div>
        {buscar ? "Sin resultados" : "Sin pagos pendientes"}
      </div>}

      {filtered.map(function (p, i) {
        var info = metodoInfo(p.metodo);

        return <div key={i} style={{
          padding: "16px 20px", borderBottom: "1px solid " + T.border,
          display: "flex", alignItems: "center", gap: 12
        }}>
          {/* Name + bono */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{p.nombre}</span>
              <span style={{ fontSize: 18, fontWeight: 900, color: "#ef4444" }}>{Math.round(p.pendiente)}€</span>
              {p.fraccionado && <span style={{
                fontSize: 9, padding: "2px 6px", borderRadius: 4,
                background: "#6366f115", color: "#6366f1", fontWeight: 700
              }}>💰 Fraccionado ({Math.round(p.importePagado)}€ pagado)</span>}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 4, fontSize: 11, color: T.text3, flexWrap: "wrap" }}>
              <span>{p.bono}</span>
              {p.fechaValor && <span>📅 {fmtDate(p.fechaValor)}</span>}
              {p.phone && <span>📱 {p.phone}</span>}
            </div>
          </div>

          {/* Payment method */}
          <div style={{
            padding: "8px 14px", borderRadius: 10,
            background: info.color + "12", border: "1px solid " + info.color + "30",
            display: "flex", alignItems: "center", gap: 6, flexShrink: 0
          }}>
            <span style={{ fontSize: 14 }}>{info.icon}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: info.color }}>{info.label}</span>
          </div>
        </div>;
      })}
    </div>

    {/* Recently paid section */}
    {pagados.length > 0 && <div style={{ marginTop: 24 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: T.text3, marginBottom: 12 }}>✅ Pagados recientemente ({pagados.length})</h3>
      <div style={{ background: T.bg2, borderRadius: 14, border: "1px solid " + T.border, overflow: "hidden", opacity: 0.6 }}>
        {pagados.slice(0, 10).map(function (p, i) {
          var info = metodoInfo(p.metodo);
          return <div key={i} style={{
            padding: "12px 20px", borderBottom: "1px solid " + T.border,
            display: "flex", alignItems: "center", gap: 12
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{p.nombre}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#22c55e", marginLeft: 8 }}>{p.precio}€ ✓</span>
            </div>
            <div style={{
              padding: "4px 10px", borderRadius: 8,
              background: info.color + "10", fontSize: 11, fontWeight: 600, color: info.color
            }}>{info.icon} {info.label}</div>
          </div>;
        })}
      </div>
    </div>}

    {/* ═══ IN-APP MIGRATION TRACKER ═══ */}
    {allClients.length > 0 && <div style={{ marginTop: 30 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: T.text, margin: 0 }}>📱 Migración a In-App</h3>
        <div style={{ fontSize: 13, color: T.text3 }}>
          <span style={{ color: "#22c55e", fontWeight: 700 }}>{inappCount}</span> / {allClients.length} clientes
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        background: T.bg2, borderRadius: 14, border: "1px solid " + T.border,
        padding: "16px 20px", marginBottom: 16
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 8 }}>
          <span style={{ color: "#22c55e", fontWeight: 700 }}>📱 In-App: {inappCount}</span>
          <span style={{ color: "#f59e0b", fontWeight: 700 }}>⚠️ Otros: {allClients.length - inappCount}</span>
        </div>
        <div style={{ background: T.border, borderRadius: 8, height: 12, overflow: "hidden" }}>
          <div style={{ width: (allClients.length > 0 ? Math.round((inappCount / allClients.length) * 100) : 0) + "%", height: "100%", background: "linear-gradient(90deg, #22c55e, #16a34a)", borderRadius: 8, transition: "width .3s" }}></div>
        </div>
        <div style={{ textAlign: "center", marginTop: 6, fontSize: 20, fontWeight: 900, color: "#22c55e" }}>
          {allClients.length > 0 ? Math.round((inappCount / allClients.length) * 100) : 0}%
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 12 }}>
        <input value={buscarMig} onChange={function (e) { setBuscarMig(e.target.value); }}
          placeholder="🔍 Buscar cliente..."
          style={{
            width: "100%", maxWidth: 400, padding: "10px 14px",
            background: T.bg3, border: "1px solid " + T.border2, borderRadius: 10,
            color: T.text, fontSize: 13, outline: "none", boxSizing: "border-box"
          }} />
      </div>

      {/* Client list */}
      <div style={{ background: T.bg2, borderRadius: 14, border: "1px solid " + T.border, overflow: "hidden" }}>
        {filteredMig.map(function (c, i) {
          var isInapp = c.metodo === "inapp";
          return <div key={i} style={{
            padding: "12px 20px", borderBottom: "1px solid " + T.border,
            display: "flex", alignItems: "center", gap: 12,
            background: isInapp ? (dk ? "rgba(34,197,94,.04)" : "#f0fdf4") : "transparent"
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: isInapp ? "#22c55e15" : "#f59e0b15",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, color: isInapp ? "#22c55e" : "#f59e0b"
            }}>{isInapp ? "✓" : "⚠️"}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{c.nombre}</span>
              <span style={{ fontSize: 11, color: T.text3, marginLeft: 8 }}>{c.bono}</span>
            </div>
            <div style={{
              padding: "6px 12px", borderRadius: 8,
              background: isInapp ? "#22c55e12" : "#f59e0b12",
              border: "1px solid " + (isInapp ? "#22c55e30" : "#f59e0b30"),
              fontSize: 12, fontWeight: 700,
              color: isInapp ? "#22c55e" : "#f59e0b"
            }}>{isInapp ? "📱 In-App" : (metodoInfo(c.metodo).icon + " " + metodoInfo(c.metodo).label)}</div>
          </div>;
        })}
      </div>
    </div>}
  </div>);
}
