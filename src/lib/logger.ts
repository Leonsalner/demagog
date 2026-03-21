export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  correlationId: string;
  operation: string;
  stage: string;
  error?: {
    type: string;
    code?: string;
    message: string;
  };
  duration_ms?: number;
  context: Record<string, unknown>;
}

export interface MetricsRecord {
  name: string;
  tags: Record<string, string>;
  timestamp: string;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const MIN_LOG_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) ?? "INFO";

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[MIN_LOG_LEVEL];
}

function formatError(err: unknown): { type: string; code?: string; message: string } {
  if (err instanceof Error) {
    const code = "code" in err ? String((err as Record<string, unknown>)["code"]) : undefined;
    return {
      type: err.constructor.name,
      code: code !== "undefined" ? code : undefined,
      message: err.message,
    };
  }
  return {
    type: typeof err,
    message: String(err),
  };
}

function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return url.split("?")[0]?.split("#")[0] ?? url;
  }
}

function buildLogEntry(
  level: LogLevel,
  correlationId: string,
  operation: string,
  stage: string,
  context: Record<string, unknown>,
  error?: unknown,
  durationMs?: number,
): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    correlationId,
    operation,
    stage,
    context,
    ...(durationMs !== undefined && { duration_ms: durationMs }),
    ...(error !== undefined && { error: formatError(error) }),
  };
  return entry;
}

export interface Logger {
  debug(operation: string, stage: string, context?: Record<string, unknown>): void;
  info(operation: string, stage: string, context?: Record<string, unknown>): void;
  warn(operation: string, stage: string, context?: Record<string, unknown>, error?: unknown): void;
  error(operation: string, stage: string, context?: Record<string, unknown>, error?: unknown): void;
  errorInfo(err: unknown): { type: string; code?: string; message: string };
  sanitizeUrl(url: string): string;
  correlationId: string;
}

export function createLogger(correlationId: string): Logger {
  function log(level: LogLevel, operation: string, stage: string, context: Record<string, unknown> = {}, error?: unknown, durationMs?: number) {
    if (!shouldLog(level)) {
      return;
    }
    const entry = buildLogEntry(level, correlationId, operation, stage, context, error, durationMs);
    const output = level === "ERROR" ? console.error : level === "WARN" ? console.warn : level === "INFO" ? console.info : console.debug;
    output(JSON.stringify(entry));
  }

  return {
    correlationId,
    debug(operation: string, stage: string, context: Record<string, unknown> = {}) {
      log("DEBUG", operation, stage, context);
    },
    info(operation: string, stage: string, context: Record<string, unknown> = {}) {
      log("INFO", operation, stage, context);
    },
    warn(operation: string, stage: string, context: Record<string, unknown> = {}, error?: unknown) {
      log("WARN", operation, stage, context, error);
    },
    error(operation: string, stage: string, context: Record<string, unknown> = {}, error?: unknown) {
      log("ERROR", operation, stage, context, error);
    },
    errorInfo(err: unknown) {
      return formatError(err);
    },
    sanitizeUrl(url: string) {
      return sanitizeUrl(url);
    },
  };
}

export function generateCorrelationId(): string {
  return crypto.randomUUID();
}

const metricsBuffer: MetricsRecord[] = [];

export function incrementMetric(name: string, tags: Record<string, string> = {}) {
  const record: MetricsRecord = {
    name,
    tags,
    timestamp: new Date().toISOString(),
  };
  metricsBuffer.push(record);
  console.info(JSON.stringify({ type: "metric", ...record }));
}

export function getMetricsBuffer(): MetricsRecord[] {
  return [...metricsBuffer];
}

export function clearMetricsBuffer() {
  metricsBuffer.length = 0;
}
