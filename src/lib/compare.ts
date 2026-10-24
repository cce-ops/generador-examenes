import type { AnswerSpec } from "./types";

export type CompareResult = { ok: boolean; detail: string };

function parseNumber(s: string): number | null {
  if (!s) return null;
  const cleaned = s.trim().replace(",", ".").replace(/[^\d.\-eE+]/g, "");
  // remove trailing units by taking first numeric token
  const m = s.trim().match(/-?\d+(?:[.,]\d+)?(?:[eE][+-]?\d+)?/);
  if (!m) return null;
  const v = parseFloat(m[0].replace(",", "."));
  return isNaN(v) ? null : v;
}

function parseNumberArray(s: string): number[] | null {
  const t = s.trim();
  // try JSON
  try {
    const j = JSON.parse(t.replace(/'/g, '"'));
    if (Array.isArray(j)) {
      const nums = j.map((x) => (typeof x === "number" ? x : parseFloat(String(x).replace(",", "."))));
      if (nums.every((n) => n !== null && isFinite(n))) return nums;
    }
  } catch {}
  // comma separated
  const parts = t.replace(/[\[\]()]/g, "").split(/[,;\s]+/).filter(Boolean);
  const nums = parts.map(parseNumber);
  if (nums.length && nums.every((n) => n !== null)) return nums as number[];
  return null;
}

function parseMatrix(s: string): number[][] | null {
  const t = s.trim();
  try {
    const j = JSON.parse(t.replace(/'/g, '"'));
    if (Array.isArray(j)) {
      const m = j.map((r) => Array.isArray(r) ? r.map((x) => (typeof x === "number" ? x : parseFloat(String(x).replace(",", ".")))) : null);
      if (m.every((r) => Array.isArray(r) && r.every((n) => n !== null && isFinite(n)))) return m as number[][];
    }
  } catch {}
  // rows separated by ; or newline, cols by comma
  const rows = t.split(/[;\n]/).map((r) => r.trim()).filter(Boolean);
  const parsed: number[][] = [];
  for (const r of rows) {
    const cols = r.replace(/[\[\]]/g, "").split(/[, \t]+/).filter(Boolean).map(parseNumber);
    if (cols.some((n) => n === null)) return null;
    parsed.push(cols as number[]);
  }
  if (parsed.length && parsed.every((r) => r.length === parsed[0].length)) return parsed;
  return null;
}

function withinTol(actual: number, expected: number, mode: "absolute" | "relative", tol: number): boolean {
  const diff = Math.abs(actual - expected);
  if (mode === "absolute") return diff <= tol;
  // relative
  const denom = Math.abs(expected) === 0 ? 1 : Math.abs(expected);
  return diff / denom <= tol;
}

export function compareAnswer(answer: AnswerSpec, raw: string): CompareResult {
  const input = (raw ?? "").trim();
  if (!input) return { ok: false, detail: "Sin respuesta." };

  if (answer.kind === "numeric") {
    const v = parseNumber(input);
    if (v === null) return { ok: false, detail: "No se pudo interpretar como número." };
    const ok = withinTol(v, answer.value, answer.tolerance.mode, answer.tolerance.value);
    return { ok, detail: ok ? "Correcto." : `Esperado ${answer.value}${answer.units ? " " + answer.units : ""}, obtenido ${v}.` };
  }

  if (answer.kind === "vector") {
    const v = parseNumberArray(input);
    if (!v) return { ok: false, detail: "No se pudo interpretar como vector." };
    if (v.length !== answer.value.length) return { ok: false, detail: `Dimensión incorrecta: esperado ${answer.value.length}, obtenido ${v.length}.` };
    let ok = true;
    for (let i = 0; i < v.length; i++) {
      if (!withinTol(v[i], answer.value[i], answer.tolerance.mode, answer.tolerance.value)) { ok = false; break; }
    }
    return { ok, detail: ok ? "Correcto." : `Esperado [${answer.value.join(", ")}], obtenido [${v.join(", ")}].` };
  }

  if (answer.kind === "matrix") {
    const m = parseMatrix(input);
    if (!m) return { ok: false, detail: "No se pudo interpretar como matriz." };
    if (m.length !== answer.value.length || m.some((r, i) => r.length !== answer.value[i].length)) {
      return { ok: false, detail: "Dimensiones de matriz incorrectas." };
    }
    let ok = true;
    outer: for (let i = 0; i < m.length; i++) {
      for (let j = 0; j < m[i].length; j++) {
        if (!withinTol(m[i][j], answer.value[i][j], answer.tolerance.mode, answer.tolerance.value)) { ok = false; break outer; }
      }
    }
    return { ok, detail: ok ? "Correcto." : "Matriz incorrecta." };
  }

  if (answer.kind === "symbolic") {
    const ok = compareSymbolic(answer.expression, answer.variables, input, answer.tolerance.value);
    return { ok, detail: ok ? "Correcto." : `Expresión incorrecta. Esperada: ${answer.expression}.` };
  }

  if (answer.kind === "text") {
    const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
    const ok = answer.acceptedAnswers.some((a) => norm(a) === norm(input));
    return { ok, detail: ok ? "Correcto." : `Respuesta no aceptada.` };
  }

  return { ok: false, detail: "Tipo no soportado." };
}

function safeEval(expr: string, vars: Record<string, number>): number | null {
  try {
    let e = expr.trim();
    // Lista blanca de caracteres permitidos para evitar inyección de código.
    if (!/^[0-9a-zA-Z_+\-*/().,\s^]+$/.test(e)) return null;
    // normalize caret
    e = e.replace(/\^/g, "**");
    const keys = Object.keys(vars);
    const fn = new Function(...keys, `"use strict"; return (${e});`);
    const r = fn(...Object.values(vars));
    if (typeof r !== "number" || !isFinite(r)) return null;
    return r;
  } catch {
    return null;
  }
}

function compareSymbolic(expected: string, variables: string[], userExpr: string, tol: number): boolean {
  // Try direct string normalization first
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, "");
  if (norm(expected) === norm(userExpr)) return true;

  // Sampling
  const vars = variables.length ? variables : extractVars(expected + " " + userExpr);
  for (let t = 0; t < 8; t++) {
    const vals: Record<string, number> = {};
    for (const v of vars) {
      vals[v] = (Math.random() * 4 + 0.5) * (Math.random() < 0.5 ? 1 : -1);
      // avoid zero issues: ensure not too small
      if (Math.abs(vals[v]) < 0.5) vals[v] = 1.5;
    }
    const e1 = safeEval(expected, vals);
    const e2 = safeEval(userExpr, vals);
    if (e1 === null || e2 === null) {
      // can't evaluate; fall back to string compare only
      return norm(expected) === norm(userExpr);
    }
    const denom = Math.abs(e1) === 0 ? 1 : Math.abs(e1);
    if (Math.abs(e1 - e2) / denom > tol) return false;
  }
  return true;
}

function extractVars(s: string): string[] {
  const matches = s.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
  const keywords = new Set(["sin","cos","tan","log","ln","exp","sqrt","abs","pi","e","PI","E"]);
  const set = new Set(matches.filter((m) => !keywords.has(m)));
  return Array.from(set);
}
