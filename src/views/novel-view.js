// src/views/novel-view.js
import { BaseElement } from '../components/base-element.js';
import '../components/ln-chapter-workflow.js';
import '../components/ln-reader.js';
import '../components/ln-add-lang-modal.js';
import '../components/ln-lang-switcher.js';
import { projectManager } from '../core/projectManager.js';
import { chapterManager } from '../core/chapterManager.js';
import { ChapterLangStatus, findLastPendingChapter } from '../core/states.js';
import { i18n } from '../i18n/strings.js';

export class NovelView extends BaseElement {
  async open(novelId) {
    this._novelId = novelId;
    await this.#enterNovel();
  }

  /**
   * Decide qué hacer al entrar a la novela o al cambiar de idioma:
   * - Si setupPending → abre wizard (delegado a dashboard, así que no debería pasar aquí).
   * - Si el idioma activo NO está en availableTargetLangs → abre el modal "añadir idioma".
   *   Si lo acepta, lo añadimos y seguimos. Si lo cancela, salimos de la novela.
   * - Si está, calculamos capítulo inicial y pintamos la vista.
   */
  async #enterNovel() {
    this._meta = await projectManager.getNovelMeta(this._novelId);
    if (!this._meta) return;
    const lang = i18n.current;
    const available = this._meta.availableTargetLangs ?? [];

    if (!available.includes(lang)) {
      // Mostrar modal; el handler de add-lang-confirmed / -cancelled
      // está conectado al hacer render(), así que conectamos una sola vez.
      this.#ensureAddLangModal();
      this._addLangModal.open({ novelName: this._novelId, langcode: lang });
      return;
    }

    this._selectedChapter = await this.#resolveInitialChapter();
    await this.render2();
  }

  #ensureAddLangModal() {
    if (this._addLangModal) return;
    const modal = document.createElement('ln-add-lang-modal');
    this.shadowRoot.appendChild(modal);
    modal.addEventListener('add-lang-confirmed', async (e) => {
      const { novelName, langcode } = e.detail;
      this._meta = await projectManager.addAvailableTargetLang(novelName, langcode);
      this._selectedChapter = await this.#resolveInitialChapter();
      await this.render2();
    });
    modal.addEventListener('add-lang-cancelled', () => {
      this.emit('back-to-dashboard');
    });
    this._addLangModal = modal;
  }

  async #resolveInitialChapter() {
    if (!this._chapters?.length) return null;
    const lang = i18n.current;
    const stateByNum = new Map();
    for (const num of this._chapters) {
      stateByNum.set(num, await chapterManager.getLangState(this._novelId, num, lang));
    }
    return findLastPendingChapter(this._chapters, stateByNum) ?? this._chapters[0];
  }

  styles() {
    return `
      :host { display:block; height:100%; }
      .layout { display:grid; grid-template-columns: 260px 1fr; height:100%; }
      aside { border-right:1px solid var(--ln-border); overflow-y:auto; padding: var(--ln-space-3); }
      .back {
        background:none; border:none; color: var(--ln-text-muted); cursor:pointer;
        margin-bottom: var(--ln-space-3); font-size:13px;
      }
      .header-bar {
        display:flex; justify-content:space-between; align-items:center;
        gap: var(--ln-space-3);
        margin-bottom: var(--ln-space-2);
      }
      h3 { margin: 0; font-size: 14px; }
      ul { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:4px; }
      li button {
        width:100%; text-align:left;
        background: var(--ln-bg-card); border:1px solid var(--ln-border); color:var(--ln-text);
        border-radius:6px; padding:8px 10px; font-size:13px;
        display:flex; justify-content:space-between; align-items:center; gap:8px;
      }
      li button[aria-current="true"] { border-color: var(--ln-accent); }
      li button.is-finished { opacity: .7; }
      li button .num { font-weight:600; }
      li button .chstatus { font-size:10px; color: var(--ln-text-muted); white-space:nowrap; }
      li button .read-icon { font-size: 12px; color: var(--ln-success); }

      section { padding: var(--ln-space-5); overflow-y:auto; min-width: 0; }
      .section-header {
        display:flex; justify-content:space-between; align-items:center;
        gap: var(--ln-space-3); margin-bottom: var(--ln-space-2);
      }
      h2 { margin:0; }
      .chapter-meta { font-size:12px; color: var(--ln-text-muted); margin: 0 0 var(--ln-space-4); }
    `;
  }

  template() {
    const lang = i18n.current;
    const flag = i18n.available.find((l) => l.code === lang)?.flag ?? '';
    return `
      <div class="layout">
        <aside>
          <button class="back" id="backBtn">${i18n.t('ui.back')}</button>
          <div class="header-bar">
            <h3>${this._meta?.nameEs || this._meta?.nameCa || this._novelId}</h3>
            <ln-lang-switcher></ln-lang-switcher>
          </div>
          <p class="chapter-meta">${flag} ${lang}</p>
          <ul id="chapterList"></ul>
        </aside>
        <section>
          <div class="section-header">
            <h2>${i18n.t('novel.chapterTitle', this._selectedChapter, lang)}</h2>
          </div>
          <p class="chapter-meta" id="chapterMeta"></p>
          <ln-chapter-workflow id="workflow"></ln-chapter-workflow>
        </section>
      </div>
    `;
  }

  async render2() {
    this.render();
    this._chapters = await projectManager.getChapterNumbers(this._novelId);
    this.$('#backBtn').addEventListener('click', () => this.emit('back-to-dashboard'));

    // Cambio de idioma → re-evaluamos (puede requerir añadir idioma)
    this.$('ln-lang-switcher').addEventListener('click', (e) => e.stopPropagation());
    // El switcher ya cambia i18n.current; nos suscribimos:
    this._offLang = i18n.onChange(() => this.#enterNovel());

    this.$('#workflow').addEventListener('chapter-finished', (e) => this.#onChapterFinished(e.detail));
    this.$('#workflow').addEventListener('read-chapter', (e) => this.#openReader(e.detail));

    await this.#renderChapterList();
    await this.#loadWorkflow();
  }

  async #renderChapterList() {
    const list = this.$('#chapterList');
    const lang = i18n.current;
    const rows = [];
    for (const num of this._chapters) {
      const state = await chapterManager.getLangState(this._novelId, num, lang);
      const isFinished = state.status === ChapterLangStatus.FINISHED;
      const icon = isFinished ? ' <span class="read-icon" title="Finalizado · click para leer">📖</span>' : '';
      rows.push(`
        <li>
          <button data-num="${num}" aria-current="${num === this._selectedChapter}" class="${isFinished ? 'is-finished' : ''}">
            <span class="num">Cap. ${num}${icon}</span>
            <span class="chstatus">${i18n.t(`status.chapter.${state.status}`)}</span>
          </button>
        </li>`);
    }
    list.innerHTML = rows.join('');
    list.querySelectorAll('button').forEach((btn) =>
      btn.addEventListener('click', async () => {
        const num = btn.dataset.num;
        this._selectedChapter = num;
        this.$('h2').textContent = i18n.t('novel.chapterTitle', num, lang);
        list.querySelectorAll('button').forEach((b) => b.setAttribute('aria-current', String(b === btn)));
        const state = await chapterManager.getLangState(this._novelId, num, lang);
        if (state.status === ChapterLangStatus.FINISHED) {
          this.#openReader({ novelName: this._novelId, chapterNum: num, targetLang: lang });
        } else {
          await this.#loadWorkflow();
        }
      })
    );
  }

  async #loadWorkflow() {
    const meta = this.$('#chapterMeta');
    const lang = i18n.current;
    const state = await chapterManager.getLangState(this._novelId, this._selectedChapter, lang);
    if (state?.lastUpdated) {
      meta.textContent = i18n.t('workflow.lastUpdated', state.lastUpdated);
    } else {
      meta.textContent = '';
    }
    await this.$('#workflow').load({
      novelName: this._novelId,
      chapterNum: this._selectedChapter,
      sourceLang: this._meta.sourceLang,
      targetLang: lang,
    });
  }

  async #onChapterFinished({ novelName, chapterNum, targetLang }) {
    if (novelName !== this._novelId || targetLang !== i18n.current) return;

    const lang = i18n.current;
    const langStates = new Map();
    for (const num of this._chapters) {
      langStates.set(num, await chapterManager.getLangState(novelName, num, lang));
    }
    const sorted = [...this._chapters].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    );
    const currentIdx = sorted.indexOf(chapterNum);
    let nextChapter = null;
    for (let i = currentIdx + 1; i < sorted.length; i++) {
      const s = langStates.get(sorted[i]);
      if (s?.status !== ChapterLangStatus.FINISHED) {
        nextChapter = sorted[i];
        break;
      }
    }
    await this.#renderChapterList();
    if (nextChapter) {
      this._selectedChapter = nextChapter;
      this.$('h2').textContent = i18n.t('novel.chapterTitle', nextChapter, lang);
      const list = this.$('#chapterList');
      list.querySelectorAll('button').forEach((b) =>
        b.setAttribute('aria-current', String(b.dataset.num === nextChapter))
      );
      await this.#loadWorkflow();
    }
  }

  async #openReader({ novelName, chapterNum, targetLang }) {
    if (!this._readerOverlay) {
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed; inset: 0; z-index: 100;
        background: var(--ln-bg);
        display: flex; flex-direction: column;
      `;
      const toolbar = document.createElement('div');
      toolbar.style.cssText = `
        display:flex; align-items:center; gap: 12px;
        padding: var(--ln-space-2) var(--ln-space-4);
        background: var(--ln-bg-elevated); border-bottom: 1px solid var(--ln-border);
      `;
      const closeBtn = document.createElement('button');
      closeBtn.textContent = i18n.t('reader.back');
      closeBtn.style.cssText = `
        background: transparent; border: 1px solid var(--ln-border); color: var(--ln-text);
        border-radius: 6px; padding: 6px 12px; font-size: 13px;
      `;
      toolbar.appendChild(closeBtn);

      const reader = document.createElement('ln-reader');
      reader.style.flex = '1';
      reader.style.minHeight = '0';

      overlay.appendChild(toolbar);
      overlay.appendChild(reader);
      this.shadowRoot.appendChild(overlay);
      this._readerOverlay = overlay;
      this._readerEl = reader;
      this._readerClose = closeBtn;
    }
    this._readerOverlay.style.display = 'flex';
    let currentReaderChapter = chapterNum;
    await this.#loadReaderChapter(novelName, currentReaderChapter, targetLang);
    this._readerClose.onclick = () => {
      this._readerOverlay.style.display = 'none';
      this.#loadWorkflow();
    };
    this._readerEl.addEventListener('navigate-chapter', async (e) => {
      const sorted = [...this._chapters].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true })
      );
      const idx = sorted.indexOf(currentReaderChapter);
      const target = sorted[idx + e.detail.dir];
      if (target) {
        currentReaderChapter = target;
        await this.#loadReaderChapter(novelName, target, targetLang);
      }
    });
  }

  async #loadReaderChapter(novelName, chapterNum, targetLang) {
    await this._readerEl.load({ novelName, chapterNum, langcode: targetLang });
  }

  disconnectedCallback() {
    this._offLang?.();
  }
}

customElements.define('novel-view', NovelView);