export type WorldUpdate = {
  headline: string;
  oneSentence: string;
  whyItMatters: string;
  url: string;
  source: string;
  publishedAt: string;
};

export type ConceptOfDay = {
  title: string;
  explanation: string;
  analogy: string;
  tieBack: string;
};

export type PortfolioMover = {
  symbol: string;
  pctChange: number;
  dayChangeValue: number;
};

export type CompanyNews = {
  symbol: string;
  headline: string;
  url: string;
  source: string;
  publishedAt: string;
};

export type PortfolioPulse = {
  totalValue?: number;
  dayChangeValue?: number;
  dayChangePct: number;
  topMovers: PortfolioMover[];
  companyNews: CompanyNews[];
  note?: string;
};

export type BriefPayload = {
  portfolioPulse: PortfolioPulse | null;
  worldUpdates: WorldUpdate[];
  overnightLine: string;
  conceptOfDay: ConceptOfDay;
  takeaway: string;
};

export type Citation = {
  title: string;
  source: string;
  url: string;
  published_at: string;
};

export type Brief = {
  id: string;
  brief_date: string;
  payload: BriefPayload;
  citations: Citation[];
};
