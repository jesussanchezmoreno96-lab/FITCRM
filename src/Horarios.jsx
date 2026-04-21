import { useState, useEffect } from "react";

var WORKERS = ["Jesús", "Miguel", "Diego", "Marcelo", "Maribel", "Mari Carmen"];
var WCOLORS = { "Jesús": "#22c55e", "Miguel": "#3b82f6", "Diego": "#06b6d4", "Marcelo": "#f59e0b", "Maribel": "#a78bfa", "Mari Carmen": "#ec4899", "Laura": "#f97316" };

var ALL_WORKERS = [
  { name: "Miguel", type: "rotating" },
  { name: "Jesús", type: "rotating" },
  { name: "Marcelo", type: "fixed", schedule: { L: "14:00-22:00", M: "14:00-22:00", X: "14:00-22:00", J: "14:00-22:00", V: "14:00-20:00", S: "" } },
  { name: "Mari Carmen", type: "fixed", schedule: { L: "14:00-22:00", M: "14:00-22:00", X: "14:00-22:00", J: "14:00-22:00", V: "14:00-20:00", S: "" } },
  { name: "Maribel", type: "fixed", schedule: { L: "7:00-12:00", M: "7:00-12:00", X: "7:00-12:00", J: "7:00-12:00", V: "7:00-12:00", S: "" } },
  { name: "Diego", type: "fixed", schedule: { L: "7:00-11:00 / 18:00-21:00", M: "7:00-11:00 / 18:00-21:00", X: "7:00-13:00", J: "7:00-11:00 / 18:00-21:00", V: "7:00-13:00", S: "" } },
  { name: "Laura", type: "fixed", schedule: { L: "", M: "", X: "", J: "17:00-22:00", V: "15:00-20:00", S: "9:00-14:00" } }
];

var DAYS = ["L", "M", "X", "J", "V", "S"];
var DAYNAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
var MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

var DEFAULT_HOLIDAYS = [
  { id: "f1", date: "2026-05-01", name: "Fiesta del Trabajo", day: "Viernes", p1: "Marcelo", p2: "Maribel" },
  { id: "f2", date: "2026-05-02", name: "Fiesta Comunidad de Madrid", day: "Sábado", p1: "Jesús", p2: "Mari Carmen" },
  { id: "f3", date: "2026-05-15", name: "San Isidro Labrador", day: "Viernes", p1: "Miguel", p2: "Diego" },
  { id: "f4", date: "2026-10-12", name: "Fiesta Nacional de España", day: "Lunes", p1: "Maribel", p2: "Mari Carmen" },
  { id: "f5", date: "2026-11-02", name: "Traslado Todos los Santos", day: "Lunes", p1: "Diego", p2: "Marcelo" },
  { id: "f6", date: "2026-11-09", name: "Ntra. Sra. de La Almudena", day: "Lunes", p1: "Jesús", p2: "Miguel" },
  { id: "f7", date: "2026-12-07", name: "Traslado Día Constitución", day: "Lunes", p1: "Miguel", p2: "Marcelo" },
  { id: "f8", date: "2026-12-08", name: "Inmaculada Concepción", day: "Martes", p1: "Jesús", p2: "Maribel" }
];

function getRotatingSchedule(weekIndex, name) {
  var isMiguelMorning = weekIndex % 2 === 0;
  if (name === "Miguel") return isMiguelMorning
    ? { L: "7:00-14:00", M: "7:00-14:00", X: "7:00-14:00", J: "7:00-14:00", V: "7:00-14:00", S: "9:00-14:00" }
    : { L: "14:00-22:00", M: "14:00-22:00", X: "14:00-22:00", J: "14:00-22:00", V: "14:00-20:00", S: "" };
  return isMiguelMorning
    ? { L: "14:00-22:00", M: "14:00-22:00", X: "14:00-22:00", J: "14:00-22:00", V: "14:00-20:00", S: "" }
    : { L: "7:00-14:00", M: "7:00-14:00", X: "7:00-14:00", J: "7:00-14:00", V: "7:00-14:00", S: "9:00-14:00" };
}

// Get all weeks (Mon-Sat) for a given month/year
function getWeeksOfMonth(year, month) {
  var weeks = [];
  var d = new Date(year, month, 1);
  // Go to first Monday on or before 1st
  while (d.getDay() !== 1) d.setDate(d.getDate() - 1);
  while (true) {
    var weekStart = new Date(d);
    var weekEnd = new Date(d);
    weekEnd.setDate(weekEnd.getDate() + 5); // Saturday
    // Only include if the week overlaps with the selected month
    if (weekStart.getMonth() > month && weekStart.getFullYear() >= year) break;
    if (weekEnd.getMonth() < month && weekEnd.getFullYear() <= year) { d.setDate(d.getDate() + 7); continue; }
    weeks.push({ start: new Date(weekStart), end: new Date(weekEnd) });
    d.setDate(d.getDate() + 7);
    if (weeks.length > 6) break;
  }
  return weeks;
}

function formatWeekLabel(start, end) {
  var s = start.getDate() + " " + MONTHS[start.getMonth()].substr(0, 3);
  var e = end.getDate() + " " + MONTHS[end.getMonth()].substr(0, 3);
  return "Semana del " + s + " al " + e;
}

function weekKey(year, month, weekIdx) {
  return "t2t_week_" + year + "_" + month + "_" + weekIdx;
}

export default function Horarios(props) {
  var T = props.theme; var dk = props.dk;
  var now = new Date();
  var [selMonth, setSelMonth] = useState(now.getMonth());
  var [selYear] = useState(now.getFullYear());
  var [selWeekIdx, setSelWeekIdx] = useState(0);
  var [view, setView] = useState("horarios");
  var [holidays, setHolidays] = useState(DEFAULT_HOLIDAYS);
  var [weekOverrides, setWeekOverrides] = useState({});
  var [editingCell, setEditingCell] = useState(null); // {worker, day}
  var [editValue, setEditValue] = useState("");
  var [showEditModal, setShowEditModal] = useState(false);

  // Load saved data
  useEffect(function () {
    try {
      var savedH = window.localStorage && window.localStorage.getItem("t2t_holidays");
      if (savedH) setHolidays(JSON.parse(savedH));
      var savedW = window.localStorage && window.localStorage.getItem("t2t_week_overrides");
      if (savedW) setWeekOverrides(JSON.parse(savedW));
    } catch (e) { }
  }, []);

  function saveHolidays(h) {
    setHolidays(h);
    try { window.localStorage && window.localStorage.setItem("t2t_holidays", JSON.stringify(h)); } catch (e) { }
  }

  function saveOverrides(o) {
    setWeekOverrides(o);
    try { window.localStorage && window.localStorage.setItem("t2t_week_overrides", JSON.stringify(o)); } catch (e) { }
  }

  var weeks = getWeeksOfMonth(selYear, selMonth);
  var currentWeek = weeks[selWeekIdx] || weeks[0];

  // Get base schedule for a worker this week
  function getBaseSchedule(worker, weekIdx) {
    if (worker.type === "rotating") return getRotatingSchedule(weekIdx, worker.name);
    return worker.schedule;
  }

  // Get effective schedule (base + overrides)
  function getEffectiveSchedule(worker, year, month, weekIdx) {
    var base = getBaseSchedule(worker, weekIdx);
    var key = weekKey(year, month, weekIdx);
    var overridesForWeek = (weekOverrides[key] || {})[worker.name] || {};
    var result = Object.assign({}, base);
    Object.keys(overridesForWeek).forEach(function (day) {
      result[day] = overridesForWeek[day];
    });
    return result;
  }

  function hasOverride(workerName, day) {
    var key = weekKey(selYear, selMonth, selWeekIdx);
    return weekOverrides[key] && weekOverrides[key][workerName] && weekOverrides[key][workerName][day] !== undefined;
  }

  function openEdit(workerName, day, currentVal) {
    setEditingCell({ workerName, day });
    setEditValue(currentVal || "");
    setShowEditModal(true);
  }

  function saveEdit() {
    if (!editingCell) return;
    var key = weekKey(selYear, selMonth, selWeekIdx);
    var newOverrides = JSON.parse(JSON.stringify(weekOverrides));
    if (!newOverrides[key]) newOverrides[key] = {};
    if (!newOverrides[key][editingCell.workerName]) newOverrides[key][editingCell.workerName] = {};
    newOverrides[key][editingCell.workerName][editingCell.day] = editValue;
    saveOverrides(newOverrides);
    setShowEditModal(false);
    setEditingCell(null);
  }

  function clearOverride(workerName, day) {
    var key = weekKey(selYear, selMonth, selWeekIdx);
    var newOverrides = JSON.parse(JSON.stringify(weekOverrides));
    if (newOverrides[key] && newOverrides[key][workerName]) {
      delete newOverrides[key][workerName][day];
    }
    saveOverrides(newOverrides);
  }

  function clearWeekOverrides() {
    var key = weekKey(selYear, selMonth, selWeekIdx);
    var newOverrides = JSON.parse(JSON.stringify(weekOverrides));
    delete newOverrides[key];
    saveOverrides(newOverrides);
  }

  function swapWorker(holidayId, position, newWorker) {
    var updated = holidays.map(function (h) {
      if (h.id === holidayId) {
        var copy = Object.assign({}, h);
        if (position === 1) copy.p1 = newWorker;
        else copy.p2 = newWorker;
        return copy;
      }
      return h;
    });
    saveHolidays(updated);
  }

  var counts = {};
  WORKERS.forEach(function (w) { counts[w] = 0; });
  holidays.forEach(function (h) { if (counts[h.p1] !== undefined) counts[h.p1]++; if (counts[h.p2] !== undefined) counts[h.p2]++; });

  var B = { background: T.bg2, borderRadius: 14, border: "1px solid " + T.border, overflow: "hidden" };

  // Check if current week has any overrides
  var currentWeekKey = weekKey(selYear, selMonth, selWeekIdx);
  var hasWeekChanges = weekOverrides[currentWeekKey] && Object.keys(weekOverrides[currentWeekKey]).length > 0;

  return (
    <div>
      {/* Tab buttons */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button onClick={function () { setView("horarios"); }} style={{ padding: "10px 20px", borderRadius: 10, border: view === "horarios" ? "2px solid " + T.navy : "2px solid " + T.border, background: view === "horarios" ? T.navy + "15" : "transparent", color: view === "horarios" ? T.navy : T.text3, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>📅 Horarios</button>
        <button onClick={function () { setView("festivos"); }} style={{ padding: "10px 20px", borderRadius: 10, border: view === "festivos" ? "2px solid #ef4444" : "2px solid " + T.border, background: view === "festivos" ? "#ef444410" : "transparent", color: view === "festivos" ? "#ef4444" : T.text3, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>🎉 Festivos</button>
      </div>

      {/* ── HORARIOS VIEW ── */}
      {view === "horarios" && <div>

        {/* Month selector */}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 16 }}>
          {MONTHS.map(function (m, i) {
            return <button key={i} onClick={function () { setSelMonth(i); setSelWeekIdx(0); }} style={{ padding: "7px 14px", borderRadius: 8, border: selMonth === i ? "1px solid " + T.navy : "1px solid " + T.border, background: selMonth === i ? T.navy + "12" : "transparent", color: selMonth === i ? T.navy : T.text3, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{m}</button>;
          })}
        </div>

        {/* Week selector */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: T.text3, fontWeight: 600 }}>Semana:</span>
          {weeks.map(function (w, i) {
            var wKey = weekKey(selYear, selMonth, i);
            var hasChanges = weekOverrides[wKey] && Object.keys(weekOverrides[wKey]).length > 0;
            return (
              <button key={i} onClick={function () { setSelWeekIdx(i); }} style={{ padding: "8px 14px", borderRadius: 10, border: selWeekIdx === i ? "2px solid " + T.navy : "1px solid " + T.border, background: selWeekIdx === i ? T.navy + "12" : "transparent", color: selWeekIdx === i ? T.navy : T.text3, fontSize: 11, fontWeight: 600, cursor: "pointer", position: "relative" }}>
                {formatWeekLabel(w.start, w.end)}
                {hasChanges && <span style={{ position: "absolute", top: -4, right: -4, width: 8, height: 8, borderRadius: 4, background: "#f59e0b", border: "2px solid " + T.bg }}></span>}
              </button>
            );
          })}
        </div>

        {/* Week header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T.text }}>
            {currentWeek ? formatWeekLabel(currentWeek.start, currentWeek.end) : ""} · {MONTHS[selMonth]} {selYear}
            {hasWeekChanges && <span style={{ marginLeft: 10, fontSize: 11, padding: "3px 8px", borderRadius: 6, background: "#f59e0b20", color: "#f59e0b", fontWeight: 600 }}>✏️ Con cambios</span>}
          </h3>
          {hasWeekChanges && (
            <button onClick={clearWeekOverrides} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #ef4444", background: "#ef444410", color: "#ef4444", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
              🔄 Restablecer semana
            </button>
          )}
        </div>

        {/* Schedule table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid " + T.border }}>
                <th style={{ padding: "12px 10px", textAlign: "left", color: T.text, fontWeight: 800, fontSize: 14, minWidth: 120 }}>Trabajador</th>
                {DAYS.map(function (d, i) {
                  return <th key={d} style={{ padding: "12px 8px", textAlign: "center", color: T.navy, fontWeight: 700, fontSize: 12, minWidth: 110 }}>{DAYNAMES[i]}</th>;
                })}
              </tr>
            </thead>
            <tbody>
              {ALL_WORKERS.map(function (w) {
                var sched = getEffectiveSchedule(w, selYear, selMonth, selWeekIdx);
                var color = WCOLORS[w.name] || "#64748b";
                return (
                  <tr key={w.name} style={{ borderBottom: "1px solid " + T.border }}>
                    <td style={{ padding: "14px 10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 4, background: color, flexShrink: 0 }}></div>
                        <span style={{ fontWeight: 700, color: T.text, fontSize: 13 }}>{w.name}</span>
                      </div>
                      {w.type === "rotating" && <span style={{ fontSize: 9, color: T.text3, marginLeft: 16 }}>↔️ Rotativo</span>}
                    </td>
                    {DAYS.map(function (d) {
                      var h = sched[d];
                      var isOverridden = hasOverride(w.name, d);
                      return (
                        <td key={d} style={{ padding: "8px 6px", textAlign: "center" }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                            {h
                              ? <span style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, background: isOverridden ? "#f59e0b20" : color + "15", color: isOverridden ? "#f59e0b" : color, fontWeight: 600, display: "inline-block", border: isOverridden ? "1px solid #f59e0b50" : "none" }}>{h}</span>
                              : <span style={{ color: T.text3, fontSize: 10 }}>—</span>
                            }
                            <div style={{ display: "flex", gap: 3 }}>
                              <button onClick={function () { openEdit(w.name, d, h); }} title="Editar este día" style={{ fontSize: 9, padding: "2px 5px", borderRadius: 4, border: "1px solid " + T.border, background: "transparent", color: T.text3, cursor: "pointer" }}>✏️</button>
                              {isOverridden && <button onClick={function () { clearOverride(w.name, d); }} title="Quitar cambio" style={{ fontSize: 9, padding: "2px 5px", borderRadius: 4, border: "1px solid #ef4444", background: "#ef444410", color: "#ef4444", cursor: "pointer" }}>✕</button>}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div style={{ marginTop: 16, padding: 12, background: T.bg3, borderRadius: 10, border: "1px solid " + T.border }}>
          <div style={{ fontSize: 11, color: T.text3 }}>
            <b style={{ color: T.text }}>Horario del centro:</b> L-J 7:00-22:00 · V 7:00-20:00 · S 9:00-14:00
          </div>
          <div style={{ fontSize: 11, color: T.text3, marginTop: 4 }}>
            <b style={{ color: T.text }}>Miguel y Jesús:</b> Rotan semanalmente mañana (7-14) / tarde (14-22)
          </div>
          <div style={{ fontSize: 11, color: T.text3, marginTop: 4 }}>
            <span style={{ color: "#f59e0b", fontWeight: 700 }}>■</span> Horario modificado puntualmente · <span style={{ color: T.navy, fontWeight: 700 }}>●</span> Semana con cambios
          </div>
        </div>
      </div>}

      {/* ── FESTIVOS VIEW ── */}
      {view === "festivos" && <div>
        <h3 style={{ margin: "0 0 10px", fontSize: 18, fontWeight: 800, color: T.text }}>🎉 Festivos 2026</h3>
        <p style={{ fontSize: 12, color: T.text3, marginBottom: 16 }}>2 personas por festivo · 9:00-14:00 · Puedes cambiar las asignaciones con los desplegables</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          {WORKERS.map(function (w) {
            var c = counts[w] || 0; var color = WCOLORS[w];
            return <div key={w} style={{ padding: "8px 14px", borderRadius: 10, background: color + "10", border: "1px solid " + color + "25", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: 4, background: color }}></div>
              <span style={{ fontSize: 12, fontWeight: 700, color: color }}>{w}</span>
              <span style={{ fontSize: 18, fontWeight: 900, color: color }}>{c}</span>
              <span style={{ fontSize: 9, color: T.text3 }}>festivos</span>
            </div>;
          })}
        </div>
        <div style={B}>
          {holidays.map(function (h) {
            var d = new Date(h.date);
            var monthName = MONTHS[d.getMonth()];
            var c1 = WCOLORS[h.p1] || "#64748b"; var c2 = WCOLORS[h.p2] || "#64748b";
            return <div key={h.id} style={{ padding: "16px 20px", borderBottom: "1px solid " + T.border }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <div style={{ width: 55, textAlign: "center", flexShrink: 0 }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: "#ef4444" }}>{d.getDate()}</div>
                  <div style={{ fontSize: 9, color: T.text3, fontWeight: 600, textTransform: "uppercase" }}>{monthName.substr(0, 3)}</div>
                </div>
                <div style={{ flex: 1, minWidth: 150 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{h.name}</div>
                  <div style={{ fontSize: 11, color: T.text3 }}>{h.day} · 9:00-14:00</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 9, color: T.text3, fontWeight: 600 }}>PERSONA 1</span>
                  <select value={h.p1} onChange={function (e) { swapWorker(h.id, 1, e.target.value); }} style={{ padding: "6px 10px", borderRadius: 8, background: c1 + "15", border: "1px solid " + c1 + "30", color: c1, fontSize: 12, fontWeight: 700, outline: "none", cursor: "pointer" }}>
                    {WORKERS.map(function (w) { return <option key={w} value={w}>{w}</option>; })}
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 9, color: T.text3, fontWeight: 600 }}>PERSONA 2</span>
                  <select value={h.p2} onChange={function (e) { swapWorker(h.id, 2, e.target.value); }} style={{ padding: "6px 10px", borderRadius: 8, background: c2 + "15", border: "1px solid " + c2 + "30", color: c2, fontSize: 12, fontWeight: 700, outline: "none", cursor: "pointer" }}>
                    {WORKERS.map(function (w) { return <option key={w} value={w}>{w}</option>; })}
                  </select>
                </div>
              </div>
            </div>;
          })}
        </div>
        <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
          <button onClick={function () { saveHolidays(DEFAULT_HOLIDAYS); }} style={{ padding: "8px 16px", background: T.bg3, border: "1px solid " + T.border, borderRadius: 8, color: T.text3, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>🔄 Restablecer original</button>
        </div>
        <div style={{ marginTop: 12, padding: 12, background: T.bg3, borderRadius: 10, border: "1px solid " + T.border }}>
          <div style={{ fontSize: 11, color: T.text3 }}>
            <b style={{ color: T.text }}>Reglas:</b> 2 personas por festivo · Nadie repite hasta que todos hayan hecho el mismo número · Horario festivo: 9:00-14:00
          </div>
        </div>
      </div>}

      {/* ── EDIT MODAL ── */}
      {showEditModal && editingCell && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: T.bg, borderRadius: 16, padding: 28, minWidth: 320, border: "1px solid " + T.border, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 800, color: T.text }}>✏️ Modificar horario</h3>
            <p style={{ margin: "0 0 20px", fontSize: 12, color: T.text3 }}>
              <b style={{ color: WCOLORS[editingCell.workerName] || T.text }}>{editingCell.workerName}</b> · {DAYNAMES[DAYS.indexOf(editingCell.day)]} · {formatWeekLabel(currentWeek.start, currentWeek.end)}
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.text3, display: "block", marginBottom: 6 }}>NUEVO HORARIO</label>
              <input
                value={editValue}
                onChange={function (e) { setEditValue(e.target.value); }}
                placeholder="Ej: 9:00-15:00 o déjalo vacío para libre"
                style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid " + T.border, background: T.bg2, color: T.text, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                autoFocus
                onKeyDown={function (e) { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setShowEditModal(false); }}
              />
              <p style={{ margin: "6px 0 0", fontSize: 10, color: T.text3 }}>Deja vacío para marcar como día libre · Enter para guardar</p>
            </div>
            {/* Quick presets */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: T.text3, fontWeight: 600, marginBottom: 6 }}>ACCESOS RÁPIDOS</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["7:00-14:00", "14:00-22:00", "7:00-12:00", "9:00-14:00", "15:00-20:00", "17:00-22:00"].map(function (preset) {
                  return <button key={preset} onClick={function () { setEditValue(preset); }} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid " + T.border, background: T.bg3, color: T.text3, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>{preset}</button>;
                })}
                <button onClick={function () { setEditValue(""); }} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #ef4444", background: "#ef444410", color: "#ef4444", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>Libre / Baja</button>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={function () { setShowEditModal(false); setEditingCell(null); }} style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid " + T.border, background: "transparent", color: T.text3, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
              <button onClick={saveEdit} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: T.navy, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Guardar cambio</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
