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
        display: grid;
        /* El banner ocupa el 55% del ancho (siempre ≥ la mitad).
           En pantallas muy estrechas cae a 1fr (banner encima). */
        grid-template-columns: minmax(50%, 1fr) 1fr;
        gap: var(--ln-space-4);
        background: var(--ln-bg-card);
        border: 1px solid var(--ln-border);
        border-radius: var(--ln-radius-lg);
        overflow: hidden;
        cursor: pointer;
        transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease;
        text-align: left;
        width: 100%;
      }
      .card:hover { transform: translateY(-1px); box-shadow: var(--ln-shadow-2); border-color: var(--ln-accent); }

      .banner {
        background: linear-gradient(135deg, var(--ln-bg-elevated), var(--ln-bg));
        background-size: cover;
        background-position: center;
        /* Más alto para que la imagen luzca como banner rectangular */
        min-height: 220px;
        position: relative;
      }

      .star {
        position: absolute; top: var(--ln-space-2); right: var(--ln-space-2);
        font-size: 20px; filter: drop-shadow(0 1px 2px rgba(0,0,0,.5));
      }

      .body {
        padding: var(--ln-space-4);
        display: flex;
        flex-direction: column;
        gap: var(--ln-space-2);
        min-width: 0; /* para que el text-overflow funcione en grid */
      }
      .title { font-weight: 600; font-size: 16px; }
      .subtitle { font-size: 12px; color: var(--ln-text-muted); }
      .status {
        font-size: 11px; text-transform: uppercase; letter-spacing: .04em;
        color: var(--ln-text-muted);
      }
      .langs { display:flex; flex-direction:column; gap: 4px; margin-top: var(--ln-space-2); }
      .lang-row { display:flex; align-items:center; gap: var(--ln-space-2); font-size: 11px; color: var(--ln-text-muted); }
      .lang-code { width: 56px; font-weight: 600; }
      .bar { flex:1; height:5px; background: var(--ln-border); border-radius: 3px; overflow:hidden; }
      .bar > span { display:block; height:100%; background: var(--ln-accent); }
      .count { font-size: 11px; color: var(--ln-text-muted); margin-top: var(--ln-space-1); }

      /* Móvil: layout vertical con banner arriba ocupando todo el ancho */
      @media (max-width: 600px) {
        .card { grid-template-columns: 1fr; }
        .banner { min-height: 180px; }
        .title { font-size: 14px; }
      }
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
          ${n.nameEs && n.originalName !== n.nameEs ? `<div class="subtitle">${n.originalName}</div>` : ''}
          <div class="status">${NovelStatusLabel[n.status] ?? n.status}</div>
          <div class="count">${n.chapterCount ?? 0} capítulos</div>
          <div class="langs">
            ${(n.langProgress ?? [])
              .map(
                (l) => `
                <div class="lang-row">
                  <span class="lang-code">${l.langcode}</span>
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