// src/core/states.js
//
// Estados y utilidades puras (sin DOM). El idioma destino activo lo
// gestiona i18n/strings.js; aquí solo guardamos el idioma ORIGINAL de
// la novela y los idiomas DESTINO DISPONIBLES (opcional).

export const NovelStatus = Object.freeze({
  NEW: 'NEW',
  PENDING_SETUP: 'PENDING_SETUP',
  TRANSLATING: 'TRANSLATING',
  REVIEWING: 'REVIEWING',
  FINISHED: 'FINISHED',
});

export const ChapterLangStatus = Object.freeze({
  PENDING: 'PENDING',
  GLOSSARY_GENERATED: 'GLOSSARY_GENERATED',
  GLOSSARY_APPROVED: 'GLOSSARY_APPROVED',
  TRANSLATED: 'TRANSLATED',
  IN_REVIEW: 'IN_REVIEW',
  FINISHED: 'FINISHED',
});

const ORDER = Object.values(ChapterLangStatus);

/** Comprueba si una transición de estado es válida (un paso o mantenerse). */
export function canTransition(from, to) {
  const fromIdx = ORDER.indexOf(from);
  const toIdx = ORDER.indexOf(to);
  if (fromIdx === -1 || toIdx === -1) return false;
  return Math.abs(toIdx - fromIdx) === 1 || toIdx === fromIdx;
}

export function nextStatus(current) {
  const idx = ORDER.indexOf(current);
  return ORDER[Math.min(idx + 1, ORDER.length - 1)];
}

/**
 * Devuelve el número del primer capítulo pendiente (no finalizado) en orden
 * natural para un idioma concreto. Es decir, el capítulo por el que el
 * usuario debería seguir trabajando: si hay uno "en curso" en medio de la
 * serie, devuelve ese (para poder reanudar); si no, devuelve el siguiente
 * a empezar; y si todos están finalizados, devuelve el último para que se
 * pueda releer desde el final.
 * Si no hay capítulos, devuelve null.
 */
export function findFirstPendingChapter(chapterNumbers, langStatesByNumber) {
  if (!chapterNumbers.length) return null;
  const sorted = [...chapterNumbers].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  for (const num of sorted) {
    const state = langStatesByNumber.get(num);
    if (state?.status !== ChapterLangStatus.FINISHED) return num;
  }
  // Todos finalizados: devolvemos el último para que al menos se pueda leer.
  return sorted[sorted.length - 1];
}