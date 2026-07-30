import { useState, useContext, createContext, useEffect, useCallback, useMemo } from 'react';
import { postsAPI, communitiesAPI } from '../services/api';

const AuthContext = createContext();
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Try to get cached user from localStorage for instant load
const getCachedUser = () => {
  try {
    const cached = localStorage.getItem('cachedUser');
    if (cached) return JSON.parse(cached);
  } catch {}
  return null;
};

const setCachedUser = (user) => {
  try {
    if (user) {
      localStorage.setItem('cachedUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('cachedUser');
    }
  } catch {}
};

// /auth/login, /auth/register and /auth/google return the user through the
// model's toJSON (which keeps `_id`), while /auth/me returns it with an added
// `id`. Ownership checks around the app read `currentUser.id`, so both keys are
// filled in once here rather than being guessed at every call site.
const normalizeUser = (user) => {
  if (!user) return null;
  const id = user.id || user._id;
  return { ...user, id, _id: user._id || id };
};

// The feed and the community list are cached per module, and both carry fields
// that depend on who is asking - a post's `userVote`, a community's join state.
// Entries built for one viewer are wrong for the next one.
const clearUserScopedCaches = () => {
  postsAPI.invalidateCache();
  communitiesAPI.invalidateCache();
};

export const AuthProvider = ({ children }) => {
  // Initialize with cached user for instant UI (no loading state)
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('authToken'));
  const [currentUser, setCurrentUser] = useState(() =>
    localStorage.getItem('authToken') ? normalizeUser(getCachedUser()) : null
  );
  const [loading, setLoading] = useState(() => {
    const token = localStorage.getItem('authToken');
    return !!token && !getCachedUser(); // Only loading if token exists but no cache
  });

  // Check if user is logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (token) {
          const response = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const userData = normalizeUser(await response.json());
            setCurrentUser(userData);
            setCachedUser(userData); // Cache for next load
          } else {
            localStorage.removeItem('authToken');
            setCachedUser(null);
            setAuthToken(null);
            setCurrentUser(null);
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('authToken');
        setCachedUser(null);
        setAuthToken(null);
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Login - to be called after successful backend authentication.
  //
  // This used to reload the document, which threw away the parsed bundle, every
  // cached response and the scroll position just to re-render a header, and put
  // a white frame plus a second round of skeletons between the modal closing
  // and the signed-in page appearing. The sign-in response already contains the
  // user, so the app can switch over in place in a single render.
  const login = useCallback((userData, token) => {
    localStorage.setItem('authToken', token);
    const user = normalizeUser(userData);
    setCachedUser(user);
    clearUserScopedCaches();
    setAuthToken(token);
    setCurrentUser(user);
    setLoading(false);
  }, []);

  // Logout - the same in reverse, and equally does not need a reload
  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    setCachedUser(null);
    clearUserScopedCaches();
    setAuthToken(null);
    setCurrentUser(null);
    setLoading(false);
  }, []);

  // Update user data (for profile edits)
  const updateUser = useCallback((userData) => {
    setCurrentUser(prev => {
      const next = normalizeUser({ ...prev, ...userData });
      // Keep the cache in step, otherwise the next load paints the old profile
      // for as long as /auth/me takes to answer
      setCachedUser(next);
      return next;
    });
  }, []);

  // A fresh object on every render made every consumer of this context re-render
  // with it, which is most of the app
  const value = useMemo(() => ({
    currentUser,
    authToken,
    login,
    logout,
    updateUser,
    loading,
  }), [currentUser, authToken, login, logout, updateUser, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
