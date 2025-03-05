
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

/**
 * Available user roles in the application
 */
export type UserRole = 'user' | 'premium' | 'admin';

/**
 * Role permissions and capabilities
 */
export const ROLE_PERMISSIONS = {
  user: {
    canAccessPremiumContent: false,
    maxSignals: 5,
    description: 'Basic user account'
  },
  premium: {
    canAccessPremiumContent: true,
    maxSignals: 100,
    description: 'Premium subscriber with full access'
  },
  admin: {
    canAccessPremiumContent: true,
    maxSignals: -1, // unlimited
    description: 'Administrator with full site control'
  }
};

/**
 * Set a user's role in Firestore
 */
export const setUserRole = async (userId: string, role: UserRole): Promise<boolean> => {
  try {
    console.log(`[ROLES] Setting user ${userId} role to ${role}`);
    const userRef = doc(db, 'users', userId);
    
    // Check if user document exists
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      // Update existing user document with merge
      console.log(`[ROLES] User document exists, updating role`);
      await setDoc(userRef, { 
        role,
        updatedAt: new Date().toISOString() 
      }, { merge: true });
    } else {
      // Create new user document with minimal data
      console.log(`[ROLES] User document does not exist, creating it with role`);
      await setDoc(userRef, {
        uid: userId,
        role,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        profileComplete: false,
        status: 'active'
      });
    }
    
    console.log(`[ROLES] Successfully set user role to ${role}`);
    return true;
  } catch (error) {
    console.error(`[ROLES] Error setting user role:`, error);
    return false;
  }
};

/**
 * Get a user's role from Firestore
 */
export const getUserRole = async (userId: string): Promise<UserRole> => {
  try {
    console.log(`[ROLES] Getting role for user ${userId}`);
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.log(`[ROLES] User document not found, defaulting to 'user' role`);
      return 'user';
    }
    
    const userData = userDoc.data();
    const role = (userData.role as UserRole) || 'user';
    console.log(`[ROLES] Found role for user: ${role}`);
    return role;
  } catch (error) {
    console.error(`[ROLES] Error getting user role:`, error);
    return 'user'; // Default to basic user role on error
  }
};

/**
 * Set user as premium with expiration date
 */
export const setUserPremium = async (userId: string, expiryDate: Date): Promise<boolean> => {
  try {
    console.log(`[ROLES] Setting user ${userId} as premium until ${expiryDate.toISOString()}`);
    const userRef = doc(db, 'users', userId);
    
    // Use setDoc with merge to ensure atomic update
    await setDoc(userRef, {
      role: 'premium',
      premiumExpiresAt: expiryDate.toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    console.log(`[ROLES] Successfully set user as premium`);
    return true;
  } catch (error) {
    console.error(`[ROLES] Error setting user as premium:`, error);
    
    // Fallback attempt with individual field updates
    try {
      console.log(`[ROLES] Trying fallback update method for premium status`);
      const userRef = doc(db, 'users', userId);
      
      await updateDoc(userRef, {
        role: 'premium',
        premiumExpiresAt: expiryDate.toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      console.log(`[ROLES] Fallback premium update successful`);
      return true;
    } catch (fallbackError) {
      console.error(`[ROLES] Fallback premium update also failed:`, fallbackError);
      return false;
    }
  }
};

/**
 * Check if a user's premium status is valid
 */
export const isValidPremium = (expiryDateStr?: string): boolean => {
  if (!expiryDateStr) return false;
  
  try {
    const expiryDate = new Date(expiryDateStr);
    const now = new Date();
    return expiryDate > now;
  } catch (error) {
    console.error(`[ROLES] Error parsing premium expiry date:`, error);
    return false;
  }
};
