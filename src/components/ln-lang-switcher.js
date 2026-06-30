// src/components/ln-lang-switcher.js
import { BaseElement } from './base-element.js';
import { i18n } from '../i18n/strings.js';

export class LnLangSwitcher extends BaseElement {
  styles() {
    return `
      :host { display:inline-flex; align-items:center; }
      .group {
        display: inline-flex;
        gap: 4px;
        background: var(--ln-bg-card);
        border: 1px solid var(--ln-border);
        border-radius: 999px;
        padding: 3px;
      }
      button {
        background: transparent;
        border: none;
        color: var(--ln-text);
        font-size: 18px;
        line-height: 1;
        padding: 6px 10px;
        border-radius: 999px;
        cursor: pointer;
        opacity: .5;
        transition: opacity .15s, background .15s;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      button:hover { opacity: .85; }
      button[aria-selected="true"] {
        opacity: 1;
        background: var(--ln-bg-elevated);
        box-shadow: 0 0 0 1px var(--ln-accent) inset;
      }
      .code { font-size: 11px; color: var(--ln-text-muted); }
    `;
  }

  template() {
    const langs = i18n.available;
    const current = i18n.current;
    return `
      <div class="group" role="tablist">
        ${langs
          .map(
            (l) => `
            <button role="tab" data-code="${l.code}" aria-selected="${l.code === current}" title="${l.label}">
              <span>${l.flag}</span><span class="code">${l.code.split('-')[0]}</span>
            </button>`
          )
          .join('')}
      </div>
    `;
  }

  connectedCallback() {
    this.render();
    this.shadowRoot.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-code]');
      if (!btn) return;
      i18n.set(btn.dataset.code);
    });
    i18n.onChange(() => this.render());
  }
}

customElements.define('ln-lang-switcher', LnLangSwitcher);