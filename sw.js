const CACHE = 'mi-entreno-v2';
const STATE = 'mi-entreno-state';
const ASSETS = ['./', 'index.html', 'styles.css', 'app.js', 'routine.js', 'manifest.webmanifest',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE && k !== STATE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Red primero (para recibir actualizaciones), caché si no hay internet
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    fetch(e.request).then((r) => {
      const copy = r.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('index.html')))
  );
});

// ---- Recordatorio diario en segundo plano (Android, app instalada)
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

async function maybeRemind() {
  const c = await caches.open(STATE);
  const res = await c.match('state.json');
  if (!res) return;
  const st = await res.json();
  if (!st.notif || Notification.permission !== 'granted') return;
  const now = new Date(), today = ymd(now), wd = now.getDay();
  if (!st.days.includes(wd) || st.lastNotified === today || (st.trained || []).includes(today)) return;
  const [h, m] = st.time.split(':').map(Number);
  if (now.getHours() * 60 + now.getMinutes() < h * 60 + m) return;
  // Si la app está abierta, ella se encarga
  const wins = await self.clients.matchAll({ type: 'window' });
  if (wins.some((w) => w.visibilityState === 'visible')) return;
  st.lastNotified = today;
  await c.put('state.json', new Response(JSON.stringify(st), { headers: { 'Content-Type': 'application/json' } }));
  const msg = st.msgs[wd] || { title: 'Hoy toca entrenar 💪', body: 'Abre Mi Entreno para ver tu rutina.' };
  await self.registration.showNotification(msg.title, {
    body: msg.body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'recordatorio-entreno', vibrate: [200, 100, 200],
  });
}
self.addEventListener('periodicsync', (e) => {
  if (e.tag === 'recordatorio-entreno') e.waitUntil(maybeRemind());
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ws) => {
    const w = ws.find((x) => x.url.startsWith(self.registration.scope));
    return w ? w.focus() : self.clients.openWindow('./');
  }));
});
