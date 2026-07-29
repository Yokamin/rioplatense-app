import { ANSWER_FEEDBACK, evaluateAnswer } from "./answer-check.js";
import { t } from "./i18n/index.js";
import { tVocabCategoryName } from "./localized-data.js";
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
let lastDrillRenderContext = null;

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

function formatTenseLabel(tenseId) {
  if (!tenseId) {
    return "";
  }

  const key = `tense.${tenseId}`;
  const label = t(key);
  return label.startsWith("⟦missing:") ? tenseId.replace(/_/g, " ") : label;
}

function formatProgressLine(deckProgress) {
  return deckProgress && deckProgress.total > 0
    ? t("drill.progressLine", {
        current: deckProgress.current,
        total: deckProgress.total,
      })
    : "";
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
    primaryBtn.textContent = t("drill.nextCard");
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
    primaryBtn.textContent = t("drill.revealAnswer");
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
  primaryBtn.textContent = t("drill.check");
  primaryBtn.dataset.action = "check";
  if (secondaryActionsEl) {
    secondaryActionsEl.hidden = false;
  }
  if (revealBtn) {
    revealBtn.hidden = false;
    revealBtn.disabled = false;
    revealBtn.textContent = t("drill.revealAnswer");
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
  return window.location.protocol === "file:" ? t("error.fileProtocolHint") : "";
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

function buildMetaText(card, practiceInputMode, deckProgress) {
  const progressLine = formatProgressLine(deckProgress);

  if (card.type === "vocab") {
    const english = card.english ?? card.prompt ?? "";
    return practiceInputMode === "type"
      ? t("drill.vocabTypePrompt", { english })
      : t("drill.vocabRecallPrompt", { english });
  }

  if (card.type === "verb_table" || card.type === "reflexive_table") {
    return practiceInputMode === "type"
      ? t("drill.tableTypePrompt", { progressLine })
      : t("drill.tableRecallPrompt", { progressLine });
  }

  if (card.type === "reflexive") {
    return practiceInputMode === "type"
      ? t("drill.reflexiveTypePrompt", { progressLine })
      : t("drill.reflexiveRecallPrompt", { progressLine });
  }

  const defaultType = t("drill.conjugateTypeDefault");
  const defaultRecall = t("drill.conjugateRecallDefault");
  return practiceInputMode === "type"
    ? (card.note ?? defaultType) + progressLine
    : (card.note ?? defaultRecall) + progressLine;
}

function paintDrillCardChrome(
  cardEl,
  metaEl,
  dialectWarningEl,
  card,
  pronounLabels,
  practiceInputMode,
  drillUi,
  deckProgress
) {
  if (!card) {
    cardEl.innerHTML = `<p>${t("drill.noCardsMatch")}</p>`;
    metaEl.textContent = t("drill.widenFilters");
    if (drillUi?.singleAnswerRow) {
      drillUi.singleAnswerRow.hidden = true;
    }
    if (drillUi?.tableAnswerFields) {
      drillUi.tableAnswerFields.hidden = true;
      drillUi.tableAnswerFields.innerHTML = "";
    }
    return;
  }

  if (dialectWarningEl) {
    dialectWarningEl.hidden = true;
    dialectWarningEl.textContent = "";
  }

  if (drillUi?.singleAnswerRow) {
    drillUi.singleAnswerRow.hidden = isTableDrillCard(card);
  }

  const tenseLabel = formatTenseLabel(card.tense);
  const verbPeekAria = t("drill.verbPeekAria");

  if (card.type === "vocab") {
    const englishCue = card.english ?? card.prompt ?? "";
    const categoryName = card.categoryId
      ? tVocabCategoryName(card.categoryId, card.categoryName)
      : card.categoryName;
    cardEl.innerHTML = `
      <p class="card-label">${t("drill.vocabulary")}</p>
      <p class="card-hint card-hint--vocab-cue">${t("drill.vocabEnglishCue")}</p>
      <p class="card-prompt">${escapeHtml(englishCue)}</p>
      <p class="card-hint">${t("drill.categoryLabel", { categoryName })}</p>
    `;
  } else if (card.type === "verb_table" || card.type === "reflexive_table") {
    const label =
      card.type === "reflexive_table" ? t("drill.reflexiveVerb") : t("drill.verb");
    cardEl.innerHTML = `
      <p class="card-label">${label} · ${escapeHtml(tenseLabel)}</p>
      <p class="card-prompt">
        <button type="button" class="verb-peek-trigger" disabled aria-label="${escapeHtml(verbPeekAria)}">
          ${escapeHtml(card.infinitive)}
        </button>
      </p>
      <p class="card-hint">${escapeHtml(card.english)}</p>
    `;

    if (drillUi?.tableAnswerFields) {
      const existingValues = new Map();
      for (const input of drillUi.tableAnswerFields.querySelectorAll(".conjugation-table-input")) {
        existingValues.set(input.dataset.pronoun, input.value);
      }

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
            value="${escapeHtml(existingValues.get(pronoun) ?? "")}"
          />
        </div>`;
        })
        .join("");
      drillUi.tableAnswerFields.innerHTML = rows;
    }
  } else if (card.type === "reflexive") {
    const stemHint = resolveStemHintMarkup(card);
    cardEl.innerHTML = `
      <p class="card-label">${t("drill.reflexiveVerb")} · ${escapeHtml(tenseLabel)}</p>
      <p class="card-prompt">
        <button type="button" class="verb-peek-trigger" disabled aria-label="${escapeHtml(verbPeekAria)}">
          ${escapeHtml(card.infinitive)}
        </button>
        · ${escapeHtml(pronounLabels[card.pronoun])}
      </p>
      <p class="card-hint">${escapeHtml(card.english)}</p>
      ${stemHint ? `<p class="card-stem-hint">${stemHint}</p>` : ""}
    `;

    const dialectNote = getConjugationDialectNote(card.pronoun);
    if (dialectNote && dialectWarningEl) {
      dialectWarningEl.hidden = false;
      dialectWarningEl.textContent = t("dialect.notePrefix", { message: dialectNote });
    }
  } else {
    const stemHint = resolveStemHintMarkup(card);
    cardEl.innerHTML = `
      <p class="card-label">${t("drill.verb")} · ${escapeHtml(tenseLabel)}</p>
      <p class="card-prompt">
        <button type="button" class="verb-peek-trigger" disabled aria-label="${escapeHtml(verbPeekAria)}">
          ${escapeHtml(card.infinitive)}
        </button>
        · ${escapeHtml(pronounLabels[card.pronoun])}
      </p>
      <p class="card-hint">${escapeHtml(card.english)}</p>
      ${stemHint ? `<p class="card-stem-hint">${stemHint}</p>` : ""}
    `;

    const dialectNote = getConjugationDialectNote(card.pronoun);
    if (dialectNote && dialectWarningEl) {
      dialectWarningEl.hidden = false;
      dialectWarningEl.textContent = t("dialect.notePrefix", { message: dialectNote });
    }
  }

  metaEl.textContent = buildMetaText(card, practiceInputMode, deckProgress);
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

  lastDrillRenderContext = {
    cardEl,
    metaEl,
    dialectWarningEl,
    pronounLabels,
    practiceInputMode,
    drillUi,
    deckProgress,
  };

  paintDrillCardChrome(
    cardEl,
    metaEl,
    dialectWarningEl,
    card,
    pronounLabels,
    practiceInputMode,
    drillUi,
    deckProgress
  );

  return Boolean(card);
}

export function relocalizeActiveDrill(ui) {
  if (!lastDrillRenderContext) {
    syncDrillActions(ui);
    return;
  }

  const {
    cardEl,
    metaEl,
    dialectWarningEl,
    pronounLabels,
    practiceInputMode,
    drillUi,
    deckProgress,
  } = lastDrillRenderContext;

  paintDrillCardChrome(
    cardEl,
    metaEl,
    dialectWarningEl,
    currentCard,
    pronounLabels,
    practiceInputMode,
    drillUi ?? ui,
    deckProgress
  );

  refreshVisibleFeedback(ui ?? drillUi);
  syncDrillActions(ui ?? drillUi);
  verbPeekSyncFn?.();
}

function resolveStemHintMarkup(card, { pronoun = null, answer = null } = {}) {
  if (!showStemHints || !card?.verbType) {
    return "";
  }

  const targetPronoun = pronoun ?? card.pronoun;
  const targetAnswer = answer ?? (pronoun ? card.answers?.[pronoun] : card.answer);
  const nosotrosAnswer = card.answers?.nosotros ?? card.referenceAnswer ?? null;
  const patternKey = getStemChangeHint(
    card.verbType,
    targetAnswer,
    targetPronoun,
    nosotrosAnswer
  );
  const text = formatStemChangeHint(patternKey);

  if (!text) {
    return "";
  }

  return `<span class="stem-change-hint">${escapeHtml(text)}</span>`;
}

function feedbackMessage(tier, answer = null) {
  if (tier === "exact") {
    return t("feedback.exact");
  }

  if (tier === "accent") {
    return answer ? `${t("feedback.accent")} ${answer}` : t("feedback.accent");
  }

  if (tier === "wrong") {
    return t("feedback.wrong");
  }

  if (tier === "empty") {
    return t("feedback.empty");
  }

  if (tier === "partial-exact") {
    return t("feedback.partialExact");
  }

  if (tier === "partial-accent") {
    return t("feedback.partialAccent");
  }

  return "";
}

function rowFeedbackMessage(rowTier, expected) {
  if (rowTier === "exact") {
    return t("feedback.rowExact");
  }

  if (rowTier === "accent") {
    return t("feedback.rowAccent", { expected });
  }

  if (rowTier === "wrong") {
    return t("feedback.rowWrong");
  }

  return "";
}

function tableSummaryFeedback(tier) {
  if (tier === "partial-exact") {
    return {
      className: "is-correct",
      message: t("feedback.partialExact"),
    };
  }

  if (tier === "partial-accent") {
    return {
      className: "is-accent",
      message: t("feedback.partialAccent"),
    };
  }

  const feedback = ANSWER_FEEDBACK[tier];
  return {
    className: feedback?.className ?? "",
    message: feedbackMessage(tier),
  };
}

function refreshVisibleFeedback(ui) {
  if (!ui?.feedbackEl || !currentCard) {
    return;
  }

  if (cardResolved === "revealed") {
    if (isTableDrillCard(currentCard)) {
      for (const pronoun of currentCard.pronouns) {
        const field = ui.tableAnswerFields?.querySelector(
          `.conjugation-table-feedback[data-pronoun="${pronoun}"]`
        );
        if (field && !field.hidden) {
          field.textContent = currentCard.answers[pronoun];
        }
      }
    } else if (!ui.feedbackEl.hidden) {
      ui.feedbackEl.textContent = t("drill.answerLabel", { answer: currentCard.answer });
    }
    return;
  }

  if (isTableDrillCard(currentCard)) {
    const { rowResults, overallTier } = evaluateTableRows(ui, currentCard);
    const hasRowFeedback = rowResults.some((row) => row.tier !== "skipped");

    if (hasRowFeedback) {
      applyTableFeedback(ui, overallTier, rowResults, { syncActions: false });
    }
    return;
  }

  if (cardResolved === "exact" || cardResolved === "accent") {
    applyFeedback(ui, cardResolved, { syncActions: false });
  } else if (!ui.feedbackEl.hidden && ui.feedbackEl.textContent) {
    const tier = ui.feedbackEl.classList.contains("is-correct")
      ? "exact"
      : ui.feedbackEl.classList.contains("is-accent")
        ? "accent"
        : "wrong";
    applyFeedback(ui, tier, { syncActions: false });
  }
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

  if (lastDrillRenderContext) {
    lastDrillRenderContext.practiceInputMode = inputMode;
    if (currentCard && lastDrillRenderContext.metaEl) {
      lastDrillRenderContext.metaEl.textContent = buildMetaText(
        currentCard,
        inputMode,
        lastDrillRenderContext.deckProgress
      );
    }
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

function applyTableFeedback(ui, tier, rowResults, { syncActions = true } = {}) {
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

  if (syncActions) {
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
}

function applyFeedback(ui, tier, { syncActions = true } = {}) {
  const { feedbackEl } = ui;
  const feedback = ANSWER_FEEDBACK[tier];
  feedbackEl.hidden = false;
  feedbackEl.className = `answer-feedback ${feedback.className}`;
  feedbackEl.textContent = feedbackMessage(tier, tier === "accent" ? currentCard.answer : null);

  if (syncActions) {
    if (tier === "accent") {
      cardResolved = "accent";
      recordResultIfTracking(currentMode, "accent");
    } else if (tier === "exact") {
      cardResolved = "exact";
      recordResultIfTracking(currentMode, "exact");
    }

    syncDrillActions(ui);
    updateStatsDisplay();
  }
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
    ui.feedbackEl.textContent = t("drill.answerLabel", { answer: currentCard.answer });
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

export function getVerbTypes() {
  return [
    { id: "regular_ar", label: t("verbType.regular_ar") },
    { id: "regular_er", label: t("verbType.regular_er") },
    { id: "regular_ir", label: t("verbType.regular_ir") },
    { id: "stem_changer_e_ie", label: t("verbType.stem_changer_e_ie") },
    { id: "stem_changer_o_ue", label: t("verbType.stem_changer_o_ue") },
    { id: "stem_changer_e_i", label: t("verbType.stem_changer_e_i") },
    { id: "irregular", label: t("verbType.irregular") },
    { id: "unknown", label: t("verbType.unknown") },
  ];
}

/** Simplified conjugation settings groups (each maps to one or more verb type ids). */
export function getVerbTypeGroups() {
  return [
    {
      id: "regular",
      label: t("verbTypeGroup.regular"),
      types: ["regular_ar", "regular_er", "regular_ir"],
    },
    {
      id: "stem_changing",
      label: t("verbTypeGroup.stem_changing"),
      types: ["stem_changer_e_ie", "stem_changer_o_ue", "stem_changer_e_i"],
    },
    { id: "irregular", label: t("verbTypeGroup.irregular"), types: ["irregular"] },
    { id: "unknown", label: t("verbTypeGroup.unknown"), types: ["unknown"] },
  ];
}

export function allVerbTypeIds() {
  return getVerbTypes().map((type) => type.id);
}

export function expandVerbTypeGroups(selectedGroupIds) {
  const types = [];

  for (const group of getVerbTypeGroups()) {
    if (selectedGroupIds.includes(group.id)) {
      types.push(...group.types);
    }
  }

  return types;
}

/** Map stored granular type ids to grouped checkbox ids for the settings UI. */
export function verbTypesToGroupSelection(typeIds) {
  const selected = new Set(typeIds ?? []);

  return getVerbTypeGroups()
    .filter((group) => group.types.some((typeId) => selected.has(typeId)))
    .map((group) => group.id);
}

export function getTenseOptions() {
  return [{ id: "present_tense", label: t("tense.present_tense") }];
}

export function getPracticeInputModes() {
  return [
    { id: "type", label: t("settings.inputModeType") },
    { id: "reveal", label: t("settings.inputModeReveal") },
  ];
}
