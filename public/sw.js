self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "👀 Tu as reçu un Flip", body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(data.title ?? "👀 Tu as reçu un Flip", {
      body: data.body ?? "",
      icon: data.icon ?? "/icon-192.png",
      badge: "/icon-96.png",
      data: { url: data.url ?? "/notifications" },
      vibrate: [100, 50, 100],
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/notifications";
  event.waitUntil(clients.openWindow(url));
});
