// src/components/ln-novel-card.js
import { BaseElement } from './base-element.js';
import { i18n } from '../i18n/strings.js';

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
        min-height: 220px;
        position: relative;
      }
      .star {
        position: absolute; top: var(--ln-space-2); right: var(--ln-space-2);
        font-size: 20px; filter: drop-shadow(0 1px 2px rgba(0,0,0,.5));
      }
      .lang-pill {
        position: absolute; bottom: var(--ln-space-2); left: var(--ln-space-2);
        background: rgba(0,0,0,.6); border:1px solid rgba(255,255,255,.15);
        padding: 2px 8px; border-radius: 999px; font-size: 11px;
        color: #fff; backdrop-filter: blur(4px);
      }

      .body {
        padding: var(--ln-space-4);
        display: flex;
        flex-direction: column;
        gap: var(--ln-space-2);
        min-width: 0;
      }
      .title { font-weight: 600; font-size: 16px; }
      .subtitle { font-size: 12px; color: var(--ln-text-muted); }
      .status {
        font-size: 11px; text-transform: uppercase; letter-spacing: .04em;
        color: var(--ln-text-muted);
      }
      .progress-section { margin-top: var(--ln-space-2); display:flex; flex-direction:column; gap: 6px; }
      .progress-row { display:flex; align-items:center; gap: var(--ln-space-2); font-size: 12px; color: var(--ln-text-muted); }
      .bar { flex:1; height:6px; background: var(--ln-border); border-radius: 3px; overflow:hidden; }
      .bar > span { display:block; height:100%; background: var(--ln-accent); }
      .pending-warn {
        font-size: 12px; color: var(--ln-warning);
        background: rgba(224, 168, 62, .08);
        border:1px solid var(--ln-warning); border-radius: var(--ln-radius-sm);
        padding: var(--ln-space-2); margin-top: var(--ln-space-2);
      }
      .count { font-size: 11px; color: var(--ln-text-muted); margin-top: var(--ln-space-1); }

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
    const t = (k, ...a) => i18n.t(`status.novel.${n.status}`) ?? n.status;
    const isFinished = n.status === 'FINISHED';
    const lang = i18n.current;
    const langAvail = (n.availableTargetLangs ?? []).includes(lang);
    const pct = Math.round((n.progressForActiveLang ?? 0) * 100);
    const flag = i18n.available.find((l) => l.code === lang)?.flag ?? '';
    return `
      <div class="card">
        <div class="banner" style="${n.banner ? `background-image:url('${n.banner}')` : ''}">
          ${isFinished ? '<span class="star">⭐</span>' : ''}
          <span class="lang-pill">${flag} ${lang}</span>
        </div>
        <div class="body">
          <div class="title">${n.nameEs || n.nameCa || n.originalName}</div>
          ${n.originalName && n.originalName !== (n.nameEs || n.nameCa) ? `<div class="subtitle">${n.originalName}</div>` : ''}
          <div class="status">${t('status')}</div>
          <div class="count">${i18n.t('ui.chapters', n.chapterCount ?? 0)}</div>
          ${!langAvail
            ? `<div class="pending-warn">${i18n.t('novel.addLangBody', lang)}</div>`
            : `<div class="progress-section">
                <div class="progress-row">
                  <span>${flag} ${lang}</span>
                  <div class="bar"><span style="width:${pct}%"></span></div>
                  <span><strong>${pct}%</strong></span>
                </div>
              </div>`
          }
        </div>
      </div>
    `;
  }

  connectedCallback() {
    this.render();
    this._off = i18n.onChange(() => this.render());
    this.addEventListener('click', () => this.emit('open-novel', { id: this._novel.id }));
  }

  disconnectedCallback() {
    this._off?.();
  }
}

customElements.define('ln-novel-card', LnNovelCard);