
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
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';

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
