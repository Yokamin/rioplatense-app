import { DEFAULT_TENSE, PRONOUN_KEYS } from "./data-loader.js";
import { filterVerbsForDrill } from "./card-picker.js";

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickRandomItem(items) {
  if (items.length === 0) {
    return null;
  }
  return items[Math.floor(Math.random() * items.length)];
}

function buildSingleCard(verb, tense, pronoun) {
  return {
    type: verb.is_reflexive ? "reflexive" : "verb",
    drillFormat: "single",
    tense,
    infinitive: verb.infinitive,
    english: verb.english,
    verbType: verb.type,
    pronoun,
    prompt: `${verb.infinitive} (${pronoun})`,
    answer: verb[tense][pronoun],
    referenceAnswer: verb[tense].nosotros ?? null,
    note: verb.note ?? null,
  };
}

function buildPerVerbCard(verb, tense, pronouns) {
  const answers = {};
  for (const pronoun of pronouns) {
    answers[pronoun] = verb[tense][pronoun];
  }

  return {
    type: verb.is_reflexive ? "reflexive_table" : "verb_table",
    drillFormat: "per_verb",
    tense,
    infinitive: verb.infinitive,
    english: verb.english,
    verbType: verb.type,
    pronouns: [...pronouns],
    answers,
    note: verb.note ?? null,
  };
}

/**
 * Build the full set of drill cards for a session from filters.
 */
export function buildVerbDrillDeck(
  verbs,
  options,
  { drillStyle = "per_verb", cardOrder = "deck" } = {}
) {
  const tense = options.tense ?? DEFAULT_TENSE;
  const pronouns = options.pronouns?.length > 0 ? options.pronouns : PRONOUN_KEYS;
  const eligibleVerbs = filterVerbsForDrill(verbs, { ...options, tense, pronouns });

  let cards = [];
  if (drillStyle === "per_verb") {
    cards = eligibleVerbs.map((verb) => buildPerVerbCard(verb, tense, pronouns));
  } else {
    for (const verb of eligibleVerbs) {
      for (const pronoun of pronouns) {
        cards.push(buildSingleCard(verb, tense, pronoun));
      }
    }
  }

  if (cardOrder === "deck") {
    return shuffle(cards);
  }

  return cards;
}

/**
 * Iterate through a drill deck. Deck mode visits each card once before reshuffling.
 */
export function createDrillRunner(deck, cardOrder = "deck") {
  let queue = cardOrder === "deck" ? shuffle([...deck]) : [...deck];
  let index = 0;

  return {
    get cardOrder() {
      return cardOrder;
    },

    get deckSize() {
      return deck.length;
    },

    get deckProgress() {
      if (cardOrder !== "deck" || deck.length === 0 || index === 0) {
        return null;
      }

      return { current: index, total: deck.length };
    },

    reset(newDeck) {
      queue = cardOrder === "deck" ? shuffle([...newDeck]) : [...newDeck];
      index = 0;
    },

    next() {
      if (queue.length === 0) {
        return null;
      }

      if (cardOrder === "random") {
        return pickRandomItem(queue);
      }

      if (index >= queue.length) {
        queue = shuffle(queue);
        index = 0;
      }

      return queue[index++];
    },
  };
}
