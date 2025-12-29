import React, { useState, useEffect, useRef, memo } from 'react';
import { RefreshIcon, DownloadIcon, WifiOffIcon, CheckIcon } from './Icons';

interface UpdateNotificationProps {
  isUpdateAvailable: boolean;
  isOffline: boolean;
  currentVersion: string;
  latestVersion?: string;
  releaseNotes?: string[];
  onUpdate: () => void;
  onCheckUpdates: () => void;
  primaryColor?: string;
}

export const UpdateNotification: React.FC<UpdateNotificationProps> = memo(({
  isUpdateAvailable,
  isOffline,
  currentVersion,
  latestVersion,
  releaseNotes = [],
  onUpdate,
  onCheckUpdates,
  primaryColor = '#1e1b4b'
}) => {
  const [showNotes, setShowNotes] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const mountedRef = useRef(true);
  const visibilityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track mounted state
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
      }
    };
  }, []);

  // Delay showing the notification to prevent crashes during transitions
  useEffect(() => {
    if (isUpdateAvailable || isOffline) {
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
      }
      visibilityTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setIsVisible(true);
        }
      }, 500);
    } else {
      setIsVisible(false);
    }

    return () => {
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
      }
    };
  }, [isUpdateAvailable, isOffline]);

  // Safe update handler
  const handleUpdate = async () => {
    if (isUpdating || !mountedRef.current) return;
    
    setIsUpdating(true);
    try {
      await onUpdate();
    } catch (error) {
      console.error('[UpdateNotification] Error applying update:', error);
      if (mountedRef.current) {
        setIsUpdating(false);
      }
    }
  };

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  if (isOffline) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-up">
        <div className="bg-yellow-500 text-yellow-900 px-4 py-3 rounded-xl shadow-lg flex items-center gap-3">
          <WifiOffIcon size={20} />
          <div className="flex-1">
            <p className="font-medium text-sm">You're offline</p>
            <p className="text-xs opacity-80">Some features may be limited</p>
          </div>
        </div>
      </div>
    );
  }

  if (isUpdateAvailable) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-up">
        <div 
          className="text-white px-4 py-3 rounded-xl shadow-lg"
          style={{ backgroundColor: primaryColor }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <DownloadIcon size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">Update Available!</p>
              <p className="text-xs opacity-80">
                {latestVersion ? `v${currentVersion} → v${latestVersion}` : 'A new version is ready'}
              </p>
            </div>
            <button
              onClick={handleUpdate}
              disabled={isUpdating}
              className="px-4 py-2 bg-white text-indigo-900 rounded-lg font-medium text-sm hover:bg-white/90 transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? 'Updating...' : 'Update'}
            </button>
          </div>
          
          {releaseNotes.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/20">
              <button
                onClick={() => setShowNotes(!showNotes)}
                className="text-xs text-white/70 hover:text-white flex items-center gap-1"
              >
                {showNotes ? 'Hide' : 'Show'} what's new
              </button>
              
              {showNotes && (
                <ul className="mt-2 space-y-1">
                  {releaseNotes.map((note, i) => (
                    <li key={i} className="text-xs text-white/80 flex items-start gap-2">
                      <CheckIcon size={12} className="mt-0.5 flex-shrink-0" />
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
});

UpdateNotification.displayName = 'UpdateNotification';

// Update button for settings/manual check
interface UpdateButtonProps {
  onCheckUpdates: () => void;
  onForceRefresh: () => void;
  currentVersion: string;
  latestVersion?: string;
  isUpdateAvailable: boolean;
  releaseNotes?: string[];
  isChecking?: boolean;
  loading?: boolean;
}

export const UpdateButton: React.FC<UpdateButtonProps> = memo(({
  onCheckUpdates,
  onForceRefresh,
  currentVersion,
  latestVersion,
  isUpdateAvailable,
  releaseNotes = [],
  isChecking = false,
  loading = false
}) => {
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleCheck = async () => {
    if (checking || !mountedRef.current) return;
    
    setChecking(true);
    try {
      await onCheckUpdates();
      if (mountedRef.current) {
        setLastChecked(new Date());
      }
    } catch (error) {
      console.error('[UpdateButton] Error checking for updates:', error);
    } finally {
      if (mountedRef.current) {
        setTimeout(() => {
          if (mountedRef.current) {
            setChecking(false);
          }
        }, 1500);
      }
    }
  };

  const handleForceRefresh = async () => {
    if (isRefreshing || !mountedRef.current) return;
    
    setIsRefreshing(true);
    try {
      await onForceRefresh();
    } catch (error) {
      console.error('[UpdateButton] Error during force refresh:', error);
      if (mountedRef.current) {
        setIsRefreshing(false);
      }
    }
  };

  const isCheckingNow = checking || isChecking;

  return (
    <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10">
      <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
        <RefreshIcon size={18} />
        App Updates
      </h2>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-white/60">Current Version</span>
          <span className="text-white font-mono bg-white/10 px-2 py-1 rounded">
            v{currentVersion}
          </span>
        </div>

        {latestVersion && latestVersion !== currentVersion && (
          <div className="flex justify-between items-center">
            <span className="text-white/60">Latest Version</span>
            <span className="text-green-400 font-mono bg-green-500/20 px-2 py-1 rounded">
              v{latestVersion}
            </span>
          </div>
        )}

        {lastChecked && (
          <div className="flex justify-between items-center">
            <span className="text-white/60">Last Checked</span>
            <span className="text-white/80 text-sm">
              {lastChecked.toLocaleTimeString()}
            </span>
          </div>
        )}

        {isUpdateAvailable ? (
          <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-green-400">
              <DownloadIcon size={16} />
              <span className="font-medium">New update available!</span>
            </div>
            <p className="text-green-400/70 text-sm mt-1">
              Tap "Force Refresh App" below to get the latest version.
            </p>
            
            {releaseNotes.length > 0 && (
              <div className="mt-2">
                <button
                  onClick={() => setShowNotes(!showNotes)}
                  className="text-xs text-green-400/70 hover:text-green-400"
                >
                  {showNotes ? 'Hide' : 'Show'} what's new
                </button>
                
                {showNotes && (
                  <ul className="mt-2 space-y-1">
                    {releaseNotes.map((note, i) => (
                      <li key={i} className="text-xs text-green-400/80 flex items-start gap-2">
                        <CheckIcon size={12} className="mt-0.5 flex-shrink-0" />
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
            <div className="flex items-center gap-2 text-white/60">
              <CheckIcon size={16} />
              <span className="text-sm">You're running the latest version</span>
            </div>
          </div>
        )}

        <button
          onClick={handleCheck}
          disabled={isCheckingNow || loading}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <RefreshIcon size={18} className={isCheckingNow ? 'animate-spin' : ''} />
          {isCheckingNow ? 'Checking...' : 'Check for Updates'}
        </button>

        <button
          onClick={handleForceRefresh}
          disabled={loading || isRefreshing}
          className={`w-full py-3 ${isUpdateAvailable ? 'bg-green-600 hover:bg-green-700' : 'bg-white/10 hover:bg-white/20'} disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors`}
        >
          <DownloadIcon size={18} />
          {isRefreshing ? 'Refreshing...' : (isUpdateAvailable ? 'Update Now' : 'Force Refresh App')}
        </button>

        <p className="text-white/40 text-xs text-center">
          {isUpdateAvailable 
            ? 'Tap "Update Now" to get the latest features and fixes.'
            : 'Force refresh will clear cached data and reload the app from the server.'
          }
        </p>
        
        <div className="pt-2 border-t border-white/10">
          <p className="text-white/30 text-xs text-center">
            Build: {currentVersion} | Server: {latestVersion || 'checking...'}
          </p>
        </div>
      </div>
    </div>
  );
});

UpdateButton.displayName = 'UpdateButton';
