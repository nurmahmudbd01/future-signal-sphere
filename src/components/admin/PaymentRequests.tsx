
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, updateDoc, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function PaymentRequests() {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchRequests = async () => {
    try {
      const requestsSnapshot = await getDocs(
        query(collection(db, 'paymentRequests'), where('status', '==', 'pending'))
      );
      const requestsData = [];
      
      // Fetch user data for each request
      for (const doc of requestsSnapshot.docs) {
        const request = { id: doc.id, ...doc.data() };
        const userDoc = await getDoc(doc(db, 'users', request.userId));
        requestsData.push({
          ...request,
          user: userDoc.exists() ? { id: userDoc.id, ...userDoc.data() } : null,
        });
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
      const request = requestDoc.data();

      if (!request) {
        throw new Error("Request not found");
      }

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

        // Update user document with premium status and expiration
        await updateDoc(userRef, {
          premiumExpiresAt: expiryDate.toISOString(),
          updatedAt: new Date().toISOString(),
        });

        toast.success("Payment approved and premium access granted");
      } else {
        toast.success("Payment request rejected");
      }

      fetchRequests();
    } catch (error) {
      console.error("Error updating payment status:", error);
      toast.error("Failed to update payment status");
    }
    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Payment Requests</h2>
      <div className="grid gap-6">
        {requests.map((request) => (
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
                Approve
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleApproval(request.id, 'rejected')}
                disabled={isLoading}
              >
                Reject
              </Button>
            </CardFooter>
          </Card>
        ))}
        {requests.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            No pending payment requests.
          </p>
        )}
      </div>
    </div>
  );
}
