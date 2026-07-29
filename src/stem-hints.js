/** Short stem-change labels shown during conjugation drills. */
const STEM_PATTERN_LABELS = {
  stem_changer_e_ie: "e → ie",
  stem_changer_o_ue: "o → ue",
  stem_changer_e_i: "e → i",
};

const E_I_HINT_PRONOUNS = new Set(["yo", "tu", "el", "ustedes"]);

function stripReflexivePronoun(answer) {
  return String(answer).replace(/^(me|te|se|nos|os)\s+/, "");
}

function stemRoot(word) {
  return String(word)
    .replace(/(amos|emos|imos|áis|éis|ís|an|en|as|es|e|o|a)$/i, "")
    .toLowerCase();
}

function usesEiStemChange(answerPart, nosotrosPart) {
  if (!nosotrosPart) {
    return false;
  }

  return stemRoot(answerPart) !== stemRoot(nosotrosPart);
}

/**
 * Return a short hint when this specific form uses a stem change.
 * Uses the expected answer so vos/nosotros unchanged forms stay silent.
 */
export function getStemChangeHint(verbType, answer, pronoun, nosotrosAnswer = null) {
  if (!verbType?.startsWith("stem_changer") || !answer) {
    return null;
  }

  const label = STEM_PATTERN_LABELS[verbType];
  if (!label) {
    return null;
  }

  const answerPart = stripReflexivePronoun(answer);
  const nosotrosPart = nosotrosAnswer ? stripReflexivePronoun(nosotrosAnswer) : null;

  if (verbType === "stem_changer_e_ie" && /ie/i.test(answerPart)) {
    return label;
  }

  if (verbType === "stem_changer_o_ue" && /ue/i.test(answerPart)) {
    return label;
  }

  if (verbType === "stem_changer_e_i") {
    if (!E_I_HINT_PRONOUNS.has(pronoun)) {
      return null;
    }

    if (usesEiStemChange(answerPart, nosotrosPart)) {
      return label;
    }
  }

  return null;
}

export function formatStemChangeHint(label) {
  return label ? `Stem change: ${label}` : null;
}
