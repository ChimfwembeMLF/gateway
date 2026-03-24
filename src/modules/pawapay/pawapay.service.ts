import { DepositViaPaymentPageDto } from './dtos/deposit-via-payment-page.dto';
import { ProviderAvailabilityDto } from './dtos/provider-availability.dto';
import { ActiveConfigurationDto } from './dtos/active-configuration.dto';
import { PredictProviderDto } from './dtos/predict-provider.dto';
import { PublicKeysDto } from './dtos/public-keys.dto';
import { WalletBalancesDto } from './dtos/wallet-balances.dto';
import { DepositViaPaymentPageResponseDto } from './dtos/responses/deposit-via-payment-page-response.dto';
import { ProviderAvailabilityResponseDto } from './dtos/responses/provider-availability-response.dto';
import { ActiveConfigurationResponseDto } from './dtos/responses/active-configuration-response.dto';
import { PredictProviderResponseDto } from './dtos/responses/predict-provider-response.dto';
import { PublicKeysResponseDto } from './dtos/responses/public-keys-response.dto';
import { WalletBalancesResponseDto } from './dtos/responses/wallet-balances-response.dto';
import { InitiateRefundDto } from './dtos/initiate-refund.dto';
import { CheckRefundStatusDto } from './dtos/check-refund-status.dto';
import { ResendRefundCallbackDto } from './dtos/resend-refund-callback.dto';
import { InitiateRefundResponseDto } from './dtos/responses/initiate-refund-response.dto';
import { CheckRefundStatusResponseDto } from './dtos/responses/check-refund-status-response.dto';
import { ResendRefundCallbackResponseDto } from './dtos/responses/resend-refund-callback-response.dto';
import { InitiateDepositDto } from './dtos/initiate-deposit.dto';
import { CheckDepositStatusDto } from './dtos/check-deposit-status.dto';
import { ResendDepositCallbackDto } from './dtos/resend-deposit-callback.dto';
import { InitiateDepositResponseDto } from './dtos/responses/initiate-deposit-response.dto';
import { CheckDepositStatusResponseDto } from './dtos/responses/check-deposit-status-response.dto';
import { ResendDepositCallbackResponseDto } from './dtos/responses/resend-deposit-callback-response.dto';
import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { InitiatePayoutDto } from './dtos/initiate-payout.dto';
import { InitiateBulkPayoutsDto } from './dtos/initiate-bulk-payouts.dto';
import { CheckPayoutStatusDto } from './dtos/check-payout-status.dto';
import { ResendPayoutCallbackDto } from './dtos/resend-payout-callback.dto';
import { CancelEnqueuedPayoutDto } from './dtos/cancel-enqueued-payout.dto';
import { InitiatePayoutResponseDto } from './dtos/responses/initiate-payout-response.dto';
import { InitiateBulkPayoutsResponseDto } from './dtos/responses/initiate-bulk-payouts-response.dto';
import { CheckPayoutStatusResponseDto } from './dtos/responses/check-payout-status-response.dto';
import { ResendPayoutCallbackResponseDto } from './dtos/responses/resend-payout-callback-response.dto';
import { CancelEnqueuedPayoutResponseDto } from './dtos/responses/cancel-enqueued-payout-response.dto';

@Injectable()
export class PawapayService {
    private readonly logger = new Logger(PawapayService.name);

    constructor(private readonly configService: ConfigService) { }

    async initiatePayout(payload: InitiatePayoutDto): Promise<any> {
        const pawapayUrl = this.configService.get<string>('pawapay.base_url');
        const pawapayApiKey = this.configService.get<string>('pawapay.api_key');
        this.logger.debug('[pawapayUrl]', pawapayUrl);
        this.logger.debug('[pawapayApiKey]', pawapayApiKey);
        if (!pawapayUrl || !pawapayApiKey) {
            throw new InternalServerErrorException('pawaPay base URL or API Key not configured');
        }
        try {
            const response = await axios.post(`${pawapayUrl}/payouts`, payload, {
                headers: {
                    'Authorization': `Bearer ${pawapayApiKey}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });
            return response.data;
        } catch (error) {
            this.logger.error('pawaPay initiatePayout error', error?.response?.data || error.message);
            // Extract failure code/message if present
            const failureCode = error?.response?.data?.failureCode;
            const failureMessage = error?.response?.data?.failureMessage || error?.response?.data?.message;
            if (failureCode) {
                throw new InternalServerErrorException(`pawaPay error [${failureCode}]: ${failureMessage || 'No message provided.'}`);
            }
            throw new InternalServerErrorException('Failed to initiate payout with pawaPay');
        }
    }

    async initiateBulkPayouts(payload: InitiateBulkPayoutsDto): Promise<any> {
        const pawapayUrl = this.configService.get<string>('pawapay.base_url');
        const pawapayApiKey = this.configService.get<string>('pawapay.api_key');
        if (!pawapayUrl || !pawapayApiKey) {
            throw new InternalServerErrorException('pawaPay base URL or API Key not configured');
        }
        try {
            const response = await axios.post(`${pawapayUrl}/bulk-payouts`, payload, {
                headers: { 'Authorization': `Bearer ${pawapayApiKey}` },
            });
            return response.data;
        } catch (error) {
            this.logger.error('pawaPay initiateBulkPayouts error', error?.response?.data || error.message);
            const failureCode = error?.response?.data?.failureCode;
            const failureMessage = error?.response?.data?.failureMessage || error?.response?.data?.message;
            if (failureCode) {
                throw new InternalServerErrorException(`pawaPay error [${failureCode}]: ${failureMessage || 'No message provided.'}`);
            }
            throw new InternalServerErrorException('Failed to initiate bulk payouts with pawaPay');
        }
    }

    async checkPayoutStatus(payload: CheckPayoutStatusDto): Promise<any> {
        const pawapayUrl = this.configService.get<string>('pawapay.base_url');
        const pawapayApiKey = this.configService.get<string>('pawapay.api_key');
        if (!pawapayUrl || !pawapayApiKey) {
            throw new InternalServerErrorException('pawaPay base URL or API Key not configured');
        }
        try {
            const response = await axios.get(`${pawapayUrl}/payouts/${payload.payoutId}`, {
                headers: { 'Authorization': `Bearer ${pawapayApiKey}` },
            });
            return response.data;
        } catch (error) {
            this.logger.error('pawaPay checkPayoutStatus error', error?.response?.data || error.message);
            const failureCode = error?.response?.data?.failureCode;
            const failureMessage = error?.response?.data?.failureMessage || error?.response?.data?.message;
            if (failureCode) {
                throw new InternalServerErrorException(`pawaPay error [${failureCode}]: ${failureMessage || 'No message provided.'}`);
            }
            throw new InternalServerErrorException('Failed to check payout status with pawaPay');
        }
    }

    async resendPayoutCallback(payload: ResendPayoutCallbackDto): Promise<any> {
        const pawapayUrl = this.configService.get<string>('pawapay.base_url');
        const pawapayApiKey = this.configService.get<string>('pawapay.api_key');
        if (!pawapayUrl || !pawapayApiKey) {
            throw new InternalServerErrorException('pawaPay base URL or API Key not configured');
        }
        try {
            const response = await axios.post(`${pawapayUrl}/payouts/${payload.payoutId}/resend-callback`, {}, {
                headers: { 'Authorization': `Bearer ${pawapayApiKey}` },
            });
            return response.data;
        } catch (error) {
            if (error?.response) {
                this.logger.error('pawaPay resendPayoutCallback error (status):', error.response.status);
                this.logger.error('pawaPay resendPayoutCallback error (headers):', JSON.stringify(error.response.headers, null, 2));
                this.logger.error('pawaPay resendPayoutCallback error (data):', JSON.stringify(error.response.data, null, 2));
            } else {
                this.logger.error('pawaPay resendPayoutCallback error (raw):', error.message);
            }
            const failureCode = error?.response?.data?.failureCode;
            const failureMessage = error?.response?.data?.failureMessage || error?.response?.data?.message;
            if (failureCode) {
                throw new InternalServerErrorException(`pawaPay error [${failureCode}]: ${failureMessage || 'No message provided.'}`);
            }
            throw new InternalServerErrorException('Failed to resend payout callback with pawaPay');
        }
    }

    async initiateRefund(payload: InitiateRefundDto): Promise<any> {
        const pawapayUrl = this.configService.get<string>('pawapay.base_url');
        const pawapayApiKey = this.configService.get<string>('pawapay.api_key');
        if (!pawapayUrl || !pawapayApiKey) {
            throw new InternalServerErrorException('pawaPay base URL or API Key not configured');
        }
        try {
            const response = await axios.post(`${pawapayUrl}/refunds`, payload, {
                headers: { 'Authorization': `Bearer ${pawapayApiKey}` },
            });
            return response.data;
        } catch (error) {
            this.logger.error('pawaPay initiateRefund error', error?.response?.data || error.message);
            const failureCode = error?.response?.data?.failureCode;
            const failureMessage = error?.response?.data?.failureMessage || error?.response?.data?.message;
            if (failureCode) {
                throw new InternalServerErrorException(`pawaPay error [${failureCode}]: ${failureMessage || 'No message provided.'}`);
            }
            throw new InternalServerErrorException('Failed to initiate refund with pawaPay');
        }
    }
    async resendDepositCallback(payload: ResendDepositCallbackDto): Promise<any> {
        const pawapayUrl = this.configService.get<string>('pawapay.base_url');
        const pawapayApiKey = this.configService.get<string>('pawapay.api_key');
        if (!pawapayUrl || !pawapayApiKey) {
            throw new InternalServerErrorException('pawaPay base URL or API Key not configured');
        }
        try {
            const response = await axios.post(`${pawapayUrl}/deposits/${payload.depositId}/resend-callback`, {}, {
                headers: 
                { 
                    'Authorization': `Bearer ${pawapayApiKey}`,
                    'Accept': 'application/json',
                },
            });
            return response.data;
        } catch (error) {
            this.logger.error('pawaPay resendDepositCallback error', error?.response?.data || error.message);
            throw new InternalServerErrorException('Failed to resend deposit callback with pawaPay');
        }
    }
    async checkDepositStatus(payload: CheckDepositStatusDto): Promise<any> {
        const pawapayUrl = this.configService.get<string>('pawapay.base_url');
        const pawapayApiKey = this.configService.get<string>('pawapay.api_key');
        if (!pawapayUrl || !pawapayApiKey) {
            throw new InternalServerErrorException('pawaPay base URL or API Key not configured');
        }
        try {
            const response = await axios.get(`${pawapayUrl}/deposits/${payload.depositId}`, {
                headers: {
                    'Authorization': `Bearer ${pawapayApiKey}`,
                    'Accept': 'application/json',
                },
            });
            return response.data;
        } catch (error) {
            this.logger.error('pawaPay checkDepositStatus error', error?.response?.data || error.message);
            throw new InternalServerErrorException('Failed to check deposit status with pawaPay');
        }
    }
    async initiateDeposit(payload: InitiateDepositDto): Promise<any> {
        const pawapayUrl = this.configService.get<string>('pawapay.base_url');
        const pawapayApiKey = this.configService.get<string>('pawapay.api_key');

          this.logger.debug('[pawapayUrl]', pawapayUrl);
        this.logger.debug('[pawapayApiKey]', pawapayApiKey);
        
        if (!pawapayUrl || !pawapayApiKey) {
            throw new InternalServerErrorException('pawaPay base URL or API Key not configured');
        }
        try {
            const response = await axios.post(`${pawapayUrl}/deposits`, payload, {
                headers: { 'Authorization': `Bearer ${pawapayApiKey}` },
            });
            return response.data;
        } catch (error) {
            this.logger.error('pawaPay initiateDeposit error', error?.response?.data || error.message);
            throw new InternalServerErrorException('Failed to initiate deposit with pawaPay');
        }
    }
    async cancelEnqueuedPayout(payload: CancelEnqueuedPayoutDto): Promise<any> {
        const pawapayUrl = this.configService.get<string>('pawapay.base_url');
        const pawapayApiKey = this.configService.get<string>('pawapay.api_key');
        if (!pawapayUrl || !pawapayApiKey) {
            throw new InternalServerErrorException('pawaPay base URL or API Key not configured');
        }
        try {
            const response = await axios.post(`${pawapayUrl}/payouts/${payload.payoutId}/cancel`, {}, {
                headers: { 'Authorization': `Bearer ${pawapayApiKey}` },
            });
            return response.data;
        } catch (error) {
            this.logger.error('pawaPay cancelEnqueuedPayout error', error?.response?.data || error.message);
            throw new InternalServerErrorException('Failed to cancel enqueued payout with pawaPay');
        }
    }

    async checkRefundStatus(payload: CheckRefundStatusDto): Promise<any> {
        const pawapayUrl = this.configService.get<string>('pawapay.base_url');
        const pawapayApiKey = this.configService.get<string>('pawapay.api_key');
        if (!pawapayUrl || !pawapayApiKey) {
            throw new InternalServerErrorException('pawaPay base URL or API Key not configured');
        }
        try {
            const response = await axios.get(`${pawapayUrl}/refunds/${payload.refundId}`, {
                headers: 
                { 
                    'Authorization': `Bearer ${pawapayApiKey}`,
                    'Accept': 'application/json',
                },
            });
            return response.data;
        } catch (error) {
            this.logger.error('pawaPay checkRefundStatus error', error?.response?.data || error.message);
            throw new InternalServerErrorException('Failed to check refund status with pawaPay');
        }
    }

    async resendRefundCallback(payload: ResendRefundCallbackDto): Promise<any> {
        const pawapayUrl = this.configService.get<string>('pawapay.base_url');
        const pawapayApiKey = this.configService.get<string>('pawapay.api_key');
        if (!pawapayUrl || !pawapayApiKey) {
            throw new InternalServerErrorException('pawaPay base URL or API Key not configured');
        }
        try {
            const response = await axios.post(`${pawapayUrl}/refunds/${payload.refundId}/resend-callback`, {}, {
                headers: { 'Authorization': `Bearer ${pawapayApiKey}` },
            });
            return response.data;
        } catch (error) {
            this.logger.error('pawaPay resendRefundCallback error', error?.response?.data || error.message);
            throw new InternalServerErrorException('Failed to resend refund callback with pawaPay');
        }
    }

    async depositViaPaymentPage(payload: DepositViaPaymentPageDto): Promise<any> {
        const pawapayUrl = this.configService.get<string>('pawapay.base_url');
        const pawapayApiKey = this.configService.get<string>('pawapay.api_key');
        if (!pawapayUrl || !pawapayApiKey) {
            throw new InternalServerErrorException('pawaPay base URL or API Key not configured');
        }
        // Convert metadata array to object if needed
        let payloadToSend = { ...payload };
        if (Array.isArray(payload.metadata)) {
            payloadToSend = {
                ...payload,
                metadata: Object.assign({}, ...payload.metadata)
            };
        }
        this.logger.log('pawaPay depositViaPaymentPage outgoing payload', JSON.stringify(payloadToSend));
        try {
            const response = await axios.post(`${pawapayUrl}/v2/paymentpage`, payloadToSend, {
                headers: { 'Authorization': `Bearer ${pawapayApiKey}` },
            });
            this.logger.log('pawaPay depositViaPaymentPage response', JSON.stringify(response.data));
            return response.data;
        } catch (error) {
            this.logger.error('pawaPay depositViaPaymentPage error', error?.response?.data || error.message);
            if (error?.response) {
                this.logger.error('pawaPay depositViaPaymentPage error response', JSON.stringify(error.response.data));
            }
            throw new InternalServerErrorException('Failed to deposit via payment page with pawaPay');
        }
    }

    async providerAvailability(payload: ProviderAvailabilityDto): Promise<any> {
        const pawapayUrl = this.configService.get<string>('pawapay.base_url');
        const pawapayApiKey = this.configService.get<string>('pawapay.api_key');
        if (!pawapayUrl || !pawapayApiKey) {
            throw new InternalServerErrorException('pawaPay base URL or API Key not configured');
        }
        try {
            const response = await axios.get(`${pawapayUrl}/provider-availability`, {
                headers: { 'Authorization': `Bearer ${pawapayApiKey}` },
            });
            return response.data;
        } catch (error) {
            this.logger.error('pawaPay providerAvailability error', error?.response?.data || error.message);
            throw new InternalServerErrorException('Failed to get provider availability from pawaPay');
        }
    }

    async activeConfiguration(payload: ActiveConfigurationDto): Promise<any> {
        const pawapayUrl = this.configService.get<string>('pawapay.base_url');
        const pawapayApiKey = this.configService.get<string>('pawapay.api_key');
        if (!pawapayUrl || !pawapayApiKey) {
            throw new InternalServerErrorException('pawaPay base URL or API Key not configured');
        }
        try {
            const response = await axios.get(`${pawapayUrl}/active-configuration`, {
                headers: { 'Authorization': `Bearer ${pawapayApiKey}` },
            });
            return response.data;
        } catch (error) {
            this.logger.error('pawaPay activeConfiguration error', error?.response?.data || error.message);
            throw new InternalServerErrorException('Failed to get active configuration from pawaPay');
        }
    }

    async predictProvider(payload: PredictProviderDto): Promise<any> {
        const pawapayUrl = this.configService.get<string>('pawapay.base_url');
        const pawapayApiKey = this.configService.get<string>('pawapay.api_key');
        if (!pawapayUrl || !pawapayApiKey) {
            throw new InternalServerErrorException('pawaPay base URL or API Key not configured');
        }
        try {
            const response = await axios.post(`${pawapayUrl}/predict-provider`, payload, {
                headers: { 'Authorization': `Bearer ${pawapayApiKey}` },
            });
            return response.data;
        } catch (error) {
            this.logger.error('pawaPay predictProvider error', error?.response?.data || error.message);
            throw new InternalServerErrorException('Failed to predict provider with pawaPay');
        }
    }

    async publicKeys(payload: PublicKeysDto): Promise<any> {
        const pawapayUrl = this.configService.get<string>('pawapay.base_url');
        const pawapayApiKey = this.configService.get<string>('pawapay.api_key');
        if (!pawapayUrl || !pawapayApiKey) {
            throw new InternalServerErrorException('pawaPay base URL or API Key not configured');
        }
        try {
            const response = await axios.get(`${pawapayUrl}/public-keys`, {
                headers: { 'Authorization': `Bearer ${pawapayApiKey}` },
            });
            return response.data;
        } catch (error) {
            this.logger.error('pawaPay publicKeys error', error?.response?.data || error.message);
            throw new InternalServerErrorException('Failed to get public keys from pawaPay');
        }
    }

    async walletBalances(payload: WalletBalancesDto): Promise<any> {
        const pawapayUrl = this.configService.get<string>('pawapay.base_url');
        const pawapayApiKey = this.configService.get<string>('pawapay.api_key');
        if (!pawapayUrl || !pawapayApiKey) {
            throw new InternalServerErrorException('pawaPay base URL or API Key not configured');
        }
        try {
            const response = await axios.get(`${pawapayUrl}/wallet-balances`, {
                headers: { 'Authorization': `Bearer ${pawapayApiKey}` },
            });
            return response.data;
        } catch (error) {
            this.logger.error('pawaPay walletBalances error', error?.response?.data || error.message);
            throw new InternalServerErrorException('Failed to get wallet balances from pawaPay');
        }
    }
}
