import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { Repository } from 'typeorm';
import { AuthTokenService } from './auth-token.service';
import {
  AuthSessionRecord,
  AuthSessionStoreService,
} from './auth-session-store.service';
import { User } from './entities/user.entity';

export type AuthSessionTokens = {
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly authTokenService: AuthTokenService,
    private readonly authSessionStoreService: AuthSessionStoreService,
  ) {}

  async register(email: string, password: string): Promise<AuthSessionTokens> {
    const normalizedEmail = this.normalizeEmail(email);
    const existingUser = await this.findUserByEmail(normalizedEmail);
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const user = this.usersRepository.create({
      email: normalizedEmail,
      passwordHash: await this.hashPassword(password),
    });

    try {
      const savedUser = await this.usersRepository.save(user);
      return await this.issueSessionTokens(savedUser.id);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('User already exists');
      }
      throw error;
    }
  }

  async login(email: string, password: string): Promise<AuthSessionTokens> {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.findUserByEmail(normalizedEmail);
    if (!user || !(await this.verifyPassword(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueSessionTokens(user.id);
  }

  async refresh(refreshToken: string): Promise<AuthSessionTokens> {
    const parsed = this.authTokenService.parseRefreshToken(refreshToken);
    if (!parsed) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const session = await this.authSessionStoreService.getSession(
      parsed.sessionId,
    );
    if (!session) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const now = this.authTokenService.getNowSeconds();
    if (session.refreshExpiresAt <= now) {
      await this.authSessionStoreService.deleteSession(parsed.sessionId);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const incomingHash = this.authTokenService.hashValue(parsed.secret);
    if (!this.secureEquals(incomingHash, session.refreshTokenHash)) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    return this.issueSessionTokens(session.userId, parsed.sessionId);
  }

  async logout(refreshToken: string): Promise<void> {
    const parsed = this.authTokenService.parseRefreshToken(refreshToken);
    if (!parsed) {
      return;
    }

    const session = await this.authSessionStoreService.getSession(
      parsed.sessionId,
    );
    if (!session) {
      return;
    }

    const incomingHash = this.authTokenService.hashValue(parsed.secret);
    if (this.secureEquals(incomingHash, session.refreshTokenHash)) {
      await this.authSessionStoreService.deleteSession(parsed.sessionId);
    }
  }

  async isValidAccessToken(token: string): Promise<boolean> {
    const payload = this.authTokenService.parseAccessToken(token);
    if (!payload) {
      return false;
    }

    const session = await this.authSessionStoreService.getSession(payload.sid);
    if (!session) {
      return false;
    }
    if (session.userId !== payload.sub) {
      await this.authSessionStoreService.deleteSession(payload.sid);
      return false;
    }

    const now = this.authTokenService.getNowSeconds();
    if (session.refreshExpiresAt <= now) {
      await this.authSessionStoreService.deleteSession(payload.sid);
      return false;
    }

    return true;
  }

  private async issueSessionTokens(
    userId: string,
    sessionId?: string,
  ): Promise<AuthSessionTokens> {
    const now = this.authTokenService.getNowSeconds();
    const refreshSecret = this.authTokenService.generateOpaqueToken();
    const activeSessionId = sessionId ?? randomUUID();
    const session: AuthSessionRecord = {
      userId,
      refreshTokenHash: this.authTokenService.hashValue(refreshSecret),
      refreshExpiresAt: now + this.authTokenService.getRefreshTokenTtlSeconds(),
    };

    await this.authSessionStoreService.setSession(
      activeSessionId,
      session,
      this.authTokenService.getRefreshTokenTtlSeconds(),
    );

    return {
      accessToken: this.authTokenService.createAccessToken(
        userId,
        activeSessionId,
        now,
      ),
      refreshToken: `${activeSessionId}.${refreshSecret}`,
    };
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = await this.deriveScryptKey(password, salt);
    return `scrypt$${salt}$${derivedKey}`;
  }

  private async verifyPassword(
    password: string,
    storedHash: string,
  ): Promise<boolean> {
    const [algorithm, salt, expected] = storedHash.split('$');
    if (algorithm !== 'scrypt' || !salt || !expected) {
      return false;
    }

    const actual = await this.deriveScryptKey(password, salt);
    return this.secureEquals(actual, expected);
  }

  private async deriveScryptKey(
    password: string,
    salt: string,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      scrypt(password, salt, 64, (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(derivedKey.toString('hex'));
      });
    });
  }

  private secureEquals(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left, 'utf8');
    const rightBuffer = Buffer.from(right, 'utf8');

    if (leftBuffer.length !== rightBuffer.length) {
      return false;
    }

    return timingSafeEqual(leftBuffer, rightBuffer);
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
}
