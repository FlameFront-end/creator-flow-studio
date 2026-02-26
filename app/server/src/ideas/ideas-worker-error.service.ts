import { Injectable } from '@nestjs/common';
import { UnrecoverableError } from 'bullmq';
import {
  normalizeAiRunLogError,
  normalizeAiRunLogRawResponse,
} from './ai-run-log-normalizer';
import { LlmResponseError } from './llm/llm-response.error';

@Injectable()
export class IdeasWorkerErrorService {
  shouldUseMockFallback(
    error: unknown,
    aiTestModeEnabled: boolean,
    runtimeAiTestMode: boolean | undefined,
  ): boolean {
    const aiTestMode = runtimeAiTestMode ?? aiTestModeEnabled;
    return aiTestMode && this.isProviderNotConfiguredError(error);
  }

  shouldLogFailureForAttempt(
    attemptsMade: number,
    maxAttempts: number,
  ): boolean {
    const currentAttempt = attemptsMade + 1;
    return currentAttempt >= maxAttempts;
  }

  toQueueError(error: unknown): Error {
    if (this.isUnrecoverableError(error)) {
      return new UnrecoverableError(this.toErrorMessage(error));
    }
    if (error instanceof Error) {
      return error;
    }
    return new Error(this.toErrorMessage(error));
  }

  toErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return 'Unknown AI worker error';
  }

  truncateError(error: string): string {
    return normalizeAiRunLogError(error) ?? '';
  }

  truncateRawResponse(rawResponse: string): string {
    return normalizeAiRunLogRawResponse(rawResponse) ?? '';
  }

  resolveMaxAttempts(attempts: unknown): number {
    const parsedAttempts = Number(attempts ?? 1);
    if (!Number.isInteger(parsedAttempts) || parsedAttempts <= 0) {
      return 1;
    }
    return parsedAttempts;
  }

  extractErrorDetails(error: unknown): {
    message: string;
    code: string | null;
    rawResponse: string | null;
  } {
    if (error instanceof LlmResponseError) {
      return {
        message: error.message,
        code: error.code,
        rawResponse: error.rawResponse,
      };
    }
    return {
      message: this.toErrorMessage(error),
      code: null,
      rawResponse: null,
    };
  }

  private isUnrecoverableError(error: unknown): boolean {
    const message = this.toErrorMessage(error).toLowerCase();
    return (
      this.isProviderNotConfiguredError(error) ||
      (message.includes('prompt template') && message.includes('not found'))
    );
  }

  private isProviderNotConfiguredError(error: unknown): boolean {
    return this.toErrorMessage(error)
      .toLowerCase()
      .includes('is not configured for ai generation');
  }
}
