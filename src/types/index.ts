// KeyFlow Type Definitions

export type DealerType = 'AUTO' | 'RV';
export type UserRole = 'ADMIN' | 'USER';
export type KeyCategory = 'NEW' | 'USED';
export type AlertState = 'GREEN' | 'YELLOW' | 'RED';

// AUTO statuses include all options
export type AutoKeyStatus = 'ACTIVE' | 'SOLD' | 'EXTENDED_TEST_DRIVE' | 'SERVICE_LOANER' | 'DELETED';
// RV statuses are simplified
export type RVKeyStatus = 'ACTIVE' | 'SOLD' | 'DELETED';
export type KeyStatus = AutoKeyStatus | RVKeyStatus;

// Checkout reasons by dealership type - SERVICE added to both
export type AutoCheckoutReason = 'TEST_DRIVE' | 'SHOWING' | 'OVERNIGHT_TEST_DRIVE' | 'SERVICE_LOANER' | 'SERVICE' | 'MOVE' | 'MISCELLANEOUS';
export type RVCheckoutReason = 'SHOWING' | 'TEST_DRIVE' | 'SERVICE' | 'MOVE' | 'MISCELLANEOUS';
export type CheckoutReason = AutoCheckoutReason | RVCheckoutReason;

// Checkout reason labels
export const AUTO_CHECKOUT_REASONS: { value: AutoCheckoutReason; label: string }[] = [
  { value: 'TEST_DRIVE', label: 'Test Drive' },
  { value: 'SHOWING', label: 'Showing' },
  { value: 'OVERNIGHT_TEST_DRIVE', label: 'Overnight Test Drive' },
  { value: 'SERVICE_LOANER', label: 'Service Loaner' },
  { value: 'SERVICE', label: 'Service' },
  { value: 'MOVE', label: 'Move' },
  { value: 'MISCELLANEOUS', label: 'Miscellaneous' }
];

export const RV_CHECKOUT_REASONS: { value: RVCheckoutReason; label: string }[] = [
  { value: 'SHOWING', label: 'Showing' },
  { value: 'TEST_DRIVE', label: 'Test Drive' },
  { value: 'SERVICE', label: 'Service' },
  { value: 'MOVE', label: 'Move' },
  { value: 'MISCELLANEOUS', label: 'Miscellaneous' }
];

export const getCheckoutReasonLabel = (reason: CheckoutReason | null | undefined): string => {
  if (!reason) return 'Unknown';
  const labels: Record<CheckoutReason, string> = {
    'TEST_DRIVE': 'Test Drive',
    'SHOWING': 'Showing',
    'OVERNIGHT_TEST_DRIVE': 'Overnight Test Drive',
    'SERVICE_LOANER': 'Service Loaner',
    'SERVICE': 'Service',
    'MOVE': 'Move',
    'MISCELLANEOUS': 'Miscellaneous'
  };
  return labels[reason] || reason;
};

export const getCheckoutReasonColor = (reason: CheckoutReason | null | undefined): string => {
  if (!reason) return 'bg-gray-500/20 text-gray-400';
  const colors: Record<CheckoutReason, string> = {
    'TEST_DRIVE': 'bg-blue-500/20 text-blue-400',
    'SHOWING': 'bg-purple-500/20 text-purple-400',
    'OVERNIGHT_TEST_DRIVE': 'bg-orange-500/20 text-orange-400',
    'SERVICE_LOANER': 'bg-cyan-500/20 text-cyan-400',
    'SERVICE': 'bg-amber-500/20 text-amber-400',
    'MOVE': 'bg-teal-500/20 text-teal-400',
    'MISCELLANEOUS': 'bg-slate-500/20 text-slate-400'
  };
  return colors[reason] || 'bg-gray-500/20 text-gray-400';
};


// Location options - KEY_BOX is a special value for returning keys
export const KEY_BOX_VALUE = 'KEY_BOX';

export const getLocationLabel = (location: string | null | undefined): string => {
  if (!location) return 'Unknown';
  if (location === KEY_BOX_VALUE) return 'Key Box';
  // For custom bay numbers, just return the value as-is
  return location;
};


export type ActionType = 
  | 'CHECKOUT' 
  | 'RETURN' 
  | 'STATUS_CHANGE' 
  | 'CREATE_KEY' 
  | 'UPDATE_KEY' 
  | 'DELETE_KEY' 
  | 'USER_CREATED' 
  | 'USER_DISABLED'
  | 'USER_ENABLED'
  | 'USER_DELETED'
  | 'SETTINGS_CHANGED'
  | 'LOCATION_UPDATE';


export interface Dealership {
  id: string;
  name: string;
  code: string;
  dealer_type: DealerType;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  admin_pin_hash: string;
  is_suspended: boolean;
  alert_yellow_minutes: number;
  alert_red_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  dealership_id: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  username: string;
  pin_hash: string;
  is_active: boolean;
  created_at: string;
}

export interface KeyUnit {
  id: string;
  dealership_id: string;
  stock_number: string;
  category: KeyCategory;
  year: number | null;
  make: string | null;
  model: string | null;
  color: string | null;
  status: KeyStatus;
  created_at: string;
  updated_at: string;
}

export interface CheckoutSession {
  id: string;
  dealership_id: string;
  key_unit_id: string;
  checked_out_by_user_id: string;
  checkout_reason: CheckoutReason | null;
  checked_out_at: string;
  returned_at: string | null;
  is_open: boolean;
  bay_number: string | null;
  current_location: string | null;
  created_at: string;
  // Computed fields
  elapsed_minutes?: number;
  alert_state?: AlertState;
  user?: User;
}

export interface KeyEventLog {
  id: string;
  dealership_id: string;
  key_unit_id: string | null;
  action_type: ActionType;
  performed_by_user_id: string | null;
  timestamp: string;
  details_json: Record<string, any>;
  user?: User;
  key_unit?: KeyUnit;
}

export interface KeyWithCheckout extends KeyUnit {
  checkout_session?: CheckoutSession | null;
  checked_out_by?: User | null;
}

// App State
export interface AppState {
  currentScreen: Screen;
  isOwnerMode: boolean;
  currentDealership: Dealership | null;
  currentUser: User | null;
  logoTapCount: number;
}

export type Screen = 
  | 'login'
  | 'owner-login'
  | 'owner-dashboard'
  | 'admin-dashboard'
  | 'user-home'
  | 'key-detail'
  | 'keys-management'
  | 'user-management'
  | 'logs-reports'
  | 'settings'
  | 'help'
  | 'share';


// Status options by dealer type
export const AUTO_STATUSES: AutoKeyStatus[] = ['ACTIVE', 'SOLD', 'EXTENDED_TEST_DRIVE', 'SERVICE_LOANER', 'DELETED'];
export const RV_STATUSES: RVKeyStatus[] = ['ACTIVE', 'SOLD', 'DELETED'];

export const getStatusLabel = (status: KeyStatus): string => {
  const labels: Record<KeyStatus, string> = {
    'ACTIVE': 'Active',
    'SOLD': 'Sold',
    'EXTENDED_TEST_DRIVE': 'Extended Test Drive',
    'SERVICE_LOANER': 'Service Loaner',
    'DELETED': 'Deleted'
  };
  return labels[status] || status;
};

export const getStatusColor = (status: KeyStatus): string => {
  const colors: Record<KeyStatus, string> = {
    'ACTIVE': 'bg-green-100 text-green-800',
    'SOLD': 'bg-purple-100 text-purple-800',
    'EXTENDED_TEST_DRIVE': 'bg-blue-100 text-blue-800',
    'SERVICE_LOANER': 'bg-orange-100 text-orange-800',
    'DELETED': 'bg-gray-100 text-gray-500'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};
