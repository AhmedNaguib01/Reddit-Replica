import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Send, ArrowLeft, Search, MessageCircle, Trash2, Reply, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { chatsAPI, usersAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import Sidebar from '../components/layout/Sidebar';
import ConfirmModal from '../components/common/ConfirmModal';
import usePageTitle from '../hooks/usePageTitle';
import '../styles/ChatPage.css';

const ChatPage = ({ isSidebarCollapsed, onToggleSidebar }) => {
  const { currentUser } = useAuth();
  const { markChatAsRead } = useChat();
  const location = useLocation();
  const { showToast } = useToast();
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchUsername, setSearchUsername] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, message: null });
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const isUserScrolledUp = useRef(false);
  const lastMessageCount = useRef(0);

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
      lastMessageCount.current = 0;
      return;
    }

    const fetchMessages = async () => {
      // Don't fetch while sending to prevent flicker
      if (sending) return;
      
      try {
        const data = await chatsAPI.getMessages(selectedChat.id);
        // Only update if there are new messages to prevent unnecessary re-renders
        setMessages(prev => {
          // If we have temp messages, merge them properly
          const tempMessages = prev.filter(m => String(m._id).startsWith('temp-'));
          if (tempMessages.length > 0) {
            // Keep temp messages that aren't in the new data yet
            const newIds = new Set(data.map(m => m._id));
            const remainingTemp = tempMessages.filter(t => !newIds.has(t._id));
            return [...data, ...remainingTemp];
          }
          return data;
        });
        // Update unread count in header after reading messages
        markChatAsRead();
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();

    // Poll for new messages every 2 seconds (reduced frequency)
    pollIntervalRef.current = setInterval(fetchMessages, 2000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [selectedChat, sending]);

  // Handle scroll detection
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    // User is scrolled up if they're more than 100px from bottom
    isUserScrolledUp.current = scrollHeight - scrollTop - clientHeight > 100;
  }, []);

  // Scroll to bottom only when appropriate
  useEffect(() => {
    // Only auto-scroll if user hasn't scrolled up and there are new messages
    if (!isUserScrolledUp.current && messages.length > lastMessageCount.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    lastMessageCount.current = messages.length;
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
    const replyToId = replyingTo?._id;
    setNewMessage('');
    setReplyingTo(null);
    setSending(true);

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const tempMessage = {
      _id: tempId,
      senderUsername: currentUser.username,
      content,
      createdAt: new Date().toISOString(),
      replyTo: replyToId || null,
      replyToContent: replyingTo?.content?.substring(0, 100) || null,
      replyToUsername: replyingTo?.senderUsername || null
    };
    setMessages(prev => [...prev, tempMessage]);
    
    // Reset scroll position to show new message
    isUserScrolledUp.current = false;

    try {
      const savedMessage = await chatsAPI.sendMessage(selectedChat.id, content, replyToId);
      
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
      // Keep focus on input after sending
      inputRef.current?.focus();
    }
  };

  // Reply to message
  const handleReply = (message) => {
    if (message.deleted) return;
    setReplyingTo(message);
    setContextMenu({ visible: false, x: 0, y: 0, message: null });
    inputRef.current?.focus();
  };

  // Context menu handler
  const handleContextMenu = (e, msg) => {
    e.preventDefault();
    if (msg.deleted || String(msg._id).startsWith('temp-')) return;
    
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      message: msg
    });
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClick = () => setContextMenu({ visible: false, x: 0, y: 0, message: null });
    if (contextMenu.visible) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu.visible]);

  // Delete message
  const handleDeleteMessage = async () => {
    if (!messageToDelete || !selectedChat) return;
    
    try {
      await chatsAPI.deleteMessage(selectedChat.id, messageToDelete._id);
      // Update message in state
      setMessages(prev => prev.map(m => 
        m._id === messageToDelete._id 
          ? { ...m, deleted: true, content: 'This message was deleted' }
          : m
      ));
      setMessageToDelete(null);
      showToast('Message deleted', 'success');
    } catch (error) {
      console.error('Error deleting message:', error);
      showToast(error.message || 'Failed to delete message', 'error');
    }
  };

  // Delete chat
  const handleDeleteChat = async () => {
    if (!selectedChat) return;
    
    try {
      await chatsAPI.delete(selectedChat.id);
      setChats(prev => prev.filter(c => c.id !== selectedChat.id));
      setSelectedChat(null);
      setMessages([]);
      setShowDeleteConfirm(false);
      showToast('Chat deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting chat:', error);
      showToast(error.message || 'Failed to delete chat', 'error');
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
                <button 
                  className="chat-delete-btn" 
                  onClick={() => setShowDeleteConfirm(true)}
                  title="Delete conversation"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              {/* Messages */}
              <div 
                className="chat-messages" 
                ref={messagesContainerRef}
                onScroll={handleScroll}
              >
                {messages.length === 0 ? (
                  <div className="chat-messages-empty">
                    <p>No messages yet. Say hi! 👋</p>
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isSent = msg.senderUsername?.toLowerCase() === currentUser.username?.toLowerCase();
                    const isDeleted = msg.deleted;
                    return (
                      <div
                        key={msg._id || index}
                        className={`chat-message ${isSent ? 'sent' : 'received'} ${isDeleted ? 'deleted' : ''}`}
                        onContextMenu={(e) => handleContextMenu(e, msg)}
                      >
                        {/* Reply preview */}
                        {msg.replyTo && msg.replyToContent && (
                          <div className="message-reply-preview">
                            <span className="reply-username">{msg.replyToUsername}</span>
                            <span className="reply-content">{msg.replyToContent}</span>
                          </div>
                        )}
                        <div className="message-bubble">
                          <div className="message-content">
                            {isDeleted ? (
                              <em className="deleted-text">{msg.content}</em>
                            ) : (
                              msg.content
                            )}
                          </div>
                        </div>
                        <span className="message-time">{formatTime(msg.createdAt)}</span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="chat-input-container">
                {/* Reply preview bar */}
                {replyingTo && (
                  <div className="reply-bar">
                    <div className="reply-bar-content">
                      <Reply size={16} />
                      <span className="reply-bar-text">
                        Replying to <strong>{replyingTo.senderUsername}</strong>: {replyingTo.content?.substring(0, 50)}...
                      </span>
                    </div>
                    <button 
                      className="reply-bar-close"
                      onClick={() => setReplyingTo(null)}
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
                <form className="chat-input-form" onSubmit={handleSendMessage}>
                  <input
                    ref={inputRef}
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
              </div>
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

      {/* Delete Chat Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteChat}
        title="Delete Conversation"
        message={`Are you sure you want to delete this conversation with ${selectedChat?.otherUser}? This will delete the chat for both users and cannot be undone.`}
        confirmText="Delete"
        type="danger"
      />

      {/* Delete Message Confirmation Modal */}
      <ConfirmModal
        isOpen={!!messageToDelete}
        onClose={() => setMessageToDelete(null)}
        onConfirm={handleDeleteMessage}
        title="Delete Message"
        message="Are you sure you want to delete this message? This cannot be undone."
        confirmText="Delete"
        type="danger"
      />

      {/* Context Menu */}
      {contextMenu.visible && contextMenu.message && (
        <div 
          className="message-context-menu"
          style={{ 
            top: contextMenu.y, 
            left: contextMenu.x 
          }}
        >
          <button 
            className="context-menu-item"
            onClick={() => handleReply(contextMenu.message)}
          >
            <Reply size={16} />
            Reply
          </button>
          {contextMenu.message.senderUsername?.toLowerCase() === currentUser.username?.toLowerCase() && (
            <button 
              className="context-menu-item delete"
              onClick={() => {
                setMessageToDelete(contextMenu.message);
                setContextMenu({ visible: false, x: 0, y: 0, message: null });
              }}
            >
              <Trash2 size={16} />
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatPage;
