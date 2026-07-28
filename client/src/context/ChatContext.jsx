import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { chatsAPI } from '../services/api';
import { useAuth } from './AuthContext';
import usePolling from '../hooks/usePolling';

const ChatContext = createContext();

// The header badge does not need second-by-second accuracy, and this runs on
// every page for every logged-in user
const UNREAD_POLL_INTERVAL = 20000;

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

  // Clear the badge as soon as the user signs out
  useEffect(() => {
    if (!currentUser) setUnreadCount(0);
  }, [currentUser]);

  // Polls only once auth has settled, only for signed-in users, and only while
  // the tab is actually visible
  usePolling(fetchUnreadCount, UNREAD_POLL_INTERVAL, !authLoading && !!currentUser);

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
