import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignalCard } from "@/components/SignalCard";
import { Signal, SignalStatus } from "@/types/signal";
import { getAllStoredSignals } from "@/utils/signalUtils";
import { SignalSearchAndFilter } from "@/components/SignalSearchAndFilter";
import { Button } from "@/components/ui/button";

export default function Premium() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SignalStatus | 'all'>('all');
  const [visibleCount, setVisibleCount] = useState(12);
  const [visibleClosedCount, setVisibleClosedCount] = useState(6);

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

  // Filter and search in closed signals separately
  const filteredClosedSignals = signals.filter(signal => {
    const matchesSearch = signal.id.toLowerCase().includes(searchQuery.toLowerCase());
    const isClosedSignal = signal.status === 'closed';
    return matchesSearch && isClosedSignal;
  });

  const visibleFutureSignals = filteredSignals
    .filter(signal => signal.marketType === "Future")
    .slice(0, visibleCount);
  
  const visibleSpotSignals = filteredSignals
    .filter(signal => signal.marketType === "Spot")
    .slice(0, visibleCount);

  // Filter closed signals by market type
  const closedSignals = filteredClosedSignals
    .sort((a, b) => {
      const dateA = a.profitLoss?.closingTime ? new Date(a.profitLoss.closingTime) : new Date(0);
      const dateB = b.profitLoss?.closingTime ? new Date(b.profitLoss.closingTime) : new Date(0);
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, visibleClosedCount);

  const hasMoreFuture = filteredSignals.filter(s => s.marketType === "Future").length > visibleCount;
  const hasMoreSpot = filteredSignals.filter(s => s.marketType === "Spot").length > visibleCount;
  const hasMoreClosed = filteredClosedSignals.length > visibleClosedCount;

  const loadMore = () => {
    setVisibleCount(prev => prev + 6);
  };

  const loadMoreClosed = () => {
    setVisibleClosedCount(prev => prev + 6);
  };

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
            {visibleFutureSignals.length > 0 ? (
              visibleFutureSignals.map((signal) => (
                <SignalCard key={signal.id} signal={signal} />
              ))
            ) : (
              <div className="text-center py-12 col-span-full text-muted-foreground">
                No premium signals available at the moment.
              </div>
            )}
          </div>
          {hasMoreFuture && (
            <div className="flex justify-center mt-8">
              <Button onClick={loadMore} variant="outline">
                Show More
              </Button>
            </div>
          )}
        </TabsContent>
        <TabsContent value="spot">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleSpotSignals.length > 0 ? (
              visibleSpotSignals.map((signal) => (
                <SignalCard key={signal.id} signal={signal} />
              ))
            ) : (
              <div className="text-center py-12 col-span-full text-muted-foreground">
                No premium signals available at the moment.
              </div>
            )}
          </div>
          {hasMoreSpot && (
            <div className="flex justify-center mt-8">
              <Button onClick={loadMore} variant="outline">
                Show More
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Recently Closed Signals Section */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold mb-8">Recently Closed Signals</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {closedSignals.length > 0 ? (
            closedSignals
              .filter(signal => {
                const selectedTab = document.querySelector('[data-state="active"][role="tab"]')?.getAttribute('value');
                return selectedTab === 'future' ? signal.marketType === 'Future' : signal.marketType === 'Spot';
              })
              .map((signal) => (
                <SignalCard key={signal.id} signal={signal} />
              ))
          ) : (
            <div className="text-center py-12 col-span-full text-muted-foreground">
              No closed signals available.
            </div>
          )}
        </div>
        {hasMoreClosed && (
          <div className="flex justify-center mt-8">
            <Button onClick={loadMoreClosed} variant="outline">
              Show More Closed Signals
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
