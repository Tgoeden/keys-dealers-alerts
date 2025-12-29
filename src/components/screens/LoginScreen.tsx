import React, { useState, useCallback, memo, useEffect } from 'react';
import { KeyIcon, LockIcon, UserIcon, BuildingIcon, BookmarkIcon, BookmarkFilledIcon, TrashIcon, ChevronRightIcon, ShieldCheckIcon } from '../ui/Icons';

// Type for saved credentials
interface SavedCredential {
  id: string;
  dealershipCode: string;
  username: string;
  isAdminLogin: boolean;
  displayName: string;
  savedAt: number;
}

// Type for persistent session
interface PersistentSession {
  dealershipCode: string;
  username: string;
  isAdminLogin: boolean;
  requirePinOnReturn: boolean;
  createdAt: number;
  lastActiveAt: number;
}

const STORAGE_KEY = 'keyflow_saved_credentials';
const SESSION_KEY = 'keyflow_persistent_session';

// Helper functions for localStorage
const getSavedCredentials = (): SavedCredential[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveCredentials = (credentials: SavedCredential[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
  } catch (e) {
    console.error('Failed to save credentials:', e);
  }
};

// Session persistence helpers
export const getPersistentSession = (): PersistentSession | null => {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const savePersistentSession = (session: PersistentSession) => {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (e) {
    console.error('Failed to save session:', e);
  }
};

export const clearPersistentSession = () => {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (e) {
    console.error('Failed to clear session:', e);
  }
};

export const updateSessionActivity = () => {
  try {
    const session = getPersistentSession();
    if (session) {
      session.lastActiveAt = Date.now();
      savePersistentSession(session);
    }
  } catch (e) {
    console.error('Failed to update session activity:', e);
  }
};

interface LoginScreenProps {
  onLogoTap: () => void;
  onLogin: (dealershipCode: string, username: string, pin: string, isAdminLogin: boolean) => Promise<boolean>;
  error: string | null;
  loading: boolean;
  logoUrl: string;
  // New props for persistent session
  persistentSession?: PersistentSession | null;
  onAutoLogin?: (session: PersistentSession) => void;
  onClearSession?: () => void;
  // Demo mode props
  onEnterDemo?: () => void;
}

const LoginScreenComponent: React.FC<LoginScreenProps> = ({
  onLogoTap,
  onLogin,
  error,
  logoUrl,
  persistentSession,
  onAutoLogin,
  onClearSession,
  onEnterDemo
}) => {
  const [dealershipCode, setDealershipCode] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [step, setStep] = useState<'code' | 'login' | 'saved' | 'pin-reentry'>('code');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedCredentials, setSavedCredentials] = useState<SavedCredential[]>([]);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [pendingCredentials, setPendingCredentials] = useState<{code: string; user: string; admin: boolean} | null>(null);
  const [saveDisplayName, setSaveDisplayName] = useState('');
  const [manageMode, setManageMode] = useState(false);
  
  // Remember Me state
  const [rememberMe, setRememberMe] = useState(false);
  const [requirePinOnReturn, setRequirePinOnReturn] = useState(true);

  // Load saved credentials on mount
  useEffect(() => {
    setSavedCredentials(getSavedCredentials());
  }, []);

  // Check for persistent session on mount
  useEffect(() => {
    if (persistentSession) {
      if (persistentSession.requirePinOnReturn) {
        // Need to re-enter PIN
        setDealershipCode(persistentSession.dealershipCode);
        setUsername(persistentSession.username);
        setIsAdminLogin(persistentSession.isAdminLogin);
        setStep('pin-reentry');
      } else {
        // Auto-login without PIN
        onAutoLogin?.(persistentSession);
      }
    }
  }, [persistentSession, onAutoLogin]);

  const handleCodeSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (dealershipCode.trim()) {
      setStep('login');
    }
  }, [dealershipCode]);

  const handleLoginSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const success = await onLogin(dealershipCode, username, pin, isAdminLogin);
      if (success) {
        // Save persistent session if Remember Me is checked
        if (rememberMe) {
          const session: PersistentSession = {
            dealershipCode,
            username: isAdminLogin ? '' : username,
            isAdminLogin,
            requirePinOnReturn,
            createdAt: Date.now(),
            lastActiveAt: Date.now()
          };
          savePersistentSession(session);
        }
        
        // Check if this credential is already saved
        const existing = savedCredentials.find(
          c => c.dealershipCode === dealershipCode && 
               c.username === (isAdminLogin ? '' : username) && 
               c.isAdminLogin === isAdminLogin
        );
        
        if (!existing) {
          // Ask to save credentials
          setPendingCredentials({ code: dealershipCode, user: username, admin: isAdminLogin });
          setSaveDisplayName(isAdminLogin ? `${dealershipCode} Admin` : `${username} @ ${dealershipCode}`);
          setShowSavePrompt(true);
        }
      } else {
        setPin('');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [onLogin, dealershipCode, username, pin, isAdminLogin, isSubmitting, savedCredentials, rememberMe, requirePinOnReturn]);

  const handlePinReentrySubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !persistentSession) return;
    
    setIsSubmitting(true);
    try {
      const success = await onLogin(
        persistentSession.dealershipCode,
        persistentSession.username,
        pin,
        persistentSession.isAdminLogin
      );
      if (success) {
        // Update session activity
        updateSessionActivity();
      } else {
        setPin('');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [onLogin, pin, isSubmitting, persistentSession]);

  const handleCancelPinReentry = useCallback(() => {
    onClearSession?.();
    clearPersistentSession();
    setStep('code');
    setPin('');
  }, [onClearSession]);

  const handleSaveCredential = useCallback(() => {
    if (!pendingCredentials || !saveDisplayName.trim()) return;
    
    const newCredential: SavedCredential = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      dealershipCode: pendingCredentials.code,
      username: pendingCredentials.admin ? '' : pendingCredentials.user,
      isAdminLogin: pendingCredentials.admin,
      displayName: saveDisplayName.trim(),
      savedAt: Date.now()
    };
    
    const updated = [...savedCredentials, newCredential];
    setSavedCredentials(updated);
    saveCredentials(updated);
    setShowSavePrompt(false);
    setPendingCredentials(null);
  }, [pendingCredentials, saveDisplayName, savedCredentials]);

  const handleSkipSave = useCallback(() => {
    setShowSavePrompt(false);
    setPendingCredentials(null);
  }, []);

  const handleSelectSavedCredential = useCallback((credential: SavedCredential) => {
    setDealershipCode(credential.dealershipCode);
    setUsername(credential.username);
    setIsAdminLogin(credential.isAdminLogin);
    setPin('');
    setStep('login');
  }, []);

  const handleDeleteCredential = useCallback((id: string) => {
    const updated = savedCredentials.filter(c => c.id !== id);
    setSavedCredentials(updated);
    saveCredentials(updated);
  }, [savedCredentials]);

  // PIN Re-entry Screen
  if (step === 'pin-reentry' && persistentSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex flex-col items-center justify-center p-4">
        {/* Logo */}
        <div onClick={onLogoTap} className="mb-8 cursor-pointer select-none">
          <img 
            src={logoUrl} 
            alt="KeyFlow" 
            className="w-24 h-24 rounded-2xl shadow-2xl"
          />
        </div>

        <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
        <p className="text-blue-200 mb-8">Enter your PIN to continue</p>

        <div className="w-full max-w-sm">
          <form onSubmit={handlePinReentrySubmit} className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl">
            {/* Session Info */}
            <div className="flex items-center gap-3 mb-6 p-3 bg-white/5 rounded-xl">
              <div className={`p-2 rounded-lg ${persistentSession.isAdminLogin ? 'bg-purple-500/20' : 'bg-blue-500/20'}`}>
                <UserIcon className={persistentSession.isAdminLogin ? 'text-purple-400' : 'text-blue-400'} size={20} />
              </div>
              <div className="flex-1">
                <div className="text-white font-medium">
                  {persistentSession.isAdminLogin ? 'Admin' : persistentSession.username}
                </div>
                <div className="text-white/50 text-sm">{persistentSession.dealershipCode}</div>
              </div>
              <div className="flex items-center gap-1 text-green-400 text-xs">
                <ShieldCheckIcon size={14} />
                <span>Saved</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-white/80 text-sm mb-1">
                {persistentSession.isAdminLogin ? 'Admin PIN' : 'PIN'}
              </label>
              <div className="relative">
                <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                <input
                  type="password"
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  placeholder="Enter PIN"
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center tracking-[0.5em]"
                  maxLength={6}
                  autoFocus
                />
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-200 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !pin}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <KeyIcon size={18} />
                  Unlock
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleCancelPinReentry}
              className="w-full mt-3 py-2 text-white/60 hover:text-white text-sm transition-colors"
            >
              Sign in with different account
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Save prompt modal
  if (showSavePrompt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <BookmarkIcon className="text-blue-400" size={24} />
            </div>
            <h2 className="text-xl font-semibold text-white">Save Login?</h2>
          </div>
          
          <p className="text-white/70 text-sm mb-4">
            Save this login for quick access next time. Your PIN will NOT be saved for security.
          </p>
          
          <div className="mb-4">
            <label className="block text-white/80 text-sm mb-1">Display Name</label>
            <input
              type="text"
              value={saveDisplayName}
              onChange={e => setSaveDisplayName(e.target.value)}
              placeholder="e.g., Work Account"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          
          <div className="bg-white/5 rounded-lg p-3 mb-4">
            <div className="text-white/60 text-xs mb-1">Will save:</div>
            <div className="text-white text-sm">
              <span className="font-medium">{pendingCredentials?.code}</span>
              {!pendingCredentials?.admin && (
                <span className="text-white/70"> / {pendingCredentials?.user}</span>
              )}
              {pendingCredentials?.admin && (
                <span className="ml-2 px-2 py-0.5 bg-purple-500/30 text-purple-200 rounded text-xs">Admin</span>
              )}
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleSkipSave}
              className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors"
            >
              Skip
            </button>
            <button
              onClick={handleSaveCredential}
              disabled={!saveDisplayName.trim()}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <BookmarkFilledIcon size={18} />
              Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div onClick={onLogoTap} className="mb-8 cursor-pointer select-none">
        <img 
          src={logoUrl} 
          alt="KeyFlow" 
          className="w-24 h-24 rounded-2xl shadow-2xl"
        />
      </div>

      <h1 className="text-3xl font-bold text-white mb-2">KeyFlow</h1>
      <p className="text-blue-200 mb-8">Key Management System</p>

      <div className="w-full max-w-sm">
        {/* Saved Accounts View */}
        {step === 'saved' && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <BookmarkFilledIcon className="text-blue-400" size={20} />
                Saved Logins
              </h2>
              <button
                onClick={() => setManageMode(!manageMode)}
                className={`text-sm px-3 py-1 rounded-lg transition-colors ${
                  manageMode ? 'bg-red-500/20 text-red-300' : 'text-blue-400 hover:bg-white/10'
                }`}
              >
                {manageMode ? 'Done' : 'Manage'}
              </button>
            </div>
            
            <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
              {savedCredentials.map(credential => (
                <div
                  key={credential.id}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                    manageMode ? 'bg-white/5' : 'bg-white/5 hover:bg-white/10 cursor-pointer'
                  }`}
                  onClick={() => !manageMode && handleSelectSavedCredential(credential)}
                >
                  <div className={`p-2 rounded-lg ${credential.isAdminLogin ? 'bg-purple-500/20' : 'bg-blue-500/20'}`}>
                    <UserIcon className={credential.isAdminLogin ? 'text-purple-400' : 'text-blue-400'} size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium truncate">{credential.displayName}</div>
                    <div className="text-white/50 text-xs truncate">
                      {credential.dealershipCode}
                      {!credential.isAdminLogin && ` / ${credential.username}`}
                      {credential.isAdminLogin && ' (Admin)'}
                    </div>
                  </div>
                  {manageMode ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCredential(credential.id);
                      }}
                      className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                    >
                      <TrashIcon size={18} />
                    </button>
                  ) : (
                    <ChevronRightIcon className="text-white/40" size={18} />
                  )}
                </div>
              ))}
              
              {savedCredentials.length === 0 && (
                <div className="text-center py-8 text-white/50">
                  <BookmarkIcon className="mx-auto mb-2 opacity-50" size={32} />
                  <p className="text-sm">No saved logins yet</p>
                  <p className="text-xs mt-1">Save your login after signing in</p>
                </div>
              )}
            </div>
            
            <button
              onClick={() => setStep('code')}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
            >
              Sign In Manually
            </button>
          </div>
        )}

        {/* Dealership Code Step */}
        {step === 'code' && (
          <form onSubmit={handleCodeSubmit} className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <BuildingIcon className="text-blue-400" size={20} />
              Enter Dealership Code
            </h2>
            
            <input
              type="text"
              value={dealershipCode}
              onChange={e => setDealershipCode(e.target.value.toUpperCase())}
              placeholder="e.g., METRO"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase text-center text-lg tracking-widest"
              autoFocus
            />

            <button
              type="submit"
              disabled={!dealershipCode.trim()}
              className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-semibold rounded-xl transition-colors"
            >
              Continue
            </button>

            {/* Saved Logins Button */}
            {savedCredentials.length > 0 && (
              <button
                type="button"
                onClick={() => setStep('saved')}
                className="w-full mt-3 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <BookmarkFilledIcon className="text-blue-400" size={18} />
                Use Saved Login ({savedCredentials.length})
              </button>
            )}

            {/* Try Demo Button - Prominent */}
            {onEnterDemo && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <button
                  type="button"
                  onClick={onEnterDemo}
                  className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-emerald-500/25 flex items-center justify-center gap-3"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Try Demo
                </button>
                <p className="text-center text-white/50 text-xs mt-2">
                  No account needed • Full admin access • 2 users, 4 keys limit
                </p>
              </div>
            )}
          </form>
        )}

        {/* Login Step */}
        {step === 'login' && (
          <form onSubmit={handleLoginSubmit} className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <LockIcon className="text-blue-400" size={20} />
                Login
              </h2>
              <button
                type="button"
                onClick={() => setStep('code')}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                Change Code
              </button>
            </div>

            <div className="bg-white/5 rounded-lg px-3 py-2 mb-4">
              <span className="text-white/60 text-sm">Dealership:</span>
              <span className="text-white font-semibold ml-2">{dealershipCode}</span>
            </div>

            {/* Login Type Toggle */}
            <div className="flex bg-white/10 rounded-xl p-1 mb-4">
              <button
                type="button"
                onClick={() => setIsAdminLogin(false)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  !isAdminLogin ? 'bg-blue-600 text-white' : 'text-white/60 hover:text-white'
                }`}
              >
                User Login
              </button>
              <button
                type="button"
                onClick={() => setIsAdminLogin(true)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isAdminLogin ? 'bg-blue-600 text-white' : 'text-white/60 hover:text-white'
                }`}
              >
                Admin PIN
              </button>
            </div>

            {!isAdminLogin && (
              <div className="mb-4">
                <label className="block text-white/80 text-sm mb-1">Username</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Enter username"
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-white/80 text-sm mb-1">
                {isAdminLogin ? 'Admin PIN' : 'PIN'}
              </label>
              <div className="relative">
                <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                <input
                  type="password"
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  placeholder="Enter PIN"
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center tracking-[0.5em]"
                  maxLength={6}
                />
              </div>
            </div>

            {/* Remember Me Section */}
            <div className="mb-4 p-3 bg-white/5 rounded-xl space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <div 
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    rememberMe 
                      ? 'bg-blue-600 border-blue-600' 
                      : 'border-white/30 hover:border-white/50'
                  }`}
                  onClick={() => setRememberMe(!rememberMe)}
                >
                  {rememberMe && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <span className="text-white text-sm font-medium">Stay Logged In</span>
                  <p className="text-white/50 text-xs">Keep me signed in on this device</p>
                </div>
                <ShieldCheckIcon className={`${rememberMe ? 'text-blue-400' : 'text-white/30'}`} size={20} />
              </label>

              {rememberMe && (
                <label className="flex items-center gap-3 cursor-pointer pl-8">
                  <div 
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                      requirePinOnReturn 
                        ? 'bg-green-600 border-green-600' 
                        : 'border-white/30 hover:border-white/50'
                    }`}
                    onClick={() => setRequirePinOnReturn(!requirePinOnReturn)}
                  >
                    {requirePinOnReturn && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <span className="text-white/80 text-xs">Require PIN when returning</span>
                    <p className="text-white/40 text-xs">Extra security for shared devices</p>
                  </div>
                </label>
              )}
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-200 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || (!isAdminLogin && !username) || !pin}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <KeyIcon size={18} />
                  Sign In
                </>
              )}
            </button>

            {/* Saved Logins Quick Access */}
            {savedCredentials.length > 0 && (
              <button
                type="button"
                onClick={() => setStep('saved')}
                className="w-full mt-3 py-2 text-blue-400 hover:text-blue-300 text-sm transition-colors flex items-center justify-center gap-2"
              >
                <BookmarkFilledIcon size={16} />
                Switch to Saved Login
              </button>
            )}
          </form>
        )}
      </div>

      <p className="mt-8 text-white/40 text-xs">Tap logo 5 times for Owner access</p>
    </div>
  );
};

// Memoize to prevent re-renders from parent
export const LoginScreen = memo(LoginScreenComponent);
