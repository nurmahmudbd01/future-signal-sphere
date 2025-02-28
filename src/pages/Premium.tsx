
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignalCard } from "@/components/SignalCard";
import { PendingSignals } from "@/components/PendingSignals";
import { Signal, SignalStatus } from "@/types/signal";
import { SignalSearchAndFilter } from "@/components/SignalSearchAndFilter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createPaymentRequest, PaymentMethod, getPaymentMethods } from "@/lib/firebase";
import { getAllStoredSignals } from "@/utils/signalUtils";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function Premium() {
  const { user, subscription } = useAuth();
  const { toast } = useToast();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SignalStatus | 'all'>('all');
  const [visibleCount, setVisibleCount] = useState(12);
  const [visibleClosedCount, setVisibleClosedCount] = useState(6);
  const [selectedTab, setSelectedTab] = useState("future");

  // Fetch premium signals
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

  // Fetch payment methods
  const { data: paymentMethods, isLoading: isLoadingPaymentMethods } = useQuery({
    queryKey: ['paymentMethods'],
    queryFn: getPaymentMethods,
    // Prevent refetching if user is not logged in
    enabled: !!user
  });

  // If not logged in, show login prompt
  if (!user) {
    return (
      <div className="container py-16 text-center">
        <h1 className="text-3xl font-bold mb-4">Premium Access Required</h1>
        <p className="mb-6">Please log in to access premium signals.</p>
        <Link to="/auth">
          <Button>Login / Register</Button>
        </Link>
      </div>
    );
  }

  // If not premium, show upgrade options
  if (!subscription?.isPremium) {
    return (
      <div className="container py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Upgrade to Premium</h1>
          <p className="mb-8 text-muted-foreground">
            Get access to exclusive premium signals and advanced features.
          </p>
          
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Premium Membership</CardTitle>
              <CardDescription>30 days access to premium signals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold mb-4">$49.99</div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                  Access to all premium signals
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                  Early access to new signals
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                  Priority support
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full">Subscribe Now</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Payment Methods</DialogTitle>
                    <DialogDescription>
                      Choose your preferred payment method to proceed.
                    </DialogDescription>
                  </DialogHeader>
                  
                  {isLoadingPaymentMethods ? (
                    <div className="py-4 text-center">Loading payment methods...</div>
                  ) : paymentMethods && paymentMethods.length > 0 ? (
                    <div className="space-y-4 py-4">
                      {paymentMethods.map((method: PaymentMethod) => (
                        <Card key={method.id} className="cursor-pointer hover:bg-accent">
                          <CardHeader>
                            <CardTitle className="text-lg">{method.name}</CardTitle>
                            <CardDescription>{method.instructions}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <p className="font-mono bg-muted p-2 rounded">{method.accountDetails}</p>
                          </CardContent>
                          <CardFooter>
                            <form 
                              className="w-full space-y-4"
                              onSubmit={async (e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                const transactionId = formData.get('transactionId') as string;
                                const message = formData.get('message') as string;

                                try {
                                  await createPaymentRequest(
                                    user.uid,
                                    method.id,
                                    transactionId,
                                    49.99,
                                    message
                                  );
                                  toast({
                                    title: "Payment Request Submitted",
                                    description: "We'll review your payment and activate your premium access soon.",
                                  });
                                } catch (error) {
                                  toast({
                                    variant: "destructive",
                                    title: "Error",
                                    description: "Failed to submit payment request. Please try again.",
                                  });
                                }
                              }}
                            >
                              <div className="space-y-2">
                                <Label htmlFor="transactionId">Transaction ID</Label>
                                <Input 
                                  id="transactionId" 
                                  name="transactionId" 
                                  required 
                                  placeholder="Enter your transaction ID"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="message">Message (Optional)</Label>
                                <Input 
                                  id="message" 
                                  name="message" 
                                  placeholder="Any additional information"
                                />
                              </div>
                              <Button type="submit" className="w-full">
                                Submit Payment
                              </Button>
                            </form>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="py-4 text-center text-muted-foreground">
                      No payment methods available. Please contact support.
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

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
    
    // Market type filter
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Premium Signals</h1>
          <p className="text-muted-foreground mt-2">
            Exclusive signals available only to premium members
          </p>
        </div>
        <div className="mt-4 md:mt-0 p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
          <div className="text-sm font-medium text-green-600">
            Premium access expires on {new Date(subscription.expiresAt!).toLocaleDateString()}
          </div>
        </div>
      </div>
      
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
              <h2 className="text-2xl font-semibold">Active Premium Signals</h2>
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
              <h2 className="text-2xl font-semibold mb-2">No Active Premium Signals</h2>
              <p className="text-muted-foreground">
                There are no active premium signals matching your filters.
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
              <h2 className="text-2xl font-semibold">Active Premium Signals</h2>
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
              <h2 className="text-2xl font-semibold mb-2">No Active Premium Signals</h2>
              <p className="text-muted-foreground">
                There are no active premium signals matching your filters.
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
              <h2 className="text-2xl font-semibold">Active Premium Signals</h2>
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
              <h2 className="text-2xl font-semibold mb-2">No Active Premium Signals</h2>
              <p className="text-muted-foreground">
                There are no active premium signals matching your filters.
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
