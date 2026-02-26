import {
  Controller,
  Get,
  Header,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  @Header('Content-Type', 'text/plain; charset=utf-8')
  getHealth(): string {
    return 'ok';
  }

  @Public()
  @Get('readiness')
  async getReadiness() {
    const readiness = await this.healthService.checkReadiness();
    if (readiness.status !== 'ready') {
      throw new HttpException(readiness, HttpStatus.SERVICE_UNAVAILABLE);
    }
    return readiness;
  }
}
