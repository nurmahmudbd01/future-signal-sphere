
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { PaymentRequest, PaymentHistory } from './firebasePayment';
import { setUserPremium } from './firebaseRoles';

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
    console.log(`[PAYMENT APPROVAL] Premium expires at: ${expiryDate.toISOString()}`);

    // 3. Create payment record for history
    const paymentRecord: PaymentHistory = {
      requestId,
      amount: request.amount,
      transactionId: request.transactionId || `tr-${Date.now()}`,
      date: new Date().toISOString(),
      status: 'approved'
    };

    // 4. Get user reference and check if exists
    const userRef = doc(db, 'users', request.userId);
    const userDoc = await getDoc(userRef);
    
    // 5. Handle document creation or update
    if (!userDoc.exists()) {
      console.log(`[PAYMENT APPROVAL] User document doesn't exist, creating new one`);
      
      // Create a basic user document with premium role
      const newUserData = {
        uid: request.userId,
        email: "user@example.com", // Default placeholder email
        username: "Premium User", // Default placeholder name
        role: 'premium',
        premiumExpiresAt: expiryDate.toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'active',
        profileComplete: false,
        paymentHistory: [paymentRecord]
      };
      
      try {
        await setDoc(userRef, newUserData);
        console.log(`[PAYMENT APPROVAL] Created new user document with premium role`);
        return { success: true };
      } catch (error) {
        console.error(`[PAYMENT APPROVAL] Failed to create user document:`, error);
        throw new Error('Failed to create user document');
      }
    }
    
    // 6. For existing users, try using our dedicated role function first
    console.log(`[PAYMENT APPROVAL] User exists, updating premium status`);
    
    // First, try to use the dedicated utility function
    const premiumUpdateSuccess = await setUserPremium(request.userId, expiryDate);
    
    if (premiumUpdateSuccess) {
      console.log(`[PAYMENT APPROVAL] Premium status updated with role utility`);
      
      // Now separately update payment history
      try {
        const userData = userDoc.data();
        const existingHistory = Array.isArray(userData.paymentHistory) ? userData.paymentHistory : [];
        
        await updateDoc(userRef, { 
          paymentHistory: [...existingHistory, paymentRecord] 
        });
        
        console.log(`[PAYMENT APPROVAL] Payment history updated successfully`);
        return { success: true };
      } catch (historyError) {
        console.error(`[PAYMENT APPROVAL] Could not update payment history, but premium role was set:`, historyError);
        // Continue anyway as premium was successfully set
        return { success: true };
      }
    }
    
    // Fallback to direct Firestore operations if the utility function failed
    console.log(`[PAYMENT APPROVAL] Role utility failed, trying direct update`);
    
    try {
      // Get existing data 
      const userData = userDoc.data();
      const existingHistory = Array.isArray(userData.paymentHistory) ? userData.paymentHistory : [];
      
      // Define clear update object
      const updates = {
        role: 'premium',
        premiumExpiresAt: expiryDate.toISOString(),
        updatedAt: new Date().toISOString(),
        paymentHistory: [...existingHistory, paymentRecord]
      };
      
      console.log(`[PAYMENT APPROVAL] Update object:`, updates);
      
      // Try setDoc with merge
      await setDoc(userRef, updates, { merge: true });
      console.log(`[PAYMENT APPROVAL] User premium status updated successfully`);
      return { success: true };
    } catch (error) {
      console.error(`[PAYMENT APPROVAL] Error updating user with setDoc:`, error);
      
      // Last resort: Attempt individual field updates
      try {
        console.log(`[PAYMENT APPROVAL] Trying last resort: individual field updates`);
        
        // Update role and expiry (most critical fields)
        await updateDoc(userRef, { 
          role: 'premium',
          premiumExpiresAt: expiryDate.toISOString(),
          updatedAt: new Date().toISOString()
        });
        
        console.log(`[PAYMENT APPROVAL] Role and expiry updated`);
        return { success: true };
      } catch (updateError) {
        console.error(`[PAYMENT APPROVAL] All update attempts failed:`, updateError);
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
