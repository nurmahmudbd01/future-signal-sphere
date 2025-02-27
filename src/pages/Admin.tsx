
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

export default function Admin() {
  const [activeTab, setActiveTab] = useState("signals");
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [editingMethod, setEditingMethod] = useState(null);
  const [showPaymentMethodDialog, setShowPaymentMethodDialog] = useState(false);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
            <Button onClick={() => window.location.href = "/signals"}>
              View All Signals
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {signals.map((signal) => (
              <SignalCard 
                key={signal.id} 
                signal={signal}
                isAdmin
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
