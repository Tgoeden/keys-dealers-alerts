import React, { useState, useEffect } from 'react';
import { 
  SmartphoneIcon, 
  CopyIcon, 
  CheckIcon,
  ExternalLinkIcon,
  ChevronRightIcon
} from '../ui/Icons';

interface InstallScreenProps {
  logoUrl: string;
  dealershipCode?: string;
  onContinueToApp: () => void;
}

export const InstallScreen: React.FC<InstallScreenProps> = ({
  logoUrl,
  dealershipCode,
  onContinueToApp
}) => {
  const [copied, setCopied] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [browserType, setBrowserType] = useState<'ios' | 'android' | 'desktop'>('desktop');
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detect if running as installed PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                       (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Detect browser type
    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isAndroid = /android/.test(ua);
    
    if (isIOS) {
      setBrowserType('ios');
    } else if (isAndroid) {
      setBrowserType('android');
    } else {
      setBrowserType('desktop');
    }

    // Detect in-app browsers
    const inAppBrowserPatterns = [
      'fban', 'fbav', // Facebook
      'instagram', // Instagram
      'twitter', // Twitter
      'linkedin', // LinkedIn
      'snapchat', // Snapchat
      'pinterest', // Pinterest
      'tiktok', // TikTok
      'wechat', 'micromessenger', // WeChat
      'line', // Line
      'telegram', // Telegram
      'whatsapp', // WhatsApp (sometimes)
      'crios', // Chrome iOS (not in-app but different)
      'fxios', // Firefox iOS
      'gsa', // Google Search App
      'duckduckgo', // DuckDuckGo
    ];

    // Check for in-app browser indicators
    const isInApp = inAppBrowserPatterns.some(pattern => ua.includes(pattern)) ||
                    // iOS in-app browser detection
                    (isIOS && !ua.includes('safari') && ua.includes('applewebkit')) ||
                    // Check for common in-app browser headers
                    document.referrer.includes('instagram') ||
                    document.referrer.includes('facebook');

    setIsInAppBrowser(isInApp);
  }, []);

  const getCurrentUrl = () => {
    const url = new URL(window.location.href);
    // Remove the install parameter for the final URL
    url.searchParams.delete('install');
    if (dealershipCode) {
      url.searchParams.set('code', dealershipCode);
    }
    return url.toString();
  };

  const copyToClipboard = async () => {
    const url = getCurrentUrl();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const openInSafari = () => {
    // For iOS, we can try to open in Safari using a workaround
    // This creates a link that forces Safari to open
    const url = getCurrentUrl();
    
    // Try the x-safari scheme (works on some iOS versions)
    // Fallback: just copy the URL and show instructions
    if (browserType === 'ios') {
      // Create a temporary link and try to open it
      const safariUrl = `x-safari-${url}`;
      window.location.href = safariUrl;
      
      // If that doesn't work after a short delay, show manual instructions
      setTimeout(() => {
        copyToClipboard();
      }, 500);
    }
  };

  const openInChrome = () => {
    const url = getCurrentUrl();
    // For Android, try intent URL
    if (browserType === 'android') {
      const intentUrl = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
      window.location.href = intentUrl;
      
      // Fallback
      setTimeout(() => {
        copyToClipboard();
      }, 500);
    }
  };

  // If already installed as PWA, just continue to app
  if (isStandalone) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-xl">
            <CheckIcon size={40} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">App Installed!</h1>
          <p className="text-white/60 mb-6">KeyFlow is ready to use</p>
          <button
            onClick={onContinueToApp}
            className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            Open App
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="p-6 text-center">
        <img 
          src={logoUrl} 
          alt="KeyFlow" 
          className="w-16 h-16 mx-auto rounded-2xl shadow-lg mb-4"
        />
        <h1 className="text-2xl font-bold text-white">Install KeyFlow</h1>
        <p className="text-white/60 mt-1">Add to your home screen for quick access</p>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 pb-8 max-w-lg mx-auto w-full">
        {isInAppBrowser ? (
          /* In-App Browser Detected */
          <div className="space-y-6">
            {/* Warning Card */}
            <div className="bg-amber-500/20 border border-amber-500/30 rounded-2xl p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-white font-semibold text-lg">Open in Browser Required</h2>
                  <p className="text-white/70 text-sm mt-1">
                    You're viewing this in an app. To install KeyFlow, you need to open this page in {browserType === 'ios' ? 'Safari' : 'Chrome'}.
                  </p>
                </div>
              </div>
            </div>

            {/* Step-by-step Instructions */}
            <div className="bg-white/5 backdrop-blur rounded-2xl p-5 border border-white/10">
              <h3 className="text-white font-semibold mb-4">How to Install:</h3>
              
              <div className="space-y-4">
                {/* Step 1 */}
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">Copy the link</p>
                    <p className="text-white/60 text-sm">Tap the button below to copy</p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">
                      Open {browserType === 'ios' ? 'Safari' : 'Chrome'}
                    </p>
                    <p className="text-white/60 text-sm">
                      {browserType === 'ios' 
                        ? 'Look for the Safari icon (compass) on your home screen'
                        : 'Look for the Chrome icon on your home screen'}
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">Paste the link</p>
                    <p className="text-white/60 text-sm">
                      Tap the address bar and paste the copied link
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                    4
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">Add to Home Screen</p>
                    <p className="text-white/60 text-sm">
                      {browserType === 'ios'
                        ? 'Tap the Share button (square with arrow), then "Add to Home Screen"'
                        : 'Tap the menu (3 dots), then "Add to Home screen"'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Copy Button */}
            <button
              onClick={copyToClipboard}
              className={`w-full py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-3 transition-all ${
                copied 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:shadow-lg hover:shadow-blue-500/30'
              }`}
            >
              {copied ? (
                <>
                  <CheckIcon size={24} />
                  Link Copied!
                </>
              ) : (
                <>
                  <CopyIcon size={24} />
                  Copy Link
                </>
              )}
            </button>

            {/* URL Display */}
            <div className="bg-black/30 rounded-xl p-4">
              <p className="text-white/40 text-xs mb-1">Link to copy:</p>
              <p className="text-white/80 text-sm font-mono break-all">{getCurrentUrl()}</p>
            </div>
          </div>
        ) : (
          /* Native Browser - Show Add to Home Screen Instructions */
          <div className="space-y-6">
            {/* Success Card */}
            <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-2xl p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <CheckIcon size={24} className="text-white" />
                </div>
                <div>
                  <h2 className="text-white font-semibold text-lg">Ready to Install!</h2>
                  <p className="text-white/70 text-sm mt-1">
                    You're in the right browser. Follow the steps below to add KeyFlow to your home screen.
                  </p>
                </div>
              </div>
            </div>

            {browserType === 'ios' && (
              /* iOS Safari Instructions */
              <div className="bg-white/5 backdrop-blur rounded-2xl p-5 border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">iPhone / iPad</h3>
                    <p className="text-white/60 text-sm">Safari browser</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-3 bg-white/5 rounded-xl">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">Tap the Share button</p>
                      <p className="text-white/60 text-sm">At the bottom of Safari (square with arrow pointing up)</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-3 bg-white/5 rounded-xl">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">Tap "Add to Home Screen"</p>
                      <p className="text-white/60 text-sm">Scroll down in the share menu to find it</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-3 bg-white/5 rounded-xl">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                      <CheckIcon size={24} className="text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">Tap "Add"</p>
                      <p className="text-white/60 text-sm">The app icon will appear on your home screen</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {browserType === 'android' && (
              /* Android Chrome Instructions */
              <div className="bg-white/5 backdrop-blur rounded-2xl p-5 border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">Android</h3>
                    <p className="text-white/60 text-sm">Chrome browser</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-3 bg-white/5 rounded-xl">
                    <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="5" r="2"/>
                        <circle cx="12" cy="12" r="2"/>
                        <circle cx="12" cy="19" r="2"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">Tap the menu button</p>
                      <p className="text-white/60 text-sm">Three dots in the top right corner</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-3 bg-white/5 rounded-xl">
                    <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">Tap "Add to Home screen"</p>
                      <p className="text-white/60 text-sm">Or "Install app" if available</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-3 bg-white/5 rounded-xl">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                      <CheckIcon size={24} className="text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">Tap "Add" or "Install"</p>
                      <p className="text-white/60 text-sm">The app will be added to your home screen</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {browserType === 'desktop' && (
              /* Desktop Instructions */
              <div className="bg-white/5 backdrop-blur rounded-2xl p-5 border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center">
                    <SmartphoneIcon size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">Desktop Browser</h3>
                    <p className="text-white/60 text-sm">Chrome, Edge, or other browsers</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-3 bg-white/5 rounded-xl">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">Look for the install icon</p>
                      <p className="text-white/60 text-sm">In the address bar (usually on the right side)</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-3 bg-white/5 rounded-xl">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                      <CheckIcon size={24} className="text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">Click "Install"</p>
                      <p className="text-white/60 text-sm">The app will open in its own window</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Continue to App Button */}
            <button
              onClick={onContinueToApp}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold text-lg rounded-xl shadow-lg hover:shadow-xl hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
            >
              Continue to App
              <ChevronRightIcon size={20} />
            </button>

            <p className="text-center text-white/40 text-sm">
              You can also use the app in your browser without installing
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="p-4 text-center">
        <p className="text-white/30 text-xs">KeyFlow - Key Management System</p>
      </footer>
    </div>
  );
};
