import React, { useState, useEffect } from 'react';
import { 
  KeyIcon, 
  ChevronLeftIcon,
  ClockIcon,
  UserIcon,
  CheckIcon,
  XIcon,
  MapPinIcon,
  WrenchIcon,
  BoxIcon,
  RefreshIcon,
  MoveIcon,
  MoreHorizontalIcon
} from '../ui/Icons';
import type { Dealership, User, KeyWithCheckout, KeyEventLog, CheckoutReason, KeyStatus } from '@/types';
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

import { supabase } from '@/lib/supabase';


interface KeyDetailProps {
  dealership: Dealership;
  user: User;
  users: User[];
  keyUnit: KeyWithCheckout;
  onBack: () => void;
  onCheckout: (keyId: string, reason: CheckoutReason, bayNumber?: string) => Promise<boolean>;
  onReturn: (keyId: string) => Promise<boolean>;
  onUpdateLocation: (keyId: string, location: string) => Promise<boolean>;
  onUpdateStatus?: (keyId: string, status: KeyStatus) => Promise<boolean>;
  loading: boolean;
}

export const KeyDetail: React.FC<KeyDetailProps> = ({
  dealership,
  user,
  users,
  keyUnit,
  onBack,
  onCheckout,
  onReturn,
  onUpdateLocation,
  onUpdateStatus,
  loading
}) => {
  const [history, setHistory] = useState<KeyEventLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState<CheckoutReason | null>(null);
  const [selectedBay, setSelectedBay] = useState<string>('');
  const [locationInput, setLocationInput] = useState<string>('');

  const checkoutReasons = dealership.dealer_type === 'AUTO' ? AUTO_CHECKOUT_REASONS : RV_CHECKOUT_REASONS;
  const isAdmin = user.role === 'ADMIN';

  useEffect(() => {
    const fetchHistory = async () => {
      const { data } = await supabase
        .from('key_event_logs')
        .select('*, user:users(*)')
        .eq('key_unit_id', keyUnit.id)
        .order('timestamp', { ascending: false })
        .limit(20);
      
      if (data) setHistory(data);
      setLoadingHistory(false);
    };
    fetchHistory();
  }, [keyUnit.id]);

  const isCheckedOut = keyUnit.checkout_session?.is_open;
  const canCheckout = !isCheckedOut && keyUnit.status === 'ACTIVE';
  const canReactivate = isAdmin && keyUnit.status === 'SOLD' && !isCheckedOut && onUpdateStatus;
  const currentLocation = keyUnit.checkout_session?.current_location;
  const isServiceCheckout = keyUnit.checkout_session?.checkout_reason === 'SERVICE';


  const handleCheckoutWithReason = async (reason: CheckoutReason) => {
    // If SERVICE is selected, show bay selection
    if (reason === 'SERVICE') {
      setSelectedReason(reason);
      return;
    }
    
    const success = await onCheckout(keyUnit.id, reason);
    if (success) {
      setShowCheckoutModal(false);
      setSelectedReason(null);
      setSelectedBay('');
    }
  };

  const handleServiceCheckout = async () => {
    if (!selectedBay) return;
    const success = await onCheckout(keyUnit.id, 'SERVICE', selectedBay);
    if (success) {
      setShowCheckoutModal(false);
      setSelectedReason(null);
      setSelectedBay('');
    }
  };

  const handleLocationUpdate = async (location: string) => {
    const success = await onUpdateLocation(keyUnit.id, location);
    if (success) {
      setShowLocationModal(false);
    }
  };

  // Get user display name with multiple fallback options
  const getUserDisplayName = (): string => {
    // First try checked_out_by
    if (keyUnit.checked_out_by?.first_name || keyUnit.checked_out_by?.last_name) {
      return `${keyUnit.checked_out_by.first_name || ''} ${keyUnit.checked_out_by.last_name || ''}`.trim();
    }
    
    // Then try checkout_session.user
    const sessionUser = keyUnit.checkout_session?.user;
    if (sessionUser?.first_name || sessionUser?.last_name) {
      return `${sessionUser.first_name || ''} ${sessionUser.last_name || ''}`.trim();
    }
    
    // Try to find user from users list by checked_out_by_user_id
    if (keyUnit.checkout_session?.checked_out_by_user_id && users.length > 0) {
      const foundUser = users.find(u => u.id === keyUnit.checkout_session?.checked_out_by_user_id);
      if (foundUser) {
        return `${foundUser.first_name || ''} ${foundUser.last_name || ''}`.trim();
      }
    }
    
    return 'Unknown User';
  };

  // Get user display name for history entries
  const getHistoryUserName = (log: KeyEventLog): string => {
    if (log.user?.first_name || log.user?.last_name) {
      return `${log.user.first_name || ''} ${log.user.last_name || ''}`.trim();
    }
    
    // Try to find user from users list
    if (log.performed_by_user_id && users.length > 0) {
      const foundUser = users.find(u => u.id === log.performed_by_user_id);
      if (foundUser) {
        return `${foundUser.first_name || ''} ${foundUser.last_name || ''}`.trim();
      }
    }
    
    return 'System';
  };

  const formatElapsed = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'CHECKOUT': 'Checked Out',
      'RETURN': 'Returned',
      'STATUS_CHANGE': 'Status Changed',
      'CREATE_KEY': 'Created',
      'UPDATE_KEY': 'Updated',
      'LOCATION_UPDATE': 'Location Updated'
    };
    return labels[action] || action;
  };

  const alertState = keyUnit.checkout_session?.alert_state;

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
            <h1 className="text-white font-bold">{keyUnit.stock_number}</h1>
            <p className="text-white/70 text-xs">Key Details</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Key Info Card */}
        <div className={`bg-white/10 backdrop-blur rounded-xl p-6 border border-white/10 ${
          alertState === 'RED' ? 'ring-2 ring-red-500' :
          alertState === 'YELLOW' ? 'ring-2 ring-yellow-500' : ''
        }`}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl font-bold text-white">{keyUnit.stock_number}</span>
                <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                  keyUnit.category === 'NEW' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {keyUnit.category}
                </span>
              </div>
              <span className={`px-3 py-1 rounded-lg text-sm font-medium ${getStatusColor(keyUnit.status)}`}>
                {getStatusLabel(keyUnit.status)}
              </span>
            </div>
            <div className="p-3 bg-white/10 rounded-xl">
              <KeyIcon className="text-white/80" size={32} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {keyUnit.year && (
              <div>
                <p className="text-white/50 text-xs">Year</p>
                <p className="text-white font-medium">{keyUnit.year}</p>
              </div>
            )}
            {keyUnit.make && (
              <div>
                <p className="text-white/50 text-xs">Make</p>
                <p className="text-white font-medium">{keyUnit.make}</p>
              </div>
            )}
            {keyUnit.model && (
              <div>
                <p className="text-white/50 text-xs">Model</p>
                <p className="text-white font-medium">{keyUnit.model}</p>
              </div>
            )}
            {keyUnit.color && (
              <div>
                <p className="text-white/50 text-xs">Color</p>
                <p className="text-white font-medium">{keyUnit.color}</p>
              </div>
            )}
          </div>

          {/* Checkout Status - VERY PROMINENT */}
          {isCheckedOut && (
            <div className={`p-5 rounded-xl mb-4 border-2 ${
              alertState === 'RED' ? 'bg-red-500/20 border-red-500/50' :
              alertState === 'YELLOW' ? 'bg-yellow-500/20 border-yellow-500/50' :
              'bg-blue-500/20 border-blue-500/50'
            }`}>
              {/* User Name - Large and Prominent */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  alertState === 'RED' ? 'bg-red-500' :
                  alertState === 'YELLOW' ? 'bg-yellow-500' :
                  'bg-blue-500'
                }`}>
                  <UserIcon size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-xs text-white/60 uppercase tracking-wide">Checked Out By</p>
                  <p className="text-white font-bold text-2xl">
                    {getUserDisplayName()}
                  </p>
                </div>
              </div>
              
              {/* Checkout Reason */}
              <div className="flex items-center gap-2 mb-4">
                <span className={`px-4 py-2 rounded-lg text-sm font-medium ${getCheckoutReasonColor(keyUnit.checkout_session?.checkout_reason)}`}>
                  {getCheckoutReasonLabel(keyUnit.checkout_session?.checkout_reason)}
                </span>
              </div>

              {/* Current Location for Service checkouts */}
              {isServiceCheckout && currentLocation && (
                <div className="mb-4 flex items-center gap-2 bg-amber-500/20 px-4 py-3 rounded-lg">
                  <MapPinIcon size={20} className="text-amber-400" />
                  <span className="text-amber-400 font-medium text-lg">
                    Location: {getLocationLabel(currentLocation)}
                  </span>
                </div>
              )}

              {/* Duration */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2 text-white/60 text-sm">
                  <ClockIcon size={14} />
                  <span>Checked out at {formatDate(keyUnit.checkout_session?.checked_out_at || '')}</span>
                </div>
                <div className="flex items-center gap-2 bg-black/20 px-4 py-2 rounded-lg">
                  <span className="text-white/70 text-sm">Out for:</span>
                  <span className={`text-3xl font-bold ${
                    alertState === 'RED' ? 'text-red-400' :
                    alertState === 'YELLOW' ? 'text-yellow-400' :
                    'text-green-400'
                  }`}>
                    {formatElapsed(keyUnit.checkout_session?.elapsed_minutes || 0)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            {canCheckout && (
              <button
                onClick={() => setShowCheckoutModal(true)}
                disabled={loading}
                className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
              >
                Check Out Key
              </button>
            )}
            {isCheckedOut && (
              <div className="flex gap-3">
                <button
                  onClick={() => onReturn(keyUnit.id)}
                  disabled={loading}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
                >
                  Return Key
                </button>
                <button
                  onClick={() => setShowLocationModal(true)}
                  disabled={loading}
                  className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <MapPinIcon size={18} />
                  Update Location
                </button>
              </div>
            )}
            {/* Reactivate button for SOLD keys - Admin only */}
            {canReactivate && (
              <button
                onClick={() => onUpdateStatus!(keyUnit.id, 'ACTIVE')}
                disabled={loading}
                className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <RefreshIcon size={18} />
                Reactivate Key (Mark as Available)
              </button>
            )}
            {keyUnit.status !== 'ACTIVE' && !isCheckedOut && !canReactivate && (
              <div className="w-full py-3 bg-white/10 text-white/60 font-medium rounded-xl text-center">
                Key is {getStatusLabel(keyUnit.status).toLowerCase()}
              </div>
            )}
          </div>

        </div>

        {/* History */}
        <div className="bg-white/10 backdrop-blur rounded-xl border border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h2 className="text-white font-semibold">Recent History</h2>
          </div>
          
          {loadingHistory ? (
            <div className="p-8 text-center text-white/60">
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
            </div>
          ) : history.length > 0 ? (
            <div className="divide-y divide-white/10">
              {history.map(log => (
                <div key={log.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      log.action_type === 'CHECKOUT' ? 'bg-orange-500/20 text-orange-400' :
                      log.action_type === 'RETURN' ? 'bg-green-500/20 text-green-400' :
                      log.action_type === 'LOCATION_UPDATE' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {log.action_type === 'CHECKOUT' || log.action_type === 'RETURN' ? (
                        <KeyIcon size={16} />
                      ) : log.action_type === 'LOCATION_UPDATE' ? (
                        <MapPinIcon size={16} />
                      ) : (
                        <CheckIcon size={16} />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{getActionLabel(log.action_type)}</p>
                      
                      {/* User Info - Prominent */}
                      <div className="flex items-center gap-2 mt-1">
                        <UserIcon size={14} className="text-white/50" />
                        <p className="text-white/80 text-sm font-medium">
                          {getHistoryUserName(log)}
                        </p>
                      </div>
                      
                      {/* Checkout Reason */}
                      {log.action_type === 'CHECKOUT' && log.details_json?.reason && (
                        <span className={`inline-block mt-2 px-2 py-1 rounded text-xs font-medium ${getCheckoutReasonColor(log.details_json.reason)}`}>
                          {getCheckoutReasonLabel(log.details_json.reason)}
                        </span>
                      )}

                      {/* Bay Number for checkout */}
                      {log.action_type === 'CHECKOUT' && log.details_json?.bay_number && (
                        <span className="inline-block mt-2 ml-2 px-2 py-1 rounded text-xs font-medium bg-amber-500/20 text-amber-400">
                          {getLocationLabel(log.details_json.bay_number)}
                        </span>
                      )}

                      {/* Location Update Details */}
                      {log.action_type === 'LOCATION_UPDATE' && log.details_json?.new_location && (
                        <span className="inline-block mt-2 px-2 py-1 rounded text-xs font-medium bg-amber-500/20 text-amber-400">
                          Moved to {getLocationLabel(log.details_json.new_location)}
                        </span>
                      )}
                    </div>
                    <div className="text-white/50 text-xs">
                      {formatDate(log.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-white/60">
              <p>No history yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Checkout Reason Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl w-full max-w-sm">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                {selectedReason === 'SERVICE' ? 'Enter Bay Number' : 'Select Reason'}
              </h2>
              <button 
                onClick={() => {
                  setShowCheckoutModal(false);
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
                    Enter the bay number for <span className="text-white font-medium">{keyUnit.stock_number}</span>
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
                    Why are you checking out <span className="text-white font-medium">{keyUnit.stock_number}</span>?
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
                        {reason.value === 'MOVE' && <MoveIcon size={18} />}
                        {reason.value === 'MISCELLANEOUS' && <MoreHorizontalIcon size={18} />}
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
                  setShowLocationModal(false);
                  setLocationInput('');
                }} 
                className="text-white/60 hover:text-white"
              >
                <XIcon size={20} />
              </button>
            </div>
            <div className="p-4">
              <p className="text-white/60 text-sm mb-4">
                Where is <span className="text-white font-medium">{keyUnit.stock_number}</span> now?
              </p>
              
              {/* Current Location Display */}
              {currentLocation && (
                <div className="mb-4 p-3 bg-white/5 rounded-lg">
                  <p className="text-white/60 text-xs mb-1">Current Location</p>
                  <p className="text-white font-medium flex items-center gap-2">
                    <MapPinIcon size={16} className="text-amber-400" />
                    {getLocationLabel(currentLocation)}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                {/* Bay Number Input */}
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
                          await handleLocationUpdate(locationInput.trim());
                          setLocationInput('');
                        }
                      }}
                      disabled={!locationInput.trim() || loading}
                      className="px-4 py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium"
                    >
                      Update
                    </button>
                  </div>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-white/10"></div>
                  <span className="text-white/40 text-xs uppercase">or</span>
                  <div className="flex-1 h-px bg-white/10"></div>
                </div>

                {/* Key Box Option */}
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
    </div>
  );
};
