import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

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
      throw new Error('Email is already registered');
    }
    throw error;
  }
};

export const loginUser = async (email: string, password: string) => {
  const result = await signInWithEmailAndPassword(auth, email, password);
  // Get user profile data
  const userDoc = await getDoc(doc(db, 'users', result.user.uid));
  if (!userDoc.exists()) {
    throw new Error('User profile not found');
  }
  return result;
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

export const updateUserProfile = async (uid: string, data: { 
  username?: string;
  bio?: string;
  phoneNumber?: string;
  location?: string;
  website?: string;
}) => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    ...data,
    updatedAt: new Date().toISOString(),
    profileComplete: true
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
  if (!user || !user.email) throw new Error('No user logged in');

  // Re-authenticate user before password change
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  
  // Update password
  await updatePassword(user, newPassword);
};
