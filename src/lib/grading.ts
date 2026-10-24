import type { Exam, GradeResult, GradeItem } from "./types";
import { compareAnswer } from "./compare";
import { callLLMWithFallback } from "./providers";
import { OPEN_GRADING_SYSTEM, ANALYZE_DEV_SYSTEM } from "./prompts";

export function normalizeExam(exam: Exam): Exam {
  for (const sec of exam.sections) {
    if (sec.type === "multiple_choice") for (const q of sec.questions) q.points = q.points ?? 1;
    if (sec.type === "open_reasoning") for (const q of sec.questions) q.points = q.points ?? 1;
    if (sec.type === "short_problem") for (const p of sec.problems) p.points = p.points ?? 1;
    if (sec.type === "long_problem") for (const p of sec.problems) for (const sp of p.subparts) sp.points = sp.points ?? 1;
  }
  exam.totalPoints = computeTotalPoints(exam);
  return exam;
}

export function computeTotalPoints(exam: Exam): number {
  let total = 0;
  for (const sec of exam.sections) {
    if (sec.type === "multiple_choice") for (const q of sec.questions) total += q.points ?? 0;
    if (sec.type === "open_reasoning") for (const q of sec.questions) total += q.points;
    if (sec.type === "short_problem") for (const p of sec.problems) total += p.points;
    if (sec.type === "long_problem") for (const p of sec.problems) for (const sp of p.subparts) total += sp.points;
  }
  return total || exam.totalPoints || 0;
}

export type LLMOpts = {
  apiKey: string;
  model: string;
};

export async function gradeOpenQuestion(
  q: { id: string; statement: string; rubric: string[]; modelAnswer: string; points: number },
  answerText: string,
  llm: LLMOpts
): Promise<{ score: number; feedback: string; missing: string[] }> {
  const user = `Pregunta: ${q.statement}\nRúbrica: ${q.rubric.join("; ")}\nRespuesta modelo: ${q.modelAnswer}\nRespuesta alumno: ${answerText || "(vacía)"}\nMax puntos: ${q.points}`;
  try {
    const res = await callLLMWithFallback({ apiKey: llm.apiKey, model: llm.model, system: OPEN_GRADING_SYSTEM, user, jsonMode: true });
    const score = Math.max(0, Math.min(q.points, Number(res?.score) || 0));
    return { score, feedback: String(res?.feedback ?? ""), missing: Array.isArray(res?.missing) ? res.missing : [] };
  } catch (e: any) {
    return { score: 0, feedback: `Error al corregir con LLM: ${e?.message ?? e}`, missing: [] };
  }
}

export async function analyzeDevelopment(
  problemStatement: string,
  correctSolution: string,
  procedure: string,
  llm: LLMOpts
): Promise<{ diagnosis: string; suggestions: string[] }> {
  const user = `Problema: ${problemStatement}\nSolución correcta (resumen): ${correctSolution}\nDesarrollo del alumno: ${procedure}`;
  try {
    const res = await callLLMWithFallback({ apiKey: llm.apiKey, model: llm.model, system: ANALYZE_DEV_SYSTEM, user, jsonMode: true });
    return { diagnosis: String(res?.diagnosis ?? ""), suggestions: Array.isArray(res?.suggestions) ? res.suggestions : [] };
  } catch (e: any) {
    return { diagnosis: `Error: ${e?.message ?? e}`, suggestions: [] };
  }
}

export async function gradeExam(
  exam: Exam,
  answers: { mc: Record<string,string>; open: Record<string,string>; short: Record<string,string>; long: Record<string, Record<string,string>> },
  llm: LLMOpts | null
): Promise<GradeResult> {
  const items: GradeItem[] = [];
  let totalScore = 0;
  const totalPoints = computeTotalPoints(exam);

  for (const sec of exam.sections) {
    if (sec.type === "multiple_choice") {
      for (const q of sec.questions) {
        const pts = q.points ?? 1;
        const chosen = answers.mc[q.id];
        const ok = chosen === q.correctOptionId;
        const score = ok ? pts : 0;
        totalScore += score;
        items.push({
          id: q.id, sectionType: sec.type, label: `Test: ${q.statement.slice(0, 60)}`,
          score, points: pts, isCorrect: ok,
          feedback: ok ? "Correcto." : `Incorrecto. La opción correcta era ${q.correctOptionId}.`,
          correctSolution: `${q.correctOptionId}. ${q.options.find(o=>o.id===q.correctOptionId)?.text ?? ""}\n${q.explanation}`,
        });
      }
    } else if (sec.type === "open_reasoning") {
      for (const q of sec.questions) {
        let score = 0;
        let feedback = "";
        let missing: string[] = [];
        if (llm && llm.apiKey) {
          const r = await gradeOpenQuestion(q, answers.open[q.id] ?? "", llm);
          score = r.score; feedback = r.feedback; missing = r.missing;
        } else {
          feedback = "Sin LLM configurado: no se puede corregir automáticamente.";
        }
        totalScore += score;
        items.push({
          id: q.id, sectionType: sec.type, label: `Redacción: ${q.statement.slice(0, 60)}`,
          score, points: q.points, isCorrect: score >= q.points * 0.9,
          feedback: feedback + (missing.length ? `\nFalta: ${missing.join(", ")}` : ""),
          correctSolution: q.modelAnswer,
        });
      }
    } else if (sec.type === "short_problem") {
      for (const p of sec.problems) {
        const r = compareAnswer(p.answer, answers.short[p.id] ?? "");
        const score = r.ok ? p.points : 0;
        totalScore += score;
        items.push({
          id: p.id, sectionType: sec.type, label: `Problema corto: ${p.statement.slice(0, 60)}`,
          score, points: p.points, isCorrect: r.ok,
          feedback: r.detail,
          correctSolution: p.solution,
        });
      }
    } else if (sec.type === "long_problem") {
      for (const prob of sec.problems) {
        for (const sp of prob.subparts) {
          const raw = answers.long[prob.id]?.[sp.id] ?? "";
          const r = compareAnswer(sp.answer, raw);
          const score = r.ok ? sp.points : 0;
          totalScore += score;
          items.push({
            id: `${prob.id}-${sp.id}`, sectionType: sec.type, label: `Problema largo ${prob.id} (${sp.id}): ${sp.statement.slice(0, 50)}`,
            score, points: sp.points, isCorrect: r.ok,
            feedback: r.detail,
            correctSolution: sp.solution,
          });
        }
      }
    }
  }

  return { totalScore, totalPoints, items };
}
