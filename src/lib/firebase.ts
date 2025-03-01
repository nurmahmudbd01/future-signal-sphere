
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  updateProfile,
  updatePassword as firebaseUpdatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, getDocs, query, where, orderBy } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD0-woWJiIZcyLizZP3PGwANIGNvKJ8TYA",
  authDomain: "futuretrade-8b783.firebaseapp.com",
  projectId: "futuretrade-8b783",
  storageBucket: "futuretrade-8b783.firebasestorage.app",
  messagingSenderId: "1096569782611",
  appId: "1:1096569782611:web:3b87e9c5b4dd190171a1a6",
  measurementId: "G-0FCY7G1PCX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const registerUser = async (email: string, password: string, username: string) => {
  if (!email || !password || !username) {
    throw new Error('Email, password, and username are required');
  }
  
  try {
    console.log("Starting user registration process...");
    
    // Step 1: Create user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    console.log("User created in Authentication:", user.uid);
    
    if (!user || !user.uid) {
      throw new Error('User creation failed');
    }
    
    // Step 2: Update the user profile in Authentication
    await updateProfile(user, {
      displayName: username
    });
    
    console.log("User profile updated with displayName:", username);
    
    // Step 3: Create user document in Firestore
    const userData = {
      uid: user.uid,
      email: user.email,
      username,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      role: 'user',
      profileComplete: false,
      status: 'active'
    };
    
    try {
      // Use user.uid as document ID in the 'users' collection
      const userDocRef = doc(db, 'users', user.uid);
      
      console.log("Attempting to write user data to Firestore...");
      
      // Set the document data with merge option to avoid overwriting
      await setDoc(userDocRef, userData);
      
      console.log("User data successfully written to Firestore");
      
      return user;
    } catch (firestoreError) {
      console.error("Firestore error during registration:", firestoreError);
      // Even if Firestore fails, we return the user since they are authenticated
      return user;
    }
  } catch (error: any) {
    console.error("Registration error:", error);
    
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('This email address is already registered.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address format.');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('Password is too weak. Use at least 6 characters.');
    } else if (error.code) {
      throw new Error(`Registration failed: ${error.message}`);
    }
    
    throw new Error('Failed to create account. Please try again.');
  }
};

export const loginUser = async (email: string, password: string) => {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }
  
  try {
    console.log("Starting login process for:", email);
    
    // Step 1: Sign in with Firebase Authentication
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    if (!user || !user.uid) {
      throw new Error('Login failed');
    }
    
    console.log("User authenticated successfully:", user.uid);
    
    // Step 2: Update the Firestore user document
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        console.log("User document found in Firestore, updating lastLogin");
        // Update last login time for existing user
        await updateDoc(userDocRef, {
          lastLogin: new Date().toISOString()
        });
      } else {
        console.log("User document not found in Firestore, creating new document");
        // Create a new user document if it doesn't exist in Firestore
        const userData = {
          uid: user.uid,
          email: user.email,
          username: user.displayName || email.split('@')[0],
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          role: 'user',
          profileComplete: false,
          status: 'active'
        };
        
        await setDoc(userDocRef, userData);
        console.log("Created missing user document in Firestore");
      }
    } catch (firestoreError) {
      console.error("Firestore error during login:", firestoreError);
      // We continue even if Firestore update fails, since the auth part was successful
    }
    
    console.log("Login process completed successfully");
    return userCredential;
  } catch (error: any) {
    console.error("Login error:", error);
    
    switch (error.code) {
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-email':
        throw new Error('Invalid email or password. Please check your credentials and try again.');
      case 'auth/too-many-requests':
        throw new Error('Too many failed login attempts. Please try again later or reset your password.');
      case 'auth/user-disabled':
        throw new Error('This account has been disabled. Please contact support.');
      default:
        throw new Error(`Login failed: ${error.message || 'Please try again.'}`);
    }
  }
};

export const logoutUser = async () => {
  console.log("Logging out user");
  return signOut(auth);
};

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
      
      // Create a new user document
      const userData = {
        uid: user.uid,
        email: user.email,
        username: user.displayName || user.email?.split('@')[0] || 'User',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        role: 'user',
        profileComplete: false,
        status: 'active',
        paymentHistory: [] // Initialize empty payment history
      };
      
      console.log("Creating new user document in Firestore");
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

export const getUserSubscription = async (userId: string) => {
  try {
    console.log("Checking subscription status for user:", userId);
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    
    // Check if user role is premium or admin
    const userRole = userData.role || 'user';
    const isRolePremium = userRole === 'premium' || userRole === 'admin';
    
    // Check if user has an active premium subscription
    const isPremiumExpiration = userData.premiumExpiresAt ? new Date(userData.premiumExpiresAt) > new Date() : false;
    
    // User is premium if either their role is premium/admin OR they have a valid premium expiration date
    const isPremium = isRolePremium || isPremiumExpiration;
    
    console.log("User premium status:", isPremium, "Expires:", userData.premiumExpiresAt || "N/A", "Role:", userRole);
    
    return {
      isPremium,
      expiresAt: userData.premiumExpiresAt
    };
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return {
      isPremium: false,
      expiresAt: null
    };
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

interface UserProfile {
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
      await setDoc(userRef, userData);
    } else {
      console.log("User document exists, updating it");
      
      // Preserve existing payment history if not included in the update
      const updatedData = { ...data };
      if (!updatedData.paymentHistory && docSnap.data().paymentHistory) {
        updatedData.paymentHistory = docSnap.data().paymentHistory;
      }
      
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

export const updateUserPassword = async (currentPassword: string, newPassword: string) => {
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error('No user logged in');
  }

  try {
    console.log("Starting password update process");
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    
    console.log("User reauthenticated successfully, updating password");
    await firebaseUpdatePassword(user, newPassword);
    console.log("Password updated successfully");
  } catch (error: any) {
    console.error("Error updating password:", error);
    switch (error.code) {
      case 'auth/wrong-password':
        throw new Error('Current password is incorrect');
      case 'auth/weak-password':
        throw new Error('New password must be at least 6 characters long');
      default:
        throw new Error('Failed to update password. Please try again.');
    }
  }
};
