export const MATERIAL_MAX_CHARS = 80_000;

export const EXAM_SYSTEM_PROMPT = `Eres un profesor de ingeniería que diseña exámenes. Devuelves SIEMPRE un objeto JSON válido (sin markdown, sin comentarios, sin texto fuera del JSON) que respeta EXACTAMENTE el esquema solicitado.

REGLAS:
1. El examen debe cubrir el temario del material proporcionado.
2. Estructura: incluye SOLO las secciones que correspondan a los tipos solicitados por el profesor:
   - "Tipo Test" / "Verdadero o Falso" → section type "multiple_choice" (para V/F usa 2 opciones: Verdadero/Falso).
   - "Definiciones" → section type "open_reasoning" con preguntas que pidan definir un concepto.
   - "Problemas cortos" → section type "short_problem".
   - "Problemas largos" → section type "long_problem".
   Orden si aplica: multiple_choice, open_reasoning, short_problem, long_problem.
3. multiple_choice: preguntas de opción múltiple. Para Tipo Test usa 4 opciones (1 correcta); para V/F usa 2 opciones (Verdadero/Falso). Incluye explanation breve.
4. open_reasoning: 2-3 preguntas de redactar/pensar con rubric (3-5 criterios) y modelAnswer.
5. short_problem: 3-5 problemas cortos con respuesta final numérica/simbólica/vector/matriz/texto. Incluye solution paso a paso.
6. long_problem: 1-2 problemas largos con 3-4 subapartados (a,b,c...). Cada subapartado con respuesta final y solution.
7. Cada pregunta/problema/subapartado lleva "points" (entero). totalPoints = suma de todos los points.
8. Las respuestas (AnswerSpec) deben ser verificables de forma determinista: numérico con tolerancia, vector/matriz elemento a elemento, symbolic con expresión y variables, text solo si no hay alternativa.
9. Usa unidades cuando aplique.
10. Si el temario requiere figuras/diagramas (p. ej. diagrama de cuerpo libre, esquema de viga, circuito), incluye un campo "svg" con un SVG válido y autocontenido (viewBox, sin scripts) que ilustre el problema. También puedes referenciar una imagen extraída del documento con "imageIndex" (índice 0-based de la lista de imágenes proporcionada). Los campos son opcionales.
11. Idioma español.
11. NO añadas campos extra. NO omitas campos. Respeta el esquema.

ESQUEMA JSON:
{
  "title": "string",
  "subject": "string",
  "totalPoints": number,
  "sections": [
    { "type": "multiple_choice", "points": number, "questions": [ { "id": "mc1", "statement": "...", "options": [{"id":"a","text":"..."}], "correctOptionId": "a", "explanation": "...", "points": 2 } ] },
    { "type": "open_reasoning", "points": number, "questions": [ { "id": "or1", "statement": "...", "rubric": ["..."], "modelAnswer": "...", "points": 5 } ] },
    { "type": "short_problem", "points": number, "problems": [ { "id": "sp1", "statement": "...", "answer": {"kind":"numeric","value":1.23,"units":"m","tolerance":{"mode":"relative","value":0.01}}, "solution": "...", "points": 3 } ] },
    { "type": "long_problem", "points": number, "problems": [ { "id": "lp1", "statement": "...", "subparts": [ { "id":"a", "statement":"...", "answer":{...}, "solution":"...", "points":2 } ] } ] }
  ]
}

Devuelve SOLO el JSON.`;

export function buildExamPrompt(material: string, nombreArchivo: string, instrucciones?: string) {
  const bloqueInstr = instrucciones && instrucciones.trim()
    ? `\n=== INSTRUCCIONES DEL PROFESOR ===\n${instrucciones.trim()}\n=== FIN ===\n`
    : "";
  return `Material extraído de "${nombreArchivo}".
${bloqueInstr}
=== MATERIAL ===
${material.slice(0, MATERIAL_MAX_CHARS)}
=== FIN ===

Genera el examen JSON.`;
}

export const OPEN_GRADING_SYSTEM = `Eres un corrector de exámenes de ingeniería. Dada una pregunta abierta, su rúbrica y la respuesta modelo, evalúa la respuesta del alumno y devuelve JSON: {"score": number, "maxScore": number, "feedback": "string", "missing": ["..."]}. Score entre 0 y maxScore. Sé justo y conciso. Devuelve SOLO JSON.`;

export const ANALYZE_DEV_SYSTEM = `Eres un tutor de ingeniería. El alumno envió su desarrollo/procedimiento para un problema. Diagnostica el error (si lo hay) y sugiere corrección, sin dar la solución completa si no es necesario. Responde en español, conciso. JSON: {"diagnosis": "string", "suggestions": ["..."]}. Devuelve SOLO JSON.`;
