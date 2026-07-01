// src/components/ln-glossary-modal.js
import { BaseElement } from '../components/base-element.js';
import { glossaryManager } from '../core/glossaryManager.js';
import { i18n } from '../i18n/strings.js';

/**
 * Modal de solo lectura para consultar el glosario general de una novela
 * en el idioma activo, con buscador simple por término/lectura/traducción.
 */
export class LnGlossaryModal extends BaseElement {
  async open({ novelName, langcode }) {
    this._ctx = { novelName, langcode };
    this._filter = '';
    this._entries = await glossaryManager.getGlossaryForLang(novelName, langcode);
    this._entries.sort((a, b) => a.term.localeCompare(b.term, undefined, { numeric: true }));
    this.render();
    this.#bind();
    this.style.display = 'flex';
    this.$('#glossarySearch')?.focus();
  }

  close() {
    this.style.display = 'none';
  }

  styles() {
    return `
      :host { display:none; position:fixed; inset:0; background:rgba(0,0,0,.55); align-items:center; justify-content:center; z-index:60; }
      .box {
        width: min(680px, 92vw); max-height: 82vh;
        background: var(--ln-bg-elevated); border:1px solid var(--ln-border);
        border-radius: var(--ln-radius-lg);
        padding: var(--ln-space-5);
        display:flex; flex-direction:column; gap: var(--ln-space-3);
        overflow: hidden;
      }
      .head { display:flex; justify-content:space-between; align-items:center; gap: var(--ln-space-3); }
      h3 { margin:0; font-size: 16px; }
      button.close-btn {
        background: transparent; border:1px solid var(--ln-border); color: var(--ln-text);
        border-radius: var(--ln-radius-sm); padding: 6px 12px; font-size: 13px;
      }
      input#glossarySearch {
        width: 100%; background: var(--ln-bg); border:1px solid var(--ln-border); color: var(--ln-text);
        border-radius: var(--ln-radius-sm); padding: 8px 10px; font-size:13px;
      }
      .table-wrap { overflow-y:auto; border:1px solid var(--ln-border); border-radius: var(--ln-radius-md); }
      table { width:100%; border-collapse: collapse; font-size: 13px; }
      thead th {
        position: sticky; top:0; background: var(--ln-bg-card); text-align:left;
        padding: 8px 10px; font-size: 11px; text-transform: uppercase; letter-spacing:.03em;
        color: var(--ln-text-muted); border-bottom: 1px solid var(--ln-border);
      }
      tbody td { padding: 8px 10px; border-bottom: 1px solid var(--ln-border); vertical-align: top; }
      tbody tr:last-child td { border-bottom: none; }
      .term-cell { font-weight: 600; }
      .reading-cell { color: var(--ln-text-muted); font-size: 12px; }
      .notes-cell { color: var(--ln-text-muted); font-size: 12px; }
      .empty { padding: var(--ln-space-5); text-align:center; color: var(--ln-text-muted); }
      .count { font-size: 12px; color: var(--ln-text-muted); }
    `;
  }

  #filteredEntries() {
    const q = this._filter.trim().toLowerCase();
    if (!q) return this._entries;
    return this._entries.filter(
      (e) =>
        e.term?.toLowerCase().includes(q) ||
        e.reading?.toLowerCase().includes(q) ||
        e.translation?.toLowerCase().includes(q)
    );
  }

  template() {
    const lang = this._ctx?.langcode ?? '';
    const entries = this.#filteredEntries();
    return `
      <div class="box" role="dialog" aria-modal="true">
        <div class="head">
          <h3>${i18n.t('glossary.title', lang)}</h3>
          <button type="button" class="close-btn" id="closeBtn">${i18n.t('glossary.close')}</button>
        </div>
        <input type="text" id="glossarySearch" placeholder="${i18n.t('glossary.searchPlaceholder')}" value="${this._filter}" />
        <span class="count">${i18n.t('glossary.count', entries.length)}</span>
        <div class="table-wrap">
          ${
            entries.length
              ? `<table>
                  <thead>
                    <tr>
                      <th>${i18n.t('workflow.term')}</th>
                      <th>${i18n.t('workflow.reading')}</th>
                      <th>${i18n.t('workflow.translation')}</th>
                      <th>${i18n.t('glossary.notes')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${entries
                      .map(
                        (e) => `
                      <tr>
                        <td class="term-cell">${e.term ?? ''}</td>
                        <td class="reading-cell">${e.reading ?? ''}</td>
                        <td>${e.translation ?? ''}</td>
                        <td class="notes-cell">${e.notes ?? ''}</td>
                      </tr>`
                      )
                      .join('')}
                  </tbody>
                </table>`
              : `<div class="empty">${i18n.t('glossary.empty')}</div>`
          }
        </div>
      </div>
    `;
  }

  #bind() {
    this.$('#closeBtn').addEventListener('click', () => this.close());
    this.$('#glossarySearch').addEventListener('input', (e) => {
      this._filter = e.target.value;
      const focused = document.activeElement === this.$('#glossarySearch');
      this.render();
      this.#bind();
      if (focused) {
        const input = this.$('#glossarySearch');
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    });
  }

  connectedCallback() {
    this.render();
    this._off = i18n.onChange(() => {
      if (this._ctx) {
        this._ctx.langcode = i18n.current;
        this.open(this._ctx);
      }
    });
  }

  disconnectedCallback() {
    this._off?.();
  }
}

customElements.define('ln-glossary-modal', LnGlossaryModal);