import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignalCard } from "@/components/SignalCard";
import { PendingSignals } from "@/components/PendingSignals";
import { Signal, SignalStatus } from "@/types/signal";
import { SignalSearchAndFilter } from "@/components/SignalSearchAndFilter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { createPaymentRequest, PaymentMethod, getPaymentMethods } from "@/lib/firebase";
import { getAllStoredSignals } from "@/utils/signalUtils";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Loader2, CreditCard, ArrowRight, Clock } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function Premium() {
  const { user, subscription } = useAuth();
  const { toast } = useToast();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SignalStatus | 'all'>('all');
  const [visibleCount, setVisibleCount] = useState(12);
  const [visibleClosedCount, setVisibleClosedCount] = useState(6);
  const [selectedTab, setSelectedTab] = useState("future");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [paymentStep, setPaymentStep] = useState<'methods' | 'details' | 'success'>('methods');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Reset payment dialog state when it's closed
  useEffect(() => {
    if (!paymentDialogOpen) {
      setTimeout(() => {
        setSelectedMethod(null);
        setPaymentStep('methods');
      }, 300); // Small delay to avoid visual glitches during close animation
    }
  }, [paymentDialogOpen]);

  // Fetch payment methods
  const { data: paymentMethods, isLoading: isLoadingPaymentMethods } = useQuery({
    queryKey: ['paymentMethods'],
    queryFn: getPaymentMethods,
    enabled: !!user
  });

  const handlePaymentMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setPaymentStep('details');
  };

  const handlePaymentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!selectedMethod || !user) return;
    
    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    const transactionId = formData.get('transactionId') as string;
    const message = formData.get('message') as string;

    try {
      await createPaymentRequest(
        user.uid,
        selectedMethod.id,
        transactionId,
        49.99,
        message
      );
      
      setPaymentStep('success');
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
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold mb-4">Upgrade to Premium</h1>
            <p className="text-muted-foreground">
              Get access to exclusive premium signals and advanced features.
            </p>
          </div>
          
          <Card className="mb-8 shadow-lg border-blue-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-1"></div>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl">Premium Membership</CardTitle>
              <CardDescription>30 days access to premium signals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold mb-6 text-blue-600">$49.99</div>
              <div className="space-y-3 mb-8">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-3 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Access to all premium signals</p>
                    <p className="text-sm text-muted-foreground">Get exclusive signals not available to free users</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-3 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Early access to new signals</p>
                    <p className="text-sm text-muted-foreground">Be the first to receive our most profitable trading opportunities</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-3 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Priority support</p>
                    <p className="text-sm text-muted-foreground">Get faster responses from our team when you need help</p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 border-t">
              <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full" size="lg">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Subscribe Now
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  {paymentStep === 'methods' && (
                    <>
                      <DialogHeader>
                        <DialogTitle>Choose Payment Method</DialogTitle>
                        <DialogDescription>
                          Select your preferred way to complete your purchase.
                        </DialogDescription>
                      </DialogHeader>
                      
                      {isLoadingPaymentMethods ? (
                        <div className="py-10 text-center">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
                          <p className="text-muted-foreground">Loading payment methods...</p>
                        </div>
                      ) : paymentMethods && paymentMethods.length > 0 ? (
                        <div className="pt-4">
                          <RadioGroup className="space-y-4">
                            {paymentMethods.map((method: PaymentMethod) => (
                              <div
                                key={method.id}
                                className="flex items-center space-x-2 rounded-lg border p-4 cursor-pointer hover:bg-accent transition-colors"
                                onClick={() => handlePaymentMethodSelect(method)}
                              >
                                <RadioGroupItem value={method.id} id={method.id} className="cursor-pointer" />
                                <div className="flex flex-col space-y-1 flex-1">
                                  <Label htmlFor={method.id} className="text-base font-medium cursor-pointer">{method.name}</Label>
                                  <p className="text-sm text-muted-foreground">{method.instructions.split('.')[0]}.</p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                              </div>
                            ))}
                          </RadioGroup>
                        </div>
                      ) : (
                        <div className="py-10 text-center">
                          <p className="text-muted-foreground">
                            No payment methods available. Please contact support.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                  
                  {paymentStep === 'details' && selectedMethod && (
                    <>
                      <DialogHeader>
                        <DialogTitle>Complete Your Payment</DialogTitle>
                        <DialogDescription>
                          Follow the instructions below to complete your payment.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4 py-4">
                        <div className="rounded-lg bg-muted p-4 space-y-3">
                          <h3 className="font-medium">{selectedMethod.name} Payment Instructions</h3>
                          <p className="text-sm text-muted-foreground whitespace-pre-line">{selectedMethod.instructions}</p>
                          
                          <div className="bg-background border rounded-md p-3 font-mono text-sm overflow-x-auto">
                            {selectedMethod.accountDetails}
                          </div>
                        </div>
                        
                        <form id="payment-form" onSubmit={handlePaymentSubmit} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="transactionId" className="font-medium">Transaction ID <span className="text-red-500">*</span></Label>
                            <Input 
                              id="transactionId" 
                              name="transactionId" 
                              required 
                              placeholder="Enter the transaction ID from your payment"
                              className="transition-shadow focus-visible:shadow-md"
                            />
                            <p className="text-xs text-muted-foreground">This is the unique identifier for your payment transaction</p>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="message" className="font-medium">Additional Information</Label>
                            <Textarea 
                              id="message" 
                              name="message" 
                              placeholder="Any details you'd like us to know about your payment"
                              className="transition-shadow focus-visible:shadow-md resize-none"
                              rows={3}
                            />
                          </div>
                          
                          <div className="pt-2 flex space-x-2">
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={() => setPaymentStep('methods')}
                              disabled={isSubmitting}
                              className="flex-1"
                            >
                              Back
                            </Button>
                            <Button type="submit" className="flex-1" disabled={isSubmitting}>
                              {isSubmitting ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                "Submit Payment"
                              )}
                            </Button>
                          </div>
                        </form>
                      </div>
                    </>
                  )}
                  
                  {paymentStep === 'success' && (
                    <>
                      <DialogHeader>
                        <DialogTitle className="text-center flex flex-col items-center">
                          <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                          Payment Request Submitted
                        </DialogTitle>
                      </DialogHeader>
                      
                      <div className="space-y-4 py-6 text-center">
                        <p>
                          Thank you for your payment request. We've received your information and will process it shortly.
                        </p>
                        
                        <div className="rounded-lg bg-muted p-4 text-left">
                          <div className="flex items-start space-x-3 mb-3">
                            <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                              <h4 className="font-medium">What happens next?</h4>
                              <p className="text-sm text-muted-foreground">Our team will verify your payment and activate your premium access, usually within 24 hours.</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start space-x-3">
                            <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                              <h4 className="font-medium">Payment details</h4>
                              <p className="text-sm text-muted-foreground">You can view your payment history and status in your profile page.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <DialogFooter className="flex sm:justify-center">
                        <Button onClick={() => setPaymentDialogOpen(false)}>
                          Close
                        </Button>
                      </DialogFooter>
                    </>
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
            onSearchQueryChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
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
