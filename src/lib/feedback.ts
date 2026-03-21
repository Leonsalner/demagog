export const FEEDBACK_PANEL_ID = "feedback-widget-panel";
export const FEEDBACK_TRIGGER_ID = "feedback-navbar-trigger";

export const FEEDBACK_CATEGORIES = [
  "bug",
  "unclear",
  "missing",
  "improvement",
  "other",
] as const;

export const FEEDBACK_PAGE_TYPES = [
  "home",
  "add",
  "other",
] as const;

export const FEEDBACK_MODES = ["search", "detect"] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];
export type FeedbackPageType = (typeof FEEDBACK_PAGE_TYPES)[number];
export type FeedbackMode = (typeof FEEDBACK_MODES)[number];

export interface FeedbackContextPayload {
  url: string | null;
  path: string | null;
  pageType: FeedbackPageType | null;
  mode: FeedbackMode | null;
  query: string | null;
  statement: string | null;
}

export interface FeedbackRequestPayload {
  category: FeedbackCategory;
  message: string;
  context: FeedbackContextPayload;
}

export interface FeedbackPageContext {
  pageType: FeedbackPageType | null;
  mode: FeedbackMode | null;
  query: string | null;
  statement: string | null;
}

export interface BuildFeedbackMarkdownInput extends FeedbackRequestPayload {
  submittedAtIso: string;
}

export const DEFAULT_FEEDBACK_PAGE_CONTEXT: FeedbackPageContext = {
  pageType: null,
  mode: null,
  query: null,
  statement: null,
};

export const FEEDBACK_CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  bug: "Niečo nefunguje",
  unclear: "Niečo je nejasné",
  missing: "Niečo chýba",
  improvement: "Nápad na zlepšenie",
  other: "Iné",
};

export function isFeedbackCategory(value: unknown): value is FeedbackCategory {
  return typeof value === "string" && FEEDBACK_CATEGORIES.includes(value as FeedbackCategory);
}

export function isFeedbackPageType(value: unknown): value is FeedbackPageType {
  return typeof value === "string" && FEEDBACK_PAGE_TYPES.includes(value as FeedbackPageType);
}

export function isFeedbackMode(value: unknown): value is FeedbackMode {
  return typeof value === "string" && FEEDBACK_MODES.includes(value as FeedbackMode);
}

export function inferFeedbackPageType(pathname: string | null | undefined): FeedbackPageType | null {
  switch (pathname) {
    case "/":
      return "home";
    case "/add":
      return "add";
    case null:
    case undefined:
    case "":
      return null;
    default:
      return "other";
  }
}

function createDetailLine(label: string, value: string | null) {
  return value ? `- **${label}:** ${value}` : null;
}

export function buildFeedbackMarkdown({
  category,
  message,
  context,
  submittedAtIso,
}: BuildFeedbackMarkdownInput): string {
  const details = [
    createDetailLine("Kategória", FEEDBACK_CATEGORY_LABELS[category]),
    createDetailLine("Cesta", context.path),
    createDetailLine("URL", context.url),
    createDetailLine("Typ stránky", context.pageType),
    createDetailLine("Režim", context.mode),
    createDetailLine("Dopyt", context.query),
    createDetailLine("Rozpracovaný výrok", context.statement),
    createDetailLine("Odoslané", submittedAtIso),
  ].filter((line): line is string => Boolean(line));

  return [
    message.trim(),
    "",
    "---",
    "",
    ...details,
  ].join("\n");
}

export function getAttachableFeedbackUrl(url: string | null): string | null {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return null;
    }

    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.endsWith(".local")
    ) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}
