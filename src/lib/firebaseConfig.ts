
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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
