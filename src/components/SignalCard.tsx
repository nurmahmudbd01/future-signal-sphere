
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Signal } from "@/types/signal";
import { formatDateTime, getSignalStoragePath } from "@/utils/signalUtils";
import { toast } from "sonner";

interface SignalCardProps {
  signal: Signal;
  isAdmin?: boolean;
  onEdit?: (signal: Signal) => void;
  onDelete?: (signal: Signal) => void;
}

export function SignalCard({ signal, isAdmin, onEdit, onDelete }: SignalCardProps) {
  const [isClosingDialogOpen, setIsClosingDialogOpen] = useState(false);
  const [profitLossPercentage, setProfitLossPercentage] = useState("");
  
  const isProfitable = signal.profitLoss && signal.profitLoss.percentage > 0;
  const isLoss = signal.profitLoss && signal.profitLoss.percentage < 0;
  const status = signal.status || 'active';
  
  const statusColor = {
    pending: "bg-yellow-100 text-yellow-800",
    active: "bg-blue-100 text-blue-800",
    closed: isProfitable ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800",
  }[status];

  const handleCloseSignal = () => {
    const percentage = parseFloat(profitLossPercentage);
    if (isNaN(percentage)) {
      toast.error("Please enter a valid percentage");
      return;
    }

    const closingTime = new Date();
    const updatedSignal: Signal = {
      ...signal,
      status: "closed",
      profitLoss: {
        percentage,
        closingTime,
        lastEdited: new Date(),
      },
    };

    // Get all signals from localStorage
    const storedSignals = JSON.parse(localStorage.getItem('signals') || '[]');
    const updatedSignals = storedSignals.map((s: Signal) => 
      s.id === signal.id ? updatedSignal : s
    );

    // Update localStorage
    localStorage.setItem('signals', JSON.stringify(updatedSignals));

    // Store the signal in the organized structure
    const storagePath = getSignalStoragePath(closingTime);
    const storedSignals2 = JSON.parse(localStorage.getItem(storagePath) || '[]');
    storedSignals2.push(updatedSignal);
    localStorage.setItem(storagePath, JSON.stringify(storedSignals2));

    setIsClosingDialogOpen(false);
    setProfitLossPercentage("");
    toast.success("Signal closed successfully");
    
    // Trigger storage event for other tabs
    window.dispatchEvent(new Event('storage'));
  };

  return (
    <>
      <Card className={`h-full relative ${status === 'closed' ? (isProfitable ? 'border-green-500' : 'border-red-500') : ''}`}>
        {isAdmin && (
          <div className="absolute top-2 right-2 z-20 flex gap-2">
            <Button
              variant="secondary"
              size="icon"
              onClick={() => onEdit?.(signal)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="destructive"
              size="icon"
              onClick={() => onDelete?.(signal)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
        
        {status === 'closed' && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-[1px] rounded-lg z-10">
            <div className="flex flex-col items-center gap-2 px-4 py-2 rounded-lg bg-background/80 shadow-sm border">
              {isProfitable ? (
                <CheckCircle className="h-6 w-6 text-green-500" />
              ) : (
                <XCircle className="h-6 w-6 text-red-500" />
              )}
              <span className={`font-medium ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                {signal.profitLoss?.percentage}% {isProfitable ? 'Profit' : 'Loss'}
              </span>
              <span className="text-xs text-muted-foreground">
                Closed on {signal.profitLoss ? formatDateTime(new Date(signal.profitLoss.closingTime)) : ''}
              </span>
            </div>
          </div>
        )}

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
                {status.charAt(0).toUpperCase() + status.slice(1)}
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
            {status === 'closed' && signal.profitLoss && (
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
            {isAdmin && status !== 'closed' && (
              <Button 
                className="w-full mt-4" 
                variant="outline"
                onClick={() => setIsClosingDialogOpen(true)}
              >
                Close Signal
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isClosingDialogOpen} onOpenChange={setIsClosingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Signal</DialogTitle>
            <DialogDescription>
              Enter the profit/loss percentage for this signal. Use negative values for losses.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="number"
              step="0.01"
              placeholder="Enter profit/loss percentage"
              value={profitLossPercentage}
              onChange={(e) => setProfitLossPercentage(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsClosingDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCloseSignal}>
              Close Signal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
