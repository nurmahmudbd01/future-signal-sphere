import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where, orderBy } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { auth } from './firebaseConfig';

export interface PaymentMethod {
  id: string;
  name: string;
  type: 'crypto' | 'bkash' | 'local';
  instructions: string;
  accountDetails: string;
  isActive: boolean;
}

export interface PaymentRequest {
  id: string;
  userId: string;
  amount: number;
  paymentMethodId: string;
  transactionId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
  message?: string;
}

export interface PaymentHistory {
  requestId: string;
  amount: number;
  transactionId: string;
  date: string;
  status: 'approved' | 'rejected';
}

export const createPaymentRequest = async (
  userId: string,
  paymentMethodId: string,
  transactionId: string,
  amount: number,
  message?: string
) => {
  if (!auth.currentUser) {
    throw new Error('You must be logged in to create a payment request');
  }

  const paymentRequest: PaymentRequest = {
    id: `PR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId,
    paymentMethodId,
    transactionId,
    amount,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    message
  };

  try {
    console.log("Creating payment request:", paymentRequest);
    await setDoc(doc(db, 'paymentRequests', paymentRequest.id), paymentRequest);
    console.log("Payment request created successfully");
    return paymentRequest;
  } catch (error) {
    console.error("Error creating payment request:", error);
    throw new Error('Failed to create payment request. Please try again.');
  }
};

export const getUserPaymentRequests = async (userId: string) => {
  if (!auth.currentUser) {
    throw new Error('You must be logged in to view payment requests');
  }

  try {
    console.log("Fetching payment requests for user:", userId);
    const requestDocs = await getDocs(
      query(
        collection(db, 'paymentRequests'), 
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      )
    );
    
    const requests = requestDocs.docs.map(doc => doc.data() as PaymentRequest);
    console.log(`Found ${requests.length} payment requests`);
    
    return requests;
  } catch (error) {
    console.error("Error fetching payment requests:", error);
    throw new Error('Failed to fetch payment requests');
  }
};

export const getPaymentMethods = async () => {
  try {
    console.log("Fetching payment methods");
    const methodDocs = await getDocs(
      query(
        collection(db, 'paymentMethods'),
        where('isActive', '==', true)
      )
    );
    
    const methods = methodDocs.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }) as PaymentMethod);
    
    console.log(`Found ${methods.length} payment methods`);
    return methods;
  } catch (error) {
    console.error("Error fetching payment methods:", error);
    throw new Error('Failed to fetch payment methods');
  }
};

export const approvePaymentRequest = async (requestId: string, request: PaymentRequest) => {
  try {
    console.log(`Starting payment approval process for ${requestId}`);
    
    // 1. Update the payment request status to approved
    const requestRef = doc(db, 'paymentRequests', requestId);
    await updateDoc(requestRef, {
      status: 'approved',
      updatedAt: new Date().toISOString(),
    });
    console.log(`Payment request status updated to approved`);

    // 2. Calculate expiry date (1 month from now)
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 1);
    const expiryDateIso = expiryDate.toISOString();
    console.log(`Premium expires at: ${expiryDateIso}`);

    // 3. Create payment record
    const paymentRecord = {
      requestId: request.id,
      amount: request.amount,
      transactionId: request.transactionId,
      date: new Date().toISOString(),
      status: 'approved'
    };

    // 4. Get user's existing payment history if any
    const userRef = doc(db, 'users', request.userId);
    const userDoc = await getDoc(userRef);
    const userData = userDoc.exists() ? userDoc.data() : {};
    const existingHistory = Array.isArray(userData.paymentHistory) ? userData.paymentHistory : [];
    
    // 5. CRITICAL UPDATE - Most direct and simple approach with explicit operations
    try {
      // STEP 1: First update ONLY the critical fields - role and expiry date
      console.log("CRITICAL UPDATE PHASE 1: Setting role and expiry date");
      await updateDoc(userRef, {
        role: 'premium',
        premiumExpiresAt: expiryDateIso
      });
      
      // STEP 2: Then separately update the history to avoid any potential conflicts
      console.log("CRITICAL UPDATE PHASE 2: Updating payment history");
      await updateDoc(userRef, {
        updatedAt: new Date().toISOString(),
        paymentHistory: [...existingHistory, paymentRecord]
      });
      
      // STEP 3: Verify the update was successful
      const verifyDoc = await getDoc(userRef);
      const verifyData = verifyDoc.data();
      
      console.log("VERIFICATION CHECK RESULT:", {
        userId: request.userId,
        role: verifyData?.role,
        premiumExpiresAt: verifyData?.premiumExpiresAt,
        historyLength: verifyData?.paymentHistory?.length
      });
      
      // If for some reason the role is still not premium, try a final attempt with setDoc
      if (verifyData?.role !== 'premium') {
        console.log("WARNING: Role still not updated correctly, using setDoc as fallback");
        await setDoc(userRef, {
          role: 'premium',
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
      
      return { success: true };
    } catch (error) {
      console.error("ERROR DURING USER UPDATE:", error);
      
      // FALLBACK: If all else fails, try the most minimal update possible
      try {
        console.log("ATTEMPTING MINIMAL FALLBACK UPDATE");
        await setDoc(userRef, { role: 'premium' }, { merge: true });
        console.log("MINIMAL FALLBACK UPDATE SUCCEEDED");
        return { success: true };
      } catch (finalError) {
        console.error("ALL UPDATE ATTEMPTS FAILED:", finalError);
        return {
          success: false,
          error: "Critical database update failed"
        };
      }
    }
  } catch (error) {
    console.error("Error in payment approval process:", error);
    return {
      success: false,
      error: "Failed to approve payment"
    };
  }
};

export const rejectPaymentRequest = async (requestId: string, request: PaymentRequest) => {
  try {
    console.log(`Rejecting payment request ${requestId}`);
    
    // 1. Update the payment request status
    const requestRef = doc(db, 'paymentRequests', requestId);
    await updateDoc(requestRef, {
      status: 'rejected',
      updatedAt: new Date().toISOString(),
    });
    console.log(`Successfully updated request status to rejected`);

    // 2. Update user payment history
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
      
      return { success: true };
    } catch (error) {
      console.error("Error updating user payment history for rejected payment:", error);
      return {
        success: false,
        error: "Payment rejected, but failed to update history"
      };
    }
  } catch (error) {
    console.error("Error rejecting payment:", error);
    return {
      success: false,
      error: "Failed to reject payment"
    };
  }
};
