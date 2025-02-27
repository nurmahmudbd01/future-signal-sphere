
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignalCard } from "@/components/SignalCard";
import { Signal } from "@/types/signal";
import { PaymentMethodForm } from "@/components/admin/PaymentMethodForm";
import { PaymentRequests } from "@/components/admin/PaymentRequests";
import { collection, getDocs } from 'firebase/firestore';
import { db } from "@/lib/firebase";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateSignalId } from "@/utils/signalUtils";

export default function Admin() {
  const [activeTab, setActiveTab] = useState("signals");
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [editingMethod, setEditingMethod] = useState(null);
  const [showPaymentMethodDialog, setShowPaymentMethodDialog] = useState(false);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateSignalDialog, setShowCreateSignalDialog] = useState(false);
  const [editingSignal, setEditingSignal] = useState<Signal | null>(null);
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    const checkAccess = async () => {
      setIsLoading(true);
      try {
        // Check if user is logged in
        if (!user) {
          toast.error("Please login to access this page");
          navigate('/auth');
          return;
        }

        // Check if user is admin
        if (!isAdmin) {
          toast.error("You don't have permission to access this page");
          navigate('/');
          return;
        }

        // If we get here, user is authenticated and is an admin
        // Continue loading admin data
        await loadAdminData();
      } catch (error) {
        console.error("Error checking admin access:", error);
        toast.error("An error occurred while checking permissions");
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };

    checkAccess();
  }, [user, isAdmin, navigate]);

  const loadAdminData = async () => {
    // Load signals from localStorage
    const loadSignals = () => {
      const storedSignals = localStorage.getItem('signals');
      if (storedSignals) {
        const allSignals = JSON.parse(storedSignals);
        setSignals(allSignals.slice(-3));
      }
    };

    loadSignals();

    // Fetch payment methods
    try {
      const methodsSnapshot = await getDocs(collection(db, 'paymentMethods'));
      setPaymentMethods(methodsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      toast.error("Failed to load payment methods");
    }
  };

  const handleCreateUpdateSignal = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const signalType = formData.get('signalType') as "Buy" | "Sell";
    const marketType = formData.get('marketType') as "Future" | "Spot";
    const blockchainType = formData.get('blockchainType') as string;
    const entryPrice = formData.get('entryPrice') as string;
    const targetPrice = formData.get('targetPrice') as string;
    const stopLoss = formData.get('stopLoss') as string;
    const displayLocation = formData.get('displayLocation') as "Main" | "Premium" | "Both";
    
    let signalData: Signal;
    
    if (editingSignal) {
      // Update existing signal
      signalData = {
        ...editingSignal,
        title,
        description,
        signalType,
        marketType,
        blockchainType: blockchainType as "Bitcoin" | "Ethereum" | "Solana" | "Other",
        entryPrice,
        targetPrice,
        stopLoss,
        displayLocation
      };
    } else {
      // Create new signal
      signalData = {
        id: generateSignalId(),
        title,
        description,
        signalType,
        marketType,
        blockchainType: blockchainType as "Bitcoin" | "Ethereum" | "Solana" | "Other",
        entryPrice,
        targetPrice,
        stopLoss,
        createdAt: new Date(),
        displayLocation,
        status: "pending",
        approved: true
      };
    }
    
    // Get existing signals or initialize empty array
    const storedSignals = JSON.parse(localStorage.getItem('signals') || '[]');
    
    if (editingSignal) {
      // Update existing signal in array
      const updatedSignals = storedSignals.map((signal: Signal) => 
        signal.id === editingSignal.id ? signalData : signal
      );
      localStorage.setItem('signals', JSON.stringify(updatedSignals));
    } else {
      // Add new signal to array
      storedSignals.push(signalData);
      localStorage.setItem('signals', JSON.stringify(storedSignals));
    }
    
    // Update state and close dialog
    setSignals(storedSignals.slice(-3));
    setShowCreateSignalDialog(false);
    setEditingSignal(null);
    
    // Show success message
    toast.success(editingSignal ? "Signal updated successfully" : "Signal created successfully");
    
    // Trigger storage event for other tabs
    window.dispatchEvent(new Event('storage'));
  };

  const handleEditSignal = (signal: Signal) => {
    setEditingSignal(signal);
    setShowCreateSignalDialog(true);
  };

  const handleDeleteSignal = (signal: Signal) => {
    if (window.confirm("Are you sure you want to delete this signal?")) {
      // Get existing signals
      const storedSignals = JSON.parse(localStorage.getItem('signals') || '[]');
      
      // Filter out the signal to delete
      const updatedSignals = storedSignals.filter((s: Signal) => s.id !== signal.id);
      
      // Save updated array
      localStorage.setItem('signals', JSON.stringify(updatedSignals));
      
      // Update state
      setSignals(updatedSignals.slice(-3));
      
      // Show success message
      toast.success("Signal deleted successfully");
      
      // Trigger storage event for other tabs
      window.dispatchEvent(new Event('storage'));
    }
  };

  if (isLoading) {
    return (
      <div className="container py-16">
        <div className="flex items-center justify-center">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // If not admin, the useEffect will redirect, but we still return null as a safety
  if (!isAdmin) {
    return null;
  }

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
            <h2 className="text-2xl font-semibold">Recent Signals</h2>
            <div className="flex gap-2">
              <Button onClick={() => window.location.href = "/signals"}>
                View All Signals
              </Button>
              <Dialog open={showCreateSignalDialog} onOpenChange={setShowCreateSignalDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create Signal
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingSignal ? "Edit Signal" : "Create New Signal"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateUpdateSignal} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input 
                        id="title" 
                        name="title" 
                        defaultValue={editingSignal?.title || ""} 
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea 
                        id="description" 
                        name="description" 
                        defaultValue={editingSignal?.description || ""} 
                        required 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="signalType">Signal Type</Label>
                        <Select 
                          name="signalType" 
                          defaultValue={editingSignal?.signalType || "Buy"}
                        >
                          <SelectTrigger id="signalType">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Buy">Buy</SelectItem>
                            <SelectItem value="Sell">Sell</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="marketType">Market Type</Label>
                        <Select 
                          name="marketType" 
                          defaultValue={editingSignal?.marketType || "Future"}
                        >
                          <SelectTrigger id="marketType">
                            <SelectValue placeholder="Select market" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Future">Future</SelectItem>
                            <SelectItem value="Spot">Spot</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="blockchainType">Blockchain</Label>
                      <Select 
                        name="blockchainType" 
                        defaultValue={editingSignal?.blockchainType || "Bitcoin"}
                      >
                        <SelectTrigger id="blockchainType">
                          <SelectValue placeholder="Select blockchain" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Bitcoin">Bitcoin</SelectItem>
                          <SelectItem value="Ethereum">Ethereum</SelectItem>
                          <SelectItem value="Solana">Solana</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="entryPrice">Entry Price</Label>
                        <Input 
                          id="entryPrice" 
                          name="entryPrice" 
                          defaultValue={editingSignal?.entryPrice || ""} 
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="targetPrice">Target Price</Label>
                        <Input 
                          id="targetPrice" 
                          name="targetPrice" 
                          defaultValue={editingSignal?.targetPrice || ""} 
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="stopLoss">Stop Loss</Label>
                        <Input 
                          id="stopLoss" 
                          name="stopLoss" 
                          defaultValue={editingSignal?.stopLoss || ""} 
                          required 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="displayLocation">Display Location</Label>
                      <Select 
                        name="displayLocation" 
                        defaultValue={editingSignal?.displayLocation || "Main"}
                      >
                        <SelectTrigger id="displayLocation">
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Main">Main (Free)</SelectItem>
                          <SelectItem value="Premium">Premium Only</SelectItem>
                          <SelectItem value="Both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setShowCreateSignalDialog(false);
                          setEditingSignal(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">
                        {editingSignal ? "Update Signal" : "Create Signal"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {signals.map((signal) => (
              <SignalCard 
                key={signal.id} 
                signal={signal}
                isAdmin
                onEdit={handleEditSignal}
                onDelete={handleDeleteSignal}
              />
            ))}
            {signals.length === 0 && (
              <p className="text-center col-span-full py-8 text-muted-foreground">
                No signals available.
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="payments">
          <PaymentRequests />
        </TabsContent>

        <TabsContent value="methods">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Payment Methods</h2>
              <Dialog open={showPaymentMethodDialog} onOpenChange={setShowPaymentMethodDialog}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingMethod(null)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Payment Method
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingMethod ? "Edit Payment Method" : "Add Payment Method"}
                    </DialogTitle>
                  </DialogHeader>
                  <PaymentMethodForm
                    editingMethod={editingMethod}
                    onSuccess={() => {
                      setShowPaymentMethodDialog(false);
                      const fetchPaymentMethods = async () => {
                        try {
                          const methodsSnapshot = await getDocs(collection(db, 'paymentMethods'));
                          setPaymentMethods(methodsSnapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                          })));
                        } catch (error) {
                          console.error("Error fetching payment methods:", error);
                          toast.error("Failed to load payment methods");
                        }
                      };
                      fetchPaymentMethods();
                    }}
                    onCancel={() => setShowPaymentMethodDialog(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-6">
              {paymentMethods.map((method) => (
                <Card key={method.id}>
                  <CardHeader>
                    <CardTitle>{method.name}</CardTitle>
                    <CardDescription>Type: {method.type}</CardDescription>
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
