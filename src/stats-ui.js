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
    <tr><td>Exact (green)</td><td>${counts.exact}</td></tr>
    <tr><td>Accent only (yellow)</td><td>${counts.accent}</td></tr>
    <tr><td>Incorrect (red)</td><td>${counts.wrong}</td></tr>
    <tr><td>Revealed (needed help)</td><td>${counts.revealed}</td></tr>
  `;

  const dailyRows =
    daily.length === 0
      ? `<tr><td colspan="5">No daily history yet.</td></tr>`
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
    <h2 id="stats-modal-title">${modeLabel} stats</h2>
    <p class="field-hint">✓ exact · ~ accent · ✗ wrong · reveal = needed help</p>

    <h3>This session</h3>
    <table class="stats-table">
      <tbody>${countRows(session)}</tbody>
    </table>

    <h3>All time</h3>
    <table class="stats-table">
      <tbody>${countRows(lifetime)}</tbody>
    </table>

    <h3>Recent days</h3>
    <table class="stats-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>✓</th>
          <th>~</th>
          <th>✗</th>
          <th>Reveal</th>
        </tr>
      </thead>
      <tbody>${dailyRows}</tbody>
    </table>

    <button type="button" id="stats-reset" class="secondary-action stats-reset">Reset ${modeLabel.toLowerCase()} stats</button>
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
      <span class="stats-chip-title">Stats</span>
      <span class="stats-chip-values">${formatStatsChip(mode)}</span>
      <span class="stats-chip-hint">Tap for details</span>
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

    if (!confirm(`Reset all ${modeLabel.toLowerCase()} stats (session + history)?`)) {
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
