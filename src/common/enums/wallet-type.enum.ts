/**
 * Wallet type enum for disbursement transactions
 * Indicates the classification of the recipient's wallet
 */
export enum WalletType {
  /**
   * Standard personal wallet (default)
   * Used for general consumer-to-wallet transfers
   */
  NORMAL = 'NORMAL',

  /**
   * Salary/payroll payment wallet
   * May have special handling, higher limits, or different fees
   */
  SALARY = 'SALARY',

  /**
   * Merchant/business wallet
   * For business-to-business settlements
   */
  MERCHANT = 'MERCHANT',

  /**
   * Disbursement-specific wallet
   * Used for programmatic money-out operations
   */
  DISBURSEMENT = 'DISBURSEMENT',
}
