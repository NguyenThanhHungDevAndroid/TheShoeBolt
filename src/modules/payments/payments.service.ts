import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
    private configService: ConfigService,
  ) {
    this.stripe = new Stripe(this.configService.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2023-10-16',
    });
  }

  async createPaymentIntent(createPaymentDto: CreatePaymentDto, userId: string) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(createPaymentDto.amount * 100), // Convert to cents
        currency: createPaymentDto.currency || 'usd',
        metadata: {
          userId,
          description: createPaymentDto.description || '',
        },
      });

      const payment = this.paymentsRepository.create({
        userId,
        stripePaymentIntentId: paymentIntent.id,
        amount: createPaymentDto.amount,
        currency: createPaymentDto.currency || 'usd',
        description: createPaymentDto.description,
        status: PaymentStatus.PENDING,
      });

      await this.paymentsRepository.save(payment);

      return {
        clientSecret: paymentIntent.client_secret,
        paymentId: payment.id,
      };
    } catch (error) {
      throw new BadRequestException(`Payment creation failed: ${error.message}`);
    }
  }

  async confirmPayment(paymentIntentId: string) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      
      const payment = await this.paymentsRepository.findOne({
        where: { stripePaymentIntentId: paymentIntentId },
      });

      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      payment.status = paymentIntent.status === 'succeeded' 
        ? PaymentStatus.COMPLETED 
        : PaymentStatus.FAILED;

      await this.paymentsRepository.save(payment);

      return payment;
    } catch (error) {
      throw new BadRequestException(`Payment confirmation failed: ${error.message}`);
    }
  }

  async findUserPayments(userId: string) {
    return this.paymentsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const payment = await this.paymentsRepository.findOne({ where: { id } });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }

  async handleWebhook(signature: string, body: Buffer) {
    const endpointSecret = this.configService.get('STRIPE_WEBHOOK_SECRET');
    
    try {
      const event = this.stripe.webhooks.constructEvent(body, signature, endpointSecret);
      
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.confirmPayment(event.data.object.id);
          break;
        case 'payment_intent.payment_failed':
          await this.handleFailedPayment(event.data.object.id);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return { received: true };
    } catch (error) {
      throw new BadRequestException(`Webhook signature verification failed: ${error.message}`);
    }
  }

  private async handleFailedPayment(paymentIntentId: string) {
    const payment = await this.paymentsRepository.findOne({
      where: { stripePaymentIntentId: paymentIntentId },
    });

    if (payment) {
      payment.status = PaymentStatus.FAILED;
      await this.paymentsRepository.save(payment);
    }
  }
}