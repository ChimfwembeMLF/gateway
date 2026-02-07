import { Controller, Post, Get, Body, Param, Req, HttpException, HttpStatus, RawBodyRequest, Logger } from '@nestjs/common';
import { Query, Delete, Patch, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse, ApiBody, ApiHeader } from '@nestjs/swagger';
import { CollectionService } from './collection.service';
import { WebhookValidatorService, WebhookDeduplicationService } from './services';
import { RequestToPayDto, RequestToPayResultDto, ErrorReasonDto } from '../dto/mtn.dto';

@ApiTags('MTN Collection')
@Controller('api/v1/mtn/collection')
export class CollectionController {
  private readonly logger = new Logger(CollectionController.name);

  constructor(
    private readonly collectionService: CollectionService,
    private readonly webhookValidator: WebhookValidatorService,
    private readonly webhookDeduplicator: WebhookDeduplicationService,
  ) {}

  // List all collection requests (with optional filters)
  @Get('requests')
  async listRequests(@Query() query: any, @Req() req: any) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new HttpException('Missing tenantId in request.', HttpStatus.BAD_REQUEST);
    return this.collectionService.listRequests(query, tenantId, req.user);
  }

  // Get details of a specific collection request by externalId
  @Get('request/:externalId')
  async getRequestByExternalId(@Param('externalId') externalId: string, @Req() req: any) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new HttpException('Missing tenantId in request.', HttpStatus.BAD_REQUEST);
    return this.collectionService.getRequestByExternalId(externalId, tenantId, req.user);
  }

  // Cancel a pending collection request
  @Patch('request/:externalId/cancel')
  async cancelRequest(@Param('externalId') externalId: string, @Req() req: any) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new HttpException('Missing tenantId in request.', HttpStatus.BAD_REQUEST);
    return this.collectionService.cancelRequest(externalId, tenantId, req.user);
  }

  // Webhook/callback endpoint for MTN to notify status updates
  @Post('webhook')
  @ApiOperation({
    summary: 'Handle MTN Webhook',
    description: 'Webhook endpoint for MTN to send collection status updates. Validates signature and prevents duplicates.',
  })
  @ApiHeader({ name: 'X-Signature-256', description: 'HMAC-SHA256 signature of request body' })
  @ApiResponse({ status: 204, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook signature or structure' })
  @ApiResponse({ status: 409, description: 'Duplicate webhook (already processed)' })
  async webhook(
    @Body() body: any,
    @Req() req: RawBodyRequest<any>,
    @Res() res: any,
  ) {
    const signature = req.headers['x-signature-256'] as string;
    const rawBody = req.rawBody?.toString() || JSON.stringify(body);

    try {
      // Validate webhook signature
      const isValidSignature = this.webhookValidator.validateSignature(
        signature,
        rawBody,
      );

      if (!isValidSignature) {
        this.logger.warn('[WEBHOOK] Invalid signature received');
        return res.status(400).json({
          error: 'Invalid webhook signature',
        });
      }

      // Validate payload structure
      const isValidStructure = this.webhookValidator.validatePayloadStructure(body);
      if (!isValidStructure) {
        this.logger.warn('[WEBHOOK] Invalid payload structure');
        return res.status(400).json({
          error: 'Invalid webhook payload structure',
        });
      }

      // Extract transaction ID
      const transactionId = this.webhookValidator.extractTransactionId(body);
      if (!transactionId) {
        this.logger.warn('[WEBHOOK] Could not extract transaction ID');
        return res.status(400).json({
          error: 'Could not extract transaction ID from webhook',
        });
      }

      // Check for duplicates
      const isDuplicate = await this.webhookDeduplicator.isDuplicate(transactionId);
      if (isDuplicate) {
        this.logger.log(`[WEBHOOK] Duplicate webhook detected for transaction ${transactionId}`);
        // Log as skipped and return 204 (idempotent)
        await this.webhookDeduplicator.logWebhook(
          transactionId,
          body,
          signature,
          'SKIPPED',
          { reason: 'Duplicate webhook' },
        );
        return res.status(204).send();
      }

      // Log webhook as pending
      await this.webhookDeduplicator.logWebhook(
        transactionId,
        body,
        signature,
        'PENDING',
      );

      // Process webhook
      this.logger.log(`[WEBHOOK] Processing webhook for transaction ${transactionId}`);
      const result = await this.collectionService.handleWebhook(body);

      // Update log with success
      await this.webhookDeduplicator.updateWebhookLog(
        transactionId,
        'PROCESSED',
        result,
      );

      return res.status(204).send();
    } catch (error) {
      this.logger.error('[WEBHOOK] Error processing webhook', {
        error: error instanceof Error ? error.message : String(error),
        body,
      });

      // Try to log as failed if we have transaction ID
      const transactionId = this.webhookValidator.extractTransactionId(body);
      if (transactionId) {
        await this.webhookDeduplicator.updateWebhookLog(
          transactionId,
          'FAILED',
          null,
          error instanceof Error ? error.message : String(error),
        );
      }

      return res.status(500).json({
        error: 'Failed to process webhook',
      });
    }
  }

  @Post('requesttopay')
  @ApiOperation({ summary: 'Request to Pay', description: 'Request a payment from a consumer (payer).' })
  @ApiBody({ type: RequestToPayDto })
  @ApiResponse({ status: 202, description: 'Accepted', type: RequestToPayResultDto })
  @ApiResponse({ status: 400, description: 'Bad request', type: ErrorReasonDto })
  @ApiResponse({ status: 409, description: 'Conflict', type: ErrorReasonDto })
  @ApiResponse({ status: 500, description: 'Internal error', type: ErrorReasonDto })
  async requestToPay(@Body() dto: RequestToPayDto, @Req() req: any): Promise<any> {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new HttpException('Missing tenantId in request.', HttpStatus.BAD_REQUEST);
    return this.collectionService.requestToPay(dto, tenantId, req.user);
  }

  @Get('requesttopay/:transactionId/status')
  @ApiOperation({ summary: 'Get Request to Pay Status', description: 'Get the status of a request to pay by referenceId.' })
  @ApiParam({ name: 'transactionId', description: 'UUID of transaction to get result.' })
  @ApiResponse({ status: 200, description: 'OK', type: RequestToPayResultDto })
  @ApiResponse({ status: 404, description: 'Resource not found', type: ErrorReasonDto })
  @ApiResponse({ status: 500, description: 'Internal error', type: ErrorReasonDto })
  async getRequestToPayStatus(@Param('transactionId') transactionId: string, @Req() req: any): Promise<any> {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new HttpException('Missing tenantId in request.', HttpStatus.BAD_REQUEST);
    return this.collectionService.getRequestToPayStatus(transactionId, tenantId, req.user);
  }
}
