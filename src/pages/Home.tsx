import { useState, useEffect } from "react";
import { SignalCard } from "@/components/SignalCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Signal, SignalStatus } from "@/types/signal";
import { SignalSearchAndFilter } from "@/components/SignalSearchAndFilter";
import { toast } from "sonner";
import { PendingSignals } from "@/components/PendingSignals";
import { getAllStoredSignals } from "@/utils/signalUtils";

export default function Home() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SignalStatus | "all">('all');
  const [visibleCount, setVisibleCount] = useState(6);
  const [visibleClosedCount, setVisibleClosedCount] = useState(3);

  useEffect(() => {
    const loadSignals = () => {
      console.log("Loading signals...");
      const allSignals = getAllStoredSignals();
      
      // Filter for main page (only show Main or Both signals)
      const mainSignals = allSignals.filter(signal => {
        const isMainOrBoth = signal.displayLocation === "Main" || signal.displayLocation === "Both";
        const isApproved = signal.approved === true;
        return isMainOrBoth && isApproved;
      });
      
      // Sort signals: active first, then by date
      const sortedSignals = [...mainSignals].sort((a, b) => {
        if (a.status === 'closed' && b.status !== 'closed') return 1;
        if (a.status !== 'closed' && b.status === 'closed') return -1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      console.log(`Found ${sortedSignals.length} signals for home page`);
      setSignals(sortedSignals);
    };
    
    loadSignals();
    
    // Add storage event listener to update signals when they change
    window.addEventListener('storage', loadSignals);
    
    // Clean up event listener on component unmount
    return () => window.removeEventListener('storage', loadSignals);
  }, []);

  // Filter signals based on search and status
  const filteredSignals = signals.filter(signal => {
    // Filter by search query
    const matchesSearch = 
      searchQuery === "" || 
      signal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      signal.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filter by status
    const matchesStatus = 
      statusFilter === 'all' || 
      signal.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Split signals by status
  const activeSignals = filteredSignals.filter(s => s.status !== 'closed' && s.status !== 'pending');
  const pendingSignals = filteredSignals.filter(s => s.status === 'pending');
  const closedSignals = filteredSignals.filter(s => s.status === 'closed');

  return (
    <div className="container py-16">
      <h1 className="text-3xl font-bold mb-8">Trading Signals</h1>
      
      <Tabs defaultValue="all">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <TabsList>
            <TabsTrigger value="all">All Signals</TabsTrigger>
            <TabsTrigger value="futures">Futures</TabsTrigger>
            <TabsTrigger value="spot">Spot</TabsTrigger>
          </TabsList>
          
          <SignalSearchAndFilter
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />
        </div>
        
        <TabsContent value="all" className="space-y-6">
          {/* Active Signals */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Active Signals</h2>
            {activeSignals.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeSignals.slice(0, visibleCount).map((signal) => (
                    <SignalCard key={signal.id} signal={signal} />
                  ))}
                </div>
                {activeSignals.length > visibleCount && (
                  <div className="flex justify-center mt-8">
                    <Button 
                      variant="outline" 
                      onClick={() => setVisibleCount(prev => prev + 3)}
                    >
                      Load More
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No active signals available.
              </p>
            )}
          </div>
          
          {/* Pending Signals */}
          <PendingSignals signals={filteredSignals} />
          
          {/* Closed Signals */}
          {closedSignals.length > 0 && (
            <div className="space-y-4 mt-10">
              <h2 className="text-2xl font-semibold">Closed Signals</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {closedSignals.slice(0, visibleClosedCount).map((signal) => (
                  <SignalCard key={signal.id} signal={signal} />
                ))}
              </div>
              {closedSignals.length > visibleClosedCount && (
                <div className="flex justify-center mt-8">
                  <Button 
                    variant="outline" 
                    onClick={() => setVisibleClosedCount(prev => prev + 3)}
                  >
                    View More Closed Signals
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>
        
        {/* Other tabs have similar content with filtered signals */}
        <TabsContent value="futures" className="space-y-6">
          {/* ... same structure as "all" tab but with filtered signals */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Futures Signals</h2>
            {activeSignals.filter(s => s.marketType === "Future").length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeSignals
                  .filter(s => s.marketType === "Future")
                  .slice(0, visibleCount)
                  .map((signal) => (
                    <SignalCard key={signal.id} signal={signal} />
                  ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No active futures signals available.
              </p>
            )}
          </div>
          
          {/* Pending Signals */}
          <PendingSignals signals={filteredSignals.filter(s => s.marketType === "Future")} />
          
          {/* Closed Signals */}
          {closedSignals.filter(s => s.marketType === "Future").length > 0 && (
            <div className="space-y-4 mt-10">
              <h2 className="text-2xl font-semibold">Closed Futures Signals</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {closedSignals
                  .filter(s => s.marketType === "Future")
                  .slice(0, visibleClosedCount)
                  .map((signal) => (
                    <SignalCard key={signal.id} signal={signal} />
                  ))}
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="spot" className="space-y-6">
          {/* ... same structure as "all" tab but with filtered signals */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Spot Signals</h2>
            {activeSignals.filter(s => s.marketType === "Spot").length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeSignals
                  .filter(s => s.marketType === "Spot")
                  .slice(0, visibleCount)
                  .map((signal) => (
                    <SignalCard key={signal.id} signal={signal} />
                  ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No active spot signals available.
              </p>
            )}
          </div>
          
          {/* Pending Signals */}
          <PendingSignals signals={filteredSignals.filter(s => s.marketType === "Spot")} />
          
          {/* Closed Signals */}
          {closedSignals.filter(s => s.marketType === "Spot").length > 0 && (
            <div className="space-y-4 mt-10">
              <h2 className="text-2xl font-semibold">Closed Spot Signals</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {closedSignals
                  .filter(s => s.marketType === "Spot")
                  .slice(0, visibleClosedCount)
                  .map((signal) => (
                    <SignalCard key={signal.id} signal={signal} />
                  ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
