// Lưu giao diện để mở nhanh. Số liệu từ Google Sheets không bao giờ được lưu lại.
var V = "dorias-v8";
var SHELL = ["./", "index.html", "app.js", "config.js", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png"];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(V).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var r = e.request;
  if (r.method !== "GET" || new URL(r.url).origin !== self.location.origin) return;
  e.respondWith(fetch(r).then(function (res) {
    if (res.ok && res.type === "basic") { var copy = res.clone(); caches.open(V).then(function (c) { c.put(r, copy); }); }
    return res;
  }).catch(function () { return caches.match(r).then(function (m) { return m || caches.match("./"); }); }));
});
