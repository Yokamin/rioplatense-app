import {
  loadAllData,
  PRONOUN_KEYS,
  PRONOUN_LABELS,
} from "./data-loader.js";
import { listVocabCategories } from "./card-picker.js";
import {
  addVerb,
  addVocabCategory,
  addVocabItem,
  clearDrafts,
  exportMergedJson,
  getDraftSummary,
  loadDrafts,
  slugifyCategoryId,
} from "./draft-storage.js";
import { VERB_TYPES } from "./ui-helpers.js";
import { getFileProtocolHint, setStatus } from "./ui-helpers.js";
import { initSmartBackLink } from "./navigation.js";

const statusEl = document.getElementById("status");
const draftSummaryEl = document.getElementById("draft-summary");
const vocabCategorySelect = document.getElementById("vocab-category");
const verbTypeSelect = document.getElementById("verb-type");
const conjugationFields = document.getElementById("conjugation-fields");
const exportVocabEl = document.getElementById("export-vocab");
const exportVerbsEl = document.getElementById("export-verbs");

let mergedVocab = null;
let mergedVerbs = null;

function renderDraftSummary() {
  const summary = getDraftSummary();
  draftSummaryEl.textContent =
    `${summary.vocabItemCount} vocab word(s), ` +
    `${summary.categoryCount} new categor(ies), ` +
    `${summary.verbCount} verb draft(s) saved in this browser.`;
}

function populateCategorySelect(vocab) {
  vocabCategorySelect.innerHTML = "";
  for (const category of listVocabCategories(vocab)) {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = `${category.displayName} (${category.itemCount})`;
    vocabCategorySelect.appendChild(option);
  }
}

function populateVerbTypeSelect() {
  verbTypeSelect.innerHTML = "";
  for (const type of VERB_TYPES) {
    const option = document.createElement("option");
    option.value = type.id;
    option.textContent = type.label;
    verbTypeSelect.appendChild(option);
  }
}

function buildConjugationFields() {
  conjugationFields.innerHTML = "";
  for (const pronoun of PRONOUN_KEYS) {
    const label = document.createElement("label");
    label.className = "field";
    label.innerHTML = `
      <span>${PRONOUN_LABELS[pronoun]}</span>
      <input type="text" name="conj_${pronoun}" autocomplete="off" />
    `;
    conjugationFields.appendChild(label);
  }
}

function readConjugationsFromForm(formData) {
  const conjugations = {};
  let hasAny = false;
  let allFilled = true;

  for (const pronoun of PRONOUN_KEYS) {
    const value = formData.get(`conj_${pronoun}`)?.trim() ?? "";
    if (value) {
      hasAny = true;
      conjugations[pronoun] = value;
    } else {
      allFilled = false;
    }
  }

  if (!hasAny) {
    return null;
  }

  if (!allFilled) {
    throw new Error("If you add conjugations, all 7 pronoun fields must be filled.");
  }

  return conjugations;
}

function refreshExport() {
  const exported = exportMergedJson(mergedVocab, mergedVerbs);
  exportVocabEl.value = exported.vocab;
  exportVerbsEl.value = exported.verbs;
}

async function reloadMergedData() {
  const data = await loadAllData();
  mergedVocab = data.vocab;
  mergedVerbs = data.verbs;
  populateCategorySelect(mergedVocab);
  refreshExport();
  renderDraftSummary();
}

async function init() {
  initSmartBackLink(document.getElementById("back-link"), {
    fallbackHref: "index.html",
    fallbackLabel: "← Home",
  });

  try {
    populateVerbTypeSelect();
    buildConjugationFields();
    await reloadMergedData();
    setStatus("Drafts load from localStorage and merge with data files for export and drills.");
  } catch (error) {
    setStatus(`Data load failed: ${error.message}.${getFileProtocolHint()}`, true);
  }
}

document.getElementById("add-vocab-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);

  addVocabItem(
    formData.get("spanish"),
    formData.get("english"),
    formData.get("categoryId")
  );

  form.reset();
  await reloadMergedData();
  setStatus("Vocabulary draft saved.");
});

document.getElementById("add-category-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const displayName = formData.get("displayName");
  const customId = formData.get("categoryId")?.trim();

  addVocabCategory(displayName, customId || null);
  form.reset();
  await reloadMergedData();
  setStatus(`Category draft saved${customId ? "" : ` as "${slugifyCategoryId(displayName)}"`}.`);
});

document.getElementById("add-verb-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);

  try {
    const entry = {
      infinitive: formData.get("infinitive").trim(),
      english: formData.get("english").trim(),
      type: formData.get("type"),
      is_reflexive: formData.get("isReflexive") === "true",
    };

    const note = formData.get("note")?.trim();
    if (note) {
      entry.note = note;
    }

    const conjugations = readConjugationsFromForm(formData);
    if (conjugations) {
      entry.present_tense = conjugations;
    }

    addVerb(entry);
    form.reset();
    verbTypeSelect.value = "unknown";
    await reloadMergedData();
    setStatus(
      conjugations
        ? "Verb draft saved with present tense conjugations."
        : "Verb draft saved (metadata only — add conjugations later for drills)."
    );
  } catch (error) {
    setStatus(error.message, true);
  }
});

document.getElementById("clear-drafts").addEventListener("click", async () => {
  if (!confirm("Clear all local Card Creator drafts in this browser?")) {
    return;
  }

  clearDrafts();
  await reloadMergedData();
  setStatus("Local drafts cleared.");
});

async function copyText(text, label) {
  await navigator.clipboard.writeText(text);
  setStatus(`${label} copied to clipboard.`);
}

document.getElementById("copy-vocab").addEventListener("click", () => {
  copyText(exportVocabEl.value, "vocab.json");
});

document.getElementById("copy-verbs").addEventListener("click", () => {
  copyText(exportVerbsEl.value, "verbs.json");
});

init();
