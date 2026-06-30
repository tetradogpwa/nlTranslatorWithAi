// src/main.js
import './components/ln-app.js';

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch((err) => {
      console.warn('No se pudo registrar el service worker:', err);
    });
  });
} else if (!location.protocol.startsWith('http')) {
  console.warn(
    'Esta app necesita servirse por http(s) (ej. "npx serve ." o "python3 -m http.server"), no abrirse con doble clic (file://).'
  );
}
