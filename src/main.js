// src/main.js
import './components/ln-app.js';
import { i18n } from './i18n/strings.js';

function syncDocumentLang() {
  document.documentElement.lang = i18n.current.split('-')[0];
  document.title = i18n.t('app.title');
}
syncDocumentLang();
i18n.onChange(syncDocumentLang);

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