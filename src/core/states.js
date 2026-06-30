// src/core/states.js
export const NovelStatus = Object.freeze({
  NEW: 'NEW',
  PENDING_SETUP: 'PENDING_SETUP',
  TRANSLATING: 'TRANSLATING',
  REVIEWING: 'REVIEWING',
  FINISHED: 'FINISHED',
});

export const NovelStatusLabel = {
  [NovelStatus.NEW]: 'Nueva',
  [NovelStatus.PENDING_SETUP]: 'Configuración pendiente',
  [NovelStatus.TRANSLATING]: 'En traducción',
  [NovelStatus.REVIEWING]: 'En revisión',
  [NovelStatus.FINISHED]: 'Finalizada',
};

/** Estado de un capítulo para UN idioma concreto. El orden importa: define el flujo. */
export const ChapterLangStatus = Object.freeze({
  PENDING: 'PENDING',
  GLOSSARY_GENERATED: 'GLOSSARY_GENERATED',
  GLOSSARY_APPROVED: 'GLOSSARY_APPROVED',
  TRANSLATED: 'TRANSLATED',
  IN_REVIEW: 'IN_REVIEW',
  FINISHED: 'FINISHED',
});

export const ChapterLangStatusLabel = {
  [ChapterLangStatus.PENDING]: 'Pendiente',
  [ChapterLangStatus.GLOSSARY_GENERATED]: 'Glosario generado',
  [ChapterLangStatus.GLOSSARY_APPROVED]: 'Glosario aprobado',
  [ChapterLangStatus.TRANSLATED]: 'Traducción realizada',
  [ChapterLangStatus.IN_REVIEW]: 'En revisión',
  [ChapterLangStatus.FINISHED]: 'Finalizado',
};

const ORDER = Object.values(ChapterLangStatus);

/** Comprueba si una transición de estado de capítulo+idioma es válida (solo se permite avanzar o retroceder un paso, o forzarse manualmente). */
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

/** Calcula el estado global de la novela a partir de los estados de todos sus capítulos/idiomas. */
export function computeNovelStatus(novelMeta, chapterStates) {
  if (novelMeta.setupPending) return NovelStatus.PENDING_SETUP;
  if (chapterStates.length === 0) return NovelStatus.NEW;
  const allFinished = chapterStates.every((s) => s.status === ChapterLangStatus.FINISHED);
  if (allFinished) return NovelStatus.FINISHED;
  const anyInReview = chapterStates.some((s) => s.status === ChapterLangStatus.IN_REVIEW);
  if (anyInReview) return NovelStatus.REVIEWING;
  const anyStarted = chapterStates.some((s) => s.status !== ChapterLangStatus.PENDING);
  if (anyStarted) return NovelStatus.TRANSLATING;
  return NovelStatus.NEW;
}

/**
 * Devuelve el número del último capítulo pendiente (no finalizado) para un idioma concreto.
 * Si todos están finalizados, devuelve el último número.
 * Si no hay capítulos, devuelve null.
 */
export function findLastPendingChapter(chapterNumbers, langStatesByNumber) {
  if (!chapterNumbers.length) return null;
  // Ordenamos por número natural por si acaso
  const sorted = [...chapterNumbers].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  for (let i = sorted.length - 1; i >= 0; i--) {
    const num = sorted[i];
    const state = langStatesByNumber.get(num);
    if (state?.status !== ChapterLangStatus.FINISHED) return num;
  }
  // Todos finalizados: devolvemos el último para que al menos se pueda leer
  return sorted[sorted.length - 1];
}