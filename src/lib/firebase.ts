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

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const registerUser = async (email: string, password: string, username: string) => {
  try {
    // Create user with email and password
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    
    // Update profile with username
    await updateProfile(userCredential.user, {
      displayName: username
    });

    // Store complete user data in Firestore
    const userData = {
      uid,
      email,
      username,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      role: 'user',
      profileComplete: false,
      status: 'active'
    };

    await setDoc(doc(db, 'users', uid), userData);

    // Login the user after registration
    await loginUser(email, password);

    return userCredential.user;
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('This email address is already registered.');
    }
    throw new Error('Failed to create account. Please try again.');
  }
};

export const loginUser = async (email: string, password: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, 'users', result.user.uid));
    if (!userDoc.exists()) {
      throw new Error('User profile not found');
    }
    
    // Update last login time
    await updateDoc(doc(db, 'users', result.user.uid), {
      lastLogin: new Date().toISOString()
    });

    return result;
  } catch (error: any) {
    switch (error.code) {
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        throw new Error('Invalid email or password. Please check your credentials and try again.');
      case 'auth/too-many-requests':
        throw new Error('Too many failed login attempts. Please try again later.');
      case 'auth/user-disabled':
        throw new Error('This account has been disabled. Please contact support.');
      default:
        throw new Error('Failed to log in. Please try again.');
    }
  }
};

export const logoutUser = async () => {
  return signOut(auth);
};

export const getUserProfile = async (uid: string) => {
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (!userDoc.exists()) {
    throw new Error('User profile not found');
  }
  return userDoc.data();
};

// Add new functions for premium access
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

export const createPaymentRequest = async (
  userId: string,
  paymentMethodId: string,
  transactionId: string,
  amount: number,
  message?: string
) => {
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

  await setDoc(doc(db, 'paymentRequests', paymentRequest.id), paymentRequest);
  return paymentRequest;
};

export const getUserSubscription = async (userId: string) => {
  const userDoc = await getDoc(doc(db, 'users', userId));
  if (!userDoc.exists()) {
    throw new Error('User not found');
  }

  const userData = userDoc.data();
  return {
    isPremium: userData.premiumExpiresAt ? new Date(userData.premiumExpiresAt) > new Date() : false,
    expiresAt: userData.premiumExpiresAt
  };
};

export const getUserPaymentRequests = async (userId: string) => {
  const requestDocs = await getDocs(
    query(
      collection(db, 'paymentRequests'), 
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    )
  );
  
  return requestDocs.docs.map(doc => doc.data() as PaymentRequest);
};

export const getPaymentMethods = async () => {
  const methodDocs = await getDocs(
    query(
      collection(db, 'paymentMethods'),
      where('isActive', '==', true)
    )
  );
  
  return methodDocs.docs.map(doc => doc.data() as PaymentMethod);
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
}

export const updateUserProfile = async (uid: string, data: Partial<UserProfile>) => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    ...data,
    updatedAt: new Date().toISOString()
  });
  
  if (data.username) {
    const user = auth.currentUser;
    if (user) {
      await updateProfile(user, {
        displayName: data.username
      });
    }
  }
};

export const updateUserPassword = async (currentPassword: string, newPassword: string) => {
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error('No user logged in');
  }

  try {
    // Re-authenticate user before password change
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    
    // Update password
    await firebaseUpdatePassword(user, newPassword);
  } catch (error: any) {
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
