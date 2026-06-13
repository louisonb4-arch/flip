// Service worker Flip — web push (iOS 16.4+ PWA, Android, desktop).
// Bump ce numéro pour forcer iOS à recharger le SW (cache agressif).
const SW_VERSION = "v3";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "👀 Tu as reçu un Flip", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "👀 Tu as reçu un Flip";
  const options = {
    body: data.body || "Un profil que tu suis a changé.",
    icon: "/icon-192.png",
    badge: "/icon-96.png",
    data: { url: data.url || "/notifications" },
    tag: "flip-" + Date.now(), // évite la fusion silencieuse des notifs
  };

  // iOS révoque la permission si une push ne montre PAS de notification → toujours afficher.
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/notifications";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (list) => {
      // tente de focus une fenêtre existante ; si elle a été fermée entre-temps,
      // focus() rejette → on passe à la suivante, et en dernier recours on ouvre.
      for (const c of list) {
        if ("focus" in c) {
          try {
            return await c.focus();
          } catch {
            /* fenêtre fermée → suivante */
          }
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
