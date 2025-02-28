
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignalCard } from "@/components/SignalCard";
import { PendingSignals } from "@/components/PendingSignals";
import { Signal, SignalStatus } from "@/types/signal";
import { SignalSearchAndFilter } from "@/components/SignalSearchAndFilter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getAllStoredSignals } from "@/utils/signalUtils";

export default function Home() {
  const { user, subscription } = useAuth();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SignalStatus | 'all'>('all');
  const [visibleCount, setVisibleCount] = useState(12);
  const [visibleClosedCount, setVisibleClosedCount] = useState(6);
  const [selectedTab, setSelectedTab] = useState("future");

  // Fetch signals from localStorage
  useEffect(() => {
    const loadSignals = () => {
      const allSignals = getAllStoredSignals();
      
      // Filter for signals that should appear on the main page
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

      setSignals(sortedSignals);
    };

    loadSignals();
    
    // Listen for changes in localStorage from other tabs
    window.addEventListener('storage', loadSignals);
    
    return () => window.removeEventListener('storage', loadSignals);
  }, []);

  // Filter and search signals
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
    
    // Market type filter (based on selected tab)
    const matchesMarketType = 
      (selectedTab === "all") || 
      (selectedTab === "future" && signal.marketType === "Future") || 
      (selectedTab === "spot" && signal.marketType === "Spot");
    
    return matchesSearch && matchesStatus && matchesMarketType;
  });

  // Split signals by status
  const activeSignals = filteredSignals.filter(s => s.status !== 'closed' && s.status !== 'pending');
  const pendingSignals = filteredSignals.filter(s => s.status === 'pending');
  const closedSignals = filteredSignals.filter(s => s.status === 'closed');

  return (
    <div className="container py-16">
      <h1 className="text-3xl font-bold mb-8">Crypto Trading Signals</h1>
      
      <Tabs defaultValue="future" value={selectedTab} onValueChange={setSelectedTab}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <TabsList>
            <TabsTrigger value="future">Futures</TabsTrigger>
            <TabsTrigger value="spot">Spot</TabsTrigger>
            <TabsTrigger value="all">All Types</TabsTrigger>
          </TabsList>
          
          <SignalSearchAndFilter
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
          />
        </div>
        
        <TabsContent value="future" className="space-y-6">
          {/* Active Signals */}
          {activeSignals.length > 0 ? (
            <>
              <h2 className="text-2xl font-semibold">Active Signals</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeSignals.slice(0, visibleCount).map((signal) => (
                  <SignalCard key={signal.id} signal={signal} />
                ))}
              </div>
              {activeSignals.length > visibleCount && (
                <div className="flex justify-center mt-8">
                  <Button 
                    variant="outline" 
                    onClick={() => setVisibleCount(prev => prev + 6)}
                  >
                    Load More
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <h2 className="text-2xl font-semibold mb-2">No Active Signals</h2>
              <p className="text-muted-foreground">
                There are no active signals matching your filters.
              </p>
            </div>
          )}
          
          {/* Pending Signals */}
          <PendingSignals signals={filteredSignals} />
          
          {/* Closed Signals */}
          {closedSignals.length > 0 && (
            <>
              <h2 className="text-2xl font-semibold mt-16">Recently Closed Signals</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                {closedSignals.slice(0, visibleClosedCount).map((signal) => (
                  <SignalCard key={signal.id} signal={signal} />
                ))}
              </div>
              {closedSignals.length > visibleClosedCount && (
                <div className="flex justify-center mt-8">
                  <Button 
                    variant="outline" 
                    onClick={() => setVisibleClosedCount(prev => prev + 6)}
                  >
                    Load More Closed Signals
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>
        
        <TabsContent value="spot" className="space-y-6">
          {/* Active Signals */}
          {activeSignals.length > 0 ? (
            <>
              <h2 className="text-2xl font-semibold">Active Signals</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeSignals.slice(0, visibleCount).map((signal) => (
                  <SignalCard key={signal.id} signal={signal} />
                ))}
              </div>
              {activeSignals.length > visibleCount && (
                <div className="flex justify-center mt-8">
                  <Button 
                    variant="outline" 
                    onClick={() => setVisibleCount(prev => prev + 6)}
                  >
                    Load More
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <h2 className="text-2xl font-semibold mb-2">No Active Signals</h2>
              <p className="text-muted-foreground">
                There are no active signals matching your filters.
              </p>
            </div>
          )}
          
          {/* Pending Signals */}
          <PendingSignals signals={filteredSignals} />
          
          {/* Closed Signals */}
          {closedSignals.length > 0 && (
            <>
              <h2 className="text-2xl font-semibold mt-16">Recently Closed Signals</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                {closedSignals.slice(0, visibleClosedCount).map((signal) => (
                  <SignalCard key={signal.id} signal={signal} />
                ))}
              </div>
              {closedSignals.length > visibleClosedCount && (
                <div className="flex justify-center mt-8">
                  <Button 
                    variant="outline" 
                    onClick={() => setVisibleClosedCount(prev => prev + 6)}
                  >
                    Load More Closed Signals
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>
        
        <TabsContent value="all" className="space-y-6">
          {/* Active Signals */}
          {activeSignals.length > 0 ? (
            <>
              <h2 className="text-2xl font-semibold">Active Signals</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeSignals.slice(0, visibleCount).map((signal) => (
                  <SignalCard key={signal.id} signal={signal} />
                ))}
              </div>
              {activeSignals.length > visibleCount && (
                <div className="flex justify-center mt-8">
                  <Button 
                    variant="outline" 
                    onClick={() => setVisibleCount(prev => prev + 6)}
                  >
                    Load More
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <h2 className="text-2xl font-semibold mb-2">No Active Signals</h2>
              <p className="text-muted-foreground">
                There are no active signals matching your filters.
              </p>
            </div>
          )}
          
          {/* Pending Signals */}
          <PendingSignals signals={filteredSignals} />
          
          {/* Closed Signals */}
          {closedSignals.length > 0 && (
            <>
              <h2 className="text-2xl font-semibold mt-16">Recently Closed Signals</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                {closedSignals.slice(0, visibleClosedCount).map((signal) => (
                  <SignalCard key={signal.id} signal={signal} />
                ))}
              </div>
              {closedSignals.length > visibleClosedCount && (
                <div className="flex justify-center mt-8">
                  <Button 
                    variant="outline" 
                    onClick={() => setVisibleClosedCount(prev => prev + 6)}
                  >
                    Load More Closed Signals
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
