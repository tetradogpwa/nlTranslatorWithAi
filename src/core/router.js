// src/core/router.js
//
// Router minimalista basado en location.hash, pensado para poder
// guardar/compartir enlaces directos a un capítulo concreto:
//   #/translate/<novelId>/<chapterNum>  → abre la novela en modo workflow
//   #/read/<novelId>/<chapterNum>       → abre la novela directamente en el lector
//
// No usamos la History API "real" (pushState con rutas de servidor) porque
// la app puede servirse con un simple "npx serve ." sin configuración de
// fallback, y el hash funciona igual de bien para enlaces guardables.

/** Lee la ruta actual desde location.hash. Devuelve null si no hay ruta válida. */
export function parseRoute() {
  const raw = location.hash.replace(/^#\/?/, '');
  if (!raw) return null;
  const [mode, novelIdRaw, chapterRaw] = raw.split('/');
  if (mode !== 'translate' && mode !== 'read') return null;
  if (!novelIdRaw) return null;
  let novelId;
  let chapterNum;
  try {
    novelId = decodeURIComponent(novelIdRaw);
    chapterNum = chapterRaw ? decodeURIComponent(chapterRaw) : null;
  } catch {
    return null;
  }
  return { mode, novelId, chapterNum };
}

/** Actualiza location.hash para reflejar la vista actual (sin recargar nada). */
export function navigateTo(mode, novelId, chapterNum) {
  const parts = [mode, encodeURIComponent(novelId)];
  if (chapterNum) parts.push(encodeURIComponent(chapterNum));
  const hash = '#/' + parts.join('/');
  if (location.hash !== hash) {
    location.hash = hash;
  }
}

/** Limpia la ruta (al volver al dashboard), sin añadir entradas raras al historial. */
export function clearRoute() {
  if (location.hash) {
    history.replaceState(null, '', location.pathname + location.search);
  }
}

/** Se dispara cuando cambia el hash (navegación interna, botones atrás/adelante, o pegar un enlace). */
export function onRouteChange(fn) {
  window.addEventListener('hashchange', fn);
  return () => window.removeEventListener('hashchange', fn);
}
