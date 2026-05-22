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
  isOnboarded: boolean;
  updatedAt: string;
}

interface AuthContextType {
  user: User | null;
  settings: UserSettings | null;
  loading: boolean;
  onboarding: boolean;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboarding, setOnboarding] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Listen to settings
        const settingsRef = doc(db, 'users', user.uid);
        const unsubSettings = onSnapshot(settingsRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserSettings;
            setSettings(data);
            setOnboarding(!data.isOnboarded);
          } else {
            // Documento de configuración inicial
            const initialSettings: UserSettings = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || '',
              companyName: '',
              language: 'es',
              theme: 'system',
              securityPin: '',
              isOnboarded: false,
              updatedAt: new Date().toISOString(),
            };
            setDoc(settingsRef, initialSettings);
            setSettings(initialSettings);
            setOnboarding(true);
          }
          setLoading(false);
        }, (error) => {
           console.error("Firestore settings error:", error);
           setLoading(false);
        });
        return () => unsubSettings();
      } else {
        setSettings(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    if (!user) return;
    const settingsRef = doc(db, 'users', user.uid);
    await updateDoc(settingsRef, {
      ...newSettings,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <AuthContext.Provider value={{ user, settings, loading, onboarding, updateSettings }}>
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
