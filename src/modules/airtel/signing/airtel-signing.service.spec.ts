import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AirtelSigningService } from './airtel-signing.service';
import * as crypto from 'crypto';

describe('AirtelSigningService', () => {
  let service: AirtelSigningService;
  let configService: ConfigService;

  const mockSigningSecret = 'test-signing-secret-key';
  const mockPublicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu1SU1LfVLPHCozMxH2Mo
4lgOEePzNm0tRgeLezV6ffAt0gunVTLw7onLRnrq0/IzW7yWR7QkrmBL7jTKEn5u
+qKhbwKfBstIs+bMY2Zkp18gnTxKLxoS2tFczGkPLPgizskuemMghRniWaoLcyeh
kd3qqGElvW/VDL5AaWTg0nLVkjRo9z+40RQzuVaE8AkAFmxZzow3x+VJYKdjykkJ
0iT9wCS0DRTXu269V264Vf/3jvredZiKRkgwlL9xNAwxXFg0x/XFw005UWVRIkdg
cKWTjpBP2dPwVZ4WWC+9aGVd+Gyn1o0CLelf4rEjGoXbAAEgAqeGUxrcIlbjXfbc
mwIDAQAB
-----END PUBLIC KEY-----`;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AirtelSigningService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'airtel.signing_secret') return mockSigningSecret;
              if (key === 'airtel.encryption_public_key') return mockPublicKey;
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AirtelSigningService>(AirtelSigningService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('generateSignature', () => {
    it('should generate HMAC-SHA256 signature', () => {
      const payload = {
        reference: 'Test transaction',
        subscriber: { country: 'ZM', msisdn: '123456' },
        transaction: { amount: 1000, id: 'test-id' },
      };

      const signature = service.generateSignature(payload);

      // Verify it's a base64 string
      expect(signature).toMatch(/^[A-Za-z0-9+/=]+$/);
      expect(signature.length).toBeGreaterThan(0);

      // Manually verify HMAC
      const payloadString = JSON.stringify(payload);
      const hmac = crypto.createHmac('sha256', mockSigningSecret);
      hmac.update(payloadString);
      const expectedSignature = hmac.digest('base64');

      expect(signature).toBe(expectedSignature);
    });

    it('should generate consistent signatures for same payload', () => {
      const payload = { test: 'data' };

      const signature1 = service.generateSignature(payload);
      const signature2 = service.generateSignature(payload);

      expect(signature1).toBe(signature2);
    });

    it('should generate different signatures for different payloads', () => {
      const payload1 = { test: 'data1' };
      const payload2 = { test: 'data2' };

      const signature1 = service.generateSignature(payload1);
      const signature2 = service.generateSignature(payload2);

      expect(signature1).not.toBe(signature2);
    });

    it('should throw error if signing secret is missing', () => {
      const badModule = Test.createTestingModule({
        providers: [
          AirtelSigningService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => null),
            },
          },
        ],
      });

      badModule.compile().then((module) => {
        const badService = module.get<AirtelSigningService>(AirtelSigningService);
        expect(() => badService.generateSignature({ test: 'data' })).toThrow(
          'Airtel signing secret not configured',
        );
      });
    });
  });

  describe('generateEncryptedKey', () => {
    it('should generate encrypted AES key', () => {
      const encryptedKey = service.generateEncryptedKey();

      // Verify it's a base64 string
      expect(encryptedKey).toMatch(/^[A-Za-z0-9+/=]+$/);
      expect(encryptedKey.length).toBeGreaterThan(0);
    });

    it('should generate different keys each time', () => {
      const key1 = service.generateEncryptedKey();
      const key2 = service.generateEncryptedKey();

      expect(key1).not.toBe(key2);
    });

    it('should throw error if public key is missing', async () => {
      const badModule = await Test.createTestingModule({
        providers: [
          AirtelSigningService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'airtel.signing_secret') return 'secret';
                return null;
              }),
            },
          },
        ],
      }).compile();

      const badService = badModule.get<AirtelSigningService>(AirtelSigningService);
      
      expect(() => badService.generateEncryptedKey()).toThrow(
        'Airtel encryption public key not configured',
      );
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should verify valid webhook signature', () => {
      const payload = { transaction: { id: 'test-123', status: 'SUCCESS' } };
      const validSignature = service.generateSignature(payload);

      const isValid = service.verifyWebhookSignature(payload, validSignature);

      expect(isValid).toBe(true);
    });

    it('should reject invalid webhook signature', () => {
      const payload = { transaction: { id: 'test-123', status: 'SUCCESS' } };
      const invalidSignature = 'invalid-signature-base64==';

      const isValid = service.verifyWebhookSignature(payload, invalidSignature);

      expect(isValid).toBe(false);
    });

    it('should reject tampered payload', () => {
      const originalPayload = { transaction: { id: 'test-123', status: 'SUCCESS' } };
      const signature = service.generateSignature(originalPayload);

      const tamperedPayload = { transaction: { id: 'test-123', status: 'FAILED' } };
      const isValid = service.verifyWebhookSignature(tamperedPayload, signature);

      expect(isValid).toBe(false);
    });
  });
});
