// src/components/ln-novel-grid.js
import { BaseElement } from './base-element.js';
import './ln-novel-card.js';

export class LnNovelGrid extends BaseElement {
  set novels(list) {
    this._novels = list;
    this.render();
    this.$all('ln-novel-card').forEach((el, i) => (el.novel = this._novels[i]));
  }

  styles() {
    return `
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: var(--ln-space-4);
      }
      .empty {
        color: var(--ln-text-muted);
        padding: var(--ln-space-6);
        text-align: center;
      }
    `;
  }

  template() {
    const novels = this._novels ?? [];
    if (!novels.length) {
      return `<div class="empty">No se han detectado novelas todavía. Añade carpetas con capítulos .txt dentro de <strong>Source/</strong>.</div>`;
    }
    return `<div class="grid">${novels.map(() => '<ln-novel-card></ln-novel-card>').join('')}</div>`;
  }

  connectedCallback() {
    this.render();
    this.$all('ln-novel-card').forEach((el, i) => (el.novel = this._novels[i]));
  }
}

customElements.define('ln-novel-grid', LnNovelGrid);
