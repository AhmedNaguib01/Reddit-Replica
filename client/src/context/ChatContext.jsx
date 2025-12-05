import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { chatsAPI } from '../services/api';
import { useAuth } from './AuthContext';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const { currentUser, loading: authLoading } = useAuth();

  const fetchUnreadCount = useCallback(async () => {
    if (!currentUser) {
      setUnreadCount(0);
      return;
    }
    try {
      const data = await chatsAPI.getUnreadCount();
      setUnreadCount(data.count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, [currentUser]);

  // Mark messages as read and update count
  const markChatAsRead = useCallback(() => {
    // Refetch the count after marking as read
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Initial fetch and polling - wait for auth to complete
  useEffect(() => {
    if (authLoading) return;
    
    fetchUnreadCount();
    
    // Poll every 15 seconds for chat notifications (balance between responsiveness and performance)
    if (currentUser) {
      const interval = setInterval(fetchUnreadCount, 15000);
      return () => clearInterval(interval);
    }
  }, [fetchUnreadCount, authLoading, currentUser]);

  return (
    <ChatContext.Provider value={{ unreadCount, fetchUnreadCount, markChatAsRead }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
