/** Pronouns and forms common elsewhere but not for active Rioplatense use. */
export const PRONOUN_DIALECT_NOTES = {
  tu: "Standard Spanish (tú) — understand it, but in Argentina you would use vos.",
  vosotros:
    "Used in Spain — understand it, but in Argentina you would use ustedes.",
};

export function getConjugationDialectNote(pronoun) {
  return PRONOUN_DIALECT_NOTES[pronoun] ?? null;
}

/** Reserved for future vocab tags (e.g. re vs muy). */
export function getVocabDialectNote(_spanish, _categoryId) {
  return null;
}
