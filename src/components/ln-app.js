// src/components/ln-app.js
import { BaseElement } from './base-element.js';
import { fsManager, FsManager } from '../core/fsManager.js';
import '../views/dashboard-view.js';
import '../views/novel-view.js';
import { i18n } from '../i18n/strings.js';

export class LnApp extends BaseElement {
  styles() {
    return `
      :host { display:block; height:100vh; }
      .gate { height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap: var(--ln-space-4); text-align:center; padding: var(--ln-space-5); }
      .gate h1 { font-size:20px; }
      .gate p { color: var(--ln-text-muted); max-width: 420px; }
      button.primary { background: var(--ln-accent); border:none; color:#fff; border-radius: var(--ln-radius-md); padding: 12px 20px; font-size:14px; font-weight:600; }
      .unsupported { color: var(--ln-danger); }
    `;
  }

  async connectedCallback() {
    this._off = i18n.onChange(async function()  {
      // Al iniciar la aplicación UNA SOLA VEZ
        if (await fsManager.tryRestore()) {
        this.#showDashboard();
    } else {
      this.#renderGate();
    }
    });
    if (!location.protocol.startsWith('http')) {
      this.shadowRoot.innerHTML = `<style>${this.styles()}</style>
        <div class="gate"><h1>${i18n.t('app.gate.openByHttpTitle')}</h1>
        <p class="unsupported">${i18n.t('app.gate.openByHttpBody')}</p>
        <p><code>${i18n.t('app.gate.serverHint')}</code></p></div>`;
      return;
    }
    if (!FsManager.isSupported()) {
      this.shadowRoot.innerHTML = `<style>${this.styles()}</style>
        <div class="gate"><h1>${i18n.t('app.gate.unsupportedTitle')}</h1>
        <p class="unsupported">${i18n.t('app.gate.unsupportedBody')}</p></div>`;
      return;
    }
    const restored = await fsManager.tryRestore();
    if (restored) {
      this.#showDashboard();
    } else {
      this.#renderGate();
    }
  }

  disconnectedCallback() {
    this._off?.();
  }

#renderGate() {
    this.shadowRoot.innerHTML = `
      <style>${this.styles()}</style>
      <div class="gate">
        <h1>${i18n.t('app.gate.gateTitle')}</h1>
        <p>${i18n.t('app.gate.gateBody')}</p>
        <button class="primary" id="pickBtn">
          ${i18n.t('app.gate.pickBtn')}
        </button>
        <p class="unsupported" id="pickError"></p>
      </div>
    `;

    this.$('#pickBtn').addEventListener('click', async () => {
        try {
            await fsManager.pickProjectFolder();
            this.#showDashboard();
        } catch (err) {
            if (err?.name === 'AbortError') return;
            this.$('#pickError').textContent =
                i18n.t('app.gate.pickError', err.message);
        }
    });
}
  #showDashboard() {
    this.shadowRoot.innerHTML = `<style>${this.styles()}</style><dashboard-view></dashboard-view>`;
    this.$('dashboard-view').addEventListener('navigate-to-novel', (e) =>
      this.#showNovel(e.detail.id)
    );
  }

  #showNovel(novelId) {
    this.shadowRoot.innerHTML = `<style>${this.styles()}</style><novel-view></novel-view>`;
    const view = this.$('novel-view');
    view.addEventListener('back-to-dashboard', () => this.#showDashboard());
    view.open(novelId);
  }
}

customElements.define('ln-app', LnApp);