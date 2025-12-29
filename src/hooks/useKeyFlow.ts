import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  getPersistentSession, 
  savePersistentSession, 
  clearPersistentSession,
  updateSessionActivity 
} from '@/components/screens/LoginScreen';
import type { 
  Dealership, 
  User, 
  KeyUnit, 
  KeyEventLog, 
  KeyWithCheckout,
  Screen,
  AlertState,
  KeyStatus,
  ActionType,
  CheckoutReason
} from '@/types';

const LOGO_URL = 'https://d64gsuwffb70l.cloudfront.net/6946be8d5bb0c0f7d6d581c6_1766244086758_6c902572.png';

// Demo mode limits
const DEMO_MAX_USERS = 2;
const DEMO_MAX_KEYS = 4;

// Type for persistent session
interface PersistentSession {
  dealershipCode: string;
  username: string;
  isAdminLogin: boolean;
  requirePinOnReturn: boolean;
  createdAt: number;
  lastActiveAt: number;
}

// Demo data generators
const createDemoDealership = (): Dealership => ({
  id: 'demo-dealership-001',
  name: 'Demo Dealership',
  code: 'DEMO',
  dealer_type: 'AUTO',
  admin_pin_hash: '1234',
  primary_color: '#3B82F6',
  secondary_color: '#1E40AF',
  alert_yellow_minutes: 30,
  alert_red_minutes: 60,
  is_suspended: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
});

const createDemoAdmin = (dealershipId: string): User => ({
  id: 'demo-admin-001',
  dealership_id: dealershipId,
  role: 'ADMIN',
  first_name: 'Demo',
  last_name: 'Admin',
  username: 'admin',
  pin_hash: '1234',
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
});

const createDemoKeys = (dealershipId: string): KeyWithCheckout[] => [
  {
    id: 'demo-key-001',
    dealership_id: dealershipId,
    stock_number: 'STK001',
    category: 'NEW',
    year: 2024,
    make: 'Toyota',
    model: 'Camry',
    color: 'Silver',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    checkout_session: null,
    checked_out_by: null
  },
  {
    id: 'demo-key-002',
    dealership_id: dealershipId,
    stock_number: 'STK002',
    category: 'NEW',
    year: 2024,
    make: 'Honda',
    model: 'Accord',
    color: 'Blue',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    checkout_session: null,
    checked_out_by: null
  }
];

export function useKeyFlow() {
  // Core state - initialized synchronously
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [isOwnerMode, setIsOwnerMode] = useState(false);
  const [currentDealership, setCurrentDealership] = useState<Dealership | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [logoTapCount, setLogoTapCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Demo mode state
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoKeys, setDemoKeys] = useState<KeyWithCheckout[]>([]);
  const [demoUsers, setDemoUsers] = useState<User[]>([]);
  const [demoLogs, setDemoLogs] = useState<KeyEventLog[]>([]);

  // Data state
  const [dealerships, setDealerships] = useState<Dealership[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [keys, setKeys] = useState<KeyWithCheckout[]>([]);
  const [logs, setLogs] = useState<KeyEventLog[]>([]);
  const [selectedKey, setSelectedKey] = useState<KeyWithCheckout | null>(null);

  // Persistent session state
  const [persistentSession, setPersistentSession] = useState<PersistentSession | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  // Refs
  const mountedRef = useRef(true);
  const logoTapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (logoTapTimeoutRef.current) {
        clearTimeout(logoTapTimeoutRef.current);
      }
    };
  }, []);

  // Check for persistent session on mount
  useEffect(() => {
    const session = getPersistentSession();
    if (session) {
      // Check if session is still valid (e.g., not older than 30 days)
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      const sessionAge = Date.now() - session.createdAt;
      
      if (sessionAge < thirtyDaysMs) {
        setPersistentSession(session);
      } else {
        // Session expired, clear it
        clearPersistentSession();
      }
    }
    setSessionChecked(true);
  }, []);

  // Calculate alert state
  const calculateAlertState = useCallback((elapsedMinutes: number, yellowThreshold: number, redThreshold: number): AlertState => {
    if (elapsedMinutes >= redThreshold) return 'RED';
    if (elapsedMinutes >= yellowThreshold) return 'YELLOW';
    return 'GREEN';
  }, []);

  // Enter demo mode
  const enterDemoMode = useCallback(() => {
    const demoDealership = createDemoDealership();
    const demoAdmin = createDemoAdmin(demoDealership.id);
    const initialDemoKeys = createDemoKeys(demoDealership.id);
    
    setIsDemoMode(true);
    setCurrentDealership(demoDealership);
    setCurrentUser(demoAdmin);
    setDemoKeys(initialDemoKeys);
    setDemoUsers([demoAdmin]);
    setDemoLogs([]);
    setKeys(initialDemoKeys);
    setUsers([demoAdmin]);
    setLogs([]);
    setCurrentScreen('admin-dashboard');
  }, []);

  // Exit demo mode
  const exitDemoMode = useCallback(() => {
    setIsDemoMode(false);
    setCurrentDealership(null);
    setCurrentUser(null);
    setDemoKeys([]);
    setDemoUsers([]);
    setDemoLogs([]);
    setKeys([]);
    setUsers([]);
    setLogs([]);
    setSelectedKey(null);
    setCurrentScreen('login');
  }, []);

  // Fetch dealerships
  const fetchDealerships = useCallback(async () => {
    if (isDemoMode) return;
    try {
      const { data } = await supabase
        .from('dealerships')
        .select('*')
        .order('name');
      if (mountedRef.current && data) setDealerships(data);
    } catch (e) {
      console.error('Error fetching dealerships:', e);
    }
  }, [isDemoMode]);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    if (isDemoMode) {
      setUsers(demoUsers);
      return;
    }
    if (!currentDealership) return;
    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('dealership_id', currentDealership.id)
        .order('first_name');
      if (mountedRef.current && data) setUsers(data);
    } catch (e) {
      console.error('Error fetching users:', e);
    }
  }, [currentDealership, isDemoMode, demoUsers]);

  // Fetch keys
  const fetchKeys = useCallback(async () => {
    if (isDemoMode) {
      setKeys(demoKeys);
      return;
    }
    if (!currentDealership) return;
    
    try {
      const { data: keysData, error: keysError } = await supabase
        .from('key_units')
        .select('*')
        .eq('dealership_id', currentDealership.id)
        .order('stock_number');
      
      if (keysError) return;

      const { data: sessionsData } = await supabase
        .from('checkout_sessions')
        .select('*, user:users(*)')
        .eq('dealership_id', currentDealership.id)
        .eq('is_open', true);

      const keysWithCheckout: KeyWithCheckout[] = (keysData || []).map(key => {
        const session = sessionsData?.find(s => s.key_unit_id === key.id);
        if (session) {
          const checkedOutAt = new Date(session.checked_out_at);
          const now = new Date();
          const elapsedMinutes = Math.floor((now.getTime() - checkedOutAt.getTime()) / 60000);
          const alertState = calculateAlertState(
            elapsedMinutes,
            currentDealership.alert_yellow_minutes,
            currentDealership.alert_red_minutes
          );
          return {
            ...key,
            checkout_session: {
              ...session,
              elapsed_minutes: elapsedMinutes,
              alert_state: alertState
            },
            checked_out_by: session.user
          };
        }
        return { ...key, checkout_session: null, checked_out_by: null };
      });

      if (mountedRef.current) {
        setKeys(keysWithCheckout);
      }
    } catch (e) {
      console.error('Error fetching keys:', e);
    }
  }, [currentDealership, calculateAlertState, isDemoMode, demoKeys]);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    if (isDemoMode) {
      setLogs(demoLogs);
      return;
    }
    if (!currentDealership) return;
    try {
      const { data } = await supabase
        .from('key_event_logs')
        .select('*, user:users(*), key_unit:key_units(*)')
        .eq('dealership_id', currentDealership.id)
        .order('timestamp', { ascending: false })
        .limit(100);
      if (mountedRef.current && data) setLogs(data);
    } catch (e) {
      console.error('Error fetching logs:', e);
    }
  }, [currentDealership, isDemoMode, demoLogs]);

  // Logo tap handler
  const handleLogoTap = useCallback(() => {
    setLogoTapCount(prev => {
      const newCount = prev + 1;
      if (newCount >= 5) {
        setCurrentScreen('owner-login');
        return 0;
      }
      return newCount;
    });
    
    if (logoTapTimeoutRef.current) {
      clearTimeout(logoTapTimeoutRef.current);
    }
    logoTapTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) setLogoTapCount(0);
    }, 2000);
  }, []);

  // Owner login
  const ownerLogin = useCallback(async (username: string, password: string): Promise<boolean> => {
    if (!mountedRef.current) return false;
    setLoading(true);
    setError(null);
    try {
      const { data } = await supabase
        .from('owner_credentials')
        .select('*')
        .eq('username', username)
        .eq('password_hash', password)
        .single();
      
      if (data && mountedRef.current) {
        setIsOwnerMode(true);
        setCurrentScreen('owner-dashboard');
        await fetchDealerships();
        return true;
      }
      if (mountedRef.current) setError('Invalid owner credentials');
      return false;
    } catch (e) {
      if (mountedRef.current) setError('Login failed');
      return false;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [fetchDealerships]);

  // Dealership login
  const dealershipLogin = useCallback(async (
    dealershipCode: string, 
    username: string, 
    pin: string, 
    isAdminLogin: boolean
  ): Promise<boolean> => {
    if (!mountedRef.current) return false;
    setLoading(true);
    setError(null);
    try {
      const { data: dealership } = await supabase
        .from('dealerships')
        .select('*')
        .eq('code', dealershipCode.toUpperCase())
        .single();

      if (!dealership) {
        if (mountedRef.current) setError('Dealership not found');
        return false;
      }

      if (dealership.is_suspended) {
        if (mountedRef.current) setError('This dealership is currently suspended');
        return false;
      }

      if (isAdminLogin) {
        if (dealership.admin_pin_hash === pin) {
          if (mountedRef.current) {
            setCurrentDealership(dealership);
          }
          
          let { data: adminUser } = await supabase
            .from('users')
            .select('*')
            .eq('dealership_id', dealership.id)
            .eq('role', 'ADMIN')
            .limit(1)
            .maybeSingle();
          
          if (!adminUser) {
            const adminUsername = `admin_${dealership.code.toLowerCase()}`;
            
            const { data: newAdmin, error: createError } = await supabase
              .from('users')
              .insert({
                dealership_id: dealership.id,
                role: 'ADMIN',
                first_name: 'Admin',
                last_name: dealership.name,
                username: adminUsername,
                pin_hash: pin,
                is_active: true
              })
              .select()
              .single();
            
            if (createError) {
              const { data: existingAdmin } = await supabase
                .from('users')
                .select('*')
                .eq('dealership_id', dealership.id)
                .eq('role', 'ADMIN')
                .limit(1)
                .maybeSingle();
              
              if (existingAdmin) {
                adminUser = existingAdmin;
              } else {
                const fallbackUsername = `admin_${Date.now()}`;
                const { data: fallbackAdmin, error: fallbackError } = await supabase
                  .from('users')
                  .insert({
                    dealership_id: dealership.id,
                    role: 'ADMIN',
                    first_name: 'Admin',
                    last_name: dealership.name,
                    username: fallbackUsername,
                    pin_hash: pin,
                    is_active: true
                  })
                  .select()
                  .single();
                
                if (fallbackError) {
                  if (mountedRef.current) setError('Failed to create admin user');
                  return false;
                }
                adminUser = fallbackAdmin;
              }
            } else {
              adminUser = newAdmin;
            }
          }
          
          if (!adminUser?.id) {
            if (mountedRef.current) setError('Failed to authenticate admin');
            return false;
          }
          
          if (mountedRef.current) {
            setCurrentUser(adminUser);
            setCurrentScreen('admin-dashboard');
            // Update session activity if there's a persistent session
            updateSessionActivity();
          }
          return true;
        }
        if (mountedRef.current) setError('Invalid admin PIN');
        return false;
      } else {
        const { data: user } = await supabase
          .from('users')
          .select('*')
          .eq('dealership_id', dealership.id)
          .eq('username', username)
          .eq('pin_hash', pin)
          .eq('is_active', true)
          .single();

        if (user && mountedRef.current) {
          setCurrentDealership(dealership);
          setCurrentUser(user);
          setCurrentScreen(user.role === 'ADMIN' ? 'admin-dashboard' : 'user-home');
          // Update session activity if there's a persistent session
          updateSessionActivity();
          return true;
        }
        if (mountedRef.current) setError('Invalid username or PIN');
        return false;
      }
    } catch (e) {
      console.error('Login error:', e);
      if (mountedRef.current) setError('Login failed');
      return false;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  // Auto-login handler for persistent sessions without PIN requirement
  const handleAutoLogin = useCallback(async (session: PersistentSession) => {
    if (!mountedRef.current) return;
    
    // For sessions that don't require PIN, we need to verify the dealership exists
    // and the user account is still valid, but we can't actually log them in without PIN
    // So this is only called when requirePinOnReturn is false
    // In that case, we'd need to store the PIN securely (which we don't for security)
    // So we'll just show the PIN re-entry screen
    
    // Actually, for auto-login without PIN, we'd need to use a secure token
    // For now, we'll require PIN re-entry for security
    setPersistentSession(session);
  }, []);

  // Clear persistent session
  const handleClearSession = useCallback(() => {
    setPersistentSession(null);
    clearPersistentSession();
  }, []);

  // Logout
  const logout = useCallback(() => {
    if (isDemoMode) {
      exitDemoMode();
      return;
    }
    if (mountedRef.current) {
      setCurrentUser(null);
      setCurrentDealership(null);
      setIsOwnerMode(false);
      setKeys([]);
      setUsers([]);
      setLogs([]);
      setSelectedKey(null);
      setCurrentScreen('login');
      // Clear persistent session on logout
      setPersistentSession(null);
      clearPersistentSession();
    }
  }, [isDemoMode, exitDemoMode]);

  // Log event (demo-aware)
  const logEvent = useCallback(async (keyId: string | null, actionType: ActionType, details: Record<string, any>) => {
    if (!currentDealership || !currentUser) return;
    
    if (isDemoMode) {
      const newLog: KeyEventLog = {
        id: `demo-log-${Date.now()}`,
        dealership_id: currentDealership.id,
        key_unit_id: keyId,
        action_type: actionType,
        performed_by_user_id: currentUser.id,
        details_json: details,
        timestamp: new Date().toISOString()
      };
      setDemoLogs(prev => [newLog, ...prev]);
      setLogs(prev => [newLog, ...prev]);
      return;
    }
    
    try {
      await supabase
        .from('key_event_logs')
        .insert({
          dealership_id: currentDealership.id,
          key_unit_id: keyId,
          action_type: actionType,
          performed_by_user_id: currentUser.id,
          details_json: details
        });
    } catch (e) {
      console.error('Error logging event:', e);
    }
  }, [currentDealership, currentUser, isDemoMode]);

  // Checkout key (demo-aware)
  const checkoutKey = useCallback(async (
    keyId: string, 
    reason: CheckoutReason, 
    bayNumber?: string
  ): Promise<boolean> => {
    if (!currentDealership || !currentUser || !mountedRef.current) return false;
    setLoading(true);
    setError(null);
    
    if (isDemoMode) {
      const keyIndex = demoKeys.findIndex(k => k.id === keyId);
      if (keyIndex === -1) {
        setError('Key not found');
        setLoading(false);
        return false;
      }
      
      const key = demoKeys[keyIndex];
      if (key.checkout_session) {
        setError('Key is already checked out');
        setLoading(false);
        return false;
      }
      
      const updatedKey: KeyWithCheckout = {
        ...key,
        checkout_session: {
          id: `demo-session-${Date.now()}`,
          dealership_id: currentDealership.id,
          key_unit_id: keyId,
          checked_out_by_user_id: currentUser.id,
          checkout_reason: reason,
          bay_number: bayNumber || null,
          current_location: bayNumber || null,
          checked_out_at: new Date().toISOString(),
          returned_at: null,
          is_open: true,
          elapsed_minutes: 0,
          alert_state: 'GREEN' as AlertState
        },
        checked_out_by: currentUser
      };
      
      const newDemoKeys = [...demoKeys];
      newDemoKeys[keyIndex] = updatedKey;
      setDemoKeys(newDemoKeys);
      setKeys(newDemoKeys);
      
      await logEvent(keyId, 'CHECKOUT', { 
        reason, 
        bay_number: bayNumber,
        user: `${currentUser.first_name} ${currentUser.last_name}` 
      });
      
      setLoading(false);
      return true;
    }
    
    try {
      const { data: existing } = await supabase
        .from('checkout_sessions')
        .select('*')
        .eq('key_unit_id', keyId)
        .eq('is_open', true)
        .maybeSingle();

      if (existing) {
        if (mountedRef.current) setError('Key is already checked out');
        return false;
      }

      const sessionData: any = {
        dealership_id: currentDealership.id,
        key_unit_id: keyId,
        checked_out_by_user_id: currentUser.id,
        checkout_reason: reason,
        is_open: true
      };

      if (reason === 'SERVICE' && bayNumber) {
        sessionData.bay_number = bayNumber;
        sessionData.current_location = bayNumber;
      }

      const { error: sessionError } = await supabase
        .from('checkout_sessions')
        .insert(sessionData);

      if (sessionError) throw sessionError;

      await logEvent(keyId, 'CHECKOUT', { 
        reason, 
        bay_number: bayNumber,
        user: `${currentUser.first_name} ${currentUser.last_name}` 
      });
      await fetchKeys();
      return true;
    } catch (e: any) {
      if (mountedRef.current) setError(e.message || 'Checkout failed');
      return false;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [currentDealership, currentUser, fetchKeys, logEvent, isDemoMode, demoKeys]);

  // Return key (demo-aware)
  const returnKey = useCallback(async (keyId: string): Promise<boolean> => {
    if (!currentDealership || !currentUser || !mountedRef.current) return false;
    setLoading(true);
    setError(null);
    
    if (isDemoMode) {
      const keyIndex = demoKeys.findIndex(k => k.id === keyId);
      if (keyIndex === -1) {
        setError('Key not found');
        setLoading(false);
        return false;
      }
      
      const key = demoKeys[keyIndex];
      if (!key.checkout_session) {
        setError('No active checkout found');
        setLoading(false);
        return false;
      }
      
      const updatedKey: KeyWithCheckout = {
        ...key,
        checkout_session: null,
        checked_out_by: null
      };
      
      const newDemoKeys = [...demoKeys];
      newDemoKeys[keyIndex] = updatedKey;
      setDemoKeys(newDemoKeys);
      setKeys(newDemoKeys);
      
      await logEvent(keyId, 'RETURN', { 
        returned_by: `${currentUser.first_name} ${currentUser.last_name}`
      });
      
      setLoading(false);
      return true;
    }
    
    try {
      const { data: session } = await supabase
        .from('checkout_sessions')
        .select('*')
        .eq('key_unit_id', keyId)
        .eq('is_open', true)
        .maybeSingle();

      if (!session) {
        if (mountedRef.current) setError('No active checkout found');
        return false;
      }

      const { error: updateError } = await supabase
        .from('checkout_sessions')
        .update({ 
          is_open: false, 
          returned_at: new Date().toISOString(),
          current_location: 'KEY_BOX'
        })
        .eq('id', session.id);

      if (updateError) throw updateError;

      await logEvent(keyId, 'RETURN', { 
        returned_by: `${currentUser.first_name} ${currentUser.last_name}`,
        original_checkout_by: session.checked_out_by_user_id
      });
      await fetchKeys();
      return true;
    } catch (e: any) {
      if (mountedRef.current) setError(e.message || 'Return failed');
      return false;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [currentDealership, currentUser, fetchKeys, logEvent, isDemoMode, demoKeys]);

  // Update key location (demo-aware)
  const updateKeyLocation = useCallback(async (keyId: string, newLocation: string): Promise<boolean> => {
    if (!currentDealership || !currentUser || !mountedRef.current) return false;
    setLoading(true);
    setError(null);
    
    if (isDemoMode) {
      const keyIndex = demoKeys.findIndex(k => k.id === keyId);
      if (keyIndex === -1) {
        setError('Key not found');
        setLoading(false);
        return false;
      }
      
      const key = demoKeys[keyIndex];
      if (!key.checkout_session) {
        setError('No active checkout found');
        setLoading(false);
        return false;
      }
      
      if (newLocation === 'KEY_BOX') {
        // Return the key
        return returnKey(keyId);
      }
      
      const updatedKey: KeyWithCheckout = {
        ...key,
        checkout_session: {
          ...key.checkout_session,
          current_location: newLocation,
          bay_number: newLocation
        }
      };
      
      const newDemoKeys = [...demoKeys];
      newDemoKeys[keyIndex] = updatedKey;
      setDemoKeys(newDemoKeys);
      setKeys(newDemoKeys);
      
      await logEvent(keyId, 'LOCATION_UPDATE', { 
        updated_by: `${currentUser.first_name} ${currentUser.last_name}`,
        new_location: newLocation
      });
      
      setLoading(false);
      return true;
    }
    
    try {
      const { data: session } = await supabase
        .from('checkout_sessions')
        .select('*')
        .eq('key_unit_id', keyId)
        .eq('is_open', true)
        .maybeSingle();

      if (!session) {
        if (mountedRef.current) setError('No active checkout found');
        return false;
      }

      if (newLocation === 'KEY_BOX') {
        const { error: updateError } = await supabase
          .from('checkout_sessions')
          .update({ 
            is_open: false, 
            returned_at: new Date().toISOString(),
            current_location: 'KEY_BOX'
          })
          .eq('id', session.id);

        if (updateError) throw updateError;

        await logEvent(keyId, 'RETURN', { 
          returned_by: `${currentUser.first_name} ${currentUser.last_name}`,
          location: 'KEY_BOX'
        });
      } else {
        const { error: updateError } = await supabase
          .from('checkout_sessions')
          .update({ 
            current_location: newLocation,
            bay_number: newLocation
          })
          .eq('id', session.id);

        if (updateError) throw updateError;

        await logEvent(keyId, 'LOCATION_UPDATE', { 
          updated_by: `${currentUser.first_name} ${currentUser.last_name}`,
          new_location: newLocation,
          previous_location: session.current_location
        });
      }

      await fetchKeys();
      return true;
    } catch (e: any) {
      if (mountedRef.current) setError(e.message || 'Failed to update location');
      return false;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [currentDealership, currentUser, fetchKeys, logEvent, isDemoMode, demoKeys, returnKey]);

  // Create key (demo-aware with limit)
  const createKey = useCallback(async (keyData: Partial<KeyUnit>): Promise<boolean> => {
    if (!currentDealership || !mountedRef.current) return false;
    setLoading(true);
    setError(null);
    
    if (isDemoMode) {
      // Check demo limit
      const activeKeys = demoKeys.filter(k => k.status !== 'DELETED');
      if (activeKeys.length >= DEMO_MAX_KEYS) {
        setError(`Demo limit: Maximum ${DEMO_MAX_KEYS} stock numbers allowed`);
        setLoading(false);
        return false;
      }
      
      // Check for duplicate stock number
      const existingKey = demoKeys.find(
        k => k.stock_number?.toUpperCase() === keyData.stock_number?.toUpperCase() && k.status !== 'DELETED'
      );
      if (existingKey) {
        setError(`Stock number "${keyData.stock_number}" already exists`);
        setLoading(false);
        return false;
      }
      
      const newKey: KeyWithCheckout = {
        id: `demo-key-${Date.now()}`,
        dealership_id: currentDealership.id,
        stock_number: keyData.stock_number?.toUpperCase() || '',
        category: keyData.category || 'NEW',
        year: keyData.year,
        make: keyData.make,
        model: keyData.model,
        color: keyData.color,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        checkout_session: null,
        checked_out_by: null
      };
      
      const newDemoKeys = [...demoKeys, newKey];
      setDemoKeys(newDemoKeys);
      setKeys(newDemoKeys);
      
      await logEvent(newKey.id, 'CREATE_KEY', { stockNumber: keyData.stock_number });
      
      setLoading(false);
      return true;
    }
    
    try {
      const { data: existingKey } = await supabase
        .from('key_units')
        .select('id, stock_number')
        .eq('dealership_id', currentDealership.id)
        .eq('stock_number', keyData.stock_number?.toUpperCase())
        .neq('status', 'DELETED')
        .maybeSingle();

      if (existingKey) {
        if (mountedRef.current) setError(`Stock number "${keyData.stock_number}" already exists`);
        return false;
      }

      const { data, error } = await supabase
        .from('key_units')
        .insert({
          dealership_id: currentDealership.id,
          stock_number: keyData.stock_number?.toUpperCase(),
          category: keyData.category || 'NEW',
          year: keyData.year,
          make: keyData.make,
          model: keyData.model,
          color: keyData.color,
          status: 'ACTIVE'
        })
        .select()
        .single();

      if (error) throw error;
      await logEvent(data.id, 'CREATE_KEY', { stockNumber: keyData.stock_number });
      await fetchKeys();
      return true;
    } catch (e: any) {
      if (mountedRef.current) setError(e.message || 'Failed to create key');
      return false;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [currentDealership, logEvent, fetchKeys, isDemoMode, demoKeys]);

  // Update key (demo-aware)
  const updateKey = useCallback(async (keyId: string, updates: Partial<KeyUnit>): Promise<boolean> => {
    if (!currentDealership || !mountedRef.current) return false;
    setLoading(true);
    
    if (isDemoMode) {
      const keyIndex = demoKeys.findIndex(k => k.id === keyId);
      if (keyIndex === -1) {
        setError('Key not found');
        setLoading(false);
        return false;
      }
      
      const updatedKey = {
        ...demoKeys[keyIndex],
        ...updates,
        updated_at: new Date().toISOString()
      };
      
      const newDemoKeys = [...demoKeys];
      newDemoKeys[keyIndex] = updatedKey;
      setDemoKeys(newDemoKeys);
      setKeys(newDemoKeys);
      
      await logEvent(keyId, 'UPDATE_KEY', updates);
      
      setLoading(false);
      return true;
    }
    
    try {
      const { error } = await supabase
        .from('key_units')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', keyId);

      if (error) throw error;
      await logEvent(keyId, 'UPDATE_KEY', updates);
      await fetchKeys();
      return true;
    } catch (e: any) {
      if (mountedRef.current) setError(e.message || 'Failed to update key');
      return false;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [currentDealership, logEvent, fetchKeys, isDemoMode, demoKeys]);

  // Update key status (demo-aware)
  const updateKeyStatus = useCallback(async (keyId: string, newStatus: KeyStatus): Promise<boolean> => {
    if (!currentDealership || !mountedRef.current) return false;
    
    if (isDemoMode) {
      const keyIndex = demoKeys.findIndex(k => k.id === keyId);
      if (keyIndex === -1) {
        setError('Key not found');
        return false;
      }
      
      const key = demoKeys[keyIndex];
      setLoading(true);
      
      const updatedKey = {
        ...key,
        status: newStatus,
        updated_at: new Date().toISOString()
      };
      
      const newDemoKeys = [...demoKeys];
      newDemoKeys[keyIndex] = updatedKey;
      setDemoKeys(newDemoKeys);
      setKeys(newDemoKeys);
      
      await logEvent(keyId, 'STATUS_CHANGE', { previousStatus: key.status, newStatus });
      
      setLoading(false);
      return true;
    }
    
    const key = keys.find(k => k.id === keyId);
    if (!key) return false;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('key_units')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', keyId);

      if (error) throw error;
      await logEvent(keyId, 'STATUS_CHANGE', { previousStatus: key.status, newStatus });
      await fetchKeys();
      return true;
    } catch (e: any) {
      if (mountedRef.current) setError(e.message || 'Failed to update status');
      return false;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [currentDealership, keys, logEvent, fetchKeys, isDemoMode, demoKeys]);

  // Delete key
  const deleteKey = useCallback(async (keyId: string): Promise<boolean> => {
    return updateKeyStatus(keyId, 'DELETED');
  }, [updateKeyStatus]);

  // Create user (demo-aware with limit)
  const createUser = useCallback(async (userData: Partial<User>): Promise<boolean> => {
    if (!currentDealership || !mountedRef.current) return false;
    setLoading(true);
    setError(null);
    
    if (isDemoMode) {
      // Check demo limit
      if (demoUsers.length >= DEMO_MAX_USERS) {
        setError(`Demo limit: Maximum ${DEMO_MAX_USERS} users allowed`);
        setLoading(false);
        return false;
      }
      
      const newUser: User = {
        id: `demo-user-${Date.now()}`,
        dealership_id: currentDealership.id,
        role: userData.role || 'USER',
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        username: userData.username || '',
        pin_hash: userData.pin_hash || '0000',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const newDemoUsers = [...demoUsers, newUser];
      setDemoUsers(newDemoUsers);
      setUsers(newDemoUsers);
      
      await logEvent(null, 'USER_CREATED', { username: userData.username });
      
      setLoading(false);
      return true;
    }
    
    try {
      const { data, error } = await supabase
        .from('users')
        .insert({
          dealership_id: currentDealership.id,
          role: userData.role || 'USER',
          first_name: userData.first_name,
          last_name: userData.last_name,
          username: userData.username,
          pin_hash: userData.pin_hash || '0000',
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;
      await logEvent(null, 'USER_CREATED', { username: userData.username });
      await fetchUsers();
      return true;
    } catch (e: any) {
      if (mountedRef.current) setError(e.message || 'Failed to create user');
      return false;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [currentDealership, logEvent, fetchUsers, isDemoMode, demoUsers]);

  // Toggle user active (demo-aware)
  const toggleUserActive = useCallback(async (userId: string, isActive: boolean): Promise<boolean> => {
    if (!mountedRef.current) return false;
    setLoading(true);
    
    if (isDemoMode) {
      const userIndex = demoUsers.findIndex(u => u.id === userId);
      if (userIndex === -1) {
        setError('User not found');
        setLoading(false);
        return false;
      }
      
      const updatedUser = {
        ...demoUsers[userIndex],
        is_active: isActive
      };
      
      const newDemoUsers = [...demoUsers];
      newDemoUsers[userIndex] = updatedUser;
      setDemoUsers(newDemoUsers);
      setUsers(newDemoUsers);
      
      await logEvent(null, isActive ? 'USER_ENABLED' : 'USER_DISABLED', { userId, isActive });
      
      setLoading(false);
      return true;
    }
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: isActive })
        .eq('id', userId);

      if (error) throw error;
      await logEvent(null, isActive ? 'USER_ENABLED' : 'USER_DISABLED', { userId, isActive });
      await fetchUsers();
      return true;
    } catch (e: any) {
      if (mountedRef.current) setError(e.message || 'Failed to update user');
      return false;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [logEvent, fetchUsers, isDemoMode, demoUsers]);

  // Delete user (demo-aware)
  const deleteUser = useCallback(async (userId: string): Promise<boolean> => {
    if (!mountedRef.current) return false;
    setLoading(true);
    
    if (isDemoMode) {
      const userToDelete = demoUsers.find(u => u.id === userId);
      if (!userToDelete) {
        setError('User not found');
        setLoading(false);
        return false;
      }
      
      // Don't allow deleting the admin in demo mode
      if (userToDelete.role === 'ADMIN') {
        setError('Cannot delete admin user in demo mode');
        setLoading(false);
        return false;
      }
      
      const newDemoUsers = demoUsers.filter(u => u.id !== userId);
      setDemoUsers(newDemoUsers);
      setUsers(newDemoUsers);
      
      await logEvent(null, 'USER_DELETED', { 
        userId, 
        username: userToDelete.username,
        name: `${userToDelete.first_name} ${userToDelete.last_name}`
      });
      
      setLoading(false);
      return true;
    }
    
    try {
      const userToDelete = users.find(u => u.id === userId);
      
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      await logEvent(null, 'USER_DELETED', { 
        userId, 
        username: userToDelete?.username,
        name: userToDelete ? `${userToDelete.first_name} ${userToDelete.last_name}` : 'Unknown'
      });
      await fetchUsers();
      return true;
    } catch (e: any) {
      if (mountedRef.current) setError(e.message || 'Failed to delete user');
      return false;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [users, logEvent, fetchUsers, isDemoMode, demoUsers]);

  // Update dealership settings (demo-aware)
  const updateDealershipSettings = useCallback(async (updates: Partial<Dealership>): Promise<boolean> => {
    if (!currentDealership || !mountedRef.current) return false;
    setLoading(true);
    
    if (isDemoMode) {
      const updatedDealership = {
        ...currentDealership,
        ...updates,
        updated_at: new Date().toISOString()
      };
      setCurrentDealership(updatedDealership);
      await logEvent(null, 'SETTINGS_CHANGED', updates);
      setLoading(false);
      return true;
    }
    
    try {
      const { data, error } = await supabase
        .from('dealerships')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', currentDealership.id)
        .select()
        .single();

      if (error) throw error;
      if (mountedRef.current && data) {
        setCurrentDealership(data);
      }
      await logEvent(null, 'SETTINGS_CHANGED', updates);
      return true;
    } catch (e: any) {
      if (mountedRef.current) setError(e.message || 'Failed to update settings');
      return false;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [currentDealership, logEvent, isDemoMode]);

  // Create dealership
  const createDealership = useCallback(async (dealershipData: Partial<Dealership>): Promise<boolean> => {
    if (!mountedRef.current) return false;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('dealerships')
        .insert({
          name: dealershipData.name,
          code: dealershipData.code?.toUpperCase(),
          dealer_type: dealershipData.dealer_type || 'AUTO',
          admin_pin_hash: dealershipData.admin_pin_hash || '0000',
          primary_color: dealershipData.primary_color || '#3B82F6',
          secondary_color: dealershipData.secondary_color || '#1E40AF',
          alert_yellow_minutes: dealershipData.alert_yellow_minutes || 30,
          alert_red_minutes: dealershipData.alert_red_minutes || 60
        });

      if (error) throw error;
      await fetchDealerships();
      return true;
    } catch (e: any) {
      if (mountedRef.current) setError(e.message || 'Failed to create dealership');
      return false;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [fetchDealerships]);

  // Update dealership
  const updateDealership = useCallback(async (dealershipId: string, updates: Partial<Dealership>): Promise<boolean> => {
    if (!mountedRef.current) return false;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('dealerships')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', dealershipId);

      if (error) throw error;
      await fetchDealerships();
      return true;
    } catch (e: any) {
      if (mountedRef.current) setError(e.message || 'Failed to update dealership');
      return false;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [fetchDealerships]);

  // Toggle dealership suspension
  const toggleDealershipSuspension = useCallback(async (dealershipId: string, isSuspended: boolean): Promise<boolean> => {
    return updateDealership(dealershipId, { is_suspended: isSuspended });
  }, [updateDealership]);

  // Delete dealership
  const deleteDealership = useCallback(async (dealershipId: string): Promise<boolean> => {
    if (!mountedRef.current) return false;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('dealerships')
        .delete()
        .eq('id', dealershipId);

      if (error) throw error;
      await fetchDealerships();
      return true;
    } catch (e: any) {
      if (mountedRef.current) setError(e.message || 'Failed to delete dealership');
      return false;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [fetchDealerships]);

  // Fetch data when dealership changes
  useEffect(() => {
    if (currentDealership && mountedRef.current && !isDemoMode) {
      fetchKeys();
      fetchUsers();
      fetchLogs();
    }
  }, [currentDealership, fetchKeys, fetchUsers, fetchLogs, isDemoMode]);

  // Auto-refresh keys
  useEffect(() => {
    if (currentDealership && !isDemoMode && (currentScreen === 'user-home' || currentScreen === 'admin-dashboard' || currentScreen === 'keys-management')) {
      const interval = setInterval(() => {
        if (mountedRef.current) {
          fetchKeys();
        }
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [currentDealership, currentScreen, fetchKeys, isDemoMode]);

  return {
    currentScreen,
    setCurrentScreen,
    isOwnerMode,
    currentDealership,
    currentUser,
    loading,
    error,
    setError,
    logoTapCount,
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
    fetchUsers,
    fetchLogs,
    fetchDealerships,
    LOGO_URL,
    // Persistent session exports
    persistentSession,
    sessionChecked,
    handleAutoLogin,
    handleClearSession,
    // Demo mode exports
    isDemoMode,
    enterDemoMode,
    exitDemoMode,
    DEMO_MAX_USERS,
    DEMO_MAX_KEYS
  };
}
