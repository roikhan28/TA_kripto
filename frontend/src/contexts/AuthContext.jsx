import React, { createContext, useContext, useState, useEffect } from 'react';
import { ipcService } from '../services/ipcService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [sessionToken, setSessionToken] = useState(() => sessionStorage.getItem('gv_token') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function verifyExistingSession() {
      if (!sessionToken) {
        setLoading(false);
        return;
      }
      try {
        const res = await ipcService.checkSession(sessionToken);
        if (res.success && res.data.valid) {
          setUser(res.data.user);
        } else {
          // Token invalid or expired
          sessionStorage.removeItem('gv_token');
          setSessionToken(null);
          setUser(null);
        }
      } catch (err) {
        sessionStorage.removeItem('gv_token');
        setSessionToken(null);
      } finally {
        setLoading(false);
      }
    }

    verifyExistingSession();
  }, [sessionToken]);

  const login = async (username, password) => {
    setError(null);
    setLoading(true);
    try {
      const res = await ipcService.login(username, password);
      if (res.success) {
        const { sessionToken: token, user: loggedUser } = res.data;
        sessionStorage.setItem('gv_token', token);
        setSessionToken(token);
        setUser(loggedUser);
        return { success: true };
      } else {
        const msg = res.error?.message || 'Login gagal';
        setError(msg);
        return { success: false, error: msg };
      }
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (sessionToken) {
      await ipcService.logout(sessionToken);
    }
    sessionStorage.removeItem('gv_token');
    setSessionToken(null);
    setUser(null);
    setError(null);
  };

  const value = {
    user,
    sessionToken,
    isAuthenticated: !!user,
    loading,
    error,
    login,
    logout,
    hasPermission: (perm) => user?.permissions?.includes(perm) || user?.roleName === 'ADMIN'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
