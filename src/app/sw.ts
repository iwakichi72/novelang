import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry } from "serwist";
import { Serwist, NetworkFirst, CacheFirst, NetworkOnly } from "serwist";

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

// 読書ページ — NetworkFirst（オフライン再読可能にする核心部分）
serwist.registerCapture(
  ({ url }) => url.pathname.startsWith("/read/"),
  new NetworkFirst({ cacheName: "reader-pages" }),
);

// Google Fonts
serwist.registerCapture(
  ({ url }) =>
    url.origin === "https://fonts.googleapis.com" ||
    url.origin === "https://fonts.gstatic.com",
  new CacheFirst({ cacheName: "google-fonts" }),
);

// 画像
serwist.registerCapture(
  ({ request }) => request.destination === "image",
  new CacheFirst({ cacheName: "image-assets" }),
);

// API — オフライン不可
serwist.registerCapture(
  ({ url }) => url.pathname.startsWith("/api/"),
  new NetworkOnly(),
);

serwist.addEventListeners();
