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
  pickRandomVerbCard,
} from "./card-picker.js";
import { getConjugationDialectNote } from "./rioplatense-notes.js";
import {
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
  setCheckedValues,
  setPracticeInputMode,
  showSettingsOverlay,
  TENSE_OPTIONS,
  VERB_TYPE_GROUPS,
  allVerbTypeIds,
  expandVerbTypeGroups,
  verbTypesToGroupSelection,
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

const DEFAULT_SETTINGS = {
  tense: DEFAULT_TENSE,
  types: allVerbTypeIds(),
  pronouns: [...PRONOUN_KEYS],
  infinitives: null,
  inputMode: "type",
};

let verbs = [];
let activeSettings = loadPracticeSettings(SETTINGS_KEYS.conjugation, DEFAULT_SETTINGS);
let statsUi = null;
let verbPicker = null;
let verbDetailModal = null;
const verbByInfinitive = new Map();

const drillUi = {
  answerForm,
  answerInput,
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
    pronoun: card.pronoun,
  });
}

function readSettingsFromForm() {
  return {
    tense: tenseSelect.value,
    types: expandVerbTypeGroups(getCheckedValues(verbTypeFilters)),
    pronouns: getCheckedValues(pronounFilters),
    infinitives: verbPicker.readSelectionForSettings(),
    inputMode: getSelectedPracticeInputMode(settingsFormEl),
  };
}

function applySettingsToForm(settings) {
  tenseSelect.value = settings.tense;
  setCheckedValues(verbTypeFilters, verbTypesToGroupSelection(settings.types));
  setCheckedValues(pronounFilters, settings.pronouns);
  setPracticeInputMode(settingsFormEl, settings.inputMode ?? "type");
  populateVerbPicker(settings.tense);
  verbPicker.applySelection(settings.infinitives);
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
  };
}

function countMatchingVerbsFromForm(_selectedIds, infinitives) {
  return countEligibleVerbs(
    verbs,
    normalizeDrillOptions({
      tense: tenseSelect.value,
      types: expandVerbTypeGroups(getCheckedValues(verbTypeFilters)),
      pronouns: getCheckedValues(pronounFilters),
      infinitives,
    })
  );
}

function getDrillOptions(settings = activeSettings) {
  return normalizeDrillOptions(settings);
}

function showNextCard() {
  const card = pickRandomVerbCard(verbs, getDrillOptions());
  const hasCard = renderDrillCard(
    cardEl,
    metaEl,
    dialectWarningEl,
    card,
    PRONOUN_CARD_LABELS,
    activeSettings.inputMode
  );
  resetAnswerUi(drillUi);
  applyPracticeInputMode(activeSettings.inputMode, drillUi);

  if (hasCard && activeSettings.inputMode === "type") {
    answerInput.focus();
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
  const completeVerbs = listVerbsForTense(verbs, tense).filter(
    (verb) => verb.isComplete
  );

  verbPicker.setVerbItems(
    completeVerbs.map((verb) => ({
      id: verb.infinitive,
      label: `${verb.infinitive} · ${getFrequencyBadge(verb).toLowerCase()}`,
      frequency: getVerbFrequency(verb),
    })),
    activeSettings.infinitives ??
      completeVerbs.map((verb) => verb.infinitive)
  );
}

function beginSession() {
  activeSettings = readSettingsFromForm();
  activeSettings.inputMode =
    activeSettings.inputMode === "reveal" ? "reveal" : "type";
  savePracticeSettings(SETTINGS_KEYS.conjugation, activeSettings);
  configureDrillUi({
    mode: "conjugation",
    practiceInputMode: activeSettings.inputMode,
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

async function init() {
  try {
    resetSessionStats("conjugation");

    statsUi = initStatsUi({
      mode: "conjugation",
      modeLabel: "Conjugation",
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
    verbByInfinitive.clear();
    for (const verb of verbs) {
      verbByInfinitive.set(verb.infinitive, verb);
    }

    populateTenseSelect();
    populateCheckboxGroup(
      verbTypeFilters,
      VERB_TYPE_GROUPS,
      "verb-type-group",
      verbTypesToGroupSelection(activeSettings.types)
    );
    populateCheckboxGroup(
      pronounFilters,
      PRONOUN_KEYS.map((id) => ({
        id,
        label: PRONOUN_LABELS[id],
        note: getConjugationDialectNote(id) ? "not active Rioplatense" : null,
      })),
      "pronoun",
      activeSettings.pronouns?.length ? activeSettings.pronouns : [...PRONOUN_KEYS]
    );
    populateVerbPicker(activeSettings.tense);
    applySettingsToForm({
      ...DEFAULT_SETTINGS,
      ...activeSettings,
      pronouns: activeSettings.pronouns?.length
        ? activeSettings.pronouns
        : [...PRONOUN_KEYS],
    });
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
