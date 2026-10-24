export type StorageMode = "session" | "local";

export function getStorage(mode: StorageMode): Storage {
  return mode === "local" ? localStorage : sessionStorage;
}

export function saveKey(mode: StorageMode, key: string) {
  getStorage(mode).setItem("byok_api_key", key);
}
export function loadKey(mode: StorageMode): string {
  return getStorage(mode).getItem("byok_api_key") || "";
}
export function clearKey(mode: StorageMode) {
  getStorage(mode).removeItem("byok_api_key");
  // also clear other
  try { sessionStorage.removeItem("byok_api_key"); localStorage.removeItem("byok_api_key"); } catch {}
}

export function saveProvider(mode: StorageMode, provider: string) {
  getStorage(mode).setItem("byok_provider", provider);
}
export function loadProvider(mode: StorageMode): string {
  return getStorage(mode).getItem("byok_provider") || "gemini";
}

export function saveModel(mode: StorageMode, model: string) {
  getStorage(mode).setItem("byok_model", model);
}
export function loadModel(mode: StorageMode): string {
  return getStorage(mode).getItem("byok_model") || "";
}

export function saveStorageMode(mode: StorageMode) {
  localStorage.setItem("byok_storage_mode", mode);
}
export function loadStorageMode(): StorageMode {
  const v = localStorage.getItem("byok_storage_mode");
  return v === "local" ? "local" : "session";
}

// Exam persistence
export function saveExam(exam: any) {
  localStorage.setItem("exam_current", JSON.stringify(exam));
}
export function loadExam(): any | null {
  const v = localStorage.getItem("exam_current");
  if (!v) return null;
  try { return JSON.parse(v); } catch { return null; }
}
export function clearExam() {
  localStorage.removeItem("exam_current");
}
export function saveAnswers(ans: any) {
  localStorage.setItem("exam_answers", JSON.stringify(ans));
}
export function loadAnswers(): any | null {
  const v = localStorage.getItem("exam_answers");
  if (!v) return null;
  try { return JSON.parse(v); } catch { return null; }
}
