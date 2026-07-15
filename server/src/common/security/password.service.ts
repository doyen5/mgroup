import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class PasswordService {
  constructor(private readonly config: ConfigService) {}

  async hash(value: string) {
    // Les variables .env arrivent sous forme de texte ; on force un nombre fiable pour bcrypt.
    const configuredRounds = Number(this.config.get<string>('BCRYPT_SALT_ROUNDS'));
    const rounds = Number.isFinite(configuredRounds) ? configuredRounds : 12;
    return bcrypt.hash(value, rounds);
  }

  async compare(value: string, hash?: string | null) {
    if (!hash) {
      return false;
    }

    return bcrypt.compare(value, hash);
  }
}
