// src/views/dashboard-view.js
import { BaseElement } from '../components/base-element.js';
import '../components/ln-novel-grid.js';
import '../components/ln-novel-wizard.js';
import '../components/ln-lang-switcher.js';
import { projectManager } from '../core/projectManager.js';
import { chapterManager } from '../core/chapterManager.js';
import { NovelStatus } from '../core/states.js';
import { i18n } from '../i18n/strings.js';
import { novelListCache } from '../core/novelListCache.js';
import { popFlash } from '../core/uiFlash.js';

export class DashboardView extends BaseElement {
  styles() {
    return `
      .header { display:flex; justify-content:space-between; align-items:center; padding: var(--ln-space-5); gap: var(--ln-space-3); }
      h1 { font-size:18px; margin:0; }
      .header-actions { display:flex; align-items:center; gap: var(--ln-space-3); }
      button.sync { background: var(--ln-bg-card); border:1px solid var(--ln-border); color:var(--ln-text); border-radius: var(--ln-radius-sm); padding: 8px 14px; font-size:13px; }
      button.sync:disabled { opacity:.5; cursor:default; }
      main { padding: 0 var(--ln-space-5) var(--ln-space-6); }
      .pending-banner {
        margin: 0 var(--ln-space-5) var(--ln-space-4);
        background: var(--ln-bg-card); border:1px solid var(--ln-warning);
        color: var(--ln-warning); border-radius: var(--ln-radius-sm);
        padding: var(--ln-space-2) var(--ln-space-3); font-size: 13px;
      }
      .flash-banner {
        margin: 0 var(--ln-space-5) var(--ln-space-4);
        background: var(--ln-bg-card); border:1px solid var(--ln-danger);
        color: var(--ln-danger); border-radius: var(--ln-radius-sm);
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
      <p class="flash-banner" id="flashBanner" hidden></p>
      <p class="pending-banner" id="pendingBanner" hidden></p>
      <main><ln-novel-grid></ln-novel-grid></main>
      <ln-novel-wizard></ln-novel-wizard>
    `;
  }

  async connectedCallback() {
    this.render();
    this._off = i18n.onChange(() => this.render());

    this.$('#syncBtn').addEventListener('click', async () => {
      const btn = this.$('#syncBtn');
      btn.disabled = true;
      await this.#syncAndLoad();
      btn.disabled = false;
    });

    this.shadowRoot.addEventListener('open-novel', (e) => {
      e.stopPropagation();
      this.#handleOpenNovel(e.detail.id);
    }, true);

    // La tarjeta ya sabe que está marcada como "no encontrada": no
    // hace falta volver a tocar disco, solo avisar.
    this.shadowRoot.addEventListener('open-missing-novel', (e) => {
      e.stopPropagation();
      this.#showFlash('notFound');
    }, true);

    this.$('ln-novel-wizard').addEventListener('wizard-saved', async (e) => {
      await projectManager.saveNovelMeta(e.detail.originalName, e.detail);
      novelListCache.clear();
      await this.#syncAndLoad();
    });

    const flash = popFlash();
    const cached = novelListCache.get();

    if (cached) {
      // Pintado instantáneo con lo que ya teníamos: nada de esperar
      // a leer disco solo para volver a ver la lista.
      this.#renderNovels(cached.novels);
      if (flash) this.#showFlash(flash.kind);
      // Revalidamos por detrás; si algo cambió, se repinta solo.
      this.#syncAndLoad();
    } else {
      if (flash) this.#showFlash(flash.kind);
      await this.#syncAndLoad();
    }
  }

  disconnectedCallback() {
    this._off?.();
  }

  async #handleOpenNovel(novelId) {
    const meta = await projectManager.getNovelMeta(novelId);
    if (!meta) {
      novelListCache.markMissing(novelId);
      const cached = novelListCache.get();
      if (cached) this.#renderNovels(cached.novels);
      this.#showFlash('notFound');
      return;
    }
    if (meta.setupPending) {
      const chapters = await projectManager.getChapterNumbers(novelId);
      this.$('ln-novel-wizard').open({ meta, detectedChapterCount: chapters.length });
      return;
    }
    this.emit('navigate-to-novel', { id: novelId });
  }

  async #syncAndLoad() {
    const { removedNovels } = await projectManager.syncProject();
    const novels = await this.#loadNovels(removedNovels);
    novelListCache.set({ novels });
    this.#renderNovels(novels);
  }

  async #loadNovels(removedNovels = []) {
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
        missing: removedNovels.includes(n.id),
      });
    }
    return enriched;
  }

  #renderNovels(novels) {
    this.$('ln-novel-grid').novels = novels;
    const pendingCount = novels.filter((n) => n.setupPending).length;
    const banner = this.$('#pendingBanner');
    if (pendingCount) {
      banner.hidden = false;
      banner.textContent = i18n.t('dashboard.pendingBanner', pendingCount);
    } else {
      banner.hidden = true;
    }
  }

  #showFlash(kind) {
    const banner = this.$('#flashBanner');
    if (!banner || kind !== 'notFound') return;
    banner.textContent = i18n.t('novel.notFound');
    banner.hidden = false;
    clearTimeout(this._flashTimer);
    this._flashTimer = setTimeout(() => { banner.hidden = true; }, 4000);
  }
}

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