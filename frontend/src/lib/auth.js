import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from './api';

const AuthContext = createContext(null);

// Inactivity timeout: 6 hours in milliseconds (per user requirement)
const INACTIVITY_TIMEOUT = 6 * 60 * 60 * 1000;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Update last activity timestamp
  const updateLastActivity = useCallback(() => {
    localStorage.setItem('keyflow_last_activity', Date.now().toString());
  }, []);

  // Check if session has expired due to inactivity
  const checkInactivity = useCallback(() => {
    const lastActivity = localStorage.getItem('keyflow_last_activity');
    const token = localStorage.getItem('keyflow_token');
    const rememberMe = localStorage.getItem('keyflow_remember_me') === 'true';
    
    // Skip inactivity check if "remember me" is enabled
    if (rememberMe) return false;
    
    if (token && lastActivity) {
      const timeSinceLastActivity = Date.now() - parseInt(lastActivity, 10);
      if (timeSinceLastActivity > INACTIVITY_TIMEOUT) {
        // Session expired due to inactivity
        logout();
        return true;
      }
    }
    return false;
  }, []);

  // Set up activity listeners
  useEffect(() => {
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      if (user) {
        updateLastActivity();
      }
    };

    // Add event listeners for activity tracking
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Check for inactivity periodically (every minute)
    const inactivityCheckInterval = setInterval(() => {
      if (user) {
        checkInactivity();
      }
    }, 60000);

    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      clearInterval(inactivityCheckInterval);
    };
  }, [user, updateLastActivity, checkInactivity]);

  useEffect(() => {
    const token = localStorage.getItem('keyflow_token');
    const savedUser = localStorage.getItem('keyflow_user');
    
    if (token && savedUser) {
      // Check for inactivity before restoring session
      if (checkInactivity()) {
        setLoading(false);
        return;
      }

      setUser(JSON.parse(savedUser));
      // Verify token is still valid
      authApi.getMe()
        .then((res) => {
          setUser(res.data);
          localStorage.setItem('keyflow_user', JSON.stringify(res.data));
          updateLastActivity();
        })
        .catch(() => {
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password, rememberMe = false) => {
    const res = await authApi.login(email, password, rememberMe);
    const { access_token, user: userData } = res.data;
    localStorage.setItem('keyflow_token', access_token);
    localStorage.setItem('keyflow_user', JSON.stringify(userData));
    localStorage.setItem('keyflow_remember_me', rememberMe.toString());
    updateLastActivity();
    setUser(userData);
    return userData;
  };

  const ownerLogin = async (pin, rememberMe = false) => {
    const res = await authApi.ownerLogin(pin, rememberMe);
    const { access_token, user: userData } = res.data;
    localStorage.setItem('keyflow_token', access_token);
    localStorage.setItem('keyflow_user', JSON.stringify(userData));
    localStorage.setItem('keyflow_remember_me', rememberMe.toString());
    updateLastActivity();
    setUser(userData);
    return userData;
  };

  const adminPinLogin = async (dealershipId, pin, rememberMe = false) => {
    const res = await authApi.adminPinLogin(dealershipId, pin, rememberMe);
    const { access_token, user: userData } = res.data;
    localStorage.setItem('keyflow_token', access_token);
    localStorage.setItem('keyflow_user', JSON.stringify(userData));
    localStorage.setItem('keyflow_remember_me', rememberMe.toString());
    updateLastActivity();
    setUser(userData);
    return userData;
  };

  const userPinLogin = async (dealershipId, name, pin, rememberMe = false) => {
    const res = await authApi.userPinLogin(dealershipId, name, pin, rememberMe);
    const { access_token, user: userData } = res.data;
    localStorage.setItem('keyflow_token', access_token);
    localStorage.setItem('keyflow_user', JSON.stringify(userData));
    localStorage.setItem('keyflow_remember_me', rememberMe.toString());
    updateLastActivity();
    setUser(userData);
    return userData;
  };

  const demoLogin = async () => {
    const res = await authApi.demoLogin();
    const { access_token, user: userData } = res.data;
    localStorage.setItem('keyflow_token', access_token);
    localStorage.setItem('keyflow_user', JSON.stringify({...userData, is_demo: true}));
    updateLastActivity();
    setUser({...userData, is_demo: true});
    return userData;
  };

  const register = async (data) => {
    const res = await authApi.register(data);
    const { access_token, user: userData } = res.data;
    localStorage.setItem('keyflow_token', access_token);
    localStorage.setItem('keyflow_user', JSON.stringify(userData));
    updateLastActivity();
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('keyflow_token');
    localStorage.removeItem('keyflow_user');
    localStorage.removeItem('keyflow_remember_me');
    localStorage.removeItem('keyflow_last_activity');
    setUser(null);
  };

  const isOwner = user?.role === 'owner';
  const isDealershipAdmin = user?.role === 'dealership_admin';
  const isUser = user?.role === 'user';
  const isDemo = user?.is_demo === true;

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      ownerLogin,
      adminPinLogin,
      userPinLogin,
      demoLogin,
      register,
      logout,
      isOwner,
      isDealershipAdmin,
      isUser,
      isDemo,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
