import {
  getVerbFrequency,
  getVerbsByFrequency,
  isCoreVerb,
  VERB_FREQUENCY,
} from "./verb-frequency.js";

/** @deprecated Use getVerbsByFrequency(verbs, "core") or isCoreVerb instead. */
export function getCoreInfinitivesFromVerbs(verbs) {
  return getVerbsByFrequency(verbs, VERB_FREQUENCY.core).map(
    (verb) => verb.infinitive
  );
}

export { getVerbFrequency, isCoreVerb };
