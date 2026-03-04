self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // Basit SW; üretimde gelişmiş cache stratejisi eklenebilir.
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = null;
  try {
    payload = event.data.json();
  } catch {
    payload = { notification: { title: '48Takvim Bildirimi', body: event.data.text() } };
  }

  const title = payload?.notification?.title ?? '48Takvim Bildirimi';
  const body = payload?.notification?.body ?? '';
  const icon = payload?.notification?.icon ?? '/icons/icon-192.svg';
  const badge = payload?.notification?.badge ?? '/icons/icon-192.svg';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      data: payload?.data ?? {},
    })
  );
});
