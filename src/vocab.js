import { loadAllData } from "./data-loader.js";
import {
  listVocabCategories,
  pickRandomVocabCard,
} from "./card-picker.js";
import {
  loadPracticeSettings,
  savePracticeSettings,
  SETTINGS_KEYS,
} from "./settings-storage.js";
import { initStatsUi } from "./stats-ui.js";
import { resetSessionStats } from "./stats-storage.js";
import {
  applyPracticeInputMode,
  configureDrillUi,
  getCheckedValues,
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
} from "./ui-helpers.js";

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
const categoryFilters = document.getElementById("category-filters");
const statsToggle = document.getElementById("stats-toggle");
const statsModal = document.getElementById("stats-modal");
const statsModalBody = document.getElementById("stats-modal-body");
const statsModalClose = document.getElementById("stats-modal-close");

const DEFAULT_SETTINGS = {
  categoryIds: [],
  inputMode: "type",
};

let vocab = null;
let activeSettings = loadPracticeSettings(SETTINGS_KEYS.vocab, DEFAULT_SETTINGS);
let statsUi = null;

const drillUi = {
  answerForm,
  answerInput,
  feedbackEl,
  primaryBtn,
  revealBtn,
  secondaryActionsEl,
};

function getAvailableCategories() {
  return listVocabCategories(vocab).filter((category) => category.itemCount > 0);
}

function readSettingsFromForm() {
  const categoryIds = getCheckedValues(categoryFilters);
  const allCategories = getAvailableCategories().map((category) => category.id);

  return {
    categoryIds:
      categoryIds.length === allCategories.length || categoryIds.length === 0
        ? allCategories
        : categoryIds,
    inputMode: getSelectedPracticeInputMode(settingsFormEl),
  };
}

function applySettingsToForm(settings) {
  const categories = getAvailableCategories();
  const selectedIds =
    settings.categoryIds.length > 0
      ? settings.categoryIds
      : categories.map((category) => category.id);

  setCheckedValues(categoryFilters, selectedIds);
  setPracticeInputMode(settingsFormEl, settings.inputMode ?? "type");
}

function showNextCard() {
  const card = pickRandomVocabCard(vocab, activeSettings.categoryIds);
  const hasCard = renderDrillCard(
    cardEl,
    metaEl,
    dialectWarningEl,
    card,
    {},
    activeSettings.inputMode
  );
  resetAnswerUi(drillUi);
  applyPracticeInputMode(activeSettings.inputMode, drillUi);

  if (hasCard && activeSettings.inputMode === "type") {
    answerInput.focus();
  }
}

function populateCategoryFilters() {
  const categories = getAvailableCategories();

  populateCheckboxGroup(
    categoryFilters,
    categories.map((category) => ({
      id: category.id,
      label: `${category.displayName} (${category.itemCount})`,
    })),
    "category",
    activeSettings.categoryIds.length > 0
      ? activeSettings.categoryIds
      : categories.map((category) => category.id)
  );
}

function beginSession() {
  activeSettings = readSettingsFromForm();
  activeSettings.inputMode =
    activeSettings.inputMode === "reveal" ? "reveal" : "type";
  savePracticeSettings(SETTINGS_KEYS.vocab, activeSettings);
  configureDrillUi({
    mode: "vocab",
    practiceInputMode: activeSettings.inputMode,
    statsRefreshFn: () => statsUi.refreshChip(),
    sessionChrome: {
      statsToggleEl: statsToggle,
      sessionBarEl,
      sessionEl,
    },
  });
  hideSettingsOverlay(overlayEl, sessionEl);
  showNextCard();
}

async function init() {
  try {
    resetSessionStats("vocab");

    statsUi = initStatsUi({
      mode: "vocab",
      modeLabel: "Vocabulary",
      toggleEl: statsToggle,
      modalEl: statsModal,
      modalBodyEl: statsModalBody,
      closeEl: statsModalClose,
    });

    initDrillActionHandlers(drillUi, showNextCard);

    const data = await loadAllData();
    vocab = data.vocab;

    if (activeSettings.categoryIds.length === 0) {
      activeSettings.categoryIds = getAvailableCategories().map(
        (category) => category.id
      );
    }

    populateCategoryFilters();
    applySettingsToForm(activeSettings);
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
