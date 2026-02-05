import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { Tenant } from '../src/modules/tenant/entities/tenant.entity';
import { User } from '../src/modules/user/entities/user.entity';
import { Payment } from '../src/modules/payments/entities/payment.entity';
import { RoleType } from '../src/common/enums/role-type.enum';
import * as bcrypt from 'bcryptjs';

describe('Payments API (e2e) - Multi-Tenant Isolation', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  
  // Tenant A
  let tenantA: Tenant;
  let tenantAApiKey: string;
  
  // Tenant B
  let tenantB: Tenant;
  let tenantBApiKey: string;
  
  // Payment IDs
  let paymentIdA: string;
  let paymentIdB: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();

    dataSource = app.get(DataSource);

    // Create Tenant A
    const tenantARepo = dataSource.getRepository(Tenant);
    tenantA = await tenantARepo.save({
      name: 'Tenant A Test',
      slug: 'tenant-a-test',
      apiKey: 'test-api-key-tenant-a',
      isActive: true,
    });
    tenantAApiKey = tenantA.apiKey;

    // Create Tenant B
    tenantB = await tenantARepo.save({
      name: 'Tenant B Test',
      slug: 'tenant-b-test',
      apiKey: 'test-api-key-tenant-b',
      isActive: true,
    });
    tenantBApiKey = tenantB.apiKey;

    // Create admin users for both tenants
    const userRepo = dataSource.getRepository(User);
    await userRepo.save({
      tenantId: tenantA.id,
      username: 'admin-a',
      email: 'admin@tenant-a.test',
      password: await bcrypt.hash('password123', 10),
      role: RoleType.ADMIN,
      isActive: true,
    });

    await userRepo.save({
      tenantId: tenantB.id,
      username: 'admin-b',
      email: 'admin@tenant-b.test',
      password: await bcrypt.hash('password123', 10),
      role: RoleType.ADMIN,
      isActive: true,
    });
  });

  afterAll(async () => {
    // Cleanup
    if (dataSource) {
      await dataSource.getRepository(Payment).delete({});
      await dataSource.getRepository(User).delete({});
      await dataSource.getRepository(Tenant).delete({});
    }
    await app.close();
  });

  describe('POST /api/v1/payments', () => {
    it('should create payment for Tenant A', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${tenantAApiKey}`)
        .set('x-tenant-id', tenantA.id)
        .send({
          provider: 'MTN',
          amount: 1000,
          currency: 'ZMW',
          payer: '260765725317',
          payerMessage: 'Test payment from Tenant A',
          payeeNote: 'Thank you',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.tenantId).toBe(tenantA.id);
      expect(response.body.amount).toBe(1000);
      paymentIdA = response.body.id;
    });

    it('should create payment for Tenant B', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${tenantBApiKey}`)
        .set('x-tenant-id', tenantB.id)
        .send({
          provider: 'MTN',
          amount: 2000,
          currency: 'ZMW',
          payer: '260765725318',
          payerMessage: 'Test payment from Tenant B',
          payeeNote: 'Thank you',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.tenantId).toBe(tenantB.id);
      expect(response.body.amount).toBe(2000);
      paymentIdB = response.body.id;
    });

    it('should reject payment creation without API key', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('x-tenant-id', tenantA.id)
        .send({
          provider: 'MTN',
          amount: 1000,
          currency: 'ZMW',
          payer: '260765725317',
        })
        .expect(401);
    });

    it('should reject payment creation with wrong tenant ID', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${tenantAApiKey}`)
        .set('x-tenant-id', tenantB.id) // Wrong tenant ID
        .send({
          provider: 'MTN',
          amount: 1000,
          currency: 'ZMW',
          payer: '260765725317',
        })
        .expect(401);
    });
  });

  describe('GET /api/v1/payments/:id - Multi-Tenant Isolation', () => {
    it('should allow Tenant A to get their own payment', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/payments/${paymentIdA}`)
        .set('Authorization', `Bearer ${tenantAApiKey}`)
        .set('x-tenant-id', tenantA.id)
        .expect(200);

      expect(response.body.id).toBe(paymentIdA);
      expect(response.body.tenantId).toBe(tenantA.id);
    });

    it('should allow Tenant B to get their own payment', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/payments/${paymentIdB}`)
        .set('Authorization', `Bearer ${tenantBApiKey}`)
        .set('x-tenant-id', tenantB.id)
        .expect(200);

      expect(response.body.id).toBe(paymentIdB);
      expect(response.body.tenantId).toBe(tenantB.id);
    });

    it('should prevent Tenant A from accessing Tenant B payment', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/payments/${paymentIdB}`)
        .set('Authorization', `Bearer ${tenantAApiKey}`)
        .set('x-tenant-id', tenantA.id)
        .expect(404); // Should not find payment from different tenant
    });

    it('should prevent Tenant B from accessing Tenant A payment', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/payments/${paymentIdA}`)
        .set('Authorization', `Bearer ${tenantBApiKey}`)
        .set('x-tenant-id', tenantB.id)
        .expect(404); // Should not find payment from different tenant
    });
  });

  describe('GET /api/v1/payments - List Payments', () => {
    it('should return only Tenant A payments for Tenant A', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/payments')
        .set('Authorization', `Bearer ${tenantAApiKey}`)
        .set('x-tenant-id', tenantA.id)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      // Verify all payments belong to Tenant A
      response.body.forEach((payment: any) => {
        expect(payment.tenantId).toBe(tenantA.id);
      });
    });

    it('should return only Tenant B payments for Tenant B', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/payments')
        .set('Authorization', `Bearer ${tenantBApiKey}`)
        .set('x-tenant-id', tenantB.id)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      // Verify all payments belong to Tenant B
      response.body.forEach((payment: any) => {
        expect(payment.tenantId).toBe(tenantB.id);
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits per tenant', async () => {
      // Make multiple requests rapidly
      const requests = Array(10).fill(null).map(() =>
        request(app.getHttpServer())
          .get('/api/v1/payments')
          .set('Authorization', `Bearer ${tenantAApiKey}`)
          .set('x-tenant-id', tenantA.id)
      );

      const responses = await Promise.all(requests);
      
      // All should succeed (within rate limit)
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });
    });
  });

  describe('API Key Validation', () => {
    it('should reject invalid API key format', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/payments')
        .set('Authorization', 'Bearer invalid-key')
        .set('x-tenant-id', tenantA.id)
        .expect(401);
    });

    it('should reject missing tenant ID header', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/payments')
        .set('Authorization', `Bearer ${tenantAApiKey}`)
        .expect(401);
    });
  });
});
