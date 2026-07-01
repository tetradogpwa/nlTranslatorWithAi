// src/core/uiFlash.js
// Mensaje efímero de una sola lectura, para pasar avisos entre vistas
// que se destruyen/recrean (p.ej. "novela no encontrada" al volver
// al dashboard) sin montar un bus de eventos completo.
let flash = null;

export function setFlash(kind, payload = null) {
  flash = { kind, payload };
}

export function popFlash() {
  const f = flash;
  flash = null;
  return f;
}