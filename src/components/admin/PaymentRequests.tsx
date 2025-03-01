import { useState, useEffect } from "react";
import { collection, query, where, getDocs, updateDoc, doc, getDoc, DocumentData, Timestamp, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface UserData {
  id: string;
  username: string;
  paymentHistory?: PaymentHistory[];
  [key: string]: any;
}

interface PaymentHistory {
  requestId: string;
  amount: number;
  transactionId: string;
  date: string;
  status: 'approved' | 'rejected';
}

interface PaymentRequest {
  id: string;
  userId: string;
  amount: number;
  paymentMethodId: string;
  transactionId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
  message?: string;
  user?: UserData;
}

export function PaymentRequests() {
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      console.log("Fetching payment requests...");
      
      const requestsSnapshot = await getDocs(
        query(
          collection(db, 'paymentRequests'),
          orderBy('createdAt', 'desc')
        )
      );
      
      console.log(`Found ${requestsSnapshot.docs.length} payment requests`);
      
      const requestsData: PaymentRequest[] = [];
      
      for (const docSnapshot of requestsSnapshot.docs) {
        const request = { 
          id: docSnapshot.id, 
          ...docSnapshot.data() 
        } as PaymentRequest;
        
        console.log(`Processing request ${request.id}`);
        
        if (request.userId) {
          try {
            const userDoc = await getDoc(doc(db, 'users', request.userId));
            
            if (userDoc.exists()) {
              const userData = userDoc.data() as DocumentData;
              requestsData.push({
                ...request,
                user: { 
                  id: userDoc.id, 
                  username: userData.username || "Unknown User",
                  ...userData 
                }
              });
              console.log(`Added request ${request.id} with user data`);
            } else {
              requestsData.push({
                ...request,
                user: {
                  id: request.userId,
                  username: "Unknown User"
                }
              });
              console.log(`Added request ${request.id} with unknown user`);
            }
          } catch (error) {
            console.error(`Error fetching user data for request ${request.id}:`, error);
            requestsData.push({
              ...request,
              user: {
                id: request.userId,
                username: "Error Loading User"
              }
            });
          }
        } else {
          requestsData.push(request);
          console.log(`Added request ${request.id} without user ID`);
        }
      }
      
      setRequests(requestsData);
      console.log(`Successfully loaded ${requestsData.length} payment requests`);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("Failed to load payment requests");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    
    const intervalId = setInterval(fetchRequests, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  const handleApproval = async (requestId: string, status: 'approved' | 'rejected') => {
    setProcessingId(requestId);
    try {
      console.log(`Processing payment request ${requestId} with status: ${status}`);
      
      const requestRef = doc(db, 'paymentRequests', requestId);
      const requestDoc = await getDoc(requestRef);
      
      if (!requestDoc.exists()) {
        throw new Error("Request not found");
      }
      
      const request = { id: requestDoc.id, ...requestDoc.data() } as PaymentRequest;
      console.log(`Found request data:`, request);

      if (!request.userId) {
        throw new Error("Invalid request: missing user ID");
      }

      await updateDoc(requestRef, {
        status,
        updatedAt: new Date().toISOString(),
      });
      console.log(`Successfully updated request status to ${status}`);

      if (status === 'approved') {
        const userRef = doc(db, 'users', request.userId);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
          console.error("User document not found");
          throw new Error("User not found");
        }
        console.log(`Found user document for ${request.userId}`);

        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 1);
        console.log(`Setting premium expiry date to ${expiryDate.toISOString()}`);

        const paymentRecord: PaymentHistory = {
          requestId: request.id,
          amount: request.amount,
          transactionId: request.transactionId,
          date: new Date().toISOString(),
          status: 'approved'
        };

        const userData = userDoc.data() || {};
        const existingHistory = Array.isArray(userData.paymentHistory) ? userData.paymentHistory : [];

        const updateData = {
          role: 'premium',
          premiumExpiresAt: expiryDate.toISOString(),
          updatedAt: new Date().toISOString(),
          paymentHistory: [...existingHistory, paymentRecord]
        };

        console.log("Updating user with data:", JSON.stringify(updateData));
        
        try {
          await updateDoc(userRef, updateData);
          console.log(`Successfully updated user ${request.userId} with premium status and role`);
          toast.success("Payment approved and premium access granted");
        } catch (userUpdateError) {
          console.error("Error updating user document:", userUpdateError);
          toast.error("Payment approved but failed to update user status");
        }
      } else {
        try {
          const userRef = doc(db, 'users', request.userId);
          const userDoc = await getDoc(userRef);
          
          if (userDoc.exists()) {
            const paymentRecord: PaymentHistory = {
              requestId: request.id,
              amount: request.amount,
              transactionId: request.transactionId,
              date: new Date().toISOString(),
              status: 'rejected'
            };

            const userData = userDoc.data() || {};
            const existingHistory = Array.isArray(userData.paymentHistory) ? userData.paymentHistory : [];

            await updateDoc(userRef, {
              updatedAt: new Date().toISOString(),
              paymentHistory: [...existingHistory, paymentRecord]
            });
            
            console.log(`Updated user document with rejected payment history`);
          } else {
            console.log(`User document not found for rejected payment ${request.userId}, skipping history update`);
          }
          
          toast.success("Payment request rejected");
        } catch (error) {
          console.error("Error updating user payment history for rejected payment:", error);
          toast.success("Payment rejected, but failed to update history");
        }
      }

      await fetchRequests();
    } catch (error) {
      console.error("Error updating payment status:", error);
      toast.error("Failed to update payment status");
    } finally {
      setProcessingId(null);
    }
  };

  const pendingRequests = requests.filter(req => req.status === 'pending');
  const processedRequests = requests.filter(req => req.status === 'approved' || req.status === 'rejected');

  if (isLoading && requests.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Payment Requests</h2>
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading payment requests...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Payment Requests</h2>
        <Button 
          variant="outline" 
          onClick={fetchRequests} 
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
          Refresh
        </Button>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-xl font-medium flex items-center gap-2">
          Pending Requests
          {pendingRequests.length > 0 && (
            <Badge variant="outline" className="ml-2">
              {pendingRequests.length}
            </Badge>
          )}
        </h3>
        <div className="grid gap-6">
          {pendingRequests.map((request) => (
            <Card key={request.id} className="border-amber-200 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center">
                      Payment Request #{request.id.substring(0, 8)}...
                      <Badge variant="outline" className="ml-2 bg-amber-50 text-amber-700 hover:bg-amber-50">
                        Pending
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Submitted on {new Date(request.createdAt).toLocaleDateString()} at {new Date(request.createdAt).toLocaleTimeString()}
                    </CardDescription>
                  </div>
                  <div className="text-xl font-bold text-primary">
                    ${request.amount}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="space-y-2">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Transaction ID</p>
                      <p className="font-medium">{request.transactionId}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">User</p>
                      <p className="font-medium">{request.user?.username || request.userId}</p>
                    </div>
                  </div>
                  {request.message && (
                    <div className="mt-3 border-t pt-3">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Message from user:</p>
                      <p className="text-sm bg-muted p-3 rounded">{request.message}</p>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="border-t bg-muted/50 flex justify-end gap-2 pt-3">
                <Button
                  variant="destructive"
                  onClick={() => handleApproval(request.id, 'rejected')}
                  disabled={!!processingId}
                  className="gap-1"
                >
                  {processingId === request.id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4" />
                      Reject
                    </>
                  )}
                </Button>
                <Button
                  variant="default"
                  onClick={() => handleApproval(request.id, 'approved')}
                  disabled={!!processingId}
                  className="gap-1"
                >
                  {processingId === request.id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Approve
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
          {pendingRequests.length === 0 && (
            <Card className="bg-muted/30 border-dashed">
              <CardContent className="flex flex-col items-center justify-center h-32">
                <p className="text-muted-foreground text-center">
                  No pending payment requests.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      {processedRequests.length > 0 && (
        <div className="space-y-4 mt-10">
          <h3 className="text-xl font-medium flex items-center gap-2">
            Processed Requests
            <Badge variant="outline" className="ml-2">
              {processedRequests.length}
            </Badge>
          </h3>
          <div className="grid gap-6">
            {processedRequests.map((request) => (
              <Card 
                key={request.id} 
                className={
                  request.status === 'approved' 
                    ? 'border-green-200 shadow-sm' 
                    : 'border-red-200 shadow-sm'
                }
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center">
                        Payment Request #{request.id.substring(0, 8)}...
                        <Badge 
                          variant="outline" 
                          className={
                            request.status === 'approved'
                              ? 'ml-2 bg-green-50 text-green-700 hover:bg-green-50'
                              : 'ml-2 bg-red-50 text-red-700 hover:bg-red-50'
                          }
                        >
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Submitted on {new Date(request.createdAt).toLocaleDateString()} at {new Date(request.createdAt).toLocaleTimeString()}
                      </CardDescription>
                    </div>
                    <div className="text-xl font-bold text-primary">
                      ${request.amount}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Transaction ID</p>
                        <p className="font-medium">{request.transactionId}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">User</p>
                        <p className="font-medium">{request.user?.username || request.userId}</p>
                      </div>
                    </div>
                    {request.message && (
                      <div className="mt-3 border-t pt-3">
                        <p className="text-sm font-medium text-muted-foreground mb-1">Message from user:</p>
                        <p className="text-sm bg-muted p-3 rounded">{request.message}</p>
                      </div>
                    )}
                    <div className="mt-3 border-t pt-3">
                      <p className="text-sm font-medium text-muted-foreground">Processed on:</p>
                      <p>{new Date(request.updatedAt).toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
