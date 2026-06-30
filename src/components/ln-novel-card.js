// src/components/ln-novel-card.js
import { BaseElement } from './base-element.js';
import { NovelStatusLabel } from '../core/states.js';

export class LnNovelCard extends BaseElement {
  static get observedAttributes() {
    return ['status'];
  }

  set novel(data) {
    this._novel = data;
    this.render();
  }

  styles() {
    return `
      :host { display:block; }
      .card {
        background: var(--ln-bg-card);
        border: 1px solid var(--ln-border);
        border-radius: var(--ln-radius-lg);
        overflow: hidden;
        cursor: pointer;
        transition: transform .15s ease, box-shadow .15s ease;
      }
      .card:hover { transform: translateY(-2px); box-shadow: var(--ln-shadow-2); }
      .banner {
        height: 120px;
        background: linear-gradient(135deg, var(--ln-bg-elevated), var(--ln-bg));
        background-size: cover;
        background-position: center;
        display:flex; align-items:flex-end; justify-content:flex-end;
        padding: var(--ln-space-2);
      }
      .star { font-size: 20px; filter: drop-shadow(0 1px 2px rgba(0,0,0,.5)); }
      .body { padding: var(--ln-space-4); display:flex; flex-direction:column; gap: var(--ln-space-2); }
      .title { font-weight: 600; font-size: 15px; }
      .status {
        font-size: 11px; text-transform: uppercase; letter-spacing: .04em;
        color: var(--ln-text-muted);
      }
      .langs { display:flex; flex-direction:column; gap: 4px; margin-top: var(--ln-space-2); }
      .lang-row { display:flex; align-items:center; gap: var(--ln-space-2); font-size: 11px; color: var(--ln-text-muted); }
      .bar { flex:1; height:5px; background: var(--ln-border); border-radius: 3px; overflow:hidden; }
      .bar > span { display:block; height:100%; background: var(--ln-accent); }
      .count { font-size: 11px; color: var(--ln-text-muted); }
    `;
  }

  template() {
    const n = this._novel;
    if (!n) return '';
    const isFinished = n.status === 'FINISHED';
    return `
      <div class="card">
        <div class="banner" style="${n.banner ? `background-image:url('${n.banner}')` : ''}">
          ${isFinished ? '<span class="star">⭐</span>' : ''}
        </div>
        <div class="body">
          <div class="title">${n.nameEs || n.originalName}</div>
          <div class="status">${NovelStatusLabel[n.status] ?? n.status}</div>
          <div class="count">${n.chapterCount ?? 0} capítulos</div>
          <div class="langs">
            ${(n.langProgress ?? [])
              .map(
                (l) => `
                <div class="lang-row">
                  <span>${l.langcode}</span>
                  <div class="bar"><span style="width:${Math.round(l.progress * 100)}%"></span></div>
                  <span>${Math.round(l.progress * 100)}%</span>
                </div>`
              )
              .join('')}
          </div>
        </div>
      </div>
    `;
  }

  connectedCallback() {
    this.render();
    this.addEventListener('click', () => this.emit('open-novel', { id: this._novel.id }));
  }
}

customElements.define('ln-novel-card', LnNovelCard);
