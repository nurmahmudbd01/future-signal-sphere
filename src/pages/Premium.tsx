
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignalCard } from "@/components/SignalCard";

type Signal = {
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

export default function Premium() {
  const [signals, setSignals] = useState<Signal[]>([]);

  useEffect(() => {
    // Here we'll filter signals that should appear in premium page
    const loadSignals = () => {
      // For now, let's use localstorage. Later this would be a backend API call
      const storedSignals = localStorage.getItem('signals');
      if (storedSignals) {
        const allSignals: Signal[] = JSON.parse(storedSignals);
        // Filter signals that should appear in premium page
        const premiumSignals = allSignals.filter(
          signal => signal.displayLocation === "Premium" || signal.displayLocation === "Both"
        );
        setSignals(premiumSignals);
      }
    };

    loadSignals();
    // Listen for storage changes to update signals in real-time
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
              futureSignals.map((signal, index) => (
                <SignalCard key={index} signal={signal} />
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
              spotSignals.map((signal, index) => (
                <SignalCard key={index} signal={signal} />
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
