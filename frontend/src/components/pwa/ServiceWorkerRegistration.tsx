"use client";

import { useEffect } from "react";

// Registers the hand-rolled service worker at /sw.js (frontend/public/sw.js)
// for PWA/offline support (FEATURE.md's Cross-Cutting Platform Features,
// P1). Rendered once from the root layout — see app/layout.tsx.
//
// This is progressive enhancement only: browsers without service worker
// support (or with it disabled) just don't get offline caching, nothing
// else about the app depends on this succeeding. Registration errors are
// logged for debugging but never thrown, so a failure here can never crash
// the app shell.
export function ServiceWorkerRegistration() {
  useEffect(() => {
    // `useEffect` only runs in the browser, but guard explicitly anyway —
    // some environments (older browsers, certain webviews) don't expose
    // `serviceWorker` on `navigator` at all.
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Service worker registration failed:", error);
    });
  }, []);

  return null;
}
