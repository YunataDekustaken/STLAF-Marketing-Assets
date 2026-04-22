import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { LogIn } from 'lucide-react';

export default function AuthScreen() {
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    if (isLoading) return;
    setError('');
    setIsLoading(true);
    try {
      await login();
    } catch (err: any) {
      if (err.code === 'auth/popup-blocked') {
        setError('Login popup blocked by browser. Please enable popups and try again.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        // Benign
      } else {
        setError(err.message || 'Google login failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F4] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-black/5 p-8">
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 bg-[#141414] rounded-2xl flex items-center justify-center">
            <span className="text-white font-bold text-2xl">APP</span>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-[#141414] text-center mb-2">Assets Portal</h1>
        <p className="text-black/50 text-center mb-8">Sign in with Google to access the marketing library and upload assets.</p>

        <div className="space-y-4">
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-3 bg-[#141414] text-white py-4 rounded-xl font-semibold hover:bg-black transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5 brightness-0 invert" alt="Google" />
            )}
            <span>Sign in with Google</span>
          </button>
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
              <p className="text-xs text-red-600 font-medium text-center">{error}</p>
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-black/5">
          <p className="text-[10px] text-center text-black/30 leading-relaxed uppercase tracking-widest font-bold">
            Personal Drive Storage Linkage Enabled
          </p>
        </div>
      </div>
    </div>
  );
}
