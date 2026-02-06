import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MockEmailProvider } from '../providers/mock.provider';

describe('MockEmailProvider', () => {
  let provider: MockEmailProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MockEmailProvider],
    }).compile();

    provider = module.get<MockEmailProvider>(MockEmailProvider);
    provider.clearSentEmails();
  });

  describe('send', () => {
    it('should log email to mock storage', async () => {
      const emailOptions = {
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
      };

      await provider.send(emailOptions);

      expect(provider.getSentEmailsCount()).toBe(1);
      expect(provider.getSentEmails()[0]).toEqual(emailOptions);
    });

    it('should handle multiple recipients', async () => {
      const emailOptions = {
        to: ['test1@example.com', 'test2@example.com'],
        subject: 'Test Email',
        html: '<p>Test content</p>',
      };

      await provider.send(emailOptions);

      expect(provider.getSentEmailsCount()).toBe(1);
    });

    it('should store email with all options', async () => {
      const emailOptions = {
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
        text: 'Test content',
        from: 'sender@example.com',
        replyTo: 'reply@example.com',
        cc: ['cc@example.com'],
        bcc: ['bcc@example.com'],
      };

      await provider.send(emailOptions);

      expect(provider.getSentEmails()[0]).toEqual(emailOptions);
    });
  });

  describe('sendBatch', () => {
    it('should send multiple emails in batch', async () => {
      const emails = [
        { to: 'test1@example.com', subject: 'Email 1', html: '<p>Content 1</p>' },
        { to: 'test2@example.com', subject: 'Email 2', html: '<p>Content 2</p>' },
        { to: 'test3@example.com', subject: 'Email 3', html: '<p>Content 3</p>' },
      ];

      await provider.sendBatch({ emails });

      expect(provider.getSentEmailsCount()).toBe(3);
    });

    it('should respect concurrency setting', async () => {
      const emails = Array.from({ length: 10 }, (_, i) => ({
        to: `test${i}@example.com`,
        subject: `Email ${i}`,
        html: `<p>Content ${i}</p>`,
      }));

      await provider.sendBatch({ emails, concurrency: 3 });

      expect(provider.getSentEmailsCount()).toBe(10);
    });
  });

  describe('testing utilities', () => {
    it('should clear sent emails', async () => {
      await provider.send({ to: 'test@example.com', subject: 'Test', html: '<p>Test</p>' });
      expect(provider.getSentEmailsCount()).toBe(1);

      provider.clearSentEmails();
      expect(provider.getSentEmailsCount()).toBe(0);
    });

    it('should get sent emails count', async () => {
      await provider.send({ to: 'test1@example.com', subject: 'Test', html: '<p>Test</p>' });
      await provider.send({ to: 'test2@example.com', subject: 'Test', html: '<p>Test</p>' });

      expect(provider.getSentEmailsCount()).toBe(2);
    });

    it('should get all sent emails', async () => {
      const email1 = { to: 'test1@example.com', subject: 'Test 1', html: '<p>Test 1</p>' };
      const email2 = { to: 'test2@example.com', subject: 'Test 2', html: '<p>Test 2</p>' };

      await provider.send(email1);
      await provider.send(email2);

      const sentEmails = provider.getSentEmails();
      expect(sentEmails.length).toBe(2);
      expect(sentEmails).toContainEqual(email1);
      expect(sentEmails).toContainEqual(email2);
    });
  });
});
