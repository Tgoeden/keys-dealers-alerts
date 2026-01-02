import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from './api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('keyflow_token');
    const savedUser = localStorage.getItem('keyflow_user');
    
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      // Verify token is still valid
      authApi.getMe()
        .then((res) => {
          setUser(res.data);
          localStorage.setItem('keyflow_user', JSON.stringify(res.data));
        })
        .catch(() => {
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await authApi.login(email, password);
    const { access_token, user: userData } = res.data;
    localStorage.setItem('keyflow_token', access_token);
    localStorage.setItem('keyflow_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const ownerLogin = async (pin) => {
    const res = await authApi.ownerLogin(pin);
    const { access_token, user: userData } = res.data;
    localStorage.setItem('keyflow_token', access_token);
    localStorage.setItem('keyflow_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const register = async (data) => {
    const res = await authApi.register(data);
    const { access_token, user: userData } = res.data;
    localStorage.setItem('keyflow_token', access_token);
    localStorage.setItem('keyflow_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('keyflow_token');
    localStorage.removeItem('keyflow_user');
    setUser(null);
  };

  const isOwner = user?.role === 'owner';
  const isDealershipAdmin = user?.role === 'dealership_admin';
  const isUser = user?.role === 'user';

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      ownerLogin,
      register,
      logout,
      isOwner,
      isDealershipAdmin,
      isUser,
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
