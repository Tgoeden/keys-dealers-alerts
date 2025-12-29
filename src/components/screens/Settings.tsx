import React, { useState, useRef, useCallback, memo } from 'react';
import { 
  SettingsIcon, 
  ChevronLeftIcon,
  LockIcon,
  ClockIcon,
  CheckIcon,
  RefreshIcon,
  DownloadIcon,
  ImageIcon,
  UploadIcon,
  StoreIcon
} from '../ui/Icons';
import { useServiceWorker } from '@/hooks/useServiceWorker';
import type { Dealership } from '@/types';

interface SettingsProps {
  dealership: Dealership;
  onBack: () => void;
  onUpdateSettings: (updates: Partial<Dealership>) => Promise<boolean>;
  loading: boolean;
  logoUrl: string;
}

export const Settings: React.FC<SettingsProps> = memo(({
  dealership,
  onBack,
  onUpdateSettings,
  loading,
  logoUrl
}) => {
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [yellowMinutes, setYellowMinutes] = useState(dealership.alert_yellow_minutes);
  const [redMinutes, setRedMinutes] = useState(dealership.alert_red_minutes);
  const [primaryColor, setPrimaryColor] = useState(dealership.primary_color);
  const [secondaryColor, setSecondaryColor] = useState(dealership.secondary_color);
  const [saved, setSaved] = useState(false);
  const [pinError, setPinError] = useState('');
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  
  // Dealership branding state
  const [dealershipName, setDealershipName] = useState(dealership.name);
  const [customLogoUrl, setCustomLogoUrl] = useState(dealership.logo_url || '');
  const [logoPreviewError, setLogoPreviewError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use service worker context - safe with try/catch in the hook
  const serviceWorker = useServiceWorker();
  const { 
    isUpdateAvailable = false, 
    currentVersion = '1.3.0',
    latestVersion,
    releaseNotes = [],
    isChecking = false,
    checkForUpdates, 
    forceRefresh 
  } = serviceWorker || {};


  const handleSaveAlerts = useCallback(async () => {
    if (yellowMinutes >= redMinutes) {
      return;
    }
    const success = await onUpdateSettings({
      alert_yellow_minutes: yellowMinutes,
      alert_red_minutes: redMinutes
    });
    if (success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }, [yellowMinutes, redMinutes, onUpdateSettings]);

  const handleSaveColors = useCallback(async () => {
    const success = await onUpdateSettings({
      primary_color: primaryColor,
      secondary_color: secondaryColor
    });
    if (success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }, [primaryColor, secondaryColor, onUpdateSettings]);

  const handleChangePin = useCallback(async () => {
    setPinError('');
    if (newPin.length < 4) {
      setPinError('PIN must be at least 4 digits');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('PINs do not match');
      return;
    }
    const success = await onUpdateSettings({ admin_pin_hash: newPin });
    if (success) {
      setNewPin('');
      setConfirmPin('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }, [newPin, confirmPin, onUpdateSettings]);

  const handleCheckUpdates = useCallback(async () => {
    if (!checkForUpdates) return;
    
    setChecking(true);
    try {
      await checkForUpdates();
      setLastChecked(new Date());
    } catch (e) {
      console.error('[Settings] Error checking for updates:', e);
    } finally {
      setTimeout(() => setChecking(false), 1500);
    }
  }, [checkForUpdates]);

  const handleForceRefresh = useCallback(async () => {
    try {
      if (forceRefresh) {
        await forceRefresh();
      } else {
        // Fallback
        window.location.reload();
      }
    } catch (e) {
      console.error('[Settings] Error during force refresh:', e);
      window.location.reload();
    }
  }, [forceRefresh]);

  // Save dealership branding (name and logo)
  const handleSaveBranding = useCallback(async () => {
    const updates: Partial<Dealership> = {
      name: dealershipName,
      logo_url: customLogoUrl || null
    };
    const success = await onUpdateSettings(updates);
    if (success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }, [dealershipName, customLogoUrl, onUpdateSettings]);

  // Handle logo URL change
  const handleLogoUrlChange = useCallback((url: string) => {
    setCustomLogoUrl(url);
    setLogoPreviewError(false);
  }, []);

  // Convert file to base64 for preview and storage
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) {
        alert('Image too large. Please use an image under 500KB or provide a URL instead.');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setCustomLogoUrl(base64String);
        setLogoPreviewError(false);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  // Clear logo
  const handleClearLogo = useCallback(() => {
    setCustomLogoUrl('');
    setLogoPreviewError(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Get display logo
  const displayLogo = customLogoUrl || dealership.logo_url || logoUrl;

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: dealership.secondary_color }}>
      {/* Header */}
      <header 
        className="sticky top-0 z-40 shadow-lg"
        style={{ backgroundColor: dealership.primary_color }}
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-2 text-white/80 hover:text-white">
            <ChevronLeftIcon size={24} />
          </button>
          <div className="flex-1">
            <h1 className="text-white font-bold">Settings</h1>
            <p className="text-white/70 text-xs">{dealership.name}</p>
          </div>
          {saved && (
            <div className="flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
              <CheckIcon size={14} />
              Saved
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Dealership Branding Section */}
        <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <StoreIcon size={18} />
            Dealership Branding
          </h2>
          <p className="text-white/60 text-sm mb-4">
            Customize your dealership name and logo. This will appear at the top of every screen for all users.
          </p>
          
          <div className="space-y-4">
            {/* Dealership Name */}
            <div>
              <label className="block text-white/60 text-sm mb-2">Dealership Name</label>
              <input
                type="text"
                value={dealershipName}
                onChange={(e) => setDealershipName(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40"
                placeholder="Enter dealership name"
              />
            </div>

            {/* Logo Preview */}
            <div>
              <label className="block text-white/60 text-sm mb-2">Logo Preview</label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden">
                  {displayLogo && !logoPreviewError ? (
                    <img 
                      src={displayLogo} 
                      alt="Logo preview" 
                      className="w-full h-full object-contain"
                      onError={() => setLogoPreviewError(true)}
                    />
                  ) : (
                    <ImageIcon className="text-white/40" size={32} />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-white/80 text-sm font-medium">{dealershipName || 'Your Dealership'}</p>
                  <p className="text-white/40 text-xs mt-1">
                    {customLogoUrl ? 'Custom logo set' : 'Using default logo'}
                  </p>
                </div>
              </div>
            </div>

            {/* Logo URL Input */}
            <div>
              <label className="block text-white/60 text-sm mb-2">Logo URL</label>
              <input
                type="url"
                value={customLogoUrl.startsWith('data:') ? '' : customLogoUrl}
                onChange={(e) => handleLogoUrlChange(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40"
                placeholder="https://example.com/logo.png"
              />
              <p className="text-white/40 text-xs mt-1">
                Enter a URL to your logo image, or upload a file below
              </p>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-white/60 text-sm mb-2">Or Upload Logo</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="logo-upload"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <UploadIcon size={18} />
                  Choose File
                </button>
                {customLogoUrl && (
                  <button
                    onClick={handleClearLogo}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg font-medium transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className="text-white/40 text-xs mt-1">
                Recommended: Square image, PNG or JPG, max 500KB
              </p>
            </div>

            {/* Save Branding Button */}
            <button
              onClick={handleSaveBranding}
              disabled={loading}
              className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
            >
              Save Branding
            </button>
          </div>
        </div>

        {/* App Updates Section */}
        <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <RefreshIcon size={18} />
            App Updates
          </h2>
          
          <div className="space-y-4">
            {/* Version Info */}
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

            {/* Last Checked */}
            {lastChecked && (
              <div className="flex justify-between items-center">
                <span className="text-white/60">Last Checked</span>
                <span className="text-white/80 text-sm">
                  {lastChecked.toLocaleTimeString()}
                </span>
              </div>
            )}

            {/* Update Status */}
            {isUpdateAvailable ? (
              <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-green-400">
                  <DownloadIcon size={16} />
                  <span className="font-medium">New update available!</span>
                </div>
                <p className="text-green-400/70 text-sm mt-1">
                  Tap "Force Refresh App" below to get the latest version.
                </p>
                {releaseNotes && releaseNotes.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-green-500/20">
                    <p className="text-green-400/80 text-xs font-medium mb-2">What's new:</p>
                    <ul className="space-y-1">
                      {releaseNotes.map((note, i) => (
                        <li key={i} className="text-xs text-green-400/70 flex items-start gap-2">
                          <CheckIcon size={12} className="mt-0.5 flex-shrink-0" />
                          <span>{note}</span>
                        </li>
                      ))}
                    </ul>
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

            {/* Check for Updates Button */}
            <button
              onClick={handleCheckUpdates}
              disabled={checking || isChecking}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <RefreshIcon size={18} className={(checking || isChecking) ? 'animate-spin' : ''} />
              {(checking || isChecking) ? 'Checking...' : 'Check for Updates'}
            </button>

            {/* Force Refresh Button */}
            <button
              onClick={handleForceRefresh}
              className={`w-full py-3 ${isUpdateAvailable ? 'bg-green-600 hover:bg-green-700' : 'bg-white/10 hover:bg-white/20'} text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors`}
            >
              <DownloadIcon size={18} />
              {isUpdateAvailable ? 'Update Now' : 'Force Refresh App'}
            </button>

            <p className="text-white/40 text-xs text-center">
              {isUpdateAvailable 
                ? 'Tap "Update Now" to get the latest features and fixes.'
                : 'Force refresh will clear cached data and reload the app from the server.'
              }
            </p>
            
            {/* Debug Info */}
            <div className="pt-2 border-t border-white/10">
              <p className="text-white/30 text-xs text-center">
                Build: {currentVersion} | Server: {latestVersion || 'checking...'}
              </p>
            </div>
          </div>
        </div>


        {/* Dealership Info */}
        <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <SettingsIcon size={18} />
            Dealership Info
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-white/60">Name</span>
              <span className="text-white font-medium">{dealership.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/60">Code</span>
              <span className="text-white font-mono">{dealership.code}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/60">Type</span>
              <span className={`px-2 py-1 rounded text-sm ${
                dealership.dealer_type === 'AUTO' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
              }`}>
                {dealership.dealer_type}
              </span>
            </div>
          </div>
        </div>

        {/* Alert Thresholds */}
        <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <ClockIcon size={18} />
            Alert Thresholds
          </h2>
          <p className="text-white/60 text-sm mb-4">
            Set when checkout timers change color to warn about overdue keys.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-yellow-400 text-sm mb-2">
                Yellow Alert (Warning) - Minutes
              </label>
              <input
                type="number"
                value={yellowMinutes}
                onChange={(e) => setYellowMinutes(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2 bg-white/10 border border-yellow-500/30 rounded-lg text-white"
                min={1}
              />
            </div>
            <div>
              <label className="block text-red-400 text-sm mb-2">
                Red Alert (Overdue) - Minutes
              </label>
              <input
                type="number"
                value={redMinutes}
                onChange={(e) => setRedMinutes(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2 bg-white/10 border border-red-500/30 rounded-lg text-white"
                min={yellowMinutes + 1}
              />
            </div>
            {yellowMinutes >= redMinutes && (
              <p className="text-red-400 text-sm">Yellow threshold must be less than red threshold</p>
            )}
            <button
              onClick={handleSaveAlerts}
              disabled={loading || yellowMinutes >= redMinutes}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg"
            >
              Save Alert Settings
            </button>
          </div>
        </div>

        {/* Branding */}
        <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10">
          <h2 className="text-white font-semibold mb-4">Branding Colors</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-white/60 text-sm mb-2">Primary Color (Header)</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-12 h-12 rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-white/60 text-sm mb-2">Secondary Color (Background)</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-12 h-12 rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white font-mono"
                />
              </div>
            </div>
            <div className="p-4 rounded-lg" style={{ backgroundColor: secondaryColor }}>
              <div className="h-8 rounded" style={{ backgroundColor: primaryColor }}></div>
              <p className="text-white/60 text-xs mt-2 text-center">Preview</p>
            </div>
            <button
              onClick={handleSaveColors}
              disabled={loading}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg"
            >
              Save Colors
            </button>
          </div>
        </div>

        {/* Change PIN */}
        <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <LockIcon size={18} />
            Change Admin PIN
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-white/60 text-sm mb-2">New PIN</label>
              <input
                type="password"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-center tracking-widest"
                placeholder="••••"
                maxLength={6}
              />
            </div>
            <div>
              <label className="block text-white/60 text-sm mb-2">Confirm PIN</label>
              <input
                type="password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-center tracking-widest"
                placeholder="••••"
                maxLength={6}
              />
            </div>
            {pinError && (
              <p className="text-red-400 text-sm">{pinError}</p>
            )}
            <button
              onClick={handleChangePin}
              disabled={loading || !newPin || !confirmPin}
              className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg"
            >
              Update PIN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

Settings.displayName = 'Settings';
