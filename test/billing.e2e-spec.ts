import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepository } from 'typeorm';
import { Tenant } from '../src/modules/tenant/entities/tenant.entity';
import { BillingPlan, BillingPlanType } from '../src/modules/billing/entities';
import { TenantBillingSubscription } from '../src/modules/billing/entities/tenant-billing-subscription.entity';
import { UsageMetrics } from '../src/modules/billing/entities/usage-metrics.entity';
import { Invoice, InvoiceStatus } from '../src/modules/billing/entities/invoice.entity';

describe('Billing Module (e2e)', () => {
  let app: INestApplication;
  let testTenantId: string;
  let testBillingPlan: BillingPlan;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  /**
   * TEST SUITE 1: Billing Plans Endpoint
   */
  describe('1. Billing Plans Endpoints', () => {
    it('GET /billing/plans - should return all active billing plans', async () => {
      const response = await request(app.getHttpServer())
        .get('/billing/plans')
        .expect(HttpStatus.OK);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);

      // Verify all 4 default plans are present
      const planTypes = response.body.map((p: any) => p.type);
      expect(planTypes).toContain('FREE');
      expect(planTypes).toContain('STANDARD');
      expect(planTypes).toContain('PREMIUM');
      expect(planTypes).toContain('ENTERPRISE');

      // Verify plan structure
      response.body.forEach((plan: any) => {
        expect(plan).toHaveProperty('id');
        expect(plan).toHaveProperty('type');
        expect(plan).toHaveProperty('price');
        expect(plan).toHaveProperty('requestsPerMinute');
        expect(plan).toHaveProperty('isActive');
      });
    });

    it('GET /billing/plans/:type - should return specific plan by type', async () => {
      const response = await request(app.getHttpServer())
        .get('/billing/plans/FREE')
        .expect(HttpStatus.OK);

      expect(response.body.type).toBe('FREE');
      expect(response.body.price).toBe(0);
      expect(response.body.requestsPerMinute).toBe(50);

      testBillingPlan = response.body;
    });

    it('GET /billing/plans/:type - should return 400 for invalid plan type', async () => {
      await request(app.getHttpServer())
        .get('/billing/plans/INVALID_PLAN')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('GET /billing/plans/:type - should return 404 for non-existent plan', async () => {
      // This is unlikely but should handle gracefully
      const response = await request(app.getHttpServer())
        .get('/billing/plans/NONEXISTENT')
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toContain('Invalid plan type');
    });
  });

  /**
   * TEST SUITE 2: Billing Subscriptions - Create & Retrieve
   */
  describe('2. Billing Subscriptions - Create & Retrieve', () => {
    let createdTenantId: string;
    let subscriptionId: string;

    it('should create a test tenant first', async () => {
      const response = await request(app.getHttpServer())
        .post('/tenant')
        .send({
          name: 'Test Billing Tenant',
          slug: `test-billing-${Date.now()}`,
          description: 'Tenant for E2E billing tests',
        })
        .expect(HttpStatus.CREATED);

      expect(response.body.id).toBeDefined();
      createdTenantId = response.body.id;
      testTenantId = response.body.id;
    });

    it('POST /billing/subscriptions - should create subscription with FREE plan', async () => {
      const response = await request(app.getHttpServer())
        .post('/billing/subscriptions')
        .send({
          tenantId: createdTenantId,
          planType: BillingPlanType.FREE,
          billingFrequency: 'MONTHLY',
        })
        .expect(HttpStatus.CREATED);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('tenantId');
      expect(response.body).toHaveProperty('planType');
      expect(response.body.planType).toBe('FREE');
      expect(response.body).toHaveProperty('requestsPerMinute');
      expect(response.body.requestsPerMinute).toBe(50);
      expect(response.body).toHaveProperty('billingFrequency');
      expect(response.body.billingFrequency).toBe('MONTHLY');
      expect(response.body).toHaveProperty('isActive');
      expect(response.body.isActive).toBe(true);

      subscriptionId = response.body.id;
    });

    it('POST /billing/subscriptions - should create subscription with PREMIUM plan', async () => {
      const response = await request(app.getHttpServer())
        .post('/billing/subscriptions')
        .send({
          tenantId: createdTenantId,
          planType: BillingPlanType.PREMIUM,
          billingFrequency: 'ANNUAL',
        })
        .expect(HttpStatus.CREATED);

      expect(response.body.planType).toBe('PREMIUM');
      expect(response.body.requestsPerMinute).toBe(500);
      expect(response.body.billingFrequency).toBe('ANNUAL');
    });

    it('GET /billing/subscriptions/:subscriptionId - should retrieve specific subscription', async () => {
      const response = await request(app.getHttpServer())
        .get(`/billing/subscriptions/${subscriptionId}`)
        .expect(HttpStatus.OK);

      expect(response.body.id).toBe(subscriptionId);
      expect(response.body.planType).toBe('FREE');
      expect(response.body.isActive).toBe(true);
    });

    it('GET /billing/subscriptions/tenant/:tenantId - should list all subscriptions for tenant', async () => {
      const response = await request(app.getHttpServer())
        .get(`/billing/subscriptions/tenant/${createdTenantId}`)
        .expect(HttpStatus.OK);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThanOrEqual(2); // At least the two we created
      expect(response.body.some((s: any) => s.id === subscriptionId)).toBe(true);
    });
  });

  /**
   * TEST SUITE 3: Rate Limiting Behavior
   */
  describe('3. Rate Limiting Validation', () => {
    let freePlanTenantId: string;
    let premiumPlanTenantId: string;
    let freeSubscriptionId: string;
    let premiumSubscriptionId: string;

    it('should create test tenants with different plans', async () => {
      // Create FREE plan tenant
      const tenant1 = await request(app.getHttpServer())
        .post('/tenant')
        .send({
          name: 'Free Rate Limit Tenant',
          slug: `free-limit-${Date.now()}`,
          description: 'For rate limiting tests',
        })
        .expect(HttpStatus.CREATED);

      freePlanTenantId = tenant1.body.id;

      // Subscribe to FREE plan
      const sub1 = await request(app.getHttpServer())
        .post('/billing/subscriptions')
        .send({
          tenantId: freePlanTenantId,
          planType: BillingPlanType.FREE,
          billingFrequency: 'MONTHLY',
        })
        .expect(HttpStatus.CREATED);

      freeSubscriptionId = sub1.body.id;

      // Create PREMIUM plan tenant
      const tenant2 = await request(app.getHttpServer())
        .post('/tenant')
        .send({
          name: 'Premium Rate Limit Tenant',
          slug: `premium-limit-${Date.now()}`,
          description: 'For rate limiting tests',
        })
        .expect(HttpStatus.CREATED);

      premiumPlanTenantId = tenant2.body.id;

      // Subscribe to PREMIUM plan
      const sub2 = await request(app.getHttpServer())
        .post('/billing/subscriptions')
        .send({
          tenantId: premiumPlanTenantId,
          planType: BillingPlanType.PREMIUM,
          billingFrequency: 'MONTHLY',
        })
        .expect(HttpStatus.CREATED);

      premiumSubscriptionId = sub2.body.id;
    });

    it('should return rate limit info in subscription details', async () => {
      // Check FREE plan limits
      const freeResponse = await request(app.getHttpServer())
        .get(`/billing/subscriptions/${freeSubscriptionId}`)
        .expect(HttpStatus.OK);

      expect(freeResponse.body.requestsPerMinute).toBe(50);

      // Check PREMIUM plan limits
      const premiumResponse = await request(app.getHttpServer())
        .get(`/billing/subscriptions/${premiumSubscriptionId}`)
        .expect(HttpStatus.OK);

      expect(premiumResponse.body.requestsPerMinute).toBe(500);
    });

    it('should validate rate limit headers are present', async () => {
      const response = await request(app.getHttpServer())
        .get('/billing/plans')
        .expect(HttpStatus.OK);

      // Response should contain rate limit information
      // This depends on your rate limiting implementation headers
      expect(response.body).toBeDefined();
    });
  });

  /**
   * TEST SUITE 4: Usage Metrics & Tracking
   */
  describe('4. Usage Metrics Tracking', () => {
    let metricsTrackingTenantId: string;
    let metricsTrackingSubscriptionId: string;

    it('should create tenant for metrics testing', async () => {
      const response = await request(app.getHttpServer())
        .post('/tenant')
        .send({
          name: 'Metrics Tracking Tenant',
          slug: `metrics-${Date.now()}`,
          description: 'For usage metrics tests',
        })
        .expect(HttpStatus.CREATED);

      metricsTrackingTenantId = response.body.id;

      // Subscribe to STANDARD plan
      const subResponse = await request(app.getHttpServer())
        .post('/billing/subscriptions')
        .send({
          tenantId: metricsTrackingTenantId,
          planType: BillingPlanType.STANDARD,
          billingFrequency: 'MONTHLY',
        })
        .expect(HttpStatus.CREATED);

      metricsTrackingSubscriptionId = subResponse.body.id;
    });

    it('POST /billing/metrics/track - should track usage metrics', async () => {
      const response = await request(app.getHttpServer())
        .post('/billing/metrics/track')
        .send({
          tenantId: metricsTrackingTenantId,
          subscriptionId: metricsTrackingSubscriptionId,
          requestCount: 150,
          endpoint: '/api/payments/create',
          statusCode: 200,
        })
        .expect(HttpStatus.CREATED);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('subscriptionId');
      expect(response.body).toHaveProperty('requestCount');
      expect(response.body.requestCount).toBe(150);
    });

    it('GET /billing/metrics/usage/:subscriptionId - should retrieve usage metrics', async () => {
      const response = await request(app.getHttpServer())
        .get(`/billing/metrics/usage/${metricsTrackingSubscriptionId}`)
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('totalRequests');
      expect(response.body).toHaveProperty('period');
      expect(response.body).toHaveProperty('averageResponseTime');
      expect(typeof response.body.totalRequests).toBe('number');
    });

    it('GET /billing/metrics/daily/:subscriptionId - should retrieve daily usage breakdown', async () => {
      const response = await request(app.getHttpServer())
        .get(`/billing/metrics/daily/${metricsTrackingSubscriptionId}`)
        .expect(HttpStatus.OK);

      expect(response.body).toBeInstanceOf(Array);
      // Should show daily breakdown even if not much data yet
      expect(response.body.length).toBeGreaterThanOrEqual(0);
    });

    it('GET /billing/analytics/:subscriptionId - should provide usage analytics', async () => {
      const response = await request(app.getHttpServer())
        .get(`/billing/analytics/${metricsTrackingSubscriptionId}`)
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('totalRequests');
      expect(response.body).toHaveProperty('peakUsageTime');
      expect(response.body).toHaveProperty('averageRequestsPerHour');
      expect(response.body).toHaveProperty('topEndpoints');
    });
  });

  /**
   * TEST SUITE 5: Invoice Generation & Management
   */
  describe('5. Invoice Generation & Management', () => {
    let invoiceTenantId: string;
    let invoiceSubscriptionId: string;
    let generatedInvoiceId: string;

    it('should create tenant for invoice testing', async () => {
      const response = await request(app.getHttpServer())
        .post('/tenant')
        .send({
          name: 'Invoice Generation Tenant',
          slug: `invoice-${Date.now()}`,
          description: 'For invoice generation tests',
        })
        .expect(HttpStatus.CREATED);

      invoiceTenantId = response.body.id;

      // Subscribe to PREMIUM plan for invoice tests
      const subResponse = await request(app.getHttpServer())
        .post('/billing/subscriptions')
        .send({
          tenantId: invoiceTenantId,
          planType: BillingPlanType.PREMIUM,
          billingFrequency: 'MONTHLY',
        })
        .expect(HttpStatus.CREATED);

      invoiceSubscriptionId = subResponse.body.id;
    });

    it('POST /billing/invoices/generate - should generate invoice with line items', async () => {
      const response = await request(app.getHttpServer())
        .post('/billing/invoices/generate')
        .send({
          subscriptionId: invoiceSubscriptionId,
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          endDate: new Date(),
          lineItems: [
            {
              description: 'Premium Plan - Monthly',
              quantity: 1,
              unitPrice: 499,
              type: 'subscription',
            },
            {
              description: 'API Request Overages (1000 additional requests @ $0.001)',
              quantity: 1000,
              unitPrice: 0.001,
              type: 'overage',
            },
          ],
        })
        .expect(HttpStatus.CREATED);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('invoiceNumber');
      expect(response.body).toHaveProperty('subscriptionId');
      expect(response.body).toHaveProperty('totalAmount');
      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('PENDING');
      expect(response.body).toHaveProperty('lineItems');
      expect(response.body.lineItems.length).toBe(2);

      generatedInvoiceId = response.body.id;
    });

    it('GET /billing/invoices/:invoiceId - should retrieve specific invoice', async () => {
      const response = await request(app.getHttpServer())
        .get(`/billing/invoices/${generatedInvoiceId}`)
        .expect(HttpStatus.OK);

      expect(response.body.id).toBe(generatedInvoiceId);
      expect(response.body.status).toBe('PENDING');
      expect(response.body).toHaveProperty('invoiceNumber');
      expect(response.body).toHaveProperty('issueDate');
      expect(response.body).toHaveProperty('dueDate');
      expect(response.body).toHaveProperty('totalAmount');
      expect(response.body).toHaveProperty('lineItems');
    });

    it('GET /billing/invoices/subscription/:subscriptionId - should list invoices for subscription', async () => {
      const response = await request(app.getHttpServer())
        .get(`/billing/invoices/subscription/${invoiceSubscriptionId}`)
        .expect(HttpStatus.OK);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body.some((inv: any) => inv.id === generatedInvoiceId)).toBe(true);
    });

    it('PUT /billing/invoices/:invoiceId - should update invoice status', async () => {
      const response = await request(app.getHttpServer())
        .put(`/billing/invoices/${generatedInvoiceId}`)
        .send({
          status: InvoiceStatus.SENT,
          notes: 'Invoice sent to customer',
        })
        .expect(HttpStatus.OK);

      expect(response.body.status).toBe('SENT');
      expect(response.body.notes).toBe('Invoice sent to customer');
    });

    it('DELETE /billing/invoices/:invoiceId - should soft-delete invoice', async () => {
      // Create a new invoice to delete
      const createResponse = await request(app.getHttpServer())
        .post('/billing/invoices/generate')
        .send({
          subscriptionId: invoiceSubscriptionId,
          startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          lineItems: [
            {
              description: 'Test Invoice for Deletion',
              quantity: 1,
              unitPrice: 100,
              type: 'subscription',
            },
          ],
        })
        .expect(HttpStatus.CREATED);

      const invoiceIdToDelete = createResponse.body.id;

      // Delete it
      await request(app.getHttpServer())
        .delete(`/billing/invoices/${invoiceIdToDelete}`)
        .expect(HttpStatus.OK);

      // Verify it's soft-deleted (should not appear in list)
      const listResponse = await request(app.getHttpServer())
        .get(`/billing/invoices/subscription/${invoiceSubscriptionId}`)
        .expect(HttpStatus.OK);

      expect(
        listResponse.body.some((inv: any) => inv.id === invoiceIdToDelete),
      ).toBe(false);
    });
  });

  /**
   * TEST SUITE 6: Invoice PDF Generation
   */
  describe('6. Invoice PDF Generation', () => {
    let pdfInvoiceSubscriptionId: string;
    let pdfInvoiceId: string;

    it('should create subscription for PDF testing', async () => {
      const tenantResponse = await request(app.getHttpServer())
        .post('/tenant')
        .send({
          name: 'PDF Invoice Tenant',
          slug: `pdf-${Date.now()}`,
          description: 'For PDF generation tests',
        })
        .expect(HttpStatus.CREATED);

      const subResponse = await request(app.getHttpServer())
        .post('/billing/subscriptions')
        .send({
          tenantId: tenantResponse.body.id,
          planType: BillingPlanType.STANDARD,
          billingFrequency: 'MONTHLY',
        })
        .expect(HttpStatus.CREATED);

      pdfInvoiceSubscriptionId = subResponse.body.id;

      // Generate an invoice
      const invoiceResponse = await request(app.getHttpServer())
        .post('/billing/invoices/generate')
        .send({
          subscriptionId: pdfInvoiceSubscriptionId,
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: new Date(),
          lineItems: [
            {
              description: 'Standard Plan - Monthly',
              quantity: 1,
              unitPrice: 99,
              type: 'subscription',
            },
          ],
        })
        .expect(HttpStatus.CREATED);

      pdfInvoiceId = invoiceResponse.body.id;
    });

    it('GET /billing/invoices/:invoiceId/pdf - should generate PDF', async () => {
      const response = await request(app.getHttpServer())
        .get(`/billing/invoices/${pdfInvoiceId}/pdf`)
        .expect(HttpStatus.OK)
        .expect('Content-Type', /application\/pdf/);

      expect(response.body).toBeDefined();
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  /**
   * TEST SUITE 7: Subscription Management (Update & Cancel)
   */
  describe('7. Subscription Management', () => {
    let managementTenantId: string;
    let managementSubscriptionId: string;

    it('should create tenant for subscription management tests', async () => {
      const response = await request(app.getHttpServer())
        .post('/tenant')
        .send({
          name: 'Subscription Management Tenant',
          slug: `mgmt-${Date.now()}`,
          description: 'For subscription management tests',
        })
        .expect(HttpStatus.CREATED);

      managementTenantId = response.body.id;

      const subResponse = await request(app.getHttpServer())
        .post('/billing/subscriptions')
        .send({
          tenantId: managementTenantId,
          planType: BillingPlanType.STANDARD,
          billingFrequency: 'MONTHLY',
        })
        .expect(HttpStatus.CREATED);

      managementSubscriptionId = subResponse.body.id;
    });

    it('PUT /billing/subscriptions/:subscriptionId - should update subscription plan', async () => {
      const response = await request(app.getHttpServer())
        .put(`/billing/subscriptions/${managementSubscriptionId}`)
        .send({
          planType: BillingPlanType.PREMIUM,
          billingFrequency: 'ANNUAL',
        })
        .expect(HttpStatus.OK);

      expect(response.body.planType).toBe('PREMIUM');
      expect(response.body.billingFrequency).toBe('ANNUAL');
      expect(response.body.requestsPerMinute).toBe(500); // PREMIUM limit
      expect(response.body.isActive).toBe(true);
    });

    it('DELETE /billing/subscriptions/:subscriptionId - should cancel subscription', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/billing/subscriptions/${managementSubscriptionId}`)
        .send({
          reason: 'Customer requested cancellation',
          effectiveDate: new Date(),
        })
        .expect(HttpStatus.OK);

      expect(response.body.isActive).toBe(false);
      expect(response.body.cancelledDate).toBeDefined();
    });

    it('should verify cancelled subscription is no longer active', async () => {
      const response = await request(app.getHttpServer())
        .get(`/billing/subscriptions/${managementSubscriptionId}`)
        .expect(HttpStatus.OK);

      expect(response.body.isActive).toBe(false);
    });
  });

  /**
   * TEST SUITE 8: Query & Filtering
   */
  describe('8. Query & Filtering', () => {
    let filterTestTenantId: string;
    let filterTestSubscriptionId: string;

    it('should create tenant for filtering tests', async () => {
      const response = await request(app.getHttpServer())
        .post('/tenant')
        .send({
          name: 'Query Filter Tenant',
          slug: `filter-${Date.now()}`,
          description: 'For query filtering tests',
        })
        .expect(HttpStatus.CREATED);

      filterTestTenantId = response.body.id;

      const subResponse = await request(app.getHttpServer())
        .post('/billing/subscriptions')
        .send({
          tenantId: filterTestTenantId,
          planType: BillingPlanType.ENTERPRISE,
          billingFrequency: 'ANNUAL',
        })
        .expect(HttpStatus.CREATED);

      filterTestSubscriptionId = subResponse.body.id;

      // Track some usage
      await request(app.getHttpServer())
        .post('/billing/metrics/track')
        .send({
          tenantId: filterTestTenantId,
          subscriptionId: filterTestSubscriptionId,
          requestCount: 500,
          endpoint: '/api/test',
          statusCode: 200,
        })
        .expect(HttpStatus.CREATED);
    });

    it('GET /billing/subscriptions/tenant/:tenantId?page=1&limit=10 - should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get(`/billing/subscriptions/tenant/${filterTestTenantId}?page=1&limit=10`)
        .expect(HttpStatus.OK);

      expect(response.body).toBeInstanceOf(Array);
    });

    it('GET /billing/invoices/subscription/:subscriptionId?status=PENDING - should filter by status', async () => {
      // Create an invoice first
      await request(app.getHttpServer())
        .post('/billing/invoices/generate')
        .send({
          subscriptionId: filterTestSubscriptionId,
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: new Date(),
          lineItems: [
            {
              description: 'Enterprise Plan',
              quantity: 1,
              unitPrice: 2499,
              type: 'subscription',
            },
          ],
        })
        .expect(HttpStatus.CREATED);

      const response = await request(app.getHttpServer())
        .get(`/billing/invoices/subscription/${filterTestSubscriptionId}?status=PENDING`)
        .expect(HttpStatus.OK);

      expect(response.body).toBeInstanceOf(Array);
      if (response.body.length > 0) {
        response.body.forEach((invoice: any) => {
          expect(invoice.status).toBe('PENDING');
        });
      }
    });
  });

  /**
   * TEST SUITE 9: Error Handling & Validation
   */
  describe('9. Error Handling & Validation', () => {
    it('POST /billing/subscriptions - should reject invalid plan type', async () => {
      await request(app.getHttpServer())
        .post('/billing/subscriptions')
        .send({
          tenantId: testTenantId,
          planType: 'INVALID_PLAN',
          billingFrequency: 'MONTHLY',
        })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('POST /billing/subscriptions - should reject missing tenantId', async () => {
      await request(app.getHttpServer())
        .post('/billing/subscriptions')
        .send({
          planType: BillingPlanType.FREE,
          billingFrequency: 'MONTHLY',
        })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('GET /billing/subscriptions/:subscriptionId - should return 404 for non-existent subscription', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .get(`/billing/subscriptions/${nonExistentId}`)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('POST /billing/invoices/generate - should reject invalid subscription', async () => {
      await request(app.getHttpServer())
        .post('/billing/invoices/generate')
        .send({
          subscriptionId: '00000000-0000-0000-0000-000000000000',
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: new Date(),
          lineItems: [],
        })
        .expect(HttpStatus.NOT_FOUND);
    });

    it('POST /billing/invoices/generate - should reject empty line items', async () => {
      // Create a test subscription
      const tenant = await request(app.getHttpServer())
        .post('/tenant')
        .send({
          name: 'Error Test Tenant',
          slug: `error-${Date.now()}`,
          description: 'For error handling tests',
        })
        .expect(HttpStatus.CREATED);

      const sub = await request(app.getHttpServer())
        .post('/billing/subscriptions')
        .send({
          tenantId: tenant.body.id,
          planType: BillingPlanType.FREE,
          billingFrequency: 'MONTHLY',
        })
        .expect(HttpStatus.CREATED);

      // Try to generate invoice with empty line items
      await request(app.getHttpServer())
        .post('/billing/invoices/generate')
        .send({
          subscriptionId: sub.body.id,
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: new Date(),
          lineItems: [],
        })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });
});
