import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthRateLimitService } from './auth-rate-limit.service';
import { AuthService, type AuthSessionTokens } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authRateLimitService: AuthRateLimitService,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Req() request: Request,
  ): Promise<AuthSessionTokens> {
    await this.authRateLimitService.assertCanProceed(
      'register',
      this.resolveClientKey(request),
    );
    return this.authService.register(dto.email, dto.password);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
  ): Promise<AuthSessionTokens> {
    await this.authRateLimitService.assertCanProceed(
      'login',
      this.resolveClientKey(request),
    );
    return this.authService.login(dto.email, dto.password);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() request: Request,
  ): Promise<AuthSessionTokens> {
    await this.authRateLimitService.assertCanProceed(
      'refresh',
      this.resolveClientKey(request),
    );
    return this.authService.refresh(dto.refreshToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Body() dto: RefreshTokenDto,
    @Req() request: Request,
  ): Promise<void> {
    await this.authRateLimitService.assertCanProceed(
      'logout',
      this.resolveClientKey(request),
    );
    await this.authService.logout(dto.refreshToken);
  }

  private resolveClientKey(request: Request): string {
    const forwardedFor = request.headers['x-forwarded-for'];
    const forwarded =
      typeof forwardedFor === 'string'
        ? forwardedFor
        : Array.isArray(forwardedFor)
          ? forwardedFor[0]
          : '';
    const ipCandidate = forwarded.split(',')[0]?.trim() || request.ip || '';
    return ipCandidate.trim().slice(0, 120) || 'unknown';
  }
}
