function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

function rawTokenize(value: string): string[] {
  const normalized = normalizeWhitespace(
    value
      .toLocaleLowerCase()
      .replace(/[^\p{L}\p{N}\s-]+/gu, " ")
  );

  return normalized.length > 0 ? normalized.split(" ") : [];
}

export function normalizeForMatching(value: string): string {
  return normalizeWhitespace(
    value
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLocaleLowerCase()
      .replace(/[^\p{L}\p{N}\s-]+/gu, " ")
  );
}

export function tokenizeForMatching(value: string): string[] {
  const normalized = normalizeForMatching(value);
  return normalized.length > 0 ? normalized.split(" ") : [];
}

function tokenStem(token: string): string {
  return token.length > 6 ? token.slice(0, 6) : token;
}

export function escapeLikePattern(term: string): string {
  return term.replace(/%/g, '\\%').replace(/_/g, '\\_');
}

function tokensMatch(left: string, right: string): boolean {
  if (left === right) {
    return true;
  }

  const shorterLength = Math.min(left.length, right.length);
  return shorterLength >= 5 && tokenStem(left) === tokenStem(right);
}

export function buildKeywordTerms(query: string, maxTerms = 6): string[] {
  const seenTerms = new Set<string>();
  const terms: string[] = [];

  for (const token of rawTokenize(query).sort((left, right) => right.length - left.length)) {
    if (token.length < 3) {
      continue;
    }

    const variants = token.length > 6 ? [token, tokenStem(token)] : [token];

    for (const variant of variants) {
      if (seenTerms.has(variant)) {
        continue;
      }

      seenTerms.add(variant);
      terms.push(variant);

      if (terms.length === maxTerms) {
        return terms;
      }
    }
  }

  return terms;
}

export function scoreTextAgainstQuery(
  query: string,
  ...candidateParts: Array<string | null | undefined>
): number {
  const queryTokens = Array.from(new Set(tokenizeForMatching(query))).filter(
    (token) => token.length >= 3
  );
  const candidateText = candidateParts.filter(Boolean).join(" ").trim();
  const normalizedCandidate = normalizeForMatching(candidateText);
  const candidateTokens = Array.from(new Set(tokenizeForMatching(candidateText))).filter(
    (token) => token.length >= 3
  );

  if (queryTokens.length === 0 || candidateTokens.length === 0 || normalizedCandidate.length === 0) {
    return 0;
  }

  let matchedQueryTokens = 0;
  let matchedCandidateTokens = 0;

  for (const queryToken of queryTokens) {
    if (candidateTokens.some((candidateToken) => tokensMatch(queryToken, candidateToken))) {
      matchedQueryTokens += 1;
    }
  }

  for (const candidateToken of candidateTokens) {
    if (queryTokens.some((queryToken) => tokensMatch(candidateToken, queryToken))) {
      matchedCandidateTokens += 1;
    }
  }

  const normalizedQuery = normalizeForMatching(query);
  const coverage = matchedQueryTokens / queryTokens.length;
  const precision = matchedCandidateTokens / candidateTokens.length;
  const exactPhraseBoost = normalizedQuery.length > 0 && normalizedCandidate.includes(normalizedQuery)
    ? 0.25
    : 0;

  return Math.min(0.99, coverage * 0.75 + precision * 0.2 + exactPhraseBoost);
}
