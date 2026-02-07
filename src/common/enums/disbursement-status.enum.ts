/**
 * Disbursement status enum
 * Tracks the lifecycle of a disbursement transaction
 */
export enum DisbursementStatus {
  /**
   * Disbursement request received, queued for processing
   */
  PENDING = 'PENDING',

  /**
   * Request sent to provider, awaiting response
   */
  PROCESSING = 'PROCESSING',

  /**
   * Funds successfully transferred to recipient wallet
   */
  SUCCESS = 'SUCCESS',

  /**
   * Provider rejected the request (invalid MSISDN, amount, etc.)
   */
  FAILED = 'FAILED',

  /**
   * Request timed out - status unknown, eligible for retry
   */
  TIMEOUT = 'TIMEOUT',

  /**
   * Funds sent but recipient wallet rejected (full bounce)
   */
  BOUNCED = 'BOUNCED',

  /**
   * Previously successful disbursement has been refunded
   */
  REFUNDED = 'REFUNDED',

  /**
   * Refund in progress
   */
  REFUND_PROCESSING = 'REFUND_PROCESSING',

  /**
   * Refund failed - manual intervention may be needed
   */
  REFUND_FAILED = 'REFUND_FAILED',
}
