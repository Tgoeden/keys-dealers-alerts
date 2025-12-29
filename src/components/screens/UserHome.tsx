import React, { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { 
  KeyIcon, 
  SearchIcon, 
  LogOutIcon,
  ClockIcon,
  RefreshIcon,
  HelpIcon,
  XIcon,
  UserIcon,
  DownloadIcon,
  SettingsIcon,
  MapPinIcon,
  WrenchIcon,
  BoxIcon
} from '../ui/Icons';
import { useServiceWorker } from '@/hooks/useServiceWorker';
import { UpdateNotification } from '../ui/UpdateNotification';
import type { Dealership, User, KeyWithCheckout, Screen, CheckoutReason } from '@/types';
import { 
  getStatusLabel, 
  getStatusColor,
  AUTO_CHECKOUT_REASONS,
  RV_CHECKOUT_REASONS,
  getCheckoutReasonLabel,
  getCheckoutReasonColor,
  KEY_BOX_VALUE,
  getLocationLabel
} from '@/types';


interface UserHomeProps {
  dealership: Dealership;
  user: User;
  keys: KeyWithCheckout[];
  users: User[];
  onCheckout: (keyId: string, reason: CheckoutReason, bayNumber?: string) => Promise<boolean>;
  onReturn: (keyId: string) => Promise<boolean>;
  onUpdateLocation: (keyId: string, location: string) => Promise<boolean>;
  onSelectKey: (key: KeyWithCheckout) => void;
  onRefresh: () => void;
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
  loading: boolean;
  logoUrl: string;
}

type FilterType = 'all' | 'available' | 'checked-out' | 'overdue' | 'sold';
type CategoryFilter = 'all' | 'NEW' | 'USED';

export const UserHome: React.FC<UserHomeProps> = memo(({
  dealership,
  user,
  keys,
  users,
  onCheckout,
  onReturn,
  onUpdateLocation,
  onSelectKey,
  onRefresh,
  onNavigate,
  onLogout,
  loading,
  logoUrl
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showCheckoutModal, setShowCheckoutModal] = useState<KeyWithCheckout | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState<KeyWithCheckout | null>(null);
  const [selectedReason, setSelectedReason] = useState<CheckoutReason | null>(null);
  const [selectedBay, setSelectedBay] = useState<string>('');
  const [locationInput, setLocationInput] = useState<string>('');

  // Use service worker context - safe with try/catch in the hook
  const serviceWorker = useServiceWorker();
  const { 
    isUpdateAvailable = false, 
    isOffline = false, 
    currentVersion = '1.3.0',
    latestVersion,
    isReady = false,
    checkForUpdates, 
    applyUpdate,
    forceRefresh 
  } = serviceWorker || {};

  const checkoutReasons = dealership.dealer_type === 'AUTO' ? AUTO_CHECKOUT_REASONS : RV_CHECKOUT_REASONS;

  // Update time every second for live timers
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCheckoutWithReason = useCallback(async (reason: CheckoutReason) => {
    if (reason === 'SERVICE') {
      setSelectedReason(reason);
      return;
    }
    
    if (!showCheckoutModal) return;
    const success = await onCheckout(showCheckoutModal.id, reason);
    if (success) {
      setShowCheckoutModal(null);
      setSelectedReason(null);
      setSelectedBay('');
    }
  }, [showCheckoutModal, onCheckout]);

  const handleServiceCheckout = useCallback(async () => {
    if (!showCheckoutModal || !selectedBay) return;
    const success = await onCheckout(showCheckoutModal.id, 'SERVICE', selectedBay);
    if (success) {
      setShowCheckoutModal(null);
      setSelectedReason(null);
      setSelectedBay('');
    }
  }, [showCheckoutModal, selectedBay, onCheckout]);

  const handleLocationUpdate = useCallback(async (location: string) => {
    if (!showLocationModal) return;
    const success = await onUpdateLocation(showLocationModal.id, location);
    if (success) {
      setShowLocationModal(null);
    }
  }, [showLocationModal, onUpdateLocation]);

  // Get user display name with multiple fallback options
  const getUserDisplayName = useCallback((key: KeyWithCheckout): string => {
    if (key.checked_out_by?.first_name || key.checked_out_by?.last_name) {
      return `${key.checked_out_by.first_name || ''} ${key.checked_out_by.last_name || ''}`.trim();
    }
    
    const sessionUser = key.checkout_session?.user;
    if (sessionUser?.first_name || sessionUser?.last_name) {
      return `${sessionUser.first_name || ''} ${sessionUser.last_name || ''}`.trim();
    }
    
    if (key.checkout_session?.checked_out_by_user_id && users.length > 0) {
      const foundUser = users.find(u => u.id === key.checkout_session?.checked_out_by_user_id);
      if (foundUser) {
        return `${foundUser.first_name || ''} ${foundUser.last_name || ''}`.trim();
      }
    }
    
    return 'Unknown User';
  }, [users]);

  const filteredKeys = useMemo(() => {
    let result = keys.filter(k => k.status !== 'DELETED');

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(k => 
        k.stock_number.toLowerCase().includes(query) ||
        k.make?.toLowerCase().includes(query) ||
        k.model?.toLowerCase().includes(query) ||
        k.color?.toLowerCase().includes(query) ||
        k.checked_out_by?.first_name?.toLowerCase().includes(query) ||
        k.checked_out_by?.last_name?.toLowerCase().includes(query) ||
        (k.checkout_session?.checked_out_by_user_id && users.find(u => 
          u.id === k.checkout_session?.checked_out_by_user_id &&
          (`${u.first_name} ${u.last_name}`.toLowerCase().includes(query))
        ))
      );
    }

    if (categoryFilter !== 'all') {
      result = result.filter(k => k.category === categoryFilter);
    }

    switch (filter) {
      case 'available':
        result = result.filter(k => k.status === 'ACTIVE' && !k.checkout_session?.is_open);
        break;
      case 'checked-out':
        result = result.filter(k => k.checkout_session?.is_open);
        break;
      case 'overdue':
        result = result.filter(k => 
          k.checkout_session?.alert_state === 'YELLOW' || 
          k.checkout_session?.alert_state === 'RED'
        );
        break;
      case 'sold':
        result = result.filter(k => k.status === 'SOLD');
        break;
    }

    return result;
  }, [keys, searchQuery, filter, categoryFilter, users]);

  const formatElapsed = useCallback((minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }, []);

  const filters: { value: FilterType; label: string; count: number }[] = useMemo(() => [
    { value: 'all', label: 'All', count: keys.filter(k => k.status !== 'DELETED').length },
    { value: 'available', label: 'Available', count: keys.filter(k => k.status === 'ACTIVE' && !k.checkout_session?.is_open).length },
    { value: 'checked-out', label: 'Checked Out', count: keys.filter(k => k.checkout_session?.is_open).length },
    { value: 'overdue', label: 'Overdue', count: keys.filter(k => k.checkout_session?.alert_state === 'YELLOW' || k.checkout_session?.alert_state === 'RED').length },
    { value: 'sold', label: 'Sold', count: keys.filter(k => k.status === 'SOLD').length },
  ], [keys]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await onRefresh();
    setTimeout(() => setRefreshing(false), 500);
  }, [onRefresh]);

  const handleApplyUpdate = useCallback(async () => {
    try {
      if (applyUpdate) {
        await applyUpdate();
      }
    } catch (e) {
      console.error('[UserHome] Error applying update:', e);
    }
  }, [applyUpdate]);

  const handleCheckForUpdates = useCallback(async () => {
    try {
      if (checkForUpdates) {
        await checkForUpdates();
      }
    } catch (e) {
      console.error('[UserHome] Error checking for updates:', e);
    }
  }, [checkForUpdates]);

  const handleForceRefresh = useCallback(async () => {
    try {
      if (forceRefresh) {
        await forceRefresh();
      }
    } catch (e) {
      console.error('[UserHome] Error force refreshing:', e);
      window.location.reload();
    }
  }, [forceRefresh]);

  return (
    <div className="min-h-screen pb-6" style={{ backgroundColor: dealership.secondary_color }}>
      {/* Update Notification - only show when ready */}
      {isReady && (
        <UpdateNotification
          isUpdateAvailable={isUpdateAvailable}
          isOffline={isOffline}
          currentVersion={currentVersion}
          onUpdate={handleApplyUpdate}
          onCheckUpdates={handleCheckForUpdates}
          primaryColor={dealership.primary_color}
        />
      )}

      {/* Header */}
      <header 
        className="sticky top-0 z-40 shadow-lg"
        style={{ backgroundColor: dealership.primary_color }}
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={dealership.logo_url || logoUrl} 
              alt={dealership.name} 
              className="w-10 h-10 rounded-xl bg-white/20"
            />
            <div>
              <h1 className="text-white font-bold">{dealership.name}</h1>
              <p className="text-white/70 text-xs">
                Welcome, {user.first_name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isReady && isUpdateAvailable && (
              <button
                onClick={handleApplyUpdate}
                className="p-2 text-green-400 hover:text-green-300 hover:bg-white/10 rounded-lg transition-colors animate-pulse"
                title="Update available"
              >
                <DownloadIcon size={20} />
              </button>
            )}
            <button
              onClick={handleRefresh}
              className={`p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors ${
                refreshing ? 'animate-spin' : ''
              }`}
            >
              <RefreshIcon size={20} />
            </button>
            <button
              onClick={() => setShowUpdateModal(true)}
              className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="App Settings"
            >
              <SettingsIcon size={20} />
            </button>
            <button
              onClick={() => onNavigate('help')}
              className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <HelpIcon size={20} />
            </button>
            <button
              onClick={onLogout}
              className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <LogOutIcon size={20} />
            </button>
          </div>
        </div>
      </header>


      {/* Search & Filter */}
      <div className="max-w-6xl mx-auto px-4 py-4 space-y-3">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by stock #, make, model, user..."
            className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
          />
        </div>

        {/* Category Filter (New/Used) */}
        <div className="flex gap-2">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              categoryFilter === 'all'
                ? 'bg-white text-gray-900'
                : 'bg-white/10 text-white/80 hover:bg-white/20'
            }`}
          >
            All Types
          </button>
          <button
            onClick={() => setCategoryFilter('NEW')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              categoryFilter === 'NEW'
                ? 'bg-green-500 text-white'
                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
            }`}
          >
            New
          </button>
          <button
            onClick={() => setCategoryFilter('USED')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              categoryFilter === 'USED'
                ? 'bg-blue-500 text-white'
                : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
            }`}
          >
            Used
          </button>
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          {filters.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
                filter === f.value
                  ? 'bg-white text-gray-900'
                  : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              {f.label}
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                filter === f.value ? 'bg-gray-200' : 'bg-white/20'
              }`}>
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Keys List */}
      <div className="max-w-6xl mx-auto px-4 space-y-3">
        {filteredKeys.map(key => {
          const isCheckedOut = key.checkout_session?.is_open;
          const isMyCheckout = key.checkout_session?.checked_out_by_user_id === user.id;
          const canCheckout = !isCheckedOut && key.status === 'ACTIVE';
          const userName = getUserDisplayName(key);
          const alertState = key.checkout_session?.alert_state;
          const currentLocation = key.checkout_session?.current_location;
          const isServiceCheckout = key.checkout_session?.checkout_reason === 'SERVICE';

          return (
            <div
              key={key.id}
              onClick={() => onSelectKey(key)}
              className={`bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10 cursor-pointer hover:bg-white/15 transition-colors ${
                alertState === 'RED' ? 'ring-2 ring-red-500' :
                alertState === 'YELLOW' ? 'ring-2 ring-yellow-500' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-white font-bold text-lg">{key.stock_number}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      key.category === 'NEW' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {key.category}
                    </span>
                    {key.status !== 'ACTIVE' && (
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(key.status)}`}>
                        {getStatusLabel(key.status)}
                      </span>
                    )}
                  </div>
                  <p className="text-white/70 text-sm">
                    {[key.year, key.make, key.model].filter(Boolean).join(' ') || 'No details'}
                    {key.color && <span className="text-white/50"> • {key.color}</span>}
                  </p>
                  
                  {isCheckedOut && (
                    <div className={`mt-3 p-4 rounded-lg border-2 ${
                      alertState === 'RED' ? 'bg-red-500/20 border-red-500/50' :
                      alertState === 'YELLOW' ? 'bg-yellow-500/20 border-yellow-500/50' :
                      'bg-blue-500/20 border-blue-500/50'
                    }`}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          alertState === 'RED' ? 'bg-red-500' :
                          alertState === 'YELLOW' ? 'bg-yellow-500' :
                          'bg-blue-500'
                        }`}>
                          <UserIcon size={20} className="text-white" />
                        </div>
                        <div>
                          <p className="text-xs text-white/60 uppercase tracking-wide">Checked Out By</p>
                          <p className="text-white font-bold text-lg">
                            {userName}
                            {isMyCheckout && <span className="text-white/50 ml-2 text-sm font-normal">(You)</span>}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${getCheckoutReasonColor(key.checkout_session?.checkout_reason)}`}>
                          {getCheckoutReasonLabel(key.checkout_session?.checkout_reason)}
                        </span>
                        <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg">
                          <ClockIcon size={16} className={
                            alertState === 'RED' ? 'text-red-400' :
                            alertState === 'YELLOW' ? 'text-yellow-400' :
                            'text-green-400'
                          } />
                          <span className="text-white/70 text-sm">Out for:</span>
                          <span className={`font-bold text-lg ${
                            alertState === 'RED' ? 'text-red-400' :
                            alertState === 'YELLOW' ? 'text-yellow-400' :
                            'text-green-400'
                          }`}>
                            {formatElapsed(key.checkout_session?.elapsed_minutes || 0)}
                          </span>
                        </div>
                      </div>

                      {isServiceCheckout && currentLocation && (
                        <div className="mt-3 flex items-center gap-2 bg-amber-500/20 px-3 py-2 rounded-lg">
                          <MapPinIcon size={16} className="text-amber-400" />
                          <span className="text-amber-400 font-medium">
                            Location: {getLocationLabel(currentLocation)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {canCheckout && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCheckoutModal(key);
                      }}
                      disabled={loading}
                      className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-colors shadow-lg"
                    >
                      Check Out
                    </button>
                  )}
                  {isCheckedOut && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onReturn(key.id);
                        }}
                        disabled={loading}
                        className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shadow-lg"
                      >
                        Return
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowLocationModal(key);
                        }}
                        disabled={loading}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-xl transition-colors shadow-lg flex items-center gap-2 justify-center"
                      >
                        <MapPinIcon size={16} />
                        Update Location
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredKeys.length === 0 && (
          <div className="text-center py-12 text-white/60">
            <KeyIcon className="mx-auto mb-4 opacity-50" size={48} />
            <p className="text-lg mb-2">No keys found</p>
            <p className="text-sm">Try adjusting your search or filter</p>
          </div>
        )}
      </div>

      {/* Alert Legend */}
      <div className="max-w-6xl mx-auto px-4 mt-6">
        <div className="bg-white/5 rounded-xl p-4">
          <p className="text-white/60 text-xs mb-2">Alert Thresholds</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-white/70">&lt; {dealership.alert_yellow_minutes} min</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-white/70">{dealership.alert_yellow_minutes}-{dealership.alert_red_minutes} min</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-white/70">&gt; {dealership.alert_red_minutes} min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Reason Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl w-full max-w-sm">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                {selectedReason === 'SERVICE' ? 'Select Bay Number' : 'Select Reason'}
              </h2>
              <button 
                onClick={() => {
                  setShowCheckoutModal(null);
                  setSelectedReason(null);
                  setSelectedBay('');
                }} 
                className="text-white/60 hover:text-white"
              >
                <XIcon size={20} />
              </button>
            </div>
            <div className="p-4">
              {selectedReason === 'SERVICE' ? (
                <>
                  <p className="text-white/60 text-sm mb-4">
                    Enter the bay number for <span className="text-white font-medium">{showCheckoutModal.stock_number}</span>
                  </p>
                  <div className="mb-4">
                    <label className="block text-white/60 text-sm mb-2">Bay Number</label>
                    <input
                      type="text"
                      value={selectedBay}
                      onChange={(e) => setSelectedBay(e.target.value)}
                      placeholder="Enter bay number (e.g., 1, 2A, Shop 3)"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                      autoFocus
                    />
                  </div>
                  <button
                    onClick={handleServiceCheckout}
                    disabled={!selectedBay.trim() || loading}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium"
                  >
                    {loading ? 'Processing...' : 'Confirm Checkout'}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-white/60 text-sm mb-4">
                    Why are you checking out <span className="text-white font-medium">{showCheckoutModal.stock_number}</span>?
                  </p>
                  <div className="space-y-2">
                    {checkoutReasons.map(reason => (
                      <button
                        key={reason.value}
                        onClick={() => handleCheckoutWithReason(reason.value)}
                        disabled={loading}
                        className={`w-full py-3 rounded-lg text-left px-4 transition-colors flex items-center gap-3 ${getCheckoutReasonColor(reason.value)} hover:opacity-80`}
                      >
                        {reason.value === 'SERVICE' && <WrenchIcon size={18} />}
                        {reason.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}


      {/* Update Location Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl w-full max-w-sm">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Update Location</h2>
              <button 
                onClick={() => {
                  setShowLocationModal(null);
                  setLocationInput('');
                }} 
                className="text-white/60 hover:text-white"
              >
                <XIcon size={20} />
              </button>
            </div>
            <div className="p-4">
              <p className="text-white/60 text-sm mb-4">
                Where is <span className="text-white font-medium">{showLocationModal.stock_number}</span> now?
              </p>
              
              {showLocationModal.checkout_session?.current_location && (
                <div className="mb-4 p-3 bg-white/5 rounded-lg">
                  <p className="text-white/60 text-xs mb-1">Current Location</p>
                  <p className="text-white font-medium flex items-center gap-2">
                    <MapPinIcon size={16} className="text-amber-400" />
                    {getLocationLabel(showLocationModal.checkout_session.current_location)}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-white/60 text-sm mb-2">
                    <WrenchIcon size={14} className="inline mr-1" />
                    Move to Bay
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      placeholder="Enter bay number (e.g., 1, 2A, Shop 3)"
                      className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                    />
                    <button
                      onClick={async () => {
                        if (locationInput.trim()) {
                          const success = await handleLocationUpdate(locationInput.trim());
                          if (success !== false) {
                            setLocationInput('');
                          }
                        }
                      }}
                      disabled={!locationInput.trim() || loading}
                      className="px-4 py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium"
                    >
                      Update
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-white/10"></div>
                  <span className="text-white/40 text-xs uppercase">or</span>
                  <div className="flex-1 h-px bg-white/10"></div>
                </div>

                <button
                  onClick={() => handleLocationUpdate(KEY_BOX_VALUE)}
                  disabled={loading}
                  className="w-full py-3 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors flex items-center justify-center gap-2"
                >
                  <BoxIcon size={18} />
                  Return to Key Box
                </button>
              </div>
            </div>
          </div>
        </div>
      )}




      {/* Update Settings Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl w-full max-w-sm max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-slate-800">
              <h2 className="text-lg font-semibold text-white">App Settings</h2>
              <button onClick={() => setShowUpdateModal(false)} className="text-white/60 hover:text-white">
                <XIcon size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-white/60">Current Version</span>
                <span className="text-white font-mono bg-white/10 px-2 py-1 rounded">
                  v{currentVersion}
                </span>
              </div>

              {isUpdateAvailable ? (
                <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                  <div className="flex items-center gap-2 text-green-400">
                    <DownloadIcon size={16} />
                    <span className="font-medium">New update available!</span>
                  </div>
                  <p className="text-green-400/70 text-sm mt-1">
                    Tap the button below to update to the latest version.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                  <p className="text-white/60 text-sm">
                    You're running the latest version of KeyFlow.
                  </p>
                </div>
              )}

              <button
                onClick={handleCheckForUpdates}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <RefreshIcon size={18} />
                Check for Updates
              </button>

              {isUpdateAvailable && (
                <button
                  onClick={handleApplyUpdate}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <DownloadIcon size={18} />
                  Update Now
                </button>
              )}

              <button
                onClick={handleForceRefresh}
                className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <DownloadIcon size={18} />
                Force Refresh App
              </button>

              <p className="text-white/40 text-xs text-center">
                Force refresh will clear cached data and reload the app from the server.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

UserHome.displayName = 'UserHome';
