
import { Controller, Post, Headers, Body, Req, Res, HttpCode, Inject, InternalServerErrorException } from '@nestjs/common';
import { Request, Response } from 'express';
import { PaymentsService } from '../payments/payments.service';
import { DisbursementsService } from '../disbursements/disbursements.service';

@Controller('webhooks/pawapay')
export class PawapayWebhooksController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly disbursementsService: DisbursementsService,
  ) {}
  @Post('deposits')
  @HttpCode(200)
  async handleDeposit(@Headers() headers: any, @Body() body: any, @Req() req: Request, @Res() res: Response) {
    console.log('Received pawaPay deposit webhook:', { headers, body });
    if (!body || !body.transactionId || !body.amount || !body.status) {
      console.warn('Invalid deposit webhook payload:', body);
      return res.status(400).json({ error: 'Invalid payload' });
    }
    try {
      // Update payment status by transactionId
      await this.paymentsService.updateStatus(body.transactionId, body.status, body.tenantId || null);
      // Optionally, record metadata or log
      // await this.paymentsService.addMetadata(body.transactionId, body);
      res.status(200).json({ received: true });
    } catch (err) {
      console.error('Error processing deposit webhook:', err);
      res.status(500).json({ error: 'Failed to process deposit webhook' });
    }
  }

  @Post('payouts')
  @HttpCode(200)
  async handlePayout(@Headers() headers: any, @Body() body: any, @Req() req: Request, @Res() res: Response) {
    console.log('Received pawaPay payout webhook:', { headers, body });
    if (!body || !body.payoutId || !body.amount || !body.status) {
      console.warn('Invalid payout webhook payload:', body);
      return res.status(400).json({ error: 'Invalid payload' });
    }
    try {
      // Update disbursement status by payoutId
      // You may need to implement updateStatus in DisbursementsService
      await this.disbursementsService.updateStatus(body.payoutId, body.status);
      res.status(200).json({ received: true });
    } catch (err) {
      console.error('Error processing payout webhook:', err);
      res.status(500).json({ error: 'Failed to process payout webhook' });
    }
  }

  @Post('refunds')
  @HttpCode(200)
  async handleRefund(@Headers() headers: any, @Body() body: any, @Req() req: Request, @Res() res: Response) {
    console.log('Received pawaPay refund webhook:', { headers, body });
    if (!body || !body.refundId || !body.amount || !body.status) {
      console.warn('Invalid refund webhook payload:', body);
      return res.status(400).json({ error: 'Invalid payload' });
    }
    try {
      // Try to update payment first, then disbursement if not found
      let updated = false;
      try {
        await this.paymentsService.updateStatus(body.refundId, body.status, body.tenantId || null);
        updated = true;
      } catch (e) {
        // Not found in payments, try disbursements
        try {
          await this.disbursementsService.updateStatus(body.refundId, body.status);
          updated = true;
        } catch (e2) {
          // Not found in either
        }
      }
      if (!updated) {
        return res.status(404).json({ error: 'Refund target not found' });
      }
      res.status(200).json({ received: true });
    } catch (err) {
      console.error('Error processing refund webhook:', err);
      res.status(500).json({ error: 'Failed to process refund webhook' });
    }
  }
}
