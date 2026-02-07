import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { AirtelAuthService } from '../auth/airtel-auth.service';
import { AirtelSigningService } from '../signing/airtel-signing.service';
import { AirtelDisbursementRequestDto, AirtelDisbursementResponse } from '../dto/airtel-payment.dto';

/**
 * Airtel Disbursement Service
 * Handles payout/money-out operations to Airtel Money wallets
 *
 * API Reference:
 * - Endpoint: POST /standard/v3/disbursements
 * - Authentication: OAuth2 Bearer token (x-auth-token header)
 * - Signing: HMAC-SHA256 (x-signature header)
 * - Encryption: RSA-OAEP for PIN (x-key header)
 */
@Injectable()
export class AirtelDisbursementService {
  private readonly logger = new Logger(AirtelDisbursementService.name);
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(
    private readonly authService: AirtelAuthService,
    private readonly signingService: AirtelSigningService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('airtel.disbursement.baseUrl', '');
    this.clientId = this.configService.get<string>('airtel.clientId', '');
    this.clientSecret = this.configService.get<string>('airtel.clientSecret', '');

    if (!this.baseUrl) {
      this.logger.warn('Airtel disbursement base URL not configured');
    }
  }

  /**
   * Create a disbursement (money-out) transaction
   * Sends money to a customer's Airtel Money wallet
   *
   * @param request Disbursement request with encrypted PIN
   * @returns Disbursement response from Airtel
   * @throws BadRequestException if input validation fails
   * @throws InternalServerErrorException if API call fails
   */
  async createDisbursement(
    request: AirtelDisbursementRequestDto,
  ): Promise<AirtelDisbursementResponse> {
    try {
      // Validate input
      this.validateDisbursementRequest(request);

      // Get OAuth2 access token
      const accessToken = await this.authService.getAccessToken();
      if (!accessToken) {
        throw new InternalServerErrorException(
          'Failed to obtain Airtel authentication token',
        );
      }

      // Generate message signature
      const signature = this.signingService.generateSignature(request);

      // Generate encrypted key
      const encryptedKey = this.signingService.generateEncryptedKey();

      // Build request headers
      const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'x-signature': signature,
        'x-key': encryptedKey,
        'Content-Type': 'application/json',
      };

      // Log request (sanitized - no PIN)
      const sanitizedRequest = { ...request, pin: '****' };
      this.logger.debug(
        `Creating Airtel disbursement for ${request.subscriber.msisdn}`,
        { request: sanitizedRequest },
      );

      // Make HTTP POST request
      const endpoint = `${this.baseUrl}/standard/v3/disbursements`;
      const response = await lastValueFrom(
        this.httpService.post(endpoint, request, {
          headers,
          timeout: 30000, // 30 second timeout
        }),
      );

      this.logger.debug('Airtel disbursement response received', {
        statusCode: response.status,
        data: response.data,
      });

      return response.data as AirtelDisbursementResponse;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Query disbursement status
   * Polls Airtel for current status of a disbursement transaction
   *
   * @param transactionId Partner transaction ID
   * @returns Current disbursement status
   * @throws InternalServerErrorException if API call fails
   */
  async queryDisbursementStatus(transactionId: string): Promise<any> {
    try {
      this.logger.debug(`Querying disbursement status for ${transactionId}`);

      // Get OAuth2 access token
      const accessToken = await this.authService.getAccessToken();
      if (!accessToken) {
        throw new InternalServerErrorException(
          'Failed to obtain Airtel authentication token',
        );
      }

      // Build request headers
      const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      };

      // Make HTTP GET request to query endpoint
      const endpoint = `${this.baseUrl}/standard/v3/disbursements/${transactionId}`;
      const response = await lastValueFrom(
        this.httpService.get(endpoint, {
          headers,
          timeout: 15000, // 15 second timeout
        }),
      );

      this.logger.debug('Disbursement status query response', {
        transactionId,
        statusCode: response.status,
        data: response.data,
      });

      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Request disbursement refund
   * Reverses a completed disbursement transaction
   *
   * @param refundRequest Refund request with original transaction details
   * @returns Refund response
   * @throws InternalServerErrorException if API call fails
   */
  async refundDisbursement(refundRequest: any): Promise<any> {
    try {
      this.logger.debug('Requesting disbursement refund', {
        reference: refundRequest.reference,
      });

      // Get OAuth2 access token
      const accessToken = await this.authService.getAccessToken();
      if (!accessToken) {
        throw new InternalServerErrorException(
          'Failed to obtain Airtel authentication token',
        );
      }

      // Generate message signature
      const signature = this.signingService.generateSignature(refundRequest);

      // Generate encrypted key
      const encryptedKey = this.signingService.generateEncryptedKey();

      // Build request headers
      const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'x-signature': signature,
        'x-key': encryptedKey,
        'Content-Type': 'application/json',
      };

      // Make HTTP POST request to refund endpoint
      const endpoint = `${this.baseUrl}/standard/v3/disbursements/refund`;
      const response = await lastValueFrom(
        this.httpService.post(endpoint, refundRequest, {
          headers,
          timeout: 30000,
        }),
      );

      this.logger.debug('Disbursement refund response received', {
        statusCode: response.status,
        data: response.data,
      });

      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Validate disbursement request structure
   * Ensures required fields are present and properly formatted
   *
   * @param request Disbursement request
   * @throws BadRequestException if validation fails
   */
  private validateDisbursementRequest(request: AirtelDisbursementRequestDto): void {
    // Validate required fields
    const requiredFields = [
      'reference',
      'subscriber',
      'transaction',
      'pin',
    ];

    for (const field of requiredFields) {
      const value = (request as any)[field];
      if (!value) {
        throw new BadRequestException(
          `Missing required field: ${field}`,
        );
      }
    }

    // Validate subscriber
    if (!request.subscriber.msisdn || !request.subscriber.country) {
      throw new BadRequestException(
        'Subscriber must have msisdn and country',
      );
    }

    // Validate transaction
    if (
      !request.transaction.id ||
      !request.transaction.amount ||
      request.transaction.amount <= 0
    ) {
      throw new BadRequestException(
        'Transaction must have id, amount > 0',
      );
    }

    // Validate PIN format (should be encrypted at this point)
    if (typeof request.pin !== 'string' || request.pin.length === 0) {
      throw new BadRequestException('PIN must be a non-empty string');
    }
  }

  /**
   * Handle API errors and map to appropriate exceptions
   * @param error Error from Axios or other source
   * @throws BadRequestException for validation errors
   * @throws InternalServerErrorException for API/network errors
   */
  private handleError(error: any): never {
    if (error instanceof BadRequestException) {
      throw error;
    }

    const axiosError = error as AxiosError<any>;

    if (axiosError.response) {
      // Airtel API returned an error response
      const statusCode = axiosError.response.status;
      const errorData = axiosError.response.data;

      const errorMessage = errorData?.status?.message ||
        errorData?.message ||
        'Airtel API error';

      const errorCode = errorData?.status?.response_code ||
        errorData?.status?.code ||
        'UNKNOWN_ERROR';

      this.logger.error(
        `Airtel API error (${statusCode}): ${errorMessage}`,
        {
          statusCode,
          errorCode,
          response: errorData,
        },
      );

      throw new InternalServerErrorException({
        message: errorMessage,
        code: errorCode,
        statusCode,
      });
    } else if (axiosError.request) {
      // Request was made but no response received
      this.logger.error('No response from Airtel API', {
        error: axiosError.message,
      });

      throw new InternalServerErrorException(
        'No response from Airtel API - request may have timed out',
      );
    } else {
      // Error in request setup
      this.logger.error('Error setting up Airtel API request', {
        error: axiosError.message,
      });

      throw new InternalServerErrorException(
        'Failed to set up Airtel API request',
      );
    }
  }
}
