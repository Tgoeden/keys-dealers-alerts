import React, { useState, useMemo } from 'react';
import { 
  ClipboardIcon, 
  ChevronLeftIcon,
  FilterIcon,
  DownloadIcon,
  SearchIcon,
  ClockIcon,
  KeyIcon,
  UserIcon
} from '../ui/Icons';
import type { Dealership, KeyEventLog, User, KeyUnit, ActionType, KeyCategory } from '@/types';
import { getCheckoutReasonLabel, getCheckoutReasonColor } from '@/types';
interface LogsReportsProps {
  dealership: Dealership;
  logs: KeyEventLog[];
  users: User[];
  keys: KeyUnit[];
  onBack: () => void;
  logoUrl: string;
}


const ACTION_LABELS: Record<ActionType, string> = {
  'CHECKOUT': 'Key Checked Out',
  'RETURN': 'Key Returned',
  'STATUS_CHANGE': 'Status Changed',
  'CREATE_KEY': 'Key Created',
  'UPDATE_KEY': 'Key Updated',
  'DELETE_KEY': 'Key Deleted',
  'USER_CREATED': 'User Created',
  'USER_DISABLED': 'User Status Changed',
  'SETTINGS_CHANGED': 'Settings Updated'
};

const ACTION_COLORS: Record<ActionType, string> = {
  'CHECKOUT': 'bg-orange-500/20 text-orange-400',
  'RETURN': 'bg-green-500/20 text-green-400',
  'STATUS_CHANGE': 'bg-purple-500/20 text-purple-400',
  'CREATE_KEY': 'bg-blue-500/20 text-blue-400',
  'UPDATE_KEY': 'bg-yellow-500/20 text-yellow-400',
  'DELETE_KEY': 'bg-red-500/20 text-red-400',
  'USER_CREATED': 'bg-cyan-500/20 text-cyan-400',
  'USER_DISABLED': 'bg-gray-500/20 text-gray-400',
  'SETTINGS_CHANGED': 'bg-pink-500/20 text-pink-400'
};

type CategoryFilter = 'all' | 'NEW' | 'USED';

export const LogsReports: React.FC<LogsReportsProps> = ({
  dealership,
  logs,
  users,
  keys,
  onBack,
  logoUrl
}) => {

  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<ActionType | 'all'>('all');
  const [filterUser, setFilterUser] = useState<string>('all');
  const [filterKey, setFilterKey] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<CategoryFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const filteredLogs = useMemo(() => {
    let result = logs;

    // Filter by action type
    if (filterAction !== 'all') {
      result = result.filter(l => l.action_type === filterAction);
    }

    // Filter by user
    if (filterUser !== 'all') {
      result = result.filter(l => l.performed_by_user_id === filterUser);
    }

    // Filter by key
    if (filterKey !== 'all') {
      result = result.filter(l => l.key_unit_id === filterKey);
    }

    // Filter by category (New/Used)
    if (filterCategory !== 'all') {
      result = result.filter(l => l.key_unit?.category === filterCategory);
    }

    // Filter by date range
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      result = result.filter(l => new Date(l.timestamp) >= fromDate);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59);
      result = result.filter(l => new Date(l.timestamp) <= toDate);
    }

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(l => 
        l.key_unit?.stock_number?.toLowerCase().includes(query) ||
        l.user?.first_name?.toLowerCase().includes(query) ||
        l.user?.last_name?.toLowerCase().includes(query) ||
        ACTION_LABELS[l.action_type as ActionType]?.toLowerCase().includes(query) ||
        l.details_json?.reason?.toLowerCase().includes(query) ||
        l.details_json?.user?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [logs, filterAction, filterUser, filterKey, filterCategory, dateFrom, dateTo, searchQuery]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportCSV = () => {
    const headers = ['Timestamp', 'Action', 'User', 'Key', 'Category', 'Reason', 'Details'];
    const rows = filteredLogs.map(log => [
      new Date(log.timestamp).toISOString(),
      ACTION_LABELS[log.action_type as ActionType] || log.action_type,
      log.user ? `${log.user.first_name} ${log.user.last_name}` : 'System',
      log.key_unit?.stock_number || '-',
      log.key_unit?.category || '-',
      log.details_json?.reason ? getCheckoutReasonLabel(log.details_json.reason) : '-',
      JSON.stringify(log.details_json)
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `keyflow-logs-${dealership.code}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const actionTypes: ActionType[] = [
    'CHECKOUT', 'RETURN', 'STATUS_CHANGE', 'CREATE_KEY', 
    'UPDATE_KEY', 'DELETE_KEY', 'USER_CREATED', 'USER_DISABLED', 'SETTINGS_CHANGED'
  ];

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: dealership.secondary_color }}>
      {/* Header with Dealership Branding */}
      <header 
        className="sticky top-0 z-40 shadow-lg"
        style={{ backgroundColor: dealership.primary_color }}
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-2 text-white/80 hover:text-white">
            <ChevronLeftIcon size={24} />
          </button>
          <img 
            src={dealership.logo_url || logoUrl} 
            alt={dealership.name} 
            className="w-10 h-10 rounded-xl bg-white/20 object-contain"
          />
          <div className="flex-1">
            <h1 className="text-white font-bold">{dealership.name}</h1>
            <p className="text-white/70 text-xs">Logs & Reports • {filteredLogs.length} events</p>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg text-white ${showFilters ? 'bg-white/30' : 'bg-white/20 hover:bg-white/30'}`}
          >
            <FilterIcon size={20} />
          </button>
          <button
            onClick={exportCSV}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg text-white"
          >
            <DownloadIcon size={20} />
          </button>
        </div>
      </header>


      {/* Search & Filters */}
      <div className="max-w-6xl mx-auto px-4 py-4 space-y-3">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search logs by key, user, action..."
            className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
          />
        </div>

        {/* Category Filter (New/Used) */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filterCategory === 'all'
                ? 'bg-white text-gray-900'
                : 'bg-white/10 text-white/80 hover:bg-white/20'
            }`}
          >
            All Types
          </button>
          <button
            onClick={() => setFilterCategory('NEW')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filterCategory === 'NEW'
                ? 'bg-green-500 text-white'
                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
            }`}
          >
            New
          </button>
          <button
            onClick={() => setFilterCategory('USED')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filterCategory === 'USED'
                ? 'bg-blue-500 text-white'
                : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
            }`}
          >
            Used
          </button>
        </div>

        {showFilters && (
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-white/60 text-xs mb-1">Action Type</label>
                <select
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value as ActionType | 'all')}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                >
                  <option value="all">All Actions</option>
                  {actionTypes.map(action => (
                    <option key={action} value={action}>{ACTION_LABELS[action]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-white/60 text-xs mb-1">User</label>
                <select
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                >
                  <option value="all">All Users</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.first_name} {user.last_name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-white/60 text-xs mb-1">Key</label>
                <select
                  value={filterKey}
                  onChange={(e) => setFilterKey(e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                >
                  <option value="all">All Keys</option>
                  {keys.map(key => (
                    <option key={key.id} value={key.id}>{key.stock_number} ({key.category})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-white/60 text-xs mb-1">Date From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-white/60 text-xs mb-1">Date To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setFilterAction('all');
                    setFilterUser('all');
                    setFilterKey('all');
                    setFilterCategory('all');
                    setDateFrom('');
                    setDateTo('');
                  }}
                  className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 text-white/80 text-sm rounded-lg"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Logs List */}
      <div className="max-w-6xl mx-auto px-4 space-y-2">
        {filteredLogs.map(log => (
          <div
            key={log.id}
            className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10"
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${ACTION_COLORS[log.action_type as ActionType] || 'bg-gray-500/20 text-gray-400'}`}>
                {log.action_type === 'CHECKOUT' || log.action_type === 'RETURN' ? (
                  <KeyIcon size={16} />
                ) : log.action_type.includes('USER') ? (
                  <UserIcon size={16} />
                ) : (
                  <ClipboardIcon size={16} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${ACTION_COLORS[log.action_type as ActionType]}`}>
                    {ACTION_LABELS[log.action_type as ActionType] || log.action_type}
                  </span>
                  {log.key_unit && (
                    <>
                      <span className="text-white/60 text-sm">
                        Key: <span className="text-white font-medium">{log.key_unit.stock_number}</span>
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        log.key_unit.category === 'NEW' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {log.key_unit.category}
                      </span>
                    </>
                  )}
                </div>
                
                {/* User Info */}
                <div className="flex items-center gap-2 mt-1">
                  <UserIcon size={12} className="text-white/40" />
                  <p className="text-white/70 text-sm">
                    {log.user ? `${log.user.first_name} ${log.user.last_name}` : 'System'}
                  </p>
                </div>

                {/* Checkout Reason */}
                {log.action_type === 'CHECKOUT' && log.details_json?.reason && (
                  <div className="mt-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getCheckoutReasonColor(log.details_json.reason)}`}>
                      Reason: {getCheckoutReasonLabel(log.details_json.reason)}
                    </span>
                  </div>
                )}

                {/* Other Details */}
                {log.details_json && Object.keys(log.details_json).filter(k => k !== 'reason' && k !== 'user').length > 0 && (
                  <p className="text-white/40 text-xs mt-1 font-mono">
                    {JSON.stringify(Object.fromEntries(
                      Object.entries(log.details_json).filter(([k]) => k !== 'reason' && k !== 'user')
                    ))}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-white/60 text-xs flex items-center gap-1">
                  <ClockIcon size={12} />
                  {formatDate(log.timestamp)}
                </p>
              </div>
            </div>
          </div>
        ))}

        {filteredLogs.length === 0 && (
          <div className="text-center py-12 text-white/60">
            <ClipboardIcon className="mx-auto mb-4 opacity-50" size={48} />
            <p>No logs found</p>
          </div>
        )}
      </div>
    </div>
  );
};
