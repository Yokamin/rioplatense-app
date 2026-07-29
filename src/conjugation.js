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
import { getConjugationDialectNote } from "./rioplatense-notes.js";
import { getExamPreset, loadExamById } from "./exam-loader.js";
import {
  loadPracticeSettings,
  savePracticeSettings,
  SETTINGS_KEYS,
  examConjugationSettingsKey,
} from "./settings-storage.js";
import { t } from "./i18n/index.js";
import {
  tExamPresetLabel,
  tExamSnapshotLabel,
} from "./localized-data.js";
import { setupPageLocale } from "./page-locale.js";
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
  getTenseOptions,
  getVerbTypeGroups,
  hideSettingsOverlay,
  initDrillActionHandlers,
  populateCheckboxGroup,
  relocalizeActiveDrill,
  renderDrillCard,
  resetAnswerUi,
  setCardOrderOnForm,
  setCheckedValues,
  setDrillStyleOnForm,
  setPracticeInputMode,
  showSettingsOverlay,
  allVerbTypeIds,
  expandVerbTypeGroups,
  getCardOrderFromForm,
  getDrillStyleFromForm,
  getStemHintsFromForm,
  setStemHintsOnForm,
  verbTypesToGroupSelection,
} from "./ui-helpers.js";
import { getFrequencyBadge, getVerbFrequency } from "./verb-frequency.js";
import { initVerbDetailModal } from "./verb-detail-modal.js";
import { initVerbPicker } from "./verb-picker.js";
import { initSmartBackLink } from "./navigation.js";
import {
  normalizeConjugationSettings,
  saveSettingsIfRepaired,
} from "./practice-settings.js";

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
const verbTypeFilters = document.getElementById("verb-type-filters");
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
const presetId = urlParams.get("preset");
const isExamMode = Boolean(examId && presetId);

const DEFAULT_SETTINGS = {
  tense: DEFAULT_TENSE,
  types: allVerbTypeIds(),
  pronouns: [...PRONOUN_KEYS],
  infinitives: null,
  inputMode: "type",
  drillStyle: "per_verb",
  cardOrder: "deck",
  stemHints: true,
};

let examContext = null;
let examPreset = null;
let scopedInfinitives = null;
let settingsStorageKey = SETTINGS_KEYS.conjugation;

let verbs = [];
let activeSettings = normalizeConjugationSettings(
  loadPracticeSettings(settingsStorageKey, DEFAULT_SETTINGS),
  DEFAULT_SETTINGS
);
let statsUi = null;
let verbPicker = null;
let verbDetailModal = null;
let drillRunner = null;
let backLinkRefresh = null;
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
    types: expandVerbTypeGroups(getCheckedValues(verbTypeFilters)),
    pronouns: getCheckedValues(pronounFilters),
    infinitives: intersectWithExamScope(verbPicker.readSelectionForSettings()),
    inputMode: getSelectedPracticeInputMode(settingsFormEl),
    drillStyle: getDrillStyleFromForm(settingsFormEl),
    cardOrder: getCardOrderFromForm(settingsFormEl),
    stemHints: getStemHintsFromForm(settingsFormEl),
  };
}

function applySettingsToForm(settings) {
  const normalized = normalizeConjugationSettings(settings, DEFAULT_SETTINGS);

  tenseSelect.value = normalized.tense;
  setCheckedValues(verbTypeFilters, verbTypesToGroupSelection(normalized.types));
  setCheckedValues(pronounFilters, normalized.pronouns);
  setPracticeInputMode(settingsFormEl, normalized.inputMode ?? "type");
  setDrillStyleOnForm(settingsFormEl, normalized.drillStyle);
  setCardOrderOnForm(settingsFormEl, normalized.cardOrder);
  setStemHintsOnForm(settingsFormEl, normalized.stemHints);
  populateVerbPicker(normalized.tense);
  verbPicker.applySelection(normalized.infinitives);
}

function normalizeDrillOptions({
  tense,
  types,
  pronouns,
  infinitives,
}) {
  return {
    tense,
    types: types?.length > 0 ? types : null,
    pronouns: pronouns?.length > 0 ? pronouns : PRONOUN_KEYS,
    infinitives,
    reflexiveOnly: false,
  };
}

function countMatchingVerbsFromForm(_selectedIds, infinitives) {
  return countEligibleVerbs(
    verbs,
    normalizeDrillOptions({
      tense: tenseSelect.value,
      types: expandVerbTypeGroups(getCheckedValues(verbTypeFilters)),
      pronouns: getCheckedValues(pronounFilters),
      infinitives: resolveInfinitivesForDrill(infinitives),
    })
  );
}

function getDrillOptions(settings = activeSettings) {
  return normalizeDrillOptions({
    ...settings,
    infinitives: resolveInfinitivesForDrill(settings.infinitives),
  });
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
  for (const tense of getTenseOptions()) {
    const option = document.createElement("option");
    option.value = tense.id;
    option.textContent = tense.label;
    tenseSelect.appendChild(option);
  }
}

function populateVerbPicker(tense) {
  const completeVerbs = listVerbsForTense(verbs, tense, { reflexiveOnly: false }).filter(
    (verb) => verb.isComplete
  );
  const scopedVerbs = scopedInfinitives
    ? completeVerbs.filter((verb) => scopedInfinitives.includes(verb.infinitive))
    : completeVerbs;
  const defaultSelection = scopedInfinitives ?? completeVerbs.map((verb) => verb.infinitive);

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
  activeSettings = normalizeConjugationSettings(readSettingsFromForm(), DEFAULT_SETTINGS);
  activeSettings.inputMode =
    activeSettings.inputMode === "reveal" ? "reveal" : "type";
  savePracticeSettings(settingsStorageKey, activeSettings);

  const deck = buildVerbDrillDeck(verbs, getDrillOptions(), {
    drillStyle: activeSettings.drillStyle,
    cardOrder: activeSettings.cardOrder,
  });
  drillRunner = createDrillRunner(deck, activeSettings.cardOrder);

  if (deck.length === 0) {
    startBtn.disabled = false;
    alert(t("drill.noVerbsMatch"));
    return;
  }

  configureDrillUi({
    mode: "conjugation",
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

function refreshFilterDependentUi() {
  verbPicker.updateToggleLabel();
}

function wireSettingsListeners() {
  tenseSelect.addEventListener("change", () => {
    populateVerbPicker(tenseSelect.value);
  });

  verbTypeFilters.addEventListener("change", refreshFilterDependentUi);
  pronounFilters.addEventListener("change", refreshFilterDependentUi);
}

function configureExamChrome() {
  if (!isExamMode || !examContext || !examPreset) {
    return;
  }

  const examLabel = tExamSnapshotLabel(examContext);
  const presetLabel = tExamPresetLabel(examPreset);
  document.title = `${presetLabel} · ${examLabel}`;
  pageTitleEl.textContent = examLabel;
  examScopeBannerEl.hidden = false;
  examScopeBannerEl.textContent = t("drill.examScopeBanner", {
    presetLabel,
    count: scopedInfinitives.length,
  });
  settingsIntroEl.textContent = t("settings.examConjugationIntro");
  backLinkRefresh = initSmartBackLink(backLinkEl, {
    fallbackHref: "exam.html",
    fallbackLabelKey: "nav.examPractice",
  }).refresh;
}

function configureMainChrome() {
  if (isExamMode) {
    return;
  }

  backLinkRefresh = initSmartBackLink(backLinkEl, {
    fallbackHref: "index.html",
  }).refresh;
}

async function initExamScope() {
  if (!isExamMode) {
    return;
  }

  if (!examId || !presetId) {
    throw new Error("Exam mode requires both exam and preset URL parameters.");
  }

  examContext = await loadExamById(examId);
  examPreset = getExamPreset(examContext, presetId);
  scopedInfinitives = [...examPreset.infinitives];
  settingsStorageKey = examConjugationSettingsKey(examId, presetId);
  const examDefaults = {
    ...DEFAULT_SETTINGS,
    infinitives: scopedInfinitives,
  };
  const loadedSettings = loadPracticeSettings(settingsStorageKey, examDefaults);
  activeSettings = normalizeConjugationSettings(loadedSettings, examDefaults);
  activeSettings.infinitives = resolveInfinitivesForDrill(activeSettings.infinitives);
  saveSettingsIfRepaired(
    settingsStorageKey,
    loadedSettings,
    activeSettings,
    savePracticeSettings
  );
  configureExamChrome();
}

function refreshLocalizedUi() {
  populateTenseSelect();
  populateCheckboxGroup(
    verbTypeFilters,
    getVerbTypeGroups(),
    "verb-type-group",
    verbTypesToGroupSelection(activeSettings.types)
  );
  populateCheckboxGroup(
    pronounFilters,
    PRONOUN_KEYS.map((id) => ({
      id,
      label: PRONOUN_LABELS[id],
      note: getConjugationDialectNote(id) ? t("pronoun.notActiveRioplatense") : null,
    })),
    "pronoun",
    activeSettings.pronouns
  );
  verbPicker?.refreshLabels();
  relocalizeActiveDrill(drillUi);
  statsUi?.refreshLocalized();
  if (isExamMode && examContext && examPreset) {
    configureExamChrome();
  } else {
    backLinkRefresh?.();
  }
}

async function init() {
  try {
    resetSessionStats("conjugation");

    statsUi = initStatsUi({
      mode: "conjugation",
      modeLabelKey: "stats.modeConjugation",
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
    activeSettings = normalizeConjugationSettings(activeSettings, normalizeDefaults);
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
      verbTypeFilters,
      getVerbTypeGroups(),
      "verb-type-group",
      verbTypesToGroupSelection(activeSettings.types)
    );
    populateCheckboxGroup(
      pronounFilters,
      PRONOUN_KEYS.map((id) => ({
        id,
        label: PRONOUN_LABELS[id],
        note: getConjugationDialectNote(id) ? t("pronoun.notActiveRioplatense") : null,
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
      t("error.dataLoadFailed", {
        message: error.message,
        fileProtocolHint: getFileProtocolHint(),
      })
    );
  }
}

startBtn.addEventListener("click", beginSession);
changeSettingsBtn.addEventListener("click", () => {
  applySettingsToForm(activeSettings);
  showSettingsOverlay(overlayEl, sessionEl);
});

setupPageLocale({
  titleKey: isExamMode ? null : "page.title.conjugation",
  onChange: refreshLocalizedUi,
});

init();
