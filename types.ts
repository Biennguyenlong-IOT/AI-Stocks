
export interface StockAnalysis {
  symbol: string;
  trend: 'Uptrend' | 'Downtrend' | 'Sideways';
  isBottom: boolean;
  weeklyOutlook: string;
  monthlyOutlook: string;
  keyLevels: {
    support: number;
    resistance: number;
    entry: number;
  };
  reasoning: string;
  sources: { title: string; uri: string }[];
}

export interface PortfolioStockAnalysis extends StockAnalysis {
  lastUpdated: string;
}

export interface ScreenerResult {
  symbol: string;
  price: string;
  change: string;
  reason: string;
  tags: string[];
}

export interface MarketIndex {
  name: string;
  value: string;
  change: string;
  percent: string;
}

export interface MarketOverview {
  indices: MarketIndex[];
  sentiment: 'Hưng phấn' | 'Tích cực' | 'Trung lập' | 'Tiêu cực' | 'Hoảng loạn';
  summary: string;
  topSectors: { name: string; performance: string }[];
  foreignFlow: string;
  recommendation: string;
  sources: { title: string; uri: string }[];
}

export interface AppDataCloud {
  symbols: string[];
  analyses: Record<string, PortfolioStockAnalysis>;
  settings: {
    modelId: string;
    customModel: string;
  }
}

export enum AppTab {
  MARKET = 'MARKET',
  ANALYSIS = 'ANALYSIS',
  SCREENER = 'SCREENER',
  STRATEGY = 'STRATEGY',
  PORTFOLIO = 'PORTFOLIO'
}
