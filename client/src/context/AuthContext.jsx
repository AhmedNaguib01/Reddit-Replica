import { useState, useContext, createContext, useEffect } from 'react';

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

export const AuthProvider = ({ children }) => {
  // Initialize with cached user for instant UI (no loading state)
  const token = localStorage.getItem('authToken');
  const [currentUser, setCurrentUser] = useState(token ? getCachedUser() : null);
  const [loading, setLoading] = useState(!!token && !getCachedUser()); // Only loading if token exists but no cache

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
            const userData = await response.json();
            setCurrentUser(userData);
            setCachedUser(userData); // Cache for next load
          } else {
            localStorage.removeItem('authToken');
            setCachedUser(null);
            setCurrentUser(null);
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('authToken');
        setCachedUser(null);
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Login - to be called after successful backend authentication
  const login = (userData, token) => {
    localStorage.setItem('authToken', token);
    window.location.reload();
  };

  // Logout
  const logout = async () => {
    localStorage.removeItem('authToken');
    setCachedUser(null);
    window.location.reload();
  };

  // Update user data (for profile edits)
  const updateUser = (userData) => {
    setCurrentUser(prev => ({ ...prev, ...userData }));
  };

  const value = {
    currentUser,
    login,
    logout,
    updateUser,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
