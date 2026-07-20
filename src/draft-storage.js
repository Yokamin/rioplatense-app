const STORAGE_KEY = "rioplatense-drafts";

const EMPTY_DRAFTS = {
  vocabCategories: [],
  vocabItems: [],
  verbs: [],
};

/** @returns {{ vocabCategories: Array, vocabItems: Array, verbs: Array }} */
export function loadDrafts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return structuredClone(EMPTY_DRAFTS);
    }

    const parsed = JSON.parse(raw);
    return {
      vocabCategories: Array.isArray(parsed.vocabCategories)
        ? parsed.vocabCategories
        : [],
      vocabItems: Array.isArray(parsed.vocabItems) ? parsed.vocabItems : [],
      verbs: Array.isArray(parsed.verbs) ? parsed.verbs : [],
    };
  } catch {
    return structuredClone(EMPTY_DRAFTS);
  }
}

export function saveDrafts(drafts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
}

export function clearDrafts() {
  localStorage.removeItem(STORAGE_KEY);
}

export function slugifyCategoryId(name) {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function addVocabCategory(displayName, id = null) {
  const drafts = loadDrafts();
  const categoryId = id || slugifyCategoryId(displayName);

  if (!categoryId) {
    throw new Error("Category id could not be generated.");
  }

  const existsInDrafts = drafts.vocabCategories.some(
    (category) => category.id === categoryId
  );

  if (!existsInDrafts) {
    drafts.vocabCategories.push({
      id: categoryId,
      display_name: displayName.trim(),
    });
    saveDrafts(drafts);
  }

  return categoryId;
}

export function addVocabItem(spanish, english, categoryId) {
  const drafts = loadDrafts();
  drafts.vocabItems.push({
    categoryId,
    spanish: spanish.trim(),
    english: english.trim(),
  });
  saveDrafts(drafts);
}

export function addVerb(entry) {
  const drafts = loadDrafts();
  const existingIndex = drafts.verbs.findIndex(
    (verb) => verb.infinitive === entry.infinitive
  );

  if (existingIndex >= 0) {
    drafts.verbs[existingIndex] = entry;
  } else {
    drafts.verbs.push(entry);
  }

  saveDrafts(drafts);
}

/** Merge file-backed vocab with local draft additions. */
export function mergeVocabWithDrafts(vocab, drafts = loadDrafts()) {
  const merged = structuredClone(vocab);
  const categoriesById = new Map(
    merged.categories.map((category) => [category.id, category])
  );

  for (const draftCategory of drafts.vocabCategories) {
    if (!categoriesById.has(draftCategory.id)) {
      const category = {
        id: draftCategory.id,
        display_name: draftCategory.display_name,
        items: {},
      };
      merged.categories.push(category);
      categoriesById.set(category.id, category);
    }
  }

  for (const item of drafts.vocabItems) {
    const category = categoriesById.get(item.categoryId);
    if (category) {
      category.items[item.spanish] = item.english;
    }
  }

  return merged;
}

/** Merge file-backed verbs with local draft additions (draft wins on duplicate infinitive). */
export function mergeVerbsWithDrafts(verbs, drafts = loadDrafts()) {
  const merged = structuredClone(verbs);
  const verbsByInfinitive = new Map(
    merged.map((verb) => [verb.infinitive, verb])
  );

  for (const draftVerb of drafts.verbs) {
    verbsByInfinitive.set(draftVerb.infinitive, draftVerb);
  }

  return Array.from(verbsByInfinitive.values());
}

export function getDraftSummary(drafts = loadDrafts()) {
  return {
    categoryCount: drafts.vocabCategories.length,
    vocabItemCount: drafts.vocabItems.length,
    verbCount: drafts.verbs.length,
  };
}

export function exportMergedJson(vocab, verbs) {
  return {
    vocab: `${JSON.stringify(vocab, null, 2)}\n`,
    verbs: `${JSON.stringify(verbs, null, 2)}\n`,
  };
}
