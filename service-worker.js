// service-worker.js
const CACHE_NAME = 'ln-translator-shell-v3.1';

const SHELL_FILES = [
  './',
  './index.html',
  './public/manifest.json',
  './public/icons/icon-192.png',
  './public/icons/icon-512.png',
  './public/icons/icon-maskable-512.png',
  './src/styles/tokens.css',
  './src/styles/base.css',
  './src/main.js',
  './src/i18n/strings.js',
  './src/core/router.js',
  './src/core/fsManager.js',
  './src/core/projectManager.js',
  './src/core/chapterManager.js',
  './src/core/glossaryManager.js',
  './src/core/readerSettings.js',
  './src/core/promptBuilder.js',
  './src/core/novelListCache.js',
  './src/core/uiFlash.js',
  './src/core/states.js',
  './src/components/base-element.js',
  './src/components/ln-app.js',
  './src/views/dashboard-view.js',
  './src/views/novel-view.js',
  './src/components/ln-novel-grid.js',
  './src/components/ln-novel-card.js',
  './src/components/ln-novel-wizard.js',
  './src/components/ln-lang-switcher.js',
  './src/components/ln-chapter-workflow.js',
  './src/components/ln-prompt-panel.js',
  './src/components/ln-reader.js',
  './src/components/ln-add-lang-modal.js',
  './src/components/ln-add-title-modal.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => cached);
    })
  );
});