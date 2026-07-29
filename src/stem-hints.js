import { t } from "./i18n/index.js";

/** Short stem-change pattern keys shown during conjugation drills. */
const STEM_PATTERN_KEYS = {
  stem_changer_e_ie: "e_ie",
  stem_changer_o_ue: "o_ue",
  stem_changer_e_i: "e_i",
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
 * Return a pattern key when this specific form uses a stem change.
 * Uses the expected answer so vos/nosotros unchanged forms stay silent.
 */
export function getStemChangeHint(verbType, answer, pronoun, nosotrosAnswer = null) {
  if (!verbType?.startsWith("stem_changer") || !answer) {
    return null;
  }

  const patternKey = STEM_PATTERN_KEYS[verbType];
  if (!patternKey) {
    return null;
  }

  const answerPart = stripReflexivePronoun(answer);
  const nosotrosPart = nosotrosAnswer ? stripReflexivePronoun(nosotrosAnswer) : null;

  if (verbType === "stem_changer_e_ie" && /ie/i.test(answerPart)) {
    return patternKey;
  }

  if (verbType === "stem_changer_o_ue" && /ue/i.test(answerPart)) {
    return patternKey;
  }

  if (verbType === "stem_changer_e_i") {
    if (!E_I_HINT_PRONOUNS.has(pronoun)) {
      return null;
    }

    if (usesEiStemChange(answerPart, nosotrosPart)) {
      return patternKey;
    }
  }

  return null;
}

export function formatStemChangeHint(patternKey) {
  if (!patternKey) {
    return null;
  }

  const pattern = t(`stemHint.pattern.${patternKey}`);
  return t("stemHint.label", { pattern });
}
