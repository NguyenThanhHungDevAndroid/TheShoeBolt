import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { SendEmailDto } from './dto/send-email.dto';

@Injectable()
export class EmailsService {
  private resend: Resend;

  constructor(private configService: ConfigService) {
    this.resend = new Resend(this.configService.get('RESEND_API_KEY'));
  }

  async sendEmail(sendEmailDto: SendEmailDto) {
    try {
      const { data, error } = await this.resend.emails.send({
        from: sendEmailDto.from || this.configService.get('RESEND_FROM_EMAIL'),
        to: sendEmailDto.to,
        subject: sendEmailDto.subject,
        html: sendEmailDto.html,
        text: sendEmailDto.text,
      });

      if (error) {
        throw new BadRequestException(`Email sending failed: ${error.message}`);
      }

      return { success: true, messageId: data.id };
    } catch (error) {
      throw new BadRequestException(`Email sending failed: ${error.message}`);
    }
  }

  async sendWelcomeEmail(email: string, firstName: string) {
    const html = `
      <h1>Welcome to Our Platform, ${firstName}!</h1>
      <p>Thank you for joining us. We're excited to have you on board.</p>
      <p>If you have any questions, feel free to reach out to our support team.</p>
      <p>Best regards,<br>The Team</p>
    `;

    return this.sendEmail({
      to: [email],
      subject: 'Welcome to Our Platform!',
      html,
      text: `Welcome to Our Platform, ${firstName}! Thank you for joining us.`,
    });
  }

  async sendPasswordResetEmail(email: string, resetToken: string) {
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${resetToken}`;
    
    const html = `
      <h1>Password Reset Request</h1>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
      <p>If you didn't request this, please ignore this email.</p>
      <p>This link will expire in 1 hour.</p>
    `;

    return this.sendEmail({
      to: [email],
      subject: 'Password Reset Request',
      html,
      text: `Password reset requested. Visit: ${resetUrl}`,
    });
  }

  async sendPaymentConfirmationEmail(email: string, amount: number, currency: string) {
    const html = `
      <h1>Payment Confirmation</h1>
      <p>Your payment has been successfully processed.</p>
      <p><strong>Amount:</strong> ${amount} ${currency.toUpperCase()}</p>
      <p>Thank you for your payment!</p>
    `;

    return this.sendEmail({
      to: [email],
      subject: 'Payment Confirmation',
      html,
      text: `Payment confirmed: ${amount} ${currency.toUpperCase()}`,
    });
  }
}