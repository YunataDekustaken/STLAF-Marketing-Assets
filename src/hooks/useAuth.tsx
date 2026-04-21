import React, { useState, useEffect, createContext, useContext } from 'react';
import { auth, db } from '../firebase';
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define your known users and their roles here
const KNOWN_USERS: Record<string, { name: string; role: UserRole; dept: string }> = {
  'supervisor@yourdomain.com': { name: 'Supervisor Name', role: 'marketing_supervisor', dept: 'Marketing' },
  'member@yourdomain.com': { name: 'Member Name', role: 'marketing_member', dept: 'Marketing' },
  // Add more known users here
};

const SUPERVISOR_EMAILS = ['supervisor@yourdomain.com', 'pjhbayno15@gmail.com']; // emails that get supervisor role

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If firebase config is completely generic dummy, auth might not work properly. 
    // We catch it if not.
    if (!auth) {
      setLoading(false);
      return;
    }
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        try {
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            let updated = false;
            let updatedData = { ...data };

            // Force supervisor role for specific emails
            if (SUPERVISOR_EMAILS.includes(user.email || '') && data.role !== 'marketing_supervisor') {
              updatedData.role = 'marketing_supervisor';
              updated = true;
            }

            // Sync known display names
            const known = user.email ? KNOWN_USERS[user.email.toLowerCase()] : null;
            if (known && data.displayName !== known.name) {
              updatedData.displayName = known.name;
              updated = true;
            }

            // Sync photo URL
            if (user.photoURL && data.photoURL !== user.photoURL) {
              updatedData.photoURL = user.photoURL;
              updated = true;
            }

            if (updated) {
              await setDoc(docRef, updatedData);
              setProfile(updatedData);
            } else {
              setProfile(data);
            }
          } else {
            // Auto-create profile for new users
            const known = user.email ? KNOWN_USERS[user.email.toLowerCase()] : null;
            const isSupervisor = SUPERVISOR_EMAILS.includes(user.email || '');

            let role: UserRole = 'department';
            if (known) role = known.role;
            else if (isSupervisor) role = 'marketing_supervisor';

            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              displayName: known?.name || user.displayName || user.email?.split('@')[0] || 'User',
              role,
              department: (known?.dept || 'Operations') as any,
              photoURL: user.photoURL || undefined
            };

            await setDoc(docRef, newProfile);
            setProfile(newProfile);
          }
        } catch (error) {
          console.error('Error fetching/creating profile:', error);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const loginWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signupWithEmail = async (email: string, pass: string) => {
    await createUserWithEmailAndPassword(auth, email, pass);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid);
    const newProfile = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || '',
      photoURL: user.photoURL || undefined,
      role: profile?.role || 'department',
      department: 'Operations',
      ...profile,
      ...data,
    } as UserProfile;
    await setDoc(docRef, newProfile);
    setProfile(newProfile);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, loginWithEmail, signupWithEmail, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
