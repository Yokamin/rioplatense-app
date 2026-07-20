import { ANSWER_FEEDBACK, evaluateAnswer } from "./answer-check.js";
import { getConjugationDialectNote } from "./rioplatense-notes.js";
import { recordAnswerResult } from "./stats-storage.js";

let currentCard = null;
let answerRevealed = false;
let cardResolved = null;
let currentMode = "conjugation";
let inputMode = "type";
let statsRefresh = null;
let verbPeekSyncFn = null;
let sessionChrome = null;

function isTypedPracticeMode() {
  return inputMode === "type";
}

function recordResultIfTracking(mode, resultType) {
  if (isTypedPracticeMode()) {
    recordAnswerResult(mode, resultType);
  }
}

function normalizeInputMode(mode) {
  return mode === "reveal" ? "reveal" : "type";
}

export function syncDrillSessionChrome() {
  const typed = isTypedPracticeMode();
  const { statsToggleEl, sessionBarEl, sessionEl } = sessionChrome ?? {};

  if (sessionEl) {
    sessionEl.classList.toggle("drill-session--review-only", !typed);
  }

  if (statsToggleEl) {
    statsToggleEl.hidden = !typed;
  }

  if (sessionBarEl) {
    sessionBarEl.classList.toggle("session-bar--review-only", !typed);
  }

  if (typed) {
    statsRefresh?.();
  }
}

function canAdvanceCard() {
  return (
    cardResolved === "exact" ||
    cardResolved === "accent" ||
    cardResolved === "revealed"
  );
}

export function canPeekVerbDetail() {
  return canAdvanceCard() && currentCard?.type === "verb";
}

export function getCurrentDrillCard() {
  return currentCard;
}

export function syncDrillActions(ui) {
  const {
    primaryBtn,
    secondaryActionsEl,
    revealBtn,
    answerForm,
    answerInput,
  } = ui;

  if (!primaryBtn) {
    return;
  }

  if (!currentCard) {
    primaryBtn.hidden = true;
    if (secondaryActionsEl) {
      secondaryActionsEl.hidden = true;
    }
    return;
  }

  primaryBtn.hidden = false;
  primaryBtn.disabled = false;

  if (canAdvanceCard()) {
    primaryBtn.textContent = "Next Card";
    primaryBtn.dataset.action = "next";
    if (answerInput) {
      answerInput.disabled = true;
    }
    if (secondaryActionsEl) {
      secondaryActionsEl.hidden = true;
    }
    if (answerForm) {
      answerForm.hidden = inputMode !== "type";
    }
    verbPeekSyncFn?.();
    return;
  }

  if (inputMode === "reveal") {
    if (answerForm) {
      answerForm.hidden = true;
    }
    primaryBtn.textContent = "Reveal Answer";
    primaryBtn.dataset.action = "reveal";
    if (secondaryActionsEl) {
      secondaryActionsEl.hidden = true;
    }
    verbPeekSyncFn?.();
    return;
  }

  if (answerForm) {
    answerForm.hidden = false;
  }
  if (answerInput) {
    answerInput.disabled = false;
  }
  primaryBtn.textContent = "Check";
  primaryBtn.dataset.action = "check";
  if (secondaryActionsEl) {
    secondaryActionsEl.hidden = false;
  }
  if (revealBtn) {
    revealBtn.hidden = false;
    revealBtn.disabled = false;
    revealBtn.textContent = "Reveal Answer";
  }
  verbPeekSyncFn?.();
}

export function initDrillActionHandlers(ui, onNextCard) {
  const { answerForm, primaryBtn } = ui;

  answerForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (primaryBtn?.dataset.action === "check") {
      checkTypedAnswer(ui);
    }
  });

  primaryBtn?.addEventListener("click", () => {
    const action = primaryBtn.dataset.action;

    if (action === "check") {
      checkTypedAnswer(ui);
      return;
    }

    if (action === "reveal") {
      revealAnswer(ui);
      return;
    }

    if (action === "next") {
      onNextCard();
    }
  });

  ui.revealBtn?.addEventListener("click", () => revealAnswer(ui));
}

export function configureDrillUi({
  mode,
  practiceInputMode,
  statsRefreshFn,
  verbPeekSyncFn: peekSyncFn,
  sessionChrome: chrome,
}) {
  currentMode = mode;
  inputMode = normalizeInputMode(practiceInputMode);
  statsRefresh = statsRefreshFn ?? null;
  verbPeekSyncFn = peekSyncFn ?? null;
  if (chrome) {
    sessionChrome = chrome;
  }
  syncDrillSessionChrome();
}

export function updateStatsDisplay() {
  if (isTypedPracticeMode()) {
    statsRefresh?.();
  }
}

export function getFileProtocolHint() {
  return window.location.protocol === "file:"
    ? " Open via a local server (e.g. python3 -m http.server) — fetch does not work from file://."
    : "";
}

export function setStatus(statusEl, message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

export function showSettingsOverlay(overlayEl, sessionEl) {
  overlayEl.hidden = false;
  sessionEl.hidden = true;
}

export function hideSettingsOverlay(overlayEl, sessionEl) {
  overlayEl.hidden = true;
  sessionEl.hidden = false;
}

export function renderDrillCard(
  cardEl,
  metaEl,
  dialectWarningEl,
  card,
  pronounLabels,
  practiceInputMode = inputMode
) {
  currentCard = card;
  answerRevealed = false;
  cardResolved = null;

  if (dialectWarningEl) {
    dialectWarningEl.hidden = true;
    dialectWarningEl.textContent = "";
  }

  if (!card) {
    cardEl.innerHTML = "<p>No cards match the current settings.</p>";
    metaEl.textContent = "Open settings and widen your filters.";
    return false;
  }

  if (card.type === "vocab") {
    cardEl.innerHTML = `
      <p class="card-label">Vocabulary</p>
      <p class="card-prompt">${escapeHtml(card.prompt)}</p>
      <p class="card-hint">Category: ${escapeHtml(card.categoryName)}</p>
    `;
    metaEl.textContent =
      practiceInputMode === "type"
        ? `Type the Spanish word for "${card.english}".`
        : `Recall the Spanish word for "${card.english}", then reveal when ready.`;
  } else {
    cardEl.innerHTML = `
      <p class="card-label">Verb · ${escapeHtml(card.tense.replace(/_/g, " "))}</p>
      <p class="card-prompt">
        <button type="button" class="verb-peek-trigger" disabled aria-label="View full conjugation table (available after answering)">
          ${escapeHtml(card.infinitive)}
        </button>
        · ${escapeHtml(pronounLabels[card.pronoun])}
      </p>
      <p class="card-hint">${escapeHtml(card.english)}</p>
    `;
    metaEl.textContent =
      practiceInputMode === "type"
        ? card.note ?? "Type the conjugated form."
        : card.note ?? "Conjugate mentally, then reveal when ready.";

    const dialectNote = getConjugationDialectNote(card.pronoun);
    if (dialectNote && dialectWarningEl) {
      dialectWarningEl.hidden = false;
      dialectWarningEl.textContent = `Note: ${dialectNote}`;
    }
  }

  return true;
}

export function applyPracticeInputMode(practiceInputMode, ui) {
  inputMode = normalizeInputMode(practiceInputMode);

  if (ui.answerInput) {
    ui.answerInput.value = "";
  }

  if (ui.answerForm) {
    ui.answerForm.hidden = !isTypedPracticeMode();
  }

  if (ui.secondaryActionsEl) {
    ui.secondaryActionsEl.hidden = !isTypedPracticeMode();
  }

  syncDrillActions(ui);
  syncDrillSessionChrome();
}

export function resetAnswerUi(ui) {
  cardResolved = null;
  answerRevealed = false;

  if (ui.answerInput) {
    ui.answerInput.value = "";
    ui.answerInput.disabled = false;
  }

  if (ui.feedbackEl) {
    ui.feedbackEl.hidden = true;
    ui.feedbackEl.className = "answer-feedback";
    ui.feedbackEl.textContent = "";
  }

  syncDrillActions(ui);
}

function applyFeedback(ui, tier) {
  const { feedbackEl, answerInput } = ui;
  const feedback = ANSWER_FEEDBACK[tier];
  feedbackEl.hidden = false;
  feedbackEl.className = `answer-feedback ${feedback.className}`;

  if (tier === "accent") {
    feedbackEl.textContent = `${feedback.message} ${currentCard.answer}`;
    cardResolved = "accent";
    recordResultIfTracking(currentMode, "accent");
  } else if (tier === "exact") {
    feedbackEl.textContent = feedback.message;
    cardResolved = "exact";
    recordResultIfTracking(currentMode, "exact");
  } else {
    feedbackEl.textContent = feedback.message;
  }

  syncDrillActions(ui);
  updateStatsDisplay();
}

export function checkTypedAnswer(ui) {
  if (!currentCard || canAdvanceCard()) {
    return;
  }

  const tier = evaluateAnswer(ui.answerInput.value, currentCard.answer);

  if (tier === "empty") {
    applyFeedback(ui, "empty");
    return;
  }

  if (tier === "wrong") {
    applyFeedback(ui, "wrong");
    recordResultIfTracking(currentMode, "wrong");
    return;
  }

  applyFeedback(ui, tier);
}

export function revealAnswer(ui) {
  if (!currentCard || canAdvanceCard()) {
    return;
  }

  ui.feedbackEl.hidden = false;
  ui.feedbackEl.classList.remove("is-correct", "is-accent", "is-incorrect");
  ui.feedbackEl.classList.add("is-revealed");
  ui.feedbackEl.textContent = `Answer: ${currentCard.answer}`;

  if (cardResolved !== "revealed") {
    cardResolved = "revealed";
    recordResultIfTracking(currentMode, "revealed");
    updateStatsDisplay();
  }

  syncDrillActions(ui);
}

export function populateCheckboxGroup(container, items, name, selectedIds = null) {
  container.innerHTML = "";

  for (const item of items) {
    const label = document.createElement("label");
    label.className = "checkbox-label";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = name;
    input.value = item.id;
    input.checked = selectedIds === null || selectedIds.includes(item.id);

    label.appendChild(input);
    label.appendChild(document.createTextNode(` ${item.label}`));

    if (item.note) {
      const note = document.createElement("span");
      note.className = "checkbox-note";
      note.textContent = ` — ${item.note}`;
      label.appendChild(note);
    }

    container.appendChild(label);
  }
}

export function getCheckedValues(container) {
  return Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map(
    (input) => input.value
  );
}

export function setCheckedValues(container, selectedIds) {
  const selected = new Set(selectedIds);
  for (const input of container.querySelectorAll('input[type="checkbox"]')) {
    input.checked = selected.has(input.value);
  }
}

export function getSelectedPracticeInputMode(formEl) {
  const selected = formEl.querySelector('input[name="input-mode"]:checked');
  return selected?.value === "reveal" ? "reveal" : "type";
}

export function setPracticeInputMode(formEl, mode) {
  const value = mode === "reveal" ? "reveal" : "type";
  for (const input of formEl.querySelectorAll('input[name="input-mode"]')) {
    input.checked = input.value === value;
  }
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export const VERB_TYPES = [
  { id: "regular_ar", label: "Regular -ar" },
  { id: "regular_er", label: "Regular -er" },
  { id: "regular_ir", label: "Regular -ir" },
  { id: "stem_changer_e_ie", label: "Stem-changing (e → ie)" },
  { id: "stem_changer_o_ue", label: "Stem-changing (o → ue)" },
  { id: "stem_changer_e_i", label: "Stem-changing (e → i)" },
  { id: "irregular", label: "Irregular" },
  { id: "unknown", label: "Unknown / draft" },
];

/** Simplified conjugation settings groups (each maps to one or more VERB_TYPES ids). */
export const VERB_TYPE_GROUPS = [
  {
    id: "regular",
    label: "Regular (-ar, -er, -ir)",
    types: ["regular_ar", "regular_er", "regular_ir"],
  },
  {
    id: "stem_changing",
    label: "Stem-changing",
    types: ["stem_changer_e_ie", "stem_changer_o_ue", "stem_changer_e_i"],
  },
  { id: "irregular", label: "Irregular", types: ["irregular"] },
  { id: "unknown", label: "Unknown / draft", types: ["unknown"] },
];

export function allVerbTypeIds() {
  return VERB_TYPES.map((type) => type.id);
}

export function expandVerbTypeGroups(selectedGroupIds) {
  const types = [];

  for (const group of VERB_TYPE_GROUPS) {
    if (selectedGroupIds.includes(group.id)) {
      types.push(...group.types);
    }
  }

  return types;
}

/** Map stored granular type ids to grouped checkbox ids for the settings UI. */
export function verbTypesToGroupSelection(typeIds) {
  const selected = new Set(typeIds ?? []);

  return VERB_TYPE_GROUPS.filter((group) =>
    group.types.some((typeId) => selected.has(typeId))
  ).map((group) => group.id);
}

export const TENSE_OPTIONS = [{ id: "present_tense", label: "Present tense" }];

export const PRACTICE_INPUT_MODES = [
  { id: "type", label: "Type answers (recommended)" },
  { id: "reveal", label: "Reveal only (no typing, no stats)" },
];
