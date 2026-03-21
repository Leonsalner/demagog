import { PARTY_FILTER_OPTIONS } from "@/lib/politician-data";

function normalizePartyValue(value: string): string {
  return value.replace(/\s+/gu, " ").trim().toLocaleLowerCase("sk");
}

export function buildPartyAliasLookup(availableParties: string[]): Map<string, string[]> {
  const lookup = new Map<string, string[]>();

  for (const party of availableParties) {
    const normalizedParty = normalizePartyValue(party);

    for (const option of PARTY_FILTER_OPTIONS) {
      const normalizedAliases = option.aliases.map((alias) => normalizePartyValue(alias));

      if (normalizedAliases.includes(normalizedParty)) {
        const existing = lookup.get(option.label) ?? [];
        existing.push(party);
        lookup.set(option.label, existing);
        break;
      }
    }
  }

  return lookup;
}

export interface PartyOption {
  label: string;
  values: string[];
}

export function buildPartyOptions(availableParties: string[]): PartyOption[] {
  const aliasLookup = buildPartyAliasLookup(availableParties);

  return PARTY_FILTER_OPTIONS.map((option) => {
    const matchedValues = aliasLookup.get(option.label) ?? [];

    return {
      label: option.label,
      values: matchedValues,
    };
  });
}

export function normalizePartyFilterValues(
  values: string[] | null,
  availableParties: string[],
): string[] | null {
  if (!values || values.length === 0) {
    return null;
  }

  const resolved = new Set<string>();

  for (const value of values) {
    const normalizedValue = normalizePartyValue(value);
    let matched = false;

    for (const option of PARTY_FILTER_OPTIONS) {
      const normalizedAliases = option.aliases.map((alias) => normalizePartyValue(alias));

      if (normalizedAliases.includes(normalizedValue)) {
        for (const party of availableParties) {
          const normalizedParty = normalizePartyValue(party);
          if (normalizedAliases.includes(normalizedParty)) {
            resolved.add(party);
          }
        }
        matched = true;
        break;
      }
    }

    if (matched) {
      continue;
    }

    for (const party of availableParties) {
      if (normalizePartyValue(party) === normalizedValue) {
        resolved.add(party);
        break;
      }
    }
  }

  return resolved.size > 0 ? Array.from(resolved) : null;
}
