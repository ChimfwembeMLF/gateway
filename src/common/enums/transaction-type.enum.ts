/**
 * Transaction type enum for disbursement classification
 * Indicates the nature/purpose of the disbursement transaction
 */
export enum TransactionType {
  /**
   * Consumer-to-business payment
   * Recipient is a business/merchant
   */
  B2C = 'B2C',

  /**
   * Business-to-business payment
   * Recipient is another business entity
   */
  B2B = 'B2B',

  /**
   * Government-to-citizen payment
   * Recipient is an individual citizen
   */
  G2C = 'G2C',

  /**
   * Business-to-government payment
   * Recipient is a government entity
   */
  B2G = 'B2G',

  /**
   * Salary/payroll payment
   * Employee compensation disbursement
   */
  SALARY = 'SALARY',

  /**
   * Loan disbursement
   * Funds released as part of a loan facility
   */
  LOAN = 'LOAN',

  /**
   * Dividend/profit payment
   * Shareholder payment disbursement
   */
  DIVIDEND = 'DIVIDEND',

  /**
   * Commission payment
   * Agent or affiliate commission settlement
   */
  COMMISSION = 'COMMISSION',

  /**
   * Refund/reversal payment
   * Return of previously collected funds
   */
  REFUND = 'REFUND',

  /**
   * Generic/other disbursement type
   * For use cases not covered by above classifications
   */
  OTHER = 'OTHER',
}
