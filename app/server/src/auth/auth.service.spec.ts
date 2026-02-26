import { UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AuthSessionRecord } from './auth-session-store.service';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';

type UserRecord = User & {
  passwordHash: string;
};

type UsersQueryBuilderMock = {
  where: (sql: string, params: { email: string }) => UsersQueryBuilderMock;
  getOne: () => Promise<UserRecord | null>;
};

const createUsersRepositoryMock = () => {
  const users: UserRecord[] = [];

  return {
    users,
    create: jest.fn((partial: Partial<UserRecord>) => ({
      id: randomUUID(),
      createdAt: new Date(),
      ...partial,
    })),
    save: jest.fn((user: UserRecord) => {
      const next = {
        ...user,
        id: user.id || randomUUID(),
      };
      const existingIndex = users.findIndex((item) => item.id === next.id);
      if (existingIndex >= 0) {
        users[existingIndex] = next;
      } else {
        users.push(next);
      }
      return Promise.resolve(next);
    }),
    createQueryBuilder: jest.fn(() => {
      let normalizedEmail = '';
      const builder: UsersQueryBuilderMock = {
        where: (_sql: string, params: { email: string }) => {
          normalizedEmail = params.email.trim().toLowerCase();
          return builder;
        },
        getOne: () =>
          Promise.resolve(
            users.find(
              (user) => user.email.trim().toLowerCase() === normalizedEmail,
            ) ?? null,
          ),
      };
      return builder;
    }),
  };
};

const createSessionStoreMock = () => {
  const sessions = new Map<string, AuthSessionRecord>();
  return {
    setSession: jest.fn(
      (sessionId: string, session: AuthSessionRecord, ttlSeconds: number) => {
        void ttlSeconds;
        sessions.set(sessionId, session);
        return Promise.resolve();
      },
    ),
    getSession: jest.fn((sessionId: string) =>
      Promise.resolve(sessions.get(sessionId) ?? null),
    ),
    deleteSession: jest.fn((sessionId: string) => {
      sessions.delete(sessionId);
      return Promise.resolve();
    }),
  };
};

describe('AuthService smoke', () => {
  const previousSecret = process.env.AUTH_TOKEN_SECRET;

  beforeAll(() => {
    process.env.AUTH_TOKEN_SECRET = 'test-secret-with-at-least-32-characters';
  });

  afterAll(() => {
    if (previousSecret === undefined) {
      delete process.env.AUTH_TOKEN_SECRET;
      return;
    }
    process.env.AUTH_TOKEN_SECRET = previousSecret;
  });

  it('covers register -> login -> refresh -> logout flow', async () => {
    const usersRepositoryMock = createUsersRepositoryMock();
    const sessionStoreMock = createSessionStoreMock();
    const service = new AuthService(
      usersRepositoryMock as never,
      sessionStoreMock as never,
    );

    await service.register('User@Test.com', 'Password123!');

    const loginTokens = await service.login('user@test.com', 'Password123!');
    await expect(
      service.isValidAccessToken(loginTokens.accessToken),
    ).resolves.toBe(true);

    const refreshedTokens = await service.refresh(loginTokens.refreshToken);
    await expect(
      service.isValidAccessToken(refreshedTokens.accessToken),
    ).resolves.toBe(true);

    await service.logout(refreshedTokens.refreshToken);
    await expect(
      service.isValidAccessToken(refreshedTokens.accessToken),
    ).resolves.toBe(false);
    await expect(service.refresh(refreshedTokens.refreshToken)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
