import React, { useState, useEffect } from 'react';
import { 
  KeyIcon, 
  UsersIcon, 
  ClipboardIcon, 
  SettingsIcon, 
  LogOutIcon,
  ClockIcon,
  AlertIcon,
  CheckIcon,
  HomeIcon,
  HelpIcon,
  UserIcon,
  ShareIcon,
  MapPinIcon
} from '../ui/Icons';
import type { Dealership, User, KeyWithCheckout, Screen } from '@/types';
import { getCheckoutReasonLabel, getCheckoutReasonColor, getLocationLabel } from '@/types';

interface AdminDashboardProps {
  dealership: Dealership;
  user: User;
  keys: KeyWithCheckout[];
  users: User[];
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
  logoUrl: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  dealership,
  user,
  keys,
  users,
  onNavigate,
  onLogout,
  logoUrl
}) => {

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate KPIs
  const keysOut = keys.filter(k => k.checkout_session?.is_open).length;
  const overdueYellow = keys.filter(k => k.checkout_session?.alert_state === 'YELLOW').length;
  const overdueRed = keys.filter(k => k.checkout_session?.alert_state === 'RED').length;
  const activeKeys = keys.filter(k => k.status === 'ACTIVE').length;
  
  // Find longest checkout
  const longestCheckout = keys
    .filter(k => k.checkout_session?.is_open)
    .sort((a, b) => (b.checkout_session?.elapsed_minutes || 0) - (a.checkout_session?.elapsed_minutes || 0))[0];

  const formatElapsed = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  // Get user display name with multiple fallback options
  const getUserDisplayName = (key: KeyWithCheckout): string => {
    // First try checked_out_by
    if (key.checked_out_by?.first_name || key.checked_out_by?.last_name) {
      return `${key.checked_out_by.first_name || ''} ${key.checked_out_by.last_name || ''}`.trim();
    }
    
    // Then try checkout_session.user
    const sessionUser = key.checkout_session?.user;
    if (sessionUser?.first_name || sessionUser?.last_name) {
      return `${sessionUser.first_name || ''} ${sessionUser.last_name || ''}`.trim();
    }
    
    // Try to find user from users list by checked_out_by_user_id
    if (key.checkout_session?.checked_out_by_user_id && users.length > 0) {
      const foundUser = users.find(u => u.id === key.checkout_session?.checked_out_by_user_id);
      if (foundUser) {
        return `${foundUser.first_name || ''} ${foundUser.last_name || ''}`.trim();
      }
    }
    
    return 'Unknown User';
  };

  const menuItems = [
    { icon: KeyIcon, label: 'Keys Management', screen: 'keys-management' as Screen, color: 'bg-blue-500' },
    { icon: UsersIcon, label: 'User Management', screen: 'user-management' as Screen, color: 'bg-green-500' },
    { icon: ShareIcon, label: 'Share Access', screen: 'share' as Screen, color: 'bg-purple-500' },
    { icon: ClipboardIcon, label: 'Logs & Reports', screen: 'logs-reports' as Screen, color: 'bg-orange-500' },
    { icon: SettingsIcon, label: 'Settings', screen: 'settings' as Screen, color: 'bg-gray-500' },
    { icon: HelpIcon, label: 'Help', screen: 'help' as Screen, color: 'bg-cyan-500' },
  ];

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: dealership.secondary_color }}>
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
              <p className="text-white/70 text-xs">Admin Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/60 text-sm hidden sm:block">
              {user.first_name} {user.last_name}
            </span>
            <button
              onClick={onLogout}
              className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <LogOutIcon size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <KeyIcon className="text-blue-400" size={20} />
              <span className="text-white/60 text-sm">Keys Out</span>
            </div>
            <p className="text-3xl font-bold text-white">{keysOut}</p>
            <p className="text-white/40 text-xs">of {activeKeys} active</p>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <AlertIcon className="text-yellow-400" size={20} />
              <span className="text-white/60 text-sm">Overdue</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-yellow-400">{overdueYellow}</span>
              <span className="text-white/40">/</span>
              <span className="text-3xl font-bold text-red-400">{overdueRed}</span>
            </div>
            <p className="text-white/40 text-xs">yellow / red</p>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <ClockIcon className="text-purple-400" size={20} />
              <span className="text-white/60 text-sm">Longest Out</span>
            </div>
            <p className="text-3xl font-bold text-white">
              {longestCheckout?.checkout_session?.elapsed_minutes 
                ? formatElapsed(longestCheckout.checkout_session.elapsed_minutes)
                : '--'}
            </p>
            <p className="text-white/40 text-xs truncate">
              {longestCheckout?.stock_number || 'No checkouts'}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <CheckIcon className="text-green-400" size={20} />
              <span className="text-white/60 text-sm">Available</span>
            </div>
            <p className="text-3xl font-bold text-green-400">{activeKeys - keysOut}</p>
            <p className="text-white/40 text-xs">ready for checkout</p>
          </div>
        </div>

        {/* Quick Actions */}
        <h2 className="text-white/80 font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {menuItems.map((item) => (
            <button
              key={item.screen}
              onClick={() => onNavigate(item.screen)}
              className="bg-white/10 backdrop-blur hover:bg-white/20 rounded-xl p-4 transition-all hover:scale-105 border border-white/10"
            >
              <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center mb-3 mx-auto`}>
                <item.icon className="text-white" size={24} />
              </div>
              <p className="text-white text-sm font-medium text-center">{item.label}</p>
            </button>
          ))}
        </div>

        {/* Currently Checked Out */}
        <h2 className="text-white/80 font-semibold mb-4">Currently Checked Out</h2>
        <div className="bg-white/10 backdrop-blur rounded-xl border border-white/10 overflow-hidden">
          {keys.filter(k => k.checkout_session?.is_open).length > 0 ? (
            <div className="divide-y divide-white/10">
              {keys
                .filter(k => k.checkout_session?.is_open)
                .sort((a, b) => (b.checkout_session?.elapsed_minutes || 0) - (a.checkout_session?.elapsed_minutes || 0))
                .slice(0, 10)
                .map(key => {
                  const userName = getUserDisplayName(key);
                  const alertState = key.checkout_session?.alert_state;
                  const elapsedMinutes = key.checkout_session?.elapsed_minutes || 0;
                  
                  return (
                    <div 
                      key={key.id} 
                      className={`p-4 ${
                        alertState === 'RED' ? 'bg-red-500/10' :
                        alertState === 'YELLOW' ? 'bg-yellow-500/10' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Vehicle Info */}
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="text-white font-medium">{key.stock_number}</p>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              key.category === 'NEW' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                            }`}>
                              {key.category}
                            </span>
                          </div>
                          <p className="text-white/60 text-sm mb-3">
                            {key.year} {key.make} {key.model}
                          </p>
                          
                          {/* PROMINENT USER INFO BOX */}
                          <div className={`p-4 rounded-lg border-2 ${
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
                                <p className="text-white font-bold text-lg">{userName}</p>
                              </div>
                            </div>
                            
                            {/* Duration and Reason */}
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
                                  {formatElapsed(elapsedMinutes)}
                                </span>
                              </div>
                            </div>

                            {/* Current Location for Service checkouts */}
                            {key.checkout_session?.checkout_reason === 'SERVICE' && key.checkout_session?.current_location && (
                              <div className="mt-3 flex items-center gap-2 bg-amber-500/20 px-3 py-2 rounded-lg">
                                <MapPinIcon size={16} className="text-amber-400" />
                                <span className="text-amber-400 font-medium">
                                  Location: {getLocationLabel(key.checkout_session.current_location)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        

                        
                        {/* Status Badge */}
                        <div className="text-right">
                          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                            alertState === 'RED' ? 'bg-red-500/20 text-red-400' :
                            alertState === 'YELLOW' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-green-500/20 text-green-400'
                          }`}>
                            {alertState || 'OUT'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="p-8 text-center text-white/60">
              <KeyIcon className="mx-auto mb-2 opacity-50" size={32} />
              <p>No keys currently checked out</p>
            </div>
          )}
        </div>

        {/* View All Button */}
        <button
          onClick={() => onNavigate('keys-management')}
          className="w-full mt-4 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors"
        >
          View All Keys
        </button>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black/40 backdrop-blur-lg border-t border-white/10 safe-area-pb">
        <div className="max-w-6xl mx-auto flex">
          <button
            onClick={() => onNavigate('admin-dashboard')}
            className="flex-1 py-3 flex flex-col items-center text-white"
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
            className="flex-1 py-3 flex flex-col items-center text-white/60 hover:text-white"
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
