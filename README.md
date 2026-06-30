# LN Translator Manager (PWA)

Gestor local de proyectos de traducción de novelas ligeras asistida por IA mediante copiar/pegar de prompts. **No traduce nada por sí misma ni llama a ninguna API**: solo organiza el flujo de trabajo y los archivos.

## Cómo ejecutarlo

Requiere un navegador con **File System Access API** (Chrome o Edge de escritorio). No hay build step: es JS plano con Web Components nativos.

```bash
# cualquier servidor estático sirve, por ejemplo:
npx serve .
# o
python3 -m http.server 8080
```

Abre `http://localhost:PUERTO`, elige una carpeta vacía (o ya existente con `Source/`) y empieza a colocar tus novelas dentro de `Source/<Nombre novela>/001 - Capítulo.txt`.

## Arquitectura

```
src/
  core/            lógica pura, sin DOM (fsManager, projectManager,
                   chapterManager, glossaryManager, promptBuilder,
                   states, readerSettings)
  components/      web components reutilizables (ln-novel-card,
                   ln-prompt-panel, ln-chapter-workflow, ln-reader…)
  views/           pantallas compuestas a partir de los componentes
                   (dashboard-view, novel-view)
  styles/          tokens de diseño y estilos base compartidos
service-worker.js  cache del shell para uso offline
```

Cada web component extiende `BaseElement` (shadow DOM + render manual,
sin frameworks) y se comunica con sus padres mediante `CustomEvent`,
nunca llamando directamente a otros componentes.

Toda la persistencia pasa exclusivamente por `fsManager.js`: el resto
del código nunca toca `FileSystemHandle` directamente. La única excepción
es una entrada mínima en IndexedDB que guarda el *handle* de la carpeta
raíz entre sesiones (el navegador no permite serializarlo de otra forma);
ningún dato del proyecto se almacena ahí.

## Implementado en esta primera entrega

- Selección y recuerdo de carpeta de proyecto (File System Access API).
- Detección automática de novelas y capítulos nuevos en `Source/`.
- Estructura `Library/<novela>/{metadata.json, glossary/, chapters/}` autogenerada.
- Asistente de ficha de novela nueva (nombre, banner, idioma original,
  idiomas destino, "¿tienes todos los capítulos?").
- Glosario general por novela, indexado por langcode, con estado
  Pendiente/Aprobado por idioma.
- Guía de estilo editable por novela (Markdown).
- Flujo completo de 4 pasos por capítulo + idioma: extracción de
  glosario → revisión/aprobación de términos → traducción → revisión →
  corrección → finalizado, cada uno con su panel de "copiar prompt /
  pegar respuesta" y validación de JSON.
- Estados independientes por combinación capítulo+idioma.
- Tarjetas de novela con progreso por idioma y estrella al finalizar.
- Lector básico con temas (Claro/Oscuro/OLED/Sepia), restauración de
  posición de lectura y marcadores.
- Service worker para que el shell cargue offline.

## Pendiente para siguientes iteraciones

- Exportación a TXT/PDF/ZIP de imágenes con opciones de maquetación.
- Editor visual de temas personalizados del lector (UI; el modelo de
  datos en `readerSettings.js` ya lo soporta).
- Búsqueda e índice dentro del lector, navegación rápida entre novelas.
- Confirmación explícita de borrado cuando se detectan capítulos/novelas
  eliminados de `Source/` (de momento `projectManager` los detecta pero
  no los borra de `Library/`, a la espera de ese diálogo).
- Validación de esquema más estricta (p. ej. con JSON Schema) para las
  respuestas de glosario/revisión pegadas por el usuario.
- Iconos reales de la PWA en `public/icons/` (192/512 px).

## Por qué estas decisiones técnicas

- **Web Components nativos en vez de un framework**: cumple el
  requisito de modularidad sin añadir dependencias ni build step,
  manteniendo cada pieza (`ln-prompt-panel`, `ln-chapter-workflow`,
  etc.) reutilizable y testeable de forma aislada.
- **Todo en archivos planos**: `metadata.json`, `glossary/*.json`,
  `chapters/*/state.json` y los `.txt` de traducción son editables a
  mano por un usuario avanzado y no usan formatos propietarios.
