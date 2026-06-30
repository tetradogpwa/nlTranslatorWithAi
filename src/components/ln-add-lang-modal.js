// src/components/ln-add-lang-modal.js
import { BaseElement } from './base-element.js';
import { i18n } from '../i18n/strings.js';

/**
 * Modal que aparece al abrir una novela cuyo idioma activo de UI no
 * está en availableTargetLangs. Pregunta al usuario si quiere añadirlo.
 *
 * Eventos:
 *   - add-lang-confirmed → el usuario ha confirmado; el padre añade el idioma a la novela.
 *   - add-lang-cancelled → el usuario ha cancelado; el padre decide qué hacer.
 */
export class LnAddLangModal extends BaseElement {
  open({ novelName, langcode }) {
    this._ctx = { novelName, langcode };
    this.render();
    this.style.display = 'flex';
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
        <h3>${t('addLangTitle')}</h3>
        <p>${t('addLangBody', lang)}</p>
        <p><code>${lang}</code></p>
        <div class="actions">
          <button type="button" id="cancel">${t('addLangNo')}</button>
          <button type="button" id="confirm" class="primary">${t('addLangYes')}</button>
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
        this.emit('add-lang-confirmed', this._ctx);
        this.close();
      } else if (e.target.id === 'cancel') {
        this.emit('add-lang-cancelled', this._ctx);
        this.close();
      }
    });
  }

  // Override de render para garantizar el binding tras cada repintado.
  render() {
    super.render();
    this.#bindOnce();
  }
}

customElements.define('ln-add-lang-modal', LnAddLangModal);