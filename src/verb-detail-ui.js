import { PRONOUN_CARD_LABELS, PRONOUN_KEYS } from "./data-loader.js";
import { VERB_FREQUENCY_LABELS, getVerbFrequency } from "./verb-frequency.js";
import { TYPE_EXPLANATIONS, getVerbTypeBadge } from "./verb-type-info.js";
import { escapeHtml } from "./ui-helpers.js";

const TENSE_LABELS = {
  present_tense: "Present tense",
};

function formatTenseLabel(tenseId) {
  return TENSE_LABELS[tenseId] ?? tenseId.replace(/_/g, " ");
}

function getTenseKeys(verb) {
  return Object.keys(verb).filter((key) => {
    const value = verb[key];
    return (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      PRONOUN_KEYS.some((pronoun) => pronoun in value)
    );
  });
}

function buildTypeTagsHtml(type) {
  const badge = getVerbTypeBadge(type);
  const explanation =
    TYPE_EXPLANATIONS[badge.category] ??
    (badge.category === "unknown"
      ? {
          title: "Draft entry",
          body: "This verb is not fully categorized yet. It may be missing conjugations for drills.",
        }
      : null);

  if (!explanation) {
    return `<span class="type-tag">${escapeHtml(badge.label)}</span>`;
  }

  return `
    <div class="type-tag-group">
      <button type="button" class="type-tag" data-type-explain="${escapeHtml(badge.category)}">
        ${escapeHtml(badge.label)}
      </button>
      <div id="type-explain-${escapeHtml(badge.category)}" class="type-explain-panel" hidden>
        <p class="type-explain-title">${escapeHtml(explanation.title)}</p>
        <p class="type-explain-body">${escapeHtml(explanation.body)}</p>
      </div>
    </div>
  `;
}

function buildConjugationTableHtml(tenseMap, highlightPronoun = null) {
  const rows = PRONOUN_KEYS.map((pronoun) => {
    const form = tenseMap[pronoun] ?? "—";
    const isHighlight = highlightPronoun === pronoun;
    return `
      <tr class="${isHighlight ? "conj-row-highlight" : ""}">
        <th scope="row">${escapeHtml(PRONOUN_CARD_LABELS[pronoun])}</th>
        <td>${escapeHtml(form)}</td>
      </tr>
    `;
  }).join("");

  return `
    <table class="conj-table">
      <tbody>${rows}</tbody>
    </table>
  `;
}

/**
 * @param {object} verb - full verb entry from verbs.json
 * @param {{ tense?: string, pronoun?: string }|null} highlight - row to highlight after a drill
 */
export function buildVerbDetailHtml(verb, highlight = null) {
  const frequency = VERB_FREQUENCY_LABELS[getVerbFrequency(verb)] ?? "";
  const tenseKeys = getTenseKeys(verb);

  const tenseSections =
    tenseKeys.length === 0
      ? `<p class="field-hint">No conjugation tables stored for this verb yet.</p>`
      : tenseKeys
          .map((tenseId) => {
            const highlightPronoun =
              highlight?.tense === tenseId ? highlight.pronoun : null;
            return `
              <section class="verb-tense-section">
                <h3>${escapeHtml(formatTenseLabel(tenseId))}</h3>
                ${buildConjugationTableHtml(verb[tenseId], highlightPronoun)}
              </section>
            `;
          })
          .join("");

  const noteBlock = verb.note
    ? `<p class="verb-detail-note">${escapeHtml(verb.note)}</p>`
    : "";

  return `
    <h2 id="verb-detail-title">${escapeHtml(verb.infinitive)}</h2>
    <p class="verb-detail-english">${escapeHtml(verb.english)}</p>
    <p class="verb-detail-meta">${escapeHtml(frequency)}</p>
    <div class="verb-type-tags">${buildTypeTagsHtml(verb.type)}</div>
    ${noteBlock}
    <div class="verb-tense-scroll">${tenseSections}</div>
  `;
}

export function wireVerbDetailInteractions(container) {
  container.querySelectorAll("[data-type-explain]").forEach((button) => {
    button.addEventListener("click", () => {
      const category = button.dataset.typeExplain;
      const panel = container.querySelector(`#type-explain-${category}`);
      if (!panel) {
        return;
      }
      panel.hidden = !panel.hidden;
    });
  });
}
