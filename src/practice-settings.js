/**
 * Fill in missing or empty drill settings so first load / cleared cache
 * behaves like "everything enabled" without wiping explicit user choices.
 */
export function normalizeConjugationSettings(settings, defaults) {
  const merged = { ...defaults, ...settings };

  return {
    ...merged,
    tense: merged.tense || defaults.tense,
    types: merged.types?.length > 0 ? merged.types : [...defaults.types],
    pronouns: merged.pronouns?.length > 0 ? merged.pronouns : [...defaults.pronouns],
    inputMode: merged.inputMode === "reveal" ? "reveal" : "type",
    drillStyle: merged.drillStyle === "single" ? "single" : "per_verb",
    cardOrder: merged.cardOrder === "random" ? "random" : "deck",
    stemHints: merged.stemHints !== false,
  };
}

export function normalizeReflexiveSettings(settings, defaults) {
  const merged = { ...defaults, ...settings };

  return {
    ...merged,
    tense: merged.tense || defaults.tense,
    pronouns: merged.pronouns?.length > 0 ? merged.pronouns : [...defaults.pronouns],
    inputMode: merged.inputMode === "reveal" ? "reveal" : "type",
    drillStyle: merged.drillStyle === "single" ? "single" : "per_verb",
    cardOrder: merged.cardOrder === "random" ? "random" : "deck",
    stemHints: merged.stemHints !== false,
  };
}

/** Persist when normalization repaired empty or invalid saved filters. */
export function saveSettingsIfRepaired(storageKey, before, after, saveFn) {
  if (JSON.stringify(before) !== JSON.stringify(after)) {
    saveFn(storageKey, after);
  }
}
