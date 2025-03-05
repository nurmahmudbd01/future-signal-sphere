
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { PaymentRequest, PaymentHistory } from './firebasePayment';

/**
 * Specialized service for handling payment approval operations
 * Isolated from other payment functions for reliability
 */
export const approveUserPayment = async (requestId: string, request: PaymentRequest) => {
  console.log(`[PAYMENT APPROVAL] Starting payment approval process for ${requestId}`);
  
  try {
    // 1. Update the payment request status first
    const requestRef = doc(db, 'paymentRequests', requestId);
    await updateDoc(requestRef, {
      status: 'approved',
      updatedAt: new Date().toISOString(),
    });
    console.log(`[PAYMENT APPROVAL] Payment request status updated to approved`);

    // 2. Calculate premium expiry date (1 month from now)
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 1);
    const expiryDateIso = expiryDate.toISOString();
    console.log(`[PAYMENT APPROVAL] Premium expires at: ${expiryDateIso}`);

    // 3. Create payment record for history
    const paymentRecord: PaymentHistory = {
      requestId: request.id,
      amount: request.amount,
      transactionId: request.transactionId,
      date: new Date().toISOString(),
      status: 'approved'
    };

    // 4. Get user reference
    const userRef = doc(db, 'users', request.userId);
    
    // 5. Check if user document exists
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.log(`[PAYMENT APPROVAL] User document doesn't exist, creating new one`);
      // Create a basic user document with premium role
      await setDoc(userRef, {
        uid: request.userId,
        role: 'premium',
        premiumExpiresAt: expiryDateIso,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        paymentHistory: [paymentRecord]
      });
      
      console.log(`[PAYMENT APPROVAL] Created new user document with premium role`);
      return { success: true };
    }
    
    // 6. For existing users, use setDoc with merge option
    console.log(`[PAYMENT APPROVAL] User exists, updating with merge`);
    
    try {
      // Get existing data to preserve it
      const userData = userDoc.data();
      const existingHistory = Array.isArray(userData.paymentHistory) ? userData.paymentHistory : [];
      
      // Use setDoc with merge to update only specific fields
      await setDoc(userRef, {
        role: 'premium',
        premiumExpiresAt: expiryDateIso,
        updatedAt: new Date().toISOString(),
        paymentHistory: [...existingHistory, paymentRecord]
      }, { merge: true });
      
      console.log(`[PAYMENT APPROVAL] User premium status updated successfully`);
      return { success: true };
    } catch (error) {
      console.error(`[PAYMENT APPROVAL] Error updating user with setDoc:`, error);
      
      // Fallback: Try updating fields individually
      try {
        console.log(`[PAYMENT APPROVAL] Trying fallback: individual field updates`);
        
        // Update role first (most important)
        await updateDoc(userRef, { role: 'premium' });
        console.log(`[PAYMENT APPROVAL] Updated role to premium`);
        
        // Update expiry date
        await updateDoc(userRef, { premiumExpiresAt: expiryDateIso });
        console.log(`[PAYMENT APPROVAL] Updated premium expiry date`);
        
        // Update timestamp
        await updateDoc(userRef, { updatedAt: new Date().toISOString() });
        
        // Update payment history
        const userData = userDoc.data();
        const existingHistory = Array.isArray(userData.paymentHistory) ? userData.paymentHistory : [];
        await updateDoc(userRef, { 
          paymentHistory: [...existingHistory, paymentRecord] 
        });
        
        console.log(`[PAYMENT APPROVAL] All fields updated successfully via fallback`);
        return { success: true };
      } catch (updateError) {
        console.error(`[PAYMENT APPROVAL] Individual updates failed:`, updateError);
        throw new Error("Failed to update premium status");
      }
    }
  } catch (error) {
    console.error(`[PAYMENT APPROVAL] Critical error:`, error);
    return {
      success: false,
      error: "Critical database update failed"
    };
  }
};
