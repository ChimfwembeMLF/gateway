/**
 * Airtel Collection API DTOs
 * Based on official Airtel API documentation
 * Base URL: https://openapiuat.airtel.co.zm (staging)
 *          https://openapi.airtel.co.zm (production)
 */

export interface AirtelSubscriberDto {
  country: string;        // e.g., "ZM"
  currency?: string;      // e.g., "ZMW" (optional for same country)
  msisdn: string;         // WITHOUT country code, e.g., "12345789"
}

export interface AirtelTransactionDto {
  amount: number;         // Transaction amount to deduct
  country?: string;       // Optional for cross-border payments
  currency?: string;      // Optional for cross-border payments
  id: string;             // Partner unique transaction ID
}

export interface AirtelRequestToPayDto {
  reference: string;                  // Reference for service/goods
  subscriber: AirtelSubscriberDto;    // Payer details
  transaction: AirtelTransactionDto;  // Transaction details
}

export interface AirtelRequestToPayResponse {
  data?: {
    transaction?: {
      id?: boolean;        // Partner transaction ID (note: boolean type per docs)
      status?: string;     // Transaction status (e.g., "SUCCESS")
    };
  };
  status?: {
    code?: string;           // HTTP status code (e.g., "200")
    message?: string;        // Descriptive message (e.g., "SUCCESS")
    result_code?: string;    // Deprecated, use response_code instead
    response_code?: string;  // Product-specific code (e.g., "DP00800001006")
    success?: boolean;       // true if no error
  };
}

/**
 * Disbursement API DTOs
 * For money-out/payout operations to Airtel Money wallets
 * Endpoint: POST /standard/v3/disbursements
 */

export interface AirtelDisbursementRequestDto {
  reference: string;          // Partner reference ID (unique per tenant)
  subscriber: {
    country: string;          // Country code (e.g., "ZM")
    currency?: string;        // Currency code (optional)
    msisdn: string;           // Recipient MSISDN WITHOUT country code
  };
  transaction: {
    amount: number;           // Payout amount
    country?: string;         // Country code (optional)
    currency?: string;        // Currency code (optional)
    id: string;               // Unique transaction ID (idempotency key)
    type?: string;            // Transaction type (e.g., "B2C", "B2B")
  };
  pin: string;                // Encrypted PIN (RSA-OAEP encrypted, base64)
  wallet_type?: string;       // Wallet type (e.g., "NORMAL", "SALARY")
}

export interface AirtelDisbursementResponse {
  data?: {
    transaction?: {
      id?: string;            // Airtel Money transaction ID
      status?: string;        // Transaction status
    };
    disbursement?: {
      reference?: string;     // Partner reference (echoed back)
      status?: string;        // Disbursement status
    };
  };
  status?: {
    code?: string;           // HTTP status code
    message?: string;        // Status message
    response_code?: string;  // Product-specific code
    success?: boolean;       // true if no error
  };
}
