import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignalCard } from "@/components/SignalCard";
import { Signal } from "@/types/signal";
import { getAllStoredSignals } from "@/utils/signalUtils";

export default function Premium() {
  const [signals, setSignals] = useState<Signal[]>([]);

  useEffect(() => {
    const loadSignals = () => {
      try {
        const allSignals = getAllStoredSignals();
        console.log('Retrieved all signals (Premium):', allSignals); // Debug log

        // Filter signals for premium page
        const premiumSignals = allSignals.filter(signal => {
          const isPremiumOrBoth = signal.displayLocation === "Premium" || signal.displayLocation === "Both";
          const isApproved = signal.approved === true;
          return isPremiumOrBoth && isApproved;
        });

        console.log('Filtered premium signals:', premiumSignals); // Debug log

        // Sort signals
        const sortedSignals = [...premiumSignals].sort((a, b) => {
          // Active signals first
          if (a.status !== 'closed' && b.status === 'closed') return -1;
          if (a.status === 'closed' && b.status !== 'closed') return 1;
          
          // Then by date (newest first)
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        console.log('Sorted premium signals:', sortedSignals); // Debug log
        setSignals(sortedSignals);
      } catch (error) {
        console.error('Error loading signals:', error);
      }
    };

    loadSignals();
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
