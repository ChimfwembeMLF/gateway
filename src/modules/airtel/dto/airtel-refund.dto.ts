export interface AirtelRefundDto {
  reference: string;
  transaction: {
    airtel_money_id: string;  // Original Airtel transaction ID to refund
    id: string;               // Partner's refund transaction ID
  };
}

export interface AirtelRefundResponse {
  data?: {
    transaction?: {
      airtel_money_id?: string;
      id?: string;
      status?: string;
    };
  };
  status?: {
    code?: string;
    message?: string;
    response_code?: string;
    success?: boolean;
  };
}

export interface AirtelStatusQueryDto {
  transaction_id: string;  // Partner's original transaction ID
}

export interface AirtelStatusQueryResponse {
  data?: {
    transaction?: {
      id?: string;
      status?: string;
      amount?: number;
      currency?: string;
      airtel_money_id?: string;
    };
  };
  status?: {
    code?: string;
    message?: string;
    response_code?: string;
    success?: boolean;
  };
}
