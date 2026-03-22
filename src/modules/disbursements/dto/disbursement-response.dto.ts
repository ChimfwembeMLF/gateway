import { PawapayStatusCode, PawapayTechnicalFailureCode, PawapayTransactionFailureCode } from '../../pawapay/pawapay-status-codes.enum';

export class ResponseDto {
  status: PawapayStatusCode;
  errorCode?: PawapayTechnicalFailureCode | PawapayTransactionFailureCode;
}