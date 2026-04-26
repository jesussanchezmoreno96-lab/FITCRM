// ════════════════════════════════════════════════════════════════════════
//  T2Tcrm — Script de backup automático
// ════════════════════════════════════════════════════════════════════════

import fs from "fs";
import path from "path";

const SUPA_URL = process.env.SUPA_URL;
const SUPA_KEY = process.env.SUPA_KEY;
const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN || "";
const TG_CHAT_ID = process.env.TG_CHAT_ID || "";

if (!SUPA_URL || !SUPA_KEY) {
  console.error("Faltan SUPA_URL o SUPA_KEY en el entorno");
  process.exit(1);
}

const TABLAS = ["clients", "leads", "followups", "fisio_reports", "bonos_timp"];
const BACKUP_DIR = "backups";
const MAX_BACKUPS = 30;
const FAIL_COUNTER_FILE = "backups/.fail_counter.json";
const FAIL_THRESHOLD = 3;

async function fetchTabla(tabla) {
  const url = SUPA_URL + "/rest/v1/" + tabla + "?select=*";
  const r = await fetch(url, {
    headers: { apikey: SUPA_KEY, Authorization: "Bearer " + SUPA_KEY },
  });
  if (!r.ok) throw new Error("Tabla " + tabla + ": HTTP " + r.status);
  return r.json();
}

async function notifyTelegram(text) {
  if (!TG_BOT_TOKEN || !TG_CHAT_ID) return;
  try {
    await fetch("https://api.telegram.org/bot" + TG_BOT_TOKEN + "/sendMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TG_CHAT_ID, text, parse_mode: "Markdown" }),
    });
  } catch (e) {
    console.error("Error Telegram:", e.message);
  }
}

function readFailCounter() {
  try {
    if (!fs.existsSync(FAIL_COUNTER_FILE)) return { count: 0 };
    return JSON.parse(fs.readFileSync(FAIL_COUNTER_FILE, "utf8"));
  } catch {
    return { count: 0 };
  }
}

function writeFailCounter(c) {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  fs.writeFileSync(FAIL_COUNTER_FILE, JSON.stringify(c, null, 2));
}

function purgeOldBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return;
  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith("t2tcrm_backup_") && f.endsWith(".json"))
    .sort();
  if (files.length <= MAX_BACKUPS) return;
  const toDelete = files.slice(0, files.length - MAX_BACKUPS);
  toDelete.forEach((f) => fs.unlinkSync(path.join(BACKUP_DIR, f)));
}

async function main() {
  console.log("Backup T2Tcrm iniciado");
  try {
    const results = await Promise.all(
      TABLAS.map(async (t) => ({ tabla: t, rows: await fetchTabla(t) }))
    );
    const backup = {
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" }),
      version: "1.0",
      tables: {},
    };
    let totalRows = 0;
    results.forEach((r) => {
      backup.tables[r.tabla] = r.rows;
      totalRows += r.rows.length;
    });
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const d = new Date();
    const fname = "t2tcrm_backup_" + d.toISOString().slice(0, 10) + ".json";
    fs.writeFileSync(path.join(BACKUP_DIR, fname), JSON.stringify(backup, null, 2));
    purgeOldBackups();
    writeFailCounter({ count: 0, lastSuccess: new Date().toISOString() });
    console.log("Backup completado: " + fname + " (" + totalRows + " registros)");
  } catch (err) {
    console.error("Backup falló:", err.message);
    const c = readFailCounter();
    c.count = (c.count || 0) + 1;
    c.lastError = new Date().toISOString();
    c.lastErrorMsg = err.message;
    writeFailCounter(c);
    if (c.count >= FAIL_THRESHOLD) {
      await notifyTelegram(
        "⚠️ *T2Tcrm — Backup automático falló " + c.count + " días seguidos*\n\nError: `" + err.message + "`"
      );
    }
    process.exit(1);
  }
}

main();
