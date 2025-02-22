
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignalCard } from "@/components/SignalCard";
import { Signal, SignalStatus } from "@/types/signal";
import { getAllStoredSignals } from "@/utils/signalUtils";
import { SignalSearchAndFilter } from "@/components/SignalSearchAndFilter";

export default function Premium() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SignalStatus | 'all'>('all');

  useEffect(() => {
    const loadSignals = () => {
      const allSignals = getAllStoredSignals();
      const premiumSignals = allSignals.filter(signal => {
        const isPremiumOrBoth = signal.displayLocation === "Premium" || signal.displayLocation === "Both";
        const isApproved = signal.approved === true;
        return isPremiumOrBoth && isApproved;
      });

      // Sort signals: active first, then by date
      const sortedSignals = [...premiumSignals].sort((a, b) => {
        if (a.status === 'closed' && b.status !== 'closed') return 1;
        if (a.status !== 'closed' && b.status === 'closed') return -1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setSignals(sortedSignals);
    };

    loadSignals();
    window.addEventListener('storage', loadSignals);
    return () => window.removeEventListener('storage', loadSignals);
  }, []);

  // Filter signals based on search and status
  const filteredSignals = signals.filter(signal => {
    const matchesSearch = signal.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || signal.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const futureSignals = filteredSignals.filter(signal => signal.marketType === "Future");
  const spotSignals = filteredSignals.filter(signal => signal.marketType === "Spot");

  return (
    <div className="container py-16">
      <h1 className="text-3xl font-bold mb-8">Premium Signals</h1>

      <SignalSearchAndFilter
        onSearchChange={setSearchQuery}
        onStatusFilter={setStatusFilter}
        selectedStatus={statusFilter}
      />

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
