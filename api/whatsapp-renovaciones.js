// ════════════════════════════════════════════════════════════════════════
//  api/whatsapp-renovaciones.js
//
//  Endpoint serverless que envía un mensaje de WhatsApp con las
//  renovaciones del día siguiente.
//
//  Ejecución prevista: cron de GitHub Actions de domingo a viernes a las
//  20:00 hora Madrid (es decir, mañana = lunes a sábado).
//
//  Lógica:
//    Sección A COBRAR
//      · El cliente tiene clase reservada en TIMP para el día de mañana.
//      · Su semana de renovación (renewMonday) es la semana del día
//        siguiente al envío.
//      · Está en estado pendiente | reserva (>7 días) | mitad (día 42).
//
//    Sección A AVISAR
//      · El cliente tiene clase reservada en TIMP para el día de mañana.
//      · Su semana de renovación es la semana SIGUIENTE.
//      · Estado pendiente.
//      · Sin flag avisado:true en renData[clientName__weekKey].
//
//  Datos que lee de Supabase (tabla bonos_timp):
//    · cuotas_vigentes  → bonos vivos (los mismos que muestra el CRM).
//    · renovacion_data  → estados, avisados, movidos, etc.
//    · client_blacklist → clientes a excluir.
//
//  Datos que lee de TIMP:
//    · /admissions con date_from = mañana, date_to = mañana.
//
//  Variables de entorno requeridas (Vercel):
//    · CALLMEBOT_PHONE       → 34680728857
//    · CALLMEBOT_APIKEY      → 4129350
//    · WHATSAPP_CRON_SECRET  → token largo aleatorio (lo genero yo)
//    · TIMP_API_KEY          → ya existente, la usa /api/timp.js
//    · SUPABASE_URL          → opcional, fallback al hardcoded
//    · SUPABASE_KEY          → opcional, fallback al hardcoded
//
//  Modo prueba:
//    GET /api/whatsapp-renovaciones?secret=XXX&dry_run=1
//      → devuelve el mensaje en JSON sin enviarlo a WhatsApp.
//    GET /api/whatsapp-renovaciones?secret=XXX
//      → envía el WhatsApp y devuelve el resultado.
// ════════════════════════════════════════════════════════════════════════

// ─── Constantes ─────────────────────────────────────────────────────────
const TIMP_CENTER = "ebb9a2c0-782e-4d77-b5eb-17d18a1f8949";
const SUPA_URL_DEFAULT = "https://yvzearwbwwthquekqnnk.supabase.co";
const SUPA_KEY_DEFAULT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2emVhcndid3d0aHF1ZWtxbm5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMTMwNTMsImV4cCI6MjA5MDg4OTA1M30.1BhalulMlEJ3am_D0e8Y3rRyM_qz0VR4_34VNV76FNE";

const MONTHS_ES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const MONTHS_ES_SHORT = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const DAYS_ES = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];

// ─── Helpers de fecha (todos en hora Madrid) ────────────────────────────
// Vercel corre en UTC. Trabajar siempre con la zona Europe/Madrid para
// que "mañana" = mañana en Madrid, no en UTC.

function nowMadrid() {
  // Devuelve un Date que representa el instante actual interpretado como
  // si el reloj de Madrid fuera la hora local. Es un truco pero funciona
  // porque luego solo usamos las partes de fecha (no comparamos UTC).
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false
  });
  const parts = fmt.formatToParts(new Date());
  const get = k => parts.find(p => p.type === k).value;
  return new Date(
    +get("year"),
    +get("month") - 1,
    +get("day"),
    +get("hour"),
    +get("minute"),
    +get("second")
  );
}

function localKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function getMonday(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function diffDays(a, b) {
  // a - b en días enteros
  const ms = a.getTime() - b.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

// ─── Helpers de nombre (igual que el CRM) ───────────────────────────────
function normName(s) {
  if (!s) return "";
  return String(s).toLowerCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function matchesName(a, b) {
  const na = normName(a), nb = normName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const wa = na.split(" "), wb = nb.split(" ");
  if (wa.length < 2 || wb.length < 2) return false;
  return wa[0] === wb[0] && wa[1] === wb[1];
}

function inBlacklist(nombre, blacklist) {
  if (!blacklist || !blacklist.length) return false;
  const n = normName(nombre);
  return blacklist.some(b => {
    const bn = normName(b);
    if (!bn) return false;
    const wa = n.split(" ").filter(Boolean);
    const wb = bn.split(" ").filter(Boolean);
    if (wa.length >= 1 && wb.length >= 1 && wa[0] === wb[0]) {
      if (wb.length === 1) return true;
      if (wa.length >= 2 && wb.length >= 2 && wa[1] === wb[1]) return true;
    }
    return n.indexOf(bn) >= 0;
  });
}

// ─── Lectura de Supabase ────────────────────────────────────────────────
async function supaGet(url, key, table) {
  const r = await fetch(`${url}/rest/v1/${table}?select=*`, {
    headers: { "apikey": key, "Authorization": `Bearer ${key}` }
  });
  if (!r.ok) throw new Error(`Supabase ${table}: ${r.status}`);
  return await r.json();
}

// ─── Lectura de TIMP (admisiones de un día) ─────────────────────────────
async function timpAdmissionsForDate(host, dateStr) {
  // Reusa el proxy /api/timp del propio Vercel para no duplicar credenciales.
  // host viene del request original (ej: fitcrm-beige.vercel.app).
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

// Devuelve un Set de nombres (en formato normalizado) que tienen
// reserva válida (status = "valid") para el día indicado.
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

// ─── Construcción de la lista de candidatos por semana ─────────────────
// Esta es la versión MÍNIMA de la lógica de Renovaciones.jsx adaptada al
// servidor. NO duplica el cruce con Excel de cuotas/reservas (eso ya está
// reflejado en renData / cuotas_vigentes que el CRM persiste). Aquí
// simplemente partimos del listado de bonos vivos y le aplicamos:
//   · whitelist de tipo de bono (entrenamiento, no fisio/nutri/gympass)
//   · filtro active_membership
//   · blacklist
//   · estado en renData (avisado, renovacion, segundoPago, etc)

const TIPOS_VALIDOS = [
  "time partner", "time plus", "time pro", "time pro+",
  "time partner plus",
  "bono 5", "bono 10", "bono 20",
  "entrenamiento sesion", "entrenamiento sesión", "entrenamiento sesion dual"
];
const TIPOS_EXCLUIDOS = ["fisio", "nutri", "gympass"];

function tipoEsValido(tipo) {
  if (!tipo) return false;
  const t = tipo.toLowerCase();
  if (TIPOS_EXCLUIDOS.some(e => t.indexOf(e) >= 0)) return false;
  return TIPOS_VALIDOS.some(v => t.indexOf(v) >= 0);
}

function buildEntries(bonos, blacklist) {
  // Convierte la tabla bonos_timp.cuotas_vigentes (la que ya alimenta
  // Renovaciones) en una lista de entries con los campos que usamos.
  const out = [];
  for (const b of bonos) {
    if (!b || !b.nombre) continue;
    if (inBlacklist(b.nombre, blacklist)) continue;
    if (!tipoEsValido(b.tipoBono || b.concepto || "")) continue;

    const fv = b.fechaValor ? new Date(b.fechaValor) : null;
    if (!fv || isNaN(fv)) continue;

    out.push({
      nombre: b.nombre,
      tipo: b.tipoBono || b.concepto || "",
      precio: +b.precio || +b.total || 0,
      fechaValor: fv,
      renewMonday: getMonday(fv),
      pagado: !!b.pagado,
      fraccionado: !!b.fraccionado,
      mitadPagada: !!b.mitadPagada,
      esReserva: !!b.esReserva,
      importePagado: +b.importePagado || 0
    });
  }
  return out;
}

// ─── Lógica principal: quién va en COBRAR y quién en AVISAR ─────────────
function decideListas({ entries, renData, attendingSet, manana, semanaActualKey, semanaSiguienteKey }) {
  const cobrar = [];
  const avisar = [];

  // Helper para sacar el estado actual del cliente en una semana dada.
  function estadoEn(nombre, weekKey) {
    const k = `${nombre.toLowerCase().trim()}__${weekKey}`;
    const d = renData[k] || {};
    return {
      renovacion: d.renovacion || "pendiente",
      avisado: !!d.avisado,
      segundoPago: !!d.segundoPago,
      movido: !!d.movido,
      notas: d.notas || ""
    };
  }

  // Para evitar duplicados (un mismo cliente con varios bonos antiguos).
  const yaIncluido = new Set();

  for (const e of entries) {
    const nombreNorm = normName(e.nombre);
    if (yaIncluido.has(nombreNorm)) continue;

    // ¿Viene mañana?
    if (!attendingSet.has(nombreNorm)) continue;

    const weekKey = localKey(e.renewMonday);

    // ─── Caso 1: renueva ESTA semana → A COBRAR ───
    if (weekKey === semanaActualKey) {
      const st = estadoEn(e.nombre, weekKey);

      // Renovado o NoRenueva → fuera
      if (st.renovacion === "renovado" || st.renovacion === "baja") continue;

      // Pendiente → siempre dentro
      if (st.renovacion === "pendiente") {
        cobrar.push({ ...e, motivo: "Pendiente", precio: e.precio });
        yaIncluido.add(nombreNorm);
        continue;
      }

      // Reserva → solo si lleva +7 días desde fechaValor
      if (st.renovacion === "reserva") {
        const dias = diffDays(manana, e.fechaValor);
        if (dias >= 7) {
          const restante = Math.max(0, e.precio - (e.importePagado || Math.round(e.precio * 0.25)));
          cobrar.push({ ...e, motivo: `Reserva (+${dias} días)`, precio: restante });
          yaIncluido.add(nombreNorm);
        }
        continue;
      }

      // MitadPagada → solo si mañana = día 42 desde fechaValor
      if (st.renovacion === "mitad") {
        const dias = diffDays(manana, e.fechaValor);
        if (dias === 42) {
          const restante = Math.round(e.precio / 2);
          cobrar.push({ ...e, motivo: "2º PAGO", precio: restante });
          yaIncluido.add(nombreNorm);
        }
        continue;
      }
    }

    // ─── Caso 2: renueva la SIGUIENTE semana → A AVISAR ───
    if (weekKey === semanaSiguienteKey) {
      const st = estadoEn(e.nombre, weekKey);
      if (st.renovacion !== "pendiente") continue; // solo pendientes
      if (st.avisado) continue;                    // ya avisado, fuera
      avisar.push({ ...e });
      yaIncluido.add(nombreNorm);
      continue;
    }
  }

  return { cobrar, avisar };
}

// ─── Procesar entries de "segundo pago" desde renData ──────────────────
// Cuando alguien marca "mitad pagada" en el CRM se crea una entrada en
// renData con segundoPago:true y la weekKey del día 42. Eso ya está
// reflejado en la lógica anterior (si mañana es exactamente día 42 y el
// estado base es "mitad", aparece). Por simetría, los entries movidos
// manualmente también entran si tienen una entrada renData en esa
// semana SIN renovacion=renovado.

function entriesFromRenData(renData) {
  // Devuelve entries sintéticos para clientes que están en renData con
  // segundoPago/movido pero cuyo bono original ya no está en cuotas_vigentes
  // (ej: el bono ya caducó pero hay un 2º pago pendiente).
  // Usamos esto SOLO para "A COBRAR" — no avisamos de cosas movidas.
  const out = [];
  for (const k of Object.keys(renData)) {
    const d = renData[k];
    if (!d || !d.clientName) continue;
    if (!d.segundoPago && !d.movido) continue;
    if (d.renovacion === "renovado" || d.renovacion === "baja") continue;
    const parts = k.split("__");
    if (parts.length < 2) continue;
    const weekKey = parts[1];
    const mon = new Date(weekKey + "T00:00:00");
    if (isNaN(mon)) continue;
    out.push({
      nombre: d.clientName,
      tipo: "",
      precio: 0,
      fechaValor: mon,
      renewMonday: mon,
      pagado: false,
      esRenDataOnly: true,
      notas: d.notas || ""
    });
  }
  return out;
}

// ─── Formato del mensaje WhatsApp ───────────────────────────────────────
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

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

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
      lines.push(`${i + 1}. ${c.nombre}`);
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
    lines.push("*🔔 A AVISAR*");
    lines.push("");
    const idxStart = cobrar.length;
    avisar.forEach((a, i) => {
      lines.push(`${idxStart + i + 1}. ${a.nombre}`);
      const trozos = [];
      if (a.tipo) trozos.push(a.tipo);
      trozos.push(`renueva la semana del ${formatSemanaCorta(semanaSiguienteMonday)}`);
      lines.push(`   ${trozos.join(" · ")}`);
    });
  }

  return lines.join("\n");
}

// ─── Envío a CallMeBot ──────────────────────────────────────────────────
async function sendCallMeBot(phone, apikey, text) {
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(apikey)}`;
  const r = await fetch(url);
  const body = await r.text();
  return { ok: r.ok && !/error|too many|not found/i.test(body), status: r.status, body };
}

// ─── Handler ────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  try {
    // Auth: parámetro secret debe coincidir con la variable de entorno
    const secret = (req.query && req.query.secret) || "";
    const expected = process.env.WHATSAPP_CRON_SECRET;
    if (!expected) {
      return res.status(500).json({ error: "Missing WHATSAPP_CRON_SECRET in env" });
    }
    if (secret !== expected) {
      return res.status(401).json({ error: "Unauthorized" });
    }

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
    manana.setHours(0, 0, 0, 0);
    const mananaStr = localKey(manana);
    const semanaActualMonday = getMonday(manana);
    const semanaSiguienteMonday = addDays(semanaActualMonday, 7);
    const semanaActualKey = localKey(semanaActualMonday);
    const semanaSiguienteKey = localKey(semanaSiguienteMonday);

    // ─── Leer Supabase ───
    const rows = await supaGet(supaUrl, supaKey, "bonos_timp");
    let bonos = [], renData = {}, blacklist = [];
    for (const r of rows) {
      if (r.id === "cuotas_vigentes") bonos = r.data || [];
      else if (r.id === "renovacion_data") renData = r.data || {};
      else if (r.id === "client_blacklist") blacklist = r.data || [];
    }

    // ─── Leer admisiones de mañana en TIMP ───
    const host = req.headers.host;
    const admissions = await timpAdmissionsForDate(host, mananaStr);
    const attendingSet = buildAttendingSet(admissions);

    // ─── Construir entries (bonos + entradas renData de 2º pago/movidos) ───
    const baseEntries = buildEntries(bonos, blacklist);
    const renEntries = entriesFromRenData(renData)
      .filter(e => !inBlacklist(e.nombre, blacklist))
      // Evitar duplicados con bonos
      .filter(e => !baseEntries.some(b => matchesName(b.nombre, e.nombre) && localKey(b.renewMonday) === localKey(e.renewMonday)));
    const entries = baseEntries.concat(renEntries);

    // ─── Decidir listas ───
    const { cobrar, avisar } = decideListas({
      entries, renData, attendingSet, manana,
      semanaActualKey, semanaSiguienteKey
    });

    // Ordenar alfabéticamente
    cobrar.sort((a, b) => normName(a.nombre).localeCompare(normName(b.nombre)));
    avisar.sort((a, b) => normName(a.nombre).localeCompare(normName(b.nombre)));

    const message = buildMessage({ manana, cobrar, avisar, semanaSiguienteMonday });

    // ─── Modo prueba ───
    if (dryRun) {
      return res.status(200).json({
        ok: true,
        dry_run: true,
        manana: mananaStr,
        semana_actual: semanaActualKey,
        semana_siguiente: semanaSiguienteKey,
        attending_count: attendingSet.size,
        cobrar_count: cobrar.length,
        avisar_count: avisar.length,
        cobrar: cobrar.map(c => ({ nombre: c.nombre, tipo: c.tipo, precio: c.precio, motivo: c.motivo })),
        avisar: avisar.map(a => ({ nombre: a.nombre, tipo: a.tipo })),
        message
      });
    }

    // ─── Envío real ───
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
