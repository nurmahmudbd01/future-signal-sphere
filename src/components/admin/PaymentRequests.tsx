
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, updateDoc, doc, getDoc, DocumentData, Timestamp, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
  const [isLoading, setIsLoading] = useState(false);

  const fetchRequests = async () => {
    try {
      // Query all requests, not just pending ones
      const requestsSnapshot = await getDocs(
        query(
          collection(db, 'paymentRequests'),
          orderBy('createdAt', 'desc')
        )
      );
      
      const requestsData: PaymentRequest[] = [];
      
      // Fetch user data for each request
      for (const docSnapshot of requestsSnapshot.docs) {
        const request = { id: docSnapshot.id, ...docSnapshot.data() } as PaymentRequest;
        
        // Only proceed if userId exists
        if (request.userId) {
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
          } else {
            // If user document doesn't exist, still add request but with default user info
            requestsData.push({
              ...request,
              user: {
                id: request.userId,
                username: "Unknown User"
              }
            });
          }
        } else {
          // If there's no userId at all, add request without user info
          requestsData.push(request);
        }
      }
      
      setRequests(requestsData);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("Failed to load payment requests");
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApproval = async (requestId: string, status: 'approved' | 'rejected') => {
    setIsLoading(true);
    try {
      const requestRef = doc(db, 'paymentRequests', requestId);
      const requestDoc = await getDoc(requestRef);
      
      if (!requestDoc.exists()) {
        throw new Error("Request not found");
      }
      
      const request = requestDoc.data() as PaymentRequest;

      // Update request status
      await updateDoc(requestRef, {
        status,
        updatedAt: new Date().toISOString(),
      });

      if (status === 'approved') {
        const userRef = doc(db, 'users', request.userId);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
          throw new Error("User not found");
        }

        // Calculate premium expiration date (1 month from now)
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 1);

        // Create payment history record
        const paymentRecord: PaymentHistory = {
          requestId: request.id,
          amount: request.amount,
          transactionId: request.transactionId,
          date: new Date().toISOString(),
          status: 'approved'
        };

        const userData = userDoc.data();
        const existingHistory = userData.paymentHistory || [];

        // Update user document with premium status, expiration, and payment history
        await updateDoc(userRef, {
          premiumExpiresAt: expiryDate.toISOString(),
          updatedAt: new Date().toISOString(),
          paymentHistory: [...existingHistory, paymentRecord]
        });

        toast.success("Payment approved and premium access granted");
      } else {
        // Even for rejected payments, record the history
        const userRef = doc(db, 'users', request.userId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          // Create payment history record for rejected payment
          const paymentRecord: PaymentHistory = {
            requestId: request.id,
            amount: request.amount,
            transactionId: request.transactionId,
            date: new Date().toISOString(),
            status: 'rejected'
          };

          const userData = userDoc.data();
          const existingHistory = userData.paymentHistory || [];

          // Update user document with payment history
          await updateDoc(userRef, {
            updatedAt: new Date().toISOString(),
            paymentHistory: [...existingHistory, paymentRecord]
          });
        }
        
        toast.success("Payment request rejected");
      }

      // Refresh the request list
      fetchRequests();
    } catch (error) {
      console.error("Error updating payment status:", error);
      toast.error("Failed to update payment status");
    }
    setIsLoading(false);
  };

  // Filter requests for display
  const pendingRequests = requests.filter(req => req.status === 'pending');
  const processedRequests = requests.filter(req => req.status === 'approved' || req.status === 'rejected');

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Payment Requests</h2>
      
      {/* Pending Requests Section */}
      <div className="space-y-4">
        <h3 className="text-xl font-medium">Pending Requests</h3>
        <div className="grid gap-6">
          {pendingRequests.map((request) => (
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
                  <p><strong>User:</strong> {request.user?.username || request.userId}</p>
                  {request.message && (
                    <p><strong>Message:</strong> {request.message}</p>
                  )}
                </div>
              </CardContent>
              <CardFooter className="space-x-2">
                <Button
                  variant="default"
                  onClick={() => handleApproval(request.id, 'approved')}
                  disabled={isLoading}
                >
                  {isLoading ? "Processing..." : "Approve"}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleApproval(request.id, 'rejected')}
                  disabled={isLoading}
                >
                  {isLoading ? "Processing..." : "Reject"}
                </Button>
              </CardFooter>
            </Card>
          ))}
          {pendingRequests.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No pending payment requests.
            </p>
          )}
        </div>
      </div>
      
      {/* Processed Requests Section */}
      {processedRequests.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-medium">Processed Requests</h3>
          <div className="grid gap-6">
            {processedRequests.map((request) => (
              <Card key={request.id} className={request.status === 'approved' ? 'border-green-300' : 'border-red-300'}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Payment Request #{request.id}</CardTitle>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      request.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                  </div>
                  <CardDescription>
                    Submitted on {new Date(request.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p><strong>Amount:</strong> ${request.amount}</p>
                    <p><strong>Transaction ID:</strong> {request.transactionId}</p>
                    <p><strong>User:</strong> {request.user?.username || request.userId}</p>
                    {request.message && (
                      <p><strong>Message:</strong> {request.message}</p>
                    )}
                    <p><strong>Updated:</strong> {new Date(request.updatedAt).toLocaleString()}</p>
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
