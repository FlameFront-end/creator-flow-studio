export type LlmResponseErrorCode =
  | 'provider_request_failed'
  | 'empty_response'
  | 'invalid_json_payload';

export class LlmResponseError extends Error {
  readonly code: LlmResponseErrorCode;
  readonly rawResponse: string | null;

  constructor(
    message: string,
    code: LlmResponseErrorCode,
    options?: { rawResponse?: string | null },
  ) {
    super(message);
    this.code = code;
    this.rawResponse = options?.rawResponse ?? null;
  }
}

export const isLlmTimeoutError = (error: unknown): error is LlmResponseError =>
  error instanceof LlmResponseError &&
  error.code === 'provider_request_failed' &&
  error.message.toLowerCase().includes('timed out');
