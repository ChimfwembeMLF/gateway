import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { AirtelSigningService } from './airtel-signing.service';

describe('AirtelSigningService - PIN Encryption', () => {
  let service: AirtelSigningService;
  let configService: ConfigService;

  // Mock RSA key pair for testing
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });

  const publicKeyPem = crypto
    .createPublicKey(publicKey)
    .export({ format: 'pem', type: 'spki' })
    .toString();

  const privateKeyPem = crypto
    .createPrivateKey(privateKey as any)
    .export({ format: 'pem', type: 'pkcs8' })
    .toString();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AirtelSigningService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue: any) => {
              const config: any = {
                'airtel.encryption_public_key': publicKeyPem,
                'airtel.signing_secret': 'test-secret',
              };
              return config[key] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AirtelSigningService>(AirtelSigningService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('encryptPin', () => {
    it('should encrypt a valid 4-digit PIN', () => {
      const pin = '1234';
      const encryptedPin = service.encryptPin(pin);

      // Verify it's base64 encoded
      expect(() => Buffer.from(encryptedPin, 'base64')).not.toThrow();

      // Verify it can be decrypted
      const encrypted = Buffer.from(encryptedPin, 'base64');
      const decrypted = crypto.privateDecrypt(
        {
          key: privateKeyPem,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        encrypted,
      );

      expect(decrypted.toString('utf-8')).toBe(pin);
    });

    it('should encrypt different PINs to different ciphertexts (non-deterministic)', () => {
      const pin1 = '1234';
      const pin2 = '5678';

      const encrypted1 = service.encryptPin(pin1);
      const encrypted2 = service.encryptPin(pin2);

      // RSA-OAEP includes randomness, so same PIN should encrypt differently
      const pin1Twice1 = service.encryptPin(pin1);
      const pin1Twice2 = service.encryptPin(pin1);

      // Both should decrypt to the same PIN
      const decrypt = (encrypted: string) => {
        const buf = Buffer.from(encrypted, 'base64');
        return crypto.privateDecrypt(
          {
            key: privateKeyPem,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256',
          },
          buf,
        ).toString('utf-8');
      };

      expect(decrypt(pin1Twice1)).toBe('1234');
      expect(decrypt(pin1Twice2)).toBe('1234');
      expect(pin1Twice1).not.toBe(pin1Twice2); // Different ciphertexts
    });

    it('should throw error for non-4-digit PIN', () => {
      expect(() => service.encryptPin('123')).toThrow();
      expect(() => service.encryptPin('12345')).toThrow();
      expect(() => service.encryptPin('abcd')).toThrow();
      expect(() => service.encryptPin('')).toThrow();
    });

    it('should throw error if public key is not configured', () => {
      jest.spyOn(configService, 'get').mockReturnValue(null);

      expect(() => service.encryptPin('1234')).toThrow(
        'Airtel encryption public key not configured',
      );
    });

    it('should handle all valid PIN values (0000-9999)', () => {
      // Test boundary values
      const testPins = ['0000', '0001', '5555', '9998', '9999'];

      for (const pin of testPins) {
        const encrypted = service.encryptPin(pin);
        expect(encrypted).toBeTruthy();

        // Verify it decrypts correctly
        const buf = Buffer.from(encrypted, 'base64');
        const decrypted = crypto.privateDecrypt(
          {
            key: privateKeyPem,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256',
          },
          buf,
        ).toString('utf-8');

        expect(decrypted).toBe(pin);
      }
    });

    it('should produce base64-encoded output', () => {
      const encryptedPin = service.encryptPin('1234');

      // Should be valid base64
      const buffer = Buffer.from(encryptedPin, 'base64');
      expect(buffer).toBeTruthy();

      // Base64 string should not contain invalid characters
      expect(/^[A-Za-z0-9+/=]+$/.test(encryptedPin)).toBe(true);
    });
  });

  describe('integration with signing', () => {
    it('should work together: signature + encrypted PIN', () => {
      const payload = {
        reference: 'REF-001',
        pin: service.encryptPin('1234'),
      };

      // Generate signature on payload with encrypted PIN
      const signature = service.generateSignature(payload);

      expect(signature).toBeTruthy();
      expect(typeof signature).toBe('string');

      // Signature should be different if PIN changes
      const payload2 = {
        reference: 'REF-001',
        pin: service.encryptPin('5678'),
      };
      const signature2 = service.generateSignature(payload2);

      expect(signature2).not.toBe(signature);
    });
  });
});
