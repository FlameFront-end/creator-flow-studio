import { Injectable } from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

@Injectable()
export class AiSettingsCryptoService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key = this.buildKey();

  encrypt(value: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(this.algorithm, this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
  }

  decrypt(payload: string): string {
    const [ivPart, authTagPart, encryptedPart] = payload.split(':');
    if (!ivPart || !authTagPart || !encryptedPart) {
      throw new Error('Encrypted AI key payload is malformed');
    }

    const iv = Buffer.from(ivPart, 'base64');
    const authTag = Buffer.from(authTagPart, 'base64');
    const encrypted = Buffer.from(encryptedPart, 'base64');

    try {
      const decipher = createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);
      return decrypted.toString('utf8');
    } catch {
      throw new Error('Unable to decrypt saved AI key');
    }
  }

  maskSecret(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
      return '';
    }
    const suffix = trimmed.slice(-4);
    return `***${suffix}`;
  }

  private buildKey(): Buffer {
    const seed = process.env.AI_SETTINGS_ENCRYPTION_KEY?.trim();
    if (!seed) {
      throw new Error(
        'AI_SETTINGS_ENCRYPTION_KEY is required for AI secret encryption.',
      );
    }
    return createHash('sha256').update(seed, 'utf8').digest();
  }
}
