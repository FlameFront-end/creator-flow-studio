import { ConsoleLogger } from '@nestjs/common';
import { createWriteStream, mkdirSync, type WriteStream } from 'node:fs';
import { resolve } from 'node:path';

const resolveLogsDir = (): string => {
  const fromEnv = process.env.APP_LOG_DIR?.trim();
  return fromEnv ? resolve(fromEnv) : resolve(process.cwd(), '.logs');
};

const resolveLogFilePath = (processName: string): string => {
  const logsDir = resolveLogsDir();
  mkdirSync(logsDir, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  return resolve(logsDir, `${processName}-${date}.log`);
};

export class AppLogger extends ConsoleLogger {
  private readonly stream: WriteStream;

  constructor(context: string, processName: string) {
    super(context, { timestamp: true });
    this.stream = createWriteStream(resolveLogFilePath(processName), {
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
