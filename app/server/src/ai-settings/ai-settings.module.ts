import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiSettingsConnectionTestService } from './ai-settings-connection-test.service';
import { AiSettingsController } from './ai-settings.controller';
import { AiSettingsCryptoService } from './ai-settings-crypto.service';
import { AiSettingsRateLimitService } from './ai-settings-rate-limit.service';
import { AiSettingsService } from './ai-settings.service';
import { AiProviderSettings } from './entities/ai-provider-settings.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AiProviderSettings])],
  controllers: [AiSettingsController],
  providers: [
    AiSettingsService,
    AiSettingsCryptoService,
    AiSettingsRateLimitService,
    AiSettingsConnectionTestService,
  ],
  exports: [AiSettingsService],
})
export class AiSettingsModule {}
