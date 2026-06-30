// src/components/ln-prompt-panel.js
import { BaseElement } from './base-element.js';
import { i18n } from '../i18n/strings.js';

export class LnPromptPanel extends BaseElement {
  configure({ title, promptText, responsePlaceholder, validate }) {
    this._title = title;
    this._promptText = promptText;
    this._responsePlaceholder = responsePlaceholder ?? i18n.t('workflow.placeholder');
    this._validate = validate ?? (() => ({ ok: true }));
    this.render();
    this.#bind();
  }

  styles() {
    return `
      .panel { background: var(--ln-bg-card); border:1px solid var(--ln-border); border-radius: var(--ln-radius-md); padding: var(--ln-space-4); display:flex; flex-direction:column; gap: var(--ln-space-3); }
      h3 { margin:0; font-size:14px; color: var(--ln-text-muted); text-transform:uppercase; letter-spacing:.03em; }
      textarea {
        width:100%; min-height:160px; resize: vertical;
        background: var(--ln-bg); color: var(--ln-text); border:1px solid var(--ln-border);
        border-radius: var(--ln-radius-sm); padding: var(--ln-space-3); font-family: ui-monospace, monospace; font-size: 12.5px;
      }
      .actions { display:flex; gap: var(--ln-space-2); align-items:center; }
      button {
        background: var(--ln-accent); color:#fff; border:none; border-radius: var(--ln-radius-sm);
        padding: var(--ln-space-2) var(--ln-space-3); font-size: 13px; font-weight:500;
      }
      button.secondary { background: transparent; border:1px solid var(--ln-border); color: var(--ln-text); }
      .error { color: var(--ln-danger); font-size: 12px; }
      .copied { color: var(--ln-success); font-size: 12px; }
    `;
  }

  template() {
    return `
      <div class="panel">
        <h3>${i18n.t('workflow.stepN', 1, this._title ?? '')}</h3>
        <textarea id="prompt" readonly>${this._promptText ?? ''}</textarea>
        <div class="actions">
          <button id="copy">${i18n.t('workflow.copyPrompt')}</button>
          <span id="copiedMsg" class="copied" hidden>${i18n.t('workflow.copied')}</span>
        </div>
        <h3>${i18n.t('workflow.stepResponse', 2)}</h3>
        <textarea id="response" placeholder="${this._responsePlaceholder}"></textarea>
        <div class="actions">
          <button id="accept" class="secondary">${i18n.t('workflow.validateImport')}</button>
        </div>
        <div id="error" class="error" hidden></div>
      </div>
    `;
  }

  #bind() {
    this.$('#copy').addEventListener('click', async () => {
      await navigator.clipboard.writeText(this._promptText ?? '');
      const msg = this.$('#copiedMsg');
      msg.hidden = false;
      setTimeout(() => (msg.hidden = true), 1500);
    });
    this.$('#accept').addEventListener('click', () => {
      const text = this.$('#response').value;
      const result = this._validate(text);
      const errorEl = this.$('#error');
      if (!result.ok) {
        errorEl.textContent = result.error ?? 'Respuesta no válida.';
        errorEl.hidden = false;
        return;
      }
      errorEl.hidden = true;
      this.emit('response-accepted', result.value ?? text);
    });
  }
}

customElements.define('ln-prompt-panel', LnPromptPanel);