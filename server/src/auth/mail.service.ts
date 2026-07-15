import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

type MailPayload = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

@Injectable()
export class MailService {
  private transporter?: Transporter;

  constructor(private readonly config: ConfigService) {}

  async sendEmailVerification(email: string, verificationUrl: string) {
    // Email envoye apres inscription pour verifier que l'adresse appartient bien a l'utilisateur.
    return this.send({
      to: email,
      subject: 'Verification de votre email M Group',
      text: `Bonjour, verifiez votre email M Group avec ce lien : ${verificationUrl}`,
      html: `
        <p>Bonjour,</p>
        <p>Veuillez verifier votre email M Group avec le lien ci-dessous :</p>
        <p><a href="${verificationUrl}">Verifier mon email</a></p>
        <p>Si le bouton ne fonctionne pas, copiez ce lien : ${verificationUrl}</p>
      `,
    });
  }

  async sendPasswordReset(email: string, resetUrl: string, token: string) {
    // Email de reset reel : le token est aussi affiche dans le message pour le mode formulaire actuel.
    return this.send({
      to: email,
      subject: 'Reinitialisation du mot de passe M Group',
      text: `Reinitialisez votre mot de passe M Group : ${resetUrl}. Token : ${token}`,
      html: `
        <p>Bonjour,</p>
        <p>Une demande de reinitialisation du mot de passe M Group a ete faite.</p>
        <p><a href="${resetUrl}">Reinitialiser mon mot de passe</a></p>
        <p>Token de reinitialisation : <strong>${token}</strong></p>
        <p>Ce lien expire rapidement. Ignorez cet email si vous n'etes pas a l'origine de la demande.</p>
      `,
    });
  }

  async send(payload: MailPayload) {
    if (!this.isConfigured()) {
      return { delivered: false, reason: 'SMTP is not configured.' };
    }

    await this.getTransporter().sendMail({
      from: this.config.get<string>('SMTP_FROM') ?? 'M Group <no-reply@mgroup.local>',
      ...payload,
    });

    return { delivered: true };
  }

  private isConfigured() {
    return Boolean(
      this.config.get<string>('SMTP_HOST') &&
        this.config.get<string>('SMTP_PORT') &&
        this.config.get<string>('SMTP_USER') &&
        this.config.get<string>('SMTP_PASS'),
    );
  }

  private getTransporter() {
    if (!this.transporter) {
      this.transporter = createTransport({
        host: this.config.get<string>('SMTP_HOST'),
        port: Number(this.config.get<string>('SMTP_PORT')),
        secure: this.config.get<string>('SMTP_SECURE') === 'true',
        auth: {
          user: this.config.get<string>('SMTP_USER'),
          pass: this.config.get<string>('SMTP_PASS'),
        },
      });
    }

    return this.transporter;
  }
}
