import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { LogIn } from 'lucide-react';

export default function AuthScreen() {
  const { login, loginWithEmail, signupWithEmail } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isSignup) {
        await signupWithEmail(email, password);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
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

        <h1 className="text-2xl font-bold text-[#141414] text-center mb-2">Welcome Back</h1>
        <p className="text-black/50 text-center mb-8">Sign in to your account</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-black/70 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full bg-[#F5F5F4] border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-black/5"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-black/70 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full bg-[#F5F5F4] border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-black/5"
              required
            />
          </div>

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

          <button
            type="submit"
            className="w-full flex items-center justify-center space-x-3 bg-[#141414] text-white py-4 rounded-xl font-semibold hover:bg-black transition-all"
          >
            <LogIn size={20} />
            <span>{isSignup ? 'Create Account' : 'Sign In'}</span>
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-black/5 text-center">
          <button
            onClick={() => setIsSignup(!isSignup)}
            className="text-sm font-medium text-black/50 hover:text-black transition-colors"
          >
            {isSignup ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-black/30 mb-4">Or continue with</p>
          <button
            onClick={login}
            className="w-full flex items-center justify-center space-x-3 bg-white border border-black/10 text-black py-3 rounded-xl font-semibold hover:bg-black/5 transition-all"
          >
            <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
            <span>Google</span>
          </button>
        </div>
      </div>
    </div>
  );
}
