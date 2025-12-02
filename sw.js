// Minimal Service Worker for PWA support
// Strategy: Network Only (No Caching)

self.addEventListener('install', (e) => {
    // Force new service worker to activate immediately
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    // Claim clients immediately
    e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
    // Always go to network, never cache
    e.respondWith(fetch(e.request));
});
