import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

const DEFAULT_ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const DEFAULT_REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
const MIN_TOKEN_SECRET_LENGTH = 32;

type AccessTokenPayload = {
  sub: string;
  sid: string;
  type: 'access';
  iat: number;
  exp: number;
};

type UserSession = {
  userId: string;
  refreshTokenHash: string;
  refreshExpiresAt: number;
};

export type AuthSessionTokens = {
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class AuthService {
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

  private readonly sessions = new Map<string, UserSession>();

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async register(email: string, password: string): Promise<AuthSessionTokens> {
    this.pruneExpiredSessions();

    const normalizedEmail = this.normalizeEmail(email);
    const existingUser = await this.findUserByEmail(normalizedEmail);
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const user = this.usersRepository.create({
      email: normalizedEmail,
      passwordHash: this.hashPassword(password),
    });

    try {
      const savedUser = await this.usersRepository.save(user);
      return this.issueSessionTokens(savedUser.id);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('User already exists');
      }
      throw error;
    }
  }

  async login(email: string, password: string): Promise<AuthSessionTokens> {
    this.pruneExpiredSessions();

    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.findUserByEmail(normalizedEmail);
    if (!user || !this.verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueSessionTokens(user.id);
  }

  refresh(refreshToken: string): AuthSessionTokens {
    this.pruneExpiredSessions();

    const parsed = this.parseRefreshToken(refreshToken);
    if (!parsed) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const session = this.sessions.get(parsed.sessionId);
    if (!session) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const now = this.getNowSeconds();
    if (session.refreshExpiresAt <= now) {
      this.sessions.delete(parsed.sessionId);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const incomingHash = this.hashValue(parsed.secret);
    if (!this.secureEquals(incomingHash, session.refreshTokenHash)) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    return this.issueSessionTokens(session.userId, parsed.sessionId);
  }

  logout(refreshToken: string): void {
    this.pruneExpiredSessions();

    const parsed = this.parseRefreshToken(refreshToken);
    if (!parsed) {
      return;
    }

    const session = this.sessions.get(parsed.sessionId);
    if (!session) {
      return;
    }

    const incomingHash = this.hashValue(parsed.secret);
    if (this.secureEquals(incomingHash, session.refreshTokenHash)) {
      this.sessions.delete(parsed.sessionId);
    }
  }

  isValidAccessToken(token: string): boolean {
    this.pruneExpiredSessions();

    const payload = this.parseAccessToken(token);
    if (!payload) {
      return false;
    }

    const session = this.sessions.get(payload.sid);
    if (!session) {
      return false;
    }
    if (session.userId !== payload.sub) {
      this.sessions.delete(payload.sid);
      return false;
    }

    const now = this.getNowSeconds();
    if (session.refreshExpiresAt <= now) {
      this.sessions.delete(payload.sid);
      return false;
    }

    return true;
  }

  private issueSessionTokens(
    userId: string,
    sessionId?: string,
  ): AuthSessionTokens {
    const now = this.getNowSeconds();
    const refreshSecret = this.generateOpaqueToken();
    const activeSessionId = sessionId ?? randomUUID();

    this.sessions.set(activeSessionId, {
      userId,
      refreshTokenHash: this.hashValue(refreshSecret),
      refreshExpiresAt: now + this.refreshTokenTtlSeconds,
    });

    return {
      accessToken: this.createAccessToken(userId, activeSessionId, now),
      refreshToken: `${activeSessionId}.${refreshSecret}`,
    };
  }

  private createAccessToken(
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

  private parseAccessToken(token: string): AccessTokenPayload | null {
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

  private parseRefreshToken(
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

  private generateOpaqueToken(): string {
    return randomBytes(48).toString('base64url');
  }

  private sign(value: string): string {
    return createHmac('sha256', this.tokenSecret)
      .update(value)
      .digest('base64url');
  }

  private hashValue(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = scryptSync(password, salt, 64).toString('hex');
    return `scrypt$${salt}$${derivedKey}`;
  }

  private verifyPassword(password: string, storedHash: string): boolean {
    const [algorithm, salt, expected] = storedHash.split('$');
    if (algorithm !== 'scrypt' || !salt || !expected) {
      return false;
    }

    const actual = scryptSync(password, salt, 64).toString('hex');
    return this.secureEquals(actual, expected);
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

  private pruneExpiredSessions(): void {
    const now = this.getNowSeconds();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.refreshExpiresAt <= now) {
        this.sessions.delete(sessionId);
      }
    }
  }

  private getNowSeconds(): number {
    return Math.floor(Date.now() / 1000);
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private async findUserByEmail(email: string): Promise<User | null> {
    const normalizedEmail = this.normalizeEmail(email);
    return this.usersRepository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = :email', { email: normalizedEmail })
      .getOne();
  }

  private isUniqueViolation(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    return 'code' in error && (error as { code?: string }).code === '23505';
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
