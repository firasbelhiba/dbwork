import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class AppController {
  @Public()
  @Get()
  getHealth() {
    return {
      status: 'ok',
      message: 'DBWork API is running',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }

  @Public()
  @Get('health')
  getHealthCheck() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
