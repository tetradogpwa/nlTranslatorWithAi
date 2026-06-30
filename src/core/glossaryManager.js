// src/core/glossaryManager.js
import { fsManager } from './fsManager.js';

/**
 * Entrada de glosario:
 * {
 *   id, term, reading, type, description, notes,
 *   translations: { [langcode]: { translation, notes, status: 'PENDING'|'APPROVED', approvedAt } }
 * }
 */

export class GlossaryManager {
  async getGeneralGlossary(novelName) {
    const data = await fsManager.readJSON(`Library/${novelName}/glossary/general.json`);
    return data?.entries ?? [];
  }

  async saveGeneralGlossary(novelName, entries) {
    await fsManager.writeJSON(`Library/${novelName}/glossary/general.json`, { entries });
  }

  async getStyleGuide(novelName) {
    return (await fsManager.readText(`Library/${novelName}/glossary/style.md`)) ?? '';
  }

  async saveStyleGuide(novelName, text) {
    await fsManager.writeText(`Library/${novelName}/glossary/style.md`, text);
  }

  /** Glosario filtrado a un idioma concreto, listo para inyectarse en un prompt. */
  async getGlossaryForLang(novelName, langcode) {
    const entries = await this.getGeneralGlossary(novelName);
    return entries
      .filter((e) => e.translations?.[langcode])
      .map((e) => ({
        term: e.term,
        reading: e.reading,
        type: e.type,
        description: e.description,
        translation: e.translations[langcode].translation,
        status: e.translations[langcode].status,
        notes: e.translations[langcode].notes,
      }));
  }

  /** Términos detectados en un capítulo, pendientes de revisión humana antes de pasar al glosario general. */
  async getChapterGlossary(novelName, chapterNum) {
    const data = await fsManager.readJSON(`Library/${novelName}/chapters/${chapterNum}/glossary.json`);
    return data?.entries ?? [];
  }

  async saveChapterGlossary(novelName, chapterNum, entries) {
    await fsManager.writeJSON(`Library/${novelName}/chapters/${chapterNum}/glossary.json`, { entries });
  }

  /**
   * Importa el JSON devuelto por la IA con los términos nuevos de un capítulo.
   * Formato esperado: [{ term, reading?, type?, description?, suggestedTranslation, notes? }, ...]
   */
  validateChapterExtractionJSON(raw) {
    let parsed;
    try {
      parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (err) {
      throw new Error(`JSON inválido: ${err.message}`);
    }
    if (!Array.isArray(parsed)) throw new Error('Se esperaba un array de términos.');
    for (const item of parsed) {
      if (typeof item.term !== 'string' || !item.term.trim()) {
        throw new Error('Cada término debe tener la propiedad "term".');
      }
    }
    return parsed;
  }

  /** Aprueba una entrada del glosario de capítulo y la fusiona en el glosario general del idioma. */
  async approveTerm(novelName, langcode, term) {
    const general = await this.getGeneralGlossary(novelName);
    let entry = general.find((e) => e.term === term.term);
    if (!entry) {
      entry = {
        id: crypto.randomUUID(),
        term: term.term,
        reading: term.reading ?? '',
        type: term.type ?? '',
        description: term.description ?? '',
        notes: '',
        translations: {},
      };
      general.push(entry);
    }
    entry.translations[langcode] = {
      translation: term.translation,
      notes: term.notes ?? '',
      status: 'APPROVED',
      approvedAt: new Date().toISOString(),
    };
    await this.saveGeneralGlossary(novelName, general);
    return entry;
  }
}

export const glossaryManager = new GlossaryManager();
