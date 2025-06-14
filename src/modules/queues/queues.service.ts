import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { EmailsService } from '../emails/emails.service';

export interface EmailJob {
  type: 'welcome' | 'password-reset' | 'payment-confirmation';
  data: any;
}

@Injectable()
export class QueuesService implements OnModuleInit, OnModuleDestroy {
  private connection: amqp.Connection;
  private channel: amqp.Channel;
  private readonly logger = new Logger(QueuesService.name);
  
  private readonly EMAIL_QUEUE = 'email_queue';

  constructor(
    private configService: ConfigService,
    private emailsService: EmailsService,
  ) {}

  async onModuleInit() {
    await this.connect();
    await this.setupQueues();
    await this.startConsumers();
  }

  async onModuleDestroy() {
    if (this.channel) {
      await this.channel.close();
    }
    if (this.connection) {
      await this.connection.close();
    }
  }

  private async connect() {
    try {
      const rabbitmqUrl = this.configService.get('RABBITMQ_URL') || 'amqp://localhost';
      this.connection = await amqp.connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();
      this.logger.log('Connected to RabbitMQ');
    } catch (error) {
      this.logger.error('Failed to connect to RabbitMQ', error);
      throw error;
    }
  }

  private async setupQueues() {
    await this.channel.assertQueue(this.EMAIL_QUEUE, { durable: true });
    this.logger.log('Queues setup completed');
  }

  private async startConsumers() {
    // Email queue consumer
    await this.channel.consume(this.EMAIL_QUEUE, async (msg) => {
      if (msg) {
        try {
          const job: EmailJob = JSON.parse(msg.content.toString());
          await this.processEmailJob(job);
          this.channel.ack(msg);
          this.logger.log(`Email job processed: ${job.type}`);
        } catch (error) {
          this.logger.error('Error processing email job', error);
          this.channel.nack(msg, false, false); // Don't requeue failed jobs
        }
      }
    });
  }

  async addEmailJob(job: EmailJob) {
    const message = Buffer.from(JSON.stringify(job));
    await this.channel.sendToQueue(this.EMAIL_QUEUE, message, { persistent: true });
    this.logger.log(`Email job added to queue: ${job.type}`);
  }

  private async processEmailJob(job: EmailJob) {
    switch (job.type) {
      case 'welcome':
        await this.emailsService.sendWelcomeEmail(job.data.email, job.data.firstName);
        break;
      case 'password-reset':
        await this.emailsService.sendPasswordResetEmail(job.data.email, job.data.resetToken);
        break;
      case 'payment-confirmation':
        await this.emailsService.sendPaymentConfirmationEmail(
          job.data.email,
          job.data.amount,
          job.data.currency,
        );
        break;
      default:
        this.logger.warn(`Unknown email job type: ${job.type}`);
    }
  }

  // Utility methods for adding specific types of jobs
  async addWelcomeEmailJob(email: string, firstName: string) {
    await this.addEmailJob({
      type: 'welcome',
      data: { email, firstName },
    });
  }

  async addPasswordResetEmailJob(email: string, resetToken: string) {
    await this.addEmailJob({
      type: 'password-reset',
      data: { email, resetToken },
    });
  }

  async addPaymentConfirmationEmailJob(email: string, amount: number, currency: string) {
    await this.addEmailJob({
      type: 'payment-confirmation',
      data: { email, amount, currency },
    });
  }
}