/**
 * Interface for utility service providers (Airtime, Data, Cable, etc.)
 * All providers must implement this interface to ensure consistency
 */
export interface IUtilityProvider {
  /**
   * Get the provider name (e.g., 'vtpass', 'sagecloud', 'giftbill')
   */
  getProviderName(): string;

  /**
   * Purchase airtime
   */
  purchaseAirtime(params: PurchaseAirtimeParams): Promise<PurchaseResponse>;

  /**
   * Purchase data
   */
  purchaseData(params: PurchaseDataParams): Promise<PurchaseResponse>;

  /**
   * Purchase cable/TV subscription
   */
  purchaseCable(params: PurchaseCableParams): Promise<PurchaseResponse>;

  /**
   * Purchase electricity
   */
  purchaseElectricity(params: PurchaseElectricityParams): Promise<PurchaseResponse>;

  /**
   * Query transaction status
   */
  queryTransaction(reference: string): Promise<QueryTransactionResponse>;
}

export interface PurchaseAirtimeParams {
  phoneNumber: string;
  amount: number;
  network?: string;
  requestId?: string;
}

export interface PurchaseDataParams {
  phoneNumber: string;
  dataPlan: string; // Plan ID or variation code
  network?: string;
  requestId?: string;
}

export interface PurchaseCableParams {
  smartCardNumber: string;
  serviceId: string; // e.g., 'dstv', 'gotv', 'startimes'
  variationCode: string;
  amount: number;
  requestId?: string;
}

export interface PurchaseElectricityParams {
  meterNumber: string;
  meterType: 'prepaid' | 'postpaid';
  amount: number;
  serviceId: string; // e.g., 'aedc', 'ekedc', etc.
  requestId?: string;
}

export interface PurchaseResponse {
  success: boolean;
  message: string;
  requestId?: string;
  transactionReference?: string;
  status?: string;
  data?: any;
}

export interface QueryTransactionResponse {
  success: boolean;
  status: 'pending' | 'success' | 'failed';
  message: string;
  transactionReference?: string;
  data?: any;
}

