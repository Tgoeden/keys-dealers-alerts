import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useKeyFlow } from '@/hooks/useKeyFlow';
import { ErrorBoundary } from './ErrorBoundary';
import { LoginScreen } from './screens/LoginScreen';
import { OwnerLoginScreen } from './screens/OwnerLoginScreen';
import { OwnerDashboard } from './screens/OwnerDashboard';
import { AdminDashboard } from './screens/AdminDashboard';
import { UserHome } from './screens/UserHome';
import { KeysManagement } from './screens/KeysManagement';
import { UserManagement } from './screens/UserManagement';
import { LogsReports } from './screens/LogsReports';
import { Settings } from './screens/Settings';
import { HelpScreen } from './screens/HelpScreen';
import { KeyDetail } from './screens/KeyDetail';
import { ShareScreen } from './screens/ShareScreen';
import { InstallScreen } from './screens/InstallScreen';

const AppLayout: React.FC = () => {
  const keyFlow = useKeyFlow();
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasRedirectedRef = useRef(false);
  const [showInstallScreen, setShowInstallScreen] = useState(false);
  const [installDealershipCode, setInstallDealershipCode] = useState<string | undefined>();

  // Check for install parameter on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const installParam = urlParams.get('install');
    const codeParam = urlParams.get('code');
    
    if (installParam === 'true') {
      setShowInstallScreen(true);
      if (codeParam) {
        setInstallDealershipCode(codeParam);
      }
    }
  }, []);
  

  const {
    currentScreen,
    setCurrentScreen,
    isOwnerMode,
    currentDealership,
    currentUser,
    loading,
    error,
    setError,
    dealerships,
    users,
    keys,
    logs,
    selectedKey,
    setSelectedKey,
    handleLogoTap,
    ownerLogin,
    dealershipLogin,
    logout,
    checkoutKey,
    returnKey,
    updateKeyLocation,
    createKey,
    updateKey,
    updateKeyStatus,
    deleteKey,
    createUser,
    toggleUserActive,
    deleteUser,
    updateDealershipSettings,
    createDealership,
    updateDealership,
    toggleDealershipSuspension,
    deleteDealership,
    fetchKeys,
    LOGO_URL,
    // Persistent session
    persistentSession,
    sessionChecked,
    handleAutoLogin,
    handleClearSession,
    // Demo mode
    isDemoMode,
    enterDemoMode,
    DEMO_MAX_USERS,
    DEMO_MAX_KEYS
  } = keyFlow;

  // Handle redirect for protected screens - only once per session
  useEffect(() => {
    // Skip if we're on a public screen
    if (currentScreen === 'login' || currentScreen === 'owner-login' || currentScreen === 'owner-dashboard') {
      hasRedirectedRef.current = false;
      return;
    }
    
    // If we're on a protected screen without auth, redirect once
    if (!currentDealership || !currentUser) {
      if (!hasRedirectedRef.current) {
        hasRedirectedRef.current = true;
        setCurrentScreen('login');
      }
    }
  }, [currentScreen, currentDealership, currentUser, setCurrentScreen]);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
      errorTimeoutRef.current = setTimeout(() => {
        setError(null);
      }, 5000);
    }
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, [error, setError]);

  // Stable callbacks
  const handleCheckout = useCallback(async (keyId: string, reason: any, bayNumber?: string) => {
    return checkoutKey(keyId, reason, bayNumber);
  }, [checkoutKey]);

  const handleReturn = useCallback(async (keyId: string) => {
    return returnKey(keyId);
  }, [returnKey]);

  const handleUpdateLocation = useCallback(async (keyId: string, location: string) => {
    return updateKeyLocation(keyId, location);
  }, [updateKeyLocation]);

  const handleSelectKey = useCallback((key: any) => {
    setSelectedKey(key);
    setCurrentScreen('key-detail');
  }, [setSelectedKey, setCurrentScreen]);

  const handleNavigate = useCallback((screen: any) => {
    setCurrentScreen(screen);
  }, [setCurrentScreen]);

  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  // Handle continue from install screen
  const handleContinueFromInstall = useCallback(() => {
    setShowInstallScreen(false);
    // Remove the install parameter from URL
    const url = new URL(window.location.href);
    url.searchParams.delete('install');
    window.history.replaceState({}, '', url.toString());
  }, []);

  // Show loading while checking for persistent session
  if (!sessionChecked) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Show install screen if install parameter is present
  if (showInstallScreen) {
    return (
      <InstallScreen
        logoUrl={LOGO_URL}
        dealershipCode={installDealershipCode}
        onContinueToApp={handleContinueFromInstall}
      />
    );
  }


  // Render login screen
  if (currentScreen === 'login') {
    return (
      <div className="min-h-screen bg-slate-900">
        <LoginScreen
          onLogoTap={handleLogoTap}
          onLogin={dealershipLogin}
          error={error}
          loading={loading}
          logoUrl={LOGO_URL}
          persistentSession={persistentSession}
          onAutoLogin={handleAutoLogin}
          onClearSession={handleClearSession}
          onEnterDemo={enterDemoMode}
        />
      </div>
    );
  }

  // Render owner login screen
  if (currentScreen === 'owner-login') {
    return (
      <div className="min-h-screen bg-slate-900">
        <OwnerLoginScreen
          onLogin={ownerLogin}
          onBack={() => handleNavigate('login')}
          error={error}
          loading={loading}
          logoUrl={LOGO_URL}
        />
      </div>
    );
  }

  // Render owner dashboard
  if (currentScreen === 'owner-dashboard') {
    return (
      <div className="min-h-screen bg-slate-900">
        <OwnerDashboard
          dealerships={dealerships}
          onCreateDealership={createDealership}
          onUpdateDealership={updateDealership}
          onToggleSuspension={toggleDealershipSuspension}
          onDeleteDealership={deleteDealership}
          onLogout={handleLogout}
          loading={loading}
          logoUrl={LOGO_URL}
        />
      </div>
    );
  }

  // For protected screens, show login if not authenticated
  if (!currentDealership || !currentUser) {
    return (
      <div className="min-h-screen bg-slate-900">
        <LoginScreen
          onLogoTap={handleLogoTap}
          onLogin={dealershipLogin}
          error={error}
          loading={loading}
          logoUrl={LOGO_URL}
          persistentSession={persistentSession}
          onAutoLogin={handleAutoLogin}
          onClearSession={handleClearSession}
          onEnterDemo={enterDemoMode}
        />
      </div>
    );
  }

  // Demo mode banner component
  const DemoBanner = () => {
    if (!isDemoMode) return null;
    
    const activeKeys = keys.filter(k => k.status !== 'DELETED').length;
    
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-2 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-bold">DEMO MODE</span>
            </div>
            <span className="text-white/80 text-sm hidden sm:inline">
              Users: {users.length}/{DEMO_MAX_USERS} • Keys: {activeKeys}/{DEMO_MAX_KEYS}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
          >
            Exit Demo
          </button>
        </div>
      </div>
    );
  };

  // Render protected screens
  const renderContent = () => {
    switch (currentScreen) {
      case 'admin-dashboard':
        return (
          <AdminDashboard
            dealership={currentDealership}
            user={currentUser}
            keys={keys}
            users={users}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
            logoUrl={LOGO_URL}
          />
        );

      case 'user-home':
        return (
          <ErrorBoundary>
            <UserHome
              dealership={currentDealership}
              user={currentUser}
              keys={keys}
              users={users}
              onCheckout={handleCheckout}
              onReturn={handleReturn}
              onUpdateLocation={handleUpdateLocation}
              onSelectKey={handleSelectKey}
              onRefresh={fetchKeys}
              onNavigate={handleNavigate}
              onLogout={handleLogout}
              loading={loading}
              logoUrl={LOGO_URL}
            />
          </ErrorBoundary>
        );

      case 'keys-management':
        return (
          <KeysManagement
            dealership={currentDealership}
            user={currentUser}
            keys={keys}
            users={users}
            onBack={() => handleNavigate(currentUser.role === 'ADMIN' ? 'admin-dashboard' : 'user-home')}
            onCreateKey={createKey}
            onUpdateKey={updateKey}
            onUpdateStatus={updateKeyStatus}
            onDeleteKey={deleteKey}
            onCheckout={handleCheckout}
            onReturn={handleReturn}
            onUpdateLocation={handleUpdateLocation}
            onSelectKey={handleSelectKey}
            loading={loading}
            error={error}
            onClearError={clearError}
          />
        );

      case 'user-management':
        return (
          <UserManagement
            dealership={currentDealership}
            users={users}
            onBack={() => handleNavigate('admin-dashboard')}
            onCreateUser={createUser}
            onToggleActive={toggleUserActive}
            onDeleteUser={deleteUser}
            loading={loading}
            logoUrl={LOGO_URL}
          />
        );

      case 'logs-reports':
        return (
          <LogsReports
            dealership={currentDealership}
            logs={logs}
            users={users}
            keys={keys}
            onBack={() => handleNavigate('admin-dashboard')}
            logoUrl={LOGO_URL}
          />
        );

      case 'settings':
        return (
          <ErrorBoundary>
            <Settings
              dealership={currentDealership}
              onBack={() => handleNavigate('admin-dashboard')}
              onUpdateSettings={updateDealershipSettings}
              loading={loading}
              logoUrl={LOGO_URL}
            />
          </ErrorBoundary>
        );

      case 'help':
        return (
          <HelpScreen
            dealership={currentDealership}
            user={currentUser}
            isOwnerMode={isOwnerMode}
            onBack={() => {
              if (isOwnerMode) {
                handleNavigate('owner-dashboard');
              } else if (currentUser?.role === 'ADMIN') {
                handleNavigate('admin-dashboard');
              } else {
                handleNavigate('user-home');
              }
            }}
          />
        );

      case 'share':
        return (
          <ShareScreen
            dealership={currentDealership}
            user={currentUser}
            users={users}
            onNavigate={handleNavigate}
            logoUrl={LOGO_URL}
          />
        );

      case 'key-detail':
        if (!selectedKey) {
          return (
            <UserHome
              dealership={currentDealership}
              user={currentUser}
              keys={keys}
              users={users}
              onCheckout={handleCheckout}
              onReturn={handleReturn}
              onUpdateLocation={handleUpdateLocation}
              onSelectKey={handleSelectKey}
              onRefresh={fetchKeys}
              onNavigate={handleNavigate}
              onLogout={handleLogout}
              loading={loading}
              logoUrl={LOGO_URL}
            />
          );
        }
        return (
          <KeyDetail
            dealership={currentDealership}
            user={currentUser}
            users={users}
            keyUnit={selectedKey}
            onBack={() => {
              setSelectedKey(null);
              if (currentUser.role === 'ADMIN') {
                handleNavigate('keys-management');
              } else {
                handleNavigate('user-home');
              }
            }}
            onCheckout={async (keyId, reason, bayNumber) => {
              const success = await checkoutKey(keyId, reason, bayNumber);
              if (success) {
                const updatedKey = keys.find(k => k.id === keyId);
                if (updatedKey) setSelectedKey(updatedKey);
              }
              return success;
            }}
            onReturn={async (keyId) => {
              const success = await returnKey(keyId);
              if (success) {
                const updatedKey = keys.find(k => k.id === keyId);
                if (updatedKey) setSelectedKey(updatedKey);
              }
              return success;
            }}
            onUpdateLocation={async (keyId, location) => {
              const success = await updateKeyLocation(keyId, location);
              if (success) {
                const updatedKey = keys.find(k => k.id === keyId);
                if (updatedKey) setSelectedKey(updatedKey);
              }
              return success;
            }}
            onUpdateStatus={async (keyId, status) => {
              const success = await updateKeyStatus(keyId, status);
              if (success) {
                const updatedKey = keys.find(k => k.id === keyId);
                if (updatedKey) setSelectedKey(updatedKey);
              }
              return success;
            }}
            loading={loading}
          />
        );

      default:
        return (
          <UserHome
            dealership={currentDealership}
            user={currentUser}
            keys={keys}
            users={users}
            onCheckout={handleCheckout}
            onReturn={handleReturn}
            onUpdateLocation={handleUpdateLocation}
            onSelectKey={handleSelectKey}
            onRefresh={fetchKeys}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
            loading={loading}
            logoUrl={LOGO_URL}
          />
        );
    }
  };

  return (
    <div className={`min-h-screen bg-slate-900 ${isDemoMode ? 'pt-10' : ''}`}>
      <DemoBanner />
      {renderContent()}
      
      {/* Global Error Toast */}
      {error && currentScreen !== 'login' && currentScreen !== 'owner-login' && (
        <div className={`fixed ${isDemoMode ? 'bottom-4' : 'bottom-4'} left-4 right-4 z-50`}>
          <div className="max-w-md mx-auto bg-red-500/90 backdrop-blur text-white px-4 py-3 rounded-xl shadow-lg flex items-center justify-between">
            <span className="text-sm">{error}</span>
            <button 
              onClick={clearError}
              className="ml-4 text-white/80 hover:text-white"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppLayout;
