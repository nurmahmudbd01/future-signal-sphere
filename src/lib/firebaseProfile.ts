
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import { PaymentHistory } from './firebasePayment';

export interface UserProfile {
  email: string;
  username: string;
  role: string;
  createdAt: string;
  lastLogin: string;
  premiumExpiresAt?: string;
  bio?: string;
  phoneNumber?: string;
  location?: string;
  website?: string;
  status: 'active' | 'suspended';
  profileComplete: boolean;
  paymentHistory?: PaymentHistory[];
}

export const getUserProfile = async (uid: string) => {
  try {
    console.log("Fetching user profile for:", uid);
    const userDoc = await getDoc(doc(db, 'users', uid));
    
    if (!userDoc.exists()) {
      console.log("User document doesn't exist in Firestore, creating it now");
      
      // Get user from Authentication
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No authenticated user found');
      }
      
      // Create a new user document with default values
      const userData = {
        uid: user.uid,
        email: user.email,
        username: user.displayName || user.email?.split('@')[0] || 'User',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        role: 'user', // Default role is 'user'
        profileComplete: false,
        status: 'active',
        paymentHistory: [] // Initialize empty payment history
      };
      
      console.log("Creating new user document in Firestore with data:", JSON.stringify(userData));
      await setDoc(doc(db, 'users', uid), userData);
      console.log("New user document created successfully");
      return userData;
    }
    
    console.log("User profile retrieved successfully");
    return userDoc.data();
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw new Error('User profile not found');
  }
};

export const getUserSubscription = async (userId: string) => {
  try {
    console.log("Checking subscription status for user:", userId);
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      console.log('User document not found for subscription check');
      return {
        isPremium: false,
        expiresAt: null
      };
    }

    const userData = userDoc.data();
    console.log("User data for subscription check:", userData);
    
    // Check if user is admin (admins always have premium access)
    if (userData.role === 'admin') {
      console.log("User is admin, granting premium access");
      return {
        isPremium: true,
        expiresAt: null, // Admins don't need expiration
        role: 'admin'
      };
    }
    
    // Check if user has a premium role - this should be respected regardless of expiration
    const isPremiumRole = userData.role === 'premium';
    console.log("User role premium status:", isPremiumRole, "with role:", userData.role);
    
    // Check if user has a valid premium expiration date
    const premiumExpiresAt = userData.premiumExpiresAt;
    const isPremiumExpiration = premiumExpiresAt ? new Date(premiumExpiresAt) > new Date() : false;
    console.log("Premium expiration status:", isPremiumExpiration, "expires at:", premiumExpiresAt);
    
    // User is premium if either condition is true
    const isPremium = isPremiumRole || isPremiumExpiration;
    
    console.log(`Subscription check result: isPremium=${isPremium}, role=${userData.role}, expiresAt=${premiumExpiresAt || 'N/A'}`);
    
    return {
      isPremium,
      expiresAt: premiumExpiresAt || null,
      role: userData.role || 'user'
    };
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    return {
      isPremium: false,
      expiresAt: null,
      role: 'user'
    };
  }
};

export const updateUserProfile = async (uid: string, data: Partial<UserProfile>) => {
  if (!auth.currentUser) {
    throw new Error('You must be logged in to update your profile');
  }
  
  // Ensure users can only update their own profiles
  if (auth.currentUser.uid !== uid) {
    throw new Error('You can only update your own profile');
  }

  try {
    console.log("Updating user profile for:", uid, "with data:", data);
    const userRef = doc(db, 'users', uid);
    
    // Check if document exists first
    const docSnap = await getDoc(userRef);
    if (!docSnap.exists()) {
      console.log("User document doesn't exist, creating it before update");
      // Create the document if it doesn't exist
      const userData = {
        uid,
        email: auth.currentUser.email,
        username: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'User',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        role: 'user',
        profileComplete: false,
        status: 'active',
        paymentHistory: [], // Initialize empty payment history
        ...data,
        updatedAt: new Date().toISOString()
      };
      console.log("Creating new user document:", JSON.stringify(userData));
      await setDoc(userRef, userData);
    } else {
      console.log("User document exists, updating it");
      const existingData = docSnap.data();
      
      // Important: preserve role and premium status unless explicitly updating them
      const updatedData = { ...data };
      
      // Preserve payment history if not included in the update
      if (!updatedData.paymentHistory && existingData.paymentHistory) {
        updatedData.paymentHistory = existingData.paymentHistory;
      }
      
      // Preserve role if not explicitly changing it
      if (!updatedData.role && existingData.role) {
        updatedData.role = existingData.role;
      }
      
      // Preserve premium expiration if not explicitly changing it
      if (!updatedData.premiumExpiresAt && existingData.premiumExpiresAt) {
        updatedData.premiumExpiresAt = existingData.premiumExpiresAt;
      }
      
      console.log("Updating user document with:", JSON.stringify(updatedData));
      await updateDoc(userRef, {
        ...updatedData,
        updatedAt: new Date().toISOString()
      });
    }
    
    // Update display name in Authentication if username is provided
    if (data.username) {
      const user = auth.currentUser;
      if (user) {
        console.log("Updating display name in Authentication to:", data.username);
        await updateProfile(user, {
          displayName: data.username
        });
      }
    }
    
    console.log("Profile update completed successfully");
  } catch (error) {
    console.error("Error updating profile:", error);
    throw new Error('Failed to update profile. Please try again.');
  }
};
