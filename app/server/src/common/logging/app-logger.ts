import { ConsoleLogger } from '@nestjs/common';
import {
  createWriteStream,
  mkdirSync,
  readdirSync,
  statSync,
  unlinkSync,
  type WriteStream,
} from 'node:fs';
import { resolve } from 'node:path';

const DEFAULT_LOG_RETENTION_DAYS = 14;
const DEFAULT_LOG_MAX_DIR_SIZE_MB = 256;

const toPositiveNumber = (
  value: string | undefined,
  fallback: number,
): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

const resolveLogsDir = (): string => {
  const fromEnv = process.env.APP_LOG_DIR?.trim();
  return fromEnv ? resolve(fromEnv) : resolve(process.cwd(), '.logs');
};

const resolveRetentionDays = (): number =>
  toPositiveNumber(
    process.env.APP_LOG_RETENTION_DAYS,
    DEFAULT_LOG_RETENTION_DAYS,
  );

const resolveMaxDirSizeBytes = (): number =>
  toPositiveNumber(
    process.env.APP_LOG_MAX_DIR_SIZE_MB,
    DEFAULT_LOG_MAX_DIR_SIZE_MB,
  ) *
  1024 *
  1024;

const resolveLogFilePath = (processName: string): string => {
  const logsDir = resolveLogsDir();
  mkdirSync(logsDir, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  return resolve(logsDir, `${processName}-${date}.log`);
};

type LogFileEntry = {
  path: string;
  mtimeMs: number;
  size: number;
};

const listLogFiles = (logsDir: string): LogFileEntry[] =>
  readdirSync(logsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.log'))
    .map((entry) => {
      const path = resolve(logsDir, entry.name);
      const stats = statSync(path);
      return {
        path,
        mtimeMs: stats.mtimeMs,
        size: stats.size,
      };
    });

const cleanupLogsDirectory = (
  logsDir: string,
  activeFilePath: string,
): void => {
  const retentionMs = resolveRetentionDays() * 24 * 60 * 60 * 1000;
  const maxDirSizeBytes = resolveMaxDirSizeBytes();
  const now = Date.now();

  try {
    const existingFiles = listLogFiles(logsDir);
    for (const file of existingFiles) {
      if (file.path === activeFilePath) {
        continue;
      }
      if (now - file.mtimeMs > retentionMs) {
        unlinkSync(file.path);
      }
    }

    const filesAfterRetention = listLogFiles(logsDir).sort(
      (a, b) => a.mtimeMs - b.mtimeMs,
    );
    let totalSize = filesAfterRetention.reduce(
      (sum, file) => sum + file.size,
      0,
    );
    for (const file of filesAfterRetention) {
      if (totalSize <= maxDirSizeBytes) {
        break;
      }
      if (file.path === activeFilePath) {
        continue;
      }
      unlinkSync(file.path);
      totalSize -= file.size;
    }
  } catch {
    // Cleanup failures should never break logger initialization.
  }
};

export class AppLogger extends ConsoleLogger {
  private readonly stream: WriteStream;

  constructor(context: string, processName: string) {
    super(context, { timestamp: true });
    const logFilePath = resolveLogFilePath(processName);
    cleanupLogsDirectory(resolveLogsDir(), logFilePath);
    this.stream = createWriteStream(logFilePath, {
      flags: 'a',
      encoding: 'utf8',
    });
  }

  override log(message: unknown, context?: string): void {
    super.log(message, context);
    this.writeLine('LOG', message, context);
  }

  override error(message: unknown, stack?: string, context?: string): void {
    super.error(message, stack, context);
    this.writeLine('ERROR', message, context, stack);
  }

  override warn(message: unknown, context?: string): void {
    super.warn(message, context);
    this.writeLine('WARN', message, context);
  }

  override debug(message: unknown, context?: string): void {
    super.debug(message, context);
    this.writeLine('DEBUG', message, context);
  }

  override verbose(message: unknown, context?: string): void {
    super.verbose(message, context);
    this.writeLine('VERBOSE', message, context);
  }

  private writeLine(
    level: string,
    message: unknown,
    context?: string,
    stack?: string,
  ): void {
    const timestamp = new Date().toISOString();
    const resolvedContext = context || this.context || 'App';
    const text = this.toMessage(message);
    const stackPart = stack ? `\n${stack}` : '';
    this.stream.write(
      `${timestamp} [${level}] [${resolvedContext}] ${text}${stackPart}\n`,
    );
  }

  private toMessage(message: unknown): string {
    if (typeof message === 'string') {
      return message;
    }

    if (message instanceof Error) {
      return message.message;
    }

    try {
      return JSON.stringify(message);
    } catch {
      return String(message);
    }
  }
}
