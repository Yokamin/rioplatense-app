import { t } from "./i18n/index.js";

/** Pronouns and forms common elsewhere but not for active Rioplatense use. */
export function getConjugationDialectNote(pronoun) {
  if (pronoun === "tu") {
    return t("dialect.tu");
  }

  if (pronoun === "vosotros") {
    return t("dialect.vosotros");
  }

  return null;
}

/** Reserved for future vocab tags (e.g. re vs muy). */
export function getVocabDialectNote(_spanish, _categoryId) {
  return null;
}
