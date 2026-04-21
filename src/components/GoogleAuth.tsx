import React, { useEffect } from 'react';
import { LogIn, LogOut } from 'lucide-react';

const CLIENT_ID = '171482659056-1ase5mlfi6hinn9r6uetoj8vv13qmtm1.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive';

interface GoogleAuthProps {
  onAuthSuccess: (token: string, expiresAt: number) => void;
  onLogout: () => void;
  accessToken: string | null;
}

export const GoogleAuth: React.FC<GoogleAuthProps> = ({ onAuthSuccess, onLogout, accessToken }) => {
  useEffect(() => {
    // Load GSI script if not already loaded
    if (!document.getElementById('google-gsi-script')) {
      const script = document.createElement('script');
      script.id = 'google-gsi-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, []);

  const handleLogin = () => {
    if (!(window as any).google) return;
    
    const client = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (response: any) => {
        if (response.access_token) {
          const expiresAt = Date.now() + (response.expires_in * 1000);
          onAuthSuccess(response.access_token, expiresAt);
        }
      },
    });
    client.requestAccessToken();
  };

  return (
    <div className="flex items-center gap-4">
      {!accessToken ? (
        <button
          onClick={handleLogin}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
        >
          <LogIn className="w-4 h-4" />
          Connect Google Drive
        </button>
      ) : (
        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-sm font-bold hover:bg-rose-100 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Disconnect Drive
        </button>
      )}
    </div>
  );
};
