import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthRedisService } from './health-redis.service';
import { HealthService } from './health.service';

@Module({
  controllers: [HealthController],
  providers: [HealthService, HealthRedisService],
})
export class HealthModule {}
