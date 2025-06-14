import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getStatus() {
    return {
      message: 'NestJS Backend System is running',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }
}