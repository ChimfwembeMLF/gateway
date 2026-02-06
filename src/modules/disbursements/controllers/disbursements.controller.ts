import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiTooManyRequestsResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiHeader,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { DisbursementsService } from '../services/disbursements.service';
import { CreateDisbursementDto } from '../dto/create-disbursement.dto';
import { DisbursementResponseDto } from '../dto/disbursement-response.dto';
import { ListDisbursementsQueryDto } from '../dto/list-disbursements-query.dto';
import { ApiKeyGuard } from 'src/common/guards/api-key.guard';
import { CurrentTenant } from 'src/common/decorators/current-tenant.decorator';
import { ValidationPipe } from '@nestjs/common';

/**
 * Disbursements Controller
 * REST API for disbursement (money-out/payout) operations
 *
 * Base Path: /api/v1/disbursements
 *
 * Requires: API Key authentication (X-API-Key header)
 */
@ApiTags('Disbursements')
@ApiSecurity('x-api-key')
@ApiBadRequestResponse({
  description: 'Invalid request parameters or validation failed',
})
@ApiUnauthorizedResponse({
  description: 'Missing or invalid API key',
})
@ApiTooManyRequestsResponse({
  description: 'Rate limit exceeded',
})
@ApiInternalServerErrorResponse({
  description: 'Internal server error',
})
@UseGuards(ApiKeyGuard)
@Controller('api/v1/disbursements')
export class DisbursementsController {
  constructor(private readonly disbursementsService: DisbursementsService) {}

  /**
   * Create a new disbursement (money-out to wallet)
   *
   * Creates a payout transaction sending money to a customer's Airtel Money wallet.
   * Supports idempotent requests - same externalId returns the same result.
   *
   * **Request Flow**:
   * 1. Validate input (MSISDN format, amount, PIN)
   * 2. Create PENDING disbursement record
   * 3. Call Airtel API (with OAuth2 and signing)
   * 4. Update status based on Airtel response
   * 5. Return final status to client
   *
   * **Status Codes**:
   * - 201: Disbursement created successfully (may be PENDING, SUCCESS, or FAILED)
   * - 400: Validation error (invalid MSISDN, amount ≤ 0, etc.)
   * - 401: Unauthorized (missing/invalid API key)
   * - 409: Conflict (duplicate externalId - returns existing disbursement)
   * - 429: Rate limited
   * - 500: Internal error or Airtel API failure
   *
   * @param createDto Disbursement request
   * @param tenantId Tenant ID (from API key context)
   * @returns Created disbursement with final status
   *
   * @example
   * POST /api/v1/disbursements
   * Content-Type: application/json
   * X-API-Key: tenant-api-key-here
   *
   * {
   *   "externalId": "order-2024-001",
   *   "payeeMsisdn": "0977123456",
   *   "amount": 500.50,
   *   "currency": "ZMW",
   *   "reference": "INV-2024-001",
   *   "pin": "1234",
   *   "walletType": "NORMAL",
   *   "transactionType": "B2C"
   * }
   *
   * Response (201 Created):
   * {
   *   "id": "550e8400-e29b-41d4-a716-446655440000",
   *   "tenantId": "tenant-001",
   *   "externalId": "order-2024-001",
   *   "payeeMsisdn": "0977123456",
   *   "walletType": "NORMAL",
   *   "amount": "500.50",
   *   "currency": "ZMW",
   *   "reference": "INV-2024-001",
   *   "transactionType": "B2C",
   *   "status": "SUCCESS",
   *   "airtelReferenceId": "AIRTEL-12345",
   *   "airtelMoneyId": "MONEY-67890",
   *   "errorCode": null,
   *   "errorMessage": null,
   *   "createdAt": "2024-02-06T10:30:00Z",
   *   "updatedAt": "2024-02-06T10:31:00Z"
   * }
   */
  @Post()
  @ApiOperation({
    summary: 'Create a new disbursement',
    description: 'Send money to a customer Airtel Money wallet',
  })
  @ApiBody({
    type: CreateDisbursementDto,
    description: 'Disbursement request details',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Disbursement created successfully',
    type: DisbursementResponseDto,
  })
  @ApiConflictResponse({
    description: 'Duplicate externalId (returns existing disbursement)',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input (MSISDN format, amount, PIN format, etc.)',
  })
  async createDisbursement(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    createDto: CreateDisbursementDto,
    @CurrentTenant() tenantId: string,
  ): Promise<DisbursementResponseDto> {
    return this.disbursementsService.createDisbursement(createDto, tenantId);
  }

  /**
   * Get disbursement details by ID
   *
   * Retrieve current status and details of a specific disbursement.
   * Returns only disbursements belonging to the requesting tenant.
   *
   * **Status Codes**:
   * - 200: Disbursement found
   * - 400: Disbursement not found
   * - 401: Unauthorized
   * - 404: Resource not found (returned as 400 for API consistency)
   *
   * @param id Disbursement UUID
   * @param tenantId Tenant ID (from API key context)
   * @returns Disbursement details
   *
   * @example
   * GET /api/v1/disbursements/550e8400-e29b-41d4-a716-446655440000
   * X-API-Key: tenant-api-key-here
   *
   * Response (200 OK):
   * {
   *   "id": "550e8400-e29b-41d4-a716-446655440000",
   *   "status": "SUCCESS",
   *   ...
   * }
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get disbursement by ID',
    description: 'Retrieve details of a specific disbursement',
  })
  @ApiParam({
    name: 'id',
    description: 'Disbursement UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Disbursement found',
    type: DisbursementResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Disbursement not found',
  })
  async getDisbursement(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ): Promise<DisbursementResponseDto> {
    return this.disbursementsService.getDisbursement(id, tenantId);
  }

  /**
   * List disbursements for tenant
   *
   * Retrieve paginated list of disbursements with optional filtering.
   * Returns only disbursements belonging to the requesting tenant.
   *
   * **Query Parameters**:
   * - `page` (optional, default: 1): Page number for pagination (1-indexed)
   * - `limit` (optional, default: 20, max: 100): Items per page
   * - `status` (optional): Filter by status (PENDING, SUCCESS, FAILED, etc.)
   * - `startDate` (optional): Filter by creation date (ISO 8601) - inclusive
   * - `endDate` (optional): Filter by creation date (ISO 8601) - inclusive
   *
   * **Status Codes**:
   * - 200: List retrieved successfully
   * - 400: Invalid query parameters
   * - 401: Unauthorized
   *
   * @param query Filter and pagination options
   * @param tenantId Tenant ID (from API key context)
   * @returns Paginated list of disbursements
   *
   * @example
   * GET /api/v1/disbursements?page=1&limit=20&status=SUCCESS&startDate=2024-02-01T00:00:00Z
   * X-API-Key: tenant-api-key-here
   *
   * Response (200 OK):
   * {
   *   "items": [
   *     {
   *       "id": "550e8400-e29b-41d4-a716-446655440000",
   *       "status": "SUCCESS",
   *       ...
   *     }
   *   ],
   *   "total": 150,
   *   "page": 1,
   *   "limit": 20,
   *   "totalPages": 8
   * }
   */
  @Get()
  @ApiOperation({
    summary: 'List disbursements',
    description: 'Retrieve paginated list of disbursements with optional filtering',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (1-indexed)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (max: 100)',
    example: 20,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    enum: ['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'TIMEOUT', 'BOUNCED', 'REFUNDED'],
    description: 'Filter by disbursement status',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Filter by creation date (ISO 8601, inclusive)',
    example: '2024-02-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Filter by creation date (ISO 8601, inclusive)',
    example: '2024-02-28T23:59:59Z',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { $ref: '#/components/schemas/DisbursementResponseDto' },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  async listDisbursements(
    @Query(new ValidationPipe({ transform: true }))
    query: ListDisbursementsQueryDto,
    @CurrentTenant() tenantId: string,
  ): Promise<{
    items: DisbursementResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.disbursementsService.listDisbursements(tenantId, query);
  }
}
