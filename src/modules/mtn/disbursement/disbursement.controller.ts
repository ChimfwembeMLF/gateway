import { Controller, Get, Post, Body, Param, Req, HttpException, HttpStatus, Query, Patch, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RoleType } from '../../../common/enums/role-type.enum';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { DisbursementService } from './disbursement.service';
import { Auth } from 'src/common/decorators/auth.decorator';
import { ValidateAccountHolderStatusDto } from './dto/validate-account-holder-status.dto';
import { BasicUserInfoDto } from './dto/basic-userinfo.dto';
import { DepositDto } from './dto/deposit.dto';
import { RefundDto } from './dto/refund.dto';
import { TransferResultDto } from './dto/transfer-result.dto';

@ApiTags('MTN Disbursement')
@ApiBearerAuth()
// @UseGuards(RolesGuard)
@Auth() // Enforce authentication for all endpoints
@Controller('api/v1/mtn/disbursement')
export class DisbursementController {
  constructor(private readonly disbursementService: DisbursementService) {}

  @Get('balance')
  @Roles(RoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get Account Balance', description: 'Get the balance of the disbursement account.' })
  @ApiResponse({ status: 200, description: 'OK' })
  async getAccountBalance(@Req() req: any) {
    if (!req.user) throw new HttpException('Missing user in request.', HttpStatus.UNAUTHORIZED);
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new HttpException('Missing tenantId in request.', HttpStatus.BAD_REQUEST);
    return this.disbursementService.getAccountBalance(tenantId, req.user);
  }

  @Post('transfer')
  @Roles(RoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Transfer Funds', description: 'Transfer funds to a payee account.' })
  @ApiBody({
    schema: {
      example: {
        amount: '1000',
        currency: 'UGX',
        externalId: '123456789',
        payee: {
          partyIdType: 'MSISDN',
          partyId: '256772123456',
        },
        payerMessage: 'Payment for services',
        payeeNote: 'Thank you',
      },
    },
    type: Object,
  })
  @ApiResponse({ status: 202, description: 'Accepted' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async transfer(@Body() transferDto: any, @Req() req: any) {
    if (!req.user) throw new HttpException('Missing user in request.', HttpStatus.UNAUTHORIZED);
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new HttpException('Missing tenantId in request.', HttpStatus.BAD_REQUEST);
    return this.disbursementService.transfer(transferDto, tenantId, req.user);
  }

  @Get('transfer/:referenceId/status')
  @Roles(RoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get Transfer Status', description: 'Get the status of a transfer by referenceId.' })
  @ApiParam({ name: 'referenceId', description: 'UUID of transfer to get result.', example: 'b7e6c8e2-1234-4c8a-9b2e-abcdef123456' })
  @ApiResponse({ status: 200, description: 'OK' })
  async getTransferStatus(@Param('referenceId') referenceId: string, @Req() req: any) {
    if (!req.user) throw new HttpException('Missing user in request.', HttpStatus.UNAUTHORIZED);
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new HttpException('Missing tenantId in request.', HttpStatus.BAD_REQUEST);
    return this.disbursementService.getTransferStatus(referenceId, tenantId, req.user);
  }

  @Post('token')
  @ApiOperation({ summary: 'Create Access Token', description: 'Create an access token for disbursement API.' })
  @ApiResponse({ status: 200, description: 'Access token created', schema: { example: { access_token: 'string', token_type: 'string', expires_in: 3600 } } })
  async createAccessToken(@Req() req: any) {
    // This endpoint does not require tenant/user context, as it is for system-to-system auth
    try {
      const token = await this.disbursementService.createDisbursementToken();
      return { access_token: token, token_type: 'Bearer', expires_in: 3600 };
    } catch (error) {
      throw new HttpException('Failed to create access token', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Validate Account Holder Status
  @Get('accountholder/:accountHolderIdType/:accountHolderId/active')
  @ApiOperation({ summary: 'Validate Account Holder Status', description: 'Check if an account holder is registered and active.' })
  @ApiParam({ name: 'accountHolderIdType', description: 'Type of account holder identity (msisdn, email)', example: 'msisdn' })
  @ApiParam({ name: 'accountHolderId', description: 'Account holder identifier', example: '256772123456' })
  @ApiResponse({ status: 200, type: ValidateAccountHolderStatusDto, schema: { example: { result: true } } })
  async validateAccountHolderStatus(
    @Param('accountHolderIdType') accountHolderIdType: string,
    @Param('accountHolderId') accountHolderId: string,
    @Req() req: any,
  ): Promise<ValidateAccountHolderStatusDto> {
    return this.disbursementService.validateAccountHolderStatus(accountHolderIdType, accountHolderId, req.user);
  }

  // Get Basic User Info
  @Get('accountholder/:accountHolderIdType/:accountHolderId/basicuserinfo')
  @ApiOperation({ summary: 'Get Basic User Info', description: 'Returns personal information of the account holder.' })
  @ApiParam({ name: 'accountHolderIdType', description: 'Type of account holder identity', example: 'msisdn' })
  @ApiParam({ name: 'accountHolderId', description: 'Account holder identifier', example: '256772123456' })
  @ApiResponse({ status: 200, type: BasicUserInfoDto, schema: { example: { given_name: 'John', family_name: 'Doe', birthdate: '1990-01-01', locale: 'en', gender: 'male', status: 'active' } } })
  async getBasicUserInfo(
    @Param('accountHolderIdType') accountHolderIdType: string,
    @Param('accountHolderId') accountHolderId: string,
    @Req() req: any,
  ): Promise<BasicUserInfoDto> {
    return this.disbursementService.getBasicUserInfo(accountHolderIdType, accountHolderId, req.user);
  }

  // Deposit V1
  @Post('deposit')
  @ApiOperation({ summary: 'Deposit V1', description: 'Deposit funds to a payee account.' })
  @ApiBody({
    type: DepositDto,
    examples: {
      default: {
        value: {
          amount: '1000',
          currency: 'UGX',
          externalId: '123456789',
          payee: {
            partyIdType: 'MSISDN',
            partyId: '256772123456',
          },
          payerMessage: 'Deposit for services',
          payeeNote: 'Thank you',
        },
      },
    },
  })
  @ApiResponse({ status: 202, description: 'Accepted' })
  async depositV1(@Body() depositDto: DepositDto, @Req() req: any) {
    return this.disbursementService.depositV1(depositDto, req.user);
  }

  // Deposit V2
  @Post('deposit/v2')
  @ApiOperation({ summary: 'Deposit V2', description: 'Deposit funds to a payee account (v2).' })
  @ApiBody({
    type: DepositDto,
    examples: {
      default: {
        value: {
          amount: '1000',
          currency: 'UGX',
          externalId: '123456789',
          payee: {
            partyIdType: 'MSISDN',
            partyId: '256772123456',
          },
          payerMessage: 'Deposit for services',
          payeeNote: 'Thank you',
        },
      },
    },
  })
  @ApiResponse({ status: 202, description: 'Accepted' })
  async depositV2(@Body() depositDto: DepositDto, @Req() req: any) {
    return this.disbursementService.depositV2(depositDto, req.user);
  }

  // Get Deposit Status
  @Get('deposit/:referenceId')
  @ApiOperation({ summary: 'Get Deposit Status', description: 'Get the status of a deposit.' })
  @ApiParam({ name: 'referenceId', description: 'UUID of transaction to get result.', example: 'b7e6c8e2-1234-4c8a-9b2e-abcdef123456' })
  @ApiResponse({ status: 200, type: TransferResultDto, schema: { example: {
    amount: '1000',
    currency: 'UGX',
    financialTransactionId: '987654321',
    externalId: '123456789',
    payee: { partyIdType: 'MSISDN', partyId: '256772123456' },
    payerMessage: 'Deposit for services',
    payeeNote: 'Thank you',
    status: 'SUCCESSFUL',
    reason: { code: '00', message: 'Success' },
  } } })
  async getDepositStatus(@Param('referenceId') referenceId: string, @Req() req: any): Promise<TransferResultDto> {
    return this.disbursementService.getDepositStatus(referenceId, req.user);
  }

  // Refund V1
  @Post('refund')
  @ApiOperation({ summary: 'Refund V1', description: 'Refund an amount to a payee account.' })
  @ApiBody({
    type: RefundDto,
    examples: {
      default: {
        value: {
          amount: '1000',
          currency: 'UGX',
          externalId: '123456789',
          payerMessage: 'Refund for failed transaction',
          payeeNote: 'Sorry for the inconvenience',
          referenceIdToRefund: 'b7e6c8e2-1234-4c8a-9b2e-abcdef123456',
        },
      },
    },
  })
  @ApiResponse({ status: 202, description: 'Accepted' })
  async refundV1(@Body() refundDto: RefundDto, @Req() req: any) {
    return this.disbursementService.refundV1(refundDto, req.user);
  }

  // Refund V2
  @Post('refund/v2')
  @ApiOperation({ summary: 'Refund V2', description: 'Refund an amount to a payee account (v2).' })
  @ApiBody({
    type: RefundDto,
    examples: {
      default: {
        value: {
          amount: '1000',
          currency: 'UGX',
          externalId: '123456789',
          payerMessage: 'Refund for failed transaction',
          payeeNote: 'Sorry for the inconvenience',
          referenceIdToRefund: 'b7e6c8e2-1234-4c8a-9b2e-abcdef123456',
        },
      },
    },
  })
  @ApiResponse({ status: 202, description: 'Accepted' })
  async refundV2(@Body() refundDto: RefundDto, @Req() req: any) {
    return this.disbursementService.refundV2(refundDto, req.user);
  }

  // Get Refund Status
  @Get('refund/:referenceId')
  @ApiOperation({ summary: 'Get Refund Status', description: 'Get the status of a refund.' })
  @ApiParam({ name: 'referenceId', description: 'UUID of refund transaction.', example: 'b7e6c8e2-1234-4c8a-9b2e-abcdef123456' })
  @ApiResponse({ status: 200, type: TransferResultDto, schema: { example: {
    amount: '1000',
    currency: 'UGX',
    financialTransactionId: '987654321',
    externalId: '123456789',
    payee: { partyIdType: 'MSISDN', partyId: '256772123456' },
    payerMessage: 'Refund for failed transaction',
    payeeNote: 'Sorry for the inconvenience',
    status: 'SUCCESSFUL',
    reason: { code: '00', message: 'Success' },
  } } })
  async getRefundStatus(@Param('referenceId') referenceId: string, @Req() req: any): Promise<TransferResultDto> {
    return this.disbursementService.getRefundStatus(referenceId, req.user);
  }

  // Get Account Balance in Specific Currency
  @Get('balance/:currency')
  @ApiOperation({ summary: 'Get Account Balance in Specific Currency', description: 'Get the balance of own account in a specific currency.' })
  @ApiParam({ name: 'currency', description: 'Currency code (ISO4217)', example: 'UGX' })
  @ApiResponse({ status: 200, description: 'OK', schema: { example: { balance: '50000', currency: 'UGX' } } })
  async getAccountBalanceInCurrency(@Param('currency') currency: string, @Req() req: any) {
    return this.disbursementService.getAccountBalanceInCurrency(currency, req.user);
  }

  // OAuth2 Token
  @Post('oauth2/token')
  @ApiOperation({ summary: 'Create OAuth2 Token', description: 'Create an OAuth2 token for consented scopes.' })
  @ApiBody({
    schema: {
      example: {
        grant_type: 'client_credentials',
        scope: 'disbursement',
        client_id: 'your-client-id',
        client_secret: 'your-client-secret',
      },
    },
    type: Object,
  })
  @ApiResponse({ status: 200, description: 'OAuth2 token created', schema: { example: { access_token: 'string', token_type: 'Bearer', expires_in: 3600 } } })
  async createOauth2Token(@Body() body: any, @Req() req: any) {
    return this.disbursementService.createOauth2Token(body, req.user);
  }

  // Get User Info With Consent
  @Get('oauth2/userinfo')
  @ApiOperation({ summary: 'Get User Info With Consent', description: 'Get user info with consented scopes.' })
  @ApiResponse({ status: 200, description: 'User info returned' })
  async getUserInfoWithConsent(@Req() req: any) {
    return this.disbursementService.getUserInfoWithConsent(req.user);
  }
}
