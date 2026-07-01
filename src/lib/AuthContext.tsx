import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';

interface UserSettings {
  uid: string;
  email: string;
  displayName: string;
  companyName: string;
  language: 'es' | 'en';
  theme: 'light' | 'dark' | 'system';
  securityPin: string;
  disabledFeatures?: string[];
  customProfilePic?: string;
  useGoogleAvatar?: boolean;
  fontFamily?: string;
  accentColor?: string;
  ruc: string;
  phone: string;
  referral: string;
  biometricEnabled: boolean;
  biometricCredentialId?: string;
  autoLockTimer: number; // minutes: 0 means Never, 1, 5, 10
  isOnboarded: boolean;
  hasCompletedTutorial?: boolean;
  paymentAccount?: string;
  paymentInstructions?: string;
  salesMessageTemplate?: string;
  updatedAt: string;
}

interface AuthContextType {
  user: User | null;
  settings: UserSettings | null;
  loading: boolean;
  onboarding: boolean;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  impersonatedUser: { uid: string; email: string; displayName: string } | null;
  impersonatedBy: User | null;
  impersonateUser: (target: { uid: string; email: string; displayName: string } | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem('auth_cached_user');
      if (cached) {
        return JSON.parse(cached) as User;
      }
    } catch (e) {
      console.warn("Failed parsing cached auth user:", e);
    }
    return null;
  });
  const [impersonatedUser, setImpersonatedUser] = useState<{ uid: string; email: string; displayName: string } | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(() => {
    try {
      const cached = localStorage.getItem('auth_cached_settings');
      if (cached) {
        return JSON.parse(cached) as UserSettings;
      }
    } catch (e) {
      console.warn("Failed parsing cached settings:", e);
    }
    return null;
  });
  const [loading, setLoading] = useState(true);
  const [onboarding, setOnboarding] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const minimalUser = {
          uid: u.uid,
          email: u.email || '',
          displayName: u.displayName || '',
          photoURL: u.photoURL || null
        };
        localStorage.setItem('auth_cached_user', JSON.stringify(minimalUser));
      } else {
        localStorage.removeItem('auth_cached_user');
        localStorage.removeItem('auth_cached_settings');
        setImpersonatedUser(null);
        setSettings(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Separate effect to handle listening to active profile settings
  useEffect(() => {
    if (!user) {
      setSettings(null);
      setLoading(false);
      return;
    }

    const targetUid = impersonatedUser ? impersonatedUser.uid : user.uid;
    const targetEmail = impersonatedUser ? impersonatedUser.email : (user.email || '');
    const targetDisplayName = impersonatedUser ? impersonatedUser.displayName : (user.displayName || '');

    setLoading(true);
    const settingsRef = doc(db, 'users', targetUid);

    // If offline, check if settings cache exists for this target user and load immediately
    const cachedSettingsStr = localStorage.getItem('auth_cached_settings');
    if (cachedSettingsStr) {
      try {
        const cached = JSON.parse(cachedSettingsStr) as UserSettings;
        if (cached && cached.uid === targetUid) {
          setSettings(cached);
          setOnboarding(!cached.isOnboarded);
          setLoading(false);
        }
      } catch (e) {
        console.warn("Failed parsing cached settings local fallback:", e);
      }
    }

    const unsubSettings = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserSettings;
        setSettings(data);
        localStorage.setItem('auth_cached_settings', JSON.stringify(data));
        setOnboarding(!data.isOnboarded);
      } else {
        // Documento de configuración inicial
        const initialSettings: UserSettings = {
          uid: targetUid,
          email: targetEmail,
          displayName: targetDisplayName,
          companyName: '',
          language: 'es',
          theme: 'system',
          securityPin: '',
          disabledFeatures: [],
          customProfilePic: '',
          useGoogleAvatar: !impersonatedUser,
          fontFamily: 'inter',
          accentColor: 'indigo',
          ruc: '',
          phone: '',
          referral: 'redes',
          biometricEnabled: false,
          autoLockTimer: 5, // 5 minutes standard auto lock default
          isOnboarded: false,
          updatedAt: new Date().toISOString(),
        };
        setDoc(settingsRef, initialSettings);
        setSettings(initialSettings);
        localStorage.setItem('auth_cached_settings', JSON.stringify(initialSettings));
        setOnboarding(true);
      }
      setLoading(false);
    }, (error) => {
       console.error("Firestore settings error, using cache if available:", error);
       const fallbackStr = localStorage.getItem('auth_cached_settings');
       if (fallbackStr) {
         try {
           const cached = JSON.parse(fallbackStr) as UserSettings;
           setSettings(cached);
           setOnboarding(!cached.isOnboarded);
         } catch (e) {
           console.error("Failed to parse fallback cached settings", e);
         }
       }
       setLoading(false);
    });

    return () => unsubSettings();
  }, [user, impersonatedUser]);

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    if (!user) return;
    const targetUid = impersonatedUser ? impersonatedUser.uid : user.uid;
    const settingsRef = doc(db, 'users', targetUid);
    await updateDoc(settingsRef, {
      ...newSettings,
      updatedAt: new Date().toISOString(),
    });
  };

  const impersonateUser = (target: { uid: string; email: string; displayName: string } | null) => {
    setImpersonatedUser(target);
  };

  const activeUser = user ? (impersonatedUser ? ({
    ...user,
    uid: impersonatedUser.uid,
    email: impersonatedUser.email,
    displayName: impersonatedUser.displayName,
    photoURL: null,
  } as unknown as User) : user) : null;

  return (
    <AuthContext.Provider value={{ 
      user: activeUser, 
      settings, 
      loading, 
      onboarding, 
      updateSettings,
      impersonatedUser,
      impersonatedBy: impersonatedUser ? user : null,
      impersonateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
