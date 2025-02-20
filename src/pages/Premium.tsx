
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignalCard } from "@/components/SignalCard";
import { Signal } from "@/types/signal";

export default function Premium() {
  const [signals, setSignals] = useState<Signal[]>([]);

  useEffect(() => {
    const loadSignals = () => {
      try {
        const storedSignals = localStorage.getItem('signals');
        console.log('Stored signals (Premium):', storedSignals); // Debug log

        if (storedSignals) {
          const allSignals: Signal[] = JSON.parse(storedSignals);
          console.log('All signals (Premium):', allSignals); // Debug log

          // Filter signals for premium page
          const premiumSignals = allSignals.filter(signal => {
            const isPremiumOrBoth = signal.displayLocation === "Premium" || signal.displayLocation === "Both";
            const isApproved = signal.approved === true;
            return isPremiumOrBoth && isApproved;
          });

          console.log('Filtered premium signals:', premiumSignals); // Debug log

          // Sort signals: active/pending first (newest to oldest), then closed (newest to oldest)
          const sortedSignals = [...premiumSignals].sort((a, b) => {
            const aStatus = a.status || 'pending';
            const bStatus = b.status || 'pending';
            
            // If one is closed and the other isn't, closed goes last
            if (aStatus === 'closed' && bStatus !== 'closed') return 1;
            if (aStatus !== 'closed' && bStatus === 'closed') return -1;
            
            // Both are either closed or not closed, sort by date (newest first)
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();
            return dateB - dateA;
          });

          console.log('Sorted signals (Premium):', sortedSignals); // Debug log
          setSignals(sortedSignals);
        }
      } catch (error) {
        console.error('Error loading signals:', error);
      }
    };

    loadSignals(); // Initial load
    window.addEventListener('storage', loadSignals);
    return () => window.removeEventListener('storage', loadSignals);
  }, []);

  const futureSignals = signals.filter(signal => signal.marketType === "Future");
  const spotSignals = signals.filter(signal => signal.marketType === "Spot");

  return (
    <div className="container py-16">
      <h1 className="text-3xl font-bold mb-8">Premium Signals</h1>
      <Tabs defaultValue="future" className="w-full">
        <div className="flex justify-center mb-8">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="future">Future Signals</TabsTrigger>
            <TabsTrigger value="spot">Spot Signals</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="future">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {futureSignals.length > 0 ? (
              futureSignals.map((signal) => (
                <SignalCard key={signal.id} signal={signal} />
              ))
            ) : (
              <div className="text-center py-12 col-span-full text-muted-foreground">
                No premium signals available at the moment.
              </div>
            )}
          </div>
        </TabsContent>
        <TabsContent value="spot">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {spotSignals.length > 0 ? (
              spotSignals.map((signal) => (
                <SignalCard key={signal.id} signal={signal} />
              ))
            ) : (
              <div className="text-center py-12 col-span-full text-muted-foreground">
                No premium signals available at the moment.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
