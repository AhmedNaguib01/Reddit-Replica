import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Send, ArrowLeft, Search, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { chatsAPI, usersAPI } from '../services/api';
import Sidebar from '../components/layout/Sidebar';
import usePageTitle from '../hooks/usePageTitle';
import '../styles/ChatPage.css';

const ChatPage = ({ isSidebarCollapsed, onToggleSidebar }) => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchUsername, setSearchUsername] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const pollIntervalRef = useRef(null);

  usePageTitle('Messages');

  const chatListPollRef = useRef(null);

  // Fetch all chats and handle navigation state
  useEffect(() => {
    if (!currentUser) return;
    
    const fetchChats = async (isInitial = false) => {
      try {
        const data = await chatsAPI.getAll();
        setChats(data);
        
        // If navigated from profile with chat info, select that chat (only on initial load)
        if (isInitial && location.state?.chatId) {
          const chatFromState = {
            id: location.state.chatId,
            otherUser: location.state.otherUser,
            lastMessage: null,
            unreadCount: 0
          };
          setSelectedChat(chatFromState);
          // Clear the state so it doesn't persist on refresh
          window.history.replaceState({}, document.title);
        }
      } catch (error) {
        console.error('Error fetching chats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChats(true);

    // Poll for new chats every 3 seconds (for receiving new conversations)
    chatListPollRef.current = setInterval(() => fetchChats(false), 3000);

    return () => {
      if (chatListPollRef.current) {
        clearInterval(chatListPollRef.current);
      }
    };
  }, [currentUser, location.state]);

  // Fetch messages when chat is selected
  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      // Don't fetch while sending to prevent flicker
      if (sending) return;
      
      try {
        const data = await chatsAPI.getMessages(selectedChat.id);
        setMessages(data);
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();

    // Poll for new messages every second
    pollIntervalRef.current = setInterval(fetchMessages, 1000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [selectedChat, sending]);


  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Live search users
  useEffect(() => {
    if (!searchUsername.trim()) {
      setSearchResults([]);
      return;
    }

    const searchUsers = async () => {
      try {
        const results = await usersAPI.search(searchUsername);
        // Filter out current user
        setSearchResults(results.filter(u => u.username !== currentUser?.username));
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchUsername, currentUser]);

  // Start chat with user
  const handleStartChat = async (username) => {
    setSearchError('');
    try {
      const result = await chatsAPI.create(username);
      
      const newChat = {
        id: result.id,
        otherUser: result.otherUser,
        lastMessage: null,
        unreadCount: 0
      };

      // Add to chats if new
      if (result.isNew) {
        setChats(prev => [newChat, ...prev]);
      } else {
        // Move existing chat to top
        setChats(prev => {
          const existing = prev.find(c => c.id === result.id);
          if (existing) {
            return [existing, ...prev.filter(c => c.id !== result.id)];
          }
          return prev;
        });
      }

      setSelectedChat(newChat);
      setSearchUsername('');
      setSearchResults([]);
    } catch (error) {
      setSearchError(error.message);
    }
  };

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat || sending) return;

    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const tempMessage = {
      _id: tempId,
      senderUsername: currentUser.username,
      content,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMessage]);

    try {
      const savedMessage = await chatsAPI.sendMessage(selectedChat.id, content);
      
      // Replace temp message with real one
      setMessages(prev => prev.map(m => 
        m._id === tempId ? savedMessage : m
      ));
      
      // Update chat list
      setChats(prev => prev.map(chat => 
        chat.id === selectedChat.id 
          ? { ...chat, lastMessage: { content, senderUsername: currentUser.username, createdAt: new Date() } }
          : chat
      ));
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m._id !== tempId));
      setNewMessage(content);
    } finally {
      setSending(false);
    }
  };

  // Format time
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString();
  };

  if (!currentUser) {
    return (
      <div className="chat-page">
        <Sidebar isCollapsed={isSidebarCollapsed} onToggle={onToggleSidebar} />
        <div className="chat-container">
          <div className="chat-empty-state">
            <MessageCircle size={64} />
            <h2>Please log in to view messages</h2>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="chat-page">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={onToggleSidebar} />
      
      <div className="chat-container">
        {/* Chat List */}
        <div className={`chat-list ${selectedChat ? 'hide-mobile' : ''}`}>
          <div className="chat-list-header">
            <h2>Messages</h2>
          </div>

          {/* New Chat Search */}
          <div className="new-chat-form">
            <div className="search-input-container">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search users to chat..."
                value={searchUsername}
                onChange={(e) => {
                  setSearchUsername(e.target.value);
                  setSearchError('');
                }}
              />
            </div>
            {searchError && <p className="search-error">{searchError}</p>}
            
            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="chat-search-results">
                {searchResults.map(user => (
                  <button
                    key={user._id}
                    className="chat-search-result-item"
                    onClick={() => handleStartChat(user.username)}
                  >
                    <div className="chat-avatar-small">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="chat-search-username">{user.username}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Chat List Items */}
          <div className="chat-list-items">
            {loading ? (
              <div className="chat-loading">Loading chats...</div>
            ) : chats.length === 0 ? (
              <div className="chat-empty">
                <p>No conversations yet</p>
                <p className="chat-empty-hint">Start a chat by entering a username above</p>
              </div>
            ) : (
              chats.map(chat => (
                <button
                  key={chat.id}
                  className={`chat-list-item ${selectedChat?.id === chat.id ? 'active' : ''}`}
                  onClick={() => setSelectedChat(chat)}
                >
                  <div className="chat-avatar">
                    {chat.otherUser?.charAt(0).toUpperCase()}
                  </div>
                  <div className="chat-item-info">
                    <span className="chat-item-name">{chat.otherUser}</span>
                    {chat.lastMessage && (
                      <span className="chat-item-preview">
                        {chat.lastMessage.senderUsername === currentUser.username ? 'You: ' : ''}
                        {chat.lastMessage.content}
                      </span>
                    )}
                  </div>
                  {chat.unreadCount > 0 && (
                    <span className="chat-unread-badge">{chat.unreadCount}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div className={`chat-window ${!selectedChat ? 'hide-mobile' : ''}`}>
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <div className="chat-window-header">
                <button className="back-btn-mobile" onClick={() => setSelectedChat(null)}>
                  <ArrowLeft size={20} />
                </button>
                <Link to={`/user/${selectedChat.otherUser}`} className="chat-header-user-link">
                  <div className="chat-header-avatar">
                    {selectedChat.otherUser?.charAt(0).toUpperCase()}
                  </div>
                  <span className="chat-header-name">{selectedChat.otherUser}</span>
                </Link>
              </div>

              {/* Messages */}
              <div className="chat-messages">
                {messages.length === 0 ? (
                  <div className="chat-messages-empty">
                    <p>No messages yet. Say hi! 👋</p>
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isSent = msg.senderUsername?.toLowerCase() === currentUser.username?.toLowerCase();
                    return (
                      <div
                        key={msg._id || index}
                        className={`chat-message ${isSent ? 'sent' : 'received'}`}
                      >
                        <div className="message-content">{msg.content}</div>
                        <span className="message-time">{formatTime(msg.createdAt)}</span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form className="chat-input-form" onSubmit={handleSendMessage}>
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={sending}
                />
                <button type="submit" disabled={!newMessage.trim() || sending}>
                  <Send size={20} />
                </button>
              </form>
            </>
          ) : (
            <div className="chat-no-selection">
              <MessageCircle size={64} />
              <h3>Select a conversation</h3>
              <p>Choose from your existing conversations or start a new one</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
