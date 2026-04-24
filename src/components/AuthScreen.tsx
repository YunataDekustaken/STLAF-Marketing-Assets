import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Sparkles, Lock } from 'lucide-react';
import { motion } from 'motion/react';

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
    <div className="min-h-screen bg-bg-main flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[40px] shadow-2xl shadow-slate-200/50 border border-slate-100 p-12"
      >
        <div className="flex justify-center mb-10">
          <div className="relative">
            {/* Main Square Logo */}
            <div className="w-20 h-20 bg-amber-500 rounded-3xl flex items-center justify-center text-white font-black text-lg tracking-tighter shadow-2xl shadow-amber-500/30">
              STLAF
            </div>
            
            {/* Star Icon Overlay */}
            <div className="absolute -right-3 -top-3 bg-white rounded-2xl p-2.5 shadow-xl border border-slate-50">
              <Sparkles className="w-6 h-6 text-amber-500" />
            </div>
          </div>
        </div>

        <h1 className="text-3xl font-black text-slate-900 text-center mb-3 tracking-tight">Assets Portal</h1>
        <p className="text-slate-500/80 text-center mb-10 font-medium leading-relaxed">
          Sign in with your corporate Google account to access marketing library resources.
        </p>

        <div className="space-y-4">
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-4 bg-white text-slate-700 py-5 rounded-[24px] font-bold border border-slate-200 hover:border-amber-200 hover:bg-amber-50/10 hover:shadow-lg hover:shadow-slate-100 transition-all duration-300 disabled:opacity-50 group"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-3 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
            ) : (
              <div className="p-2 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
              </div>
            )}
            <span className="text-[15px]">Continue with Google</span>
          </button>
          
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-rose-50 border border-rose-100 rounded-2xl"
            >
              <p className="text-xs text-rose-600 font-bold text-center leading-relaxed italic">{error}</p>
            </motion.div>
          )}
        </div>

        <div className="mt-12 pt-8 border-t border-slate-50 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full">
            <Lock className="w-3 h-3 text-slate-400" />
            <span className="text-[10px] text-slate-400 uppercase tracking-[0.15em] font-bold">
              Secure Auth Enabled
            </span>
          </div>
          <p className="text-[11px] text-center text-slate-300 font-medium px-4">
            Authorized access only. All actions are logged for security and compliance.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
