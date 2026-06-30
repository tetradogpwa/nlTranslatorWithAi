// src/views/novel-view.js
import { BaseElement } from '../components/base-element.js';
import '../components/ln-chapter-workflow.js';
import '../components/ln-reader.js';
import { projectManager } from '../core/projectManager.js';
import { chapterManager } from '../core/chapterManager.js';
import { ChapterLangStatus, ChapterLangStatusLabel, findLastPendingChapter } from '../core/states.js';

export class NovelView extends BaseElement {
  async open(novelId) {
    this._novelId = novelId;
    this._meta = await projectManager.getNovelMeta(novelId);
    this._chapters = await projectManager.getChapterNumbers(novelId);
    this._selectedLang = this._meta.targetLangs?.[0];
    // CAMBIO 3: al abrir, seleccionamos el último capítulo pendiente
    this._selectedChapter = await this.#resolveInitialChapter();
    await this.render2();
  }

  /**
   * Decide qué capítulo mostrar al entrar a la novela.
   * Prioridad:
   *   1. El último capítulo NO finalizado para el idioma seleccionado
   *      (es decir, el "siguiente" que tocaría traducir/revisar).
   *   2. Si todos están finalizados, el último en orden natural
   *      (para que al menos se pueda leer).
   *   3. Si no hay capítulos, el primero disponible.
   */
  async #resolveInitialChapter() {
    if (!this._chapters.length) return null;
    const lang = this._selectedLang;
    const stateByNum = new Map();
    for (const num of this._chapters) {
      const s = await chapterManager.getLangState(this._novelId, num, lang);
      stateByNum.set(num, s);
    }
    return findLastPendingChapter(this._chapters, stateByNum) ?? this._chapters[0];
  }

  styles() {
    return `
      :host { display:block; height:100%; }
      .layout { display:grid; grid-template-columns: 260px 1fr; height:100%; }
      aside { border-right:1px solid var(--ln-border); overflow-y:auto; padding: var(--ln-space-3); }
      .back { background:none; border:none; color: var(--ln-text-muted); cursor:pointer; margin-bottom: var(--ln-space-3); font-size:13px; }
      h3 { margin: 0 0 var(--ln-space-2); font-size: 14px; }
      .lang-tabs { display:flex; gap:4px; margin-bottom: var(--ln-space-3); flex-wrap:wrap; }
      .lang-tabs button { flex:1; font-size:12px; padding:6px; border-radius:6px; border:1px solid var(--ln-border); background:transparent; color:var(--ln-text); }
      .lang-tabs button[aria-selected="true"] { background: var(--ln-accent); border-color: var(--ln-accent); color:#fff; }
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
      h2 { margin-top:0; }
      .chapter-meta { font-size:12px; color: var(--ln-text-muted); margin-top: -8px; margin-bottom: var(--ln-space-4); }
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
          <p class="chapter-meta" id="chapterMeta"></p>
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
        // CAMBIO 3 (variante): al cambiar idioma, también vamos al último pendiente
        this._selectedChapter = await this.#resolveInitialChapter();
        await this.render2();
      })
    );
    // CAMBIO 2: el workflow nos avisa cuando un capítulo llega a FINISHED
    this.$('#workflow').addEventListener('chapter-finished', (e) => this.#onChapterFinished(e.detail));
    // CAMBIO 4: el workflow (o la lista) nos pide abrir el reader
    this.$('#workflow').addEventListener('read-chapter', (e) => this.#openReader(e.detail));
    await this.#renderChapterList();
    await this.#loadWorkflow();
  }

  async #renderChapterList() {
    const list = this.$('#chapterList');
    const rows = [];
    for (const num of this._chapters) {
      const state = await chapterManager.getLangState(this._novelId, num, this._selectedLang);
      const isFinished = state.status === ChapterLangStatus.FINISHED;
      const icon = isFinished ? ' <span class="read-icon" title="Finalizado · click para leer">📖</span>' : '';
      rows.push(`
        <li>
          <button data-num="${num}" aria-current="${num === this._selectedChapter}" class="${isFinished ? 'is-finished' : ''}">
            <span class="num">Cap. ${num}${icon}</span>
            <span class="chstatus">${ChapterLangStatusLabel[state.status]}</span>
          </button>
        </li>`);
    }
    list.innerHTML = rows.join('');
    list.querySelectorAll('button').forEach((btn) =>
      btn.addEventListener('click', async () => {
        const num = btn.dataset.num;
        this._selectedChapter = num;
        this.$('h2').textContent = `Capítulo ${num} · ${this._selectedLang}`;
        list.querySelectorAll('button').forEach((b) => b.setAttribute('aria-current', String(b === btn)));
        // Si el capítulo está finalizado y el usuario hace click en la lista,
        // abrimos directamente el reader (atajo)
        const state = await chapterManager.getLangState(this._novelId, num, this._selectedLang);
        if (state.status === ChapterLangStatus.FINISHED) {
          this.#openReader({ novelName: this._novelId, chapterNum: num, targetLang: this._selectedLang });
        } else {
          await this.#loadWorkflow();
        }
      })
    );
  }

  async #loadWorkflow() {
    const meta = this.$('#chapterMeta');
    const state = await chapterManager.getLangState(this._novelId, this._selectedChapter, this._selectedLang);
    if (state?.lastUpdated) {
      meta.textContent = `Última actualización: ${new Date(state.lastUpdated).toLocaleString()}`;
    } else {
      meta.textContent = '';
    }
    await this.$('#workflow').load({
      novelName: this._novelId,
      chapterNum: this._selectedChapter,
      sourceLang: this._meta.sourceLang,
      targetLang: this._selectedLang,
    });
  }

  /**
   * Manejador del CAMBIO 2: cuando un capítulo se finaliza, miramos si hay
   * otro capítulo pendiente en este mismo idioma. Si lo hay, saltamos a él.
   * Si no, nos quedamos donde estamos (el banner "Leer" sigue visible).
   */
  async #onChapterFinished({ novelName, chapterNum, targetLang }) {
    if (novelName !== this._novelId || targetLang !== this._selectedLang) return;

    // Buscamos el siguiente capítulo no finalizado
    const langStates = new Map();
    for (const num of this._chapters) {
      langStates.set(num, await chapterManager.getLangState(novelName, num, targetLang));
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

    // Refrescamos la lista para que el estado visual del capítulo recién
    // finalizado se actualice
    await this.#renderChapterList();

    if (nextChapter) {
      this._selectedChapter = nextChapter;
      this.$('h2').textContent = `Capítulo ${nextChapter} · ${this._selectedLang}`;
      const list = this.$('#chapterList');
      list.querySelectorAll('button').forEach((b) =>
        b.setAttribute('aria-current', String(b.dataset.num === nextChapter))
      );
      await this.#loadWorkflow();
    }
    // Si no hay siguiente pendiente, dejamos al usuario en el banner verde
    // con el botón "Leer" para que pueda leer el capítulo recién acabado.
  }

  /**
   * Manejador del CAMBIO 4: muestra el lector a pantalla completa sobre
   * la vista de la novela. Al cerrarlo, vuelve al workflow del capítulo.
   */
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
      closeBtn.textContent = '← Volver';
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
      this._readerToolbar = toolbar;
      this._readerClose = closeBtn;
    }
    this._readerOverlay.style.display = 'flex';
    let currentReaderChapter = chapterNum;
    await this.#loadReaderChapter(novelName, currentReaderChapter, targetLang);
    this._readerClose.onclick = () => {
      this._readerOverlay.style.display = 'none';
      // Refrescamos el workflow por si quedó en estado FINISHED (botón "Leer")
      this.#loadWorkflow();
    };
    // Listener de navegación dentro del reader (botones ←/→)
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
}

customElements.define('novel-view', NovelView);