const DEFAULT_AI_HTTP_TIMEOUT_MS = 20_000;
const MIN_AI_HTTP_TIMEOUT_MS = 1_000;

const resolveAiHttpTimeoutMs = (): number => {
  const parsed = Number(process.env.AI_HTTP_TIMEOUT_MS);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_AI_HTTP_TIMEOUT_MS;
  }

  const normalized = Math.trunc(parsed);
  if (normalized < MIN_AI_HTTP_TIMEOUT_MS) {
    return MIN_AI_HTTP_TIMEOUT_MS;
  }
  return normalized;
};

export const getAiHttpTimeoutMs = (): number => resolveAiHttpTimeoutMs();

export const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError';

export const toErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
};

export const fetchWithTimeout = async (
  input: string | URL,
  init: RequestInit,
): Promise<Response> => {
  const timeoutMs = getAiHttpTimeoutMs();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
};
