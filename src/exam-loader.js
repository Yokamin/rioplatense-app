const EXAMS_CATALOG_PATH = "data/exams/exams.json";

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load ${url} (${response.status})`);
  }
  return response.json();
}

export async function loadExamCatalog() {
  const catalog = await fetchJson(EXAMS_CATALOG_PATH);
  const exams = [];

  for (const entry of catalog.exams ?? []) {
    const exam = await fetchJson(entry.file);
    exams.push(exam);
  }

  return exams;
}

export async function loadExamById(examId) {
  const catalog = await fetchJson(EXAMS_CATALOG_PATH);
  const entry = (catalog.exams ?? []).find((item) => item.id === examId);
  if (!entry) {
    throw new Error(`Unknown exam id: ${examId}`);
  }

  return fetchJson(entry.file);
}

export function getExamPreset(exam, presetId) {
  const preset = (exam.conjugation?.presets ?? []).find((item) => item.id === presetId);
  if (!preset) {
    throw new Error(`Unknown preset id: ${presetId}`);
  }

  return preset;
}

export function buildExamConjugationUrl(examId, presetId) {
  const params = new URLSearchParams({ exam: examId, preset: presetId });
  return `conjugation.html?${params.toString()}`;
}

export function buildExamReflexiveUrl(examId) {
  const params = new URLSearchParams({ exam: examId });
  return `reflexive.html?${params.toString()}`;
}

export function getExamReflexives(exam) {
  if (!exam.reflexives?.available) {
    throw new Error(`Reflexive practice is not available for exam: ${exam.id}`);
  }

  return exam.reflexives;
}
