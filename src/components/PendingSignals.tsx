
import { Signal } from "@/types/signal";
import { SignalCard } from "@/components/SignalCard";

interface PendingSignalsProps {
  signals: Signal[];
  isAdmin?: boolean;
}

export function PendingSignals({ signals, isAdmin = false }: PendingSignalsProps) {
  // Filter for pending signals only
  const pendingSignals = signals.filter(signal => signal.status === 'pending');

  if (pendingSignals.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6 mb-12">
      <h2 className="text-2xl font-semibold">Pending Signals</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pendingSignals.map((signal) => (
          <SignalCard 
            key={signal.id} 
            signal={signal}
            isAdmin={isAdmin}
          />
        ))}
      </div>
    </div>
  );
}
