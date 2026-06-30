// src/core/projectManager.js
import { fsManager } from './fsManager.js';

const TEXT_EXT = '.txt';

function naturalCompare(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

async function scanSourceNovels() {
  const entries = await fsManager.listEntries('Source');
  return entries
    .filter((e) => e.kind === 'directory')
    .map((e) => e.name)
    .sort(naturalCompare);
}

async function scanSourceChapters(novelName) {
  const entries = await fsManager.listEntries(`Source/${novelName}`);
  return entries
    .filter((e) => e.kind === 'file' && e.name.toLowerCase().endsWith(TEXT_EXT))
    .map((e) => e.name.replace(/\.txt$/i, ''))
    .sort(naturalCompare);
}

function chapterNumberFromFileName(fileName) {
  const match = fileName.match(/^(\d+)/);
  return match ? match[1].padStart(3, '0') : fileName;
}

const defaultMetadata = (name) => ({
  originalName: name,
  nameEs: '',
  nameCa: '',
  banner: '',
  sourceLang: '',
  // Lista de langcodes para los que ESTA novela tiene traducción.
  // Opcional: si está vacía, la novela se considera no configurada
  // para ningún idioma y el modal "añadir idioma" aparecerá al abrirla.
  availableTargetLangs: [],
  setupPending: true,
  knownChapterCount: null,
  hasAllChapters: null,
  createdAt: new Date().toISOString(),
});

export class ProjectManager {
  async syncProject() {
    await fsManager.getDir('Source');
    await fsManager.getDir('Library');
    const sourceNovels = await scanSourceNovels();
    const libraryEntries = await fsManager.listEntries('Library');
    const libraryNovels = new Set(
      libraryEntries.filter((e) => e.kind === 'directory').map((e) => e.name)
    );

    const newNovels = [];
    const removedNovels = [...libraryNovels].filter((n) => !sourceNovels.includes(n));

    for (const novelName of sourceNovels) {
      const isNew = !libraryNovels.has(novelName);
      if (isNew) {
        await this.#initNovel(novelName);
        newNovels.push(novelName);
      }
      await this.#syncChapters(novelName);
    }
    return { newNovels, removedNovels, sourceNovels };
  }

  async #initNovel(novelName) {
    await fsManager.getDir(`Library/${novelName}/glossary`);
    await fsManager.getDir(`Library/${novelName}/chapters`);
    await fsManager.writeJSON(`Library/${novelName}/metadata.json`, defaultMetadata(novelName));
    await fsManager.writeJSON(`Library/${novelName}/glossary/general.json`, { entries: [] });
    await fsManager.writeText(
      `Library/${novelName}/glossary/style.md`,
      defaultStyleGuide(novelName)
    );
  }

  async #syncChapters(novelName) {
    const sourceChapters = await scanSourceChapters(novelName);
    const chaptersDir = `Library/${novelName}/chapters`;
    const existing = await fsManager.listEntries(chaptersDir);
    const existingNums = new Set(
      existing.filter((e) => e.kind === 'directory').map((e) => e.name)
    );

    const newChapters = [];
    const removedChapters = [];

    for (const fileName of sourceChapters) {
      const num = chapterNumberFromFileName(fileName);
      if (!existingNums.has(num)) {
        await this.#initChapter(novelName, num, fileName);
        newChapters.push(num);
      }
    }
    const sourceNums = new Set(sourceChapters.map(chapterNumberFromFileName));
    for (const num of existingNums) {
      if (!sourceNums.has(num)) removedChapters.push(num);
    }
    return { newChapters, removedChapters };
  }

  async #initChapter(novelName, num, sourceFileName) {
    const original = await fsManager.readText(`Source/${novelName}/${sourceFileName}.txt`);
    const base = `Library/${novelName}/chapters/${num}`;
    await fsManager.writeText(`${base}/original.txt`, original ?? '');
    await fsManager.writeJSON(`${base}/glossary.json`, { entries: [] });
    await fsManager.getDir(`${base}/review`);
    await fsManager.writeJSON(`${base}/state.json`, {
      number: num,
      sourceFileName,
      languages: {},
    });
  }

  async getNovelList() {
    const entries = await fsManager.listEntries('Library');
    const novels = [];
    for (const e of entries.filter((e) => e.kind === 'directory')) {
      const meta = await fsManager.readJSON(`Library/${e.name}/metadata.json`);
      if (meta) novels.push({ id: e.name, ...meta });
    }
    return novels.sort((a, b) => naturalCompare(a.originalName, b.originalName));
  }

  async getNovelMeta(novelName) {
    return fsManager.readJSON(`Library/${novelName}/metadata.json`);
  }

  async saveNovelMeta(novelName, meta) {
    await fsManager.writeJSON(`Library/${novelName}/metadata.json`, meta);
  }

  /**
   * Añade un langcode a availableTargetLangs si no estaba. Idempotente.
   */
  async addAvailableTargetLang(novelName, langcode) {
    const meta = await this.getNovelMeta(novelName);
    const list = meta.availableTargetLangs ?? [];
    if (list.includes(langcode)) return meta;
    meta.availableTargetLangs = [...list, langcode];
    await this.saveNovelMeta(novelName, meta);
    return meta;
  }

  async getChapterNumbers(novelName) {
    const entries = await fsManager.listEntries(`Library/${novelName}/chapters`);
    return entries
      .filter((e) => e.kind === 'directory')
      .map((e) => e.name)
      .sort(naturalCompare);
  }

  async getChapterState(novelName, num) {
    return fsManager.readJSON(`Library/${novelName}/chapters/${num}/state.json`);
  }

  async saveChapterState(novelName, num, state) {
    await fsManager.writeJSON(`Library/${novelName}/chapters/${num}/state.json`, state);
  }
}

function defaultStyleGuide(novelName) {
  return `# Guía de estilo — ${novelName}
## Honoríficos (define aquí cómo tratar -san, -kun, -sama, etc.)
## Nombres propios (criterio de transliteración / mantenimiento)
## Títulos
## Cursivas
## Comillas
## Registro del lenguaje
## Magia / habilidades
## Ataques / técnicas
## Unidades de medida
`;
}

export const projectManager = new ProjectManager();