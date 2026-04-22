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
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  googleAccessToken: string | null;
  login: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SUPERVISOR_EMAILS = ['pjhbayno15@gmail.com']; // emergency admin access

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(sessionStorage.getItem('google_drive_token'));

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
          // Check for dynamic role assignment first
          let assignedRole: UserRole | null = null;
          let assignedDept: string | null = null;

          if (user.email) {
            const assignmentQuery = query(
              collection(db, 'roleAssignments'),
              where('email', '==', user.email.toLowerCase())
            );
            const assignmentSnap = await getDocs(assignmentQuery);
            if (!assignmentSnap.empty) {
              const assignmentData = assignmentSnap.docs[0].data();
              assignedRole = assignmentData.role;
              assignedDept = assignmentData.department;
            }
          }

          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            let updated = false;
            let updatedData = { ...data };

            // Apply assigned role if exists
            if (assignedRole && data.role !== assignedRole) {
              updatedData.role = assignedRole;
              updated = true;
            }

            // Sync dept if assigned
            if (assignedDept && data.department !== assignedDept) {
              updatedData.department = assignedDept as any;
              updated = true;
            }

            // Force supervisor role for emergency emails if not already assigned a role
            if (!assignedRole && SUPERVISOR_EMAILS.includes(user.email || '') && data.role !== 'marketing_supervisor') {
              updatedData.role = 'marketing_supervisor';
              updatedData.status = 'active';
              updated = true;
            }

            // Ensure status exists for older users
            if (!data.status) {
              updatedData.status = 'active';
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
            const isSupervisor = SUPERVISOR_EMAILS.includes(user.email || '');

            let role: UserRole = assignedRole || (isSupervisor ? 'marketing_supervisor' : 'department');
            let department = assignedDept || 'Operations';
            // Default status: active if pre-registered or supervisor, otherwise pending
            let status: any = (assignedRole || isSupervisor) ? 'active' : 'pending';

            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || user.email?.split('@')[0] || 'User',
              role,
              department: department as any,
              photoURL: user.photoURL || undefined,
              status
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
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      if (token) {
        setGoogleAccessToken(token);
        sessionStorage.setItem('google_drive_token', token);
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const signupWithEmail = async (email: string, pass: string) => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    try {
      await createUserWithEmailAndPassword(auth, email, pass);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setGoogleAccessToken(null);
    sessionStorage.removeItem('google_drive_token');
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
    <AuthContext.Provider value={{ user, profile, loading, googleAccessToken, login, loginWithEmail, signupWithEmail, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
