
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
    const requestsSnapshot = await getDocs(
      query(collection(db, 'paymentRequests'), where('status', '==', 'pending'))
    );
    setRequests(requestsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })));
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

      await updateDoc(requestRef, {
        status,
        updatedAt: new Date().toISOString(),
      });

      if (status === 'approved') {
        const userRef = doc(db, 'users', request.userId);
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 1);
        
        await updateDoc(userRef, {
          premiumExpiresAt: expiryDate.toISOString(),
        });
      }

      toast.success(`Payment ${status}`);
      fetchRequests();
    } catch (error) {
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
                <p><strong>User ID:</strong> {request.userId}</p>
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
