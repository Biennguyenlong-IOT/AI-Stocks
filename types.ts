
export interface StockHolding {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  sector: string;
  brokerage: string;
}

export type TransactionType = 'BUY' | 'SELL' | 'DEPOSIT' | 'WITHDRAW' | 'DIVIDEND_CASH' | 'DIVIDEND_STOCK';

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  symbol?: string;
  quantity?: number;
  price?: number;
  taxFee: number;
  totalAmount: number;
  note?: string;
  brokerage: string; // Công ty thực hiện giao dịch
}

export interface PortfolioState {
  holdings: StockHolding[];
  transactions: Transaction[];
  cashBalances: Record<string, number>; // Tiền mặt theo từng công ty
  totalCash: number; // Tổng tiền mặt khả dụng
}

export interface AIAnalysisResponse {
  riskScore: number;
  tradeAnalysis: string;
  assetAnalysis: string;
  recommendations: string[];
}
