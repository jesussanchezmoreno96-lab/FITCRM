// ════════════════════════════════════════════════════════════════════════
//  api/whatsapp-renovaciones.js  (v2)
//
//  Bot diario de WhatsApp para Time2Train.
//  Lee la lista de renovaciones YA CALCULADA por el CRM (persistida en
//  Supabase clave 'bonos_timp.renovaciones_persisted') y compone el
//  mensaje del día siguiente.
//
//  Lógica: el cálculo de "qué cliente está en qué semana" lo hace el
//  CRM en Renovaciones.jsx (con todo su cruce Excel + TIMP + filtros).
//  Aquí solo aplicamos los filtros adicionales del aviso:
//    · Cliente tiene clase reservada en TIMP para mañana.
//    · A COBRAR: renueva esta semana, estado pendiente | reserva (>7d) | mitad (día 42).
//    · A AVISAR: renueva la semana siguiente, pendiente, sin avisado:true.
//
//  Variables de entorno (Vercel):
//    · CALLMEBOT_PHONE
//    · CALLMEBOT_APIKEY
//    · WHATSAPP_CRON_SECRET
//
//  Modo prueba: ?dry_run=1 → devuelve JSON sin enviar.
// ════════════════════════════════════════════════════════════════════════

const TIMP_CENTER = "ebb9a2c0-782e-4d77-b5eb-17d18a1f8949";
const SUPA_URL_DEFAULT = "https://yvzearwbwwthquekqnnk.supabase.co";
const SUPA_KEY_DEFAULT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2emVhcndid3d0aHF1ZWtxbm5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMTMwNTMsImV4cCI6MjA5MDg4OTA1M30.1BhalulMlEJ3am_D0e8Y3rRyM_qz0VR4_34VNV76FNE";

const MONTHS_ES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const MONTHS_ES_SHORT = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const DAYS_ES = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];

// Si la persistencia tiene más de N horas, alertar (datos potencialmente obsoletos).
const STALE_HOURS = 36;

// ─── Helpers de fecha (Madrid) ─────────────────────────────────────────
function nowMadrid() {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false
  });
  const parts = fmt.formatToParts(new Date());
  const get = k => parts.find(p => p.type === k).value;
  return new Date(+get("year"), +get("month")-1, +get("day"), +get("hour"), +get("minute"), +get("second"));
}
function localKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function getMonday(d) {
  const x = new Date(d); x.setHours(0,0,0,0);
  const day = x.getDay();
  x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day));
  return x;
}
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate()+n); return x; }
function diffDays(a, b) {
  const a2 = new Date(a); a2.setHours(0,0,0,0);
  const b2 = new Date(b); b2.setHours(0,0,0,0);
  return Math.floor((a2.getTime() - b2.getTime()) / 86400000);
}
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function normName(s) {
  if (!s) return "";
  return String(s).toLowerCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

// ─── Supabase ──────────────────────────────────────────────────────────
async function supaGet(url, key, table) {
  const r = await fetch(`${url}/rest/v1/${table}?select=*`, {
    headers: { "apikey": key, "Authorization": `Bearer ${key}` }
  });
  if (!r.ok) throw new Error(`Supabase ${table}: ${r.status}`);
  return await r.json();
}

// ─── TIMP: admisiones de un día ────────────────────────────────────────
async function timpAdmissionsForDate(host, dateStr) {
  const proto = host.includes("localhost") ? "http" : "https";
  const base = `${proto}://${host}/api/timp`;
  const path = `branch_buildings/${TIMP_CENTER}/admissions%3Fdate_from=${dateStr}%26date_to=${dateStr}%26page=1`;
  const r1 = await fetch(`${base}?path=${path}`);
  if (!r1.ok) throw new Error(`TIMP admissions: ${r1.status}`);
  const d1 = await r1.json();
  let all = d1.collection || [];
  const totalPages = (d1.page_data && d1.page_data.total_pages) || 1;
  for (let p = 2; p <= totalPages; p++) {
    const pp = `branch_buildings/${TIMP_CENTER}/admissions%3Fdate_from=${dateStr}%26date_to=${dateStr}%26page=${p}`;
    const r = await fetch(`${base}?path=${pp}`);
    if (!r.ok) continue;
    const d = await r.json();
    if (d && d.collection) all = all.concat(d.collection);
  }
  return all;
}

function buildAttendingSet(admissions) {
  const set = new Set();
  for (const a of admissions) {
    const bookings = a.bookings || [];
    for (const b of bookings) {
      if (b.status === "valid" && b.full_name) {
        set.add(normName(b.full_name));
      }
    }
  }
  return set;
}

// ─── Lectura de la lista persistida ────────────────────────────────────
//
// Estructura esperada en bonos_timp.renovaciones_persisted:
// {
//   lastUpdate: "2026-05-03T14:30:00.000Z",
//   weeks: {
//     "2026-05-04": [
//       {
//         nombre: "Pablo Martínez",
//         tipo: "Time pro trimestral",
//         precio: 180,
//         fechaValor: "2026-02-04T00:00:00",  // ISO string
//         renewMonday: "2026-05-04",
//         pagado: false,
//         mitadPagada: false,
//         esReserva: false,
//         importePagado: 0,
//         source: "bono",        // "bono" | "segundo_pago" | "pago_restante" | "movido" | "arrastre_impago"
//         nextBooking: "...",
//         clientId: "...",
//         clientStatus: "activo"
//       },
//       ...
//     ],
//     ...
//   }
// }

// ─── Lógica de selección (igual que antes pero usando estado del CRM) ─
function decideListas({ persisted, renData, attendingSet, manana, semanaActualKey, semanaSiguienteKey }) {
  const cobrar = [];
  const avisar = [];

  const weeksData = (persisted && persisted.weeks) || {};
  const semanaActual = weeksData[semanaActualKey] || [];
  const semanaSiguiente = weeksData[semanaSiguienteKey] || [];

  // Helper para sacar el estado de un cliente en una semana concreta.
  function estadoEn(nombre, weekKey) {
    const k = `${nombre.toLowerCase().trim()}__${weekKey}`;
    const d = renData[k] || {};
    return {
      renovacion: d.renovacion || "pendiente",
      avisado: !!d.avisado,
      notas: d.notas || ""
    };
  }

  const yaIncluido = new Set();

  // ─── A COBRAR: clientes en la semana actual que vienen mañana ───
  for (const c of semanaActual) {
    if (!c || !c.nombre) continue;
    const nn = normName(c.nombre);
    if (yaIncluido.has(nn)) continue;
    if (!attendingSet.has(nn)) continue;

    const st = estadoEn(c.nombre, semanaActualKey);
    if (st.renovacion === "renovado" || st.renovacion === "baja" || c.pagado) continue;

    // El estado puede venir explícito en renData o auto-detectado del bono.
    const isReserva = st.renovacion === "reserva" || (c.esReserva && st.renovacion !== "baja");
    const isMitad = st.renovacion === "mitad" || (c.mitadPagada && !isReserva && st.renovacion !== "baja");
    const isPending = !isReserva && !isMitad && st.renovacion === "pendiente";

    if (isPending) {
      cobrar.push({
        nombre: c.nombre,
        tipo: c.tipo || "",
        precio: +c.precio || 0,
        motivo: "Pendiente"
      });
      yaIncluido.add(nn);
      continue;
    }

    if (isReserva) {
      const fv = c.fechaValor ? new Date(c.fechaValor) : null;
      if (!fv || isNaN(fv)) continue;
      const dias = diffDays(manana, fv);
      if (dias >= 7) {
        const importePagado = +c.importePagado || Math.round((+c.precio || 0) * 0.25);
        const restante = Math.max(0, (+c.precio || 0) - importePagado);
        cobrar.push({
          nombre: c.nombre,
          tipo: c.tipo || "",
          precio: restante,
          motivo: `Reserva (+${dias} días)`
        });
        yaIncluido.add(nn);
      }
      continue;
    }

    if (isMitad) {
      const fv = c.fechaValor ? new Date(c.fechaValor) : null;
      if (!fv || isNaN(fv)) continue;
      const dias = diffDays(manana, fv);
      if (dias === 42) {
        const restante = Math.round((+c.precio || 0) / 2);
        cobrar.push({
          nombre: c.nombre,
          tipo: c.tipo || "",
          precio: restante,
          motivo: "2º PAGO"
        });
        yaIncluido.add(nn);
      }
      continue;
    }
  }

  // ─── A AVISAR: clientes en la semana siguiente que vienen mañana ───
  for (const c of semanaSiguiente) {
    if (!c || !c.nombre) continue;
    const nn = normName(c.nombre);
    if (yaIncluido.has(nn)) continue;
    if (!attendingSet.has(nn)) continue;

    const st = estadoEn(c.nombre, semanaSiguienteKey);
    if (st.avisado) continue;
    if (st.renovacion !== "pendiente" || c.pagado) continue;

    avisar.push({
      nombre: c.nombre,
      tipo: c.tipo || ""
    });
    yaIncluido.add(nn);
  }

  return { cobrar, avisar };
}

// ─── Formato del mensaje ───────────────────────────────────────────────
function formatPrecio(p) {
  if (!p || isNaN(p)) return "";
  return `${Math.round(+p)}€`;
}
function formatFechaCabecera(d) {
  return `${capitalize(DAYS_ES[d.getDay()])} ${d.getDate()} ${MONTHS_ES[d.getMonth()]}`;
}
function formatSemanaCorta(monday) {
  return `${monday.getDate()} ${MONTHS_ES_SHORT[monday.getMonth()]}`;
}

function buildMessage({ manana, cobrar, avisar, semanaSiguienteMonday }) {
  const lines = [];
  lines.push(`🟦 *Time2Train · Renovaciones*`);
  lines.push(`*${formatFechaCabecera(manana)}*`);
  lines.push("");

  if (cobrar.length === 0 && avisar.length === 0) {
    lines.push("");
    lines.push("Hoy no hay renovaciones que cobrar ni avisar 👍");
    return lines.join("\n");
  }

  if (cobrar.length > 0) {
    lines.push("");
    lines.push("*💸 A COBRAR*");
    lines.push("");
    cobrar.forEach((c, i) => {
      lines.push(`${i + 1}. _${c.nombre}_`);
      const trozos = [];
      if (c.tipo) trozos.push(c.tipo);
      const p = formatPrecio(c.precio);
      if (p) trozos.push(p);
      if (c.motivo) trozos.push(c.motivo);
      lines.push(`   ${trozos.join(" · ")}`);
    });
  }

  if (avisar.length > 0) {
    lines.push("");
    lines.push("");
    lines.push("*🔔 AVISAR SEMANA QUE VIENE*");
    lines.push("");
    const idxStart = cobrar.length;
    avisar.forEach((a, i) => {
      lines.push(`${idxStart + i + 1}. _${a.nombre}_`);
      if (a.tipo) lines.push(`   ${a.tipo}`);
    });
  }

  return lines.join("\n");
}

// ─── CallMeBot ─────────────────────────────────────────────────────────
async function sendCallMeBot(phone, apikey, text) {
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(apikey)}`;
  const r = await fetch(url);
  const body = await r.text();
  return { ok: r.ok && !/error|too many|not found/i.test(body), status: r.status, body };
}

// ─── Handler ───────────────────────────────────────────────────────────
export default async function handler(req, res) {
  try {
    const secret = (req.query && req.query.secret) || "";
    const expected = process.env.WHATSAPP_CRON_SECRET;
    if (!expected) return res.status(500).json({ error: "Missing WHATSAPP_CRON_SECRET in env" });
    if (secret !== expected) return res.status(401).json({ error: "Unauthorized" });

    const dryRun = req.query && (req.query.dry_run === "1" || req.query.dry_run === "true");

    const phone = process.env.CALLMEBOT_PHONE;
    const apikey = process.env.CALLMEBOT_APIKEY;
    if (!dryRun && (!phone || !apikey)) {
      return res.status(500).json({ error: "Missing CALLMEBOT_PHONE or CALLMEBOT_APIKEY in env" });
    }

    const supaUrl = process.env.SUPABASE_URL || SUPA_URL_DEFAULT;
    const supaKey = process.env.SUPABASE_KEY || SUPA_KEY_DEFAULT;

    // ─── Calcular fechas ───
    const today = nowMadrid();
    const manana = addDays(today, 1);
    manana.setHours(0,0,0,0);
    const mananaStr = localKey(manana);
    const semanaActualMonday = getMonday(manana);
    const semanaSiguienteMonday = addDays(semanaActualMonday, 7);
    const semanaActualKey = localKey(semanaActualMonday);
    const semanaSiguienteKey = localKey(semanaSiguienteMonday);

    // ─── Leer Supabase ───
    const rows = await supaGet(supaUrl, supaKey, "bonos_timp");
    let renData = {};
    let persisted = null;
    for (const r of rows) {
      if (r.id === "renovacion_data") renData = r.data || {};
      else if (r.id === "renovaciones_persisted") persisted = r.data || null;
    }

    // ─── Validar persisted ───
    if (!persisted || !persisted.weeks) {
      const msg = "⚠️ La lista de renovaciones no está disponible. Abre el CRM en Renovaciones para que se actualice.";
      if (dryRun) {
        return res.status(200).json({
          ok: false, dry_run: true,
          error: "No persisted data",
          message: msg
        });
      }
      // En modo real, igualmente avisamos por WhatsApp para que sepas qué pasó.
      const send = await sendCallMeBot(phone, apikey, msg);
      return res.status(200).json({ ok: false, error: "No persisted data", callmebot: send });
    }

    // Comprobar antigüedad
    let staleWarning = null;
    if (persisted.lastUpdate) {
      const last = new Date(persisted.lastUpdate);
      const ageHours = (Date.now() - last.getTime()) / (1000*60*60);
      if (ageHours > STALE_HOURS) {
        staleWarning = `⚠️ Lista cacheada hace ${Math.round(ageHours)}h. Considera abrir el CRM para refrescar.`;
      }
    }

    // ─── Leer admisiones de mañana ───
    const host = req.headers.host;
    const admissions = await timpAdmissionsForDate(host, mananaStr);
    const attendingSet = buildAttendingSet(admissions);

    // ─── Decidir listas ───
    const { cobrar, avisar } = decideListas({
      persisted, renData, attendingSet, manana,
      semanaActualKey, semanaSiguienteKey
    });

    cobrar.sort((a, b) => normName(a.nombre).localeCompare(normName(b.nombre)));
    avisar.sort((a, b) => normName(a.nombre).localeCompare(normName(b.nombre)));

    let message = buildMessage({ manana, cobrar, avisar, semanaSiguienteMonday });
    if (staleWarning) message += `\n\n_${staleWarning}_`;

    if (dryRun) {
      return res.status(200).json({
        ok: true, dry_run: true,
        manana: mananaStr,
        semana_actual: semanaActualKey,
        semana_siguiente: semanaSiguienteKey,
        attending_count: attendingSet.size,
        cobrar_count: cobrar.length,
        avisar_count: avisar.length,
        cobrar: cobrar.map(c => ({ nombre: c.nombre, tipo: c.tipo, precio: c.precio, motivo: c.motivo })),
        avisar: avisar.map(a => ({ nombre: a.nombre, tipo: a.tipo })),
        last_update: persisted.lastUpdate || null,
        stale_warning: staleWarning,
        message
      });
    }

    const send = await sendCallMeBot(phone, apikey, message);
    return res.status(send.ok ? 200 : 502).json({
      ok: send.ok,
      manana: mananaStr,
      cobrar_count: cobrar.length,
      avisar_count: avisar.length,
      callmebot_status: send.status,
      callmebot_body: send.body.substring(0, 300),
      message
    });
  } catch (err) {
    console.error("[whatsapp-renovaciones] error:", err);
    return res.status(500).json({ error: err.message || String(err) });
  }
}
