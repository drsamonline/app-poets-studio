/* sw.js — the service worker that makes Poet's Studio offline BEFORE it loads.
 *
 * The app already works offline once it is on the screen: the dictionary is in
 * the bundle and nothing is fetched. A worker changes the other half — the app
 * opens with the network off, from an icon, with no server involved.
 *
 * Two rules, both learned the hard way:
 *
 *   1. HTML is NETWORK-FIRST. The cache is only the offline fallback. A worker
 *      that answers the page from cache and never changes its cache name is a
 *      shipped release nobody can see.
 *   2. CACHE is bumped on every release. The footer prints a build stamp, so
 *      "am I on the new one?" is answerable from the page itself.
 *
 * No dependencies. Same origin only; another origin is never intercepted.
 */
"use strict";

var CACHE = "poets-studio-2026-11-01.1";

var ASSETS = [
  "./",
  "./index.html",
  "./poetry.js",
  "./dict.js",
  "./samples.js",
  "./web-kit.js",
  "./export-kit.js",
  "./manifest.webmanifest",
  "../icon.svg",
  "../assets/icon-192.png",
  "../assets/icon-512.png",
  "../assets/icon-maskable-512.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      // One at a time, so a single missing file cannot lose the whole install.
      return Promise.all(ASSETS.map(function (url) {
        return cache.add(new Request(url, { cache: "reload" })).catch(function () { return null; });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

function put(request, response) {
  if (!response || !response.ok || response.type === "opaque") return response;
  var copy = response.clone();
  caches.open(CACHE).then(function (cache) { cache.put(request, copy); }).catch(function () {});
  return response;
}

self.addEventListener("fetch", function (event) {
  var request = event.request;
  if (request.method !== "GET") return;

  var url;
  try { url = new URL(request.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return;

  var accept = request.headers.get("accept") || "";
  var isHTML = request.mode === "navigate" || accept.indexOf("text/html") >= 0;

  if (isHTML) {
    event.respondWith(
      fetch(request).then(function (response) { return put(request, response); })
        .catch(function () {
          return caches.match(request).then(function (hit) {
            return hit || caches.match("./index.html");
          });
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(function (hit) {
      if (hit) {
        // cache-first, with a background refresh so the next load is current
        fetch(request).then(function (response) { put(request, response); }).catch(function () {});
        return hit;
      }
      return fetch(request).then(function (response) { return put(request, response); });
    })
  );
});
