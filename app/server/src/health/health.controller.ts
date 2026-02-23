import { Controller, Get, Header } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  @Header('Content-Type', 'text/plain; charset=utf-8')
  getHealth(): string {
    return 'ok';
  }
}
