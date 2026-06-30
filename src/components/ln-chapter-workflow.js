// src/components/ln-chapter-workflow.js
import { BaseElement } from './base-element.js';
import './ln-prompt-panel.js';
import { promptBuilder } from '../core/promptBuilder.js';
import { glossaryManager } from '../core/glossaryManager.js';
import { chapterManager } from '../core/chapterManager.js';
import { ChapterLangStatus, ChapterLangStatusLabel } from '../core/states.js';

export class LnChapterWorkflow extends BaseElement {
  async load({ novelName, chapterNum, sourceLang, targetLang }) {
    this._ctx = { novelName, chapterNum, sourceLang, targetLang };
    await this.#refresh();
  }

  /**
   * Notifica al padre que un capítulo ha llegado a FINISHED en este idioma,
   * indicando si hay un siguiente capítulo pendiente. El padre decide cómo
   * comportarse (auto-avanzar o quedarse).
   */
  #emitFinished() {
    this.emit('chapter-finished', {
      novelName: this._ctx.novelName,
      chapterNum: this._ctx.chapterNum,
      targetLang: this._ctx.targetLang,
    });
  }

  /**
   * Pide al padre que abra el reader para este capítulo. Solo tiene sentido
   * cuando el estado es FINISHED, pero la lógica vive en el padre.
   */
  #emitRead() {
    this.emit('read-chapter', {
      novelName: this._ctx.novelName,
      chapterNum: this._ctx.chapterNum,
      targetLang: this._ctx.targetLang,
    });
  }

  async #refresh() {
    const { novelName, chapterNum, targetLang } = this._ctx;
    this._langState = await chapterManager.getLangState(novelName, chapterNum, targetLang);
    this._originalText = await chapterManager.getOriginalText(novelName, chapterNum);
    this._styleGuide = await glossaryManager.getStyleGuide(novelName);
    this._glossary = await glossaryManager.getGlossaryForLang(novelName, targetLang);
    this.render();
    this.#bindStep();
  }

  styles() {
    return `
      .wrap { display:flex; flex-direction:column; gap: var(--ln-space-4); }
      .status-badge {
        align-self:flex-start; font-size:11px; text-transform:uppercase; letter-spacing:.03em;
        background: var(--ln-bg-card); border:1px solid var(--ln-border); border-radius: 999px;
        padding: 4px 10px; color: var(--ln-accent);
      }
      .status-badge.finished { color: var(--ln-success); border-color: var(--ln-success); }

      .finished-banner {
        display:flex; align-items:center; gap: var(--ln-space-3);
        background: var(--ln-bg-card); border:1px solid var(--ln-success);
        border-radius: var(--ln-radius-md); padding: var(--ln-space-3) var(--ln-space-4);
      }
      .finished-banner .check { font-size: 20px; }
      .finished-banner .msg { flex:1; color: var(--ln-success); font-weight: 600; }
      .finished-banner button.read-btn {
        background: var(--ln-success); color:#0e0f12; border:none;
        border-radius: var(--ln-radius-sm); padding: 8px 14px; font-size: 13px; font-weight: 600;
      }

      .glossary-review { display:flex; flex-direction:column; gap: var(--ln-space-2); }
      .term-row {
        display:grid; grid-template-columns: 1fr 1fr 2fr auto;
        gap: var(--ln-space-2); align-items:center;
        background:var(--ln-bg-card); border:1px solid var(--ln-border);
        border-radius: var(--ln-radius-sm); padding: var(--ln-space-2);
        transition: border-color .2s;
      }
      .term-row.is-approved { border-color: var(--ln-success); }
      .term-row input {
        background: var(--ln-bg); border:1px solid var(--ln-border); color: var(--ln-text);
        border-radius:4px; padding:6px; font-size:12px;
      }
      .term-row.is-approved input { opacity: .6; }
      button.approve-btn {
        background: var(--ln-accent); border:none; color:#fff;
        border-radius:4px; padding:6px 10px; font-size:12px;
        white-space:nowrap; cursor:pointer;
      }
      button.approve-btn.done {
        background: var(--ln-success); cursor: default;
      }
      button.continue-btn {
        align-self: flex-start; margin-top: var(--ln-space-2);
        background: var(--ln-accent); border:none; color:#fff;
        border-radius: var(--ln-radius-sm); padding: 8px 16px; font-size:13px;
        font-weight:600; cursor:pointer;
      }
      button.continue-btn:disabled { opacity:.4; cursor:not-allowed; }
    `;
  }

  template() {
    const isFinished = this._langState.status === ChapterLangStatus.FINISHED;
    return `<div class="wrap">
      <span class="status-badge ${isFinished ? 'finished' : ''}">${ChapterLangStatusLabel[this._langState.status]}</span>
      <div id="stepArea"></div>
    </div>`;
  }

  #bindStep() {
    const area = this.$('#stepArea');
    area.innerHTML = '';
    const status = this._langState.status;
    const { novelName, chapterNum, sourceLang, targetLang } = this._ctx;

    if (status === ChapterLangStatus.PENDING) {
      const panel = document.createElement('ln-prompt-panel');
      area.appendChild(panel);
      panel.configure({
        title: 'Extracción de glosario',
        promptText: promptBuilder.buildGlossaryExtractionPrompt({
          sourceLang, targetLang,
          styleGuide: this._styleGuide,
          glossary: this._glossary,
          chapterText: this._originalText,
        }),
        validate: (text) => {
          try {
            const value = glossaryManager.validateChapterExtractionJSON(text);
            return { ok: true, value };
          } catch (err) {
            return { ok: false, error: err.message };
          }
        },
      });
      panel.addEventListener('response-accepted', async (e) => {
        const terms = e.detail.map((t) => ({
          term: t.term,
          reading: t.reading ?? '',
          type: t.type ?? '',
          description: t.description ?? '',
          translation: t.suggestedTranslation ?? '',
          notes: t.notes ?? '',
          approved: false,
        }));
        await glossaryManager.saveChapterGlossary(novelName, chapterNum, terms);
        await chapterManager.setLangState(novelName, chapterNum, targetLang, {
          status: ChapterLangStatus.GLOSSARY_GENERATED,
        });
        await this.#refresh();
      });
      return;
    }

    if (status === ChapterLangStatus.GLOSSARY_GENERATED) {
      this.#renderGlossaryReview(area);
      return;
    }

    if (status === ChapterLangStatus.GLOSSARY_APPROVED) {
      const panel = document.createElement('ln-prompt-panel');
      area.appendChild(panel);
      panel.configure({
        title: 'Traducción del capítulo',
        promptText: promptBuilder.buildTranslationPrompt({
          sourceLang, targetLang,
          styleGuide: this._styleGuide,
          glossary: this._glossary,
          chapterText: this._originalText,
        }),
        validate: (text) => (text.trim() ? { ok: true, value: text } : { ok: false, error: 'La traducción está vacía.' }),
      });
      panel.addEventListener('response-accepted', async (e) => {
        await chapterManager.saveTranslation(novelName, chapterNum, targetLang, e.detail);
        await this.#refresh();
      });
      return;
    }

    if (status === ChapterLangStatus.TRANSLATED) {
      this.#renderReviewStep(area);
      return;
    }

    if (status === ChapterLangStatus.IN_REVIEW) {
      this.#renderCorrectionStep(area);
      return;
    }

    if (status === ChapterLangStatus.FINISHED) {
      // ===== CAMBIO 4: capítulo finalizado → banner verde con botón "Leer"
      const banner = document.createElement('div');
      banner.className = 'finished-banner';
      banner.innerHTML = `
        <span class="check">✓</span>
        <span class="msg">Capítulo finalizado en ${targetLang}</span>
        <button class="read-btn" type="button">Leer capítulo</button>
      `;
      banner.querySelector('.read-btn').addEventListener('click', () => this.#emitRead());
      area.appendChild(banner);

      // Notificamos al padre para que decida si auto-avanzar al siguiente
      this.#emitFinished();
    }
  }

  async #renderGlossaryReview(area) {
    const { novelName, chapterNum, targetLang } = this._ctx;
    const terms = await glossaryManager.getChapterGlossary(novelName, chapterNum);
    const wrap = document.createElement('div');
    wrap.className = 'glossary-review';
    const intro = document.createElement('p');
    intro.textContent = 'Revisa y aprueba los términos nuevos antes de continuar:';
    wrap.appendChild(intro);

    const continueBtn = document.createElement('button');
    continueBtn.className = 'continue-btn';
    continueBtn.textContent = 'Continuar a traducción →';
    const updateContinueBtn = () => {
      continueBtn.disabled = terms.some((t) => !t.approved);
    };

    terms.forEach((term, idx) => {
      const row = document.createElement('div');
      row.className = 'term-row' + (term.approved ? ' is-approved' : '');
      row.dataset.idx = idx;
      const mkInput = (field, placeholder = '') => {
        const inp = document.createElement('input');
        inp.dataset.field = field;
        inp.value = term[field] ?? '';
        inp.placeholder = placeholder;
        return inp;
      };
      const inpTerm   = mkInput('term');
      const inpRead   = mkInput('reading', 'lectura');
      const inpTrans  = mkInput('translation', 'traducción');
      const btn = document.createElement('button');
      btn.className = 'approve-btn' + (term.approved ? ' done' : '');
      btn.textContent = term.approved ? 'Aprobado ✓' : 'Aprobar';
      if (term.approved) btn.disabled = true;
      btn.addEventListener('click', async () => {
        term.term        = inpTerm.value.trim()  || term.term;
        term.reading     = inpRead.value.trim();
        term.translation = inpTrans.value.trim() || term.translation;
        term.approved    = true;
        await glossaryManager.saveChapterGlossary(novelName, chapterNum, terms);
        await glossaryManager.approveTerm(novelName, targetLang, term);
        btn.textContent  = 'Aprobado ✓';
        btn.className    = 'approve-btn done';
        btn.disabled     = true;
        row.classList.add('is-approved');
        updateContinueBtn();
      });
      row.appendChild(inpTerm);
      row.appendChild(inpRead);
      row.appendChild(inpTrans);
      row.appendChild(btn);
      wrap.appendChild(row);
    });
    updateContinueBtn();
    continueBtn.addEventListener('click', async () => {
      await chapterManager.setLangState(novelName, chapterNum, targetLang, {
        status: ChapterLangStatus.GLOSSARY_APPROVED,
      });
      await this.#refresh();
    });
    wrap.appendChild(continueBtn);
    area.appendChild(wrap);
  }

  async #renderReviewStep(area) {
    const { novelName, chapterNum, sourceLang, targetLang } = this._ctx;
    const translatedText = await chapterManager.getTranslation(novelName, chapterNum, targetLang);
    const panel = document.createElement('ln-prompt-panel');
    area.appendChild(panel);
    panel.configure({
      title: 'Revisión',
      promptText: promptBuilder.buildReviewPrompt({
        sourceLang, targetLang,
        styleGuide: this._styleGuide,
        glossary: this._glossary,
        originalText: this._originalText,
        translatedText,
      }),
      responsePlaceholder: 'Pega aquí el JSON de observaciones (o [] si no hay problemas)…',
      validate: (text) => {
        try {
          const value = JSON.parse(text);
          if (!Array.isArray(value)) throw new Error('Se esperaba un array.');
          return { ok: true, value };
        } catch (err) {
          return { ok: false, error: err.message };
        }
      },
    });
    panel.addEventListener('response-accepted', async (e) => {
      await chapterManager.saveReviewNotes(novelName, chapterNum, targetLang, e.detail);
      await this.#refresh();
    });
  }

  async #renderCorrectionStep(area) {
    const { novelName, chapterNum, targetLang } = this._ctx;
    const observations = await chapterManager.getReviewNotes(novelName, chapterNum, targetLang);
    const translatedText = await chapterManager.getTranslation(novelName, chapterNum, targetLang);

    if (!observations.length) {
      area.innerHTML = `<p>No se reportaron observaciones.</p><button id="finishBtn">Marcar como finalizado</button>`;
      area.querySelector('#finishBtn').addEventListener('click', async () => {
        await chapterManager.finishChapter(novelName, chapterNum, targetLang);
        await this.#refresh();
      });
      return;
    }
    const listWrap = document.createElement('div');
    listWrap.innerHTML = observations
      .map(
        (o, i) => `
      <label style="display:flex;gap:8px;align-items:flex-start;margin-bottom:6px;font-size:13px;">
        <input type="checkbox" data-idx="${i}" checked />
        <span><strong>[${o.severity ?? 'media'}]</strong> ${o.issue} → ${o.suggestion}</span>
      </label>`
      )
      .join('');
    area.appendChild(listWrap);
    const applyBtn = document.createElement('button');
    applyBtn.textContent = 'Generar prompt de corrección con seleccionadas →';
    area.appendChild(applyBtn);
    applyBtn.addEventListener('click', () => {
      const accepted = observations.filter((_, i) => listWrap.querySelector(`[data-idx="${i}"]`).checked);
      const panel = document.createElement('ln-prompt-panel');
      area.appendChild(panel);
      panel.configure({
        title: 'Corrección',
        promptText: promptBuilder.buildCorrectionPrompt({
          sourceLang: this._ctx.sourceLang,
          targetLang,
          translatedText,
          acceptedObservations: accepted,
        }),
        validate: (text) => (text.trim() ? { ok: true, value: text } : { ok: false, error: 'Texto vacío.' }),
      });
      panel.addEventListener('response-accepted', async (e) => {
        await chapterManager.saveTranslation(novelName, chapterNum, targetLang, e.detail);
        await chapterManager.finishChapter(novelName, chapterNum, targetLang);
        await this.#refresh();
      });
    });
  }
}

customElements.define('ln-chapter-workflow', LnChapterWorkflow);