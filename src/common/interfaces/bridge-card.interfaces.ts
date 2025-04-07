export interface BridgeCardResponse {
    status: boolean;
    message: string;
    data?: any;
  }
  
  export interface Card {
    id: string;
    currency: string;
    balance: number;
    isActive: boolean;
    maskedPan: string;
    expiryMonth: string;
    expiryYear: string;
    cvv?: string;
    cardType: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }