// src/core/japaneseDetector.js
//
// Detección de japonés "colado" en una traducción que debería estar en
// otro idioma. Pensado para limpiar capítulos ya finalizados en los que
// se ha escapado algún carácter o frase corta.
//
// Qué se considera japonés:
//   - Hiragana:            U+3040 – U+309F
//   - Katakana:            U+30A0 – U+30FF
//   - Katakana medio ancho: U+FF65 – U+FF9F
//
// NO se consideran japonés "por defecto" los ideogramas CJK
// (U+4E00 – U+9FFF), porque se solapan con el chino y con nombres
// propios de muchos idiomas. Si el texto contiene kana (hiragana o
// katakana), entonces sí tiene sentido marcarlos también, porque está
// claro que el original era japonés y esos kanji son los que la IA no
// llegó a traducir.
//
// La función findJapaneseRuns() devuelve tramos contiguos de caracteres
// japoneses con sus posiciones, para poder resaltarlos en un editor o
// para alimentar un prompt de limpieza.

const HIRA_RE = /[\u3040-\u309F]/;
const KATA_RE = /[\u30A0-\u30FF\uFF65-\uFF9F]/;
const KANJI_RE = /[\u4E00-\u9FFF]/;
const ANY_KANA_RE = /[\u3040-\u309F\u30A0-\u30FF\uFF65-\uFF9F]/;

/** ¿El texto contiene al menos un carácter inequívocamente japonés? */
export function containsJapanese(text) {
  if (!text) return false;
  return ANY_KANA_RE.test(text);
}

/**
 * Devuelve la lista de tramos contiguos de caracteres japoneses.
 * @param {string} text
 * @param {{includeKanji?: 'auto'|'always'|'never'}} opts
 *   - 'auto' (por defecto): marca kanji solo si el texto también tiene kana.
 *   - 'always': marca kanji siempre.
 *   - 'never': marca solo kana.
 * @returns {Array<{start:number, end:number, text:string}>}
 */
export function findJapaneseRuns(text, opts = {}) {
  if (!text) return [];
  const includeKanji = opts.includeKanji ?? 'auto';
  const hasKana = ANY_KANA_RE.test(text);
  const allowKanji =
    includeKanji === 'always' || (includeKanji === 'auto' && hasKana);

  const runs = [];
  let i = 0;
  const n = text.length;
  while (i < n) {
    if (!isJapaneseChar(text.charCodeAt(i), allowKanji)) {
      i++;
      continue;
    }
    const start = i;
    while (i < n && isJapaneseChar(text.charCodeAt(i), allowKanji)) i++;
    runs.push({ start, end: i, text: text.slice(start, i) });
  }
  return runs;
}

function isJapaneseChar(code, allowKanji) {
  if (code >= 0x3040 && code <= 0x309F) return true; // hiragana
  if (code >= 0x30a0 && code <= 0x30ff) return true; // katakana
  if (code >= 0xff65 && code <= 0xff9f) return true; // half-width katakana
  if (allowKanji && code >= 0x4e00 && code <= 0x9fff) return true; // CJK kanji
  return false;
}

/** Número total de caracteres japoneses en el texto (kana, con/sin kanji). */
export function countJapaneseChars(text, opts = {}) {
  if (!text) return 0;
  const includeKanji = opts.includeKanji ?? 'auto';
  const hasKana = ANY_KANA_RE.test(text);
  const allowKanji =
    includeKanji === 'always' || (includeKanji === 'auto' && hasKana);
  void KANJI_RE; // kanji regex kept for documentation/future use
  let count = 0;
  for (const ch of text) {
    if (isJapaneseChar(ch.codePointAt(0), allowKanji)) count++;
  }
  return count;
}

/**
 * Devuelve los índices de párrafo (separados por saltos de línea) que
 * contienen al menos un carácter japonés. Útil para mostrar al usuario
 * un resumen por párrafo.
 * @returns {Array<{index:number, text:string, runs:Array}>}
 */
export function findJapaneseParagraphs(text, opts = {}) {
  if (!text) return [];
  const paragraphs = text.split(/\n+/);
  const out = [];
  let cursor = 0;
  paragraphs.forEach((p, index) => {
    const start = text.indexOf(p, cursor);
    const end = start + p.length;
    cursor = end;
    const runs = findJapaneseRuns(p, opts);
    if (runs.length === 0) return;
    out.push({ index, text: p, runs, start, end });
  });
  return out;
}