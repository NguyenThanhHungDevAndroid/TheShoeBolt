import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QueuesService } from './queues.service';
import { EmailsModule } from '../emails/emails.module';

@Module({
  imports: [ConfigModule, EmailsModule],
  providers: [QueuesService],
  exports: [QueuesService],
})
export class QueuesModule {}