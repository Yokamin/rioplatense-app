import { t } from "./i18n/index.js";
import { getFrequencySectionLabel } from "./verb-frequency.js";
import {
  getCheckedValues,
  populateCheckboxGroup,
  setCheckedValues,
} from "./ui-helpers.js";

function formatVerbPickerLabel({ selectedCount, total, matchCount, itemLabelKey }) {
  const itemLabel = t(itemLabelKey);

  if (selectedCount === 0) {
    return t("verbPicker.noVerbsSelected");
  }

  if (matchCount !== selectedCount) {
    return t("verbPicker.selectedMatchFilters", { selectedCount, matchCount });
  }

  if (selectedCount === total) {
    return t("verbPicker.allItems", { itemLabel, total });
  }

  return t("verbPicker.selectedOfTotal", { selectedCount, total, itemLabel });
}

export function initVerbPicker({
  toggleEl,
  modalEl,
  listEl,
  doneBtn,
  selectAllBtn,
  selectCoreBtn,
  selectCommonBtn,
  clearAllBtn,
  countMatchingVerbs,
  onChange,
  itemLabelKey = "verbPicker.itemLabelVerbs",
}) {
  let verbItems = [];

  function updateToggleLabel() {
    const selected = getCheckedValues(listEl);
    const total = verbItems.length;
    const selectionForSettings = readSelectionForSettings();
    const matchCount =
      countMatchingVerbs?.(selected, selectionForSettings) ?? selected.length;

    toggleEl.textContent = formatVerbPickerLabel({
      selectedCount: selected.length,
      total,
      matchCount,
      itemLabelKey,
    });
  }

  function renderVerbList(selectedIds = null) {
    listEl.innerHTML = "";
    const defaultSelected =
      selectedIds ?? verbItems.map((item) => item.id);

    for (const tier of ["core", "common", "extended"]) {
      const tierItems = verbItems.filter((item) => item.frequency === tier);
      if (tierItems.length === 0) {
        continue;
      }

      const heading = document.createElement("h3");
      heading.className = "picker-tier-heading";
      heading.textContent = getFrequencySectionLabel(tier);
      listEl.appendChild(heading);

      const grid = document.createElement("div");
      grid.className = "checkbox-grid picker-tier-grid";
      populateCheckboxGroup(grid, tierItems, "verb", defaultSelected);
      listEl.appendChild(grid);
    }
  }

  function setVerbItems(items, selectedIds = null) {
    verbItems = items;
    renderVerbList(selectedIds);
    updateToggleLabel();
  }

  function readSelectionForSettings() {
    const selected = getCheckedValues(listEl);
    if (selected.length === 0) {
      return [];
    }
    if (selected.length === verbItems.length) {
      return null;
    }
    return selected;
  }

  function applySelection(infinitives) {
    if (infinitives === null) {
      setCheckedValues(
        listEl,
        verbItems.map((item) => item.id)
      );
    } else {
      setCheckedValues(listEl, infinitives);
    }
    updateToggleLabel();
  }

  function openModal() {
    modalEl.hidden = false;
    toggleEl.setAttribute("aria-expanded", "true");
  }

  function closeModal() {
    modalEl.hidden = true;
    toggleEl.setAttribute("aria-expanded", "false");
  }

  function refreshLabels() {
    renderVerbList(getCheckedValues(listEl));
    updateToggleLabel();
  }

  toggleEl.addEventListener("click", openModal);
  doneBtn.addEventListener("click", closeModal);
  modalEl.addEventListener("click", (event) => {
    if (event.target === modalEl) {
      closeModal();
    }
  });

  selectAllBtn.addEventListener("click", () => {
    setCheckedValues(
      listEl,
      verbItems.map((item) => item.id)
    );
    updateToggleLabel();
    onChange?.();
  });

  selectCoreBtn.addEventListener("click", () => {
    const coreVerbs = verbItems
      .filter((item) => item.frequency === "core")
      .map((item) => item.id);
    setCheckedValues(listEl, coreVerbs);
    updateToggleLabel();
    onChange?.();
  });

  selectCommonBtn.addEventListener("click", () => {
    const commonVerbs = verbItems
      .filter((item) => item.frequency === "core" || item.frequency === "common")
      .map((item) => item.id);
    setCheckedValues(listEl, commonVerbs);
    updateToggleLabel();
    onChange?.();
  });

  clearAllBtn.addEventListener("click", () => {
    setCheckedValues(listEl, []);
    updateToggleLabel();
    onChange?.();
  });

  listEl.addEventListener("change", () => {
    updateToggleLabel();
    onChange?.();
  });

  return {
    setVerbItems,
    readSelectionForSettings,
    applySelection,
    updateToggleLabel,
    refreshLabels,
    closeModal,
  };
}
