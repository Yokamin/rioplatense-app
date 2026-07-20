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
  exact: {
    className: "is-correct",
    message: "Correct.",
  },
  accent: {
    className: "is-accent",
    message: "Right word — check the accent(s). Full answer:",
  },
  wrong: {
    className: "is-incorrect",
    message: "Not quite — try again, or reveal the answer.",
  },
  empty: {
    className: "is-incorrect",
    message: "Type an answer first.",
  },
};
