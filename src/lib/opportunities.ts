export type Opportunity = {
  clockId: string;
  title: string;
  price: number;
  currency: string;
  island: string;
  source: string;
  sourceUrl?: string;
  marketPrice: number;
  marketSources: string[];
  discountRatio: number;
  negotiationMessage?: string;
  detectedAt: string;
};

export type PriceDrop = {
  clockId: string;
  title: string;
  island: string;
  source: string;
  sourceUrl?: string;
  currency: string;
  previousPrice: number;
  currentPrice: number;
  dropAmount: number;
  dropRatio: number;
  dropPercent: number;
  detectedAt: string;
};

export type OpportunitiesReport = {
  generatedAt: string;
  totalClocks: number;
  totalMatches: number;
  totalPriceDrops?: number;
  topOpportunities: Opportunity[];
  opportunities: Opportunity[];
  priceDrops?: PriceDrop[];
};
