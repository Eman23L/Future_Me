const CACHE_NAME = "future-me-v6";
const OFFLINE_SHELL = "/index.html";
const STATIC_ASSETS = [
  "/manifest.webmanifest",
  "/icons/icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([OFFLINE_SHELL, ...STATIC_ASSETS]))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => caches.open(CACHE_NAME).then((cache) => cache.addAll([OFFLINE_SHELL, ...STATIC_ASSETS])))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  if (event.request.mode === "navigate") {
    event.respondWith(networkFirst(event.request, OFFLINE_SHELL));
    return;
  }

  event.respondWith(networkFirst(event.request));
});

self.addEventListener("push", (event) => {
  let payload = {
    title: "FutureMe reminder",
    body: "Something in your gentle plan is coming up.",
    icon: "/icons/icon.svg",
    badge: "/icons/icon.svg",
    data: {
      url: "/"
    }
  };

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch {
      payload.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon || "/icons/icon.svg",
      badge: payload.badge || "/icons/icon.svg",
      data: payload.data || {},
      tag: payload.data?.task_id || payload.title,
      renotify: true
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const focused = clients.find((client) => client.url.startsWith(self.location.origin) && "focus" in client);
      if (focused) {
        focused.navigate(targetUrl);
        return focused.focus();
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return undefined;
    })
  );
});

async function networkFirst(request, fallbackUrl) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return fallbackUrl ? caches.match(fallbackUrl) : Response.error();
  }
}
