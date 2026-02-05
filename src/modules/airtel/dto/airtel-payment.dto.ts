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
