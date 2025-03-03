
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { PaymentRequest, PaymentHistory } from './firebasePayment';

/**
 * Specialized service for handling payment approval operations
 * Isolated from other payment functions for reliability
 */
export const approveUserPayment = async (requestId: string, request: PaymentRequest) => {
  console.log(`[PAYMENT APPROVAL] Starting robust payment approval process for ${requestId}`);
  
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

    // 4. Get user reference and check if user exists
    const userRef = doc(db, 'users', request.userId);
    const userDoc = await getDoc(userRef);
    
    // 5. Handle case where user document doesn't exist yet
    if (!userDoc.exists()) {
      console.log(`[PAYMENT APPROVAL] User document doesn't exist, creating a new one for ${request.userId}`);
      
      // Create a basic user document
      await setDoc(userRef, {
        uid: request.userId,
        role: 'premium',
        premiumExpiresAt: expiryDateIso,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        paymentHistory: [paymentRecord]
      });
      
      // Verify creation worked
      const verifyNewDoc = await getDoc(userRef);
      if (verifyNewDoc.exists() && verifyNewDoc.data()?.role === 'premium') {
        console.log(`[PAYMENT APPROVAL] Successfully created new user with premium role`);
        return { success: true };
      } else {
        throw new Error("Failed to create new user document with premium role");
      }
    }
    
    // 6. For existing users - direct approach with critical fields ONLY
    console.log(`[PAYMENT APPROVAL] User exists, using direct approach to update premium status`);
    
    // STRATEGY 1: Update role first (most critical field)
    try {
      console.log(`[PAYMENT APPROVAL] STRATEGY 1: Updating role field directly`);
      await updateDoc(userRef, { role: 'premium' });
      
      // Verify role update worked
      const roleVerify = await getDoc(userRef);
      if (roleVerify.data()?.role !== 'premium') {
        throw new Error("Role update failed verification");
      }
      console.log(`[PAYMENT APPROVAL] Role successfully updated to premium`);
      
      // STRATEGY 2: Update expiry date next
      console.log(`[PAYMENT APPROVAL] STRATEGY 2: Updating expiry date directly`);
      await updateDoc(userRef, { premiumExpiresAt: expiryDateIso });
      
      // Verify expiry update worked
      const expiryVerify = await getDoc(userRef);
      if (expiryVerify.data()?.premiumExpiresAt !== expiryDateIso) {
        throw new Error("Expiry date update failed verification");
      }
      console.log(`[PAYMENT APPROVAL] Expiry date successfully updated`);
      
      // STRATEGY 3: Update timestamp (less critical)
      console.log(`[PAYMENT APPROVAL] STRATEGY 3: Updating timestamp`);
      await updateDoc(userRef, { updatedAt: new Date().toISOString() });
      
      // STRATEGY 4: Update payment history (least critical)
      console.log(`[PAYMENT APPROVAL] STRATEGY 4: Updating payment history`);
      const userData = userDoc.data();
      const existingHistory = Array.isArray(userData.paymentHistory) ? userData.paymentHistory : [];
      await updateDoc(userRef, { 
        paymentHistory: [...existingHistory, paymentRecord] 
      });
      
      // Final verification
      const finalVerify = await getDoc(userRef);
      const finalData = finalVerify.data();
      
      console.log(`[PAYMENT APPROVAL] VERIFICATION COMPLETE. Final state:`, { 
        role: finalData?.role,
        expiresAt: finalData?.premiumExpiresAt,
        historyLength: finalData?.paymentHistory?.length
      });
      
      return { 
        success: true,
        message: "Premium status updated successfully"
      };
    } catch (updateError) {
      console.error(`[PAYMENT APPROVAL] Error during step-by-step update:`, updateError);
      
      // EMERGENCY FALLBACK: Document replacement with minimal fields
      console.log(`[PAYMENT APPROVAL] EMERGENCY FALLBACK: Trying document replacement with minimal fields`);
      
      try {
        // Preserve critical user data
        const userData = userDoc.data() || {};
        const existingHistory = Array.isArray(userData.paymentHistory) ? userData.paymentHistory : [];
        
        // Create minimal document with only essential fields
        await setDoc(userRef, {
          uid: request.userId,
          role: 'premium',
          premiumExpiresAt: expiryDateIso,
          updatedAt: new Date().toISOString(),
          // Preserve other critical user fields if they exist
          email: userData.email || null,
          username: userData.username || null,
          displayName: userData.displayName || null,
          photoURL: userData.photoURL || null,
          createdAt: userData.createdAt || new Date().toISOString(),
          paymentHistory: [...existingHistory, paymentRecord]
        });
        
        // Final verification
        const emergencyVerify = await getDoc(userRef);
        
        if (emergencyVerify.data()?.role === 'premium') {
          console.log(`[PAYMENT APPROVAL] EMERGENCY FALLBACK SUCCEEDED`);
          return { 
            success: true,
            message: "Premium status updated using emergency fallback"
          };
        } else {
          throw new Error("Emergency fallback failed verification");
        }
      } catch (emergencyError) {
        console.error(`[PAYMENT APPROVAL] EMERGENCY FALLBACK FAILED:`, emergencyError);
        throw new Error("All premium status update strategies failed");
      }
    }
  } catch (error) {
    console.error(`[PAYMENT APPROVAL] CRITICAL ERROR:`, error);
    return {
      success: false,
      error: "Critical database update failed after all attempts"
    };
  }
};
