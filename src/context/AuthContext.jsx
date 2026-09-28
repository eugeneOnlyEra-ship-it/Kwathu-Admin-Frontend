import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { apiJson } from '../utils/apiClient';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '../utils/tokenStorage';

export const AuthContext = createContext(null);

// This app only ever has one door in — POST /auth/admin-login — which the
// backend already rejects for any account that isn't role=admin. So unlike
// the consumer frontend's AuthContext (student/landlord/google/otp login,
// registration, etc.), there's nothing here to trim down at runtime: a
// successful session in this app is always an admin session.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const applySession = useCallback((data) => {
    setTokens(data.access_token, data.refresh_token);
    setUser(data.user);
  }, []);

  const clearSession = useCallback(() => {
    clearTokens();
    setUser(null);
  }, []);

  const fetchProfile = useCallback(async () => {
    const data = await apiJson('/auth/profile');
    setUser(data);
    return data;
  }, []);

  useEffect(() => {
    (async () => {
      const hasToken = getAccessToken() || getRefreshToken();
      if (!hasToken) {
        setIsLoading(false);
        return;
      }
      try {
        await fetchProfile();
      } catch {
        clearSession();
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const adminLogin = useCallback(async ({ email, password }) => {
    setError(null);
    const data = await apiJson('/auth/admin-login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    applySession(data);
    return data.user;
  }, [applySession]);

  const logout = useCallback(async () => {
    try {
      await apiJson('/auth/logout', { method: 'POST' });
    } catch {
      // best-effort — session clears locally regardless of API outcome
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      error,
      isAdmin: user?.role === 'admin',
      adminLogin,
      logout,
      refetchProfile: fetchProfile,
      clearError: () => setError(null),
    }),
    [user, isLoading, error, adminLogin, logout, fetchProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
