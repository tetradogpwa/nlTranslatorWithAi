// src/core/fsManager.js
//
// Capa única de acceso al sistema de archivos local mediante la
// File System Access API. Ningún otro módulo debe llamar directamente
// a showDirectoryPicker / FileSystemHandle: todo pasa por aquí.
//
// Nota sobre persistencia: el navegador NO permite serializar un
// FileSystemDirectoryHandle a disco. La única forma de "recordarlo"
// entre sesiones es guardar el propio handle (un objeto, no datos del
// proyecto) en IndexedDB. Esto no contradice el requisito de "no usar
// IndexedDB como almacenamiento principal", ya que ningún dato del
// proyecto se guarda ahí: solo la referencia para poder repedir permiso.

const HANDLE_DB_NAME = 'ln-translator-handles';
const HANDLE_STORE = 'handles';
const ROOT_HANDLE_KEY = 'projectRoot';

/** Abre (o crea) la pequeña base de datos que solo guarda el handle. */
function openHandleDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(HANDLE_DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(HANDLE_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key) {
  const db = await openHandleDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(HANDLE_STORE, 'readonly');
    const req = tx.objectStore(HANDLE_STORE).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key, value) {
  const db = await openHandleDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(HANDLE_STORE, 'readwrite');
    tx.objectStore(HANDLE_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export class FsManager {
  /** @type {FileSystemDirectoryHandle|null} */
  rootHandle = null;

  get isReady() {
    return this.rootHandle !== null;
  }

  /** Comprueba si la API está disponible en este navegador. */
  static isSupported() {
    return 'showDirectoryPicker' in window;
  }

  /** Intenta recuperar un handle guardado en una sesión anterior. */
  async tryRestore() {
    const saved = await idbGet(ROOT_HANDLE_KEY);
    if (!saved) return false;
    const granted = await this.#verifyPermission(saved, true);
    if (!granted) return false;
    this.rootHandle = saved;
    return true;
  }

  /** Lanza el selector nativo de carpeta y la guarda como raíz del proyecto. */
  async pickProjectFolder() {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
    const granted = await this.#verifyPermission(handle, true);
    if (!granted) throw new Error('Permiso de carpeta denegado.');
    this.rootHandle = handle;
    await idbSet(ROOT_HANDLE_KEY, handle);
    return handle;
  }

  /** Vuelve a pedir permiso sobre el handle ya guardado (tras expirar). */
  async reauthorize() {
    if (!this.rootHandle) return false;
    return this.#verifyPermission(this.rootHandle, true);
  }

  async #verifyPermission(handle, write) {
    const opts = { mode: write ? 'readwrite' : 'read' };
    if ((await handle.queryPermission(opts)) === 'granted') return true;
    if ((await handle.requestPermission(opts)) === 'granted') return true;
    return false;
  }

  // ---- Utilidades de navegación ----------------------------------------

  /** Obtiene (creando si hace falta) una subcarpeta a partir de una ruta tipo "Library/Mushoku Tensei/chapters". */
  async getDir(path, { create = true } = {}) {
    const parts = path.split('/').filter(Boolean);
    let dir = this.rootHandle;
    for (const part of parts) {
      dir = await dir.getDirectoryHandle(part, { create });
    }
    return dir;
  }

  async listEntries(path) {
    const dir = await this.getDir(path, { create: false }).catch(() => null);
    if (!dir) return [];
    const entries = [];
    for await (const [name, handle] of dir.entries()) {
      entries.push({ name, kind: handle.kind, handle });
    }
    return entries;
  }

  async dirExists(path) {
    try {
      await this.getDir(path, { create: false });
      return true;
    } catch {
      return false;
    }
  }

  // ---- Lectura / escritura de archivos -----------------------------------

  async readText(path) {
    const file = await this.#getFileHandle(path, false);
    if (!file) return null;
    const f = await file.getFile();
    return f.text();
  }

  async readJSON(path) {
    const text = await this.readText(path);
    if (text === null) return null;
    try {
      return JSON.parse(text);
    } catch (err) {
      throw new Error(`JSON inválido en ${path}: ${err.message}`);
    }
  }

  async writeText(path, content) {
    const file = await this.#getFileHandle(path, true);
    const writable = await file.createWritable();
    await writable.write(content);
    await writable.close();
  }

  async writeJSON(path, data) {
    await this.writeText(path, JSON.stringify(data, null, 2));
  }

  async fileExists(path) {
    const handle = await this.#getFileHandle(path, false);
    return handle !== null;
  }

  async deleteFile(path) {
    const parts = path.split('/').filter(Boolean);
    const fileName = parts.pop();
    const dir = await this.getDir(parts.join('/'), { create: false });
    await dir.removeEntry(fileName).catch(() => {});
  }

  async #getFileHandle(path, create) {
    const parts = path.split('/').filter(Boolean);
    const fileName = parts.pop();
    try {
      const dir = await this.getDir(parts.join('/'), { create });
      return await dir.getFileHandle(fileName, { create });
    } catch {
      if (create) throw new Error(`No se pudo crear el archivo ${path}`);
      return null;
    }
  }
}

export const fsManager = new FsManager();
