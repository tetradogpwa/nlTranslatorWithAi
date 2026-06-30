// src/core/promptBuilder.js
//
// Único lugar donde se compone el texto de los prompts. Mantener esto
// aislado facilita ajustar la redacción sin tocar el resto de la app.

function formatGlossaryBlock(glossaryEntries) {
  if (!glossaryEntries.length) return '(glosario vacío todavía)';
  return glossaryEntries
    .map((e) => `- ${e.term}${e.reading ? ` (${e.reading})` : ''} → "${e.translation}"${e.notes ? ` | notas: ${e.notes}` : ''}`)
    .join('\n');
}

export const promptBuilder = {
  /** Paso 1: extracción de términos nuevos del capítulo. */
  buildGlossaryExtractionPrompt({ sourceLang, targetLang, styleGuide, glossary, chapterText }) {
    return `Eres un asistente de traducción de novelas ligeras. Tu única tarea ahora es EXTRAER terminología relevante del siguiente capítulo, sin traducir el capítulo completo todavía.

Idioma original: ${sourceLang}
Idioma destino: ${targetLang}

## Reglas de estilo de la obra
${styleGuide || '(sin reglas definidas)'}

## Glosario ya aprobado (${targetLang})
${formatGlossaryBlock(glossary)}

## Instrucciones
Lee el capítulo y devuelve EXCLUSIVAMENTE un JSON (array) con los términos nuevos relevantes para la coherencia terminológica: nombres propios, honoríficos, lugares, técnicas/ataques, objetos mágicos, títulos, etc. No incluyas términos ya presentes en el glosario salvo que propongas un cambio. No incluyas texto fuera del JSON.

Formato exacto de cada elemento:
{"term": "texto original", "reading": "lectura si aplica o cadena vacía", "type": "personaje|lugar|tecnica|objeto|titulo|otro", "description": "breve descripción de contexto", "suggestedTranslation": "tu propuesta en ${targetLang}", "notes": "notas opcionales"}

## Capítulo
"""
${chapterText}
"""`;
  },

  /** Paso 2: traducción completa del capítulo con el glosario ya aprobado. */
  buildTranslationPrompt({ sourceLang, targetLang, styleGuide, glossary, chapterText }) {
    return `Eres un traductor profesional de novelas ligeras. Traduce el siguiente capítulo de ${sourceLang} a ${targetLang}, manteniendo el tono narrativo original.

## Reglas de estilo de la obra (de obligado cumplimiento)
${styleGuide || '(sin reglas definidas)'}

## Glosario aprobado — usa EXACTAMENTE estas traducciones para estos términos
${formatGlossaryBlock(glossary)}

## Instrucciones
Devuelve únicamente el texto traducido del capítulo, sin comentarios, notas ni explicaciones adicionales, conservando los saltos de párrafo del original.

## Capítulo original
"""
${chapterText}
"""`;
  },

  /** Paso 3: revisión de la traducción ya realizada. */
  buildReviewPrompt({ sourceLang, targetLang, styleGuide, glossary, originalText, translatedText }) {
    return `Eres un revisor editorial experto en novelas ligeras. Compara el original (${sourceLang}) con la traducción (${targetLang}) y señala problemas de fidelidad, naturalidad, coherencia terminológica o incumplimiento de las reglas de estilo.

## Reglas de estilo de la obra
${styleGuide || '(sin reglas definidas)'}

## Glosario aprobado
${formatGlossaryBlock(glossary)}

## Instrucciones
Devuelve un JSON (array) de observaciones, cada una con:
{"location": "fragmento o párrafo afectado", "issue": "descripción del problema", "suggestion": "corrección propuesta", "severity": "baja|media|alta"}
Si no hay problemas, devuelve un array vacío [].

## Texto original
"""
${originalText}
"""

## Traducción a revisar
"""
${translatedText}
"""`;
  },

  /** Paso 4: prompt de corrección a partir de las observaciones aceptadas. */
  buildCorrectionPrompt({ sourceLang, targetLang, translatedText, acceptedObservations }) {
    const obsBlock = acceptedObservations
      .map((o, i) => `${i + 1}. [${o.severity ?? 'media'}] ${o.issue} → sugerencia: ${o.suggestion}`)
      .join('\n');
    return `Aplica las siguientes correcciones a la traducción (${targetLang}) de este capítulo, devolviendo el texto completo corregido (no solo los fragmentos cambiados), sin comentarios adicionales.

## Correcciones a aplicar
${obsBlock || '(ninguna)'}

## Traducción actual
"""
${translatedText}
"""`;
  },
};
