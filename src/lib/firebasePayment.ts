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
    console.log(`Approving payment request ${requestId}`);
    
    // 1. Update the payment request status
    const requestRef = doc(db, 'paymentRequests', requestId);
    await updateDoc(requestRef, {
      status: 'approved',
      updatedAt: new Date().toISOString(),
    });
    console.log(`Successfully updated request status to approved`);

    // 2. Get user document
    const userRef = doc(db, 'users', request.userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.error("User document not found");
      return {
        success: false,
        error: "User not found"
      };
    }
    console.log(`Found user document for ${request.userId}`);

    // 3. Calculate expiry date (1 month from now)
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 1);
    const expiryDateIso = expiryDate.toISOString();
    console.log(`Setting premium expiry date to ${expiryDateIso}`);

    // 4. Create payment record
    const paymentRecord: PaymentHistory = {
      requestId: request.id,
      amount: request.amount,
      transactionId: request.transactionId,
      date: new Date().toISOString(),
      status: 'approved'
    };

    // 5. Get existing payment history
    const userData = userDoc.data() || {};
    const existingHistory = Array.isArray(userData.paymentHistory) ? userData.paymentHistory : [];

    // 6. Update user document in a single atomic operation to avoid race conditions
    try {
      await setDoc(userRef, {
        ...userData,
        role: 'premium',
        premiumExpiresAt: expiryDateIso,
        updatedAt: new Date().toISOString(),
        paymentHistory: [...existingHistory, paymentRecord]
      }, { merge: true });
      
      console.log(`Successfully updated user ${request.userId} to premium status until ${expiryDateIso}`);
      
      // Verify the update was successful
      const updatedUserDoc = await getDoc(userRef);
      if (updatedUserDoc.exists()) {
        const updatedData = updatedUserDoc.data();
        console.log("Updated user data:", updatedData);
        
        if (updatedData.role !== 'premium') {
          console.warn("Role was not updated to premium as expected, forcing update");
          await updateDoc(userRef, { role: 'premium' });
        }
        
        if (updatedData.premiumExpiresAt !== expiryDateIso) {
          console.warn("Premium expiration was not set correctly, forcing update");
          await updateDoc(userRef, { premiumExpiresAt: expiryDateIso });
        }
      }
      
      return { success: true };
    } catch (userUpdateError) {
      console.error("Error updating user document:", userUpdateError);
      
      // Last resort: try one more time with a simpler update
      try {
        await updateDoc(userRef, { 
          role: 'premium',
          premiumExpiresAt: expiryDateIso
        });
        console.log("Fallback update completed");
        return { success: true };
      } catch (fallbackError) {
        console.error("Even fallback update failed:", fallbackError);
        return {
          success: false,
          error: "Payment approved but failed to update user status"
        };
      }
    }
  } catch (error) {
    console.error("Error approving payment:", error);
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
