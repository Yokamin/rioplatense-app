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
import { t } from "./i18n/index.js";
import { setupPageLocale } from "./page-locale.js";
import { getFileProtocolHint, getVerbTypes, setStatus } from "./ui-helpers.js";
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
let backLinkRefresh = null;

function renderDraftSummary() {
  const summary = getDraftSummary();
  draftSummaryEl.textContent = t("creator.draftSummary", {
    vocabCount: summary.vocabItemCount,
    categoryCount: summary.categoryCount,
    verbCount: summary.verbCount,
  });
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
  for (const type of getVerbTypes()) {
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
    throw new Error(t("error.conjugationsIncomplete"));
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

function refreshLocalizedUi() {
  populateVerbTypeSelect();
  renderDraftSummary();
  backLinkRefresh?.();
}

async function init() {
  backLinkRefresh = initSmartBackLink(document.getElementById("back-link"), {
    fallbackHref: "index.html",
  }).refresh;

  try {
    populateVerbTypeSelect();
    buildConjugationFields();
    await reloadMergedData();
    setStatus(t("creator.statusLoaded"));
  } catch (error) {
    setStatus(
      t("error.dataLoadFailed", {
        message: error.message,
        fileProtocolHint: getFileProtocolHint(),
      }),
      true
    );
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
  setStatus(t("creator.vocabSaved"));
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
  setStatus(
    customId
      ? t("creator.categorySavedWithSlug", { slug: customId })
      : t("creator.categorySaved")
  );
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
      conjugations ? t("creator.verbSavedWithConjugations") : t("creator.verbSavedMetadata")
    );
  } catch (error) {
    setStatus(error.message, true);
  }
});

document.getElementById("clear-drafts").addEventListener("click", async () => {
  if (!confirm(t("creator.clearDraftsConfirm"))) {
    return;
  }

  clearDrafts();
  await reloadMergedData();
  setStatus(t("creator.draftsCleared"));
});

async function copyText(text, label) {
  await navigator.clipboard.writeText(text);
  setStatus(t("creator.copiedToClipboard", { label }));
}

document.getElementById("copy-vocab").addEventListener("click", () => {
  copyText(exportVocabEl.value, t("creator.exportVocabFile"));
});

document.getElementById("copy-verbs").addEventListener("click", () => {
  copyText(exportVerbsEl.value, t("creator.exportVerbsFile"));
});

setupPageLocale({
  titleKey: "page.title.cardCreator",
  onChange: refreshLocalizedUi,
});

init();
