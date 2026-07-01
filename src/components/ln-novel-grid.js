// src/components/ln-novel-grid.js
import { BaseElement } from './base-element.js';
import { i18n } from '../i18n/strings.js';
import './ln-novel-card.js';

export class LnNovelGrid extends BaseElement {
  set novels(list) {
    this._novels = list;
    this.render();
    this.$all('ln-novel-card').forEach((el, i) => (el.novel = this._novels[i]));
  }

  styles() {
    return `
      :host { display:block; }
      .list { display: flex; flex-direction: column; gap: var(--ln-space-3); }
      .empty { color: var(--ln-text-muted); padding: var(--ln-space-6); text-align: center; }
    `;
  }

  template() {
    const novels = this._novels ?? [];
    if (!novels.length) {
      return `<div class="empty">${i18n.t('dashboard.empty')}</div>`;
    }
    return `<div class="list">${novels.map(() => '<ln-novel-card></ln-novel-card>').join('')}</div>`;
  }

  connectedCallback() {
    this.render();
    this.$all('ln-novel-card').forEach((el, i) => (el.novel = this._novels[i]));
    this._off = i18n.onChange(() => {
      if (!this._novels?.length) this.render();
    });
  }

  disconnectedCallback() {
    this._off?.();
  }
}

customElements.define('ln-novel-grid', LnNovelGrid);