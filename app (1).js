(function () {
  if (window.top === window.self) { var s = document.getElementById("antiClickjack"); if (s && s.parentNode) s.parentNode.removeChild(s); }
  else { try { window.top.location = window.self.location; } catch (e) {} }
})();
function T(s) { return String(s == null ? "" : s).trim(); }
function U(s) { return T(s).toUpperCase(); }
function esc(s) { return T(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function num(s) {
  var t = T(s).replace(/[^\d,.\-]/g, "");
  if (!t || t === "-") return null;
  t = t.replace(/\./g, "").replace(",", ".");
  var v = parseFloat(t);
  return isNaN(v) ? null : v;
}
function n(x, d) { d = d || 0; return x.toLocaleString("vi-VN", { minimumFractionDigits: d, maximumFractionDigits: d }); }
function vnd(x) { return n(Math.round(x)) + "đ"; }
function pct(x) { return n(x * 100, 1) + "%"; }
function $(id) { return document.getElementById(id); }
function sentence(s) {
  var t = T(s).replace(/^[^A-Za-zÀ-ỹ0-9]+/, "").toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function parse(rows) {
  var m = {};
  function find(pred) { for (var i = 0; i < rows.length; i++) { if (pred(rows[i] || [])) return i; } return -1; }
  function after(label) { var j = find(function (r) { return U(r[1]) === label; }); return j >= 0 ? (rows[j + 1] || null) : null; }
  var d = find(function (r) { return U(r[2]) === "TỪ NGÀY"; });
  m.from = d >= 0 ? T(rows[d][3]) : "";
  m.to = d >= 0 ? T(rows[d][5]) : "";
  m.fin = after("TỔNG DOANH THU");
  m.funnel = after("TỔNG MESS");
  m.cpa = after("CP / MESS");
  m.conv = after("TỶ LỆ DATA / MESS");
  m.svc = [];
  var h = find(function (r) { return U(r[1]) === "DỊCH VỤ" && U(r[2]).indexOf("CHI TIÊU") === 0; });
  if (h >= 0) for (var k = h + 1; k < rows.length; k++) {
    var r = rows[k] || [];
    if (!T(r[1]) || U(r[1]).indexOf("GHI CHÚ") === 0) break;
    m.svc.push(r);
  }
  m.roi = [];
  var g = find(function (r) { return U(r[1]) === "DỊCH VỤ" && U(r[2]).indexOf("DOANH THU") === 0; });
  if (g >= 0) for (var q = g + 1; q < rows.length; q++) {
    var s = rows[q] || [];
    if (!T(s[1]) || U(s[1]) === "TỔNG") break;
    m.roi.push(s);
  }
  m.bott = [];
  rows.forEach(function (r) {
    r = r || [];
    if (T(r[1]).indexOf("→") > 0 && T(r[3])) m.bott.push(r);
  });
  var v = find(function (r) { return U(r[1]).indexOf("6.1") === 0; });
  m.verdict = v >= 0 && rows[v + 1] ? T(rows[v + 1][1]) : "";
  return m;
}

function render(m, meta) {
  var f = m.fin, fu = m.funnel, out = [];
  $("period").textContent = (m.from ? m.from.slice(0, 5) : "") + " – " + m.to;

  var rev = num(f[1]), ads = num(f[2]), adsfee = num(f[5]);
  var heroSplit = "";
  if (rev != null && ads != null && adsfee != null && rev > 0) {
    var fee = Math.max(adsfee - ads, 0);
    var rest = Math.max(rev - ads - fee, 0);
    var base = Math.max(rev, ads + fee);
    var parts = [
      { k: "Chi phí ads", v: ads, c: "var(--ads)" },
      { k: "Phí ngân hàng", v: fee, c: "#F2C14E" },
      { k: "Còn lại sau ads", v: rest, c: "var(--good)" }
    ];
    heroSplit = '<div><div class="split" role="img" aria-label="Cơ cấu doanh thu: chi phí ads, phí ngân hàng, phần còn lại">' +
      parts.map(function (p) { return '<i style="flex:' + (p.v / base * 100).toFixed(3) + ' 1 0;background:' + p.c + '"></i>'; }).join("") +
      '</div><div class="legend">' +
      parts.map(function (p) { return '<div><span class="dot" style="background:' + p.c + '"></span><span>' + p.k + '</span><span>' + vnd(p.v) + '</span></div>'; }).join("") +
      '</div></div>';
  }
  out.push('<div class="hero"><div><div class="eyebrow">Tổng doanh thu</div><div class="big">' + esc(f[1]) + '</div></div>' +
    '<div class="hero-stats"><div><div class="eyebrow">ROAS</div><div class="v">' + esc(f[3]) + '</div></div>' +
    '<div><div class="eyebrow">Ads / doanh thu</div><div class="v">' + esc(f[4]) + '</div></div></div>' + heroSplit + '</div>');

  out.push('<section class="card"><div class="eyebrow">Lõi tài chính</div><div class="rows">' +
    [["Tổng chi phí ads", f[2]], ["Chi phí ads + phí ngân hàng", f[5]], ["Ads / doanh thu thực tế", f[6]]].map(function (r) {
      return '<div class="row"><span class="k">' + r[0] + '</span><span class="v">' + esc(r[1]) + '</span></div>';
    }).join("") + '</div></section>');

  var mess = num(fu[1]) || 0, data = num(fu[2]) || 0, appts = num(fu[3]) || 0, arrived = num(fu[5]) || 0;
  function ratio(a, b) { return b > 0 ? pct(a / b) : "-"; }
  var stages = [
    { name: "Mess", v: mess, note: "Tổng tin nhắn" },
    { name: "Data", v: data, note: ratio(data, mess) + " so với mess" },
    { name: "Lịch hẹn", v: appts, note: ratio(appts, data) + " so với data" },
    { name: "Khách đến", v: arrived, note: ratio(arrived, appts) + " so với lịch hẹn", ok: true }
  ];
  out.push('<section class="card"><div class="eyebrow">Phễu sản lượng</div><div class="funnel">' + stages.map(function (s) {
    var w = mess > 0 ? Math.max(s.v / mess * 100, 1.5) : 1.5;
    return '<div class="stage"><div class="top"><span class="name">' + s.name + '</span><span class="num">' + n(s.v) + '</span></div>' +
      '<div class="track"><i class="' + (s.ok ? "ok" : "") + '" style="width:' + w.toFixed(2) + '%"></i></div><div class="note">' + s.note + '</div></div>';
  }).join("") + '</div></section>');

  if (m.cpa) {
    out.push('<section class="card"><div class="eyebrow">Chi phí trên mỗi kết quả</div><div class="grid">' +
      [["CP / mess", m.cpa[1]], ["CP / data", m.cpa[2]], ["CP / hẹn", m.cpa[3]], ["CP / khách đến", m.cpa[4]]].map(function (r) {
        return '<div class="tile"><div class="k">' + r[0] + '</div><div class="v">' + esc(r[1]) + '</div></div>';
      }).join("") + '</div></section>');
  }

  if (m.conv) {
    var names = ["Data / mess", "Hẹn / data", "Đến / hẹn"];
    var lost = Math.max(appts - arrived, 0);
    out.push('<section class="card"><div class="eyebrow">Tỷ lệ chuyển đổi</div><div class="conv">' + names.map(function (nm, i) {
      var val = m.conv[i + 1], p = num(val) || 0, b = m.bott[i], pill = "";
      if (b) {
        var bad = U(b[3]).indexOf("NGHẼN") >= 0;
        pill = '<span class="pill ' + (bad ? "warn" : "good") + '">' + (bad ? "Điểm nghẽn lớn nhất" : esc(b[3])) + '</span>';
      }
      return '<div><div class="top"><span class="l"><span>' + nm + '</span>' + pill + '</span><b>' + esc(val) + '</b></div>' +
        '<div class="track"><i class="' + (pill.indexOf("warn") >= 0 ? "warn" : "") + '" style="width:' + Math.min(p, 100).toFixed(2) + '%"></i></div></div>';
    }).join("") + '<div class="row" style="border-top:1px solid var(--line);padding-top:12px"><span class="k">Khách rớt (hẹn nhưng không đến)</span><span class="v">' + n(lost) + ' khách</span></div></div></section>');
  }

  var active = [], idle = [], other = null;
  m.svc.forEach(function (r) {
    var name = U(r[1]);
    if (name === "TỔNG CỘNG") return;
    var ads2 = num(r[2]), rev2 = num(r[7]);
    if (name === "KHÁC") { other = r; return; }
    if ((ads2 || 0) > 0 || (rev2 || 0) > 0) active.push(r); else idle.push(T(r[1]));
  });
  active.sort(function (a, b) { return (num(b[7]) || 0) - (num(a[7]) || 0); });
  if (active.length || idle.length || other) {
    var cards = active.map(function (r) {
      var roi = m.roi.filter(function (x) { return U(x[1]) === U(r[1]); })[0];
      var grade = roi ? T(roi[5]) : "", gc = "";
      if (U(grade).indexOf("CAO") >= 0) gc = "good"; else if (U(grade).indexOf("CẢI THIỆN") >= 0) gc = "warn";
      var adsPct = num(r[9]), over = adsPct != null && adsPct > 100;
      return '<div class="svc"><div class="svc-h"><b>' + esc(r[1]) + '</b>' + (grade ? '<span class="pill ' + gc + '">' + esc(sentence(grade)) + '</span>' : '') + '</div>' +
        '<div class="svc-k"><div><div class="k">Doanh thu</div><div class="v">' + esc(T(r[7]).replace(/\s*đ$/, "")) + 'đ</div></div>' +
        '<div><div class="k">Chi ads</div><div class="v">' + esc(r[2]) + 'đ</div></div>' +
        '<div><div class="k">ROAS</div><div class="v">' + esc(roi ? roi[4] : "-") + '</div></div></div>' +
        '<div class="svc-sub"><span>Mess <b>' + esc(r[3]) + '</b></span><span>Data <b>' + esc(r[4]) + '</b></span><span>Hẹn <b>' + esc(r[5]) + '</b></span><span>Đến <b>' + esc(r[6]) + '</b></span><span>Ads/DT <b class="' + (over ? "bad" : "") + '">' + esc(r[9]) + '</b></span></div></div>';
    }).join("");
    var notes = [];
    if (other && num(other[7])) notes.push('Doanh thu không chạy ads (khác): <b>' + esc(T(other[7]).replace(/\s*đ$/, "")) + 'đ</b>');
    if (idle.length) notes.push('Chưa phát sinh ads: ' + idle.map(function (x) { return esc(sentence(x)); }).join(", "));
    out.push('<section class="card"><div class="eyebrow">Chi tiết dịch vụ</div>' + cards +
      (notes.length ? '<div class="small">' + notes.join("<br>") + '</div>' : '') + '</section>');
  }

  if (m.verdict) out.push('<section class="card"><div class="eyebrow">Nhận định từ sheet</div><p class="verdict">' + esc(m.verdict) + '</p></section>');

  $("app").innerHTML = out.join("");
}

function setStatus(kind, text) {
  $("sdot").className = "sdot " + (kind === "live" ? "live" : kind === "stale" ? "stale" : "");
  $("stxt").textContent = text;
}
function hhmm(ts) { return new Date(ts).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false }); }
function showBanner(text, btnLabel, onClick) {
  var b = $("banner");
  b.className = "banner"; b.hidden = false;
  b.innerHTML = '<span>' + esc(text) + '</span>' + (btnLabel ? '<button type="button" id="bannerBtn">' + esc(btnLabel) + '</button>' : '');
  if (btnLabel) $("bannerBtn").addEventListener("click", onClick);
}
function hideBanner() { $("banner").hidden = true; $("banner").innerHTML = ""; }
function dmy2iso(s) { var p = T(s).split("/"); return p.length === 3 ? p[2] + "-" + ("0" + p[1]).slice(-2) + "-" + ("0" + p[0]).slice(-2) : ""; }
function iso2dmy(s) { var p = s.split("-"); return p[2] + "/" + p[1] + "/" + p[0]; }
function serial(iso) { var p = iso.split("-"); return Math.round((Date.UTC(+p[0], +p[1] - 1, +p[2]) - Date.UTC(1899, 11, 30)) / 86400000); }
function isoOf(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
function presets() {
  var t = new Date(), y = t.getFullYear(), mo = t.getMonth(), q = Math.floor(mo / 3) * 3;
  return [
    ["Hôm nay", isoOf(t), isoOf(t)],
    ["7 ngày qua", isoOf(new Date(y, mo, t.getDate() - 6)), isoOf(t)],
    ["Tháng này", isoOf(new Date(y, mo, 1)), isoOf(new Date(y, mo + 1, 0))],
    ["Tháng trước", isoOf(new Date(y, mo - 1, 1)), isoOf(new Date(y, mo, 0))],
    ["Quý này", isoOf(new Date(y, q, 1)), isoOf(new Date(y, q + 3, 0))]
  ];
}

var curRange = null, lastGood = null, busy = false;
/* ---- Kết nối Google Sheets (chạy trong trình duyệt) ---- */
var CFG = window.DORIAS_CONFIG || {};
var SHEETS = "https://sheets.googleapis.com/v4/spreadsheets/" + CFG.SHEET_ID;
var TZ = "Asia/Ho_Chi_Minh";
var SCOPE_R = "https://www.googleapis.com/auth/spreadsheets.readonly";
var SCOPE_W = "https://www.googleapis.com/auth/spreadsheets";
var IDLE_MS = 30 * 60 * 1000;
var auth = { token: "", exp: 0, client: null, wtoken: "", wexp: 0, wclient: null, wwait: null };
try { localStorage.removeItem("dorias_tok"); } catch (e) {}
try { var saved = JSON.parse(sessionStorage.getItem("dorias_tok") || "null"); if (saved && saved.exp > Date.now()) { auth.token = saved.t; auth.exp = saved.exp; } } catch (e) {}
function writeOk() { return !!auth.wtoken && auth.wexp > Date.now(); }
function anyToken() { return writeOk() ? auth.wtoken : (auth.token && auth.exp > Date.now() ? auth.token : ""); }
function authOk() { return !!anyToken(); }
function saveTok() { try { sessionStorage.setItem("dorias_tok", JSON.stringify({ t: auth.token, exp: auth.exp })); } catch (e) {} }
function clearTok() { auth.token = ""; auth.exp = 0; auth.wtoken = ""; auth.wexp = 0; try { sessionStorage.removeItem("dorias_tok"); localStorage.removeItem("dorias_tok"); } catch (e) {} }
function wipeData() {
  lastGood = lastDay = monthData = apptData = teleData = svcData = todayData = null;
  ["app", "appDay", "appMonth", "appAppt", "appTele", "appSvc", "appToday"].forEach(function (id) { var el = $(id); if (el) el.innerHTML = ""; });
  var bn = $("banner"); if (bn) { bn.hidden = true; bn.innerHTML = ""; }
}

function httpErr(status, body) {
  var e = new Error((body && body.error && body.error.message) || ("HTTP " + status));
  e.status = status; return e;
}
function sheetsCall(path, opt) {
  opt = opt || {};
  var tok = opt.write ? (writeOk() ? auth.wtoken : "") : anyToken();
  if (!tok) { showLogin(""); var e0 = new Error("Cần đăng nhập lại."); e0.status = 401; return Promise.reject(e0); }
  return fetch(SHEETS + path, {
    method: opt.method || "GET",
    headers: Object.assign({ Authorization: "Bearer " + tok }, opt.body ? { "Content-Type": "application/json" } : {}),
    body: opt.body ? JSON.stringify(opt.body) : undefined,
    credentials: "omit", referrerPolicy: "no-referrer", cache: "no-store"
  }).then(function (r) {
    return r.json().catch(function () { return {}; }).then(function (j) {
      if (r.status === 401) { clearTok(); showLogin("Phiên đăng nhập đã hết hạn."); }
      if (!r.ok) throw httpErr(r.status, j);
      return j;
    });
  });
}
function getVals(range) {
  return sheetsCall("/values/" + encodeURIComponent(range) + "?valueRenderOption=FORMATTED_VALUE").then(function (j) { return j.values || []; });
}
var WRITE_OK = { "TONG_QUAN!D4": 1, "TONG_QUAN!F4": 1, "'BÁO CÁO THEO NGÀY'!C4": 1 };
function chkIso(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s || "") && +s.slice(0, 4) >= 2020 && +s.slice(0, 4) <= 2040 && !isNaN(Date.parse(s)); }
function ensureWrite() {
  if (writeOk()) return Promise.resolve();
  if (!gisReady() || !CFG.CLIENT_ID) return Promise.reject(new Error("Chưa tải được dịch vụ đăng nhập Google, thử lại sau vài giây."));
  return new Promise(function (resolve, reject) {
    auth.wwait = { resolve: resolve, reject: reject };
    if (!auth.wclient) {
      auth.wclient = google.accounts.oauth2.initTokenClient({
        client_id: CFG.CLIENT_ID, scope: SCOPE_W,
        callback: function (r) {
          var w = auth.wwait; auth.wwait = null;
          if (!r || r.error || !r.access_token) { if (w) { var e = new Error("Chưa được cấp quyền chỉnh sửa sheet, nên chưa đổi được kỳ báo cáo."); e.status = 0; w.reject(e); } return; }
          auth.wtoken = r.access_token; auth.wexp = Date.now() + (Number(r.expires_in || 3600) - 120) * 1000;
          if (w) w.resolve();
        },
        error_callback: function () { var w = auth.wwait; auth.wwait = null; if (w) { var e = new Error("Cửa sổ xin quyền bị đóng hoặc bị chặn. Cho phép cửa sổ bật lên rồi thử lại."); e.status = 0; w.reject(e); } }
      });
    }
    auth.wclient.requestAccessToken({ prompt: "" });
  });
}
function putCells(items) {
  var okShape = items.length > 0 && items.every(function (it) {
    return WRITE_OK[it.range] === 1 && it.values && it.values.length === 1 && it.values[0].length === 1 && typeof it.values[0][0] === "number" && isFinite(it.values[0][0]) && it.values[0][0] > 40000 && it.values[0][0] < 60000;
  });
  if (!okShape) { var e0 = new Error("Yêu cầu ghi không hợp lệ."); e0.status = 0; return Promise.reject(e0); }
  return ensureWrite().then(function () {
    return sheetsCall("/values:batchUpdate", { method: "POST", write: true, body: { valueInputOption: "RAW", data: items } });
  }).catch(function (e) {
    if (e && e.status === 403) { var e2 = new Error("Tài khoản này chỉ có quyền xem sheet nên không đổi được kỳ báo cáo. Nhờ chủ sheet cấp quyền chỉnh sửa."); e2.status = 0; throw e2; }
    throw e;
  });
}

/* ---- Tiện ích chuẩn hoá (cùng logic với bản Apps Script) ---- */
function sNorm(s) {
  return String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toUpperCase().replace(/\s+/g, " ").trim();
}
function sNum(v) {
  if (typeof v === "number") return v;
  var t = String(v == null ? "" : v).trim();
  if (!t || t === "-") return 0;
  var neg = /^\(.*\)$/.test(t) || t.charAt(0) === "-";
  t = t.replace(/[^\d,.]/g, "").replace(/\./g, "").replace(",", ".");
  var x = parseFloat(t);
  return isNaN(x) ? 0 : (neg ? -x : x);
}
function dnum(y, m, d) { return Math.round(Date.UTC(y, m - 1, d) / 86400000); }
function dnIso(k) { return new Date(k * 86400000).toISOString().slice(0, 10); }
function dnDmy(k) { var s = dnIso(k).split("-"); return s[2] + "/" + s[1] + "/" + s[0]; }
function todayNum() {
  var p = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()).split("-");
  return dnum(+p[0], +p[1], +p[2]);
}
function ymdOf(v) {
  var t = String(v == null ? "" : v).trim();
  if (!t) return null;
  var iso = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return { y: +iso[1], m: +iso[2], d: +iso[3] };
  var k = t.match(/(?<!\d)(\d{1,2})\s*[\/\-.]\s*(\d{1,2})(?!\d)(?:\s*[\/\-.]\s*(\d{2,4}))?/);
  if (!k) return null;
  var y = k[3] ? +k[3] : 0;
  if (y && y < 100) y += 2000;
  return { y: y, m: +k[2], d: +k[1] };
}
function parseAppt(v, lead, fallbackYear) {
  var p = ymdOf(v);
  if (!p || p.m < 1 || p.m > 12 || p.d < 1 || p.d > 31) return null;
  var y = p.y;
  if (!y) {
    y = lead ? lead.y : fallbackYear;
    if (lead && dnum(y, p.m, p.d) < dnum(lead.y, lead.m, lead.d) - 14) y++;
  }
  var k = dnum(y, p.m, p.d), c = new Date(k * 86400000);
  if (c.getUTCDate() !== p.d || c.getUTCMonth() !== p.m - 1) return null;
  return k;
}

/* ---- Các hàm dữ liệu (thay cho Code.gs) ---- */
var API = {
  getData: function () { return getVals("TONG_QUAN!A1:L80").then(function (rows) { return { rows: rows, ts: Date.now() }; }); },
  getDay: function () { return getVals("'BÁO CÁO THEO NGÀY'!A1:P45").then(function (rows) { return { rows: rows, ts: Date.now() }; }); },
  setRange: function (a, b) {
    if (!chkIso(a) || !chkIso(b) || a > b) return Promise.reject(new Error("Ngày không hợp lệ."));
    return putCells([{ range: "TONG_QUAN!D4", values: [[serial(a)]] }, { range: "TONG_QUAN!F4", values: [[serial(b)]] }]).then(API.getData);
  },
  setDay: function (iso) {
    if (!chkIso(iso)) return Promise.reject(new Error("Ngày không hợp lệ."));
    return putCells([{ range: "'BÁO CÁO THEO NGÀY'!C4", values: [[serial(iso)]] }]).then(API.getDay);
  },
  getMonthly: function () {
    return getVals("THEO_DOI_THEO_THANG!A1:Q60").then(function (vals) {
      var months = [], total = null;
      vals.forEach(function (r) {
        var label = String(r[1] || "").trim();
        if (/^T\d{1,2}-\d{4}$/.test(label)) {
          months.push({
            label: label, from: String(r[2] || ""), to: String(r[3] || ""),
            potential: sNum(r[4]), invoices: sNum(r[5]), booked: sNum(r[6]), consulted: sNum(r[7]), untouched: sNum(r[8]),
            canceled: sNum(r[9]), dropped: sNum(r[10]), abandoned: sNum(r[11]), leads: sNum(r[12]), revenue: sNum(r[13]), ads: sNum(r[14])
          });
        } else if (sNorm(label) === "TONG CONG") {
          total = { leads: sNum(r[12]), invoices: sNum(r[5]), revenue: sNum(r[13]), ads: sNum(r[14]) };
        }
      });
      return { months: months, sheetTotal: total, ts: Date.now() };
    });
  },
  getAppointments: function (fromIso, toIso) {
    return getVals("DATA_SALE!A2:N6000").then(function (vals) {
      var f = fromIso.split("-"), t = toIso.split("-");
      var a = dnum(+f[0], +f[1], +f[2]), b = dnum(+t[0], +t[1], +t[2]);
      if (a > b) throw new Error("Ngày bắt đầu phải trước ngày kết thúc.");
      var today = todayNum(), year = +dnIso(today).slice(0, 4);
      var all = [], noDate = 0, farFuture = 0;
      vals.forEach(function (r) {
        var s = sNorm(r[10]);
        var key = s === "HOA DON" ? "inv" : s === "DAT HEN" ? "booked" : s === "ROT" ? "drop" : (s === "HUY LICH" || s === "HUY") ? "cancel" : null;
        if (!key) return;
        var lp = ymdOf(r[1]), lead = lp && lp.y ? lp : null;
        var k = parseAppt(r[11], lead, year);
        if (k === null) { if (key === "booked" && lead && today - dnum(lead.y, lead.m, lead.d) <= 90) noDate++; return; }
        if (key === "booked" && lead && k - dnum(lead.y, lead.m, lead.d) > 60) farFuture++;
        all.push({
          n: k, date: dnDmy(k), iso: dnIso(k), time: String(r[12] || "").trim(), service: String(r[5] || "").trim(),
          name: String(r[6] || "").trim(), phone: String(r[7] || "").trim(), tele: String(r[2] || "").trim(),
          page: String(r[3] || "").trim(), source: String(r[4] || "").trim(), note: String(r[13] || "").trim(),
          st: key === "booked" ? (k < today ? "overdue" : "wait") : key
        });
      });
      all.sort(function (x, y) { return x.n - y.n || (x.time < y.time ? -1 : x.time > y.time ? 1 : 0); });
      var items = all.filter(function (x) { return x.n >= a && x.n <= b; });
      var cnt = { inv: 0, wait: 0, overdue: 0, drop: 0, cancel: 0 }, byDay = {}, bySvc = {}, byTele = {};
      items.forEach(function (x) {
        cnt[x.st]++;
        var d = byDay[x.iso] || (byDay[x.iso] = { iso: x.iso, date: x.date, total: 0, inv: 0 }); d.total++; if (x.st === "inv") d.inv++;
        var sv = x.service || "Chưa rõ", sg = bySvc[sv] || (bySvc[sv] = { name: sv, total: 0, inv: 0 }); sg.total++; if (x.st === "inv") sg.inv++;
        var tl = x.tele || "Chưa rõ", tg = byTele[tl] || (byTele[tl] = { name: tl, total: 0, inv: 0 }); tg.total++; if (x.st === "inv") tg.inv++;
      });
      function list(o) { return Object.keys(o).map(function (k) { return o[k]; }); }
      var decided = cnt.inv + cnt.drop + cnt.cancel + cnt.overdue;
      function rate(x, y) { return y > 0 ? x / y : null; }
      function upcoming(day) { return all.filter(function (x) { return x.n === day && x.st === "wait"; }).slice(0, 40); }
      return {
        from: fromIso, to: toIso, today: dnDmy(today),
        summary: { total: items.length, inv: cnt.inv, wait: cnt.wait, overdue: cnt.overdue, drop: cnt.drop, cancel: cnt.cancel, decided: decided,
          closeRate: rate(cnt.inv, decided), dropRate: rate(cnt.drop, decided), cancelRate: rate(cnt.cancel, decided) },
        byDay: list(byDay).sort(function (x, y) { return x.iso < y.iso ? -1 : 1; }),
        byService: list(bySvc).sort(function (x, y) { return y.total - x.total; }),
        byTele: list(byTele).sort(function (x, y) { return y.total - x.total; }),
        items: items.slice(0, 300), truncated: items.length > 300,
        upcoming: { today: upcoming(today), tomorrow: upcoming(today + 1) },
        checks: { noDate: noDate, farFuture: farFuture }, ts: Date.now()
      };
    });
  }
};
function run(fn, args) {
  try { return Promise.resolve(API[fn].apply(null, args || [])); } catch (e) { return Promise.reject(e); }
}
function errText(err) {
  var st = err && err.status, s = String((err && err.message) || err || "");
  if (st === 403) return "Tài khoản này chưa được chia sẻ file sheet DORIAS. Nhờ chủ sheet chia sẻ cho email của bạn.";
  if (st === 404) return "Không tìm thấy file sheet. Kiểm tra lại SHEET_ID trong config.js.";
  if (st === 429) return "Google đang giới hạn số lần đọc. Thử lại sau ít phút.";
  if (st === 400 && /Unable to parse range/i.test(s)) return "Không tìm thấy một tab trong sheet. Tab có thể đã bị đổi tên.";
  return s || "Có lỗi không xác định.";
}

/* ---- Đăng nhập Google ---- */
function showLogin(msg) {
  wipeData();
  $("login").hidden = false;
  $("loginMsg").textContent = msg || "";
  $("signout").hidden = true;
}
function hideLogin() { $("login").hidden = true; $("signout").hidden = false; }
function gisReady() { return window.google && google.accounts && google.accounts.oauth2; }
function initAuthClient() {
  if (auth.client || !gisReady()) return !!auth.client;
  auth.client = google.accounts.oauth2.initTokenClient({
    client_id: CFG.CLIENT_ID, scope: SCOPE_R,
    callback: function (r) {
      $("loginBtn").disabled = false;
      if (!r || r.error || !r.access_token) { $("loginMsg").textContent = "Chưa đăng nhập được. Bấm lại và chọn đúng tài khoản được chia sẻ sheet."; return; }
      auth.token = r.access_token; auth.exp = Date.now() + (Number(r.expires_in || 3600) - 120) * 1000; saveTok();
      hideLogin(); load();
    },
    error_callback: function () { $("loginBtn").disabled = false; $("loginMsg").textContent = "Cửa sổ đăng nhập bị đóng hoặc bị chặn. Cho phép cửa sổ bật lên rồi bấm lại."; }
  });
  return true;
}
function startLogin() {
  if (!CFG.CLIENT_ID || /DAN_CLIENT_ID/.test(CFG.CLIENT_ID)) { $("loginMsg").textContent = "Chưa điền CLIENT_ID trong file config.js."; return; }
  if (!initAuthClient()) { $("loginMsg").textContent = "Đang tải dịch vụ đăng nhập Google, thử lại sau vài giây."; return; }
  $("loginBtn").disabled = true; $("loginMsg").textContent = "";
  auth.client.requestAccessToken({ prompt: "" });
}
function signOut() {
  var ts = [auth.token, auth.wtoken].filter(function (t) { return !!t; });
  clearTok();
  try { if (gisReady()) ts.forEach(function (t) { google.accounts.oauth2.revoke(t, function () {}); }); } catch (e) {}
  showLogin("Đã đăng xuất.");
}

function show(res) {
  var m = parse(res.rows);
  if (!m.fin || !m.funnel) {
    showBanner("Không tìm thấy các khối số liệu trong tab TONG_QUAN. Nếu bạn vừa đổi bố cục sheet, hãy cập nhật lại app.");
    return;
  }
  lastGood = { m: m, ts: res.ts };
  curRange = { from: m.from, to: m.to };
  hideBanner(); render(m); updatePeriodText();
  if (view === "tong") setStatus("live", "Đồng bộ với Google Sheets lúc " + hhmm(res.ts) + ". Tự làm mới mỗi phút.");
}
function loadTong() {
  if (busy) return;
  busy = true;
  run("getData").then(function (res) { show(res); })
    .catch(function (err) {
      showBanner("Không tải được số liệu. " + errText(err));
      if (lastGood) setStatus("stale", "Mất kết nối tạm thời. Đang giữ số liệu lúc " + hhmm(lastGood.ts) + ".");
      else setStatus("stale", "Chưa tải được số liệu.");
    })
    .then(function () { busy = false; $("refresh").disabled = false; $("refresh").textContent = "Làm mới"; });
}
function applyRange() {
  var a = $("dFrom").value, b = $("dTo").value, msg = $("rangeMsg");
  if (!a || !b) { msg.textContent = "Chọn đủ cả hai ngày."; return; }
  if (a > b) { msg.textContent = "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc."; return; }
  $("apply").disabled = true;
  msg.textContent = "Đang ghi vào sheet và tính lại…";
  run("setRange", [a, b]).then(function (res) {
    show(res);
    if (lastGood && lastGood.m.from === iso2dmy(a) && lastGood.m.to === iso2dmy(b)) {
      msg.textContent = "";
      $("range").hidden = true;
      $("period").setAttribute("aria-expanded", "false");
    } else {
      msg.textContent = "Sheet chưa tính xong, đang tải lại…";
      setTimeout(load, 3000);
    }
  }).catch(function (err) { msg.textContent = errText(err); })
    .then(function () { $("apply").disabled = false; });
}
function initUi() {
  var btn = $("period");
  btn.disabled = false; btn.className += " menu";
  btn.setAttribute("aria-expanded", "false"); btn.setAttribute("aria-controls", "range");
  btn.addEventListener("click", function () {
    var p = view === "ngay" ? $("dayPanel") : view === "lich" ? $("apptPanel") : view === "tele" ? $("telePanel") : view === "svc" ? $("svcPanel") : $("range"), open = p.hidden;
    p.hidden = !open;
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    if (open && view === "tong" && curRange) { $("dFrom").value = dmy2iso(curRange.from); $("dTo").value = dmy2iso(curRange.to); $("rangeMsg").textContent = ""; }
    if (open && view === "ngay" && lastDay) { $("dDay").value = dmy2iso(lastDay.m.date); $("dayMsg").textContent = ""; }
    if (open && view === "lich" && curAppt) { $("aFrom").value = curAppt.from; $("aTo").value = curAppt.to; $("apptMsg").textContent = ""; }
    if (open && view === "svc" && curSvc) { $("sFrom").value = curSvc.from; $("sTo").value = curSvc.to; $("svcMsg").textContent = ""; }
    if (open && view === "tele" && curTele) { $("tFrom").value = curTele.from; $("tTo").value = curTele.to; $("teleMsg").textContent = ""; }
  });
  $("presets").innerHTML = presets().map(function (p, i) { return '<button type="button" class="chip" data-i="' + i + '">' + p[0] + '</button>'; }).join("");
  $("presets").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-i]");
    if (!b) return;
    var p = presets()[+b.getAttribute("data-i")];
    $("dFrom").value = p[1]; $("dTo").value = p[2]; $("rangeMsg").textContent = "";
  });
  $("apply").addEventListener("click", applyRange);
  $("refresh").hidden = false;
  $("refresh").addEventListener("click", function () { $("refresh").disabled = true; $("refresh").textContent = "Đang làm mới…"; load(); });
}
/* ---- Trang "Theo ngày": tab BÁO CÁO THEO NGÀY ---- */
var view = "tong", lastDay = null, busyDay = false, writingDay = false;
function clean(s) { var t = T(s); return !t || t.charAt(0) === "#" ? "-" : t; }
function weekday(dmy) {
  var p = T(dmy).split("/");
  if (p.length !== 3) return "";
  var d = new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
  return ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"][d.getDay()];
}
function parseDay(rows) {
  var d = {};
  function find(pred, from) { for (var i = from || 0; i < rows.length; i++) { if (pred(rows[i] || [])) return i; } return -1; }
  var di = find(function (r) { return U(r[1]) === "CHỌN NGÀY BÁO CÁO"; });
  d.date = di >= 0 ? T(rows[di][2]) : "";
  var oi = find(function (r) { return U(r[1]) === "TỔNG CHI TIÊU"; });
  d.ov = oi >= 0 ? (rows[oi + 1] || null) : null;
  var h1 = find(function (r) { return U(r[1]) === "DỊCH VỤ" && U(r[2]).indexOf("CHI TIÊU") === 0; });
  d.svc = []; d.total = null;
  if (h1 >= 0) for (var k = h1 + 1; k < rows.length; k++) {
    var r = rows[k] || [];
    if (!T(r[1])) break;
    if (U(r[1]) === "TỔNG CỘNG") { d.total = r; break; }
    d.svc.push(r);
  }
  d.mk = [];
  var mi = find(function (r) { return U(r[1]).indexOf("THỊ TRƯỜNG VIỆT NAM") > 0; });
  if (mi >= 0) {
    var mo = find(function (r) { return U(r[1]) === "CHI TIÊU"; }, mi);
    var mh = find(function (r) { return U(r[1]) === "DỊCH VỤ"; }, mi);
    [[1, "Việt Nam"], [9, "Việt kiều"]].forEach(function (c) {
      var o = c[0], ro = mo >= 0 ? (rows[mo + 1] || []) : [], items = [];
      if (mh >= 0) for (var q = mh + 1; q < rows.length; q++) {
        var s = rows[q] || [];
        if (!T(s[o])) break;
        if (U(s[o]) === "TỔNG CỘNG") break;
        items.push({ name: T(s[o]), spend: s[o + 1], mess: s[o + 2], data: s[o + 3], cpd: s[o + 4], rate: s[o + 5], st: s[o + 6] });
      }
      d.mk.push({
        name: c[1], items: items,
        ov: { spend: ro[o], mess: ro[o + 1], data: ro[o + 2], rate: ro[o + 3], cpd: ro[o + 4], cpm: ro[o + 5], run: ro[o + 6] }
      });
    });
  }
  return d;
}
function kv(label, val) { return '<div class="row"><span class="k">' + label + '</span><span class="v">' + esc(clean(val)) + '</span></div>'; }
function renderDay(d) {
  var o = d.ov, out = [];
  out.push('<div class="daynav"><button type="button" class="chip" data-d="-1">‹ Hôm trước</button><button type="button" class="chip" data-d="1">Hôm sau ›</button></div>');
  out.push('<div class="hero"><div><div class="eyebrow">' + esc(weekday(d.date)) + ' · tổng chi tiêu</div><div class="big">' + esc(clean(o[1])) + '</div></div>' +
    '<div class="hero-stats cols3">' +
    '<div><div class="eyebrow">Mess</div><div class="v">' + esc(clean(o[2])) + '</div></div>' +
    '<div><div class="eyebrow">Data</div><div class="v">' + esc(clean(o[3])) + '</div></div>' +
    '<div><div class="eyebrow">Data / mess</div><div class="v">' + esc(clean(o[4])) + '</div></div></div></div>');
  out.push('<section class="card"><div class="eyebrow">Chi phí hôm nay</div><div class="rows">' +
    kv("CP / data", o[5]) + kv("CP / mess", o[6]) + kv("Dịch vụ đang chạy", o[7]) + '</div></section>');

  var run = [], idle = [];
  d.svc.forEach(function (r) {
    if (U(r[7]).indexOf("ĐANG CHẠY") >= 0) run.push(r);
    else if (idle.indexOf(T(r[1])) < 0) idle.push(T(r[1]));
  });
  var cards = run.map(function (r) {
    return '<div class="svc"><div class="svc-h"><b>' + esc(r[1]) + '</b><span class="pill good">Đang chạy</span></div>' +
      '<div class="svc-k"><div><div class="k">Chi tiêu</div><div class="v">' + esc(clean(r[2])) + '</div></div>' +
      '<div><div class="k">CP / data</div><div class="v">' + esc(clean(r[5])) + '</div></div>' +
      '<div><div class="k">Data / mess</div><div class="v">' + esc(clean(r[6])) + '</div></div></div>' +
      '<div class="svc-sub"><span>Mess <b>' + esc(clean(r[3])) + '</b></span><span>Data <b>' + esc(clean(r[4])) + '</b></span></div></div>';
  }).join("");
  out.push('<section class="card"><div class="eyebrow">Dịch vụ đang chạy hôm nay</div>' +
    (cards || '<div class="small">Hôm nay chưa có dịch vụ nào chạy ads.</div>') +
    (idle.length ? '<div class="small">Không chạy: ' + idle.map(function (x) { return esc(sentence(x)); }).join(", ") + '</div>' : '') + '</section>');

  if (d.mk.length === 2) {
    var defs = [["Chi tiêu", "spend"], ["Mess", "mess"], ["Data", "data"], ["Data / mess", "rate"], ["CP / data", "cpd"], ["CP / mess", "cpm"]];
    var cmp = '<div class="cmp"><span></span><b>' + d.mk[0].name + '</b><b>' + d.mk[1].name + '</b>' +
      defs.map(function (df) {
        return '<span class="k">' + df[0] + '</span>' + d.mk.map(function (mm) { return '<span class="v">' + esc(clean(mm.ov[df[1]])) + '</span>'; }).join("");
      }).join("") + '</div>';
    var lists = d.mk.map(function (mm) {
      var act = mm.items.filter(function (it) { return (num(it.spend) || 0) > 0 || (num(it.mess) || 0) > 0 || (num(it.data) || 0) > 0; });
      return '<div><div class="eyebrow" style="margin-bottom:8px">' + mm.name + '</div>' +
        (act.length ? '<div class="rows">' + act.map(function (it) {
          return '<div class="row"><span class="k">' + esc(sentence(it.name)) + '</span><span class="v">' + esc(clean(it.data)) + ' data · ' + esc(clean(it.spend)) + '</span></div>';
        }).join("") + '</div>' : '<div class="small">Chưa phát sinh hôm nay.</div>') + '</div>';
    }).join("");
    out.push('<section class="card"><div class="eyebrow">Theo thị trường</div>' + cmp + lists + '</section>');
  }
  $("appDay").innerHTML = out.join("");
}
function showDay(res) {
  var d = parseDay(res.rows);
  if (!d.ov) {
    if (view === "ngay") showBanner("Không tìm thấy khối số liệu trong tab BÁO CÁO THEO NGÀY. Nếu bạn vừa đổi bố cục sheet, hãy cập nhật lại app.");
    return;
  }
  lastDay = { m: d, ts: res.ts };
  renderDay(d);
  if (view === "ngay") {
    hideBanner(); updatePeriodText();
    setStatus("live", "Đồng bộ với Google Sheets lúc " + hhmm(res.ts) + ". Tự làm mới mỗi phút.");
  }
}
function loadDay() {
  if (busyDay) return;
  busyDay = true;
  run("getDay").then(showDay)
    .catch(function (err) {
      if (view !== "ngay") return;
      showBanner("Không tải được số liệu. " + errText(err));
      setStatus("stale", lastDay ? "Mất kết nối tạm thời. Đang giữ số liệu lúc " + hhmm(lastDay.ts) + "." : "Chưa tải được số liệu.");
    })
    .then(function () { busyDay = false; $("refresh").disabled = false; $("refresh").textContent = "Làm mới"; });
}
function applyDay(iso, fromPanel) {
  if (writingDay) return;
  writingDay = true;
  var msg = $("dayMsg");
  $("applyDay").disabled = true;
  setStatus("stale", "Đang đổi ngày báo cáo…");
  if (fromPanel) msg.textContent = "Đang ghi vào sheet và tính lại…";
  run("setDay", [iso]).then(function (res) {
    showDay(res);
    if (lastDay && lastDay.m.date === iso2dmy(iso)) {
      msg.textContent = "";
      $("dayPanel").hidden = true;
      $("period").setAttribute("aria-expanded", "false");
    } else {
      setTimeout(load, 3000);
    }
  }).catch(function (err) {
    var t = errText(err);
    if (fromPanel) msg.textContent = t; else showBanner(t);
  }).then(function () { writingDay = false; $("applyDay").disabled = false; });
}
function initDay() {
  $("tabTong").addEventListener("click", function () { setView("tong"); load(); });
  $("tabNgay").addEventListener("click", function () { setView("ngay"); load(); });
  var dp = [["Hôm nay", 0], ["Hôm qua", -1], ["2 ngày trước", -2]];
  $("dayPresets").innerHTML = dp.map(function (p) { return '<button type="button" class="chip" data-o="' + p[1] + '">' + p[0] + '</button>'; }).join("");
  $("dayPresets").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-o]");
    if (!b) return;
    var t = new Date();
    t.setDate(t.getDate() + Number(b.getAttribute("data-o")));
    $("dDay").value = isoOf(t); $("dayMsg").textContent = "";
  });
  $("applyDay").addEventListener("click", function () {
    var v = $("dDay").value;
    if (!v) { $("dayMsg").textContent = "Chọn ngày báo cáo."; return; }
    applyDay(v, true);
  });
  $("appDay").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-d]");
    if (!b || !lastDay) return;
    var p = dmy2iso(lastDay.m.date).split("-");
    var nd = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]) + Number(b.getAttribute("data-d")));
    applyDay(isoOf(nd), false);
  });
}

/* ---- Điều hướng 4 trang ---- */
var VIEWS = { tong: ["tabTong", "app"], ngay: ["tabNgay", "appDay"], thang: ["tabThang", "appMonth"], lich: ["tabLich", "appAppt"], tele: ["tabTele", "appTele"], svc: ["tabSvc", "appSvc"], today: ["tabToday", "appToday"] };
function viewData(v) { return { tong: lastGood, ngay: lastDay, thang: monthData, lich: apptData, tele: teleData, svc: svcData, today: todayData }[v]; }
function setView(v) {
  view = v;
  try { $(VIEWS[v][0]).scrollIntoView({ inline: "nearest", block: "nearest" }); } catch (e) {}
  Object.keys(VIEWS).forEach(function (k) {
    $(VIEWS[k][0]).setAttribute("aria-selected", k === v ? "true" : "false");
    $(VIEWS[k][1]).hidden = k !== v;
  });
  $("range").hidden = true; $("dayPanel").hidden = true; $("apptPanel").hidden = true; $("telePanel").hidden = true; $("svcPanel").hidden = true;
  $("period").setAttribute("aria-expanded", "false");
  $("period").disabled = v === "thang" || v === "today";
  hideBanner(); updatePeriodText();
  if (!viewData(v)) {
    var names = { ngay: "theo ngày", thang: "theo tháng", lich: "lịch hẹn", tele: "tele", svc: "dịch vụ", today: "hôm nay", tong: "tổng quan" };
    if (v !== "tong") $(VIEWS[v][1]).innerHTML = '<section class="card"><div class="small">Đang tải số liệu ' + names[v] + '…</div></section>';
    setStatus("stale", "Đang tải số liệu…");
  } else if (v === "today") {
    setStatus("live", "Đồng bộ với Google Sheets lúc " + hhmm(todayData.ts) + ". Tự làm mới mỗi phút.");
  } else if (v === "svc") {
    setStatus("live", "Đồng bộ với Google Sheets lúc " + hhmm(svcData.ts) + ". Tự làm mới mỗi phút.");
  } else if (v === "tele") {
    setStatus("live", "Đồng bộ với Google Sheets lúc " + hhmm(teleData.ts) + ". Tự làm mới mỗi phút.");
  } else if (v === "thang") {
    setStatus("live", "Đồng bộ với Google Sheets lúc " + hhmm(monthData.ts) + ". Tự làm mới mỗi phút.");
  } else if (v === "lich") {
    setStatus("live", "Đồng bộ với Google Sheets lúc " + hhmm(apptData.ts) + ". Tự làm mới mỗi phút.");
  } else if (v === "ngay") {
    setStatus("live", "Đồng bộ với Google Sheets lúc " + hhmm(lastDay.ts) + ". Tự làm mới mỗi phút.");
  } else {
    setStatus("live", "Đồng bộ với Google Sheets lúc " + hhmm(lastGood.ts) + ". Tự làm mới mỗi phút.");
  }
}
function load() {
  if (view === "ngay") loadDay();
  else if (view === "thang") loadMonth();
  else if (view === "lich") loadAppt();
  else if (view === "tele") loadTele();
  else if (view === "svc") loadSvc();
  else if (view === "today") loadToday();
  else loadTong();
}
function updatePeriodText() {
  var t = "";
  if (view === "tong" && lastGood) t = (lastGood.m.from ? lastGood.m.from.slice(0, 5) : "") + " – " + lastGood.m.to;
  else if (view === "ngay" && lastDay) t = lastDay.m.date;
  else if (view === "thang") t = monthData && monthData.rangeText ? monthData.rangeText : "Theo tháng";
  else if (view === "lich" && curAppt) t = iso2dmy(curAppt.from).slice(0, 5) + " – " + iso2dmy(curAppt.to);
  else if (view === "today") t = dnDmy(todayNum());
  else if (view === "svc" && curSvc) t = iso2dmy(curSvc.from).slice(0, 5) + " – " + iso2dmy(curSvc.to);
  else if (view === "tele" && curTele) t = iso2dmy(curTele.from).slice(0, 5) + " – " + iso2dmy(curTele.to);
  if (t) $("period").textContent = t;
}
function pctS(x) { return (x >= 0 ? "+" : "−") + n(Math.abs(x) * 100, 1) + "%"; }
function dash(x, f) { return x == null || isNaN(x) ? "-" : f(x); }

/* ---- Trang "Theo tháng" ---- */
var monthData = null, busyM = false;
function mcalc(m) {
  return {
    has: m.leads > 0 || m.revenue > 0 || m.ads > 0,
    roas: m.ads > 0 ? m.revenue / m.ads : null,
    adsPct: m.revenue > 0 ? m.ads / m.revenue : null,
    profit: m.revenue - m.ads,
    cpl: m.leads > 0 ? m.ads / m.leads : null,
    cpi: m.invoices > 0 ? m.ads / m.invoices : null,
    aov: m.invoices > 0 ? m.revenue / m.invoices : null,
    close: m.leads > 0 ? m.invoices / m.leads : null,
    book: m.leads > 0 ? m.booked / m.leads : null
  };
}
function adsPill(c) {
  if (c.adsPct == null) return "";
  var cls = c.adsPct <= 0.3 ? "good" : c.adsPct <= 0.4 ? "warn" : "bad";
  var tx = c.adsPct <= 0.3 ? "Ads/DT tốt" : c.adsPct <= 0.4 ? "Ads/DT chú ý" : "Ads/DT cao";
  return '<span class="pill ' + cls + '">' + tx + '</span>';
}
function niceTop(max) {
  var raw = (max || 1) / 4, pw = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), f = raw / pw;
  var step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pw;
  return { step: step, top: Math.max(Math.ceil(max / step), 1) * step };
}
function monthChart(list) {
  var W = 340, H = 176, pl = 44, pr = 6, pt = 8, pb = 22, max = 0;
  list.forEach(function (x) { max = Math.max(max, x.m.revenue, x.m.ads); });
  var nt = niceTop(max), ih = H - pt - pb, iw = W - pl - pr, gw = iw / list.length, bw = Math.min(gw * 0.36, 16), s = "";
  for (var v = 0; v <= nt.top + 1; v += nt.step) {
    var y = pt + ih - (v / nt.top) * ih;
    s += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" style="stroke:var(--line)" stroke-width="1"/>' +
      '<text x="' + (pl - 6) + '" y="' + (y + 3).toFixed(1) + '" text-anchor="end" font-size="9" style="fill:var(--muted)">' + n(v / 1e6) + 'tr</text>';
  }
  list.forEach(function (x, i) {
    var cx = pl + gw * i + gw / 2, hr = x.m.revenue / nt.top * ih, ha = x.m.ads / nt.top * ih;
    s += '<rect x="' + (cx - bw - 1).toFixed(1) + '" y="' + (pt + ih - hr).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(hr, 0).toFixed(1) + '" rx="2" style="fill:var(--navy)"/>' +
      '<rect x="' + (cx + 1).toFixed(1) + '" y="' + (pt + ih - ha).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(ha, 0).toFixed(1) + '" rx="2" style="fill:var(--ads)"/>';
    var p = x.m.label.split("-"), lb = p[0] + (i === 0 || p[0] === "T1" ? "/" + p[1].slice(2) : "");
    s += '<text x="' + cx.toFixed(1) + '" y="' + (H - 7) + '" text-anchor="middle" font-size="9" style="fill:var(--muted)">' + lb + '</text>';
  });
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Doanh thu và chi phí ads theo tháng">' + s + '</svg>';
}
function renderMonth(res) {
  var ms = res.months.map(function (m) { return { m: m, c: mcalc(m) }; });
  var act = ms.filter(function (x) { return x.c.has; }), none = ms.filter(function (x) { return !x.c.has; });
  var out = [], keys = ["leads", "invoices", "booked", "revenue", "ads", "potential", "consulted", "untouched", "canceled", "dropped", "abandoned"], tot = {};
  keys.forEach(function (k) { tot[k] = act.reduce(function (a, x) { return a + x.m[k]; }, 0); });
  var tc = mcalc(tot);
  if (!act.length) { $("appMonth").innerHTML = '<section class="card"><div class="small">Chưa có tháng nào có số liệu trong tab THEO_DOI_THEO_THANG.</div></section>'; return; }
  res.rangeText = act[0].m.label.replace("-", "/") + " – " + act[act.length - 1].m.label.replace("-", "/");

  out.push('<div class="hero"><div><div class="eyebrow">Tổng doanh thu · ' + act.length + ' tháng</div><div class="big">' + vnd(tot.revenue) + '</div></div>' +
    '<div class="hero-stats"><div><div class="eyebrow">ROAS</div><div class="v">' + dash(tc.roas, function (x) { return n(x, 2) + "x"; }) + '</div></div>' +
    '<div><div class="eyebrow">Ads / doanh thu</div><div class="v">' + dash(tc.adsPct, pct) + '</div></div></div></div>');

  out.push('<section class="card"><div class="eyebrow">Chỉ số chính, tất cả các tháng</div><div class="rows">' +
    [["Chi phí ads", vnd(tot.ads)], ["Lợi nhuận sau ads", '<span style="color:var(' + (tc.profit < 0 ? "--bad" : "--good") + ')">' + vnd(tc.profit) + '</span>'],
     ["Tổng lead", n(tot.leads)], ["Hóa đơn", n(tot.invoices)], ["Tỷ lệ chốt (hóa đơn / lead)", dash(tc.close, pct)],
     ["CP / lead", dash(tc.cpl, vnd)], ["CP / hóa đơn", dash(tc.cpi, vnd)], ["Doanh thu / hóa đơn", dash(tc.aov, vnd)]].map(function (r) {
      return '<div class="row"><span class="k">' + r[0] + '</span><span class="v">' + r[1] + '</span></div>';
    }).join("") + '</div></section>');

  out.push('<section class="card"><div class="eyebrow">Doanh thu và chi phí ads theo tháng</div>' + monthChart(act) +
    '<div class="legend2"><span><i style="background:var(--navy)"></i>Doanh thu</span><span><i style="background:var(--ads)"></i>Chi phí ads</span></div></section>');

  var last = act[act.length - 1], prev = act.length > 1 ? act[act.length - 2] : null;
  if (prev) {
    var defs = [["Doanh thu", last.m.revenue, prev.m.revenue, vnd, 1], ["Chi phí ads", last.m.ads, prev.m.ads, vnd, 0], ["ROAS", last.c.roas, prev.c.roas, function (x) { return n(x, 2) + "x"; }, 1],
      ["Tổng lead", last.m.leads, prev.m.leads, n, 1], ["CP / lead", last.c.cpl, prev.c.cpl, vnd, -1], ["Hóa đơn", last.m.invoices, prev.m.invoices, n, 1]];
    out.push('<section class="card"><div class="eyebrow">' + last.m.label + ' so với ' + prev.m.label + '</div><div class="rows">' + defs.map(function (d) {
      var ch = d[2] ? (d[1] - d[2]) / d[2] : null, col = "var(--muted)";
      if (ch != null && d[4] !== 0 && Math.abs(ch) >= 0.005) col = (ch * d[4] > 0) ? "var(--good)" : "var(--bad)";
      return '<div class="row"><span class="k">' + d[0] + '</span><span class="v">' + dash(d[1], d[3]) + ' <span class="delta" style="color:' + col + '">' + (ch == null ? "" : pctS(ch)) + '</span></span></div>';
    }).join("") + '</div></section>');
  }

  var st = [["Tiềm năng", tot.potential], ["Hóa đơn", tot.invoices], ["Đặt hẹn", tot.booked], ["Tham khảo", tot.consulted], ["Chưa tư vấn", tot.untouched], ["Huỷ lịch", tot.canceled], ["Rớt", tot.dropped], ["Bỏ", tot.abandoned]];
  out.push('<section class="card"><div class="eyebrow">Lead theo tình trạng, tất cả các tháng</div><div class="funnel">' + st.map(function (s) {
    var p = tot.leads > 0 ? s[1] / tot.leads : 0;
    return '<div class="stage"><div class="top"><span class="name">' + s[0] + '</span><span class="num sm">' + n(s[1]) + ' <span class="small">· ' + pct(p) + '</span></span></div><div class="track"><i class="' + (s[0] === "Hóa đơn" ? "ok" : "") + '" style="width:' + Math.max(p * 100, 1).toFixed(2) + '%"></i></div></div>';
  }).join("") + '</div></section>');

  out.push('<section class="card"><div class="eyebrow">Chi tiết từng tháng</div>' + act.slice().reverse().map(function (x) {
    var m = x.m, c = x.c;
    return '<details class="mrow"' + (x === last ? ' open' : '') + '><summary><span class="mh"><b>' + m.label.replace("-", " / ") + '</b>' + adsPill(c) + '</span>' +
      '<span class="mv">' + vnd(m.revenue) + '</span></summary><div class="mbody"><div class="svc-k">' +
      '<div><div class="k">Chi ads</div><div class="v">' + vnd(m.ads) + '</div></div>' +
      '<div><div class="k">ROAS</div><div class="v">' + dash(c.roas, function (v) { return n(v, 2) + "x"; }) + '</div></div>' +
      '<div><div class="k">Lợi nhuận</div><div class="v" style="color:var(' + (c.profit < 0 ? "--bad" : "--good") + ')">' + vnd(c.profit) + '</div></div></div>' +
      '<div class="svc-sub"><span>Lead <b>' + n(m.leads) + '</b></span><span>Hóa đơn <b>' + n(m.invoices) + '</b></span><span>Đặt hẹn <b>' + n(m.booked) + '</b></span><span>Chốt <b>' + dash(c.close, pct) + '</b></span></div>' +
      '<div class="svc-sub"><span>CP/lead <b>' + dash(c.cpl, vnd) + '</b></span><span>CP/hóa đơn <b>' + dash(c.cpi, vnd) + '</b></span><span>DT/hóa đơn <b>' + dash(c.aov, vnd) + '</b></span></div></div></details>';
  }).join("") + (none.length ? '<div class="small">Chưa có số liệu: ' + none.map(function (x) { return x.m.label.replace("-", "/"); }).join(", ") + '</div>' : '') +
    '<div class="small">Lợi nhuận sau ads = doanh thu trừ chi phí ads (cột ROI trong sheet). Ads/DT tốt khi từ 30% trở xuống, chú ý đến 40%.</div></section>');

  var warns = [];
  if (res.sheetTotal) {
    var d = tot.revenue - res.sheetTotal.revenue, da = tot.ads - res.sheetTotal.ads;
    if (Math.abs(d) > 1 || Math.abs(da) > 1) {
      var hit = act.filter(function (x) { return Math.abs(x.m.revenue - d) < 1; })[0];
      warns.push("Dòng TỔNG CỘNG trong sheet ghi doanh thu " + vnd(res.sheetTotal.revenue) + " và chi ads " + vnd(res.sheetTotal.ads) + ". Cộng các tháng ra " + vnd(tot.revenue) + " và " + vnd(tot.ads) + "." + (hit ? " Phần lệch đúng bằng " + hit.m.label + ", có thể công thức tổng bỏ sót dòng này." : ""));
    }
  }
  act.forEach(function (x) {
    if (x.m.revenue > 0 && x.m.invoices === 0) warns.push(x.m.label + " có doanh thu " + vnd(x.m.revenue) + " nhưng số hóa đơn là 0, nên CP/hóa đơn và doanh thu/hóa đơn không tính được.");
    var sum = x.m.potential + x.m.invoices + x.m.booked + x.m.consulted + x.m.untouched + x.m.canceled + x.m.dropped + x.m.abandoned;
    if (sum !== x.m.leads) warns.push(x.m.label + ": cộng các tình trạng ra " + n(sum) + ", tổng lead ghi " + n(x.m.leads) + ".");
  });
  if (none.length) warns.push("Dòng " + none.map(function (x) { return x.m.label; }).join(", ") + " chưa có số liệu.");
  if (warns.length) out.push('<section class="card check"><div class="eyebrow">Cần kiểm tra trong sheet</div>' + warns.map(function (w) { return '<p class="verdict">' + esc(w) + '</p>'; }).join("") + '</section>');
  $("appMonth").innerHTML = out.join("");
}
function loadMonth() {
  if (busyM) return;
  busyM = true;
  run("getMonthly").then(function (res) {
    monthData = res; renderMonth(res);
    if (view === "thang") { hideBanner(); updatePeriodText(); setStatus("live", "Đồng bộ với Google Sheets lúc " + hhmm(res.ts) + ". Tự làm mới mỗi phút."); }
  }).catch(function (err) {
    if (view !== "thang") return;
    showBanner("Không tải được số liệu. " + errText(err));
    setStatus("stale", monthData ? "Mất kết nối tạm thời. Đang giữ số liệu lúc " + hhmm(monthData.ts) + "." : "Chưa tải được số liệu.");
  }).then(function () { busyM = false; $("refresh").disabled = false; $("refresh").textContent = "Làm mới"; });
}

/* ---- Trang "Lịch hẹn" ---- */
var apptData = null, busyA = false, curAppt = null, apptFilter = "all";
var ST = { inv: ["Đã chốt", "good"], wait: ["Chờ đến", ""], overdue: ["Quá hạn, chưa cập nhật", "warn"], drop: ["Rớt", "bad"], cancel: ["Huỷ lịch", ""] };
function apptPresets() {
  var t = new Date(), y = t.getFullYear(), mo = t.getMonth(), dw = (t.getDay() + 6) % 7;
  return [
    ["Hôm nay", isoOf(t), isoOf(t)],
    ["Tuần này", isoOf(new Date(y, mo, t.getDate() - dw)), isoOf(new Date(y, mo, t.getDate() - dw + 6))],
    ["Tháng này", isoOf(new Date(y, mo, 1)), isoOf(new Date(y, mo + 1, 0))],
    ["Tháng trước", isoOf(new Date(y, mo - 1, 1)), isoOf(new Date(y, mo, 0))],
    ["Tháng sau", isoOf(new Date(y, mo + 1, 1)), isoOf(new Date(y, mo + 2, 0))]
  ];
}
function apptCard(x) {
  var s = ST[x.st] || ["", ""], tel = x.phone.replace(/[^\d+]/g, "");
  return '<div class="appt"><div class="svc-h"><b>' + esc(x.name || "Chưa có tên") + '</b><span class="pill ' + s[1] + '">' + s[0] + '</span></div>' +
    '<div class="appt-m">' + esc(x.date) + (x.time ? ' · ' + esc(x.time) : '') + ' · ' + esc(sentence(x.service || "")) + '</div>' +
    '<div class="appt-m">' + (x.tele ? 'Tele ' + esc(x.tele) : '') + (x.page ? ' · Page ' + esc(x.page) : '') + (tel ? ' · <a href="tel:' + tel + '">' + esc(x.phone) + '</a>' : '') + '</div>' +
    (x.note ? '<div class="appt-n">' + esc(x.note) + '</div>' : '') + '</div>';
}
function dayChart(byDay, from, to) {
  var b = to.split("-"), f = from.split("-");
  var d0 = Date.UTC(+f[0], +f[1] - 1, +f[2]), d1 = Date.UTC(+b[0], +b[1] - 1, +b[2]), days = Math.round((d1 - d0) / 864e5) + 1;
  if (days > 45 || days < 2) return "";
  var map = {}, max = 1;
  byDay.forEach(function (d) { map[d.iso] = d; max = Math.max(max, d.total); });
  var bars = "", labs = "";
  for (var i = 0; i < days; i++) {
    var dt = new Date(d0 + i * 864e5), iso = dt.toISOString().slice(0, 10), d = map[iso] || { total: 0, inv: 0 }, dd = dt.getUTCDate();
    var h = d.total / max * 100, hi = d.total ? d.inv / d.total * 100 : 0;
    bars += '<div class="bar" title="' + iso2dmy(iso) + ': ' + d.total + ' lịch"><div class="bf" style="height:' + h.toFixed(1) + '%"><i style="height:' + hi.toFixed(1) + '%"></i></div></div>';
    labs += '<span>' + (dd === 1 || dd % 5 === 0 ? dd : "") + '</span>';
  }
  return '<div class="bars">' + bars + '</div><div class="blabs">' + labs + '</div><div class="legend2"><span><i style="background:var(--navy)"></i>Lịch hẹn</span><span><i style="background:var(--good)"></i>Đã chốt</span></div>';
}
function renderAppt(res) {
  var s = res.summary, out = [];
  var tw = res.upcoming.today, tm = res.upcoming.tomorrow;
  out.push('<div class="grid"><div class="tile"><div class="k">Hôm nay (' + esc(res.today.slice(0, 5)) + ')</div><div class="v">' + tw.length + ' lịch</div></div>' +
    '<div class="tile"><div class="k">Ngày mai</div><div class="v">' + tm.length + ' lịch</div></div></div>');
  if (tw.length || tm.length) out.push('<section class="card"><div class="eyebrow">Lịch sắp tới</div>' + tw.concat(tm).map(apptCard).join("") + '</section>');

  out.push('<div class="hero"><div><div class="eyebrow">Tổng lịch hẹn trong kỳ</div><div class="big">' + n(s.total) + '</div></div>' +
    '<div class="hero-stats"><div><div class="eyebrow">Đã chốt</div><div class="v">' + n(s.inv) + '</div></div>' +
    '<div><div class="eyebrow">Tỷ lệ chốt</div><div class="v">' + dash(s.closeRate, pct) + '</div></div></div></div>');

  var rates = [["Chờ đến", s.wait, s.total, ""], ["Quá hạn, chưa cập nhật", s.overdue, s.total, "warn"], ["Rớt", s.drop, s.total, "warn"], ["Huỷ lịch", s.cancel, s.total, ""]];
  out.push('<section class="card"><div class="eyebrow">Kết quả lịch hẹn</div><div class="funnel">' + rates.map(function (r) {
    var p = r[2] > 0 ? r[1] / r[2] : 0;
    return '<div class="stage"><div class="top"><span class="name">' + r[0] + '</span><span class="num sm">' + n(r[1]) + ' <span class="small">· ' + pct(p) + '</span></span></div><div class="track"><i class="' + r[3] + '" style="width:' + Math.max(p * 100, 1).toFixed(2) + '%"></i></div></div>';
  }).join("") + '</div><div class="small">Tỷ lệ chốt = hóa đơn / (hóa đơn + rớt + huỷ + quá hạn). Lịch còn chờ chưa tính vào mẫu số.</div></section>');

  var ch = dayChart(res.byDay, res.from, res.to);
  if (ch) out.push('<section class="card"><div class="eyebrow">Lịch hẹn theo ngày</div>' + ch + '</section>');

  function grp(title, arr) {
    if (!arr.length) return "";
    return '<section class="card"><div class="eyebrow">' + title + '</div><div class="rows">' + arr.map(function (g) {
      return '<div class="row"><span class="k">' + esc(sentence(g.name)) + '</span><span class="v">' + n(g.total) + ' lịch · ' + n(g.inv) + ' chốt <span class="small">(' + pct(g.total ? g.inv / g.total : 0) + ')</span></span></div>';
    }).join("") + '</div></section>';
  }
  out.push(grp("Theo dịch vụ", res.byService), grp("Theo tele", res.byTele));

  var counts = { all: res.items.length, wait: s.wait, inv: s.inv, overdue: s.overdue, drop: s.drop, cancel: s.cancel };
  var chips = [["all", "Tất cả"], ["wait", "Chờ đến"], ["inv", "Đã chốt"], ["overdue", "Quá hạn"], ["drop", "Rớt"], ["cancel", "Huỷ"]];
  out.push('<section class="card"><div class="eyebrow">Danh sách lịch hẹn</div><div class="presets" id="apptChips">' + chips.map(function (c) {
    return '<button type="button" class="chip" data-f="' + c[0] + '" aria-pressed="' + (apptFilter === c[0] ? "true" : "false") + '">' + c[1] + ' ' + (counts[c[0]] || 0) + '</button>';
  }).join("") + '</div><div id="apptList"></div></section>');

  var warns = [];
  if (res.checks.noDate) warns.push(n(res.checks.noDate) + " khách đang ở tình trạng ĐẶT HẸN trong 90 ngày qua nhưng cột NGÀY HẸN trống hoặc không đọc được ngày (ví dụ chữ \"tết\", \"t11\"), nên không nằm trong danh sách.");
  if (res.checks.farFuture) warns.push(n(res.checks.farFuture) + " lịch ĐẶT HẸN có ngày hẹn cách ngày nhận lead hơn 60 ngày, nên kiểm tra xem có gõ nhầm ngày hoặc tháng không.");
  if (s.overdue) warns.push(n(s.overdue) + " lịch ĐẶT HẸN trong kỳ đã qua ngày hẹn nhưng chưa đổi tình trạng sang HÓA ĐƠN, rớt hoặc huỷ.");
  if (res.truncated) warns.push("Danh sách chỉ hiện 300 lịch đầu tiên. Thu hẹp khoảng ngày để xem đủ.");
  if (warns.length) out.push('<section class="card check"><div class="eyebrow">Cần kiểm tra trong sheet</div>' + warns.map(function (w) { return '<p class="verdict">' + esc(w) + '</p>'; }).join("") + '</section>');

  $("appAppt").innerHTML = out.join("");
  fillApptList();
}
function fillApptList() {
  var el = $("apptList");
  if (!el || !apptData) return;
  var items = apptData.items.filter(function (x) { return apptFilter === "all" || x.st === apptFilter; });
  el.innerHTML = items.length ? items.map(apptCard).join("") : '<div class="small">Không có lịch hẹn nào trong mục này.</div>';
}
function loadAppt() {
  if (busyA || !curAppt) return;
  busyA = true;
  run("getAppointments", [curAppt.from, curAppt.to]).then(function (res) {
    apptData = res; renderAppt(res);
    if (view === "lich") {
      hideBanner(); updatePeriodText();
      setStatus("live", "Đồng bộ với Google Sheets lúc " + hhmm(res.ts) + ". Tự làm mới mỗi phút.");
    }
    var m = $("apptMsg");
    if (m) m.textContent = "";
  }).catch(function (err) {
    if (view !== "lich") return;
    showBanner("Không tải được số liệu. " + errText(err));
    setStatus("stale", apptData ? "Mất kết nối tạm thời. Đang giữ số liệu lúc " + hhmm(apptData.ts) + "." : "Chưa tải được số liệu.");
  }).then(function () { busyA = false; $("applyAppt").disabled = false; $("refresh").disabled = false; $("refresh").textContent = "Làm mới"; });
}
function initMore() {
  $("tabThang").addEventListener("click", function () { setView("thang"); load(); });
  $("tabLich").addEventListener("click", function () { setView("lich"); load(); });
  var d = apptPresets()[2];
  curAppt = { from: d[1], to: d[2] };
  $("apptPresets").innerHTML = apptPresets().map(function (p, i) { return '<button type="button" class="chip" data-i="' + i + '">' + p[0] + '</button>'; }).join("");
  $("apptPresets").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-i]");
    if (!b) return;
    var p = apptPresets()[+b.getAttribute("data-i")];
    $("aFrom").value = p[1]; $("aTo").value = p[2]; $("apptMsg").textContent = "";
  });
  $("applyAppt").addEventListener("click", function () {
    var a = $("aFrom").value, b = $("aTo").value, msg = $("apptMsg");
    if (!a || !b) { msg.textContent = "Chọn đủ cả hai ngày."; return; }
    if (a > b) { msg.textContent = "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc."; return; }
    curAppt = { from: a, to: b };
    $("applyAppt").disabled = true; msg.textContent = "Đang tải…";
    $("apptPanel").hidden = true; $("period").setAttribute("aria-expanded", "false");
    updatePeriodText(); loadAppt();
  });
  $("appAppt").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-f]");
    if (!b) return;
    apptFilter = b.getAttribute("data-f");
    var all = document.querySelectorAll("#apptChips .chip");
    for (var i = 0; i < all.length; i++) all[i].setAttribute("aria-pressed", all[i] === b ? "true" : "false");
    fillApptList();
  });
}

/* ---- Trang "Tele": hiệu suất từng tele (tính từ DATA_SALE, kỳ lọc riêng, không ghi vào sheet) ---- */
var teleData = null, busyT = false, curTele = null;
function telePresets() {
  var t = new Date(), y = t.getFullYear(), mo = t.getMonth(), d = t.getDate();
  return [
    ["Hôm nay", isoOf(t), isoOf(t)],
    ["7 ngày qua", isoOf(new Date(y, mo, d - 6)), isoOf(t)],
    ["Tháng này", isoOf(new Date(y, mo, 1)), isoOf(new Date(y, mo + 1, 0))],
    ["Tháng trước", isoOf(new Date(y, mo - 1, 1)), isoOf(new Date(y, mo, 0))],
    ["30 ngày qua", isoOf(new Date(y, mo, d - 29)), isoOf(t)]
  ];
}
function teleKey(s) { return sNorm(s).replace(/[\s.]/g, ""); }
function teleStat(s) {
  var k = sNorm(s);
  if (k === "TIEM NANG") return "pot";
  if (k === "DAT HEN") return "book";
  if (k === "HOA DON") return "inv";
  if (k === "CHUA TU VAN") return "untouched";
  if (k === "THAM KHAO") return "consult";
  if (k === "ROT") return "drop";
  if (k === "HUY LICH" || k === "HUY") return "cancel";
  if (k === "") return "blank";
  return "other";
}
function newTele(name) {
  return { name: name, leads: 0, pot: 0, book: 0, inv: 0, untouched: 0, consult: 0, drop: 0, cancel: 0, other: 0, blank: 0, byDay: {}, bySvc: {} };
}
function addLead(g, st, iso, svc) {
  g.leads++; g[st]++;
  var d = g.byDay[iso] || (g.byDay[iso] = { n: 0, inv: 0 }); d.n++; if (st === "inv") d.inv++;
  var s = g.bySvc[svc] || (g.bySvc[svc] = { name: svc, leads: 0, pot: 0, book: 0, inv: 0 }); s.leads++;
  if (st === "pot" || st === "book" || st === "inv") s[st]++;
}
API.getTele = function (fromIso, toIso) {
  return getVals("DATA_SALE!A2:N6000").then(function (vals) {
    var f = fromIso.split("-"), t = toIso.split("-");
    var a = dnum(+f[0], +f[1], +f[2]), b = dnum(+t[0], +t[1], +t[2]);
    if (a > b) throw new Error("Ngày bắt đầu phải trước ngày kết thúc.");
    var today = todayNum(), teles = {}, order = [], backlog = {}, items = [], checks = { noDate: 0, noTele: 0, blank: 0 };
    vals.forEach(function (r) {
      var name = String(r[6] || "").trim(), phone = String(r[7] || "").trim();
      if (!name && !phone) return;
      var lp = ymdOf(r[1]);
      if (!lp || !lp.y) { checks.noDate++; return; }
      var k = dnum(lp.y, lp.m, lp.d);
      var raw = String(r[2] || "").trim(), key = teleKey(raw) || "CHUARO";
      var tn = raw || "Chưa rõ";
      if (!raw) checks.noTele++;
      var st = teleStat(r[10]);
      if (st === "untouched") {
        var bl = backlog[key] || (backlog[key] = { name: tn, total: 0, d3: 0, d7: 0, oldest: null, items: [] });
        var age = today - k;
        bl.total++; if (age > 3) bl.d3++; if (age > 7) bl.d7++;
        if (bl.oldest === null || k < bl.oldest) bl.oldest = k;
      }
      if (k < a || k > b) return;
      if (st === "blank") checks.blank++;
      var g = teles[key];
      if (!g) { g = teles[key] = newTele(tn); order.push(key); }
      addLead(g, st, dnIso(k), String(r[5] || "").trim() || "Chưa rõ");
      items.push({
        n: k, date: dnDmy(k), name: name, phone: phone, tele: g.name, svc: String(r[5] || "").trim(), page: String(r[3] || "").trim(),
        source: String(r[4] || "").trim(), st: st, stText: String(r[10] || "").trim(), note: String(r[13] || "").trim(), row: items.length
      });
    });
    items.sort(function (x, y) { return (y.n - x.n) || (y.row - x.row); });
    order.sort(function (x, y) { return teles[y].leads - teles[x].leads; });
    var list = order.map(function (k) { return teles[k]; });
    var bl = Object.keys(backlog).map(function (k) { var o = backlog[k]; o.oldestDmy = o.oldest === null ? "" : dnDmy(o.oldest); o.oldestAge = o.oldest === null ? 0 : today - o.oldest; return o; })
      .sort(function (x, y) { return y.total - x.total; });
    return { from: fromIso, to: toIso, teles: list, backlog: bl, items: items, checks: checks, ts: Date.now() };
  });
};
function tele_calc(g) {
  var valid = g.pot + g.book + g.inv, booked = g.book + g.inv;
  return {
    valid: valid, booked: booked,
    potR: g.leads ? g.pot / g.leads : null,
    validR: g.leads ? valid / g.leads : null,
    bookR: g.leads ? booked / g.leads : null,
    invR: g.leads ? g.inv / g.leads : null,
    vinvR: valid ? g.inv / valid : null,
    binvR: booked ? g.inv / booked : null
  };
}
function teleDayChart(teles, from, to) {
  var f = from.split("-"), b = to.split("-");
  var d0 = Date.UTC(+f[0], +f[1] - 1, +f[2]), d1 = Date.UTC(+b[0], +b[1] - 1, +b[2]), days = Math.round((d1 - d0) / 864e5) + 1;
  if (days > 45 || days < 2) return "";
  var tot = {}, max = 1;
  teles.forEach(function (g) { Object.keys(g.byDay).forEach(function (k) { var d = tot[k] || (tot[k] = { n: 0, inv: 0 }); d.n += g.byDay[k].n; d.inv += g.byDay[k].inv; }); });
  Object.keys(tot).forEach(function (k) { max = Math.max(max, tot[k].n); });
  var bars = "", labs = "";
  for (var i = 0; i < days; i++) {
    var dt = new Date(d0 + i * 864e5), iso = dt.toISOString().slice(0, 10), d = tot[iso] || { n: 0, inv: 0 }, dd = dt.getUTCDate();
    bars += '<div class="bar" title="' + iso2dmy(iso) + ': ' + d.n + ' lead"><div class="bf" style="height:' + (d.n / max * 100).toFixed(1) + '%"><i style="height:' + (d.n ? d.inv / d.n * 100 : 0).toFixed(1) + '%"></i></div></div>';
    labs += '<span>' + (dd === 1 || dd % 5 === 0 ? dd : "") + '</span>';
  }
  return '<div class="bars">' + bars + '</div><div class="blabs">' + labs + '</div><div class="legend2"><span><i style="background:var(--navy)"></i>Lead nhận</span><span><i style="background:var(--good)"></i>Đã ra hóa đơn</span></div>';
}

var leadF = { tele: "all", st: "all", q: "", limit: 30 };
var LST = { pot: ["Tiềm năng", "good"], book: ["Đặt hẹn", ""], inv: ["Hóa đơn", "good"], untouched: ["Chưa tư vấn", "warn"], consult: ["Tham khảo", ""], drop: ["Rớt", "bad"], cancel: ["Huỷ lịch", ""], other: ["", ""], blank: ["Chưa có tình trạng", "warn"] };
function leadGroup(st) { return st === "pot" || st === "book" || st === "inv" || st === "untouched" ? st : "etc"; }
function leadCard(x) {
  var l = LST[x.st] || ["", ""], label = x.st === "other" ? (x.stText || "Khác") : l[0], tel = x.phone.replace(/[^\d+]/g, "");
  var meta = [esc(x.date)];
  if (x.svc) meta.push(esc(sentence(x.svc)));
  var sub = [];
  if (x.page) sub.push("Page " + esc(x.page));
  if (x.source) sub.push(esc(x.source));
  return '<div class="appt"><div class="svc-h"><b>' + esc(x.name || "Chưa có tên") + '</b><span class="pill ' + l[1] + '">' + esc(label) + '</span></div>' +
    '<div class="appt-m">' + meta.join(" · ") + ' · Tele ' + esc(x.tele) + '</div>' +
    (sub.length || tel ? '<div class="appt-m">' + sub.join(" · ") + (tel ? (sub.length ? " · " : "") + '<a href="tel:' + tel + '">' + esc(x.phone) + '</a>' : "") + '</div>' : '') +
    (x.note ? '<div class="appt-n">' + esc(x.note) + '</div>' : '') + '</div>';
}
function leadBox(res) {
  return '<section class="card" id="leadBox"><div class="eyebrow">Danh sách lead trong kỳ</div>' +
    '<input type="search" class="lsearch" id="leadQ" placeholder="Tìm theo tên, số điện thoại, page, ghi chú" autocomplete="off" value="' + esc(leadF.q) + '">' +
    '<div class="presets" id="leadTele"></div><div class="presets" id="leadSt"></div><div id="leadList"></div></section>';
}
function leadMatch(x, q) {
  if (!q) return true;
  var hay = sNorm([x.name, x.phone, x.page, x.source, x.svc, x.note].join(" ")), digits = x.phone.replace(/\D/g, "");
  return q.split(" ").every(function (w) { return hay.indexOf(w) >= 0 || (/^\d+$/.test(w) && digits.indexOf(w) >= 0); });
}
function fillLeadBox(onlyList) {
  if (!teleData || !$("leadList")) return;
  var q = sNorm(leadF.q), all = teleData.items;
  var byTele = all.filter(function (x) { return (leadF.tele === "all" || x.tele === leadF.tele) && leadMatch(x, q); });
  if (!onlyList) {
    var tn = teleData.teles.map(function (g) { return g.name; });
    $("leadTele").innerHTML = ['all'].concat(tn).map(function (t) {
      var c = all.filter(function (x) { return (t === "all" || x.tele === t) && leadMatch(x, q); }).length;
      return '<button type="button" class="chip" data-lt="' + esc(t) + '" aria-pressed="' + (leadF.tele === t ? "true" : "false") + '">' + (t === "all" ? "Tất cả tele" : esc(t)) + ' ' + c + '</button>';
    }).join("");
    var cnt = { all: byTele.length, pot: 0, book: 0, inv: 0, untouched: 0, etc: 0 };
    byTele.forEach(function (x) { cnt[leadGroup(x.st)]++; });
    $("leadSt").innerHTML = [["all", "Tất cả"], ["pot", "Tiềm năng"], ["book", "Đặt hẹn"], ["inv", "Hóa đơn"], ["untouched", "Chưa tư vấn"], ["etc", "Khác"]].map(function (c) {
      return '<button type="button" class="chip" data-ls="' + c[0] + '" aria-pressed="' + (leadF.st === c[0] ? "true" : "false") + '">' + c[1] + ' ' + cnt[c[0]] + '</button>';
    }).join("");
  }
  var list = byTele.filter(function (x) { return leadF.st === "all" || leadGroup(x.st) === leadF.st; });
  var shown = list.slice(0, leadF.limit);
  $("leadList").innerHTML = shown.length
    ? shown.map(leadCard).join("") + (list.length > shown.length ? '<button type="button" class="apply" data-more="1">Xem thêm ' + Math.min(30, list.length - shown.length) + ' lead (còn ' + n(list.length - shown.length) + ')</button>' : '<div class="small">Đã hiện hết ' + n(list.length) + ' lead.</div>')
    : '<div class="small">Không có lead nào khớp bộ lọc.</div>';
}
function renderTele(res) {
  var out = [], T = res.teles, tot = newTele("Tổng");
  T.forEach(function (g) { ["leads", "pot", "book", "inv", "untouched", "consult", "drop", "cancel", "other", "blank"].forEach(function (k) { tot[k] += g[k]; }); });
  var tc = tele_calc(tot);
  out.push('<div class="hero"><div><div class="eyebrow">Lead nhận trong kỳ</div><div class="big">' + n(tot.leads) + '</div></div>' +
    '<div class="hero-stats cols3"><div><div class="eyebrow">Hợp lệ</div><div class="v">' + n(tc.valid) + '</div></div>' +
    '<div><div class="eyebrow">Hóa đơn</div><div class="v">' + n(tot.inv) + '</div></div>' +
    '<div><div class="eyebrow">Lead → HĐ</div><div class="v">' + dash(tc.invR, pct) + '</div></div></div></div>');

  if (!T.length) {
    out.push('<section class="card"><div class="small">Chưa có lead nào trong kỳ này.</div></section>');
  } else {
    var rows = [
      ["Lead nhận", function (g) { return n(g.leads); }],
      ["Lead tiềm năng", function (g, c) { return n(g.pot) + ' <span class="small">· ' + dash(c.potR, pct) + '</span>'; }],
      ["Lead hợp lệ", function (g, c) { return n(c.valid) + ' <span class="small">· ' + dash(c.validR, pct) + '</span>'; }],
      ["Đặt hẹn (gồm đã chốt)", function (g, c) { return n(c.booked) + ' <span class="small">· ' + dash(c.bookR, pct) + '</span>'; }],
      ["Hóa đơn", function (g, c) { return n(g.inv) + ' <span class="small">· ' + dash(c.invR, pct) + '</span>'; }],
      ["Hợp lệ → hóa đơn", function (g, c) { return dash(c.vinvR, pct); }],
      ["Hẹn → hóa đơn", function (g, c) { return dash(c.binvR, pct); }],
      ["Rớt", function (g) { return n(g.drop); }],
      ["Huỷ lịch", function (g) { return n(g.cancel); }]
    ];
    var cols = T.length > 3 ? T.slice(0, 3) : T;
    var cs = cols.map(function (g) { return { g: g, c: tele_calc(g) }; });
    out.push('<section class="card"><div class="eyebrow">So sánh tele</div><div class="cmp" style="grid-template-columns:minmax(0,1.2fr) ' + cs.map(function () { return "minmax(0,1fr)"; }).join(" ") + '"><span></span>' +
      cs.map(function (x) { return '<b>' + esc(x.g.name) + '</b>'; }).join("") +
      rows.map(function (r) { return '<span class="k">' + r[0] + '</span>' + cs.map(function (x) { return '<span class="v">' + r[1](x.g, x.c) + '</span>'; }).join(""); }).join("") +
      '</div><div class="small">Tỷ lệ tính trên tổng lead nhận của từng tele. Lead hợp lệ = tiềm năng + đặt hẹn + hóa đơn.</div></section>');

    cs.forEach(function (x) {
      var g = x.g, c = x.c, st = [["Lead nhận", g.leads, ""], ["Hợp lệ", c.valid, ""], ["Đặt hẹn / chốt", c.booked, ""], ["Hóa đơn", g.inv, "ok"]];
      out.push('<section class="card"><div class="eyebrow">Phễu · ' + esc(g.name) + '</div><div class="funnel">' + st.map(function (s) {
        var p = g.leads > 0 ? s[1] / g.leads : 0;
        return '<div class="stage"><div class="top"><span class="name">' + s[0] + '</span><span class="num sm">' + n(s[1]) + ' <span class="small">· ' + pct(p) + '</span></span></div><div class="track"><i class="' + s[2] + '" style="width:' + Math.max(p * 100, 1).toFixed(2) + '%"></i></div></div>';
      }).join("") + '</div><div class="small">Còn lại: chưa tư vấn ' + n(g.untouched) + ' · tham khảo ' + n(g.consult) + ' · rớt ' + n(g.drop) + ' · huỷ ' + n(g.cancel) + ' · bỏ/không nghe máy/khác ' + n(g.other) + (g.blank ? ' · chưa có tình trạng ' + n(g.blank) : '') + '</div></section>');
    });

    var ch = teleDayChart(T, res.from, res.to);
    if (ch) out.push('<section class="card"><div class="eyebrow">Lead nhận theo ngày (cả các tele)</div>' + ch + '</section>');

    var svcs = {};
    cs.forEach(function (x) { Object.keys(x.g.bySvc).forEach(function (k) { svcs[k] = true; }); });
    var sk = Object.keys(svcs).sort();
    if (sk.length) out.push('<section class="card"><div class="eyebrow">Theo dịch vụ</div><div class="cmp" style="grid-template-columns:minmax(0,1.2fr) ' + cs.map(function () { return "minmax(0,1fr)"; }).join(" ") + '"><span></span>' +
      cs.map(function (x) { return '<b>' + esc(x.g.name) + '</b>'; }).join("") +
      sk.map(function (k) {
        return '<span class="k">' + esc(sentence(k)) + '</span>' + cs.map(function (x) {
          var s = x.g.bySvc[k];
          return '<span class="v">' + (s ? n(s.leads) + ' lead<br><span class="small">' + n(s.pot + s.book + s.inv) + ' hợp lệ<br>' + n(s.inv) + ' hóa đơn</span>' : '-') + '</span>';
        }).join("");
      }).join("") + '</div></section>');
  }

  if (res.items.length) out.push(leadBox(res));
  if (res.backlog.length) {
    out.push('<section class="card check"><div class="eyebrow">Tồn lead chưa tư vấn</div>' + res.backlog.map(function (b) {
      return '<p class="verdict"><b>' + esc(b.name) + '</b>: ' + n(b.total) + ' lead đang ở tình trạng CHƯA TƯ VẤN, trong đó ' + n(b.d3) + ' lead quá 3 ngày và ' + n(b.d7) + ' lead quá 7 ngày. Lead cũ nhất nhận ngày ' + esc(b.oldestDmy) + ' (' + n(b.oldestAge) + ' ngày trước).' + (b.total && b.d7 / b.total > 0.7 ? ' Phần lớn là lead cũ, nên rà lại và cập nhật tình trạng.' : '') + '</p>';
    }).join("") + '<p class="verdict small">Mục này tính trên toàn bộ dữ liệu, không phụ thuộc kỳ đang chọn.</p></section>');
  }
  var warns = [];
  if (res.checks.noDate) warns.push(n(res.checks.noDate) + " dòng có cột NGÀY trống hoặc thiếu năm nên không được tính.");
  if (res.checks.noTele) warns.push(n(res.checks.noTele) + " dòng chưa điền cột TELE, được gom vào nhóm \"Chưa rõ\".");
  if (res.checks.blank) warns.push(n(res.checks.blank) + " lead trong kỳ chưa có tình trạng.");
  if (warns.length) out.push('<section class="card check"><div class="eyebrow">Cần kiểm tra trong sheet</div>' + warns.map(function (w) { return '<p class="verdict">' + esc(w) + '</p>'; }).join("") + '</section>');
  $("appTele").innerHTML = out.join("");
  fillLeadBox(false);
}
function loadTele() {
  if (busyT || !curTele) return;
  busyT = true;
  run("getTele", [curTele.from, curTele.to]).then(function (res) {
    teleData = res;
    var qa = document.activeElement && document.activeElement.id === "leadQ";
    if (qa) fillLeadBox(true); else renderTele(res);
    if (view === "tele") { hideBanner(); updatePeriodText(); setStatus("live", "Đồng bộ với Google Sheets lúc " + hhmm(res.ts) + ". Tự làm mới mỗi phút."); }
    var m = $("teleMsg"); if (m) m.textContent = "";
  }).catch(function (err) {
    if (view !== "tele") return;
    showBanner("Không tải được số liệu. " + errText(err));
    setStatus("stale", teleData ? "Mất kết nối tạm thời. Đang giữ số liệu lúc " + hhmm(teleData.ts) + "." : "Chưa tải được số liệu.");
  }).then(function () { busyT = false; $("applyTele").disabled = false; $("refresh").disabled = false; $("refresh").textContent = "Làm mới"; });
}
function initTele() {
  $("tabTele").addEventListener("click", function () { setView("tele"); load(); });
  var d = telePresets()[2];
  curTele = { from: d[1], to: d[2] };
  $("telePresets").innerHTML = telePresets().map(function (p, i) { return '<button type="button" class="chip" data-i="' + i + '">' + p[0] + '</button>'; }).join("");
  $("telePresets").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-i]");
    if (!b) return;
    var p = telePresets()[+b.getAttribute("data-i")];
    $("tFrom").value = p[1]; $("tTo").value = p[2]; $("teleMsg").textContent = "";
  });
  $("appTele").addEventListener("click", function (e) {
    var t = e.target.closest("button");
    if (!t) return;
    if (t.hasAttribute("data-lt")) { leadF.tele = t.getAttribute("data-lt"); leadF.limit = 30; fillLeadBox(false); }
    else if (t.hasAttribute("data-ls")) { leadF.st = t.getAttribute("data-ls"); leadF.limit = 30; fillLeadBox(false); }
    else if (t.hasAttribute("data-more")) { leadF.limit += 30; fillLeadBox(true); }
  });
  $("appTele").addEventListener("input", function (e) {
    if (e.target.id !== "leadQ") return;
    leadF.q = e.target.value; leadF.limit = 30; fillLeadBox(false);
  });
  $("applyTele").addEventListener("click", function () {
    var a = $("tFrom").value, b = $("tTo").value, msg = $("teleMsg");
    if (!a || !b) { msg.textContent = "Chọn đủ cả hai ngày."; return; }
    if (a > b) { msg.textContent = "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc."; return; }
    curTele = { from: a, to: b };
    $("applyTele").disabled = true; msg.textContent = "Đang tải…";
    $("telePanel").hidden = true; $("period").setAttribute("aria-expanded", "false");
    updatePeriodText(); loadTele();
  });
}

/* ---- Trang "Dịch vụ": chi tiêu, doanh thu và chân dung khách đã chốt theo từng dịch vụ ---- */
var svcData = null, busyS = false, curSvc = null, svcSel = "all", svcLF = { q: "", mk: "all", limit: 30 };
var SPEND_RANGE = "'CHI_PHI_HANG_NGAY( CHỈ NHẬP TAY'!A2:G6000";
function svcPresets() {
  var t = new Date(), y = t.getFullYear(), mo = t.getMonth(), d = t.getDate();
  return [
    ["30 ngày qua", isoOf(new Date(y, mo, d - 29)), isoOf(t)],
    ["90 ngày qua", isoOf(new Date(y, mo, d - 89)), isoOf(t)],
    ["Tháng này", isoOf(new Date(y, mo, 1)), isoOf(new Date(y, mo + 1, 0))],
    ["Tháng trước", isoOf(new Date(y, mo - 1, 1)), isoOf(new Date(y, mo, 0))],
    ["Năm nay", isoOf(new Date(y, 0, 1)), isoOf(t)],
    ["Toàn bộ", "2025-01-01", isoOf(t)]
  ];
}
function mon(x) {
  var a = Math.abs(x);
  if (a >= 1e9) return n(x / 1e9, 2) + " tỷ";
  if (a >= 1e6) return n(x / 1e6, 1) + " tr";
  return n(Math.round(x));
}
function pKey(v) {
  var d = String(v == null ? "" : v).replace(/\D/g, "").replace(/^0+/, "");
  if (d.length < 8 || /^(\d)\1+$/.test(d)) return "";
  return d.slice(-9);
}
function mkOf(v) { var k = sNorm(v); return k === "VIET KIEU" ? "vk" : k === "VIET NAM" ? "vn" : ""; }
var MK_NAME = { vk: "Việt kiều", vn: "Việt Nam", "": "Chưa rõ" };
var EU = ["PHAP", "DUC", "HA LAN", "THUY SI", "THUY DIEN", "NA UY", "DAN MACH", "BI", "Y", "ANH", "BA LAN", "TAY BAN NHA", "PHAN LAN", "AO", "UK", "CHAU AU"];
var VN_RE = /HA NOI|HCM|SAI GON|GO VAP|THU DUC|DONG NAI|DA NANG|NHA TRANG|CA MAU|HAI PHONG|CAN THO|BINH (DUONG|PHUOC|THUAN|DINH|TAN)|LONG AN|VUNG TAU|HUE|QUANG|NGHE AN|THANH HOA|LAM DONG|DA LAT|TAY NINH|TIEN GIANG|BEN TRE|HUNG YEN|HAI DUONG|NAM DINH|VINH|VIET NAM|^VN$|QUAN \d|^Q ?\d/;
function ctry(addr) {
  var k = sNorm(addr).replace(/^VK /, "");
  if (!k || k === "K CHO BIET" || k === "GIAU NOI O" || k === "GIAU" || k === "VK") return "";
  if (k === "MY" || /\bUSA\b|HOA KY|CALIFORNIA|TEXAS/.test(k)) return "Mỹ";
  if (k === "UC" || /AUSTRALIA|SYDNEY|MELBOURNE/.test(k)) return "Úc";
  if (/MALAY/.test(k)) return "Malaysia";
  if (/^SING/.test(k)) return "Singapore";
  if (/^DAI( LOAN)?$|TAIWAN/.test(k)) return "Đài Loan";
  if (/CANADA/.test(k)) return "Canada";
  if (EU.indexOf(k) >= 0) return "Châu Âu";
  if (/NUOC NGOAI/.test(k)) return "Nước ngoài (khác)";
  if (VN_RE.test(k)) return "Việt Nam";
  return "Khác";
}
function svcSpendRows(vals) {
  var rows = [], nowD = new Date(todayNum() * 86400000), curYM = nowD.getUTCFullYear() * 100 + nowD.getUTCMonth() + 1;
  vals.forEach(function (r) {
    var dt = ymdOf(r[0]);
    if (!dt || !dt.y) return;
    var sp = sNum(r[3]), ms = sNum(r[4]), da = sNum(r[5]);
    if (!sp && !ms && !da) return;
    rows.push({ n: dnum(dt.y, dt.m, dt.d), y: dt.y, m: dt.m, d: dt.d, key: sNorm(r[1]) || "CHUA RO", name: T(r[1]), spend: sp, mess: ms, data: da, mk: mkOf(r[6]) });
  });
  var by = {};
  rows.forEach(function (x) { var k = x.y * 100 + x.m; (by[k] = by[k] || []).push(x); });
  Object.keys(by).forEach(function (k) {
    var arr = by[k], lump = +k < curYM && arr.length <= 8 && arr.every(function (x) { return x.d === 1; });
    arr.forEach(function (x) { x.lump = lump; });
  });
  return rows;
}
function svcLeadRows(vals) {
  var out = [];
  vals.forEach(function (r) {
    var name = T(r[6]), phone = T(r[7]);
    if (!name && !phone) return;
    var lp = ymdOf(r[1]);
    if (!lp || !lp.y) return;
    out.push({
      n: dnum(lp.y, lp.m, lp.d), tele: T(r[2]), page: T(r[3]), source: T(r[4]), key: sNorm(r[5]) || "CHUA RO", svc: T(r[5]), name: name,
      phone: phone, addr: T(r[8]), contact: T(r[9]), apptTxt: T(r[11]), apptTime: T(r[12]), note: T(r[13]), stText: T(r[10]),
      pk: pKey(r[7]), country: ctry(r[8]), st: teleStat(r[10]), row: out.length
    });
  });
  return out;
}
function svcInvoiceRows(vals, leadIdx) {
  var out = [], prev = null, noAmt = [];
  vals.forEach(function (r) {
    if (!/^\d+$/.test(T(r[0]))) return;
    var dt = ymdOf(r[9]) || ymdOf(r[1]);
    if (!dt || !dt.y) return;
    var dn = dnum(dt.y, dt.m, dt.d), amt = sNum(r[10]) || sNum(r[4]);
    if (!(amt > 0)) { noAmt.push({ n: dn, name: T(r[2]) }); return; }
    var x = {
      n: dn, name: T(r[2]), phone: T(r[3]), pk: pKey(r[11]) || pKey(r[3]), amt: amt, page: T(r[7]), stt: T(r[0]),
      key: sNorm(r[8]), svcName: T(r[8]), mk: mkOf(r[12]), tag: T(r[6]), dep: /coc/i.test(sNorm(r[5]) + " " + sNorm(r[2])), keySrc: "", mkSrc: ""
    };
    var cands = x.pk ? leadIdx[x.pk] : null, lead = null;
    if (cands && cands.length) {
      for (var i = 0; i < cands.length; i++) if (cands[i].n <= dn) lead = cands[i];
      if (!lead) lead = cands[0];
    }
    x.lead = lead;
    var sameGroup = prev && prev.stt === x.stt && prev.n === x.n;
    if (x.key) x.keySrc = "sheet";
    else if (lead && lead.key !== "CHUA RO") { x.key = lead.key; x.keySrc = "lead"; }
    else if (sameGroup && prev.key) { x.key = prev.key; x.keySrc = "dòng trên"; }
    else x.key = "CHUA RO";
    if (x.mk) x.mkSrc = "sheet";
    else if (lead && lead.country) { x.mk = lead.country === "Việt Nam" ? "vn" : (lead.country === "Khác" ? "" : "vk"); if (x.mk) x.mkSrc = "lead"; }
    if (!x.mk && sameGroup && prev.mk) { x.mk = prev.mk; x.mkSrc = "dòng trên"; }
    x.country = lead ? lead.country : "";
    x.source = lead ? lead.source : "";
    x.tele = lead ? lead.tele : "";
    var lag = lead ? x.n - lead.n : null;
    x.lag = lag != null && lag >= 0 && lag <= 540 ? lag : null;
    out.push(x);
    prev = x;
  });
  return { rows: out, noAmt: noAmt };
}
API.getService = function () {
  return Promise.all([getVals(SPEND_RANGE), getVals("'HÓA ĐƠN'!A1:P3000"), getVals("DATA_SALE!A2:N6000")]).then(function (res) {
    var spend = svcSpendRows(res[0]), leads = svcLeadRows(res[2]), idx = {};
    leads.forEach(function (l) { if (l.pk) (idx[l.pk] = idx[l.pk] || []).push(l); });
    Object.keys(idx).forEach(function (k) { idx[k].sort(function (a, b) { return a.n - b.n; }); });
    var inv = svcInvoiceRows(res[1], idx);
    var names = {}, tot = {};
    function reg(key, name, v) { if (!names[key]) names[key] = name || key; tot[key] = (tot[key] || 0) + v; }
    spend.forEach(function (x) { reg(x.key, x.name, x.spend); });
    inv.rows.forEach(function (x) { if (x.key !== "CHUA RO") reg(x.key, x.svcName || x.key, x.amt); });
    var cnt = {};
    inv.rows.forEach(function (x) { if (x.pk) cnt[x.pk] = (cnt[x.pk] || 0) + 1; });
    return { spend: spend, leads: leads, inv: inv.rows, noAmt: inv.noAmt, names: names, tot: tot, buyCount: cnt, ts: Date.now() };
  });
};
function svcName(d, key) {
  if (key === "all") return "Tất cả dịch vụ";
  if (key === "CHUA RO") return "Chưa rõ dịch vụ";
  return sentence(d.names[key] || key);
}
function monthLen(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
function spendIn(d, key, a, b) {
  var o = { spend: 0, mess: 0, data: 0, est: false, mk: { vk: 0, vn: 0, "": 0 } };
  d.spend.forEach(function (x) {
    if (key !== "all" && x.key !== key) return;
    var f = 1;
    if (x.lump) {
      var s = dnum(x.y, x.m, 1), e = s + monthLen(x.y, x.m) - 1, lo = Math.max(a, s), hi = Math.min(b, e);
      if (hi < lo) return;
      f = (hi - lo + 1) / (e - s + 1);
      if (f < 1) o.est = true;
    } else if (x.n < a || x.n > b) return;
    o.spend += x.spend * f; o.mess += x.mess * f; o.data += x.data * f; o.mk[x.mk] += x.spend * f;
  });
  return o;
}
function svcCalc(d, key, a, b) {
  var sp = spendIn(d, key, a, b);
  var inv = d.inv.filter(function (x) { return x.n >= a && x.n <= b && (key === "all" || x.key === key); });
  var rev = 0, custs = {}, byMk = { vk: { rev: 0, c: 0 }, vn: { rev: 0, c: 0 }, "": { rev: 0, c: 0 } };
  inv.forEach(function (x) { rev += x.amt; custs[x.pk || ("n:" + sNorm(x.name))] = 1; byMk[x.mk].rev += x.amt; byMk[x.mk].c++; });
  var leads = d.leads.filter(function (l) { return l.n >= a && l.n <= b && (key === "all" || l.key === key); });
  var valid = leads.filter(function (l) { return l.st === "pot" || l.st === "book" || l.st === "inv"; }).length;
  var leadInv = leads.filter(function (l) { return l.st === "inv"; }).length;
  return {
    sp: sp, inv: inv, rev: rev, cnt: inv.length, custs: Object.keys(custs).length, byMk: byMk, leads: leads.length, valid: valid, leadInv: leadInv,
    roas: sp.spend > 0 ? rev / sp.spend : null, adsPct: rev > 0 ? sp.spend / rev : null, profit: rev - sp.spend,
    cpa: inv.length ? sp.spend / inv.length : null, aov: inv.length ? rev / inv.length : null,
    cpd: sp.data > 0 ? sp.spend / sp.data : null, cpm: sp.mess > 0 ? sp.spend / sp.mess : null, dm: sp.mess > 0 ? sp.data / sp.mess : null
  };
}
function medianOf(arr) { if (!arr.length) return null; var s = arr.slice().sort(function (x, y) { return x - y; }), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
function distRows(list, total) {
  if (!list.length) return '<div class="small">Chưa có dữ liệu.</div>';
  var max = Math.max.apply(null, list.map(function (x) { return x.c; })) || 1;
  return '<div class="funnel">' + list.map(function (x) {
    return '<div class="stage"><div class="top"><span class="name">' + esc(x.name) + '</span><span class="num sm">' + n(x.c) + ' <span class="small">· ' + pct(total ? x.c / total : 0) + (x.rev ? ' · ' + mon(x.rev) : '') + '</span></span></div><div class="track"><i class="' + (x.cls || "") + '" style="width:' + Math.max(x.c / max * 100, 2).toFixed(1) + '%"></i></div></div>';
  }).join("") + '</div>';
}
function groupBy(inv, fn) {
  var m = {}, order = [];
  inv.forEach(function (x) { var k = fn(x); if (!m[k]) { m[k] = { name: k, c: 0, rev: 0 }; order.push(k); } m[k].c++; m[k].rev += x.amt; });
  return order.map(function (k) { return m[k]; }).sort(function (x, y) { return y.c - x.c || y.rev - x.rev; });
}
function svcSeriesHtml(d, key, a, b) {
  var days = b - a + 1;
  if (days < 2) return "";
  if (days <= 31) {
    var sp = [], rv = [], max = 1, i;
    for (i = 0; i < days; i++) {
      var s = spendIn(d, key, a + i, a + i).spend, r = 0;
      d.inv.forEach(function (x) { if (x.n === a + i && (key === "all" || x.key === key)) r += x.amt; });
      sp.push(s); rv.push(r); max = Math.max(max, s, r);
    }
    var bars = "", labs = "";
    for (i = 0; i < days; i++) {
      var iso = dnIso(a + i), dd = +iso.slice(8);
      bars += '<div class="bar" title="' + iso2dmy(iso) + ': chi tiêu ' + vnd(sp[i]) + '"><div class="bf" style="height:' + (sp[i] / max * 100).toFixed(1) + '%"></div></div>' +
        '<div class="bar rv" title="' + iso2dmy(iso) + ': doanh thu ' + vnd(rv[i]) + '"><div class="bf" style="height:' + (rv[i] / max * 100).toFixed(1) + '%"></div></div>';
      labs += '<span>' + (dd === 1 || dd % 5 === 0 ? dd : "") + '</span>';
    }
    return '<div class="bars pair">' + bars + '</div><div class="blabs">' + labs + '</div><div class="legend2"><span><i style="background:var(--navy)"></i>Chi tiêu</span><span><i style="background:var(--good)"></i>Doanh thu</span></div>';
  }
  var rows = [], dt = new Date(a * 86400000), y = dt.getUTCFullYear(), m = dt.getUTCMonth() + 1;
  while (true) {
    var s0 = dnum(y, m, 1), e0 = s0 + monthLen(y, m) - 1;
    if (s0 > b) break;
    var lo = Math.max(a, s0), hi = Math.min(b, e0), c = svcCalc(d, key, lo, hi);
    rows.push({ label: "T" + m + "/" + y + (lo > s0 || hi < e0 ? "*" : ""), c: c });
    m++; if (m > 12) { m = 1; y++; }
  }
  return '<div class="cmp" style="grid-template-columns:minmax(0,.9fr) minmax(0,1fr) minmax(0,1fr) minmax(0,.7fr)"><span></span><b>Chi tiêu</b><b>Doanh thu</b><b>ROAS</b>' +
    rows.map(function (r) {
      return '<span class="k">' + r.label + '</span><span class="v">' + mon(r.c.sp.spend) + '</span><span class="v">' + mon(r.c.rev) + '</span><span class="v">' + dash(r.c.roas, function (x) { return n(x, 2) + "x"; }) + '</span>';
    }).join("") + '</div><div class="small">Dấu * là tháng chỉ tính một phần trong kỳ đã chọn.</div>';
}
function svcInsights(d, c, key, mkRows, srcRows, lags) {
  var out = [];
  if (c.cnt < 10) out.push("Mới có " + n(c.cnt) + " hóa đơn trong kỳ, các nhận xét dưới đây chỉ mang tính xu hướng.");
  if (c.roas != null) out.push("Chi " + mon(c.sp.spend) + " thu về " + mon(c.rev) + " doanh thu, ROAS " + n(c.roas, 2) + "x" + (c.roas < 1 ? ", đang thấp hơn mức hòa vốn doanh thu." : "."));
  var vk = c.byMk.vk, vn = c.byMk.vn, spvk = c.sp.mk.vk, spvn = c.sp.mk.vn;
  if (vk.c >= 3 && vn.c >= 3 && spvk > 0 && spvn > 0) {
    var rk = vk.rev / spvk, rn = vn.rev / spvn;
    out.push("Việt kiều: ROAS " + n(rk, 2) + "x (" + n(vk.c) + " hóa đơn). Việt Nam: ROAS " + n(rn, 2) + "x (" + n(vn.c) + " hóa đơn). Thị trường " + (rk >= rn ? "Việt kiều" : "Việt Nam") + " đang hiệu quả hơn.");
  }
  if (srcRows.length && c.matched >= 5) {
    var t = srcRows[0];
    out.push("Nguồn mang nhiều khách chốt nhất: \"" + t.name + "\" (" + n(t.c) + "/" + n(c.matched) + " hóa đơn nối được với lead, " + pct(t.c / c.matched) + ").");
  }
  var med = medianOf(c.inv.map(function (x) { return x.amt; }));
  if (med != null) out.push("Giá trị hóa đơn trung vị " + mon(med) + ", trung bình " + mon(c.aov) + (c.aov > med * 1.5 ? " (vài hóa đơn lớn kéo trung bình lên)." : "."));
  var ml = medianOf(lags);
  if (ml != null && lags.length >= 5) out.push("Một nửa số khách chốt trong " + n(ml) + " ngày kể từ khi lead về (tính trên " + n(lags.length) + " khách nối được lead).");
  if (c.matched < c.cnt * 0.6 && c.cnt >= 5) out.push("Chỉ nối được " + n(c.matched) + "/" + n(c.cnt) + " hóa đơn với lead (thiếu hoặc sai số điện thoại như \"mã QR\"), nên phần nguồn và quốc gia chỉ là tham khảo.");
  return out;
}
function svcCustCard(x) {
  var tel = x.phone.replace(/[^\d+]/g, ""), isNum = /^\+?\d{7,}$/.test(tel);
  var meta = [esc(dnDmy(x.n))];
  if (x.key !== "CHUA RO") meta.push(esc(sentence(svcData.names[x.key] || x.key)));
  meta.push(MK_NAME[x.mk]);
  if (x.country) meta.push(esc(x.country));
  var sub = [];
  if (x.tele) sub.push("Tele " + esc(x.tele));
  if (x.source) sub.push(esc(x.source));
  return '<div class="appt"><div class="svc-h"><b>' + esc(x.name || "Chưa có tên") + '</b><span class="pill good">' + mon(x.amt) + '</span></div>' +
    '<div class="appt-m">' + meta.join(" · ") + (x.dep ? ' · cọc' : '') + '</div>' +
    (sub.length || isNum ? '<div class="appt-m">' + sub.join(" · ") + (isNum ? (sub.length ? " · " : "") + '<a href="tel:' + tel + '">' + esc(x.phone) + '</a>' : "") + '</div>' : '') + '</div>';
}
function svcFillList(onlyList) {
  if (!svcData || !$("svcList")) return;
  var cur = curSvc, a = dnum.apply(null, cur.from.split("-").map(Number)), b = dnum.apply(null, cur.to.split("-").map(Number));
  var q = sNorm(svcLF.q), all = svcData.inv.filter(function (x) { return x.n >= a && x.n <= b && (svcSel === "all" || x.key === svcSel); });
  var base = all.filter(function (x) { return !q || sNorm([x.name, x.phone, x.source, x.tele, x.country].join(" ")).indexOf(q) >= 0 || (/^\d+$/.test(q) && x.phone.replace(/\D/g, "").indexOf(q) >= 0); });
  if (!onlyList) {
    var cnt = { all: base.length, vk: 0, vn: 0, "": 0 };
    base.forEach(function (x) { cnt[x.mk]++; });
    $("svcMk").innerHTML = [["all", "Tất cả"], ["vk", "Việt kiều"], ["vn", "Việt Nam"], ["", "Chưa rõ"]].map(function (c) {
      return '<button type="button" class="chip" data-sm="' + c[0] + '" aria-pressed="' + (svcLF.mk === c[0] ? "true" : "false") + '">' + c[1] + ' ' + cnt[c[0]] + '</button>';
    }).join("");
  }
  var list = base.filter(function (x) { return svcLF.mk === "all" || x.mk === svcLF.mk; }).sort(function (x, y) { return y.n - x.n || y.amt - x.amt; });
  var shown = list.slice(0, svcLF.limit);
  $("svcList").innerHTML = shown.length
    ? shown.map(svcCustCard).join("") + (list.length > shown.length ? '<button type="button" class="apply" data-smore="1">Xem thêm ' + Math.min(30, list.length - shown.length) + ' hóa đơn (còn ' + n(list.length - shown.length) + ')</button>' : '<div class="small">Đã hiện hết ' + n(list.length) + ' hóa đơn.</div>')
    : '<div class="small">Không có hóa đơn nào khớp bộ lọc.</div>';
}
function renderSvc() {
  var d = svcData;
  if (!d || !curSvc) return;
  var a = dnum.apply(null, curSvc.from.split("-").map(Number)), b = dnum.apply(null, curSvc.to.split("-").map(Number));
  if (svcSel !== "all" && !(svcSel in d.tot)) svcSel = "all";
  var key = svcSel, c = svcCalc(d, key, a, b), out = [];
  var keys = Object.keys(d.tot).filter(function (k) { return d.tot[k] > 0; }).sort(function (x, y) { return d.tot[y] - d.tot[x]; });
  out.push('<select class="lsearch" id="svcSel" aria-label="Chọn dịch vụ"><option value="all"' + (key === "all" ? " selected" : "") + '>Tất cả dịch vụ</option>' +
    keys.map(function (k) { return '<option value="' + esc(k) + '"' + (k === key ? " selected" : "") + '>' + esc(svcName(d, k)) + '</option>'; }).join("") + '</select>');

  out.push('<div class="hero"><div><div class="eyebrow">' + esc(svcName(d, key)) + ' · doanh thu</div><div class="big">' + vnd(c.rev) + '</div></div>' +
    '<div class="hero-stats cols3"><div><div class="eyebrow">Chi tiêu</div><div class="v">' + mon(c.sp.spend) + '</div></div>' +
    '<div><div class="eyebrow">ROAS</div><div class="v">' + dash(c.roas, function (x) { return n(x, 2) + "x"; }) + '</div></div>' +
    '<div><div class="eyebrow">Ads / DT</div><div class="v">' + dash(c.adsPct, pct) + '</div></div></div></div>');

  out.push('<section class="card"><div class="eyebrow">Chi tiêu và doanh thu</div><div class="rows">' +
    kv("Chi tiêu quảng cáo", vnd(c.sp.spend)) + kv("Doanh thu hóa đơn", vnd(c.rev)) +
    kv("Còn lại sau ads", (c.profit < 0 ? "−" : "") + vnd(Math.abs(c.profit))) +
    kv("Số hóa đơn", n(c.cnt) + " (" + n(c.custs) + " khách)") +
    kv("Giá trị hóa đơn trung bình", dash(c.aov, vnd)) + kv("Chi phí mỗi hóa đơn", dash(c.cpa, vnd)) + '</div>' +
    (c.sp.est ? '<div class="small">Chi tiêu trước tháng 7/2026 được nhập gộp theo tháng, nên với kỳ không trọn tháng app chia đều theo ngày (số ước tính).</div>' : '') + '</section>');

  out.push('<section class="card"><div class="eyebrow">Quảng cáo và lead</div><div class="rows">' +
    kv("Mess", n(Math.round(c.sp.mess))) + kv("Data", n(Math.round(c.sp.data))) + kv("Data / mess", dash(c.dm, pct)) +
    kv("CP / mess", dash(c.cpm, vnd)) + kv("CP / data", dash(c.cpd, vnd)) +
    kv("Lead ghi nhận (DATA_SALE)", n(c.leads)) + kv("Lead hợp lệ", n(c.valid) + (c.leads ? " · " + pct(c.valid / c.leads) : "")) + '</div></section>');

  var ch = svcSeriesHtml(d, key, a, b);
  if (ch) out.push('<section class="card"><div class="eyebrow">Chi tiêu và doanh thu theo thời gian</div>' + ch + '</section>');

  var mks = ["vk", "vn"].concat(c.byMk[""].c || c.sp.mk[""] ? [""] : []);
  out.push('<section class="card"><div class="eyebrow">Theo thị trường</div><div class="cmp" style="grid-template-columns:minmax(0,1.1fr) ' + mks.map(function () { return "minmax(0,1fr)"; }).join(" ") + '"><span></span>' +
    mks.map(function (m) { return '<b>' + MK_NAME[m] + '</b>'; }).join("") +
    [["Chi tiêu", function (m) { return mon(c.sp.mk[m]); }], ["Doanh thu", function (m) { return mon(c.byMk[m].rev); }],
     ["ROAS", function (m) { return m && c.sp.mk[m] > 0 ? n(c.byMk[m].rev / c.sp.mk[m], 2) + "x" : "-"; }],
     ["Hóa đơn", function (m) { return n(c.byMk[m].c); }],
     ["HĐ trung bình", function (m) { return c.byMk[m].c ? mon(c.byMk[m].rev / c.byMk[m].c) : "-"; }],
     ["CP / hóa đơn", function (m) { return m && c.byMk[m].c && c.sp.mk[m] > 0 ? mon(c.sp.mk[m] / c.byMk[m].c) : "-"; }]].map(function (r) {
      return '<span class="k">' + r[0] + '</span>' + mks.map(function (m) { return '<span class="v">' + r[1](m) + '</span>'; }).join("");
    }).join("") + '</div><div class="small">Nhóm "Chưa rõ" gồm chi tiêu hoặc hóa đơn chưa ghi thị trường, nên không tính ROAS riêng.</div></section>');

  // chân dung khách đã chốt
  var inv = c.inv, matched = inv.filter(function (x) { return x.lead; });
  c.matched = matched.length;
  var ctryRows = groupBy(inv, function (x) { return x.country || "Chưa rõ"; });
  var srcRows = groupBy(matched, function (x) { return x.source || "Không ghi nguồn"; });
  var teleRows = groupBy(matched, function (x) { return x.tele || "Chưa rõ"; });
  var bks = [["Dưới 5 triệu", 0, 5e6], ["5 đến dưới 10 triệu", 5e6, 1e7], ["10 đến dưới 30 triệu", 1e7, 3e7], ["30 đến dưới 70 triệu", 3e7, 7e7], ["Từ 70 triệu", 7e7, 1e18]];
  var billRows = bks.map(function (k) { var l = inv.filter(function (x) { return x.amt >= k[1] && x.amt < k[2]; }); return { name: k[0], c: l.length, rev: l.reduce(function (s, x) { return s + x.amt; }, 0) }; });
  var lags = matched.map(function (x) { return x.lag; }).filter(function (x) { return x != null; });
  var lbs = [["Trong ngày", 0, 0], ["1 đến 7 ngày", 1, 7], ["8 đến 30 ngày", 8, 30], ["31 đến 60 ngày", 31, 60], ["Trên 60 ngày", 61, 1e9]];
  var lagRows = lbs.map(function (k) { return { name: k[0], c: lags.filter(function (v) { return v >= k[1] && v <= k[2]; }).length, rev: 0 }; });
  var wd = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];
  var wdRows = groupBy(inv, function (x) { return wd[new Date(x.n * 86400000).getUTCDay()]; }).sort(function (x, y) { return wd.indexOf(x.name) - wd.indexOf(y.name); });
  var repeat = 0;
  var seen = {};
  inv.forEach(function (x) { if (x.pk && !seen[x.pk]) { seen[x.pk] = 1; if (d.buyCount[x.pk] > 1) repeat++; } });
  out.push('<div class="eyebrow" style="margin:4px 4px 0">Chân dung khách đã chốt</div>');
  var ins = svcInsights(d, c, key, [], srcRows, lags);
  if (ins.length) out.push('<section class="card"><div class="eyebrow">Nhận xét nhanh</div>' + ins.map(function (t) { return '<p class="verdict">' + esc(t) + '</p>'; }).join("") + '</section>');
  out.push('<section class="card"><div class="eyebrow">Quốc gia (theo cột Địa chỉ của lead)</div>' + distRows(ctryRows.slice(0, 7), inv.length) + '<div class="small">Chỉ biết được quốc gia khi hóa đơn nối được với lead có điền địa chỉ.</div></section>');
  out.push('<section class="card"><div class="eyebrow">Nguồn quảng cáo của khách chốt</div>' + distRows(srcRows.slice(0, 6), matched.length) + '<div class="small">Tính trên ' + n(matched.length) + '/' + n(inv.length) + ' hóa đơn nối được với lead qua số điện thoại.</div></section>');
  out.push('<section class="card"><div class="eyebrow">Tele chốt</div>' + distRows(teleRows, matched.length) + '</section>');
  out.push('<section class="card"><div class="eyebrow">Giá trị hóa đơn</div>' + distRows(billRows, inv.length) + '</section>');
  out.push('<section class="card"><div class="eyebrow">Thời gian từ lead đến hóa đơn</div>' + distRows(lagRows, lags.length) +
    '<div class="small">' + (lags.length ? 'Trung vị ' + n(medianOf(lags)) + ' ngày, tính trên ' + n(lags.length) + ' khách nối được lead.' : 'Chưa nối được khách nào với lead.') + '</div></section>');
  out.push('<section class="card"><div class="eyebrow">Ngày trong tuần khách chốt</div>' + distRows(wdRows, inv.length) +
    '<div class="small">Khách mua từ 2 lần trở lên: ' + n(repeat) + '/' + n(c.custs) + ' khách có số điện thoại.</div></section>');

  out.push('<section class="card" id="svcBox"><div class="eyebrow">Khách đã chuyển đổi trong kỳ</div>' +
    '<input type="search" class="lsearch" id="svcQ" placeholder="Tìm theo tên, số điện thoại, nguồn, quốc gia" autocomplete="off" value="' + esc(svcLF.q) + '">' +
    '<div class="presets" id="svcMk"></div><div id="svcList"></div></section>');

  var warns = [], inR = function (x) { return x.n >= a && x.n <= b; };
  var noSvc = inv.filter(function (x) { return x.key === "CHUA RO"; }).length, guess = inv.filter(function (x) { return x.keySrc === "lead" || x.keySrc === "dòng trên"; }).length;
  if (key === "all" && noSvc) warns.push(n(noSvc) + " hóa đơn chưa có dịch vụ và không suy ra được, nên chỉ nằm trong mục Tất cả dịch vụ.");
  if (guess) warns.push(n(guess) + " hóa đơn trong kỳ để trống cột dịch vụ, app suy ra từ lead cùng số điện thoại hoặc từ dòng ngay phía trên. Nên điền cột I (DỊCH VỤ) trong tab HÓA ĐƠN.");
  var noMk = inv.filter(function (x) { return !x.mk; }).length;
  if (noMk) warns.push(n(noMk) + " hóa đơn trong kỳ chưa rõ thị trường (Việt kiều hay Việt Nam) vì cột M (thị trường) trống.");
  var noAmt = d.noAmt.filter(inR).length;
  if (noAmt) warns.push(n(noAmt) + " dòng hóa đơn trong kỳ chưa có số tiền (cột BILL), nên chưa được tính vào doanh thu.");
  var noPhone = inv.filter(function (x) { return !x.pk; }).length;
  if (noPhone) warns.push(n(noPhone) + " hóa đơn không có số điện thoại hợp lệ (ví dụ ghi \"mã QR\"), nên không nối được với lead để biết nguồn và quốc gia.");
  var noSpMk = d.spend.filter(function (x) { return x.n >= a && x.n <= b && !x.mk && (key === "all" || x.key === key); }).length;
  if (noSpMk) warns.push(n(noSpMk) + " dòng chi tiêu trong kỳ chưa điền thị trường (cột G), nên chi tiêu đó nằm ở nhóm \"Chưa rõ\".");
  if (warns.length) out.push('<section class="card check"><div class="eyebrow">Cần kiểm tra trong sheet</div>' + warns.map(function (w) { return '<p class="verdict">' + esc(w) + '</p>'; }).join("") + '</section>');
  $("appSvc").innerHTML = out.join("");
  svcFillList(false);
}
function loadSvc() {
  if (busyS || !curSvc) return;
  busyS = true;
  run("getService", []).then(function (res) {
    svcData = res;
    var qa = document.activeElement && document.activeElement.id === "svcQ";
    if (qa) svcFillList(true); else renderSvc();
    if (view === "svc") { hideBanner(); updatePeriodText(); setStatus("live", "Đồng bộ với Google Sheets lúc " + hhmm(res.ts) + ". Tự làm mới mỗi phút."); }
    var m = $("svcMsg"); if (m) m.textContent = "";
  }).catch(function (err) {
    if (view !== "svc") return;
    showBanner("Không tải được số liệu. " + errText(err));
    setStatus("stale", svcData ? "Mất kết nối tạm thời. Đang giữ số liệu lúc " + hhmm(svcData.ts) + "." : "Chưa tải được số liệu.");
  }).then(function () { busyS = false; $("applySvc").disabled = false; $("refresh").disabled = false; $("refresh").textContent = "Làm mới"; });
}
function initSvc() {
  $("tabSvc").addEventListener("click", function () { setView("svc"); load(); });
  var p0 = svcPresets()[1];
  curSvc = { from: p0[1], to: p0[2] };
  $("svcPresets").innerHTML = svcPresets().map(function (p, i) { return '<button type="button" class="chip" data-i="' + i + '">' + p[0] + '</button>'; }).join("");
  $("svcPresets").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-i]");
    if (!b) return;
    var p = svcPresets()[+b.getAttribute("data-i")];
    $("sFrom").value = p[1]; $("sTo").value = p[2]; $("svcMsg").textContent = "";
  });
  $("applySvc").addEventListener("click", function () {
    var a = $("sFrom").value, b = $("sTo").value, msg = $("svcMsg");
    if (!a || !b) { msg.textContent = "Chọn đủ cả hai ngày."; return; }
    if (a > b) { msg.textContent = "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc."; return; }
    curSvc = { from: a, to: b };
    msg.textContent = ""; $("svcPanel").hidden = true; $("period").setAttribute("aria-expanded", "false");
    svcLF.limit = 30; updatePeriodText();
    if (svcData) renderSvc();
  });
  $("appSvc").addEventListener("change", function (e) {
    if (e.target.id !== "svcSel") return;
    svcSel = e.target.value; svcLF.limit = 30; renderSvc();
  });
  $("appSvc").addEventListener("click", function (e) {
    var t = e.target.closest("button");
    if (!t) return;
    if (t.hasAttribute("data-sm")) { svcLF.mk = t.getAttribute("data-sm"); svcLF.limit = 30; svcFillList(false); }
    else if (t.hasAttribute("data-smore")) { svcLF.limit += 30; svcFillList(true); }
  });
  $("appSvc").addEventListener("input", function (e) {
    if (e.target.id !== "svcQ") return;
    svcLF.q = e.target.value; svcLF.limit = 30; svcFillList(false);
  });
}

/* ---- Trang "Hôm nay": tình trạng trong ngày cho quản lý (đọc trực tiếp từ sheet, không ghi) ---- */
var todayData = null, busyTd = false, tdOff = 0, tdF = { st: "all", tele: "all", limit: 40 };
function tdDay(d, k) {
  var o = spendIn(d, "all", k, k), rev = 0, cnt = 0;
  d.inv.forEach(function (x) { if (x.n === k) { rev += x.amt; cnt++; } });
  return { spend: o.spend, mess: o.mess, data: o.data, rev: rev, cnt: cnt, mk: o.mk };
}
function tdLeadGroup(st) { return st === "pot" || st === "book" || st === "inv" || st === "untouched" || st === "consult" ? st : "etc"; }
function tdLeadCard(l) {
  var s = LST[l.st] || ["", ""], label = l.st === "other" ? (l.stText || "Khác") : s[0];
  var tel = l.phone.replace(/[^\d+]/g, ""), isNum = /^\+?\d{7,}$/.test(tel);
  var m1 = ["Tele " + esc(l.tele || "chưa rõ")];
  if (l.svc) m1.push(esc(sentence(l.svc)));
  if (l.addr) m1.push(esc(l.addr));
  var m2 = [];
  if (l.source) m2.push(esc(l.source));
  if (l.contact) m2.push("Liên lạc: " + esc(l.contact));
  var notes = [];
  if (l.apptTxt) notes.push("Hẹn: " + esc(l.apptTxt) + (l.apptTime ? " " + esc(l.apptTime) : ""));
  if (l.note) notes.push(esc(l.note));
  return '<div class="appt"><div class="svc-h"><b>' + esc(l.name || "Chưa có tên") + '</b><span class="pill ' + s[1] + '">' + esc(label || "Chưa có tình trạng") + '</span></div>' +
    '<div class="appt-m">' + m1.join(" · ") + '</div>' +
    (m2.length || l.phone ? '<div class="appt-m">' + m2.join(" · ") + (l.phone ? (m2.length ? " · " : "") + (isNum ? '<a href="tel:' + tel + '">' + esc(l.phone) + '</a>' : esc(l.phone)) : "") + '</div>' : '') +
    (notes.length ? '<div class="appt-n">' + notes.join(" · ") + '</div>' : '') + '</div>';
}
function fillTodayData() {
  var d = todayData, box = $("tdData");
  if (!d || !box) return;
  var t = todayNum(), k = t - tdOff, Tk = tdDay(d, k), dmy = dnDmy(k);
  var L = d.leads.filter(function (l) { return l.n === k; }).sort(function (a, b) { return b.row - a.row; });
  var g = { pot: 0, book: 0, inv: 0, untouched: 0, consult: 0, etc: 0 };
  L.forEach(function (l) { g[tdLeadGroup(l.st)]++; });
  var valid = g.pot + g.book + g.inv, out = [];
  var dayChips = [["Hôm nay", 0], ["Hôm qua", 1], ["2 ngày trước", 2]].map(function (c) {
    return '<button type="button" class="chip" data-td="' + c[1] + '" aria-pressed="' + (tdOff === c[1] ? "true" : "false") + '">' + c[0] + ' ' + dnDmy(t - c[1]).slice(0, 5) + '</button>';
  }).join("");
  out.push('<section class="card"><div class="eyebrow">Tình trạng data</div><div class="presets">' + dayChips + '</div><div class="rows">' +
    kv("Data theo quảng cáo", n(Math.round(Tk.data))) + kv("Lead đã nhập DATA_SALE", n(L.length)) + kv("Lead hợp lệ", n(valid) + (L.length ? " · " + pct(valid / L.length) : "")) + '</div>');
  var rowsL = [["Tiềm năng", g.pot, ""], ["Đặt hẹn", g.book, ""], ["Hóa đơn", g.inv, "ok"], ["Chưa tư vấn", g.untouched, "warn"], ["Tham khảo", g.consult, ""], ["Khác (rớt, huỷ, bỏ, không nghe máy...)", g.etc, ""]];
  out.push('<div class="funnel" style="margin-top:12px">' + rowsL.map(function (r) {
    var p = L.length ? r[1] / L.length : 0;
    return '<div class="stage"><div class="top"><span class="name">' + r[0] + '</span><span class="num sm">' + n(r[1]) + ' <span class="small">· ' + pct(p) + '</span></span></div><div class="track"><i class="' + r[2] + '" style="width:' + Math.max(p * 100, 1).toFixed(1) + '%"></i></div></div>';
  }).join("") + '</div>' +
    (Tk.data > L.length ? '<div class="small">Quảng cáo báo ' + n(Math.round(Tk.data)) + ' data nhưng mới nhập ' + n(L.length) + ' lead vào DATA_SALE, tele có thể chưa nhập hết.</div>' : '') + '</section>');

  var tl = {}, tk = [];
  L.forEach(function (l) { var key = teleKey(l.tele) || "CHUARO"; if (!tl[key]) { tl[key] = { name: l.tele || "Chưa rõ", n: 0, valid: 0, un: 0 }; tk.push(key); } tl[key].n++; if (l.st === "pot" || l.st === "book" || l.st === "inv") tl[key].valid++; if (l.st === "untouched") tl[key].un++; });
  if (tk.length) out.push('<section class="card"><div class="eyebrow">Lead ngày ' + dmy.slice(0, 5) + ' theo tele</div><div class="cmp" style="grid-template-columns:minmax(0,1.1fr) ' + tk.map(function () { return "minmax(0,1fr)"; }).join(" ") + '"><span></span>' +
    tk.map(function (key) { return '<b>' + esc(tl[key].name) + '</b>'; }).join("") +
    [["Lead mới", "n"], ["Hợp lệ", "valid"], ["Chưa tư vấn", "un"]].map(function (r) { return '<span class="k">' + r[0] + '</span>' + tk.map(function (key) { return '<span class="v">' + n(tl[key][r[1]]) + '</span>'; }).join(""); }).join("") + '</div></section>');

  // danh sách từng lead
  var byTele = L.filter(function (l) { return tdF.tele === "all" || l.tele === tdF.tele; });
  var cnt = { all: byTele.length, pot: 0, book: 0, inv: 0, untouched: 0, consult: 0, etc: 0 };
  byTele.forEach(function (l) { cnt[tdLeadGroup(l.st)]++; });
  var teleNames = [];
  L.forEach(function (l) { if (l.tele && teleNames.indexOf(l.tele) < 0) teleNames.push(l.tele); });
  var teleChips = teleNames.length > 1 ? '<div class="presets"><button type="button" class="chip" data-tdt="all" aria-pressed="' + (tdF.tele === "all" ? "true" : "false") + '">Tất cả tele ' + L.length + '</button>' +
    teleNames.map(function (nm) { return '<button type="button" class="chip" data-tdt="' + esc(nm) + '" aria-pressed="' + (tdF.tele === nm ? "true" : "false") + '">' + esc(nm) + ' ' + L.filter(function (l) { return l.tele === nm; }).length + '</button>'; }).join("") + '</div>' : "";
  var stChips = '<div class="presets">' + [["all", "Tất cả"], ["pot", "Tiềm năng"], ["book", "Đặt hẹn"], ["inv", "Hóa đơn"], ["untouched", "Chưa tư vấn"], ["consult", "Tham khảo"], ["etc", "Khác"]].map(function (c) {
    return '<button type="button" class="chip" data-tds="' + c[0] + '" aria-pressed="' + (tdF.st === c[0] ? "true" : "false") + '">' + c[1] + ' ' + cnt[c[0]] + '</button>';
  }).join("") + '</div>';
  var list = byTele.filter(function (l) { return tdF.st === "all" || tdLeadGroup(l.st) === tdF.st; });
  var shown = list.slice(0, tdF.limit);
  out.push('<section class="card"><div class="eyebrow">Danh sách data ngày ' + dmy + '</div>' + teleChips + stChips + '<div class="tdlist">' +
    (shown.length ? shown.map(tdLeadCard).join("") + (list.length > shown.length ? '<button type="button" class="apply" data-tdmore="1">Xem thêm ' + n(Math.min(40, list.length - shown.length)) + ' lead (còn ' + n(list.length - shown.length) + ')</button>' : "")
      : '<div class="small">' + (L.length ? 'Không có lead nào khớp bộ lọc.' : 'Chưa có lead nào của ngày ' + dmy + ' trong DATA_SALE.') + '</div>') + '</div></section>');

  var chk = [];
  var noTele = L.filter(function (l) { return !l.tele; }).length, noSvc = L.filter(function (l) { return l.key === "CHUA RO"; }).length, noSt = L.filter(function (l) { return l.st === "blank"; }).length;
  if (noTele) chk.push(n(noTele) + " lead chưa có tele.");
  if (noSvc) chk.push(n(noSvc) + " lead chưa có dịch vụ.");
  if (noSt) chk.push(n(noSt) + " lead chưa có tình trạng.");
  if (chk.length) out.push('<section class="card check"><div class="eyebrow">Cần kiểm tra trong sheet</div>' + chk.map(function (w) { return '<p class="verdict">' + esc(w) + '</p>'; }).join("") + '</section>');
  box.innerHTML = out.join("");
}
/* Cảnh báo trong ngày: chỉ so với chính lịch sử 7 ngày trước, không dùng mục tiêu cố định */
function tdAlerts(d, t, T0, av) {
  var al = [], hr = new Date().getHours(), sv = {};
  d.spend.forEach(function (x) {
    var s;
    if (x.n === t) { s = sv[x.key] || (sv[x.key] = { name: x.name || x.key, t: { spend: 0, mess: 0, data: 0 }, b: { spend: 0, data: 0 } }); s.name = x.name || s.name; s.t.spend += x.spend; s.t.mess += x.mess; s.t.data += x.data; }
    else if (x.n >= t - 7 && x.n < t) { s = sv[x.key] || (sv[x.key] = { name: x.name || x.key, t: { spend: 0, mess: 0, data: 0 }, b: { spend: 0, data: 0 } }); s.b.spend += x.spend; s.b.data += x.data; }
  });
  Object.keys(sv).forEach(function (k) {
    var s = sv[k], avgS = s.b.spend / 7, nm = sentence(s.name);
    if (avgS <= 0 || s.t.spend < avgS * 0.5) return;
    if (s.t.data === 0) {
      if (hr >= 12) al.push({ lvl: "bad", title: nm + ": đã chi tiêu nhưng chưa có data", text: "Chi " + vnd(s.t.spend) + ", " + n(Math.round(s.t.mess)) + " mess, 0 data. Tele có thể chưa nhập hoặc chưa có khách." });
    } else if (s.b.data >= 5 && s.b.spend > 0) {
      var cpd = s.t.spend / s.t.data, base = s.b.spend / s.b.data, r = cpd / base;
      if (r >= 1.5) al.push({ lvl: r >= 2 ? "bad" : "warn", title: nm + ": CP/data cao hơn bình thường", text: "Hôm nay " + vnd(cpd) + ", trung bình 7 ngày " + vnd(base) + " (gấp " + n(r, 1) + " lần)." });
    }
  });
  if (av.spend > 0 && T0.spend > av.spend * 1.5) al.push({ lvl: "warn", title: "Chi tiêu tăng mạnh so với thường lệ", text: "Hôm nay " + vnd(T0.spend) + ", trung bình 7 ngày " + vnd(av.spend) + " (gấp " + n(T0.spend / av.spend, 1) + " lần)." });
  var un = {}, unN = 0;
  d.leads.forEach(function (l) {
    if (l.n >= t - 7 && l.n < t && l.st === "untouched") { var nm = l.tele || "Chưa rõ"; un[nm] = (un[nm] || 0) + 1; unN++; }
  });
  if (unN) al.push({ lvl: "warn", title: n(unN) + " lead cũ vẫn ở trạng thái Chưa tư vấn", text: "Trong 7 ngày trước: " + Object.keys(un).map(function (k) { return k + " " + n(un[k]); }).join(", ") + ". Xem chi tiết ở tab Tele." });
  al.sort(function (a, b) { return (a.lvl === "bad" ? 0 : 1) - (b.lvl === "bad" ? 0 : 1); });
  return al;
}
function tdAlertHtml(al) {
  if (!al.length) return '<section class="card"><div class="eyebrow">Cảnh báo</div><p class="verdict"><span class="pill good">Ổn</span> Chưa có điểm bất thường so với 7 ngày trước.</p></section>';
  return '<section class="card check"><div class="eyebrow">Cần chú ý (' + al.length + ')</div>' + al.map(function (a) {
    return '<p class="verdict"><span class="pill ' + a.lvl + '">' + (a.lvl === "bad" ? "Gấp" : "Theo dõi") + '</span> <b>' + esc(a.title) + '</b><br>' + esc(a.text) + '</p>';
  }).join("") + '</section>';
}
function renderToday() {
  var d = todayData;
  if (!d) return;
  var t = todayNum(), T0 = tdDay(d, t), Y = tdDay(d, t - 1), out = [], i;
  var av = { spend: 0, mess: 0, data: 0 };
  for (i = 1; i <= 7; i++) { var q = tdDay(d, t - i); av.spend += q.spend; av.mess += q.mess; av.data += q.data; }
  av.spend /= 7; av.mess /= 7; av.data /= 7;
  var hasToday = d.spend.some(function (x) { return x.n === t; });
  var dmy = dnDmy(t), wd = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"][new Date(t * 86400000).getUTCDay()];

  out.push('<div class="hero"><div><div class="eyebrow">' + wd + ' ' + dmy.slice(0, 5) + ' · chi tiêu hôm nay</div><div class="big">' + vnd(T0.spend) + '</div></div>' +
    '<div class="hero-stats cols3"><div><div class="eyebrow">Mess</div><div class="v">' + n(Math.round(T0.mess)) + '</div></div>' +
    '<div><div class="eyebrow">Data</div><div class="v">' + n(Math.round(T0.data)) + '</div></div>' +
    '<div><div class="eyebrow">Data / mess</div><div class="v">' + dash(T0.mess > 0 ? T0.data / T0.mess : null, pct) + '</div></div></div></div>');

  out.push(tdAlertHtml(tdAlerts(d, t, T0, av)));

  if (!hasToday) out.push('<section class="card check"><div class="eyebrow">Chưa có số liệu chi tiêu hôm nay</div><p class="verdict">Tab CHI_PHI_HANG_NGAY chưa có dòng nào của ngày ' + dmy + '. Chi tiêu thường được nhập trong ngày, nên các số trên sẽ cập nhật khi có dòng mới.</p></section>');

  out.push('<section class="card"><div class="eyebrow">Hiệu quả hôm nay</div><div class="rows">' +
    kv("CP / data", dash(T0.data > 0 ? T0.spend / T0.data : null, vnd)) + kv("CP / mess", dash(T0.mess > 0 ? T0.spend / T0.mess : null, vnd)) +
    kv("Doanh thu hóa đơn hôm nay", vnd(T0.rev) + " (" + n(T0.cnt) + " hóa đơn)") +
    kv("ROAS hôm nay", dash(T0.spend > 0 ? T0.rev / T0.spend : null, function (x) { return n(x, 2) + "x"; })) + '</div></section>');

  var cmp = [["Chi tiêu", "spend", mon], ["Mess", "mess", function (x) { return n(Math.round(x)); }], ["Data", "data", function (x) { return n(Math.round(x)); }]];
  out.push('<section class="card"><div class="eyebrow">So với hôm qua và trung bình 7 ngày</div><div class="cmp" style="grid-template-columns:minmax(0,.9fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)"><span></span><b>Hôm nay</b><b>Hôm qua</b><b>TB 7 ngày</b>' +
    cmp.map(function (c) { return '<span class="k">' + c[0] + '</span><span class="v">' + c[2](T0[c[1]]) + '</span><span class="v">' + c[2](Y[c[1]]) + '</span><span class="v">' + c[2](av[c[1]]) + '</span>'; }).join("") +
    '<span class="k">CP / data</span><span class="v">' + dash(T0.data > 0 ? T0.spend / T0.data : null, mon) + '</span><span class="v">' + dash(Y.data > 0 ? Y.spend / Y.data : null, mon) + '</span><span class="v">' + dash(av.data > 0 ? av.spend / av.data : null, mon) + '</span>' +
    '</div><div class="small">Hôm nay chưa hết ngày nên số có thể còn thấp hơn hôm qua.</div></section>');

  var sv = {}, order = [];
  d.spend.forEach(function (x) {
    if (x.n !== t) return;
    var s = sv[x.key] || (sv[x.key] = { name: x.name || x.key, spend: 0, mess: 0, data: 0 }); if (order.indexOf(x.key) < 0) order.push(x.key);
    s.spend += x.spend; s.mess += x.mess; s.data += x.data;
  });
  order.sort(function (a, b) { return sv[b].spend - sv[a].spend; });
  var cards = order.filter(function (k) { return sv[k].spend > 0 || sv[k].mess > 0 || sv[k].data > 0; }).map(function (k) {
    var s = sv[k];
    return '<div class="svc"><div class="svc-h"><b>' + esc(sentence(s.name)) + '</b><span class="pill good">' + n(Math.round(T0.spend ? s.spend / T0.spend * 100 : 0)) + '%</span></div>' +
      '<div class="svc-k"><div><div class="k">Chi tiêu</div><div class="v">' + vnd(s.spend) + '</div></div>' +
      '<div><div class="k">CP / data</div><div class="v">' + dash(s.data > 0 ? s.spend / s.data : null, vnd) + '</div></div>' +
      '<div><div class="k">Data / mess</div><div class="v">' + dash(s.mess > 0 ? s.data / s.mess : null, pct) + '</div></div></div>' +
      '<div class="svc-sub"><span>Mess <b>' + n(Math.round(s.mess)) + '</b></span><span>Data <b>' + n(Math.round(s.data)) + '</b></span></div></div>';
  }).join("");
  out.push('<section class="card"><div class="eyebrow">Theo dịch vụ hôm nay</div>' + (cards || '<div class="small">Hôm nay chưa có dịch vụ nào ghi chi tiêu.</div>') +
    '<div class="rows" style="margin-top:8px">' + kv("Việt kiều (chi tiêu)", vnd(T0.mk.vk)) + kv("Việt Nam (chi tiêu)", vnd(T0.mk.vn)) + (T0.mk[""] > 0 ? kv("Chưa ghi thị trường", vnd(T0.mk[""])) : "") + '</div></section>');

  out.push('<div id="tdData"></div>');

  var invT = d.inv.filter(function (x) { return x.n === t; });
  out.push('<section class="card"><div class="eyebrow">Hóa đơn hôm nay</div>' + (invT.length ? '<div class="rows">' + invT.map(function (x) {
    return '<div class="row"><span class="k">' + esc(x.name || "Chưa có tên") + '<br><span class="small">' + esc(x.key === "CHUA RO" ? "Chưa rõ dịch vụ" : sentence(d.names[x.key] || x.key)) + '</span></span><span class="v">' + vnd(x.amt) + '</span></div>';
  }).join("") + '</div>' : '<div class="small">Hôm nay chưa có hóa đơn nào.</div>') + '</section>');
  $("appToday").innerHTML = out.join("");
  fillTodayData();
}
function loadToday() {
  if (busyTd) return;
  busyTd = true;
  run("getService", []).then(function (res) {
    todayData = res; renderToday();
    if (view === "today") { hideBanner(); updatePeriodText(); setStatus("live", "Đồng bộ với Google Sheets lúc " + hhmm(res.ts) + ". Tự làm mới mỗi phút."); }
  }).catch(function (err) {
    if (view !== "today") return;
    showBanner("Không tải được số liệu. " + errText(err));
    setStatus("stale", todayData ? "Mất kết nối tạm thời. Đang giữ số liệu lúc " + hhmm(todayData.ts) + "." : "Chưa tải được số liệu.");
  }).then(function () { busyTd = false; $("refresh").disabled = false; $("refresh").textContent = "Làm mới"; });
}
function initToday() {
  $("tabToday").addEventListener("click", function () { setView("today"); load(); });
  $("appToday").addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    if (b.hasAttribute("data-td")) { tdOff = +b.getAttribute("data-td"); tdF.limit = 40; fillTodayData(); }
    else if (b.hasAttribute("data-tdt")) { tdF.tele = b.getAttribute("data-tdt"); tdF.limit = 40; fillTodayData(); }
    else if (b.hasAttribute("data-tds")) { tdF.st = b.getAttribute("data-tds"); tdF.limit = 40; fillTodayData(); }
    else if (b.hasAttribute("data-tdmore")) { tdF.limit += 40; fillTodayData(); }
  });
}

$("app").innerHTML = '<section class="card"><div class="small">Đang tải số liệu từ Google Sheets…</div></section>';
setStatus("stale", "Đang tải số liệu…");
$("foot").textContent = "Nguồn: file BAO CAO TONG QUAN - DORIAS";
initUi();
initDay();
initMore();
initTele();
initSvc();
initToday();
$("loginBtn").addEventListener("click", startLogin);
$("signout").addEventListener("click", signOut);
function tick() {
  if (document.hidden) return;
  if (authOk()) load(); else if ($("login").hidden) showLogin("Phiên đăng nhập đã hết hạn.");
}
if (authOk()) { hideLogin(); load(); } else showLogin("");
var gisTries = 0, gisTimer = setInterval(function () { if (gisReady() || ++gisTries > 40) { clearInterval(gisTimer); initAuthClient(); } }, 250);
setInterval(tick, 60000);
var hiddenAt = 0;
document.addEventListener("visibilitychange", function () {
  if (document.hidden) { hiddenAt = Date.now(); return; }
  if (hiddenAt && Date.now() - hiddenAt > IDLE_MS && authOk()) { clearTok(); showLogin("Đã tự khóa sau một thời gian không dùng. Đăng nhập lại để xem số liệu."); }
  hiddenAt = 0;
});
document.addEventListener("visibilitychange", tick);
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function () {});
