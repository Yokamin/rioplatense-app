import { ANSWER_FEEDBACK, evaluateAnswer } from "./answer-check.js";
import { formatStemChangeHint, getStemChangeHint } from "./stem-hints.js";
import { getConjugationDialectNote } from "./rioplatense-notes.js";
import { recordAnswerResult } from "./stats-storage.js";

let currentCard = null;
let answerRevealed = false;
let cardResolved = null;
let currentMode = "conjugation";
let inputMode = "type";
let showStemHints = true;
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
  return (
    canAdvanceCard() &&
    (currentCard?.type === "verb" ||
      currentCard?.type === "reflexive" ||
      currentCard?.type === "verb_table" ||
      currentCard?.type === "reflexive_table")
  );
}

function isTableDrillCard(card) {
  return card?.drillFormat === "per_verb";
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
    for (const input of document.querySelectorAll(".conjugation-table-input")) {
      input.disabled = true;
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
    if (ui.tableAnswerFields) {
      ui.tableAnswerFields.hidden = !isTableDrillCard(currentCard);
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
    answerForm.hidden = isTableDrillCard(currentCard);
  }
  if (ui.tableAnswerFields) {
    ui.tableAnswerFields.hidden = !isTableDrillCard(currentCard);
  }
  if (answerInput) {
    answerInput.disabled = false;
  }
  for (const input of ui.tableAnswerFields?.querySelectorAll(".conjugation-table-input") ?? []) {
    input.disabled = false;
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
  showStemHints: stemHintsEnabled = true,
  statsRefreshFn,
  verbPeekSyncFn: peekSyncFn,
  sessionChrome: chrome,
}) {
  currentMode = mode;
  inputMode = normalizeInputMode(practiceInputMode);
  showStemHints = stemHintsEnabled !== false;
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
  practiceInputMode = inputMode,
  drillUi = null,
  deckProgress = null
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
    if (drillUi?.singleAnswerRow) {
      drillUi.singleAnswerRow.hidden = true;
    }
    if (drillUi?.tableAnswerFields) {
      drillUi.tableAnswerFields.hidden = true;
      drillUi.tableAnswerFields.innerHTML = "";
    }
    return false;
  }

  if (drillUi?.singleAnswerRow) {
    drillUi.singleAnswerRow.hidden = isTableDrillCard(card);
  }
  if (drillUi?.tableAnswerFields) {
    drillUi.tableAnswerFields.hidden = !isTableDrillCard(card);
    drillUi.tableAnswerFields.innerHTML = "";
  }

  const progressLine =
    deckProgress && deckProgress.total > 0
      ? ` · ${deckProgress.current} of ${deckProgress.total} in this round`
      : "";

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
  } else if (card.type === "verb_table" || card.type === "reflexive_table") {
    const label =
      card.type === "reflexive_table" ? "Reflexive verb" : "Verb";
    cardEl.innerHTML = `
      <p class="card-label">${label} · ${escapeHtml(card.tense.replace(/_/g, " "))}</p>
      <p class="card-prompt">
        <button type="button" class="verb-peek-trigger" disabled aria-label="View full conjugation table (available after answering)">
          ${escapeHtml(card.infinitive)}
        </button>
      </p>
      <p class="card-hint">${escapeHtml(card.english)}</p>
    `;
    metaEl.textContent =
      practiceInputMode === "type"
        ? `Type every selected pronoun for this verb${progressLine}.`
        : `Conjugate all forms mentally, then reveal when ready${progressLine}.`;

    if (drillUi?.tableAnswerFields) {
      const rows = card.pronouns
        .map((pronoun) => {
          const stemHint = resolveStemHintMarkup(card, { pronoun });
          return `
        <div class="conjugation-table-row">
          <div class="conjugation-table-row-head">
            <label class="conjugation-table-label" for="answer-${pronoun}">${escapeHtml(pronounLabels[pronoun])}</label>
            ${stemHint}
            <span class="conjugation-table-feedback" data-pronoun="${escapeHtml(pronoun)}" hidden></span>
          </div>
          <input
            id="answer-${pronoun}"
            class="conjugation-table-input"
            type="text"
            data-pronoun="${escapeHtml(pronoun)}"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
          />
        </div>`;
        })
        .join("");
      drillUi.tableAnswerFields.innerHTML = rows;
    }
  } else if (card.type === "reflexive") {
    const stemHint = resolveStemHintMarkup(card);
    cardEl.innerHTML = `
      <p class="card-label">Reflexive verb · ${escapeHtml(card.tense.replace(/_/g, " "))}</p>
      <p class="card-prompt">
        <button type="button" class="verb-peek-trigger" disabled aria-label="View full conjugation table (available after answering)">
          ${escapeHtml(card.infinitive)}
        </button>
        · ${escapeHtml(pronounLabels[card.pronoun])}
      </p>
      <p class="card-hint">${escapeHtml(card.english)}</p>
      ${stemHint ? `<p class="card-stem-hint">${stemHint}</p>` : ""}
    `;
    metaEl.textContent =
      practiceInputMode === "type"
        ? "Type the reflexive form (e.g. me lavo)." + progressLine
        : "Conjugate with the reflexive pronoun mentally, then reveal when ready." +
          progressLine;

    const dialectNote = getConjugationDialectNote(card.pronoun);
    if (dialectNote && dialectWarningEl) {
      dialectWarningEl.hidden = false;
      dialectWarningEl.textContent = `Note: ${dialectNote}`;
    }
  } else {
    const stemHint = resolveStemHintMarkup(card);
    cardEl.innerHTML = `
      <p class="card-label">Verb · ${escapeHtml(card.tense.replace(/_/g, " "))}</p>
      <p class="card-prompt">
        <button type="button" class="verb-peek-trigger" disabled aria-label="View full conjugation table (available after answering)">
          ${escapeHtml(card.infinitive)}
        </button>
        · ${escapeHtml(pronounLabels[card.pronoun])}
      </p>
      <p class="card-hint">${escapeHtml(card.english)}</p>
      ${stemHint ? `<p class="card-stem-hint">${stemHint}</p>` : ""}
    `;
    metaEl.textContent =
      practiceInputMode === "type"
        ? (card.note ?? "Type the conjugated form.") + progressLine
        : (card.note ?? "Conjugate mentally, then reveal when ready.") + progressLine;

    const dialectNote = getConjugationDialectNote(card.pronoun);
    if (dialectNote && dialectWarningEl) {
      dialectWarningEl.hidden = false;
      dialectWarningEl.textContent = `Note: ${dialectNote}`;
    }
  }

  return true;
}

function resolveStemHintMarkup(card, { pronoun = null, answer = null } = {}) {
  if (!showStemHints || !card?.verbType) {
    return "";
  }

  const targetPronoun = pronoun ?? card.pronoun;
  const targetAnswer = answer ?? (pronoun ? card.answers?.[pronoun] : card.answer);
  const nosotrosAnswer = card.answers?.nosotros ?? card.referenceAnswer ?? null;
  const label = getStemChangeHint(
    card.verbType,
    targetAnswer,
    targetPronoun,
    nosotrosAnswer
  );
  const text = formatStemChangeHint(label);

  if (!text) {
    return "";
  }

  return `<span class="stem-change-hint">${escapeHtml(text)}</span>`;
}

export function applyPracticeInputMode(practiceInputMode, ui) {
  inputMode = normalizeInputMode(practiceInputMode);

  if (ui.answerInput) {
    ui.answerInput.value = "";
  }

  if (ui.answerForm) {
    ui.answerForm.hidden = !isTypedPracticeMode() || isTableDrillCard(currentCard);
  }

  if (ui.tableAnswerFields) {
    ui.tableAnswerFields.hidden = !currentCard || !isTableDrillCard(currentCard);
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

  if (ui.tableAnswerFields) {
    for (const input of ui.tableAnswerFields.querySelectorAll(".conjugation-table-input")) {
      input.value = "";
      input.disabled = false;
    }
    for (const field of ui.tableAnswerFields.querySelectorAll(".conjugation-table-feedback")) {
      field.hidden = true;
      field.textContent = "";
      field.className = "conjugation-table-feedback";
    }
  }

  if (ui.feedbackEl) {
    ui.feedbackEl.hidden = true;
    ui.feedbackEl.className = "answer-feedback";
    ui.feedbackEl.textContent = "";
  }

  syncDrillActions(ui);
}

function evaluateTableRows(ui, card) {
  const rowResults = [];
  const filledTiers = [];
  let filledCount = 0;

  for (const pronoun of card.pronouns) {
    const input = ui.tableAnswerFields?.querySelector(
      `.conjugation-table-input[data-pronoun="${pronoun}"]`
    );
    const value = input?.value ?? "";
    const expected = card.answers[pronoun];

    if (!value.trim()) {
      rowResults.push({ pronoun, tier: "skipped", expected });
      continue;
    }

    filledCount += 1;
    const tier = evaluateAnswer(value, expected);
    filledTiers.push(tier);
    rowResults.push({ pronoun, tier, expected });
  }

  return {
    rowResults,
    filledCount,
    overallTier: aggregateTableResults(filledTiers, filledCount, card.pronouns.length),
  };
}

function aggregateTableResults(filledTiers, filledCount, totalCount) {
  if (filledCount === 0) {
    return "empty";
  }

  if (filledTiers.some((tier) => tier === "wrong")) {
    return "wrong";
  }

  if (filledCount < totalCount) {
    return filledTiers.every((tier) => tier === "exact") ? "partial-exact" : "partial-accent";
  }

  if (filledTiers.every((tier) => tier === "exact")) {
    return "exact";
  }

  return "accent";
}

function rowFeedbackMessage(rowTier, expected) {
  if (rowTier === "exact") {
    return "Correct.";
  }

  if (rowTier === "accent") {
    return `Check accent — ${expected}`;
  }

  if (rowTier === "wrong") {
    return "Not quite — try again.";
  }

  return "";
}

function tableSummaryFeedback(tier) {
  if (tier === "partial-exact") {
    return {
      className: "is-correct",
      message: "Good so far — fill in the rest, or reveal.",
    };
  }

  if (tier === "partial-accent") {
    return {
      className: "is-accent",
      message: "Good so far — fix accents or fill in the rest.",
    };
  }

  return ANSWER_FEEDBACK[tier];
}

function applyTableFeedback(ui, tier, rowResults) {
  const { feedbackEl } = ui;

  for (const { pronoun, tier: rowTier, expected } of rowResults) {
    const field = ui.tableAnswerFields?.querySelector(
      `.conjugation-table-feedback[data-pronoun="${pronoun}"]`
    );
    if (!field) {
      continue;
    }

    if (rowTier === "skipped") {
      field.hidden = true;
      field.textContent = "";
      field.className = "conjugation-table-feedback";
      continue;
    }

    field.hidden = false;
    if (rowTier === "exact") {
      field.className = "conjugation-table-feedback is-correct";
    } else if (rowTier === "accent") {
      field.className = "conjugation-table-feedback is-accent";
    } else {
      field.className = "conjugation-table-feedback is-incorrect";
    }
    field.textContent = rowFeedbackMessage(rowTier, expected);
  }

  const feedback = tableSummaryFeedback(tier);
  const showSummary =
    tier === "wrong" || tier === "partial-exact" || tier === "partial-accent";

  if (showSummary) {
    feedbackEl.hidden = false;
    feedbackEl.className = `answer-feedback ${feedback.className}`;
    feedbackEl.textContent = feedback.message;
  } else {
    feedbackEl.hidden = true;
    feedbackEl.className = "answer-feedback";
    feedbackEl.textContent = "";
  }

  if (tier === "wrong") {
    cardResolved = null;
    recordResultIfTracking(currentMode, "wrong");
  } else if (tier === "exact") {
    cardResolved = "exact";
    recordResultIfTracking(currentMode, "exact");
  } else if (tier === "accent") {
    cardResolved = "accent";
    recordResultIfTracking(currentMode, "accent");
  } else {
    cardResolved = null;
  }

  syncDrillActions(ui);
  updateStatsDisplay();
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

  if (isTableDrillCard(currentCard)) {
    const { rowResults, filledCount, overallTier } = evaluateTableRows(ui, currentCard);

    if (filledCount === 0) {
      applyFeedback(ui, "empty");
      return;
    }

    applyTableFeedback(ui, overallTier, rowResults);
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

  if (isTableDrillCard(currentCard)) {
    for (const pronoun of currentCard.pronouns) {
      const field = ui.tableAnswerFields?.querySelector(
        `.conjugation-table-feedback[data-pronoun="${pronoun}"]`
      );
      if (field) {
        field.hidden = false;
        field.className = "conjugation-table-feedback is-revealed";
        field.textContent = currentCard.answers[pronoun];
      }
    }

    ui.feedbackEl.hidden = true;
    ui.feedbackEl.className = "answer-feedback";
    ui.feedbackEl.textContent = "";
  } else {
    ui.feedbackEl.hidden = false;
    ui.feedbackEl.classList.remove("is-correct", "is-accent", "is-incorrect");
    ui.feedbackEl.classList.add("is-revealed");
    ui.feedbackEl.textContent = `Answer: ${currentCard.answer}`;
  }

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

export function getDrillStyleFromForm(formEl) {
  const selected = formEl.querySelector('input[name="drill-style"]:checked');
  return selected?.value === "single" ? "single" : "per_verb";
}

export function getCardOrderFromForm(formEl) {
  const selected = formEl.querySelector('input[name="card-order"]:checked');
  return selected?.value === "random" ? "random" : "deck";
}

export function setDrillStyleOnForm(formEl, drillStyle) {
  const value = drillStyle === "single" ? "single" : "per_verb";
  for (const input of formEl.querySelectorAll('input[name="drill-style"]')) {
    input.checked = input.value === value;
  }
}

export function setCardOrderOnForm(formEl, cardOrder) {
  const value = cardOrder === "random" ? "random" : "deck";
  for (const input of formEl.querySelectorAll('input[name="card-order"]')) {
    input.checked = input.value === value;
  }
}

export function getStemHintsFromForm(formEl) {
  const input = formEl.querySelector('input[name="stem-hints"]');
  return input?.checked ?? true;
}

export function setStemHintsOnForm(formEl, enabled) {
  const input = formEl.querySelector('input[name="stem-hints"]');
  if (input) {
    input.checked = enabled !== false;
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
