
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { auth, getUserProfile, getUserSubscription } from '@/lib/firebase';

interface UserProfile {
  email: string;
  username: string;
  role: string; // 'user', 'admin'
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

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  subscription: {
    isPremium: boolean;
    expiresAt?: string;
  } | null;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  subscription: null,
  isAdmin: false
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<AuthContextType['subscription']>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setUser(user);
      if (user) {
        try {
          const profile = await getUserProfile(user.uid);
          setUserProfile(profile as UserProfile);
          
          // Check if user is admin
          setIsAdmin(profile?.role === 'admin');
          
          // Check premium status
          const sub = await getUserSubscription(user.uid);
          setSubscription(sub);
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUserProfile(null);
          setSubscription(null);
          setIsAdmin(false);
        }
      } else {
        setUserProfile(null);
        setSubscription(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, subscription, isAdmin }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
