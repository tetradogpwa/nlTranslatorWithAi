// src/components/ln-reader.js
import { BaseElement } from './base-element.js';
import { chapterManager } from '../core/chapterManager.js';
import { readerSettings } from '../core/readerSettings.js';
import { i18n } from '../i18n/strings.js';

export class LnReader extends BaseElement {
  async load({ novelName, chapterNum, langcode }) {
    this._ctx = { novelName, chapterNum, langcode };
    this._text =
      (await chapterManager.getTranslation(novelName, chapterNum, langcode)) ??
      i18n.t('reader.noTranslation');
    this._theme = await readerSettings.getActiveTheme();
    const pos = await readerSettings.getLastPosition(novelName);
    this._scrollFraction = pos?.chapterNum === chapterNum ? pos.scrollFraction ?? 0 : 0;
    this.render();
    this.#bind();
  }

  styles() {
    const t = this._theme ?? readerSettings.defaultTheme;
    return `
      :host { display:block; height:100%; }
      .reader {
        height:100%; overflow-y:auto; background:${t.bg}; color:${t.text};
        font-family:${t.font}; font-size:${t.fontSize}px; line-height:${t.lineHeight};
        padding: var(--ln-space-6) max(var(--ln-space-4), calc((100% - ${t.readingWidth}px)/2));
      }
      p { margin: 0 0 ${t.paragraphSpacing}px; white-space: pre-wrap; }
      .toolbar { position:sticky; top:0; display:flex; gap:8px; padding: var(--ln-space-2); background: var(--ln-bg-elevated); border-bottom:1px solid var(--ln-border); z-index: 5; }
      .toolbar button { background:transparent; border:1px solid var(--ln-border); color:var(--ln-text); border-radius:6px; padding:4px 10px; font-size:12px; }
    `;
  }

  template() {
    const paragraphs = (this._text ?? '').split(/\n+/).filter(Boolean);
    return `
      <div class="toolbar">
        <button id="prevChapter">${i18n.t('reader.prev')}</button>
        <button id="nextChapter">${i18n.t('reader.next')}</button>
        <button id="bookmark">${i18n.t('reader.bookmark')}</button>
        <button id="cleanJp" title="${i18n.t('reader.cleanJpTitle')}">${i18n.t('reader.cleanJp')}</button>
      </div>
      <div class="reader" id="readerBody">
        ${paragraphs.map((p) => `<p>${p}</p>`).join('')}
      </div>
    `;
  }

  #bind() {
    const body = this.$('#readerBody');
    requestAnimationFrame(() => {
      body.scrollTop = this._scrollFraction * (body.scrollHeight - body.clientHeight);
    });
    let saveTimer;
    body.addEventListener('scroll', () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        const fraction = body.scrollTop / Math.max(1, body.scrollHeight - body.clientHeight);
        readerSettings.saveLastPosition(this._ctx.novelName, {
          chapterNum: this._ctx.chapterNum,
          langcode: this._ctx.langcode,
          scrollFraction: fraction,
        });
      }, 400);
    });
    this.$('#prevChapter').addEventListener('click', () => this.emit('navigate-chapter', { dir: -1 }));
    this.$('#nextChapter').addEventListener('click', () => this.emit('navigate-chapter', { dir: 1 }));
    const cleanJpBtn = this.$('#cleanJp');
    if (cleanJpBtn) {
      cleanJpBtn.addEventListener('click', () => this.emit('clean-jp', this._ctx));
    }
    this.$('#bookmark').addEventListener('click', () => {
      const body2 = this.$('#readerBody');
      const fraction = body2.scrollTop / Math.max(1, body2.scrollHeight - body2.clientHeight);
      readerSettings.addBookmark(this._ctx.novelName, {
        ...this._ctx,
        scrollFraction: fraction,
        createdAt: Date.now(),
      });
      this.emit('bookmark-added');
    });
  }

  connectedCallback() {
    this._off = i18n.onChange(() => {
      if (this._ctx) this.render();
    });
  }
  disconnectedCallback() {
    this._off?.();
  }
}

customElements.define('ln-reader', LnReader);