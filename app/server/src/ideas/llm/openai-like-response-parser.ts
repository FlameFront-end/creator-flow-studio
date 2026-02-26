export type ParsedOpenAiLikePayload<T> = {
  payload: T | null;
  rawText: string;
};

export const parseOpenAiLikePayload = async <T>(
  response: Response,
): Promise<ParsedOpenAiLikePayload<T>> => {
  const rawText = await response.text();
  if (!rawText.trim()) {
    return { payload: null, rawText };
  }

  try {
    return {
      payload: JSON.parse(rawText) as T,
      rawText,
    };
  } catch {
    return { payload: null, rawText };
  }
};
