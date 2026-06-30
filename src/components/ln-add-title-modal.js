// src/components/ln-add-title-modal.js
import { BaseElement } from './base-element.js';
import { i18n } from '../i18n/strings.js';

/**
 * Modal que aparece al abrir una novela que todavía no tiene título
 * en el idioma activo de la UI. Pide el título y lo guarda.
 *
 * Eventos:
 *   - title-confirmed → { novelName, langcode, title }
 *   - title-cancelled → el padre decide qué hacer (normalmente, volver al dashboard).
 */
export class LnAddTitleModal extends BaseElement {
  open({ novelName, langcode }) {
    this._ctx = { novelName, langcode };
    this._error = '';
    this.render();
    this.style.display = 'flex';
    this.$('#titleInput')?.focus();
  }

  close() {
    this.style.display = 'none';
  }

  styles() {
    return `
      :host { display:none; position:fixed; inset:0; background:rgba(0,0,0,.55); align-items:center; justify-content:center; z-index:60; }
      .box {
        width: min(440px, 92vw);
        background: var(--ln-bg-elevated); border:1px solid var(--ln-border);
        border-radius: var(--ln-radius-lg);
        padding: var(--ln-space-5);
        display:flex; flex-direction:column; gap: var(--ln-space-4);
      }
      h3 { margin:0; font-size: 16px; }
      p { margin:0; color: var(--ln-text-muted); font-size: 14px; }
      input {
        width: 100%;
        background: var(--ln-bg); border:1px solid var(--ln-border); color: var(--ln-text);
        border-radius: var(--ln-radius-sm); padding: 8px 10px; font-size:13px;
      }
      .error { color: var(--ln-danger); font-size: 12px; }
      .actions { display:flex; justify-content:flex-end; gap: var(--ln-space-2); }
      button { border-radius: var(--ln-radius-sm); padding: 8px 14px; font-size: 13px; border:1px solid var(--ln-border); background:transparent; color:var(--ln-text); }
      button.primary { background: var(--ln-accent); border-color: var(--ln-accent); color:#fff; }
      code {
        background: var(--ln-bg); border:1px solid var(--ln-border);
        padding: 2px 6px; border-radius: 4px; font-size: 12px;
      }
    `;
  }

  template() {
    const lang = this._ctx?.langcode ?? '';
    const t = (k, ...a) => i18n.t(`novel.${k}`, ...a);
    return `
      <div class="box" role="dialog" aria-modal="true">
        <h3>${t('addTitleTitle')}</h3>
        <p>${t('addTitleBody', lang)}</p>
        <input type="text" id="titleInput" placeholder="${t('addTitlePlaceholder')}" />
        ${this._error ? `<p class="error">${this._error}</p>` : ''}
        <div class="actions">
          <button type="button" id="cancel">${t('addTitleCancel')}</button>
          <button type="button" id="confirm" class="primary">${t('addTitleSave')}</button>
        </div>
      </div>
    `;
  }

  connectedCallback() {
    this.render();
    this._off = i18n.onChange(() => {
      if (this._ctx) this.render();
    });
  }

  disconnectedCallback() {
    this._off?.();
  }

  #bindOnce() {
    if (this._bound) return;
    this._bound = true;
    this.shadowRoot.addEventListener('click', (e) => {
      if (e.target.id === 'confirm') {
        const value = this.$('#titleInput')?.value.trim();
        if (!value) {
          this._error = i18n.t('novel.addTitleError');
          this.render();
          this.$('#titleInput')?.focus();
          return;
        }
        this.emit('title-confirmed', { ...this._ctx, title: value });
        this.close();
      } else if (e.target.id === 'cancel') {
        this.emit('title-cancelled', this._ctx);
        this.close();
      }
    });
    this.shadowRoot.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.id === 'titleInput') {
        this.$('#confirm')?.click();
      }
    });
  }

  // Override de render para garantizar el binding tras cada repintado.
  render() {
    super.render();
    this.#bindOnce();
  }
}
customElements.define('ln-add-title-modal', LnAddTitleModal);
