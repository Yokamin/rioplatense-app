import { t } from "./i18n/index.js";
import {
  formatCompactCounts,
  getDailyStats,
  getLifetimeStats,
  getSessionStats,
  resetModeStats,
} from "./stats-storage.js";

export function formatStatsChip(mode) {
  const session = getSessionStats(mode);
  return formatCompactCounts(session);
}

export function buildStatsDetailHtml(mode, modeLabel) {
  const session = getSessionStats(mode);
  const lifetime = getLifetimeStats(mode);
  const daily = getDailyStats(mode, 14);

  const countRows = (counts) => `
    <tr><td>${t("stats.rowExact")}</td><td>${counts.exact}</td></tr>
    <tr><td>${t("stats.rowAccent")}</td><td>${counts.accent}</td></tr>
    <tr><td>${t("stats.rowWrong")}</td><td>${counts.wrong}</td></tr>
    <tr><td>${t("stats.rowRevealed")}</td><td>${counts.revealed}</td></tr>
  `;

  const dailyRows =
    daily.length === 0
      ? `<tr><td colspan="5">${t("stats.noDailyHistory")}</td></tr>`
      : daily
          .map(
            ({ date, counts }) => `
      <tr>
        <td>${date}</td>
        <td>${counts.exact}</td>
        <td>${counts.accent}</td>
        <td>${counts.wrong}</td>
        <td>${counts.revealed}</td>
      </tr>`
          )
          .join("");

  return `
    <h2 id="stats-modal-title">${t("stats.modalTitle", { modeLabel })}</h2>
    <p class="field-hint">${t("stats.legend")}</p>

    <h3>${t("stats.thisSession")}</h3>
    <table class="stats-table">
      <tbody>${countRows(session)}</tbody>
    </table>

    <h3>${t("stats.allTime")}</h3>
    <table class="stats-table">
      <tbody>${countRows(lifetime)}</tbody>
    </table>

    <h3>${t("stats.recentDays")}</h3>
    <table class="stats-table">
      <thead>
        <tr>
          <th>${t("stats.dateHeader")}</th>
          <th>✓</th>
          <th>~</th>
          <th>✗</th>
          <th>${t("stats.revealHeader")}</th>
        </tr>
      </thead>
      <tbody>${dailyRows}</tbody>
    </table>

    <button type="button" id="stats-reset" class="secondary-action stats-reset">${t("stats.resetButton", { modeLabel })}</button>
  `;
}

export function initStatsUi({
  mode,
  modeLabel,
  toggleEl,
  modalEl,
  modalBodyEl,
  closeEl,
  onStatsChange,
}) {
  function refreshChip() {
    toggleEl.innerHTML = `
      <span class="stats-chip-title">${t("stats.chipTitle")}</span>
      <span class="stats-chip-values">${formatStatsChip(mode)}</span>
      <span class="stats-chip-hint">${t("stats.chipHint")}</span>
    `;
  }

  function openModal() {
    modalBodyEl.innerHTML = buildStatsDetailHtml(mode, modeLabel);
    modalEl.hidden = false;
  }

  function closeModal() {
    modalEl.hidden = true;
  }

  modalBodyEl.addEventListener("click", (event) => {
    if (event.target.id !== "stats-reset") {
      return;
    }

    if (!confirm(t("stats.resetConfirm", { modeLabel }))) {
      return;
    }

    resetModeStats(mode);
    refreshChip();
    onStatsChange?.();
    openModal();
  });

  toggleEl.addEventListener("click", openModal);
  closeEl.addEventListener("click", closeModal);
  modalEl.addEventListener("click", (event) => {
    if (event.target === modalEl) {
      closeModal();
    }
  });

  return { refreshChip, openModal, closeModal };
}
