// RempayClient SDK - TypeScript
// Core API client for Rempay payment gateway

export interface RempayConfig {
  baseUrl: string;
  apiKey: string;
  tenantId: string;
  token?: string;
}

export class RempayClient {
  private baseUrl: string;
  private apiKey: string;
  private tenantId: string;
  private token?: string;

  constructor(config: RempayConfig) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.tenantId = config.tenantId;
    this.token = config.token;
  }

  setToken(token: string) {
    this.token = token;
  }

  async request<T>(method: string, endpoint: string, data?: any): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'x-tenant-id': this.tenantId,
    };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const response = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    return response.json();
  }

  // Authentication
  async login(email: string, password: string): Promise<any> {
    return this.request('POST', '/auth/login', { email, password });
  }

  async register(data: any): Promise<any> {
    return this.request('POST', '/auth/register', data);
  }

  // Payments
  async createPayment(data: any): Promise<any> {
    return this.request('POST', '/payments', data);
  }

  async getPaymentStatus(id: string): Promise<any> {
    return this.request('GET', `/payments/status/${id}`);
  }

  async getPayments(): Promise<any> {
    return this.request('GET', '/payments');
  }

  // Disbursements
  async createDisbursement(data: any): Promise<any> {
    return this.request('POST', '/disbursements', data);
  }

  async getDisbursementStatus(id: string): Promise<any> {
    return this.request('GET', `/disbursements/status/${id}`);
  }

  async getDisbursements(): Promise<any> {
    return this.request('GET', '/disbursements');
  }

  // Merchant Configuration
  async getMerchantConfig(): Promise<any> {
    return this.request('GET', '/merchant/configuration');
  }

  async updateMerchantConfig(data: any): Promise<any> {
    return this.request('PATCH', '/merchant/configuration', data);
  }

  // Utility
  async getBalance(): Promise<any> {
    return this.request('POST', '/payments/balance/available');
  }
}
