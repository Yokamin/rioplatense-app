import {
  DEFAULT_TENSE,
  loadAllData,
  PRONOUN_CARD_LABELS,
  PRONOUN_KEYS,
  PRONOUN_LABELS,
} from "./data-loader.js";
import {
  countEligibleVerbs,
  listVerbsForTense,
} from "./card-picker.js";
import { buildVerbDrillDeck, createDrillRunner } from "./drill-session.js";
import { getExamReflexives, loadExamById } from "./exam-loader.js";
import { initSmartBackLink } from "./navigation.js";
import {
  normalizeReflexiveSettings,
  saveSettingsIfRepaired,
} from "./practice-settings.js";
import { getConjugationDialectNote } from "./rioplatense-notes.js";
import {
  examReflexiveSettingsKey,
  loadPracticeSettings,
  savePracticeSettings,
  SETTINGS_KEYS,
} from "./settings-storage.js";
import { initStatsUi } from "./stats-ui.js";
import { resetSessionStats } from "./stats-storage.js";
import {
  applyPracticeInputMode,
  canPeekVerbDetail,
  configureDrillUi,
  getCheckedValues,
  getCurrentDrillCard,
  getFileProtocolHint,
  getSelectedPracticeInputMode,
  hideSettingsOverlay,
  initDrillActionHandlers,
  populateCheckboxGroup,
  renderDrillCard,
  resetAnswerUi,
  setCardOrderOnForm,
  setCheckedValues,
  setDrillStyleOnForm,
  setPracticeInputMode,
  showSettingsOverlay,
  TENSE_OPTIONS,
  getCardOrderFromForm,
  getDrillStyleFromForm,
  getStemHintsFromForm,
  setStemHintsOnForm,
} from "./ui-helpers.js";
import { getFrequencyBadge, getVerbFrequency } from "./verb-frequency.js";
import { initVerbDetailModal } from "./verb-detail-modal.js";
import { initVerbPicker } from "./verb-picker.js";

const overlayEl = document.getElementById("settings-overlay");
const sessionEl = document.getElementById("drill-session");
const settingsFormEl = document.getElementById("settings-overlay");
const cardEl = document.getElementById("card");
const metaEl = document.getElementById("meta");
const dialectWarningEl = document.getElementById("dialect-warning");
const answerForm = document.getElementById("answer-form");
const answerInput = document.getElementById("answer-input");
const primaryBtn = document.getElementById("primary-action");
const feedbackEl = document.getElementById("answer-feedback");
const revealBtn = document.getElementById("reveal-answer");
const secondaryActionsEl = document.getElementById("secondary-actions");
const startBtn = document.getElementById("start-practice");
const changeSettingsBtn = document.getElementById("change-settings");
const sessionBarEl = document.getElementById("session-bar");
const tenseSelect = document.getElementById("tense");
const pronounFilters = document.getElementById("pronoun-filters");
const verbPickerToggle = document.getElementById("verb-picker-toggle");
const verbPickerModal = document.getElementById("verb-picker-modal");
const verbFilters = document.getElementById("verb-filters");
const verbPickerDoneBtn = document.getElementById("verb-picker-done");
const verbSelectCoreBtn = document.getElementById("verb-select-core");
const verbSelectCommonBtn = document.getElementById("verb-select-common");
const verbSelectAllBtn = document.getElementById("verb-select-all");
const verbClearAllBtn = document.getElementById("verb-clear-all");
const statsToggle = document.getElementById("stats-toggle");
const statsModal = document.getElementById("stats-modal");
const statsModalBody = document.getElementById("stats-modal-body");
const statsModalClose = document.getElementById("stats-modal-close");
const verbDetailModalEl = document.getElementById("verb-detail-modal");
const verbDetailBody = document.getElementById("verb-detail-body");
const verbDetailClose = document.getElementById("verb-detail-close");
const singleAnswerRow = document.getElementById("single-answer-row");
const tableAnswerFields = document.getElementById("table-answer-fields");
const backLinkEl = document.getElementById("back-link");
const pageTitleEl = document.getElementById("page-title");
const examScopeBannerEl = document.getElementById("exam-scope-banner");
const settingsIntroEl = document.getElementById("settings-intro");

const urlParams = new URLSearchParams(window.location.search);
const examId = urlParams.get("exam");
const isExamMode = Boolean(examId);

const DEFAULT_SETTINGS = {
  tense: DEFAULT_TENSE,
  pronouns: [...PRONOUN_KEYS],
  infinitives: null,
  inputMode: "type",
  drillStyle: "per_verb",
  cardOrder: "deck",
  stemHints: true,
};

let examContext = null;
let examReflexives = null;
let scopedInfinitives = null;
let settingsStorageKey = SETTINGS_KEYS.reflexive;

let verbs = [];
let activeSettings = normalizeReflexiveSettings(
  loadPracticeSettings(settingsStorageKey, DEFAULT_SETTINGS),
  DEFAULT_SETTINGS
);
let statsUi = null;
let verbPicker = null;
let verbDetailModal = null;
let drillRunner = null;
const verbByInfinitive = new Map();

const drillUi = {
  answerForm,
  answerInput,
  singleAnswerRow,
  tableAnswerFields,
  feedbackEl,
  primaryBtn,
  revealBtn,
  secondaryActionsEl,
};

function syncVerbPeekTrigger() {
  const trigger = cardEl.querySelector(".verb-peek-trigger");
  if (!trigger) {
    return;
  }

  const unlocked = canPeekVerbDetail();
  trigger.disabled = !unlocked;
  trigger.classList.toggle("is-unlocked", unlocked);
}

function openCurrentVerbDetail() {
  const card = getCurrentDrillCard();
  if (!card || !canPeekVerbDetail()) {
    return;
  }

  const verb = verbByInfinitive.get(card.infinitive);
  if (!verb) {
    return;
  }

  verbDetailModal.open(verb, {
    tense: card.tense,
    pronoun: card.pronoun ?? card.pronouns?.[0],
  });
}

function intersectWithExamScope(infinitives) {
  if (!scopedInfinitives) {
    return infinitives;
  }

  if (!infinitives || infinitives.length === 0) {
    return [...scopedInfinitives];
  }

  const allowed = new Set(scopedInfinitives);
  return infinitives.filter((infinitive) => allowed.has(infinitive));
}

function resolveInfinitivesForDrill(infinitives) {
  if (scopedInfinitives) {
    return intersectWithExamScope(infinitives);
  }

  return infinitives;
}

function readSettingsFromForm() {
  return {
    tense: tenseSelect.value,
    pronouns: getCheckedValues(pronounFilters),
    infinitives: intersectWithExamScope(verbPicker.readSelectionForSettings()),
    inputMode: getSelectedPracticeInputMode(settingsFormEl),
    drillStyle: getDrillStyleFromForm(settingsFormEl),
    cardOrder: getCardOrderFromForm(settingsFormEl),
    stemHints: getStemHintsFromForm(settingsFormEl),
  };
}

function applySettingsToForm(settings) {
  const normalized = normalizeReflexiveSettings(settings, DEFAULT_SETTINGS);

  tenseSelect.value = normalized.tense;
  setCheckedValues(pronounFilters, normalized.pronouns);
  setPracticeInputMode(settingsFormEl, normalized.inputMode ?? "type");
  setDrillStyleOnForm(settingsFormEl, normalized.drillStyle);
  setCardOrderOnForm(settingsFormEl, normalized.cardOrder);
  setStemHintsOnForm(settingsFormEl, normalized.stemHints);
  populateVerbPicker(normalized.tense);
  verbPicker.applySelection(normalized.infinitives);
}

function normalizeDrillOptions({ tense, pronouns, infinitives }) {
  return {
    tense,
    types: null,
    pronouns: pronouns?.length > 0 ? pronouns : PRONOUN_KEYS,
    infinitives: resolveInfinitivesForDrill(infinitives),
    reflexiveOnly: true,
  };
}

function countMatchingVerbsFromForm(_selectedIds, infinitives) {
  return countEligibleVerbs(
    verbs.filter((verb) => verb.is_reflexive === true),
    normalizeDrillOptions({
      tense: tenseSelect.value,
      pronouns: getCheckedValues(pronounFilters),
      infinitives,
    })
  );
}

function getDrillOptions(settings = activeSettings) {
  return normalizeDrillOptions(settings);
}

function showNextCard() {
  const card = drillRunner?.next() ?? null;
  const hasCard = renderDrillCard(
    cardEl,
    metaEl,
    dialectWarningEl,
    card,
    PRONOUN_CARD_LABELS,
    activeSettings.inputMode,
    drillUi,
    drillRunner?.deckProgress ?? null
  );
  resetAnswerUi(drillUi);
  applyPracticeInputMode(activeSettings.inputMode, drillUi);

  if (hasCard && activeSettings.inputMode === "type") {
    if (card?.drillFormat === "per_verb") {
      tableAnswerFields?.querySelector("input")?.focus();
    } else {
      answerInput.focus();
    }
  }
}

function populateTenseSelect() {
  tenseSelect.innerHTML = "";
  for (const tense of TENSE_OPTIONS) {
    const option = document.createElement("option");
    option.value = tense.id;
    option.textContent = tense.label;
    tenseSelect.appendChild(option);
  }
}

function populateVerbPicker(tense) {
  const reflexiveSource = verbs.filter((verb) => verb.is_reflexive === true);
  const completeVerbs = listVerbsForTense(reflexiveSource, tense).filter(
    (verb) => verb.isComplete
  );
  const scopedVerbs = scopedInfinitives
    ? completeVerbs.filter((verb) => scopedInfinitives.includes(verb.infinitive))
    : completeVerbs;
  const defaultSelection =
    scopedInfinitives ?? completeVerbs.map((verb) => verb.infinitive);

  verbPicker.setVerbItems(
    scopedVerbs.map((verb) => ({
      id: verb.infinitive,
      label: `${verb.infinitive} · ${getFrequencyBadge(verb).toLowerCase()}`,
      frequency: getVerbFrequency(verb),
    })),
    intersectWithExamScope(activeSettings.infinitives) ??
      defaultSelection.filter((infinitive) =>
        scopedVerbs.some((verb) => verb.infinitive === infinitive)
      )
  );
}

function beginSession() {
  activeSettings = normalizeReflexiveSettings(readSettingsFromForm(), DEFAULT_SETTINGS);
  activeSettings.inputMode =
    activeSettings.inputMode === "reveal" ? "reveal" : "type";
  savePracticeSettings(settingsStorageKey, activeSettings);

  const reflexiveVerbs = verbs.filter((verb) => verb.is_reflexive === true);
  const deck = buildVerbDrillDeck(reflexiveVerbs, getDrillOptions(), {
    drillStyle: activeSettings.drillStyle,
    cardOrder: activeSettings.cardOrder,
  });
  drillRunner = createDrillRunner(deck, activeSettings.cardOrder);

  if (deck.length === 0) {
    alert("No reflexive verbs match these settings. Widen your filters and try again.");
    return;
  }

  configureDrillUi({
    mode: "reflexive",
    practiceInputMode: activeSettings.inputMode,
    showStemHints: activeSettings.stemHints,
    statsRefreshFn: () => statsUi.refreshChip(),
    verbPeekSyncFn: syncVerbPeekTrigger,
    sessionChrome: {
      statsToggleEl: statsToggle,
      sessionBarEl,
      sessionEl,
    },
  });
  hideSettingsOverlay(overlayEl, sessionEl);
  showNextCard();
}

function wireSettingsListeners() {
  tenseSelect.addEventListener("change", () => {
    populateVerbPicker(tenseSelect.value);
  });

  pronounFilters.addEventListener("change", () => {
    verbPicker.updateToggleLabel();
  });
}

function configureExamChrome() {
  if (!isExamMode || !examContext || !examReflexives) {
    return;
  }

  document.title = `${examReflexives.label} · ${examContext.label}`;
  pageTitleEl.textContent = examContext.label;
  examScopeBannerEl.hidden = false;
  examScopeBannerEl.textContent = `${examReflexives.label} · ${scopedInfinitives.length} verbs in scope`;
  settingsIntroEl.textContent =
    "Exam-scoped reflexive practice. Answers include the reflexive pronoun (e.g. me lavo).";
  initSmartBackLink(backLinkEl, {
    fallbackHref: "exam.html",
    fallbackLabel: "← Exam Practice",
  });
}

function configureMainChrome() {
  if (isExamMode) {
    return;
  }

  initSmartBackLink(backLinkEl, {
    fallbackHref: "index.html",
    fallbackLabel: "← Home",
  });
}

async function initExamScope() {
  if (!isExamMode) {
    return;
  }

  examContext = await loadExamById(examId);
  examReflexives = getExamReflexives(examContext);
  scopedInfinitives = [...examReflexives.infinitives];
  settingsStorageKey = examReflexiveSettingsKey(examId);
  const examDefaults = {
    ...DEFAULT_SETTINGS,
    infinitives: scopedInfinitives,
  };
  const loadedSettings = loadPracticeSettings(settingsStorageKey, examDefaults);
  activeSettings = normalizeReflexiveSettings(loadedSettings, examDefaults);
  activeSettings.infinitives = resolveInfinitivesForDrill(activeSettings.infinitives);
  saveSettingsIfRepaired(
    settingsStorageKey,
    loadedSettings,
    activeSettings,
    savePracticeSettings
  );
  configureExamChrome();
}

async function init() {
  try {
    resetSessionStats("reflexive");

    statsUi = initStatsUi({
      mode: "reflexive",
      modeLabel: "Reflexive",
      toggleEl: statsToggle,
      modalEl: statsModal,
      modalBodyEl: statsModalBody,
      closeEl: statsModalClose,
    });

    verbPicker = initVerbPicker({
      toggleEl: verbPickerToggle,
      modalEl: verbPickerModal,
      listEl: verbFilters,
      doneBtn: verbPickerDoneBtn,
      selectAllBtn: verbSelectAllBtn,
      selectCoreBtn: verbSelectCoreBtn,
      selectCommonBtn: verbSelectCommonBtn,
      clearAllBtn: verbClearAllBtn,
      countMatchingVerbs: countMatchingVerbsFromForm,
      itemLabel: "reflexive verbs",
    });

    verbDetailModal = initVerbDetailModal({
      modalEl: verbDetailModalEl,
      bodyEl: verbDetailBody,
      closeEl: verbDetailClose,
    });

    cardEl.addEventListener("click", (event) => {
      const trigger = event.target.closest(".verb-peek-trigger");
      if (!trigger || trigger.disabled) {
        return;
      }
      openCurrentVerbDetail();
    });

    initDrillActionHandlers(drillUi, showNextCard);

    const data = await loadAllData();
    verbs = data.verbs;
    await initExamScope();
    configureMainChrome();
    const normalizeDefaults = scopedInfinitives
      ? { ...DEFAULT_SETTINGS, infinitives: scopedInfinitives }
      : DEFAULT_SETTINGS;
    const loadedSettings = loadPracticeSettings(settingsStorageKey, normalizeDefaults);
    activeSettings = normalizeReflexiveSettings(activeSettings, normalizeDefaults);
    saveSettingsIfRepaired(
      settingsStorageKey,
      loadedSettings,
      activeSettings,
      savePracticeSettings
    );
    verbByInfinitive.clear();
    for (const verb of verbs) {
      verbByInfinitive.set(verb.infinitive, verb);
    }

    populateTenseSelect();
    populateCheckboxGroup(
      pronounFilters,
      PRONOUN_KEYS.map((id) => ({
        id,
        label: PRONOUN_LABELS[id],
        note: getConjugationDialectNote(id) ? "not active Rioplatense" : null,
      })),
      "pronoun",
      activeSettings.pronouns
    );
    populateVerbPicker(activeSettings.tense);
    applySettingsToForm(activeSettings);
    wireSettingsListeners();
    statsUi.refreshChip();
    showSettingsOverlay(overlayEl, sessionEl);
  } catch (error) {
    startBtn.disabled = true;
    startBtn.insertAdjacentText(
      "beforebegin",
      `Data load failed: ${error.message}.${getFileProtocolHint()}`
    );
  }
}

startBtn.addEventListener("click", beginSession);
changeSettingsBtn.addEventListener("click", () => {
  applySettingsToForm(activeSettings);
  showSettingsOverlay(overlayEl, sessionEl);
});

init();
