const MAX_AI_LOG_ERROR_CHARS = 4000;
const MAX_AI_LOG_RAW_RESPONSE_CHARS = 60000;

export const normalizeAiRunLogError = (
  value: string | null | undefined,
): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, MAX_AI_LOG_ERROR_CHARS);
};

export const normalizeAiRunLogRawResponse = (
  value: string | null | undefined,
): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  if (!value.trim()) {
    return null;
  }

  return value.slice(0, MAX_AI_LOG_RAW_RESPONSE_CHARS);
};
