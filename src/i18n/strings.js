// src/i18n/strings.js
//
// Sistema de i18n simple y escalable:
// - Cada "namespace" (ui, novel, dashboard...) tiene un objeto por idioma.
// - Para añadir un idioma nuevo: añade su clave aquí y en AVAILABLE_UI_LANGS.
// - Fuera de aquí, nadie escribe strings hardcodeados: siempre t('clave').

// Bandera oficial catalana (la Senyera): 9 franjas horizontales (5 grogues, 4 vermelles).
// Se inserta como SVG en vez de emoji porque no existe un emoji unicode para la Senyera.
const CATALAN_FLAG_SVG = `<svg viewBox="0 0 30 20" width="20" height="14" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle;border-radius:2px;overflow:hidden;flex-shrink:0;"><rect width="30" height="20" fill="#FCDD09"/><rect y="2.222" width="30" height="2.222" fill="#DA121A"/><rect y="6.667" width="30" height="2.222" fill="#DA121A"/><rect y="11.111" width="30" height="2.222" fill="#DA121A"/><rect y="15.556" width="30" height="2.222" fill="#DA121A"/></svg>`;

export const AVAILABLE_UI_LANGS = [
  { code: 'es-ES', flag: '🇪🇸', label: 'Español' },
  { code: 'ca-ES', flag: CATALAN_FLAG_SVG, label: 'Català' },
  // Añadir más aquí cuando haga falta:
  // { code: 'en-US', flag: '🇬🇧', label: 'English' },
];

const STRINGS = {
  // ──────────────── ESPAÑOL ────────────────
  'es-ES': {
    app: {
      title: 'LN Translator Manager',
      gate: {
        openByHttpTitle: 'Abre la app por http(s)',
        openByHttpBody: 'Has abierto el archivo directamente (file://). La File System Access API solo funciona si la carpeta se sirve con un servidor local, por ejemplo:',
        serverHint: 'npx serve . o python3 -m http.server, y luego abre http://localhost:PUERTO.',
        unsupportedTitle: 'Navegador no compatible',
        unsupportedBody: 'Esta aplicación necesita la File System Access API (disponible en Chrome o Edge de escritorio).',
        gateTitle: 'Selecciona la carpeta del proyecto',
        gateBody: 'Toda la información (novelas originales, glosarios, traducciones) se guardará como archivos normales dentro de la carpeta que elijas. No se sube nada a Internet.',
        pickBtn: 'Elegir carpeta…',
        pickError: (msg) => `No se pudo abrir la carpeta: ${msg}`,
      },
    },
    ui: {
      back: '← Novelas',
      sync: '↻ Sincronizar',
      chapters: (n) => `${n} capítulos`,
      pending: 'Pendiente',
      setup: 'Configuración pendiente',
      loading: 'Cargando…',
    },
    dashboard: {
      title: 'Tus novelas',
      empty: 'No se han detectado novelas todavía. Añade carpetas con capítulos .txt dentro de Source/.',
      pendingBanner: (n) => `${n} novela(s) pendiente(s) de configurar — haz clic en su tarjeta para completar la ficha.`,
    },
    novel: {
      chapterTitle: (num, lang) => `Capítulo ${num} · ${lang}`,
      addLangTitle: 'Añadir idioma a esta serie',
      addLangBody: (lang) => `Esta serie aún no tiene "${lang}" como idioma disponible. ¿Quieres añadirlo ahora?`,
      addLangYes: `Sí, añadir`,
      addLangNo: 'Cancelar',
      langAdded: (lang) => `Idioma "${lang}" añadido. Ya puedes traducir esta serie.`,
      addTitleTitle: 'Añade el título de la serie',
      addTitleBody: (lang) => `Esta serie todavía no tiene título en "${lang}". Indícalo para continuar.`,
      addTitlePlaceholder: 'Título de la novela',
      addTitleSave: 'Guardar',
      addTitleCancel: 'Cancelar',
      addTitleError: 'El título no puede estar vacío.',
    },
    wizard: {
      title: (name) => `Nueva novela detectada: ${name}`,
      nameEs: 'Nombre en español',
      nameCa: 'Nombre en catalán (opcional)',
      banner: 'Banner horizontal (URL o ruta relativa)',
      sourceLang: 'Idioma original (langcode)',
      sourceLangPlaceholder: 'ja-JP',
      targetLangs: 'Idiomas destino disponibles (opcional)',
      targetLangsHelp: 'Lista separada por comas. Puedes dejarlo vacío y añadirlos más tarde desde la propia serie.',
      targetLangsPlaceholder: 'es-ES, ca-ES',
      hasAll: '¿Dispones de todos los capítulos?',
      hasAllYes: 'Sí',
      hasAllNo: 'No',
      knownCount: '¿Hasta qué capítulo dispones actualmente?',
      detected: (n) => `Capítulos detectados en Source/: ${n}`,
      cancel: 'Cancelar',
      save: 'Guardar',
    },
    workflow: {
      steps: {
        extract: 'Extracción de glosario',
        review: 'Revisión de glosario',
        translate: 'Traducción del capítulo',
        reviewTrans: 'Revisión',
        correct: 'Corrección',
      },
      continueTranslate: 'Continuar a traducción →',
      finishedBanner: (lang) => `Capítulo finalizado en ${lang}`,
      readBtn: 'Leer capítulo',
      approve: 'Aprobar',
      approved: 'Aprobado ✓',
      finishNow: 'Marcar como finalizado',
      noObservations: 'No se reportaron observaciones.',
      applyCorrections: 'Generar prompt de corrección con seleccionadas →',
      placeholder: 'Pega aquí la respuesta de la IA…',
      placeholderJson: 'Pega aquí el JSON de observaciones (o [] si no hay problemas)…',
      copyPrompt: 'Copiar prompt',
      validateImport: 'Validar e importar',
      copied: 'Copiado ✓',
      stepN: (n, title) => `${title} — ${n}. Copia el prompt`,
      stepResponse: (n) => `${n}. Pega la respuesta`,
      errEmpty: 'Texto vacío.',
      errEmptyTrans: 'La traducción está vacía.',
      errJson: (m) => `JSON inválido: ${m}`,
      errArray: 'Se esperaba un array.',
      errTermField: 'Cada término debe tener la propiedad "term".',
      approveHelp: 'Revisa y aprueba los términos nuevos antes de continuar:',
      term: 'Término',
      reading: 'Lectura',
      translation: 'Traducción',
      lastUpdated: (iso) => `Última actualización: ${new Date(iso).toLocaleString()}`,
    },
    reader: {
      back: '← Volver',
      prev: '← Capítulo anterior',
      next: 'Capítulo siguiente →',
      bookmark: 'Añadir marcador',
      noTranslation: '(sin traducción todavía)',
    },
    status: {
      novel: {
        NEW: 'Nueva',
        PENDING_SETUP: 'Configuración pendiente',
        TRANSLATING: 'En traducción',
        REVIEWING: 'En revisión',
        FINISHED: 'Finalizada',
      },
      chapter: {
        PENDING: 'Pendiente',
        GLOSSARY_GENERATED: 'Glosario generado',
        GLOSSARY_APPROVED: 'Glosario aprobado',
        TRANSLATED: 'Traducción realizada',
        IN_REVIEW: 'En revisión',
        FINISHED: 'Finalizado',
      },
    },
  },

  // ──────────────── CATALÀ ────────────────
  'ca-ES': {
    app: {
      title: 'LN Translator Manager',
      gate: {
        openByHttpTitle: "Obre l'aplicació per http(s)",
        openByHttpBody: "Has obert el fitxer directament (file://). La File System Access API només funciona si la carpeta es serveix amb un servidor local, per exemple:",
        serverHint: 'npx serve . o python3 -m http.server, i després obre http://localhost:PORT.',
        unsupportedTitle: 'Navegador no compatible',
        unsupportedBody: 'Aquesta aplicació necessita la File System Access API (disponible a Chrome o Edge d\'escriptori).',
        gateTitle: 'Selecciona la carpeta del projecte',
        gateBody: "Tota la informació (novel·les originals, glosaris, traduccions) es desarà com a fitxers normals dins la carpeta que triïs. No es puja res a Internet.",
        pickBtn: 'Triar carpeta…',
        pickError: (msg) => `No s'ha pogut obrir la carpeta: ${msg}`,
      },
    },
    ui: {
      back: '← Novel·les',
      sync: '↻ Sincronitzar',
      chapters: (n) => `${n} capítols`,
      pending: 'Pendent',
      setup: 'Configuració pendent',
      loading: 'Carregant…',
    },
    dashboard: {
      title: 'Les teves novel·les',
      empty: 'Encara no s\'han detectat novel·les. Afegeix carpetes amb capítols .txt dins de Source/.',
      pendingBanner: (n) => `${n} novel·la(es) pendent(s) de configurar — fes clic a la targeta per completar la fitxa.`,
    },
    novel: {
      chapterTitle: (num, lang) => `Capítol ${num} · ${lang}`,
      addLangTitle: 'Afegeix idioma a aquesta sèrie',
      addLangBody: (lang) => `Aquesta sèrie encara no té "${lang}" com a idioma disponible. Vols afegir-lo ara?`,
      addLangYes: 'Sí, afegir',
      addLangNo: 'Cancel·lar',
      langAdded: (lang) => `Idioma "${lang}" afegit. Ja pots traduir aquesta sèrie.`,
      addTitleTitle: 'Afegeix el títol de la sèrie',
      addTitleBody: (lang) => `Aquesta sèrie encara no té títol en "${lang}". Indica'l per continuar.`,
      addTitlePlaceholder: 'Títol de la novel·la',
      addTitleSave: 'Desar',
      addTitleCancel: 'Cancel·lar',
      addTitleError: 'El títol no pot estar buit.',
    },
    wizard: {
      title: (name) => `Nova novel·la detectada: ${name}`,
      nameEs: 'Nom en espanyol',
      nameCa: 'Nom en català (opcional)',
      banner: 'Banner horitzontal (URL o ruta relativa)',
      sourceLang: 'Idioma original (langcode)',
      sourceLangPlaceholder: 'ja-JP',
      targetLangs: 'Idiomes destí disponibles (opcional)',
      targetLangsHelp: 'Llista separada per comes. Pots deixar-ho buit i afegir-los més tard des de la pròpia sèrie.',
      targetLangsPlaceholder: 'es-ES, ca-ES',
      hasAll: 'Tens tots els capítols?',
      hasAllYes: 'Sí',
      hasAllNo: 'No',
      knownCount: "Fins a quin capítol tens actualment?",
      detected: (n) => `Capítols detectats a Source/: ${n}`,
      cancel: 'Cancel·lar',
      save: 'Desar',
    },
    workflow: {
      steps: {
        extract: 'Extracció de glossari',
        review: 'Revisió de glossari',
        translate: 'Traducció del capítol',
        reviewTrans: 'Revisió',
        correct: 'Correcció',
      },
      continueTranslate: 'Continua a traducció →',
      finishedBanner: (lang) => `Capítol finalitzat en ${lang}`,
      readBtn: 'Llegir capítol',
      approve: 'Aprovar',
      approved: 'Aprovat ✓',
      finishNow: 'Marca com a finalitzat',
      noObservations: 'No s\'han reportat observacions.',
      applyCorrections: 'Genera prompt de correcció amb seleccionades →',
      placeholder: 'Enganxa aquí la resposta de la IA…',
      placeholderJson: 'Enganxa aquí el JSON d\'observacions (o [] si no hi ha problemes)…',
      copyPrompt: 'Copia el prompt',
      validateImport: 'Validar i importar',
      copied: 'Copiat ✓',
      stepN: (n, title) => `${title} — ${n}. Copia el prompt`,
      stepResponse: (n) => `${n}. Enganxa la resposta`,
      errEmpty: 'Text buit.',
      errEmptyTrans: 'La traducció està buida.',
      errJson: (m) => `JSON invàlid: ${m}`,
      errArray: "S'esperava un array.",
      errTermField: 'Cada terme ha de tenir la propietat "term".',
      approveHelp: 'Revisa i aprova els termes nous abans de continuar:',
      term: 'Terme',
      reading: 'Lectura',
      translation: 'Traducció',
      lastUpdated: (iso) => `Última actualització: ${new Date(iso).toLocaleString()}`,
    },
    reader: {
      back: '← Tornar',
      prev: '← Capítol anterior',
      next: 'Capítol següent →',
      bookmark: 'Afegeix marcador',
      noTranslation: '(sense traducció encara)',
    },
    status: {
      novel: {
        NEW: 'Nova',
        PENDING_SETUP: 'Configuració pendent',
        TRANSLATING: 'En traducció',
        REVIEWING: 'En revisió',
        FINISHED: 'Finalitzada',
      },
      chapter: {
        PENDING: 'Pendent',
        GLOSSARY_GENERATED: 'Glossari generat',
        GLOSSARY_APPROVED: 'Glossari aprovat',
        TRANSLATED: 'Traducció realitzada',
        IN_REVIEW: 'En revisió',
        FINISHED: 'Finalitzat',
      },
    },
  },
};

/** Estado global del idioma activo. Cualquier componente puede leerlo / cambiarlo. */
class I18n {
  #current = localStorage.getItem('ln.lang') ?? 'es-ES';
  #listeners = new Set();

  get current() {
    return this.#current;
  }

  get available() {
    return AVAILABLE_UI_LANGS;
  }

  set(code) {
    if (this.#current === code) return;
    if (!STRINGS[code]) return;
    this.#current = code;
    localStorage.setItem('ln.lang', code);
    for (const fn of this.#listeners) fn(code);
  }

  onChange(fn) {
    this.#listeners.add(fn);
    return () => this.#listeners.delete(fn);
  }

  /** t('ui.back') o t('ui.chapters', 12). Devuelve la clave si no existe. */
  t(path, ...args) {
    const parts = path.split('.');
    let node = STRINGS[this.#current];
    for (const p of parts) {
      if (node == null) return path;
      node = node[p];
    }
    if (typeof node === 'function') return node(...args);
    return node ?? path;
  }
}

export const i18n = new I18n();
