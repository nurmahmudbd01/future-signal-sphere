
export type SignalStatus = "pending" | "active" | "closed";

export interface SignalProfitLoss {
  percentage: number;
  closingTime: Date;
  lastEdited?: Date;
}

export interface Signal {
  id: string;
  title: string;
  description: string;
  signalType: "Buy" | "Sell";
  marketType: "Future" | "Spot";
  blockchainType: "Bitcoin" | "Ethereum" | "Solana" | "Other";
  entryPrice: string;
  targetPrice: string;
  stopLoss: string;
  createdAt: Date;
  displayLocation: "Main" | "Premium" | "Both";
  status: SignalStatus;
  profitLoss?: SignalProfitLoss;
  approved: boolean;
}
