import React, { useState } from 'react';
import { LockIcon, ChevronLeftIcon } from '../ui/Icons';

interface OwnerLoginScreenProps {
  onLogin: (username: string, password: string) => Promise<boolean>;
  onBack: () => void;
  error: string | null;
  loading: boolean;
  logoUrl: string;
}

export const OwnerLoginScreen: React.FC<OwnerLoginScreenProps> = ({
  onLogin,
  onBack,
  error,
  loading,
  logoUrl
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onLogin(username, password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-4">
      <button
        onClick={onBack}
        className="absolute top-4 left-4 p-2 text-white/60 hover:text-white transition-colors"
      >
        <ChevronLeftIcon size={24} />
      </button>

      <div className="mb-8">
        <img 
          src={logoUrl} 
          alt="KeyFlow" 
          className="w-20 h-20 rounded-2xl shadow-2xl ring-4 ring-purple-500/30"
        />
      </div>

      <div className="bg-purple-500/20 text-purple-200 px-4 py-2 rounded-full text-sm font-medium mb-4">
        Owner Access
      </div>

      <h1 className="text-2xl font-bold text-white mb-8">Super Admin Login</h1>

      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl">
        <div className="mb-4">
          <label className="block text-white/80 text-sm mb-1">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter owner username"
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
            autoFocus
          />
        </div>

        <div className="mb-4">
          <label className="block text-white/80 text-sm mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-200 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !username || !password}
          className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <LockIcon size={18} />
              Access Owner Dashboard
            </>
          )}
        </button>

        <p className="mt-6 text-center text-white/40 text-xs">
          Contact system administrator for credentials
        </p>
      </form>
    </div>
  );
};
