
import {
  Controller, Get, Post, Body, Req, Param, BadRequestException, Logger,
} from '@nestjs/common';
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import { TenantService } from '../../modules/tenant/tenant.service';
import { PaymentsService } from '../payments/payments.service';
import { RoleType } from '../../common/enums/role-type.enum';
import { Auth } from 'src/common/decorators/auth.decorator';
import { DisbursementsService } from '../disbursements/disbursements.service';

@ApiTags('Admin Dashboard')
@Controller('api/v1/admin/dashboard')
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(
    private readonly tenantService: TenantService,
    private readonly paymentsService: PaymentsService,
    private readonly disbursementService: DisbursementsService,
  ) { }

  private async getTenantId(req: any): Promise<string> {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new BadRequestException('Missing tenant ID');
    const tenant = await this.tenantService.findOne(tenantId);
    if (!tenant) throw new BadRequestException('Tenant not found');
    return tenantId;
  }

  @Get('payments')
  @Auth([RoleType.ADMIN, RoleType.USER, RoleType.SUPER_ADMIN])
  @ApiResponse({ status: 200, description: 'Get all payments for the tenant.' })
  async getPayments(@Req() req: any) {
    return this.paymentsService.findAllByTenant(await this.getTenantId(req));
  }

  @Post('payments')
  @Auth([RoleType.ADMIN, RoleType.USER, RoleType.SUPER_ADMIN])
  async createPayment(@Body() dto: any, @Req() req: any) {
    const tenantId = await this.getTenantId(req);
    return this.paymentsService.create({ ...dto, tenantId }, req.user);
  }


  @Get('payments/payouts')
  @Auth([RoleType.SUPER_ADMIN, RoleType.ADMIN])
  payouts(@Req() req: any) {
    return this.disbursementService.findAll({}, req);
  }

  @Get('payments/payouts/:id')
  @Auth([RoleType.SUPER_ADMIN, RoleType.ADMIN])
  async getPayoutById(@Param('id') id: string, @Req() req: any) {
    return this.disbursementService.getById(id, req);
  }

  @Get('payments/:id')
  @Auth([RoleType.ADMIN, RoleType.USER, RoleType.SUPER_ADMIN])
  async getPaymentById(@Param('id') id: string, @Req() req: any) {
    return this.paymentsService.findOne(id, await this.getTenantId(req));
  }

  @Get('payments/status/:id')
  @Auth([RoleType.ADMIN, RoleType.USER, RoleType.SUPER_ADMIN])
  async getPaymentStatus(@Param('id') id: string, @Req() req: any) {
    return this.paymentsService.getPaymentStatus(id, await this.getTenantId(req), 'pawaPay', req.user);
  }

  @Get('payments/balance/available')
  @Auth([RoleType.ADMIN, RoleType.USER, RoleType.SUPER_ADMIN])
  async getBalance(@Req() req: any) {
    return this.paymentsService.getBalance(await this.getTenantId(req), 'pawaPay', req.user);
  }

  @Post('payments/payout')
  @Auth([RoleType.SUPER_ADMIN, RoleType.ADMIN])
  payout(@Body() dto: any, @Req() req: any) { return this.disbursementService.create(dto, req.user); }

  @Post('payments/bulk-payouts')
  @Auth([RoleType.SUPER_ADMIN, RoleType.ADMIN])
  initiateBulkPayouts(@Body() dto: any) { return this.paymentsService.initiateBulkPayouts(dto); }

  @Post('payments/payout-status')
  @Auth([RoleType.SUPER_ADMIN, RoleType.ADMIN])
  checkPayoutStatus(@Body() dto: any) { return this.paymentsService.checkPayoutStatus(dto); }

  @Post('payments/payout-resend-callback')
  @Auth([RoleType.SUPER_ADMIN, RoleType.ADMIN])
  resendPayoutCallback(@Body() dto: any) { return this.paymentsService.resendPayoutCallback(dto); }

  @Post('payments/payout-cancel')
  @Auth([RoleType.SUPER_ADMIN, RoleType.ADMIN])
  cancelEnqueuedPayout(@Body() dto: any) { return this.paymentsService.cancelEnqueuedPayout(dto); }

  @Post('payments/deposit')
  @Auth([RoleType.SUPER_ADMIN, RoleType.ADMIN])
  initiateDeposit(@Body() dto: any) { return this.paymentsService.initiateDeposit(dto); }

  @Post('payments/deposit-status')
  @Auth([RoleType.SUPER_ADMIN, RoleType.ADMIN])
  checkDepositStatus(@Body() dto: any) { return this.paymentsService.checkDepositStatus(dto); }

  @Post('payments/deposit-resend-callback')
  @Auth([RoleType.SUPER_ADMIN, RoleType.ADMIN])
  resendDepositCallback(@Body() dto: any) { return this.paymentsService.resendDepositCallback(dto); }

  @Post('payments/refund')
  @Auth([RoleType.SUPER_ADMIN, RoleType.ADMIN])
  initiateRefund(@Body() dto: any) { return this.paymentsService.initiateRefund(dto); }

  @Post('payments/refund-status')
  @Auth([RoleType.SUPER_ADMIN, RoleType.ADMIN])
  checkRefundStatus(@Body() dto: any) { return this.paymentsService.checkRefundStatus(dto); }

  @Post('payments/refund-resend-callback')
  @Auth([RoleType.SUPER_ADMIN, RoleType.ADMIN])
  resendRefundCallback(@Body() dto: any) { return this.paymentsService.resendRefundCallback(dto); }

  @Post('payments/payment-page')
  @Auth([RoleType.SUPER_ADMIN, RoleType.ADMIN])
  depositViaPaymentPage(@Body() dto: any) {
    console.log('[DashboardController] /payments/payment-page incoming payload:', JSON.stringify(dto));
    return this.paymentsService.depositViaPaymentPage(dto);
  }

  @Post('payments/provider-availability')
  @Auth([RoleType.SUPER_ADMIN, RoleType.ADMIN])
  providerAvailability(@Body() dto: any) { return this.paymentsService.providerAvailability(dto); }

  @Post('payments/active-configuration')
  @Auth([RoleType.SUPER_ADMIN, RoleType.ADMIN])
  activeConfiguration(@Body() dto: any) { return this.paymentsService.activeConfiguration(dto); }

  @Post('payments/predict-provider')
  @Auth([RoleType.SUPER_ADMIN, RoleType.ADMIN])
  predictProvider(@Body() dto: any) { return this.paymentsService.predictProvider(dto); }

  @Post('payments/public-keys')
  @Auth([RoleType.SUPER_ADMIN, RoleType.ADMIN])
  publicKeys(@Body() dto: any) { return this.paymentsService.publicKeys(dto); }

  @Post('payments/wallet-balances')
  @Auth([RoleType.SUPER_ADMIN, RoleType.ADMIN])
  walletBalances(@Body() dto: any) { return this.paymentsService.walletBalances(dto); }
}