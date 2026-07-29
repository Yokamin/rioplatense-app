export function loadPracticeSettings(storageKey, defaults) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return structuredClone(defaults);
    }

    return { ...structuredClone(defaults), ...JSON.parse(raw) };
  } catch {
    return structuredClone(defaults);
  }
}

export function savePracticeSettings(storageKey, settings) {
  localStorage.setItem(storageKey, JSON.stringify(settings));
}

export const SETTINGS_KEYS = {
  conjugation: "rioplatense-settings-conjugation",
  reflexive: "rioplatense-settings-reflexive",
  vocab: "rioplatense-settings-vocab",
};

export function examConjugationSettingsKey(examId, presetId) {
  return `rioplatense-settings-exam-conjugation-${examId}-${presetId}`;
}

export function examReflexiveSettingsKey(examId) {
  return `rioplatense-settings-exam-reflexive-${examId}`;
}
