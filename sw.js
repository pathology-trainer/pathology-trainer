const CACHE_NAME = "pathology-trainer-catalog-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./rk1.html",
  "./css/catalog.css",
  "./css/app.css",
  "./js/catalog.js",
  "./js/app.js",
  "./js/pwa.js",
  "./data/questions.js",
  "./assets/c-diphtheriae-micrograph.jpg",
  "./assets/coming-soon-coder-cartoon.png",
  "./assets/coming-soon-comic-cartoon.png",
  "./assets/coming-soon-textbooks-cartoon.png",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  "./robots.txt"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
  );
  self.clients.claim();
});

function isLiveResource(request, url) {
  if (request.mode === "navigate") return true;
  return [".js", ".css", ".webmanifest", ".html"].some(ext => url.pathname.endsWith(ext));
}

async function networkFirst(request) {
  try {
    const response = await fetch(request, { cache: "no-store" });
    if (response && response.status === 200) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === "navigate") return caches.match("./index.html");
    throw new Error("offline");
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.status === 200 && response.type !== "opaque") {
    const copy = response.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
  }
  return response;
}

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(isLiveResource(event.request, url) ? networkFirst(event.request) : cacheFirst(event.request));
});
