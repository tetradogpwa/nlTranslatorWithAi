// src/components/ln-app.js
import { BaseElement } from './base-element.js';
import { fsManager, FsManager } from '../core/fsManager.js';
import '../views/dashboard-view.js';
import '../views/novel-view.js';

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
    if (!location.protocol.startsWith('http')) {
      this.shadowRoot.innerHTML = `<style>${this.styles()}</style>
        <div class="gate"><h1>Abre la app por http(s)</h1>
        <p class="unsupported">Has abierto el archivo directamente (file://). La File System Access API solo funciona si la carpeta se sirve con un servidor local, por ejemplo:</p>
        <p><code>npx serve .</code> o <code>python3 -m http.server</code>, y luego abre <code>http://localhost:PUERTO</code>.</p></div>`;
      return;
    }
    if (!FsManager.isSupported()) {
      this.shadowRoot.innerHTML = `<style>${this.styles()}</style>
        <div class="gate"><h1>Navegador no compatible</h1>
        <p class="unsupported">Esta aplicación necesita la File System Access API (disponible en Chrome o Edge de escritorio).</p></div>`;
      return;
    }
    const restored = await fsManager.tryRestore();
    if (restored) {
      this.#showDashboard();
    } else {
      this.#showFolderGate();
    }
  }

  #showFolderGate() {
    this.shadowRoot.innerHTML = `<style>${this.styles()}</style>
      <div class="gate">
        <h1>Selecciona la carpeta del proyecto</h1>
        <p>Toda la información (novelas originales, glosarios, traducciones) se guardará como archivos normales dentro de la carpeta que elijas. No se sube nada a Internet.</p>
        <button class="primary" id="pickBtn">Elegir carpeta…</button>
        <p class="unsupported" id="pickError"></p>
      </div>`;
    this.$('#pickBtn').addEventListener('click', async () => {
      try {
        await fsManager.pickProjectFolder();
        this.#showDashboard();
      } catch (err) {
        if (err?.name === 'AbortError') return; // el usuario cerró el diálogo, no es un error
        console.error(err);
        const errorEl = this.$('#pickError');
        if (errorEl) errorEl.textContent = `No se pudo abrir la carpeta: ${err.message}`;
      }
    });
  }

  #showDashboard() {
    this.shadowRoot.innerHTML = `<style>${this.styles()}</style><dashboard-view></dashboard-view>`;
    // Escuchamos 'navigate-to-novel', que solo lo emite dashboard-view
    // explícitamente cuando la novela ya está configurada. Nunca llega
    // el evento crudo de las tarjetas (dashboard lo corta en capture).
    this.$('dashboard-view').addEventListener('navigate-to-novel', (e) => this.#showNovel(e.detail.id));
  }

  #showNovel(novelId) {
    this.shadowRoot.innerHTML = `<style>${this.styles()}</style><novel-view></novel-view>`;
    const view = this.$('novel-view');
    view.addEventListener('back-to-dashboard', () => this.#showDashboard());
    view.open(novelId);
  }
}

customElements.define('ln-app', LnApp);
