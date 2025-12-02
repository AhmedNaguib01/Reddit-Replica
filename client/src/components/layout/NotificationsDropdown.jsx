import { useState, useRef, useEffect } from 'react';
import { Bell, Check, MessageSquare, ArrowBigUp, UserPlus, Reply } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { notificationsAPI } from '../../services/api';
import '../../styles/NotificationsDropdown.css';

const NotificationsDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const { currentUser } = useAuth();

  const unreadCount = notifications.filter(n => !n.read).length;

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen && currentUser) {
      fetchNotifications();
    }
  }, [isOpen, currentUser]);

  // Fetch notifications on mount for badge count and poll every 30 seconds
  useEffect(() => {
    if (currentUser) {
      fetchNotifications();
      
      // Poll for new notifications every 30 seconds
      const interval = setInterval(() => {
        fetchNotifications();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const fetchNotifications = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const data = await notificationsAPI.getAll();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id || n._id === id ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'upvote':
        return <ArrowBigUp size={20} className="notif-icon upvote" />;
      case 'comment':
        return <MessageSquare size={20} className="notif-icon comment" />;
      case 'reply':
        return <Reply size={20} className="notif-icon reply" />;
      case 'follow':
        return <UserPlus size={20} className="notif-icon follow" />;
      default:
        return <Bell size={20} className="notif-icon" />;
    }
  };

  return (
    <div className="notifications-container" ref={dropdownRef}>
      <button 
        className="notifications-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notifications-dropdown">
          <div className="notif-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="mark-all-read">
                <Check size={16} />
                Mark all as read
              </button>
            )}
          </div>

          <div className="notif-list">
            {loading ? (
              <div className="notif-loading">
                <div className="notif-spinner"></div>
                <span>Loading...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="no-notifications">
                <Bell size={48} />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map(notif => (
                <Link
                  key={notif.id || notif._id}
                  to={notif.link}
                  className={`notif-item ${notif.read ? 'read' : 'unread'}`}
                  onClick={() => {
                    markAsRead(notif.id || notif._id);
                    setIsOpen(false);
                  }}
                >
                  {getIcon(notif.type)}
                  <div className="notif-content">
                    <p className="notif-message">{notif.message}</p>
                    <span className="notif-time">{notif.time || notif.timeAgo}</span>
                  </div>
                  {!notif.read && <div className="unread-dot" />}
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsDropdown;
