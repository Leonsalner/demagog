export type SourceUrlValidationResult = {
  status: "empty" | "valid" | "invalid";
  normalized: string | null;
};

function hasSupportedProtocol(value: string) {
  return /^[a-z][a-z\d+.-]*:\/\//iu.test(value);
}

function canUseAsExternalHostname(hostname: string) {
  return hostname === "localhost" || hostname.includes(".");
}

export function validateSourceUrl(value: string): SourceUrlValidationResult {
  const trimmed = value.trim();

  if (!trimmed) {
    return {
      status: "empty",
      normalized: null,
    };
  }

  const candidate = hasSupportedProtocol(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);

    if (
      (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
      !canUseAsExternalHostname(parsed.hostname)
    ) {
      return {
        status: "invalid",
        normalized: null,
      };
    }

    return {
      status: "valid",
      normalized: parsed.toString(),
    };
  } catch {
    return {
      status: "invalid",
      normalized: null,
    };
  }
}

export function normalizeSourceUrl(value: string): string {
  const validation = validateSourceUrl(value);
  return validation.status === "valid"
    ? (validation.normalized ?? value.trim())
    : value.trim();
}
