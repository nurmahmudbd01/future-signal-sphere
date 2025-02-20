
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Clock } from "lucide-react";
import { format } from "date-fns";
import { Signal } from "@/types/signal";
import { formatDateTime } from "@/utils/signalUtils";

interface SignalCardProps {
  signal: Signal;
  isAdmin?: boolean;
  onEdit?: (signal: Signal) => void;
  onDelete?: (signal: Signal) => void;
  onClose?: (signal: Signal) => void;
}

export function SignalCard({ signal, isAdmin, onEdit, onDelete, onClose }: SignalCardProps) {
  const isProfitable = signal.profitLoss && signal.profitLoss.percentage > 0;
  const isLoss = signal.profitLoss && signal.profitLoss.percentage < 0;
  
  const statusColor = {
    pending: "bg-yellow-100 text-yellow-800",
    active: "bg-blue-100 text-blue-800",
    closed: isProfitable ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800",
  }[signal.status];

  return (
    <Card className={`h-full ${signal.status === 'closed' ? (isProfitable ? 'border-green-500' : 'border-red-500') : ''}`}>
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
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
            <Badge className={statusColor}>
              {signal.status.charAt(0).toUpperCase() + signal.status.slice(1)}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDateTime(new Date(signal.createdAt))}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground">#{signal.id}</span>
            <h3 className="font-semibold text-lg truncate">{signal.title}</h3>
          </div>
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
          {signal.status === 'closed' && signal.profitLoss && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Profit/Loss:</span>
                <span className={`font-medium ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                  {signal.profitLoss.percentage > 0 ? '+' : ''}{signal.profitLoss.percentage}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Closed at:</span>
                <span className="font-medium">
                  {formatDateTime(new Date(signal.profitLoss.closingTime))}
                </span>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
