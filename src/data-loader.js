import {
  loadDrafts,
  mergeVerbsWithDrafts,
  mergeVocabWithDrafts,
} from "./draft-storage.js";

/** Short labels for cards (Spanish only — no English gloss). */
export const PRONOUN_CARD_LABELS = {
  yo: "yo",
  vos: "vos",
  tu: "tú",
  el: "él/ella/usted",
  nosotros: "nosotros",
  vosotros: "vosotros",
  ustedes: "ustedes",
};

/** Shared pronoun keys used across all verb tenses. */
export const PRONOUN_KEYS = [
  "yo",
  "vos",
  "tu",
  "el",
  "nosotros",
  "vosotros",
  "ustedes",
];

/** Labels for settings UI (Spanish only). */
export const PRONOUN_LABELS = { ...PRONOUN_CARD_LABELS };

/** Default tense for drills until past tense is added. */
export const DEFAULT_TENSE = "present_tense";

const DATA_PATHS = {
  vocab: "data/vocab.json",
  verbs: "data/verbs.json",
};

async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to load ${url} (${response.status})`);
  }

  return response.json();
}

/** Load vocabulary categories from data/vocab.json. */
export async function loadVocab() {
  const data = await fetchJson(DATA_PATHS.vocab);

  if (!Array.isArray(data.categories)) {
    throw new Error("vocab.json: expected a categories array");
  }

  return data;
}

/** Load verb entries from data/verbs.json. */
export async function loadVerbs() {
  const data = await fetchJson(DATA_PATHS.verbs);

  if (!Array.isArray(data)) {
    throw new Error("verbs.json: expected a top-level array");
  }

  return data;
}

/** Load both data files in parallel, merged with any local Card Creator drafts. */
export async function loadAllData({ includeDrafts = true } = {}) {
  const [fileVocab, fileVerbs] = await Promise.all([loadVocab(), loadVerbs()]);

  if (!includeDrafts) {
    return { vocab: fileVocab, verbs: fileVerbs, drafts: loadDrafts() };
  }

  const drafts = loadDrafts();
  return {
    vocab: mergeVocabWithDrafts(fileVocab, drafts),
    verbs: mergeVerbsWithDrafts(fileVerbs, drafts),
    drafts,
  };
}

/** Summarize loaded data for the smoke-test status panel. */
export function summarizeData({ vocab, verbs }, tense = DEFAULT_TENSE) {
  const vocabCount = vocab.categories.reduce(
    (total, category) => total + Object.keys(category.items).length,
    0
  );

  const verbsWithTense = verbs.filter((verb) => verb[tense]);

  return {
    categoryCount: vocab.categories.length,
    vocabCount,
    verbCount: verbs.length,
    verbsWithTenseCount: verbsWithTense.length,
    tense,
  };
}
