import React, { useState, useContext, createContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children, users, setUsers }) => {
  const [currentUser, setCurrentUser] = useState(null); // currentUser will be a user object from DB_USERS

  // Requirement #1: Login/Account Creation
  const login = (username, password) => {
    // In a real app, this is an API call.
    // Here, we just find the user in our mock DB.
    const user = Object.values(users).find(u => u.username === username);
    if (user) { // We'll ignore password for this demo
      setCurrentUser(user);
      return true;
    }
    return false;
  };

  const register = (username, password) => {
    // In a real app, this is an API call.
    if (Object.values(users).some(u => u.username === username)) {
      return false; // Username taken
    }
    const newId = "u" + (Object.keys(users).length + 1);
    const newUser = { id: newId, username, joined: new Date().toISOString() };
    setUsers(prevUsers => ({...prevUsers, [newId]: newUser}));
    setCurrentUser(newUser);
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const value = {
    currentUser,
    login,
    logout,
    register,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook (src/hooks/useAuth.js)
export const useAuth = () => {
  return useContext(AuthContext);
};