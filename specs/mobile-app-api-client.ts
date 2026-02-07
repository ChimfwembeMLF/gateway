/**
 * Payment Gateway API Client
 * TypeScript client library for mobile app integration
 * 
 * Usage:
 * ```typescript
 * const client = new PaymentGatewayClient({
 *   baseUrl: 'https://api.paymentgateway.local/api/v1',
 *   apiKey: 'your-api-key',
 *   tenantId: 'your-tenant-id'
 * });
 * 
 * // Login
 * const authResponse = await client.auth.login({
 *   email: 'user@example.com',
 *   password: 'password'
 * });
 * 
 * // Create payment
 * const payment = await client.payments.create({
 *   amount: 100.50,
 *   currency: 'ZMW',
 *   phoneNumber: '+260971234567',
 *   externalId: 'INV-2024-001'
 * });
 * ```
 */

export enum PaymentProvider {
  MTN = 'mtn',
  AIRTEL = 'airtel',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
}

export enum DisbursementStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum KycStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  NEEDS_UPDATE = 'NEEDS_UPDATE',
}

export interface ClientConfig {
  baseUrl: string;
  apiKey?: string;
  tenantId?: string;
  timeout?: number;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    accessToken: string;
    refreshToken: string;
    user: User;
  };
  message?: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  tenantId?: string;
}

export interface CreatePaymentDto {
  amount: number;
  currency: string;
  phoneNumber: string;
  externalId: string;
  description?: string;
  provider?: PaymentProvider;
  customerName?: string;
  metadata?: Record<string, any>;
}

export interface Payment {
  id: string;
  tenantId: string;
  externalId: string;
  amount: number;
  currency: string;
  phoneNumber: string;
  description?: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  transactionId?: string;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface PaymentStatusResponse {
  id: string;
  status: PaymentStatus;
  transactionId?: string;
  provider: PaymentProvider;
  amount: number;
  currency: string;
  timestamp: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface BalanceResponse {
  success: boolean;
  data?: {
    balance: number;
    currency: string;
    provider: PaymentProvider;
    lastUpdated: string;
  };
}

export interface CreateDisbursementDto {
  amount: number;
  currency: string;
  phoneNumber: string;
  externalId: string;
  description?: string;
  provider?: PaymentProvider;
  recipientName?: string;
  metadata?: Record<string, any>;
}

export interface Disbursement {
  id: string;
  tenantId: string;
  externalId: string;
  amount: number;
  currency: string;
  phoneNumber: string;
  description?: string;
  provider: PaymentProvider;
  status: DisbursementStatus;
  transactionId?: string;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface MerchantConfiguration {
  id: string;
  tenantId: string;
  businessName: string;
  businessRegistrationNumber?: string;
  businessCategory?: string;
  contactPersonName?: string;
  contactPersonEmail?: string;
  contactPersonPhone?: string;
  websiteUrl?: string;
  mtnAccountActive: boolean;
  mtnLastVerified?: string;
  airtelAccountActive: boolean;
  airtelLastVerified?: string;
  bankAccountVerified: boolean;
  bankName?: string;
  bankAccountType?: string;
  kycStatus: KycStatus;
  maxDailyCollections: number;
  maxDailyDisbursementAmount?: number;
  maxTransactionAmount?: number;
  webhookEnabled: boolean;
  webhookUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateMerchantConfigurationDto {
  businessName?: string;
  businessCategory?: string;
  contactPersonName?: string;
  contactPersonEmail?: string;
  contactPersonPhone?: string;
  websiteUrl?: string;
  webhookUrl?: string;
  webhookEnabled?: boolean;
  maxDailyCollections?: number;
  maxDailyDisbursementAmount?: number;
  maxTransactionAmount?: number;
  notes?: string;
}

export interface VerificationResponse {
  success: boolean;
  message: string;
  verified: boolean;
  details?: Record<string, any>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  statusCode?: number;
  errors?: Array<{ field: string; message: string }>;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
}

export interface RequestConfig {
  headers?: Record<string, string>;
  idempotencyKey?: string;
}

/**
 * Payment Gateway API Client
 * Main client class for interacting with the Payment Gateway API
 */
export class PaymentGatewayClient {
  private config: ClientConfig;
  private accessToken?: string;
  private refreshToken?: string;

  public auth: AuthService;
  public payments: PaymentsService;
  public disbursements: DisbursementsService;
  public merchant: MerchantService;
  public health: HealthService;

  constructor(config: ClientConfig) {
    this.config = {
      timeout: 30000,
      ...config,
    };

    this.auth = new AuthService(this);
    this.payments = new PaymentsService(this);
    this.disbursements = new DisbursementsService(this);
    this.merchant = new MerchantService(this);
    this.health = new HealthService(this);
  }

  /**
   * Make HTTP request
   */
  async request<T = any>(
    method: string,
    endpoint: string,
    data?: any,
    config?: RequestConfig,
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(config?.headers || {}),
    };

    // Add authentication headers
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }
    if (this.config.apiKey) {
      headers['X-API-Key'] = this.config.apiKey;
    }
    if (this.config.tenantId) {
      headers['X-Tenant-Id'] = this.config.tenantId;
    }
    if (config?.idempotencyKey) {
      headers['Idempotency-Key'] = config.idempotencyKey;
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        signal: AbortSignal.timeout(this.config.timeout || 30000),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new ApiError(
          error.message || `HTTP ${response.status}`,
          response.status,
          error,
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Unknown error',
        500,
      );
    }
  }

  /**
   * Set access token
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  /**
   * Set refresh token
   */
  setRefreshToken(token: string): void {
    this.refreshToken = token;
  }

  /**
   * Get access token
   */
  getAccessToken(): string | undefined {
    return this.accessToken;
  }

  /**
   * Set tenant ID
   */
  setTenantId(tenantId: string): void {
    this.config.tenantId = tenantId;
  }

  /**
   * Get tenant ID
   */
  getTenantId(): string | undefined {
    return this.config.tenantId;
  }

  /**
   * Clear authentication
   */
  clearAuth(): void {
    this.accessToken = undefined;
    this.refreshToken = undefined;
  }
}

/**
 * Authentication Service
 */
export class AuthService {
  constructor(private client: PaymentGatewayClient) {}

  /**
   * User login
   */
  async login(credentials: LoginDto): Promise<AuthResponse> {
    const response = await this.client.request<AuthResponse>(
      'POST',
      '/auth/login',
      credentials,
    );

    if (response.data) {
      this.client.setAccessToken(response.data.accessToken);
      this.client.setRefreshToken(response.data.refreshToken);
      this.client.setTenantId(response.data.user.tenantId);
    }

    return response;
  }

  /**
   * User registration
   */
  async register(data: RegisterDto): Promise<AuthResponse> {
    const response = await this.client.request<AuthResponse>(
      'POST',
      '/auth/register',
      data,
    );

    if (response.data) {
      this.client.setAccessToken(response.data.accessToken);
      this.client.setRefreshToken(response.data.refreshToken);
      this.client.setTenantId(response.data.user.tenantId);
    }

    return response;
  }

  /**
   * Get current user
   */
  async getMe(): Promise<ApiResponse<User>> {
    return this.client.request<ApiResponse<User>>('GET', '/auth/me');
  }

  /**
   * Logout
   */
  logout(): void {
    this.client.clearAuth();
  }
}

/**
 * Payments Service
 */
export class PaymentsService {
  constructor(private client: PaymentGatewayClient) {}

  /**
   * Create payment request
   */
  async create(
    data: CreatePaymentDto,
    config?: RequestConfig,
  ): Promise<ApiResponse<Payment>> {
    return this.client.request<ApiResponse<Payment>>(
      'POST',
      '/payments',
      data,
      config,
    );
  }

  /**
   * List all payments
   */
  async list(
    filters?: {
      status?: PaymentStatus;
      provider?: PaymentProvider;
      skip?: number;
      limit?: number;
    },
  ): Promise<PaginatedResponse<Payment>> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.provider) params.append('provider', filters.provider);
    if (filters?.skip) params.append('skip', filters.skip.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const endpoint = queryString ? `/payments?${queryString}` : '/payments';

    return this.client.request<PaginatedResponse<Payment>>('GET', endpoint);
  }

  /**
   * Get payment details
   */
  async getById(paymentId: string): Promise<ApiResponse<Payment>> {
    return this.client.request<ApiResponse<Payment>>(
      'GET',
      `/payments/${paymentId}`,
    );
  }

  /**
   * Get payment status
   */
  async getStatus(
    paymentId: string,
    provider?: PaymentProvider,
  ): Promise<ApiResponse<PaymentStatusResponse>> {
    const params = provider ? `?provider=${provider}` : '';
    return this.client.request<ApiResponse<PaymentStatusResponse>>(
      'GET',
      `/payments/status/${paymentId}${params}`,
    );
  }

  /**
   * Get available balance
   */
  async getBalance(provider?: PaymentProvider): Promise<BalanceResponse> {
    const params = provider ? `?provider=${provider}` : '';
    return this.client.request<BalanceResponse>(
      'GET',
      `/payments/balance/available${params}`,
    );
  }
}

/**
 * Disbursements Service
 */
export class DisbursementsService {
  constructor(private client: PaymentGatewayClient) {}

  /**
   * Create disbursement
   */
  async create(
    data: CreateDisbursementDto,
    config?: RequestConfig,
  ): Promise<ApiResponse<Disbursement>> {
    return this.client.request<ApiResponse<Disbursement>>(
      'POST',
      '/disbursements',
      data,
      config,
    );
  }

  /**
   * List all disbursements
   */
  async list(
    filters?: {
      status?: DisbursementStatus;
      provider?: PaymentProvider;
      skip?: number;
      limit?: number;
    },
  ): Promise<PaginatedResponse<Disbursement>> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.provider) params.append('provider', filters.provider);
    if (filters?.skip) params.append('skip', filters.skip.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const endpoint = queryString
      ? `/disbursements?${queryString}`
      : '/disbursements';

    return this.client.request<PaginatedResponse<Disbursement>>(
      'GET',
      endpoint,
    );
  }

  /**
   * Get disbursement details
   */
  async getById(disbursementId: string): Promise<ApiResponse<Disbursement>> {
    return this.client.request<ApiResponse<Disbursement>>(
      'GET',
      `/disbursements/${disbursementId}`,
    );
  }

  /**
   * Get disbursement status
   */
  async getStatus(
    disbursementId: string,
    provider?: PaymentProvider,
  ): Promise<ApiResponse<any>> {
    const params = provider ? `?provider=${provider}` : '';
    return this.client.request<ApiResponse<any>>(
      'GET',
      `/disbursements/status/${disbursementId}${params}`,
    );
  }
}

/**
 * Merchant Configuration Service
 */
export class MerchantService {
  constructor(private client: PaymentGatewayClient) {}

  /**
   * Get merchant configuration
   */
  async getConfiguration(): Promise<ApiResponse<MerchantConfiguration>> {
    return this.client.request<ApiResponse<MerchantConfiguration>>(
      'GET',
      '/merchant/configuration',
    );
  }

  /**
   * Update merchant configuration
   */
  async updateConfiguration(
    data: UpdateMerchantConfigurationDto,
  ): Promise<ApiResponse<MerchantConfiguration>> {
    return this.client.request<ApiResponse<MerchantConfiguration>>(
      'PATCH',
      '/merchant/configuration',
      data,
    );
  }

  /**
   * Verify MTN credentials
   */
  async verifyMtnCredentials(): Promise<VerificationResponse> {
    return this.client.request<VerificationResponse>(
      'POST',
      '/merchant/configuration/verify/mtn',
    );
  }

  /**
   * Verify Airtel credentials
   */
  async verifyAirtelCredentials(): Promise<VerificationResponse> {
    return this.client.request<VerificationResponse>(
      'POST',
      '/merchant/configuration/verify/airtel',
    );
  }

  /**
   * Verify bank account
   */
  async verifyBankAccount(): Promise<VerificationResponse> {
    return this.client.request<VerificationResponse>(
      'POST',
      '/merchant/configuration/verify/bank',
    );
  }
}

/**
 * Health Check Service
 */
export class HealthService {
  constructor(private client: PaymentGatewayClient) {}

  /**
   * Basic health check
   */
  async check(): Promise<any> {
    return this.client.request('GET', '/health');
  }

  /**
   * Readiness check
   */
  async ready(): Promise<any> {
    return this.client.request('GET', '/health/ready');
  }

  /**
   * Liveness check
   */
  async live(): Promise<any> {
    return this.client.request('GET', '/health/live');
  }
}

/**
 * API Error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: any,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Helper function to generate UUID
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default PaymentGatewayClient;
