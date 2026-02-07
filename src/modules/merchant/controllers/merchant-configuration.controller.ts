import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { MerchantConfigurationService } from '../services/merchant-configuration.service';
import {
  CreateMerchantConfigurationDto,
  UpdateMerchantConfigurationDto,
  MerchantConfigurationResponseDto,
  VerifyCredentialsDto,
  TestWebhookDto,
  VerificationResponseDto,
  WebhookTestResponseDto,
} from '../dtos/merchant-configuration.dto';
import { CurrentTenant } from 'src/common/decorators/current-tenant.decorator';
import { Auth } from 'src/common/decorators/auth.decorator';

/**
 * Merchant Configuration Controller
 * Manages merchant credentials, KYC, and business configuration
 * Requires authentication and multi-tenant context
 */
@ApiTags('Merchant Configuration')
@Controller('api/v1/merchant/configuration')
@ApiBearerAuth()
@UseGuards(Auth)
export class MerchantConfigurationController {
  private readonly logger = new Logger(MerchantConfigurationController.name);

  constructor(private readonly configService: MerchantConfigurationService) {}

  /**
   * Create merchant configuration
   * Only callable once per tenant (returns error if already exists)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create merchant configuration' })
  @ApiHeader({
    name: 'x-tenant-id',
    description: 'Tenant identifier',
    required: true,
  })
  @ApiHeader({
    name: 'x-api-key',
    description: 'Current tenant API key',
    required: true,
  })
  @ApiResponse({
    status: 201,
    description: 'Merchant configuration created successfully',
    type: MerchantConfigurationResponseDto,
    headers: {
      'x-tenant-id': {
        description: 'Tenant identifier',
        schema: { type: 'string' },
      },
      'x-api-key': {
        description: 'Current tenant API key',
        schema: { type: 'string' },
      },
    },
  })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateMerchantConfigurationDto,
  ): Promise<MerchantConfigurationResponseDto> {
    this.logger.log(`Creating merchant configuration for tenant ${tenantId}`);
    return this.configService.create(tenantId, dto);
  }

  /**
   * Get merchant configuration
   * Returns configuration without sensitive credential data
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get merchant configuration' })
  @ApiHeader({
    name: 'x-tenant-id',
    description: 'Tenant identifier',
    required: true,
  })
  @ApiHeader({
    name: 'x-api-key',
    description: 'Current tenant API key',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Merchant configuration retrieved successfully',
    type: MerchantConfigurationResponseDto,
    headers: {
      'x-tenant-id': {
        description: 'Tenant identifier',
        schema: { type: 'string' },
      },
      'x-api-key': {
        description: 'Current tenant API key',
        schema: { type: 'string' },
      },
    },
  })
  async get(@CurrentTenant() tenantId: string): Promise<MerchantConfigurationResponseDto> {
    return this.configService.findByTenantId(tenantId);
  }

  /**
   * Update merchant configuration
   * Allows partial updates (PATCH)
   */
  @Patch()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update merchant configuration' })
  @ApiHeader({
    name: 'x-tenant-id',
    description: 'Tenant identifier',
    required: true,
  })
  @ApiHeader({
    name: 'x-api-key',
    description: 'Current tenant API key',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Merchant configuration updated successfully',
    type: MerchantConfigurationResponseDto,
    headers: {
      'x-tenant-id': {
        description: 'Tenant identifier',
        schema: { type: 'string' },
      },
      'x-api-key': {
        description: 'Current tenant API key',
        schema: { type: 'string' },
      },
    },
  })
  async update(
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateMerchantConfigurationDto,
  ): Promise<MerchantConfigurationResponseDto> {
    this.logger.log(`Updating merchant configuration for tenant ${tenantId}`);
    return this.configService.update(tenantId, dto);
  }

  /**
   * Verify MTN credentials
   * Tests connectivity with MTN API
   */
  @Post('verify/mtn')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify MTN credentials' })
  @ApiHeader({
    name: 'x-tenant-id',
    description: 'Tenant identifier',
    required: true,
  })
  @ApiHeader({
    name: 'x-api-key',
    description: 'Current tenant API key',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'MTN credentials verified successfully',
    type: VerificationResponseDto,
    headers: {
      'x-tenant-id': {
        description: 'Tenant identifier',
        schema: { type: 'string' },
      },
      'x-api-key': {
        description: 'Current tenant API key',
        schema: { type: 'string' },
      },
    },
  })
  async verifyMtn(
    @CurrentTenant() tenantId: string,
  ): Promise<VerificationResponseDto> {
    this.logger.log(`Verifying MTN credentials for tenant ${tenantId}`);
    return this.configService.verifyMtnCredentials(tenantId);
  }

  /**
   * Verify Airtel credentials
   * Tests OAuth2 authentication with Airtel API
   */
  @Post('verify/airtel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify Airtel credentials' })
  @ApiHeader({
    name: 'x-tenant-id',
    description: 'Tenant identifier',
    required: true,
  })
  @ApiHeader({
    name: 'x-api-key',
    description: 'Current tenant API key',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Airtel credentials verified successfully',
    type: VerificationResponseDto,
    headers: {
      'x-tenant-id': {
        description: 'Tenant identifier',
        schema: { type: 'string' },
      },
      'x-api-key': {
        description: 'Current tenant API key',
        schema: { type: 'string' },
      },
    },
  })
  async verifyAirtel(
    @CurrentTenant() tenantId: string,
  ): Promise<VerificationResponseDto> {
    this.logger.log(`Verifying Airtel credentials for tenant ${tenantId}`);
    return this.configService.verifyAirtelCredentials(tenantId);
  }

  /**
   * Verify bank account
   * Validates bank account details
   */
  @Post('verify/bank')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify bank account' })
  @ApiHeader({
    name: 'x-tenant-id',
    description: 'Tenant identifier',
    required: true,
  })
  @ApiHeader({
    name: 'x-api-key',
    description: 'Current tenant API key',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Bank account verified successfully',
    type: VerificationResponseDto,
    headers: {
      'x-tenant-id': {
        description: 'Tenant identifier',
        schema: { type: 'string' },
      },
      'x-api-key': {
        description: 'Current tenant API key',
        schema: { type: 'string' },
      },
    },
  })
  async verifyBank(
    @CurrentTenant() tenantId: string,
  ): Promise<VerificationResponseDto> {
    this.logger.log(`Verifying bank account for tenant ${tenantId}`);
    return this.configService.verifyBankAccount(tenantId);
  }

  /**
   * Test webhook endpoint
   * Sends test payload to configured webhook URL
   */
  @Post('webhook/test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test webhook endpoint' })
  @ApiHeader({
    name: 'x-tenant-id',
    description: 'Tenant identifier',
    required: true,
  })
  @ApiHeader({
    name: 'x-api-key',
    description: 'Current tenant API key',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook test completed',
    type: WebhookTestResponseDto,
    headers: {
      'x-tenant-id': {
        description: 'Tenant identifier',
        schema: { type: 'string' },
      },
      'x-api-key': {
        description: 'Current tenant API key',
        schema: { type: 'string' },
      },
    },
  })
  async testWebhook(
    @CurrentTenant() tenantId: string,
    @Body() dto: TestWebhookDto,
  ): Promise<WebhookTestResponseDto> {
    this.logger.log(`Testing webhook for tenant ${tenantId} with event: ${dto.eventType}`);
    return this.configService.testWebhook(tenantId, dto.eventType);
  }
}
