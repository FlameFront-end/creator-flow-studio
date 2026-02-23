import { Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AuthService {
  private readonly adminPassword = process.env.ADMIN_PASSWORD ?? 'changeme';
  private readonly adminApiToken = process.env.ADMIN_API_TOKEN ?? 'dev-admin-token';

  login(password: string): string {
    if (password !== this.adminPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.adminApiToken;
  }

  isValidToken(token: string): boolean {
    return token === this.adminApiToken;
  }
}
