
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";

interface SignalCardProps {
  signal: {
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
  };
}

export function SignalCard({ signal }: SignalCardProps) {
  return (
    <Card className="h-full">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between mb-2">
          <Badge
            variant="outline"
            className={signal.signalType === "Buy" ? "border-signal-buy text-signal-buy" : "border-signal-sell text-signal-sell"}
          >
            <span className="flex items-center gap-1">
              {signal.signalType === "Buy" ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {signal.signalType}
            </span>
          </Badge>
          <span className="text-xs text-muted-foreground">
            {format(new Date(signal.createdAt), "MMM d, HH:mm")}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg truncate">{signal.title}</h3>
          <Badge variant="secondary">{signal.marketType}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">{signal.description}</p>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Blockchain:</span>
            <span className="font-medium">{signal.blockchainType}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Entry Price:</span>
            <span className="font-medium">${signal.entryPrice}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Target Price:</span>
            <span className="font-medium text-signal-buy">${signal.targetPrice}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Stop Loss:</span>
            <span className="font-medium text-signal-sell">${signal.stopLoss}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
