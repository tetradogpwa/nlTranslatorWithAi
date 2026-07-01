// src/components/ln-clean-jp-modal.js
import { BaseElement } from './base-element.js';
import { chapterManager } from '../core/chapterManager.js';
import { promptBuilder } from '../core/promptBuilder.js';
import {
  findJapaneseRuns,
  findJapaneseParagraphs,
  countJapaneseChars,
} from '../core/japaneseDetector.js';
import { i18n } from '../i18n/strings.js';

/**
 * Modal para limpiar japonés colado en un capítulo ya finalizado.
 *
 * Eventos:
 *   - jp-cleaned → { novelName, chapterNum, langcode, cleanedText, removedCount }
 *       El padre debe refrescar el reader con el nuevo texto.
 *   - jp-clean-cancelled → se cerró sin guardar.
 */
export class LnCleanJpModal extends BaseElement {
  async open({ novelName, chapterNum, langcode }) {
    this._ctx = { novelName, chapterNum, langcode };
    this._mode = 'ai'; // 'ai' | 'manual'
    this._aiResponse = '';
    this._includeKanji = 'auto';

    const [translated, original] = await Promise.all([
      chapterManager.getTranslation(novelName, chapterNum, langcode),
      chapterManager.getOriginalText(novelName, chapterNum),
    ]);
    this._originalText = original ?? '';
    this._translatedText = translated ?? '';
    this._refreshRuns();
    this.render();
    this.style.display = 'flex';
  }

  close() {
    this.style.display = 'none';
    this.emit('jp-clean-cancelled', this._ctx);
  }

  _refreshRuns() {
    this._runs = findJapaneseRuns(this._translatedText, {
      includeKanji: this._includeKanji,
    });
    this._paragraphs = findJapaneseParagraphs(this._translatedText, {
      includeKanji: this._includeKanji,
    });
    this._charCount = countJapaneseChars(this._translatedText, {
      includeKanji: this._includeKanji,
    });
  }

  styles() {
    return `
      :host { display:none; position:fixed; inset:0; background:rgba(0,0,0,.55); align-items:center; justify-content:center; z-index:70; }
      .box {
        width: min(820px, 96vw); max-height: 92vh; overflow: hidden;
        background: var(--ln-bg-elevated); border:1px solid var(--ln-border);
        border-radius: var(--ln-radius-lg);
        display:flex; flex-direction:column;
      }
      .head { padding: var(--ln-space-4) var(--ln-space-5); border-bottom:1px solid var(--ln-border); display:flex; justify-content:space-between; align-items:center; gap: var(--ln-space-3); }
      .head h3 { margin:0; font-size: 16px; }
      .head .meta { font-size: 12px; color: var(--ln-text-muted); }
      .head button.close {
        background: transparent; border:1px solid var(--ln-border); color: var(--ln-text);
        border-radius: var(--ln-radius-sm); padding: 6px 12px; font-size: 13px;
      }
      .body { padding: var(--ln-space-4) var(--ln-space-5); overflow-y:auto; display:flex; flex-direction:column; gap: var(--ln-space-4); }
      .summary {
        background: var(--ln-bg-card); border:1px solid var(--ln-border);
        border-radius: var(--ln-radius-sm); padding: var(--ln-space-3);
        display:flex; flex-wrap:wrap; align-items:center; gap: var(--ln-space-3);
        font-size: 13px;
      }
      .summary.ok { border-color: var(--ln-success); color: var(--ln-success); }
      .summary.warn { border-color: var(--ln-warning); color: var(--ln-warning); }
      .badge {
        font-size: 11px; padding: 2px 8px; border-radius: 999px;
        background: var(--ln-bg-elevated); border:1px solid currentColor;
      }
      .runs-list {
        max-height: 180px; overflow-y:auto;
        border:1px solid var(--ln-border); border-radius: var(--ln-radius-sm);
        background: var(--ln-bg); font-size: 12px;
      }
      .run-row {
        padding: 6px 10px; border-bottom: 1px solid var(--ln-border);
        display:grid; grid-template-columns: auto 1fr; gap: var(--ln-space-3);
        align-items: start;
      }
      .run-row:last-child { border-bottom: none; }
      .run-row .num { color: var(--ln-text-muted); font-variant-numeric: tabular-nums; }
      .run-row .ctx { color: var(--ln-text-muted); }
      .run-row .ctx mark {
        background: rgba(224, 168, 62, .25); color: var(--ln-warning);
        padding: 1px 2px; border-radius: 3px;
      }
      .mode-tabs { display:flex; gap: var(--ln-space-2); }
      .mode-tabs button {
        background: transparent; border:1px solid var(--ln-border); color: var(--ln-text);
        border-radius: var(--ln-radius-sm); padding: 8px 14px; font-size: 13px;
      }
      .mode-tabs button.active {
        background: var(--ln-accent); border-color: var(--ln-accent); color: #fff;
      }
      .editor {
        width: 100%; min-height: 220px; resize: vertical;
        background: var(--ln-bg); color: var(--ln-text); border:1px solid var(--ln-border);
        border-radius: var(--ln-radius-sm); padding: var(--ln-space-3);
        font-family: ui-monospace, monospace; font-size: 12.5px;
      }
      .editor:focus { outline: 2px solid var(--ln-accent); outline-offset: -1px; }
      .footer {
        padding: var(--ln-space-3) var(--ln-space-5); border-top:1px solid var(--ln-border);
        display:flex; justify-content:flex-end; gap: var(--ln-space-2);
        background: var(--ln-bg-elevated);
      }
      .footer button {
        background: transparent; border:1px solid var(--ln-border); color: var(--ln-text);
        border-radius: var(--ln-radius-sm); padding: 8px 14px; font-size: 13px;
      }
      .footer button.primary {
        background: var(--ln-accent); border-color: var(--ln-accent); color: #fff;
      }
      .footer button.primary:disabled { opacity:.4; cursor:not-allowed; }
      .ai-panel {
        display:flex; flex-direction:column; gap: var(--ln-space-3);
        background: var(--ln-bg-card); border:1px solid var(--ln-border);
        border-radius: var(--ln-radius-sm); padding: var(--ln-space-3);
      }
      .ai-panel h4 {
        margin:0; font-size:12px; text-transform:uppercase; letter-spacing:.03em;
        color: var(--ln-text-muted);
      }
      .ai-panel textarea {
        width:100%; min-height:140px; resize: vertical;
        background: var(--ln-bg); color: var(--ln-text); border:1px solid var(--ln-border);
        border-radius: var(--ln-radius-sm); padding: var(--ln-space-3);
        font-family: ui-monospace, monospace; font-size: 12px;
      }
      .ai-panel .actions { display:flex; gap: var(--ln-space-2); align-items:center; }
      .ai-panel button {
        background: var(--ln-accent); color:#fff; border:none;
        border-radius: var(--ln-radius-sm); padding: 8px 14px; font-size: 13px;
      }
      .ai-panel button.secondary {
        background: transparent; border:1px solid var(--ln-border); color: var(--ln-text);
      }
      .ai-panel .copied { color: var(--ln-success); font-size: 12px; }
      .help { font-size: 12px; color: var(--ln-text-muted); }
      .help code {
        background: var(--ln-bg); border:1px solid var(--ln-border);
        padding: 1px 6px; border-radius: 4px; font-size: 11px;
      }
      .preview-note {
        font-size: 11px; color: var(--ln-text-muted); text-align:right;
      }
    `;
  }

  template() {
    const t = (k, ...a) => i18n.t(`cleanJp.${k}`, ...a);
    const lang = this._ctx?.langcode ?? '';
    const hasRuns = this._runs && this._runs.length > 0;
    const summaryClass = hasRuns ? 'warn' : 'ok';
    const summaryText = hasRuns
      ? t('detectedSummary', this._charCount, this._runs.length)
      : t('noneDetected');
    const promptText = hasRuns
      ? promptBuilder.buildJapaneseCleanupPrompt({
          targetLang: lang,
          originalText: this._originalText,
          translatedText: this._translatedText,
          japaneseRuns: this._runs,
        })
      : '';

    return `
      <div class="box" role="dialog" aria-modal="true">
        <div class="head">
          <div>
            <h3>${t('title')}</h3>
            <div class="meta">${t('subtitle', this._ctx?.chapterNum ?? '', lang)}</div>
          </div>
          <button type="button" class="close" id="closeBtn">${t('close')}</button>
        </div>
        <div class="body">
          <div class="summary ${summaryClass}">
            <span class="badge">${lang}</span>
            <span>${summaryText}</span>
          </div>

          ${hasRuns
            ? `
              <div>
                <div class="preview-note">${t('runsPreviewNote', Math.min(this._paragraphs.length, 20), this._paragraphs.length)}</div>
                <div class="runs-list">
                  ${this._paragraphs
                    .slice(0, 20)
                    .map((p) => {
                      const ctx = this.#surroundingContext(this._translatedText, p, 60);
                      return `
                        <div class="run-row">
                          <span class="num">¶${p.index + 1}</span>
                          <span class="ctx">${ctx}</span>
                        </div>`;
                    })
                    .join('')}
                </div>
              </div>
              `
            : ''
          }

          <div class="mode-tabs">
            <button type="button" data-mode="ai" class="${this._mode === 'ai' ? 'active' : ''}" id="modeAi">${t('modeAi')}</button>
            <button type="button" data-mode="manual" class="${this._mode === 'manual' ? 'active' : ''}" id="modeManual">${t('modeManual')}</button>
          </div>

          ${this._mode === 'ai'
            ? `
              <div class="ai-panel">
                <h4>${t('promptTitle')}</h4>
                <textarea id="aiPrompt" readonly>${this.#escapeTextareaContent(promptText)}</textarea>
                <div class="actions">
                  <button type="button" id="copyPrompt">${t('copyPrompt')}</button>
                  <span class="copied" id="copiedMsg" hidden>${t('copied')}</span>
                </div>
                <h4>${t('pasteTitle')}</h4>
                <textarea id="aiResponse" placeholder="${t('pastePlaceholder')}">${this.#escapeTextareaContent(this._aiResponse)}</textarea>
                <div class="actions">
                  <button type="button" class="secondary" id="applyResponse">${t('applyToEditor')}</button>
                </div>
                <p class="help">${t('aiHelp')}</p>
              </div>
              `
            : `
              <div>
                <p class="help">${t('manualHelp')}</p>
                <textarea class="editor" id="manualEditor">${this.#escapeTextareaContent(this._translatedText)}</textarea>
              </div>
              `
          }
        </div>
        <div class="footer">
          <button type="button" id="cancelBtn">${t('cancel')}</button>
          <button type="button" class="primary" id="saveBtn" ${!hasRuns ? 'disabled' : ''}>${t('save')}</button>
        </div>
      </div>
    `;
  }

  /**
   * Devuelve el fragmento de `text` alrededor de `paragraph`, con los runs
   * japoneses envueltos en <mark>. Limitado a `half` caracteres por lado.
   */
  #surroundingContext(text, paragraph, half) {
    const start = Math.max(0, paragraph.start - half);
    const end = Math.min(text.length, paragraph.end + half);
    const slice = text.slice(start, end);
    // Resaltar runs relativos al slice
    const localRuns = paragraph.runs.map((r) => ({
      start: r.start - start,
      end: r.end - start,
    }));
    return this.#highlightRuns(slice, localRuns, start, end);
  }

  #highlightRuns(slice, runs, absStart, absEnd) {
    if (!runs.length) return this.#escapeHtml(slice);
    // Si el fragmento está truncado, añadir elipsis
    const prefix = absStart > 0 ? '…' : '';
    const suffix = absEnd < this._translatedText.length ? '…' : '';
    let html = '';
    let cursor = 0;
    for (const r of runs) {
      const s = Math.max(0, r.start);
      const e = Math.min(slice.length, r.end);
      if (s > cursor) html += this.#escapeHtml(slice.slice(cursor, s));
      html += `<mark>${this.#escapeHtml(slice.slice(s, e))}</mark>`;
      cursor = e;
    }
    if (cursor < slice.length) html += this.#escapeHtml(slice.slice(cursor));
    return prefix + html + suffix;
  }

  #escapeHtml(text) {
    // Escape estándar para texto dentro de elementos HTML (spans, divs...).
    // Escapamos <, >, &, " para no romper el HTML resultante.
    return (text ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  #escapeTextareaContent(text) {
    // Escape seguro para texto DENTRO de un <textarea>: solo escapamos
    // `&` y el literal `</textarea>` para no romper la etiqueta. Dejamos
    // `<`, `>` y `"` literales porque el contenido del textarea es texto.
    return (text ?? '')
      .replace(/&/g, '&amp;')
      .replace(/<\/textarea>/gi, '&lt;/textarea&gt;');
  }

  #buildPromptText() {
    return promptBuilder.buildJapaneseCleanupPrompt({
      targetLang: this._ctx.langcode,
      originalText: this._originalText,
      translatedText: this._translatedText,
      japaneseRuns: this._runs,
    });
  }

  #bind() {
    if (this._bound) return;
    this._bound = true;
    this.shadowRoot.addEventListener('click', async (e) => {
      const tgt = e.target;
      if (tgt.id === 'closeBtn' || tgt.id === 'cancelBtn') {
        this.close();
        return;
      }
      if (tgt.id === 'modeAi') {
        this._mode = 'ai';
        this.render(); this.#bind();
        return;
      }
      if (tgt.id === 'modeManual') {
        this._mode = 'manual';
        this.render(); this.#bind();
        return;
      }
      if (tgt.id === 'copyPrompt') {
        await navigator.clipboard.writeText(this.#buildPromptText());
        const msg = this.$('#copiedMsg');
        if (msg) {
          msg.hidden = false;
          setTimeout(() => (msg.hidden = true), 1500);
        }
        return;
      }
      if (tgt.id === 'applyResponse') {
        const resp = this.$('#aiResponse')?.value ?? '';
        this._aiResponse = resp;
        // Pasar al editor manual y refrescar runs con el nuevo texto.
        this._translatedText = resp;
        this._refreshRuns();
        this._mode = 'manual';
        this.render();
        this.#bind();
        return;
      }
      if (tgt.id === 'saveBtn') {
        await this.#save();
        return;
      }
    });
  }

  async #save() {
    let finalText;
    if (this._mode === 'ai') {
      finalText = this.$('#aiResponse')?.value ?? '';
    } else {
      finalText = this.$('#manualEditor')?.value ?? '';
    }
    if (!finalText.trim()) return;
    const before = this._charCount;
    await chapterManager.writeCleanedTranslation(
      this._ctx.novelName,
      this._ctx.chapterNum,
      this._ctx.langcode,
      finalText,
    );
    const after = countJapaneseChars(finalText, { includeKanji: this._includeKanji });
    this.emit('jp-cleaned', {
      ...this._ctx,
      cleanedText: finalText,
      removedCount: Math.max(0, before - after),
    });
    this.style.display = 'none';
  }

  render() {
    super.render();
    this.#bind();
  }

  connectedCallback() {
    this._bound = false;
    this.render();
    this._off = i18n.onChange(() => {
      if (this._ctx) this.render();
    });
  }

  disconnectedCallback() {
    this._off?.();
  }
}

customElements.define('ln-clean-jp-modal', LnCleanJpModal);