"use client";

import { useEffect } from "react";

// No service worker is ever registered in this app (see UpdateChecker for
// how update detection works instead) — this only exists to clean up if one
// is ever added and later removed again. Deleting a service worker file
// server-side does nothing for a browser that already installed it, so an
// active unregister is the only way to retire it.
export default function ServiceWorkerCleanup() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
    if (typeof caches !== "undefined") {
      caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
    }
  }, []);

  return null;
}
