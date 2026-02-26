import { Injectable } from '@nestjs/common';
import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

const DEFAULT_ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const DEFAULT_REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
const MIN_TOKEN_SECRET_LENGTH = 32;

export type AccessTokenPayload = {
  sub: string;
  sid: string;
  type: 'access';
  iat: number;
  exp: number;
};

@Injectable()
export class AuthTokenService {
  private readonly tokenSecret = this.requireEnv(
    'AUTH_TOKEN_SECRET',
    MIN_TOKEN_SECRET_LENGTH,
  );
  private readonly accessTokenTtlSeconds = this.parsePositiveIntEnv(
    'AUTH_ACCESS_TOKEN_TTL_SECONDS',
    DEFAULT_ACCESS_TOKEN_TTL_SECONDS,
  );
  private readonly refreshTokenTtlSeconds = this.parsePositiveIntEnv(
    'AUTH_REFRESH_TOKEN_TTL_SECONDS',
    DEFAULT_REFRESH_TOKEN_TTL_SECONDS,
  );

  createAccessToken(
    userId: string,
    sessionId: string,
    issuedAt: number,
  ): string {
    const encodedHeader = this.base64UrlEncodeJson({
      alg: 'HS256',
      typ: 'JWT',
    });
    const encodedPayload = this.base64UrlEncodeJson({
      sub: userId,
      sid: sessionId,
      type: 'access',
      iat: issuedAt,
      exp: issuedAt + this.accessTokenTtlSeconds,
    });
    const signature = this.sign(`${encodedHeader}.${encodedPayload}`);
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  parseAccessToken(token: string): AccessTokenPayload | null {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [encodedHeader, encodedPayload, providedSignature] = parts;
    const expectedSignature = this.sign(`${encodedHeader}.${encodedPayload}`);

    if (!this.secureEquals(providedSignature, expectedSignature)) {
      return null;
    }

    try {
      const header = JSON.parse(this.base64UrlDecode(encodedHeader)) as {
        alg?: string;
        typ?: string;
      };
      if (header.alg !== 'HS256' || header.typ !== 'JWT') {
        return null;
      }

      const payload = JSON.parse(this.base64UrlDecode(encodedPayload)) as {
        sub?: string;
        sid?: string;
        type?: string;
        iat?: number;
        exp?: number;
      };

      if (
        typeof payload.sub !== 'string' ||
        payload.type !== 'access' ||
        typeof payload.sid !== 'string' ||
        typeof payload.iat !== 'number' ||
        typeof payload.exp !== 'number'
      ) {
        return null;
      }

      const now = this.getNowSeconds();
      if (payload.exp <= now || payload.iat > now + 30) {
        return null;
      }

      return {
        sub: payload.sub,
        sid: payload.sid,
        type: 'access',
        iat: payload.iat,
        exp: payload.exp,
      };
    } catch {
      return null;
    }
  }

  parseRefreshToken(
    refreshToken: string,
  ): { sessionId: string; secret: string } | null {
    const separatorIndex = refreshToken.indexOf('.');
    if (
      separatorIndex <= 0 ||
      separatorIndex >= refreshToken.length - 1 ||
      refreshToken.indexOf('.', separatorIndex + 1) !== -1
    ) {
      return null;
    }

    const sessionId = refreshToken.slice(0, separatorIndex);
    const secret = refreshToken.slice(separatorIndex + 1);

    if (!sessionId || !secret) {
      return null;
    }

    return { sessionId, secret };
  }

  generateOpaqueToken(): string {
    return randomBytes(48).toString('base64url');
  }

  hashValue(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  getNowSeconds(): number {
    return Math.floor(Date.now() / 1000);
  }

  getRefreshTokenTtlSeconds(): number {
    return this.refreshTokenTtlSeconds;
  }

  private sign(value: string): string {
    return createHmac('sha256', this.tokenSecret)
      .update(value)
      .digest('base64url');
  }

  private secureEquals(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left, 'utf8');
    const rightBuffer = Buffer.from(right, 'utf8');

    if (leftBuffer.length !== rightBuffer.length) {
      return false;
    }

    return timingSafeEqual(leftBuffer, rightBuffer);
  }

  private base64UrlEncodeJson(value: object): string {
    return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
  }

  private base64UrlDecode(value: string): string {
    return Buffer.from(value, 'base64url').toString('utf8');
  }

  private requireEnv(name: string, minLength = 1): string {
    const value = process.env[name]?.trim();
    if (!value || value.length < minLength) {
      throw new Error(`${name} environment variable is required`);
    }
    return value;
  }

  private parsePositiveIntEnv(name: string, defaultValue: number): number {
    const raw = process.env[name]?.trim();
    if (!raw) {
      return defaultValue;
    }

    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new Error(`${name} must be a positive integer`);
    }

    return parsed;
  }
}
