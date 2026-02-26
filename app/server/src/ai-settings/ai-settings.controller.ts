import { Body, Controller, Delete, Get, Post, Put, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AiSettingsConnectionTestService } from './ai-settings-connection-test.service';
import { AiSettingsService } from './ai-settings.service';
import { TestAiSettingsDto } from './dto/test-ai-settings.dto';
import { UpdateAiSettingsDto } from './dto/update-ai-settings.dto';

@Controller('settings/ai')
export class AiSettingsController {
  constructor(
    private readonly aiSettingsService: AiSettingsService,
    private readonly aiSettingsConnectionTestService: AiSettingsConnectionTestService,
  ) {}

  @Get()
  getSettings() {
    return this.aiSettingsService.getPublicSettings();
  }

  @Put()
  updateSettings(
    @Body() dto: UpdateAiSettingsDto,
    @Req() request: Request,
  ) {
    return this.aiSettingsService.updateSettings(dto, this.resolveUpdatedBy(request));
  }

  @Post('test')
  testConnection(
    @Body() dto: TestAiSettingsDto,
    @Req() request: Request,
  ) {
    return this.aiSettingsConnectionTestService.testConnection(
      dto,
      this.resolveClientKey(request),
    );
  }

  @Delete()
  resetToEnvDefaults() {
    return this.aiSettingsService.resetToEnvDefaults();
  }

  private resolveUpdatedBy(request: Request): string | null {
    const headerValue = request.headers['x-admin-user'];
    if (typeof headerValue === 'string' && headerValue.trim()) {
      return headerValue.trim().slice(0, 120);
    }
    return null;
  }

  private resolveClientKey(request: Request): string {
    const authorization = request.headers.authorization ?? '';
    const forwardedFor = request.headers['x-forwarded-for'];
    const ip = Array.isArray(forwardedFor)
      ? forwardedFor.join(',')
      : forwardedFor ?? request.ip ?? 'unknown';
    return `${authorization}|${ip}`;
  }
}
