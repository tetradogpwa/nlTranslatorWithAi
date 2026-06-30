// src/views/dashboard-view.js
import { BaseElement } from '../components/base-element.js';
import '../components/ln-novel-grid.js';
import '../components/ln-novel-wizard.js';
import '../components/ln-lang-switcher.js';
import { projectManager } from '../core/projectManager.js';
import { chapterManager } from '../core/chapterManager.js';
import { NovelStatus } from '../core/states.js';
import { i18n } from '../i18n/strings.js';

export class DashboardView extends BaseElement {
  styles() {
    return `
      .header {
        display:flex; justify-content:space-between; align-items:center;
        padding: var(--ln-space-5); gap: var(--ln-space-3);
      }
      h1 { font-size:18px; margin:0; }
      .header-actions { display:flex; align-items:center; gap: var(--ln-space-3); }
      button.sync {
        background: var(--ln-bg-card); border:1px solid var(--ln-border);
        color:var(--ln-text); border-radius: var(--ln-radius-sm);
        padding: 8px 14px; font-size:13px;
      }
      main { padding: 0 var(--ln-space-5) var(--ln-space-6); }
      .pending-banner {
        margin: 0 var(--ln-space-5) var(--ln-space-4);
        background: var(--ln-bg-card); border:1px solid var(--ln-warning);
        color: var(--ln-warning); border-radius: var(--ln-radius-sm);
        padding: var(--ln-space-2) var(--ln-space-3); font-size: 13px;
      }
    `;
  }

  template() {
    return `
      <div class="header">
        <h1>${i18n.t('dashboard.title')}</h1>
        <div class="header-actions">
          <ln-lang-switcher></ln-lang-switcher>
          <button class="sync" id="syncBtn">${i18n.t('ui.sync')}</button>
        </div>
      </div>
      <p class="pending-banner" id="pendingBanner" hidden></p>
      <main><ln-novel-grid></ln-novel-grid></main>
      <ln-novel-wizard></ln-novel-wizard>
    `;
  }

  async connectedCallback() {
    this.render();
    this._off = i18n.onChange(() => this.render());
    this.$('#syncBtn').addEventListener('click', () => this.#syncAndLoad());
    this.shadowRoot.addEventListener(
      'open-novel',
      (e) => {
        e.stopPropagation();
        this.#handleOpenNovel(e.detail.id);
      },
      true
    );
    this.$('ln-novel-wizard').addEventListener('wizard-saved', async (e) => {
      await projectManager.saveNovelMeta(e.detail.originalName, e.detail);
      await this.#loadNovels();
    });
    await this.#syncAndLoad();
  }

  disconnectedCallback() {
    this._off?.();
  }

  async #handleOpenNovel(novelId) {
    const meta = await projectManager.getNovelMeta(novelId);
    if (meta?.setupPending) {
      const chapters = await projectManager.getChapterNumbers(novelId);
      this.$('ln-novel-wizard').open({ meta, detectedChapterCount: chapters.length });
      return;
    }
    this.emit('navigate-to-novel', { id: novelId });
  }

  async #syncAndLoad() {
    await projectManager.syncProject();
    const novels = await this.#loadNovels();
    const pendingCount = novels.filter((n) => n.setupPending).length;
    const banner = this.$('#pendingBanner');
    if (pendingCount) {
      banner.hidden = false;
      banner.textContent = i18n.t('dashboard.pendingBanner', pendingCount);
    } else {
      banner.hidden = true;
    }
  }

  async #loadNovels() {
    const novels = await projectManager.getNovelList();
    const lang = i18n.current;
    const enriched = [];
    for (const n of novels) {
      const chapterNumbers = await projectManager.getChapterNumbers(n.id);
      const progress = await chapterManager.computeProgress(n.id, chapterNumbers, lang);
      const statesForActive = await Promise.all(
        chapterNumbers.map((num) => chapterManager.getLangState(n.id, num, lang))
      );
      const status = computeStatus(n, statesForActive);
      enriched.push({
        ...n,
        chapterCount: chapterNumbers.length,
        progressForActiveLang: progress,
        status,
      });
    }
    this.$('ln-novel-grid').novels = enriched;
    return enriched;
  }
}

/**
 * Versión simplificada de computeNovelStatus: una sola novela + estados
 * del idioma activo. No necesitamos el agregado multi-idioma.
 */
function computeStatus(meta, states) {
  if (meta.setupPending) return NovelStatus.PENDING_SETUP;
  if (states.length === 0) return NovelStatus.NEW;
  const allFinished = states.every((s) => s.status === 'FINISHED');
  if (allFinished) return NovelStatus.FINISHED;
  const anyInReview = states.some((s) => s.status === 'IN_REVIEW');
  if (anyInReview) return NovelStatus.REVIEWING;
  const anyStarted = states.some((s) => s.status !== 'PENDING');
  if (anyStarted) return NovelStatus.TRANSLATING;
  return NovelStatus.NEW;
}

customElements.define('dashboard-view', DashboardView);