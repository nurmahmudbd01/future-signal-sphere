import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Pencil, Trash2, DollarSign, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { SignalCard } from "@/components/SignalCard";
import { generateSignalId } from "@/utils/signalUtils";
import { Signal, SignalStatus } from "@/types/signal";
import { SignalSearchAndFilter } from "@/components/SignalSearchAndFilter";
import { collection, addDoc, updateDoc, doc, deleteDoc, query, where, getDocs, getFirestore, getDoc } from 'firebase/firestore';
import { db } from "@/lib/firebase";

// Payment method form schema
const paymentMethodSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["crypto", "bkash", "local"]),
  instructions: z.string().min(1, "Instructions are required"),
  accountDetails: z.string().min(1, "Account details are required"),
});

// Signal form schema
const signalFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  signalType: z.enum(["Buy", "Sell"]),
  marketType: z.enum(["Future", "Spot"]),
  blockchainType: z.enum(["Bitcoin", "Ethereum", "Solana", "Other"]),
  entryPrice: z.string().min(1, "Entry price is required"),
  targetPrice: z.string().min(1, "Target price is required"),
  stopLoss: z.string().min(1, "Stop loss is required"),
  displayLocation: z.enum(["Main", "Premium", "Both"]),
});

type FormValues = z.infer<typeof signalFormSchema>;

export default function Admin() {
  const [activeTab, setActiveTab] = useState("signals");
  const [paymentRequests, setPaymentRequests] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);
  const [showPaymentMethodDialog, setShowPaymentMethodDialog] = useState(false);
  const [open, setOpen] = useState(false);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [editingSignal, setEditingSignal] = useState<Signal | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SignalStatus | 'all'>('all');
  const [visibleCount, setVisibleCount] = useState(12);

  // Payment method form
  const paymentMethodForm = useForm({
    resolver: zodResolver(paymentMethodSchema),
    defaultValues: {
      name: "",
      type: "crypto",
      instructions: "",
      accountDetails: "",
    },
  });

  // Signal form
  const signalForm = useForm<FormValues>({
    resolver: zodResolver(signalFormSchema),
    defaultValues: editingSignal ? {
      title: editingSignal.title,
      description: editingSignal.description,
      signalType: editingSignal.signalType,
      marketType: editingSignal.marketType,
      blockchainType: editingSignal.blockchainType,
      entryPrice: editingSignal.entryPrice,
      targetPrice: editingSignal.targetPrice,
      stopLoss: editingSignal.stopLoss,
      displayLocation: editingSignal.displayLocation,
    } : {
      title: "",
      description: "",
      signalType: "Buy",
      marketType: "Future",
      blockchainType: "Bitcoin",
      entryPrice: "",
      targetPrice: "",
      stopLoss: "",
      displayLocation: "Main",
    },
  });

  useEffect(() => {
    const loadSignals = () => {
      const storedSignals = localStorage.getItem('signals');
      if (storedSignals) {
        const parsedSignals = JSON.parse(storedSignals);
        setSignals(parsedSignals);
      }
    };

    loadSignals();
    window.addEventListener('storage', loadSignals);
    return () => window.removeEventListener('storage', loadSignals);
  }, []);

  // Fetch payment methods and requests
  const fetchPaymentData = async () => {
    const methodsSnapshot = await getDocs(collection(db, 'paymentMethods'));
    const methods = methodsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setPaymentMethods(methods);

    const requestsSnapshot = await getDocs(
      query(collection(db, 'paymentRequests'), where('status', '==', 'pending'))
    );
    const requests = requestsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setPaymentRequests(requests);
  };

  useEffect(() => {
    fetchPaymentData();
  }, []);

  // Handle payment method submission
  const onPaymentMethodSubmit = async (data) => {
    setIsLoading(true);
    try {
      if (editingMethod) {
        await updateDoc(doc(db, 'paymentMethods', editingMethod.id), {
          ...data,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await addDoc(collection(db, 'paymentMethods'), {
          ...data,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      toast.success(editingMethod ? "Payment method updated" : "Payment method created");
      setShowPaymentMethodDialog(false);
      paymentMethodForm.reset();
      fetchPaymentData();
    } catch (error) {
      toast.error("Failed to save payment method");
    }
    setIsLoading(false);
  };

  // Handle payment approval
  const handlePaymentApproval = async (requestId, status) => {
    try {
      const requestRef = doc(db, 'paymentRequests', requestId);
      const requestDoc = await getDoc(requestRef);
      const request = requestDoc.data();

      await updateDoc(requestRef, {
        status,
        updatedAt: new Date().toISOString(),
      });

      if (status === 'approved') {
        // Update user's premium status
        const userRef = doc(db, 'users', request.userId);
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 1); // Add 1 month

        await updateDoc(userRef, {
          premiumExpiresAt: expiryDate.toISOString(),
        });
      }

      toast.success(`Payment ${status}`);
      fetchPaymentData();
    } catch (error) {
      toast.error("Failed to update payment status");
    }
  };

  function onSignalSubmit(values: FormValues) {
    const newSignal: Signal = {
      id: editingSignal?.id || generateSignalId(),
      createdAt: editingSignal?.createdAt || new Date(),
      status: editingSignal?.status || "active",
      approved: true,
      title: values.title,
      description: values.description,
      signalType: values.signalType,
      marketType: values.marketType,
      blockchainType: values.blockchainType,
      entryPrice: values.entryPrice,
      targetPrice: values.targetPrice,
      stopLoss: values.stopLoss,
      displayLocation: values.displayLocation,
      profitLoss: editingSignal?.profitLoss,
    };

    let updatedSignals;
    if (editingSignal) {
      updatedSignals = signals.map(signal => 
        signal.id === editingSignal.id ? newSignal : signal
      );
      toast.success("Signal updated successfully!");
    } else {
      updatedSignals = [...signals, newSignal];
      toast.success("Signal created successfully!");
    }

    localStorage.setItem('signals', JSON.stringify(updatedSignals));
    setSignals(updatedSignals);
    setOpen(false);
    signalForm.reset();
    setEditingSignal(null);

    window.dispatchEvent(new Event('storage'));
  }

  const handleEdit = (signal: Signal) => {
    setEditingSignal(signal);
    signalForm.reset({
      title: signal.title,
      description: signal.description,
      signalType: signal.signalType,
      marketType: signal.marketType,
      blockchainType: signal.blockchainType,
      entryPrice: signal.entryPrice,
      targetPrice: signal.targetPrice,
      stopLoss: signal.stopLoss,
      displayLocation: signal.displayLocation,
    });
    setOpen(true);
  };

  const handleDelete = (signalToDelete: Signal) => {
    const updatedSignals = signals.filter(signal => signal.id !== signalToDelete.id);
    setSignals(updatedSignals);
    localStorage.setItem('signals', JSON.stringify(updatedSignals));
    toast.success("Signal deleted successfully!");
    
    window.dispatchEvent(new Event('storage'));
  };

  const filteredSignals = signals.filter(signal => {
    const matchesSearch = signal.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || signal.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const visibleSignals = filteredSignals.slice(0, visibleCount);
  const hasMore = filteredSignals.length > visibleCount;

  const loadMore = () => {
    setVisibleCount(prev => prev + 6);
  };

  return (
    <div className="container py-16">
      <Tabs defaultValue="signals" value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <TabsList>
            <TabsTrigger value="signals">Signals</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="methods">Payment Methods</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="signals">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Signal Management</h1>
            <Dialog open={open} onOpenChange={(newOpen) => {
              setOpen(newOpen);
              if (!newOpen) {
                setEditingSignal(null);
                signalForm.reset();
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  New Signal
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingSignal ? "Edit Signal" : "Create New Signal"}</DialogTitle>
                  <DialogDescription>
                    Fill in the details below to {editingSignal ? "update the" : "create a new"} trading signal.
                  </DialogDescription>
                </DialogHeader>
                <Form {...signalForm}>
                  <form onSubmit={signalForm.handleSubmit(onSignalSubmit)} className="space-y-6">
                    <FormField
                      control={signalForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter signal title" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signalForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Enter signal description" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={signalForm.control}
                        name="signalType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Signal Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select signal type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Buy">Buy</SelectItem>
                                <SelectItem value="Sell">Sell</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={signalForm.control}
                        name="marketType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Market Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select market type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Future">Future</SelectItem>
                                <SelectItem value="Spot">Spot</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={signalForm.control}
                      name="blockchainType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Blockchain</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select blockchain" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Bitcoin">Bitcoin</SelectItem>
                              <SelectItem value="Ethereum">Ethereum</SelectItem>
                              <SelectItem value="Solana">Solana</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={signalForm.control}
                        name="entryPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Entry Price</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.00000001" placeholder="0.00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={signalForm.control}
                        name="targetPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Target Price</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.00000001" placeholder="0.00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={signalForm.control}
                        name="stopLoss"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Stop Loss</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.00000001" placeholder="0.00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={signalForm.control}
                      name="displayLocation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Location</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select display location" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Main">Main</SelectItem>
                              <SelectItem value="Premium">Premium</SelectItem>
                              <SelectItem value="Both">Both</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full">
                      {editingSignal ? "Update Signal" : "Create Signal"}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <SignalSearchAndFilter
            onSearchChange={setSearchQuery}
            onStatusFilter={setStatusFilter}
            selectedStatus={statusFilter}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleSignals.length > 0 ? (
              visibleSignals.map((signal) => (
                <div key={signal.id} className="relative group">
                  <SignalCard signal={signal} isAdmin onEdit={handleEdit} onDelete={handleDelete} />
                  <div className="absolute top-2 right-2 hidden group-hover:flex gap-2">
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={() => handleEdit(signal)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDelete(signal)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 col-span-full text-muted-foreground">
                No signals found.
              </div>
            )}
          </div>
          
          {hasMore && (
            <div className="flex justify-center mt-8">
              <Button onClick={loadMore} variant="outline">
                Show More
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="payments">
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Payment Requests</h2>
            <div className="grid gap-6">
              {paymentRequests.map((request) => (
                <Card key={request.id}>
                  <CardHeader>
                    <CardTitle>Payment Request #{request.id}</CardTitle>
                    <CardDescription>
                      Submitted on {new Date(request.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p><strong>Amount:</strong> ${request.amount}</p>
                      <p><strong>Transaction ID:</strong> {request.transactionId}</p>
                      <p><strong>User ID:</strong> {request.userId}</p>
                      {request.message && (
                        <p><strong>Message:</strong> {request.message}</p>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="space-x-2">
                    <Button
                      variant="default"
                      onClick={() => handlePaymentApproval(request.id, 'approved')}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handlePaymentApproval(request.id, 'rejected')}
                    >
                      Reject
                    </Button>
                  </CardFooter>
                </Card>
              ))}
              {paymentRequests.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No pending payment requests.
                </p>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="methods">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Payment Methods</h2>
              <Dialog open={showPaymentMethodDialog} onOpenChange={setShowPaymentMethodDialog}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setEditingMethod(null);
                    paymentMethodForm.reset();
                  }}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Payment Method
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingMethod ? "Edit Payment Method" : "Add Payment Method"}
                    </DialogTitle>
                    <DialogDescription>
                      Configure the payment method details below.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...paymentMethodForm}>
                    <form onSubmit={paymentMethodForm.handleSubmit(onPaymentMethodSubmit)} className="space-y-4">
                      <FormField
                        control={paymentMethodForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Bitcoin Payment" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={paymentMethodForm.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select payment type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="crypto">Cryptocurrency</SelectItem>
                                <SelectItem value="bkash">bKash</SelectItem>
                                <SelectItem value="local">Local Payment</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={paymentMethodForm.control}
                        name="instructions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Payment Instructions</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Enter payment instructions..."
                                className="min-h-[100px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={paymentMethodForm.control}
                        name="accountDetails"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account Details</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Wallet address or account number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? "Saving..." : (editingMethod ? "Update Method" : "Add Method")}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-6">
              {paymentMethods.map((method) => (
                <Card key={method.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{method.name}</CardTitle>
                        <CardDescription>Type: {method.type}</CardDescription>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingMethod(method);
                            paymentMethodForm.reset({
                              name: method.name,
                              type: method.type,
                              instructions: method.instructions,
                              accountDetails: method.accountDetails,
                            });
                            setShowPaymentMethodDialog(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            if (confirm('Are you sure you want to delete this payment method?')) {
                              await deleteDoc(doc(db, 'paymentMethods', method.id));
                              toast.success("Payment method deleted");
                              fetchPaymentData();
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <strong>Instructions:</strong>
                        <p className="text-muted-foreground">{method.instructions}</p>
                      </div>
                      <div>
                        <strong>Account Details:</strong>
                        <p className="font-mono bg-muted p-2 rounded mt-1">
                          {method.accountDetails}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {paymentMethods.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No payment methods configured.
                </p>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
