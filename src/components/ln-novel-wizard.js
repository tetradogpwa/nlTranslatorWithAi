// src/components/ln-novel-wizard.js
import { BaseElement } from './base-element.js';
import { i18n } from '../i18n/strings.js';

export class LnNovelWizard extends BaseElement {
  open({ meta, detectedChapterCount }) {
    this._meta = { ...meta };
    this._detectedChapterCount = detectedChapterCount;
    this.render();
    this.#bind();
    this.style.display = 'flex';
  }

  close() {
    this.style.display = 'none';
  }

  styles() {
    return `
      :host { display:none; position:fixed; inset:0; background:rgba(0,0,0,.55); align-items:center; justify-content:center; z-index:50; }
      form {
        width: min(520px, 92vw); max-height: 86vh; overflow:auto;
        background: var(--ln-bg-elevated); border:1px solid var(--ln-border); border-radius: var(--ln-radius-lg);
        padding: var(--ln-space-5); display:flex; flex-direction:column; gap: var(--ln-space-3);
      }
      h2 { margin:0 0 var(--ln-space-2); }
      label { font-size:12px; color: var(--ln-text-muted); display:flex; flex-direction:column; gap:4px; }
      input, select { background: var(--ln-bg); border:1px solid var(--ln-border); color: var(--ln-text); border-radius: var(--ln-radius-sm); padding: 8px 10px; font-size:13px; }
      .row { display:flex; gap: var(--ln-space-3); }
      .row > label { flex:1; }
      .actions { display:flex; justify-content:flex-end; gap: var(--ln-space-2); margin-top: var(--ln-space-3); }
      button { border-radius: var(--ln-radius-sm); padding: 8px 14px; font-size: 13px; border:1px solid var(--ln-border); background:transparent; color:var(--ln-text); }
      button.primary { background: var(--ln-accent); border-color: var(--ln-accent); color:#fff; }
      .hint { font-size:12px; color: var(--ln-text-muted); }
      fieldset { border:1px solid var(--ln-border); border-radius: var(--ln-radius-sm); padding: var(--ln-space-3); }
      legend { font-size:12px; color: var(--ln-text-muted); padding:0 4px; }
    `;
  }

  template() {
    const m = this._meta ?? {};
    const t = (k, ...a) => i18n.t(`wizard.${k}`, ...a);
    return `
      <form>
        <h2>${t('title', m.originalName ?? '')}</h2>
        <div class="row">
          <label>${t('nameEs')}
            <input name="nameEs" value="${m.nameEs ?? ''}" />
          </label>
          <label>${t('nameCa')}
            <input name="nameCa" value="${m.nameCa ?? ''}" />
          </label>
        </div>
        <label>${t('banner')}
          <input name="banner" value="${m.banner ?? ''}" placeholder="https://… o ./banner.jpg" />
        </label>
        <label>${t('sourceLang')}
          <input name="sourceLang" value="${m.sourceLang ?? ''}" placeholder="${t('sourceLangPlaceholder')}" required />
        </label>
        <fieldset>
          <legend>${t('targetLangs')}</legend>
          <label>${t('targetLangsPlaceholder')}
            <input name="availableTargetLangs" value="${(m.availableTargetLangs ?? []).join(', ')}" placeholder="es-ES, ca-ES" />
          </label>
          <p class="hint">${t('targetLangsHelp')}</p>
        </fieldset>
        <p class="hint">${t('detected', this._detectedChapterCount)}</p>
        <label>${t('hasAll')}
          <select name="hasAllChapters">
            <option value="true" ${m.hasAllChapters !== false ? 'selected' : ''}>${t('hasAllYes')}</option>
            <option value="false" ${m.hasAllChapters === false ? 'selected' : ''}>${t('hasAllNo')}</option>
          </select>
        </label>
        <label id="knownCountWrap" style="${m.hasAllChapters === false ? '' : 'display:none'}">
          ${t('knownCount')}
          <input name="knownChapterCount" type="number" min="1" value="${m.knownChapterCount ?? ''}" />
        </label>
        <div class="actions">
          <button type="button" id="cancel">${t('cancel')}</button>
          <button type="submit" class="primary">${t('save')}</button>
        </div>
      </form>
    `;
  }

  #bind() {
    const select = this.$('select[name="hasAllChapters"]');
    select.addEventListener('change', () => {
      this.$('#knownCountWrap').style.display = select.value === 'false' ? '' : 'none';
    });
    this.$('#cancel').addEventListener('click', () => {
      this.close();
      this.emit('wizard-cancelled');
    });
    this.$('form').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const raw = fd.get('availableTargetLangs') ?? '';
      const langs = raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      // Garantizamos que el idioma activo de la UI siempre esté disponible.
      if (!langs.includes(i18n.current)) langs.push(i18n.current);

      const updated = {
        ...this._meta,
        nameEs: fd.get('nameEs')?.trim(),
        nameCa: fd.get('nameCa')?.trim(),
        banner: fd.get('banner')?.trim(),
        sourceLang: fd.get('sourceLang')?.trim(),
        availableTargetLangs: langs,
        hasAllChapters: fd.get('hasAllChapters') === 'true',
        knownChapterCount:
          fd.get('hasAllChapters') === 'false' ? Number(fd.get('knownChapterCount')) : null,
        setupPending: false,
      };
      this.emit('wizard-saved', updated);
      this.close();
    });
  }

  // Refresca textos al cambiar de idioma
  connectedCallback() {
    this._off = i18n.onChange(() => {
      if (this._meta) this.render();
    });
  }
  disconnectedCallback() {
    this._off?.();
  }
}

customElements.define('ln-novel-wizard', LnNovelWizard);