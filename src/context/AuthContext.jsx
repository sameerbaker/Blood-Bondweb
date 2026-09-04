import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi } from '../api/auth';
import { TOKEN_KEY, USER_KEY } from '../config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); }
    catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || null);
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);

  // Try to hydrate user info from the API if we have a token but no user
  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      if (token && !user) {
        try {
          const res = await authApi.me();
          if (!cancelled) {
            setUser(res.data);
            localStorage.setItem(USER_KEY, JSON.stringify(res.data));
          }
        } catch {
          // 401 → interceptor already cleared storage
        }
      }
      if (!cancelled) setBootstrapping(false);
    }
    hydrate();
    return () => { cancelled = true; };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const persist = useCallback((newToken, newUser) => {
    if (newToken) {
      localStorage.setItem(TOKEN_KEY, newToken);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
    if (newUser) {
      localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    } else {
      localStorage.removeItem(USER_KEY);
    }
    setToken(newToken || null);
    setUser(newUser || null);
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      // API returns token in various shapes — be liberal
      const data = res.data || {};
      const newToken = data.token || data.accessToken || data.jwt || data.Token;
      const newUser = data.user || data.User || data.profile || null;
      if (!newToken) {
        // Some APIs return the token as a plain string
        if (typeof data === 'string' && data.length > 20) {
          persist(data, null);
          return { ok: true };
        }
        throw new Error('Login succeeded but no token was returned.');
      }
      persist(newToken, newUser);
      return { ok: true, user: newUser };
    } finally {
      setLoading(false);
    }
  }, [persist]);

  const register = useCallback(async (payload) => {
    setLoading(true);
    try {
      const res = await authApi.register(payload);
      return { ok: true, data: res.data };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    persist(null, null);
  }, [persist]);

  const value = {
    user,
    token,
    role: user?.role || user?.Role || null,
    isAuthenticated: !!token,
    bootstrapping,
    loading,
    login,
    register,
    logout,
    setUser: (u) => { localStorage.setItem(USER_KEY, JSON.stringify(u)); setUser(u); },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
