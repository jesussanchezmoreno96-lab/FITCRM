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

// Devuelve un Map nombre_normalizado → hora más temprana del día (0-23).
// Si un cliente tiene varias clases, usa la más temprana (la de mañana
// gana sobre la de tarde para el envío del aviso).
function buildAttendingMap(admissions) {
  const map = new Map();
  for (const a of admissions) {
    // starting_at viene en UTC, formato "2026-05-04T08:00:00.000Z".
    // Convertimos a hora Madrid mirando el offset.
    let hour = null;
    if (a.starting_at) {
      try {
        const d = new Date(a.starting_at);
        // Usar Intl para obtener la hora en Europe/Madrid sin importar
        // el offset del servidor (Vercel corre en UTC).
        const fmt = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Europe/Madrid",
          hour: "2-digit", hour12: false
        });
        const parts = fmt.formatToParts(d);
        const h = parts.find(p => p.type === "hour");
        if (h) hour = parseInt(h.value, 10);
      } catch (e) { /* ignorar */ }
    }
    if (hour === null) continue;

    const bookings = a.bookings || [];
    for (const b of bookings) {
      if (b.status === "valid" && b.full_name) {
        const key = normName(b.full_name);
        const prev = map.get(key);
        // Quedarse con la hora más temprana
        if (prev === undefined || hour < prev) map.set(key, hour);
      }
    }
  }
  return map;
}

// Helper: dada la hora de la primera clase, ¿es turno de mañana o tarde?
// Mañana: 7:00 - 13:59 (incluye clase de 13:00 que termina a las 14:00).
// Tarde: 14:00 - 22:00.
function turnoDe(hora) {
  if (hora === null || hora === undefined) return null;
  return hora < 14 ? "mañana" : "tarde";
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
function decideListas({ persisted, renData, attendingMap, manana, semanaActualKey, semanaSiguienteKey }) {
  const cobrarMan = [];
  const cobrarTar = [];
  const avisarMan = [];
  const avisarTar = [];

  const weeksData = (persisted && persisted.weeks) || {};
  const semanaActual = weeksData[semanaActualKey] || [];
  const semanaSiguiente = weeksData[semanaSiguienteKey] || [];

  function estadoEn(nombre, weekKey) {
    const k = `${nombre.toLowerCase().trim()}__${weekKey}`;
    const d = renData[k] || {};
    return {
      renovacion: d.renovacion || "pendiente",
      avisado: !!d.avisado,
      notas: d.notas || ""
    };
  }

  // Ayuda: meter el cliente en la lista correcta según su turno.
  function pushCobrar(item, hora) {
    const t = turnoDe(hora);
    if (t === "mañana") cobrarMan.push(item);
    else if (t === "tarde") cobrarTar.push(item);
  }
  function pushAvisar(item, hora) {
    const t = turnoDe(hora);
    if (t === "mañana") avisarMan.push(item);
    else if (t === "tarde") avisarTar.push(item);
  }

  const yaIncluido = new Set();

  // ─── A COBRAR ───
  for (const c of semanaActual) {
    if (!c || !c.nombre) continue;
    const nn = normName(c.nombre);
    if (yaIncluido.has(nn)) continue;
    const hora = attendingMap.get(nn);
    if (hora === undefined) continue; // no viene mañana

    const st = estadoEn(c.nombre, semanaActualKey);
    if (st.renovacion === "renovado" || st.renovacion === "baja" || c.pagado) continue;

    const isReserva = st.renovacion === "reserva" || (c.esReserva && st.renovacion !== "baja");
    const isMitad = st.renovacion === "mitad" || (c.mitadPagada && !isReserva && st.renovacion !== "baja");
    const isPending = !isReserva && !isMitad && st.renovacion === "pendiente";

    if (isPending) {
      pushCobrar({
        nombre: c.nombre,
        tipo: c.tipo || "",
        precio: +c.precio || 0,
        motivo: "Pendiente"
      }, hora);
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
        pushCobrar({
          nombre: c.nombre,
          tipo: c.tipo || "",
          precio: restante,
          motivo: `Reserva (+${dias} días)`
        }, hora);
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
        pushCobrar({
          nombre: c.nombre,
          tipo: c.tipo || "",
          precio: restante,
          motivo: "2º PAGO"
        }, hora);
        yaIncluido.add(nn);
      }
      continue;
    }
  }

  // ─── A AVISAR ───
  for (const c of semanaSiguiente) {
    if (!c || !c.nombre) continue;
    const nn = normName(c.nombre);
    if (yaIncluido.has(nn)) continue;
    const hora = attendingMap.get(nn);
    if (hora === undefined) continue;

    const st = estadoEn(c.nombre, semanaSiguienteKey);
    if (st.avisado) continue;
    if (st.renovacion !== "pendiente" || c.pagado) continue;

    pushAvisar({
      nombre: c.nombre,
      tipo: c.tipo || ""
    }, hora);
    yaIncluido.add(nn);
  }

  return { cobrarMan, cobrarTar, avisarMan, avisarTar };
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

function buildMessage({ manana, cobrar, avisar, turno }) {
  // turno: "mañana" o "tarde"
  const lines = [];
  const turnoLabel = turno === "mañana" ? "🌅 MAÑANA (7:00 - 14:00)" : "🌆 TARDE (14:00 - 22:00)";

  lines.push(`🟦 *Time2Train · Renovaciones*`);
  lines.push(`*${formatFechaCabecera(manana)}*`);
  lines.push(`*${turnoLabel}*`);
  lines.push("");

  if (cobrar.length === 0 && avisar.length === 0) {
    lines.push("");
    lines.push(`Sin renovaciones del turno de ${turno} 👍`);
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
    const attendingMap = buildAttendingMap(admissions);

    // ─── Decidir listas (4 listas: cobrar/avisar × mañana/tarde) ───
    const { cobrarMan, cobrarTar, avisarMan, avisarTar } = decideListas({
      persisted, renData, attendingMap, manana,
      semanaActualKey, semanaSiguienteKey
    });

    // Ordenar alfabéticamente cada lista
    const sorter = (a, b) => normName(a.nombre).localeCompare(normName(b.nombre));
    cobrarMan.sort(sorter); cobrarTar.sort(sorter);
    avisarMan.sort(sorter); avisarTar.sort(sorter);

    // Construir los dos mensajes
    let msgManana = buildMessage({ manana, cobrar: cobrarMan, avisar: avisarMan, turno: "mañana" });
    let msgTarde = buildMessage({ manana, cobrar: cobrarTar, avisar: avisarTar, turno: "tarde" });
    if (staleWarning) {
      msgManana += `\n\n_${staleWarning}_`;
      msgTarde += `\n\n_${staleWarning}_`;
    }

    // ─── Modo dry_run: devuelve ambos mensajes en JSON ───
    if (dryRun) {
      return res.status(200).json({
        ok: true, dry_run: true,
        manana: mananaStr,
        semana_actual: semanaActualKey,
        semana_siguiente: semanaSiguienteKey,
        attending_count: attendingMap.size,
        mañana: {
          cobrar_count: cobrarMan.length,
          avisar_count: avisarMan.length,
          cobrar: cobrarMan.map(c => ({ nombre: c.nombre, tipo: c.tipo, precio: c.precio, motivo: c.motivo })),
          avisar: avisarMan.map(a => ({ nombre: a.nombre, tipo: a.tipo })),
          message: msgManana
        },
        tarde: {
          cobrar_count: cobrarTar.length,
          avisar_count: avisarTar.length,
          cobrar: cobrarTar.map(c => ({ nombre: c.nombre, tipo: c.tipo, precio: c.precio, motivo: c.motivo })),
          avisar: avisarTar.map(a => ({ nombre: a.nombre, tipo: a.tipo })),
          message: msgTarde
        },
        last_update: persisted.lastUpdate || null,
        stale_warning: staleWarning
      });
    }

    // ─── Envío real: parámetro ?turno= determina cuál se manda ───
    // Esto evita el timeout de 10s de Vercel en plan Hobby. El cron de
    // GitHub Actions hace dos llamadas separadas con 65s de pausa entre
    // ambas para no chocar con el rate limit de CallMeBot.
    const turnoParam = (req.query && req.query.turno) || "ambos";

    if (turnoParam === "manana" || turnoParam === "mañana") {
      const send = await sendCallMeBot(phone, apikey, msgManana);
      return res.status(send.ok ? 200 : 502).json({
        ok: send.ok, turno: "mañana", manana: mananaStr,
        cobrar_count: cobrarMan.length, avisar_count: avisarMan.length,
        callmebot_status: send.status, callmebot_body: send.body.substring(0, 300)
      });
    }

    if (turnoParam === "tarde") {
      const send = await sendCallMeBot(phone, apikey, msgTarde);
      return res.status(send.ok ? 200 : 502).json({
        ok: send.ok, turno: "tarde", manana: mananaStr,
        cobrar_count: cobrarTar.length, avisar_count: avisarTar.length,
        callmebot_status: send.status, callmebot_body: send.body.substring(0, 300)
      });
    }

    // turnoParam === "ambos" (legacy o llamada manual): manda los dos
    // con espera de 65s. ATENCIÓN: solo funciona si Vercel permite
    // ejecutar 90s+ (plan Pro o configuración maxDuration alta).
    const sendMan = await sendCallMeBot(phone, apikey, msgManana);
    await new Promise(resolve => setTimeout(resolve, 65000));
    const sendTar = await sendCallMeBot(phone, apikey, msgTarde);

    return res.status((sendMan.ok && sendTar.ok) ? 200 : 502).json({
      ok: sendMan.ok && sendTar.ok,
      manana: mananaStr,
      mañana: { cobrar_count: cobrarMan.length, avisar_count: avisarMan.length, callmebot_status: sendMan.status, callmebot_body: sendMan.body.substring(0, 300) },
      tarde: { cobrar_count: cobrarTar.length, avisar_count: avisarTar.length, callmebot_status: sendTar.status, callmebot_body: sendTar.body.substring(0, 300) }
    });
  } catch (err) {
    console.error("[whatsapp-renovaciones] error:", err);
    return res.status(500).json({ error: err.message || String(err) });
  }
}
