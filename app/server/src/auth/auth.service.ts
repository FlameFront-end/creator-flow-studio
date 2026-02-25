import { Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AuthService {
  private readonly adminPassword = this.requireEnv('ADMIN_PASSWORD');
  private readonly adminApiToken = this.requireEnv('ADMIN_API_TOKEN');

  login(password: string): string {
    if (password !== this.adminPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.adminApiToken;
  }

  isValidToken(token: string): boolean {
    return token === this.adminApiToken;
  }

  private requireEnv(name: string): string {
    const value = process.env[name]?.trim();
    if (!value) {
      throw new Error(`${name} environment variable is required`);
    }
    return value;
  }
}
