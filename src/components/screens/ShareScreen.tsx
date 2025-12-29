import React, { useState } from 'react';
import { 
  ShareIcon, 
  CopyIcon, 
  CheckIcon,
  SmartphoneIcon,
  ChevronLeftIcon,
  UsersIcon,
  KeyIcon,
  HomeIcon,
  ClipboardIcon,
  SettingsIcon
} from '../ui/Icons';
import type { Dealership, User, Screen } from '@/types';

interface ShareScreenProps {
  dealership: Dealership;
  user: User;
  users: User[];
  onNavigate: (screen: Screen) => void;
  logoUrl: string;
}

export const ShareScreen: React.FC<ShareScreenProps> = ({
  dealership,
  user,
  users,
  onNavigate,
  logoUrl
}) => {
  const [copied, setCopied] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);

  // Get the base URL of the app
  const getBaseUrl = () => {
    return window.location.origin + window.location.pathname;
  };

  // Generate install URL for sharing (with install=true parameter)
  const getInstallShareUrl = () => {
    const baseUrl = getBaseUrl();
    return `${baseUrl}?install=true&code=${dealership.code}`;
  };

  // Generate share URL for user access (without install parameter, for direct login)
  const getUserShareUrl = () => {
    const baseUrl = getBaseUrl();
    return `${baseUrl}?code=${dealership.code}`;
  };

  // Copy to clipboard with fallback for older browsers
  const copyToClipboard = async (text: string, type: string) => {
    try {
      // Try the modern Clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers using execCommand
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (!successful) {
          throw new Error('execCommand copy failed');
        }
      }
      
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      // Show a user-friendly message - the URL is still visible so they can manually copy
      alert('Unable to copy automatically. Please manually select and copy the text.');
    }
  };



  // Share via Web Share API with robust fallback - uses install URL
  const handleShare = async (type: 'user' | 'install') => {
    const url = type === 'install' ? getInstallShareUrl() : getUserShareUrl();
    const title = `KeyFlow - ${dealership.name}`;
    const text = `Join ${dealership.name} on KeyFlow! Open this link to install the app and access the key management system.`;

    // Check if Web Share API is available
    if (navigator.share && typeof navigator.share === 'function') {
      try {
        // Create the share data object
        const shareData = {
          title,
          text,
          url
        };

        // Check if we can share this data (some browsers support canShare)
        if (navigator.canShare && !navigator.canShare(shareData)) {
          // Can't share this data, fall back to clipboard
          await copyToClipboard(url, type);
          return;
        }

        // Attempt to share - this must be called synchronously from the click handler
        await navigator.share(shareData);
        setShareSuccess(type);
        setTimeout(() => setShareSuccess(null), 3000);
      } catch (err) {
        const error = err as Error;
        
        // Handle specific error types
        if (error.name === 'AbortError') {
          // User cancelled the share - this is fine, do nothing
          return;
        }
        
        if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
          // Permission denied or security error - fall back to clipboard
          console.warn('Share not allowed, falling back to clipboard:', error.message);
          await copyToClipboard(url, type);
          return;
        }

        // For any other error, fall back to clipboard
        console.warn('Share failed, falling back to clipboard:', error.message);
        await copyToClipboard(url, type);
      }
    } else {
      // Web Share API not available - fall back to clipboard
      await copyToClipboard(url, type);
    }
  };


  const activeUsers = users.filter(u => u.is_active && u.role === 'USER');

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: dealership.secondary_color }}>
      {/* Header */}
      <header 
        className="sticky top-0 z-40 shadow-lg"
        style={{ backgroundColor: dealership.primary_color }}
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => onNavigate('admin-dashboard')}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronLeftIcon size={20} />
          </button>
          <img 
            src={dealership.logo_url || logoUrl} 
            alt={dealership.name} 
            className="w-10 h-10 rounded-xl bg-white/20"
          />
          <div>
            <h1 className="text-white font-bold">Share Access</h1>
            <p className="text-white/70 text-xs">{dealership.name}</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Instructions Card */}
        <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
              <SmartphoneIcon className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-white font-semibold text-lg">Share App Access</h2>
              <p className="text-white/60 text-sm">Invite users to install KeyFlow</p>
            </div>
          </div>
          
          <div className="space-y-3 text-white/80 text-sm">
            <p className="font-medium text-white">How it works:</p>
            <ol className="list-decimal list-inside space-y-2 ml-2">
              <li>Share the link below with your team members</li>
              <li>They open the link in <span className="font-semibold text-blue-400">Safari (iPhone)</span> or <span className="font-semibold text-green-400">Chrome (Android)</span></li>
              <li>On the login screen, they enter your dealership code: <span className="font-mono bg-white/20 px-2 py-0.5 rounded">{dealership.code}</span></li>
              <li>They tap the share button and select "Add to Home Screen"</li>
              <li>The app icon appears on their home screen!</li>
            </ol>
          </div>
        </div>

        {/* Install Link Card - Primary sharing option */}
        <div className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 backdrop-blur rounded-xl p-6 border border-emerald-500/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
              <SmartphoneIcon className="text-white" size={20} />
            </div>
            <div>
              <h3 className="text-white font-semibold">Install Link</h3>
              <p className="text-white/60 text-sm">Best for sharing via text/messaging apps</p>
            </div>
          </div>

          <p className="text-white/70 text-sm mb-4">
            This link includes install instructions that help users add the app to their home screen, even when opened from messaging apps.
          </p>

          {/* URL Display */}
          <div className="bg-black/30 rounded-lg p-3 mb-4">
            <p className="text-white/60 text-xs mb-1">Install URL:</p>
            <p className="text-white font-mono text-sm break-all">{getInstallShareUrl()}</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => handleShare('install')}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <ShareIcon size={18} />
              {shareSuccess === 'install' ? 'Shared!' : 'Share Install Link'}
            </button>
            <button
              onClick={() => copyToClipboard(getInstallShareUrl(), 'install')}
              className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {copied === 'install' ? <CheckIcon size={18} className="text-green-400" /> : <CopyIcon size={18} />}
              {copied === 'install' ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Direct Access Link Card */}
        <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <UsersIcon className="text-white" size={20} />
            </div>
            <div>
              <h3 className="text-white font-semibold">Direct Access Link</h3>
              <p className="text-white/60 text-sm">For users who already have the app installed</p>
            </div>
          </div>

          {/* URL Display */}
          <div className="bg-black/30 rounded-lg p-3 mb-4">
            <p className="text-white/60 text-xs mb-1">Direct URL:</p>
            <p className="text-white font-mono text-sm break-all">{getUserShareUrl()}</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => handleShare('user')}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <ShareIcon size={18} />
              {shareSuccess === 'user' ? 'Shared!' : 'Share Link'}
            </button>
            <button
              onClick={() => copyToClipboard(getUserShareUrl(), 'user')}
              className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {copied === 'user' ? <CheckIcon size={18} className="text-green-400" /> : <CopyIcon size={18} />}
              {copied === 'user' ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>


        {/* Share Message Template - Updated to use install link */}
        <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/10">
          <h3 className="text-white font-semibold mb-3">Sample Message</h3>
          <div className="bg-black/30 rounded-lg p-4 text-white/80 text-sm">
            <p className="mb-2">Hi! You've been invited to use KeyFlow for {dealership.name}.</p>
            <p className="mb-2">1. Open this link: {getInstallShareUrl()}</p>
            <p className="mb-2">2. Follow the instructions to add the app to your home screen</p>
            <p className="mb-2">3. Enter dealership code: <span className="font-mono font-bold">{dealership.code}</span></p>
            <p>4. Log in with your username and PIN (provided by admin)</p>
          </div>
          <button
            onClick={() => copyToClipboard(
              `Hi! You've been invited to use KeyFlow for ${dealership.name}.\n\n1. Open this link: ${getInstallShareUrl()}\n2. Follow the instructions to add the app to your home screen\n3. Enter dealership code: ${dealership.code}\n4. Log in with your username and PIN (provided by admin)`,
              'message'
            )}
            className="mt-3 w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {copied === 'message' ? <CheckIcon size={16} className="text-green-400" /> : <CopyIcon size={16} />}
            {copied === 'message' ? 'Copied!' : 'Copy Message'}
          </button>
        </div>


        {/* Active Users */}
        {activeUsers.length > 0 && (
          <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/10">
            <h3 className="text-white font-semibold mb-4">Active Users ({activeUsers.length})</h3>
            <div className="space-y-2">
              {activeUsers.map(u => (
                <div key={u.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{u.first_name} {u.last_name}</p>
                    <p className="text-white/60 text-sm">@{u.username}</p>
                  </div>
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                    Active
                  </span>
                </div>
              ))}
            </div>
            <p className="text-white/50 text-xs mt-3">
              Users need their username and PIN to log in. Manage users in User Management.
            </p>
          </div>
        )}

        {/* iOS/Android Instructions */}
        <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 backdrop-blur rounded-xl p-6 border border-white/10">
          <h3 className="text-white font-semibold mb-4">Add to Home Screen Instructions</h3>
          
          <div className="space-y-4">
            {/* iOS */}
            <div className="p-4 bg-black/20 rounded-lg">
              <p className="text-white font-medium mb-2 flex items-center gap-2">
                <span className="text-2xl">🍎</span> iPhone/iPad (Safari only)
              </p>
              <ol className="text-white/70 text-sm list-decimal list-inside space-y-1">
                <li>Open the link in <span className="text-blue-400 font-medium">Safari</span></li>
                <li>Tap the Share button (square with arrow)</li>
                <li>Scroll down and tap "Add to Home Screen"</li>
                <li>Tap "Add" to confirm</li>
              </ol>
            </div>

            {/* Android */}
            <div className="p-4 bg-black/20 rounded-lg">
              <p className="text-white font-medium mb-2 flex items-center gap-2">
                <span className="text-2xl">🤖</span> Android (Chrome)
              </p>
              <ol className="text-white/70 text-sm list-decimal list-inside space-y-1">
                <li>Open the link in <span className="text-green-400 font-medium">Chrome</span></li>
                <li>Tap the menu (3 dots in top right)</li>
                <li>Tap "Add to Home screen"</li>
                <li>Tap "Add" to confirm</li>
              </ol>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black/40 backdrop-blur-lg border-t border-white/10 safe-area-pb">
        <div className="max-w-6xl mx-auto flex">
          <button
            onClick={() => onNavigate('admin-dashboard')}
            className="flex-1 py-3 flex flex-col items-center text-white/60 hover:text-white"
          >
            <HomeIcon size={20} />
            <span className="text-xs mt-1">Home</span>
          </button>
          <button
            onClick={() => onNavigate('keys-management')}
            className="flex-1 py-3 flex flex-col items-center text-white/60 hover:text-white"
          >
            <KeyIcon size={20} />
            <span className="text-xs mt-1">Keys</span>
          </button>
          <button
            onClick={() => onNavigate('share')}
            className="flex-1 py-3 flex flex-col items-center text-white"
          >
            <ShareIcon size={20} />
            <span className="text-xs mt-1">Share</span>
          </button>
          <button
            onClick={() => onNavigate('logs-reports')}
            className="flex-1 py-3 flex flex-col items-center text-white/60 hover:text-white"
          >
            <ClipboardIcon size={20} />
            <span className="text-xs mt-1">Logs</span>
          </button>
          <button
            onClick={() => onNavigate('settings')}
            className="flex-1 py-3 flex flex-col items-center text-white/60 hover:text-white"
          >
            <SettingsIcon size={20} />
            <span className="text-xs mt-1">Settings</span>
          </button>
        </div>
      </nav>
    </div>
  );
};
