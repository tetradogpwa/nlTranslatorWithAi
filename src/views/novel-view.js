// src/views/novel-view.js
import { BaseElement } from '../components/base-element.js';
import '../components/ln-chapter-workflow.js';
import { projectManager } from '../core/projectManager.js';
import { chapterManager } from '../core/chapterManager.js';
import { ChapterLangStatusLabel } from '../core/states.js';

export class NovelView extends BaseElement {
  async open(novelId) {
    this._novelId = novelId;
    this._meta = await projectManager.getNovelMeta(novelId);
    this._chapters = await projectManager.getChapterNumbers(novelId);
    this._selectedLang = this._meta.targetLangs?.[0];
    this._selectedChapter = this._chapters[0];
    await this.render2();
  }

  styles() {
    return `
      :host { display:block; height:100%; }
      .layout { display:grid; grid-template-columns: 240px 1fr; height:100%; }
      aside { border-right:1px solid var(--ln-border); overflow-y:auto; padding: var(--ln-space-3); }
      .back { background:none; border:none; color: var(--ln-text-muted); cursor:pointer; margin-bottom: var(--ln-space-3); font-size:13px; }
      .lang-tabs { display:flex; gap:4px; margin-bottom: var(--ln-space-3); flex-wrap:wrap; }
      .lang-tabs button { flex:1; font-size:12px; padding:6px; border-radius:6px; border:1px solid var(--ln-border); background:transparent; color:var(--ln-text); }
      .lang-tabs button[aria-selected="true"] { background: var(--ln-accent); border-color: var(--ln-accent); color:#fff; }
      ul { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:4px; }
      li button { width:100%; text-align:left; background: var(--ln-bg-card); border:1px solid var(--ln-border); color:var(--ln-text); border-radius:6px; padding:8px 10px; font-size:13px; display:flex; justify-content:space-between; }
      li button[aria-current="true"] { border-color: var(--ln-accent); }
      .chstatus { font-size:10px; color: var(--ln-text-muted); }
      section { padding: var(--ln-space-5); overflow-y:auto; }
      h2 { margin-top:0; }
    `;
  }

  template() {
    const langs = this._meta?.targetLangs ?? [];
    return `
      <div class="layout">
        <aside>
          <button class="back" id="backBtn">← Novelas</button>
          <h3>${this._meta?.nameEs || this._novelId}</h3>
          <div class="lang-tabs">
            ${langs.map((l) => `<button data-lang="${l}" aria-selected="${l === this._selectedLang}">${l}</button>`).join('')}
          </div>
          <ul id="chapterList"></ul>
        </aside>
        <section>
          <h2>Capítulo ${this._selectedChapter} · ${this._selectedLang}</h2>
          <ln-chapter-workflow id="workflow"></ln-chapter-workflow>
        </section>
      </div>
    `;
  }

  async render2() {
    this.render();
    this.$('#backBtn').addEventListener('click', () => this.emit('back-to-dashboard'));
    this.$all('.lang-tabs button').forEach((btn) =>
      btn.addEventListener('click', async () => {
        this._selectedLang = btn.dataset.lang;
        await this.render2();
      })
    );
    await this.#renderChapterList();
    await this.#loadWorkflow();
  }

  async #renderChapterList() {
    const list = this.$('#chapterList');
    const rows = [];
    for (const num of this._chapters) {
      const state = await chapterManager.getLangState(this._novelId, num, this._selectedLang);
      rows.push(`
        <li>
          <button data-num="${num}" aria-current="${num === this._selectedChapter}">
            <span>${num}</span>
            <span class="chstatus">${ChapterLangStatusLabel[state.status]}</span>
          </button>
        </li>`);
    }
    list.innerHTML = rows.join('');
    list.querySelectorAll('button').forEach((btn) =>
      btn.addEventListener('click', async () => {
        this._selectedChapter = btn.dataset.num;
        this.$('h2').textContent = `Capítulo ${this._selectedChapter} · ${this._selectedLang}`;
        list.querySelectorAll('button').forEach((b) => b.setAttribute('aria-current', String(b === btn)));
        await this.#loadWorkflow();
      })
    );
  }

  async #loadWorkflow() {
    await this.$('#workflow').load({
      novelName: this._novelId,
      chapterNum: this._selectedChapter,
      sourceLang: this._meta.sourceLang,
      targetLang: this._selectedLang,
    });
  }
}

customElements.define('novel-view', NovelView);
