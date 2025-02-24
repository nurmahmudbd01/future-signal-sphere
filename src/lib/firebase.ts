
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

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
  // Check if username is already taken
  const usernameDoc = doc(db, 'usernames', username);
  const usernameSnapshot = await getDoc(usernameDoc);
  
  if (usernameSnapshot.exists()) {
    throw new Error('Username already taken');
  }

  // Create user with email and password
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
  // Update profile with username
  await updateProfile(userCredential.user, {
    displayName: username
  });

  // Reserve username in database
  await setDoc(usernameDoc, {
    uid: userCredential.user.uid
  });

  return userCredential.user;
};

export const loginUser = async (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const logoutUser = async () => {
  return signOut(auth);
};
