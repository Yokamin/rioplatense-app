import { DEFAULT_TENSE, PRONOUN_KEYS } from "./data-loader.js";
import { getVerbFrequency } from "./verb-frequency.js";

function pickRandomItem(items) {
  if (items.length === 0) {
    return null;
  }

  const index = Math.floor(Math.random() * items.length);
  return items[index];
}

function hasCompleteConjugation(tenseMap, pronouns) {
  return pronouns.every((pronoun) => Boolean(tenseMap[pronoun]?.trim()));
}

/**
 * Filter verbs eligible for conjugation drills.
 * @param {object} options
 * @param {string} options.tense
 * @param {string[]|null} options.types - verb type ids; null = all types
 * @param {string[]|null} options.infinitives - restrict to these verbs; null = all
 * @param {string[]} options.pronouns - pronouns that must exist on the tense map
 */
export function filterVerbsForDrill(
  verbs,
  {
    tense = DEFAULT_TENSE,
    types = null,
    infinitives = null,
    pronouns = PRONOUN_KEYS,
    reflexiveOnly = false,
  } = {}
) {
  return verbs.filter((verb) => {
    if (reflexiveOnly && !verb.is_reflexive) {
      return false;
    }

    if (!reflexiveOnly && verb.is_reflexive) {
      return false;
    }

    const tenseMap = verb[tense];
    if (!tenseMap || !hasCompleteConjugation(tenseMap, pronouns)) {
      return false;
    }

    if (types && types.length > 0 && !types.includes(verb.type)) {
      return false;
    }

    if (
      infinitives &&
      infinitives.length > 0 &&
      !infinitives.includes(verb.infinitive)
    ) {
      return false;
    }

    return true;
  });
}

/**
 * Pick a random vocabulary card from optional category ids (null = all).
 */
export function pickRandomVocabCard(vocab, categoryIds = null) {
  const categories =
    categoryIds && categoryIds.length > 0
      ? vocab.categories.filter((category) => categoryIds.includes(category.id))
      : vocab.categories;

  const categoriesWithItems = categories.filter(
    (category) => Object.keys(category.items).length > 0
  );

  if (categoriesWithItems.length === 0) {
    return null;
  }

  const category = pickRandomItem(categoriesWithItems);
  const entries = Object.entries(category.items);
  const [spanish, english] = pickRandomItem(entries);

  return {
    type: "vocab",
    categoryId: category.id,
    categoryName: category.display_name,
    spanish,
    english,
    prompt: english,
    answer: spanish,
  };
}

/**
 * Pick a random verb conjugation card using drill filters.
 */
export function pickRandomVerbCard(verbs, options = {}) {
  const {
    tense = DEFAULT_TENSE,
    types = null,
    infinitives = null,
    pronouns = PRONOUN_KEYS,
    reflexiveOnly = false,
  } = options;

  const eligibleVerbs = filterVerbsForDrill(verbs, {
    tense,
    types,
    infinitives,
    pronouns,
    reflexiveOnly,
  });

  if (eligibleVerbs.length === 0) {
    return null;
  }

  const eligiblePronouns =
    pronouns.length > 0 ? pronouns : PRONOUN_KEYS;

  const verb = pickRandomItem(eligibleVerbs);
  const pronoun = pickRandomItem(eligiblePronouns);
  const conjugation = verb[tense][pronoun];

  return {
    type: verb.is_reflexive ? "reflexive" : "verb",
    tense,
    infinitive: verb.infinitive,
    english: verb.english,
    verbType: verb.type,
    pronoun,
    prompt: `${verb.infinitive} (${pronoun})`,
    answer: conjugation,
    note: verb.note ?? null,
  };
}

/** List category ids and display names for filter UI. */
export function listVocabCategories(vocab) {
  return vocab.categories.map((category) => ({
    id: category.id,
    displayName: category.display_name,
    itemCount: Object.keys(category.items).length,
  }));
}

/** List verbs that support a given tense (including incomplete ones). */
export function listVerbsForTense(verbs, tense = DEFAULT_TENSE, { reflexiveOnly = null } = {}) {
  return verbs
    .filter((verb) => {
      if (!verb[tense]) {
        return false;
      }

      if (reflexiveOnly === true && !verb.is_reflexive) {
        return false;
      }

      if (reflexiveOnly === false && verb.is_reflexive) {
        return false;
      }

      return true;
    })
    .map((verb) => ({
      infinitive: verb.infinitive,
      english: verb.english,
      type: verb.type,
      isComplete: hasCompleteConjugation(verb[tense], PRONOUN_KEYS),
      frequency: getVerbFrequency(verb),
    }));
}

/** Count verbs matching drill filters. */
export function countEligibleVerbs(verbs, options = {}) {
  return filterVerbsForDrill(verbs, options).length;
}

/** Count vocab items across selected categories. */
export function countVocabItems(vocab, categoryIds = null) {
  const categories =
    categoryIds && categoryIds.length > 0
      ? vocab.categories.filter((category) => categoryIds.includes(category.id))
      : vocab.categories;

  return categories.reduce(
    (total, category) => total + Object.keys(category.items).length,
    0
  );
}
