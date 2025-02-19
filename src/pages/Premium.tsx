
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignalCard } from "@/components/SignalCard";

// Temporary test data
const mockSignals = [
  {
    title: "BTC Long Opportunity",
    description: "Strong support level reached, expecting a bounce to key resistance.",
    signalType: "Buy" as const,
    marketType: "Future" as const,
    blockchainType: "Bitcoin" as const,
    entryPrice: "42000",
    targetPrice: "45000",
    stopLoss: "41000",
    createdAt: new Date(),
    displayLocation: "Premium",
  },
  {
    title: "ETH Short Setup",
    description: "Double top formation with bearish divergence on RSI.",
    signalType: "Sell" as const,
    marketType: "Future" as const,
    blockchainType: "Ethereum" as const,
    entryPrice: "2200",
    targetPrice: "2000",
    stopLoss: "2300",
    createdAt: new Date(),
    displayLocation: "Premium",
  },
];

export default function Premium() {
  const [signals] = useState(mockSignals);

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
