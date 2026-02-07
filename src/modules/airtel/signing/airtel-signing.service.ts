import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class AirtelSigningService {
  private readonly logger = new Logger(AirtelSigningService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Generate x-signature header using HMAC-SHA256
   * Signs the request payload to ensure integrity
   */
  generateSignature(payload: any): string {
    const secret = this.configService.get<string>('airtel.signing_secret');
    
    if (!secret) {
      throw new Error('Airtel signing secret not configured');
    }

    try {
      // Convert payload to canonical JSON string
      const payloadString = JSON.stringify(payload);
      
      // Generate HMAC-SHA256 signature
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(payloadString);
      const signature = hmac.digest('base64');

      this.logger.debug('[AirtelSigning] Generated signature');
      
      return signature;
    } catch (error) {
      this.logger.error('[AirtelSigning] Failed to generate signature', {
        error: error?.message,
      });
      throw new Error('Failed to generate request signature');
    }
  }

  /**
   * Generate x-key header using AES encryption
   * Encrypts the AES key and IV used for payload encryption
   */
  generateEncryptedKey(): string {
    const publicKey = this.configService.get<string>('airtel.encryption_public_key');
    
    if (!publicKey) {
      throw new Error('Airtel encryption public key not configured');
    }

    try {
      // Generate random AES key and IV
      const aesKey = crypto.randomBytes(32); // 256-bit key
      const iv = crypto.randomBytes(16); // 128-bit IV

      // Combine key and IV
      const combined = Buffer.concat([aesKey, iv]);

      // Encrypt with RSA public key
      const encrypted = crypto.publicEncrypt(
        {
          key: publicKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        combined,
      );

      const encryptedKey = encrypted.toString('base64');

      this.logger.debug('[AirtelSigning] Generated encrypted key');

      return encryptedKey;
    } catch (error) {
      this.logger.error('[AirtelSigning] Failed to generate encrypted key', {
        error: error?.message,
      });
      throw new Error('Failed to generate encrypted key');
    }
  }

  /**
   * Verify webhook signature from Airtel
   * Used to validate incoming webhook callbacks
   */
  verifyWebhookSignature(payload: any, receivedSignature: string): boolean {
    try {
      const expectedSignature = this.generateSignature(payload);
      const isValid = crypto.timingSafeEqual(
        Buffer.from(receivedSignature),
        Buffer.from(expectedSignature),
      );

      if (!isValid) {
        this.logger.warn('[AirtelSigning] Webhook signature verification failed');
      }

      return isValid;
    } catch (error) {
      this.logger.error('[AirtelSigning] Error verifying webhook signature', {
        error: error?.message,
      });
      return false;
    }
  }

  /**
   * Encrypt PIN for disbursement requests
   * Uses RSA-OAEP encryption with Airtel's public key
   * @param pin 4-digit PIN in plain text
   * @returns Base64-encoded encrypted PIN
   */
  encryptPin(pin: string): string {
    const publicKey = this.configService.get<string>('airtel.encryption_public_key');

    if (!publicKey) {
      throw new Error('Airtel encryption public key not configured');
    }

    try {
      // Validate PIN format (should be 4 digits)
      if (!/^\d{4}$/.test(pin)) {
        throw new Error('PIN must be exactly 4 digits');
      }

      // Convert PIN to buffer
      const pinBuffer = Buffer.from(pin, 'utf-8');

      // Encrypt with RSA public key using OAEP padding
      const encrypted = crypto.publicEncrypt(
        {
          key: publicKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        pinBuffer,
      );

      // Return as base64-encoded string
      const encryptedPin = encrypted.toString('base64');

      this.logger.debug('[AirtelSigning] PIN encrypted successfully');

      return encryptedPin;
    } catch (error) {
      this.logger.error('[AirtelSigning] Failed to encrypt PIN', {
        error: error?.message,
      });
      throw new Error('Failed to encrypt PIN');
    }
  }
}
