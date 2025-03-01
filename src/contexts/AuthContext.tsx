
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { auth, getUserProfile, getUserSubscription } from '@/lib/firebase';

interface PaymentHistory {
  requestId: string;
  amount: number;
  transactionId: string;
  date: string;
  status: 'approved' | 'rejected';
}

interface UserProfile {
  email: string;
  username: string;
  role: string; // 'user', 'admin', 'premium'
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

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  subscription: {
    isPremium: boolean;
    expiresAt?: string;
  } | null;
  isAdmin: boolean;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  subscription: null,
  isAdmin: false,
  refreshUserProfile: async () => {}
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<AuthContextType['subscription']>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const loadUserData = async (currentUser: User) => {
    try {
      console.log("Loading user data for:", currentUser.uid);
      
      // Get user profile from Firestore
      const profile = await getUserProfile(currentUser.uid);
      setUserProfile(profile as UserProfile);
      console.log("User profile loaded:", profile);
      
      // Check if user is admin - explicitly set this based on role
      const userRole = profile?.role || 'user';
      const isUserAdmin = userRole === 'admin';
      setIsAdmin(isUserAdmin);
      console.log("User admin status:", isUserAdmin, "with role:", userRole);
      
      // Check premium status
      const sub = await getUserSubscription(currentUser.uid);
      setSubscription(sub);
      console.log("User subscription status:", sub);
      
    } catch (error) {
      console.error('Error fetching user data:', error);
      setUserProfile(null);
      setSubscription(null);
      setIsAdmin(false);
    }
  };

  // Function to manually refresh user profile data
  const refreshUserProfile = async () => {
    if (user) {
      console.log("Manually refreshing user profile data");
      await loadUserData(user);
    }
  };

  useEffect(() => {
    console.log("Setting up auth state change listener");
    
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      console.log("Auth state changed, user:", currentUser?.uid || "null");
      
      setUser(currentUser);
      
      if (currentUser) {
        await loadUserData(currentUser);
      } else {
        setUserProfile(null);
        setSubscription(null);
        setIsAdmin(false);
      }
      
      setLoading(false);
    });

    return () => {
      console.log("Cleaning up auth state change listener");
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      userProfile, 
      loading, 
      subscription, 
      isAdmin,
      refreshUserProfile
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
