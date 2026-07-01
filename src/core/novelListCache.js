// src/core/novelListCache.js
// Caché en memoria de la última lista de novelas ya calculada, para
// poder repintar el dashboard al instante al volver atrás mientras
// se revalida en segundo plano.
let cache = null; // { novels: [...] }

export const novelListCache = {
  get() {
    return cache;
  },
  set(data) {
    cache = data;
  },
  clear() {
    cache = null;
  },
  /** Marca una novela como "no encontrada" sin tener que releer todo el disco. */
  markMissing(novelId) {
    if (!cache) return;
    cache = {
      ...cache,
      novels: cache.novels.map((n) => (n.id === novelId ? { ...n, missing: true } : n)),
    };
  },
};