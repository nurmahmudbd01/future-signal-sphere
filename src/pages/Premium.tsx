
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignalCard } from "@/components/SignalCard";
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

  const filteredSignals = signals.filter(signal => {
    const matchesSearch = signal.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || signal.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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

      <Tabs defaultValue="future" className="w-full" onValueChange={setSelectedTab}>
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
          {closedSignals
            .filter(signal => signal.marketType === (selectedTab === 'future' ? 'Future' : 'Spot'))
            .length > 0 ? (
            closedSignals
              .filter(signal => signal.marketType === (selectedTab === 'future' ? 'Future' : 'Spot'))
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
