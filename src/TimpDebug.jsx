import { useState } from "react";

var TIMP_CENTER = "ebb9a2c0-782e-4d77-b5eb-17d18a1f8949";

function pad(n) { return n < 10 ? "0" + n : "" + n; }
function fmtDate(d) {
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}
function defaultRange() {
  var today = new Date();
  var first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  var last = new Date(today.getFullYear(), today.getMonth(), 0);
  return { from: fmtDate(first), to: fmtDate(last) };
}

function detectType(v) {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array(" + v.length + ")";
  return typeof v;
}

function shortValue(v) {
  if (v === null || v === undefined) return String(v);
  if (typeof v === "object") {
    try {
      var s = JSON.stringify(v);
      return s.length > 80 ? s.slice(0, 77) + "..." : s;
    } catch (e) { return "[object]"; }
  }
  var s = String(v);
  return s.length > 80 ? s.slice(0, 77) + "..." : s;
}

export default function TimpDebug(props) {
  var T = props.theme;
  var dk = props.dk;

  var def = defaultRange();
  var _ = useState;
  var endpoint_ = _("suscription_invoices"), endpoint = endpoint_[0], setEndpoint = endpoint_[1];
  var from_ = _(def.from), dateFrom = from_[0], setDateFrom = from_[1];
  var to_ = _(def.to), dateTo = to_[0], setDateTo = to_[1];
  var page_ = _(1), page = page_[0], setPage = page_[1];
  var loading_ = _(false), loading = loading_[0], setLoading = loading_[1];
  var error_ = _(null), error = error_[0], setError = error_[1];
  var data_ = _(null), data = data_[0], setData = data_[1];
  var url_ = _(""), lastUrl = url_[0], setLastUrl = url_[1];

  function buildPath() {
    var query = "%3Fdate_from=" + encodeURIComponent(dateFrom) +
                "%26date_to=" + encodeURIComponent(dateTo) +
                "%26page=" + page;
    return "branch_buildings/" + TIMP_CENTER + "/" + endpoint + query;
  }

  function consultar() {
    setLoading(true);
    setError(null);
    setData(null);
    var url = "/api/timp?path=" + buildPath();
    setLastUrl(url);
    fetch(url).then(function (r) {
      return r.text().then(function (txt) {
        var parsed;
        try { parsed = JSON.parse(txt); }
        catch (e) {
          throw new Error("Respuesta no es JSON válido (status " + r.status + "). Body:\n" + txt.slice(0, 500));
        }
        if (!r.ok) throw new Error("HTTP " + r.status + " — " + (parsed.error || JSON.stringify(parsed).slice(0, 300)));
        if (parsed && parsed.error) throw new Error("API error: " + parsed.error);
        return parsed;
      });
    }).then(function (parsed) {
      setData(parsed);
      setLoading(false);
    }).catch(function (e) {
      setError(e.message || String(e));
      setLoading(false);
    });
  }

  var card = { background: T.bg2, border: "1px solid " + T.border, borderRadius: 14, padding: 16, marginBottom: 16 };
  var label = { fontSize: 11, color: T.text2, fontWeight: 700, marginBottom: 4, display: "block", textTransform: "uppercase", letterSpacing: 0.4 };
  var input = { padding: "8px 10px", background: T.bg3, border: "1px solid " + T.border2, borderRadius: 8, color: T.text, fontSize: 13, fontFamily: "inherit" };
  var btn = { padding: "10px 18px", background: T.navy, border: "none", borderRadius: 9, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" };
  var pre = { background: T.bg3, border: "1px solid " + T.border, borderRadius: 10, padding: 14, fontSize: 11, color: T.text, overflow: "auto", maxHeight: 420, fontFamily: "ui-monospace, Menlo, Consolas, monospace", whiteSpace: "pre-wrap", wordBreak: "break-word" };

  var collection = data && Array.isArray(data.collection) ? data.collection : (Array.isArray(data) ? data : null);
  var pageData = data && data.page_data ? data.page_data : null;
  var firstRecord = collection && collection.length > 0 ? collection[0] : null;
  var fields = firstRecord && typeof firstRecord === "object" ? Object.keys(firstRecord) : [];

  return (
    <div>
      <h2 style={{ margin: "0 0 16px", fontSize: 22, fontWeight: 800, color: T.text }}>🔧 TIMP Debug</h2>

      <div style={card}>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 0.5fr auto", gap: 12, alignItems: "end" }}>
          <div>
            <span style={label}>Endpoint</span>
            <select value={endpoint} onChange={function (e) { setEndpoint(e.target.value); }} style={Object.assign({}, input, { width: "100%" })}>
              <option value="suscription_invoices">suscription_invoices</option>
              <option value="purchases">purchases</option>
              <option value="accounting">accounting</option>
              <option value="payments">payments</option>
              <option value="cash_movements">cash_movements</option>
              <option value="cash_box">cash_box</option>
              <option value="daily_cash">daily_cash</option>
            </select>
          </div>
          <div>
            <span style={label}>date_from</span>
            <input type="date" value={dateFrom} onChange={function (e) { setDateFrom(e.target.value); }} style={Object.assign({}, input, { width: "100%" })} />
          </div>
          <div>
            <span style={label}>date_to</span>
            <input type="date" value={dateTo} onChange={function (e) { setDateTo(e.target.value); }} style={Object.assign({}, input, { width: "100%" })} />
          </div>
          <div>
            <span style={label}>page</span>
            <input type="number" min="1" value={page} onChange={function (e) { setPage(Math.max(1, parseInt(e.target.value, 10) || 1)); }} style={Object.assign({}, input, { width: "100%" })} />
          </div>
          <button onClick={consultar} disabled={loading} style={Object.assign({}, btn, { opacity: loading ? 0.6 : 1, cursor: loading ? "wait" : "pointer" })}>
            {loading ? "⏳ Consultando..." : "Consultar"}
          </button>
        </div>
        <div style={{ marginTop: 10, fontSize: 10, color: T.text3, fontFamily: "ui-monospace, Menlo, Consolas, monospace", wordBreak: "break-all" }}>
          {lastUrl ? "GET " + lastUrl : "Pulsa Consultar para lanzar la petición."}
        </div>
      </div>

      {error && (
        <div style={{ background: dk ? "rgba(239,68,68,0.08)" : "#fef2f2", border: "1px solid #ef4444", borderRadius: 12, padding: 14, marginBottom: 16, color: "#ef4444", fontSize: 12, whiteSpace: "pre-wrap", fontFamily: "ui-monospace, Menlo, Consolas, monospace" }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>❌ Error</div>
          {error}
        </div>
      )}

      {data && (
        <div style={card}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: T.text2 }}>
              <strong style={{ color: T.text }}>Registros:</strong>{" "}
              {collection ? collection.length : "(no es colección)"}
            </div>
            {pageData && (
              <>
                <div style={{ fontSize: 12, color: T.text2 }}><strong style={{ color: T.text }}>total_pages:</strong> {String(pageData.total_pages)}</div>
                <div style={{ fontSize: 12, color: T.text2 }}><strong style={{ color: T.text }}>total_count:</strong> {String(pageData.total_count)}</div>
                {pageData.current_page !== undefined && <div style={{ fontSize: 12, color: T.text2 }}><strong style={{ color: T.text }}>current_page:</strong> {String(pageData.current_page)}</div>}
              </>
            )}
          </div>

          {fields.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 8 }}>Forma del primer registro ({fields.length} campos)</div>
              <div style={{ overflow: "auto", border: "1px solid " + T.border, borderRadius: 10 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: T.bg3 }}>
                      <th style={{ textAlign: "left", padding: "8px 10px", color: T.text2, fontWeight: 700, borderBottom: "1px solid " + T.border }}>Campo</th>
                      <th style={{ textAlign: "left", padding: "8px 10px", color: T.text2, fontWeight: 700, borderBottom: "1px solid " + T.border }}>Tipo</th>
                      <th style={{ textAlign: "left", padding: "8px 10px", color: T.text2, fontWeight: 700, borderBottom: "1px solid " + T.border }}>Ejemplo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map(function (k) {
                      var v = firstRecord[k];
                      return (
                        <tr key={k}>
                          <td style={{ padding: "6px 10px", color: T.text, fontFamily: "ui-monospace, Menlo, Consolas, monospace", borderBottom: "1px solid " + T.border + "60" }}>{k}</td>
                          <td style={{ padding: "6px 10px", color: T.text2, fontFamily: "ui-monospace, Menlo, Consolas, monospace", borderBottom: "1px solid " + T.border + "60" }}>{detectType(v)}</td>
                          <td style={{ padding: "6px 10px", color: T.text2, fontFamily: "ui-monospace, Menlo, Consolas, monospace", borderBottom: "1px solid " + T.border + "60", wordBreak: "break-word" }}>{shortValue(v)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 8 }}>
              Primeros {collection ? Math.min(50, collection.length) : 0} registros
            </div>
            <pre style={pre}>
              {collection
                ? JSON.stringify(collection.slice(0, 50), null, 2)
                : JSON.stringify(data, null, 2).slice(0, 4000)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
