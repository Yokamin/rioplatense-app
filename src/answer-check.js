/** Normalize for accent-insensitive comparison (case + accents). */
export function normalizeSpanishInput(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Case-insensitive exact match preserving accents. */
export function normalizeExactInput(value) {
  return String(value).trim().toLowerCase();
}

/**
 * @returns {'empty'|'exact'|'accent'|'wrong'}
 */
export function evaluateAnswer(userInput, expected) {
  if (!userInput.trim()) {
    return "empty";
  }

  const exactMatch = normalizeExactInput(userInput) === normalizeExactInput(expected);
  if (exactMatch) {
    return "exact";
  }

  const accentMatch =
    normalizeSpanishInput(userInput) === normalizeSpanishInput(expected);
  if (accentMatch) {
    return "accent";
  }

  return "wrong";
}

export const ANSWER_FEEDBACK = {
  exact: { className: "is-correct" },
  accent: { className: "is-accent" },
  wrong: { className: "is-incorrect" },
  empty: { className: "is-incorrect" },
};
