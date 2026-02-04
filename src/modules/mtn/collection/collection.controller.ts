import { Controller, Post, Get, Body, Param, Req, HttpException, HttpStatus } from '@nestjs/common';
import { Query, Delete, Patch, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse, ApiBody } from '@nestjs/swagger';
import { CollectionService } from './collection.service';
import { RequestToPayDto, RequestToPayResultDto, ErrorReasonDto } from '../dto/mtn.dto';

@ApiTags('MTN Collection')
@Controller('api/v1/mtn/collection')
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}

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
  async webhook(@Body() body: any, @Res() res: any) {
    // Process webhook/callback from MTN
    await this.collectionService.handleWebhook(body);
    return res.status(204).send();
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
