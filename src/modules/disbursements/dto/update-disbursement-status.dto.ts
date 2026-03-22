import { PawapayStatusCode, PawapayTechnicalFailureCode, PawapayTransactionFailureCode } from '../../pawapay/pawapay-status-codes.enum';

export interface PaymentResponse {
  status: PawapayStatusCode;
  errorCode?: PawapayTechnicalFailureCode | PawapayTransactionFailureCode;
}