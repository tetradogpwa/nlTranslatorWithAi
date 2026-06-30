// src/core/readerSettings.js
import { fsManager } from './fsManager.js';

const SETTINGS_PATH = 'Library/_app/reader-settings.json';

const builtInThemes = {
  Claro: { bg: '#ffffff', text: '#1c1f26', font: 'Georgia, serif', fontSize: 18, lineHeight: 1.7, readingWidth: 680, paragraphSpacing: 16 },
  Oscuro: { bg: '#1c1f26', text: '#e7e9ee', font: 'Georgia, serif', fontSize: 18, lineHeight: 1.7, readingWidth: 680, paragraphSpacing: 16 },
  OLED: { bg: '#000000', text: '#e7e9ee', font: 'Georgia, serif', fontSize: 18, lineHeight: 1.7, readingWidth: 680, paragraphSpacing: 16 },
  Sepia: { bg: '#f4ecd8', text: '#3b3024', font: 'Georgia, serif', fontSize: 18, lineHeight: 1.7, readingWidth: 680, paragraphSpacing: 16 },
};

class ReaderSettings {
  defaultTheme = builtInThemes.Oscuro;

  async #load() {
    const data = await fsManager.readJSON(SETTINGS_PATH);
    return (
      data ?? {
        activeThemeName: 'Oscuro',
        customThemes: {},
        lastPositionByNovel: {},
        bookmarksByNovel: {},
      }
    );
  }

  async #save(data) {
    await fsManager.writeJSON(SETTINGS_PATH, data);
  }

  async getAllThemes() {
    const data = await this.#load();
    return { ...builtInThemes, ...data.customThemes };
  }

  async getActiveTheme() {
    const data = await this.#load();
    const all = { ...builtInThemes, ...data.customThemes };
    return all[data.activeThemeName] ?? this.defaultTheme;
  }

  async setActiveTheme(name) {
    const data = await this.#load();
    data.activeThemeName = name;
    await this.#save(data);
  }

  async saveCustomTheme(name, theme) {
    const data = await this.#load();
    data.customThemes[name] = theme;
    await this.#save(data);
  }

  async getLastPosition(novelName) {
    const data = await this.#load();
    return data.lastPositionByNovel[novelName] ?? null;
  }

  async saveLastPosition(novelName, position) {
    const data = await this.#load();
    data.lastPositionByNovel[novelName] = position;
    await this.#save(data);
  }

  async addBookmark(novelName, bookmark) {
    const data = await this.#load();
    if (!data.bookmarksByNovel[novelName]) data.bookmarksByNovel[novelName] = [];
    data.bookmarksByNovel[novelName].push(bookmark);
    await this.#save(data);
  }

  async getBookmarks(novelName) {
    const data = await this.#load();
    return data.bookmarksByNovel[novelName] ?? [];
  }
}

export const readerSettings = new ReaderSettings();
