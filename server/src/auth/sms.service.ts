import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  constructor(private readonly config: ConfigService) {}

  async sendOtp(phone: string, code: string) {
    // L'OTP reutilise l'envoi generique afin que les notifications SMS restent centralisees.
    return this.sendMessage(phone, `Votre code M Group est ${code}. Il expire dans quelques minutes.`);
  }

  async sendMessage(phone: string, message: string) {
    // En production, ce service utilise Twilio si les variables d'environnement sont presentes.
    if (!this.isTwilioConfigured()) {
      return { delivered: false, reason: 'Twilio SMS is not configured.' };
    }

    const accountSid = this.config.get<string>('TWILIO_ACCOUNT_SID') ?? '';
    const authToken = this.config.get<string>('TWILIO_AUTH_TOKEN') ?? '';
    const from = this.config.get<string>('TWILIO_FROM_NUMBER') ?? '';
    const body = new URLSearchParams({
      To: phone,
      From: from,
      Body: message,
    });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      },
    );

    if (!response.ok) {
      const message = await response.text();
      return { delivered: false, reason: message };
    }

    return { delivered: true };
  }

  private isTwilioConfigured() {
    return Boolean(
      this.config.get<string>('TWILIO_ACCOUNT_SID') &&
        this.config.get<string>('TWILIO_AUTH_TOKEN') &&
        this.config.get<string>('TWILIO_FROM_NUMBER'),
    );
  }
}
