export type ProviderId = "gemini";

export const PROVIDERS = [
  { id: "gemini", label: "Google Gemini", needsKey: true, defaultModel: "gemini-3.8-flash", models: ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"] },
] as const;

export function providerInfo(_id?: string) {
  return PROVIDERS[0];
}

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta";

export type LLMCallOpts = {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  jsonMode?: boolean;
  timeoutMs?: number;
  onAttempt?: (msg: string) => void;
};

const MODELS_ORDER = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"];

export function modelQueue(preferred: string): string[] {
  const idx = MODELS_ORDER.indexOf(preferred);
  if (idx < 0) return [...MODELS_ORDER];
  return [...MODELS_ORDER.slice(idx), ...MODELS_ORDER.slice(0, idx)];
}

export async function callLLM(opts: LLMCallOpts): Promise<any> {
  const { apiKey, model, system, user, jsonMode = true, timeoutMs = 180000 } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = `${GEMINI_ENDPOINT}/models/${model}:generateContent`;
    const body: any = {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 16384,
      },
    };
    if (jsonMode) body.generationConfig.responseMimeType = "application/json";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) headers["x-goog-api-key"] = apiKey;
    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body), signal: controller.signal });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = (json?.error?.message || `HTTP ${res.status}`).replace(apiKey, "[REDACTED]");
      throw new Error(msg);
    }
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Sin respuesta del modelo.");
    return parseJsonLoose(text, jsonMode);
  } catch (err: any) {
    if (err?.name === "AbortError") throw new Error("Timeout de la petición.");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function parseJsonLoose(text: string, jsonMode: boolean): any {
  const sinCercas = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  try { return JSON.parse(sinCercas); } catch {}
  const inicio = sinCercas.indexOf("{");
  const fin = sinCercas.lastIndexOf("}");
  if (inicio !== -1 && fin > inicio) {
    try { return JSON.parse(sinCercas.slice(inicio, fin + 1)); } catch {}
  }
  const a0 = sinCercas.indexOf("[");
  const a1 = sinCercas.lastIndexOf("]");
  if (a0 !== -1 && a1 > a0) {
    try { return JSON.parse(sinCercas.slice(a0, a1 + 1)); } catch {}
  }
  if (jsonMode) throw new Error("La respuesta no es JSON válido.");
  return text;
}

export async function callLLMWithFallback(opts: LLMCallOpts): Promise<any> {
  const { apiKey, model, system, user, jsonMode = true, timeoutMs = 180000, onAttempt } = opts;
  const cola = modelQueue(model);
  const INTENTOS = 2;
  const DELAY = 2000;
  let ultimoError = "sin intentos";
  for (const m of cola) {
    for (let i = 0; i < INTENTOS; i++) {
      onAttempt?.(`Intentando ${m} (intento ${i + 1}/${INTENTOS})...`);
      try {
        const res = await callLLM({ apiKey, model: m, system, user, jsonMode, timeoutMs });
        onAttempt?.(`OK con ${m}.`);
        return res;
      } catch (err: any) {
        const msg = err?.message ?? String(err);
        ultimoError = `[${m}] ${msg}`;
        onAttempt?.(`Fallo ${m}: ${msg}`);
        const fatal = /api[\s_-]?key/i.test(msg) || /401|403/.test(msg);
        if (fatal) throw new Error("API key inválida o sin permisos. Revisa tu clave de Gemini.");
        if (i < INTENTOS - 1) {
          await new Promise((r) => setTimeout(r, DELAY));
        }
      }
    }
  }
  throw new Error(`Todos los modelos fallaron. Último error: ${ultimoError}`);
}
