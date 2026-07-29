import { loadAllData } from "./data-loader.js";
import { initVerbDetailModal } from "./verb-detail-modal.js";
import {
  VERB_FREQUENCY_ORDER,
  VERB_FREQUENCY_SECTIONS,
  getVerbFrequency,
} from "./verb-frequency.js";
import { getVerbTypeBadge } from "./verb-type-info.js";
import { escapeHtml, getFileProtocolHint } from "./ui-helpers.js";
import { initSmartBackLink } from "./navigation.js";

const searchInput = document.getElementById("verb-search");
const listEl = document.getElementById("verb-list");
const statusEl = document.getElementById("verb-list-status");
const detailModal = document.getElementById("verb-detail-modal");
const detailBody = document.getElementById("verb-detail-body");
const detailClose = document.getElementById("verb-detail-close");

let verbs = [];
let verbDetailModal = null;
let activeFilter = "all";

function matchesFilter(verb) {
  if (activeFilter === "reflexive") {
    return verb.is_reflexive === true;
  }

  if (activeFilter === "non-reflexive") {
    return !verb.is_reflexive;
  }

  return true;
}

function hasPresentConjugation(verb) {
  const tense = verb.present_tense;
  if (!tense) {
    return false;
  }
  return Boolean(tense.yo && tense.vos && tense.el);
}

function matchesSearch(verb, query) {
  if (!query) {
    return true;
  }

  const haystack = `${verb.infinitive} ${verb.english}`.toLowerCase();
  return haystack.includes(query);
}

function renderVerbList(query = "") {
  const normalizedQuery = query.trim().toLowerCase();
  listEl.innerHTML = "";

  let visibleCount = 0;

  for (const tier of VERB_FREQUENCY_ORDER) {
    const tierVerbs = verbs
      .filter((verb) => getVerbFrequency(verb) === tier)
      .filter((verb) => matchesFilter(verb))
      .filter((verb) => matchesSearch(verb, normalizedQuery))
      .sort((a, b) => a.infinitive.localeCompare(b.infinitive, "es"));

    if (tierVerbs.length === 0) {
      continue;
    }

    const heading = document.createElement("h2");
    heading.className = "verb-list-tier";
    heading.textContent = VERB_FREQUENCY_SECTIONS[tier];
    listEl.appendChild(heading);

    const grid = document.createElement("div");
    grid.className = "verb-list-grid";

    for (const verb of tierVerbs) {
      visibleCount += 1;
      const badge = getVerbTypeBadge(verb.type);
      const complete = hasPresentConjugation(verb);

      const button = document.createElement("button");
      button.type = "button";
      button.className = "verb-list-item";
      button.dataset.infinitive = verb.infinitive;
      button.innerHTML = `
        <span class="verb-list-infinitive">${escapeHtml(verb.infinitive)}</span>
        <span class="verb-list-english">${escapeHtml(verb.english)}</span>
        <span class="verb-list-tags">
          <span class="type-tag type-tag-compact">${escapeHtml(badge.label)}</span>
          ${
            verb.is_reflexive
              ? '<span class="type-tag type-tag-compact type-tag-reflexive">reflexive</span>'
              : ""
          }
          ${
            complete
              ? ""
              : '<span class="verb-list-incomplete">incomplete table</span>'
          }
        </span>
      `;
      grid.appendChild(button);
    }

    listEl.appendChild(grid);
  }

  const totalReflexive = verbs.filter((verb) => verb.is_reflexive).length;
  const filterLabel =
    activeFilter === "reflexive"
      ? "reflexive"
      : activeFilter === "non-reflexive"
        ? "non-reflexive"
        : "total";

  statusEl.textContent =
    visibleCount === 0
      ? "No verbs match your search."
      : `${visibleCount} ${filterLabel} verb${visibleCount === 1 ? "" : "s"} shown` +
        (activeFilter === "all"
          ? ` (${totalReflexive} reflexive · ${verbs.length - totalReflexive} non-reflexive)`
          : "");
}

function setActiveFilter(filter) {
  activeFilter = filter;

  for (const tab of document.querySelectorAll(".filter-tab")) {
    const isActive = tab.dataset.filter === filter;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", isActive ? "true" : "false");
  }

  renderVerbList(searchInput.value);
}

function openVerbByInfinitive(infinitive) {
  const verb = verbs.find((entry) => entry.infinitive === infinitive);
  if (verb) {
    verbDetailModal.open(verb);
  }
}

async function init() {
  initSmartBackLink(document.getElementById("back-link"), {
    fallbackHref: "index.html",
    fallbackLabel: "← Home",
  });

  try {
    verbDetailModal = initVerbDetailModal({
      modalEl: detailModal,
      bodyEl: detailBody,
      closeEl: detailClose,
    });

    const data = await loadAllData();
    verbs = data.verbs;
    renderVerbList();

    searchInput.addEventListener("input", () => {
      renderVerbList(searchInput.value);
    });

    listEl.addEventListener("click", (event) => {
      const item = event.target.closest(".verb-list-item");
      if (!item) {
        return;
      }
      openVerbByInfinitive(item.dataset.infinitive);
    });

    for (const tab of document.querySelectorAll(".filter-tab")) {
      tab.addEventListener("click", () => {
        setActiveFilter(tab.dataset.filter);
      });
    }
  } catch (error) {
    statusEl.textContent = `Failed to load verbs: ${error.message}.${getFileProtocolHint()}`;
    statusEl.classList.add("error");
  }
}

init();
