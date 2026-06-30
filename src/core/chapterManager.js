// src/core/chapterManager.js
import { fsManager } from './fsManager.js';
import { ChapterLangStatus } from './states.js';

export class ChapterManager {
  async getOriginalText(novelName, num) {
    return fsManager.readText(`Library/${novelName}/chapters/${num}/original.txt`);
  }

  async getLangState(novelName, num, langcode) {
    const state = await fsManager.readJSON(`Library/${novelName}/chapters/${num}/state.json`);
    return state?.languages?.[langcode] ?? { status: ChapterLangStatus.PENDING };
  }

  async setLangState(novelName, num, langcode, patch) {
    const state = (await fsManager.readJSON(`Library/${novelName}/chapters/${num}/state.json`)) ?? {
      number: num,
      languages: {},
    };
    state.languages[langcode] = {
      ...(state.languages[langcode] ?? {}),
      ...patch,
      lastUpdated: new Date().toISOString(),
    };
    await fsManager.writeJSON(`Library/${novelName}/chapters/${num}/state.json`, state);
    return state.languages[langcode];
  }

  translationPath(novelName, num, langcode) {
    return `Library/${novelName}/chapters/${num}/chapter ${num} ${langcode}.txt`;
  }

  async getTranslation(novelName, num, langcode) {
    return fsManager.readText(this.translationPath(novelName, num, langcode));
  }

  async saveTranslation(novelName, num, langcode, text) {
    await fsManager.writeText(this.translationPath(novelName, num, langcode), text);
    await this.setLangState(novelName, num, langcode, { status: ChapterLangStatus.TRANSLATED });
  }

  async getReviewNotes(novelName, num, langcode) {
    const data = await fsManager.readJSON(`Library/${novelName}/chapters/${num}/review/${langcode}.json`);
    return data?.observations ?? [];
  }

  async saveReviewNotes(novelName, num, langcode, observations) {
    await fsManager.writeJSON(`Library/${novelName}/chapters/${num}/review/${langcode}.json`, { observations });
    await this.setLangState(novelName, num, langcode, { status: ChapterLangStatus.IN_REVIEW });
  }

  async finishChapter(novelName, num, langcode) {
    await this.setLangState(novelName, num, langcode, { status: ChapterLangStatus.FINISHED });
  }

  /** Progreso (0-1) de una novela para un idioma concreto, sobre el total de capítulos disponibles. */
  async computeProgress(novelName, chapterNumbers, langcode) {
    if (!chapterNumbers.length) return 0;
    let finished = 0;
    for (const num of chapterNumbers) {
      const s = await this.getLangState(novelName, num, langcode);
      if (s.status === ChapterLangStatus.FINISHED) finished += 1;
    }
    return finished / chapterNumbers.length;
  }
}

export const chapterManager = new ChapterManager();