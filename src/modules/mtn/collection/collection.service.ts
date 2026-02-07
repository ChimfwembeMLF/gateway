import { Injectable, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { RequestToPayDto } from '../dto/mtn.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Payment, PaymentStatus } from '../../payments/entities/payment.entity';
import { Transaction, TransactionType } from '../../payments/entities/transaction.entity';
import { MtnService } from '../mtn.service';

@Injectable()
export class CollectionService {
  private readonly logger = new Logger(CollectionService.name);
  constructor(
    private readonly configService: ConfigService,
    private readonly mtnService: MtnService,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {
  }

  // Only super admins can access this method (enforce in controller with @Roles(RoleType.SUPER_ADMIN))
  async requestToPay(dto: RequestToPayDto, tenantId: string, user: any, paymentExternalId?: string): Promise<any> {
    // RBAC: Only super admins should be allowed (enforce in controller)
    const mtn = this.configService.get<any>('mtn');
    const mtnCollection = this.configService.get<any>('mtn.collection');

    const url = `${mtn.base}/collection/v1_0/requesttopay`;
    this.logger.log(`[MTN COLLECTION] requestToPay called - URL: ${url}, Tenant: ${tenantId}, Payer: ${dto.payer?.partyId}`);
    try {
      const bearerToken = await this.mtnService.createMtnToken();
      const transactionId = dto.externalId;
      this.logger.log(`[MTN COLLECTION] Obtained bearer token, calling MTN API with transactionId: ${transactionId}`);
      await axios.post(url, dto, {
        headers: {
          'Ocp-Apim-Subscription-Key': mtnCollection.subscription_key,
          'X-Target-Environment': mtnCollection.target_environment,
          'X-Reference-Id': transactionId,
          Authorization: `Bearer ${bearerToken}`,
        },
      });
      this.logger.log(`[MTN COLLECTION] MTN API call succeeded for transactionId: ${transactionId}`);
      // Log transaction only if payment exists
      const lookupExternalId = paymentExternalId || transactionId;
      const payment = await this.paymentRepository.findOne({ where: { externalId: lookupExternalId, tenantId } });
      if (payment) {
        payment.momoTransactionId = transactionId;
        await this.paymentRepository.save(payment);
        await this.transactionRepository.save({
          tenantId,
          payment,
          type: TransactionType.REQUEST_TO_PAY,
          momoReferenceId: transactionId,
          response: JSON.stringify(dto),
          status: PaymentStatus.PENDING,
        });
        this.logger.log(`[MTN COLLECTION] Payment and transaction saved for externalId: ${lookupExternalId}`);
      }
      return { success: true, transactionId };
    } catch (error) {
      this.logger.error(`[MTN COLLECTION] requestToPay error: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to request to pay');
    }
  }

  // Only super admins can access this method (enforce in controller with @Roles(RoleType.SUPER_ADMIN))
  async getRequestToPayStatus(transactionId: string, tenantId: string, user: any): Promise<any> {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!transactionId || !uuidRegex.test(transactionId)) {
      throw new BadRequestException('Invalid MTN referenceId. A UUID is required.');
    }
    const mtn = this.configService.get<any>('mtn');
    const mtnCollection = this.configService.get<any>('mtn.collection');
    const url = `${mtn.base}/collection/v1_0/requesttopay/${transactionId}`;
    try {
      const bearerToken = await this.mtnService.createMtnToken();
      const response = await axios.get(url, {
        headers: {
          'Ocp-Apim-Subscription-Key': mtnCollection.subscription_key,
          'X-Target-Environment': mtnCollection.target_environment,
          Authorization: `Bearer ${bearerToken}`,
        },
      });
      // Update payment and transaction status
      const payment = await this.paymentRepository.findOne({
        where: [
          { momoTransactionId: transactionId, tenantId },
          { externalId: transactionId, tenantId },
        ],
      });
      if (payment) {
        payment.status = response.data.status;
        await this.paymentRepository.save(payment);
        await this.transactionRepository.save({
          tenantId,
          payment,
          type: TransactionType.STATUS_QUERY,
          momoReferenceId: transactionId,
          response: JSON.stringify(response.data),
          status: response.data.status,
        });
      }
      return response.data;
    } catch (error) {
      this.logger.error('getRequestToPayStatus error', error);
      throw new BadRequestException('Failed to get request to pay status');
    }
  }

  // Get collection account balance
  async getAccountBalance(tenantId: string, user: any): Promise<any> {
    const mtn = this.configService.get<any>('mtn');
    const mtnCollection = this.configService.get<any>('mtn.collection');
    const url = `${mtn.base}/collection/v1_0/account/balance`;
    try {
      const bearerToken = await this.mtnService.createMtnToken();
      const response = await axios.get(url, {
        headers: {
          'Ocp-Apim-Subscription-Key': mtnCollection.subscription_key,
          'X-Target-Environment': mtnCollection.target_environment,
          Authorization: `Bearer ${bearerToken}`,
        },
      });
      return response.data;
    } catch (error) {
      this.logger.error('getAccountBalance (collection) error', error);
      throw new BadRequestException('Failed to get collection account balance');
    }
  }

   // List all collection requests (stub)
  // Only super admins can access this method (enforce in controller with @Roles(RoleType.SUPER_ADMIN))
  async listRequests(query: any, tenantId: string, user: any) {
    // Basic filter: status, payer, date range
    const where: any = { tenantId };
    if (query.status) where.status = query.status;
    if (query.payer) where.payer = query.payer;
    // Optionally add date range filtering
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt['$gte'] = new Date(query.from);
      if (query.to) where.createdAt['$lte'] = new Date(query.to);
    }
    return this.paymentRepository.find({ where, order: { createdAt: 'DESC' } });
  }

  // Get details of a specific collection request by externalId (stub)
  // Only super admins can access this method (enforce in controller with @Roles(RoleType.SUPER_ADMIN))
  async getRequestByExternalId(externalId: string, tenantId: string, user: any) {
    const payment = await this.paymentRepository.findOne({ where: { externalId, tenantId } });
    if (!payment) throw new NotFoundException('Collection request not found');
    return payment;
  }

  // Cancel a pending collection request (stub)
  // Only super admins can access this method (enforce in controller with @Roles(RoleType.SUPER_ADMIN))
  async cancelRequest(externalId: string, tenantId: string, user: any) {
    const payment = await this.paymentRepository.findOne({ where: { externalId, tenantId } });
    if (!payment) throw new NotFoundException('Collection request not found');
    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be cancelled');
    }
    payment.status = PaymentStatus.FAILED;
    await this.paymentRepository.save(payment);
    return { success: true };
  }

  // Handle webhook/callback from MTN (stub)
  // Webhook endpoint, no RBAC (should validate signature if possible)
  async handleWebhook(body: any) {
    // Example: body should contain externalId and new status
    const { externalId, status } = body;
    if (!externalId || !status) return;
    const payment = await this.paymentRepository.findOne({ where: { externalId } });
    if (payment) {
      payment.status = status;
      await this.paymentRepository.save(payment);
      await this.transactionRepository.save({
        tenantId: payment.tenantId,
        payment,
        type: TransactionType.STATUS_QUERY,
        momoReferenceId: externalId,
        response: JSON.stringify(body),
        status,
      });
    }
    return;
  }

  // Poll pending collection requests (stub)
  // Only super admins can access this method (enforce in controller with @Roles(RoleType.SUPER_ADMIN))
  async pollPendingCollections(tenantId: string, user: any) {
    // Optionally filter by tenantId if needed
    // Find all pending payments and refresh their status from provider
    const pending = await this.paymentRepository.find({ where: { status: PaymentStatus.PENDING, tenantId } });
    for (const payment of pending) {
      try {
        await this.getRequestToPayStatus(payment.externalId, payment.tenantId, user);
      } catch (err) {
        this.logger.warn(`Failed to poll status for payment ${payment.externalId}: ${err}`);
      }
    }
    return;
  }

  // Reconcile collections (stub)
  // Only super admins can access this method (enforce in controller with @Roles(RoleType.SUPER_ADMIN))
  async reconcileCollections(tenantId: string, user: any) {
    // Optionally filter by tenantId if needed
    // Fetch all payments for reconciliation
    const payments = await this.paymentRepository.find({ where: { tenantId } });
    let updated = 0;
    for (const payment of payments) {
      try {
        const providerStatus = await this.getRequestToPayStatus(payment.externalId, payment.tenantId, user);
        if (providerStatus.status && providerStatus.status !== payment.status) {
          payment.status = providerStatus.status;
          await this.paymentRepository.save(payment);
          await this.transactionRepository.save({
            tenantId: payment.tenantId,
            payment,
            type: TransactionType.STATUS_QUERY,
            momoReferenceId: payment.externalId,
            response: JSON.stringify(providerStatus),
            status: providerStatus.status,
          });
          updated++;
        }
      } catch (err) {
        this.logger.warn(`Reconciliation failed for payment ${payment.externalId}: ${err}`);
      }
    }
    this.logger.log(`Reconciliation complete. Updated ${updated} payment(s).`);
    return { updated };
  }

  // Cleanup old collections (stub)
  // Only super admins can access this method (enforce in controller with @Roles(RoleType.SUPER_ADMIN))
  async cleanupOldCollections(tenantId: string, user: any) {
    // Delete payments older than 1 year (example)
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    await this.paymentRepository.delete({ createdAt: LessThan(cutoff), tenantId });
    return;
  }
}
