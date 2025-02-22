import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, TrendingUp, Activity, Target } from "lucide-react";
import { SignalCard } from "@/components/SignalCard";
import { Signal, SignalStatus } from "@/types/signal";
import { getAllStoredSignals } from "@/utils/signalUtils";
import { SignalSearchAndFilter } from "@/components/SignalSearchAndFilter";

export default function Home() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SignalStatus | 'all'>('all');
  const [visibleCount, setVisibleCount] = useState(12);

  useEffect(() => {
    const loadSignals = () => {
      const allSignals = getAllStoredSignals();
      console.log('All signals retrieved:', allSignals);

      // Filter signals for main page
      const mainSignals = allSignals.filter(signal => {
        console.log('Checking signal:', signal);
        const isMainOrBoth = signal.displayLocation === "Main" || signal.displayLocation === "Both";
        const isApproved = signal.approved === true;
        return isMainOrBoth && isApproved;
      });

      console.log('Filtered main signals:', mainSignals);

      // Sort signals: active first, then by date
      const sortedSignals = [...mainSignals].sort((a, b) => {
        if (a.status === 'closed' && b.status !== 'closed') return 1;
        if (a.status !== 'closed' && b.status === 'closed') return -1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      console.log('Sorted signals:', sortedSignals);
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

  const visibleFutureSignals = filteredSignals
    .filter(signal => signal.marketType === "Future")
    .slice(0, visibleCount);
  
  const visibleSpotSignals = filteredSignals
    .filter(signal => signal.marketType === "Spot")
    .slice(0, visibleCount);

  const hasMoreFuture = filteredSignals.filter(s => s.marketType === "Future").length > visibleCount;
  const hasMoreSpot = filteredSignals.filter(s => s.marketType === "Spot").length > visibleCount;

  const loadMore = () => {
    setVisibleCount(prev => prev + 6);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background to-accent/20" />
        <div className="container relative z-10">
          <div className="text-center space-y-4 animate-fadeIn">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Expert Trading Signals
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Get ahead in the market with our professional crypto trading signals for futures and spot trading.
            </p>
            <div className="flex justify-center gap-4 mt-8">
              <Button asChild size="lg">
                <Link to="/premium">
                  Try Premium <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="bg-card p-6 rounded-lg border shadow-sm">
              <TrendingUp className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Accurate Signals</h3>
              <p className="text-muted-foreground">
                High-precision trading signals backed by expert analysis.
              </p>
            </div>
            <div className="bg-card p-6 rounded-lg border shadow-sm">
              <Activity className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Real-time Updates</h3>
              <p className="text-muted-foreground">
                Get instant notifications for new trading opportunities.
              </p>
            </div>
            <div className="bg-card p-6 rounded-lg border shadow-sm">
              <Target className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Clear Targets</h3>
              <p className="text-muted-foreground">
                Precise entry, target, and stop-loss points for every trade.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container">
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
                    No signals available at the moment.
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
                    No signals available at the moment.
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
        </div>
      </section>
    </div>
  );
}
