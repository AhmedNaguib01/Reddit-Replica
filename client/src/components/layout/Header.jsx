import { Link, useNavigate } from 'react-router-dom';
import { Moon, Search, X, Plus, LogOut, User, MoreHorizontal, Smartphone, MessageCircle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { communitiesAPI, usersAPI } from '../../services/api';
import NotificationsDropdown from './NotificationsDropdown';
import CreatePostModal from '../post/CreatePostModal';
import '../../styles/Header.css';

const getDefaultAvatar = (username) => `https://placehold.co/100/ff4500/white?text=${username?.charAt(0).toUpperCase() || 'U'}`;

const RedditLogo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" className="reddit-logo-icon">
    <circle fill="#FF4500" cx="10" cy="10" r="10"/>
    <path fill="#FFF" d="M16.67,10a1.46,1.46,0,0,0-2.47-1,7.12,7.12,0,0,0-3.85-1.23L11,4.65,13.14,5.1a1,1,0,1,0,.13-0.61L10.82,4a0.31,0.31,0,0,0-.37.24L9.71,7.71a7.14,7.14,0,0,0-3.9,1.23A1.46,1.46,0,1,0,4.2,11.33a2.87,2.87,0,0,0,0,.44c0,2.24,2.61,4.06,5.83,4.06s5.83-1.82,5.83-4.06a2.87,2.87,0,0,0,0-.44A1.46,1.46,0,0,0,16.67,10Zm-10,1a1,1,0,1,1,1,1A1,1,0,0,1,6.67,11Zm5.81,2.75a3.84,3.84,0,0,1-2.47.77,3.84,3.84,0,0,1-2.47-.77,0.27,0.27,0,0,1,.38-0.38A3.27,3.27,0,0,0,10,14a3.28,3.28,0,0,0,2.09-.61A0.27,0.27,0,1,1,12.48,13.79Zm-0.18-1.71a1,1,0,1,1,1-1A1,1,0,0,1,12.29,12.08Z"/>
  </svg>
);

const LogoIcon = () => (
  <div className="logo-container">
    <RedditLogo />
    <span className="logo-text">reddit</span>
  </div>
);

// Cache for communities in search
let searchCommunitiesCache = null;
let searchCacheTimestamp = 0;
const SEARCH_CACHE_DURATION = 30 * 1000; // 30 seconds

const SearchBar = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [communities, setCommunities] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingCommunities, setLoadingCommunities] = useState(false);
  const navigate = useNavigate();
  const searchRef = useRef(null);

  // Fetch communities only when user starts typing (lazy load) with debounce
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return;
    
    // Use cache if available and not expired
    const now = Date.now();
    if (searchCommunitiesCache && (now - searchCacheTimestamp) < SEARCH_CACHE_DURATION) {
      setCommunities(searchCommunitiesCache);
      return;
    }
    
    // Debounce the fetch
    const fetchTimeout = setTimeout(async () => {
      if (loadingCommunities) return;
      setLoadingCommunities(true);
      try {
        const data = await communitiesAPI.getAll();
        searchCommunitiesCache = data;
        searchCacheTimestamp = Date.now();
        setCommunities(data);
      } catch (error) {
        console.error('Error fetching communities:', error);
      } finally {
        setLoadingCommunities(false);
      }
    }, 200);
    
    return () => clearTimeout(fetchTimeout);
  }, [searchQuery, loadingCommunities]);

  // Search users when query changes with debounce
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setUsers([]);
      return;
    }
    
    const debounce = setTimeout(async () => {
      try {
        const data = await usersAPI.search(searchQuery);
        setUsers(data);
      } catch (error) {
        console.error('Error searching users:', error);
        setUsers([]);
      }
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  // Get suggestions based on query
  const getSuggestions = () => {
    if (!searchQuery.trim()) return { communities: [], users: [] };
    
    const query = searchQuery.toLowerCase();
    const matchingCommunities = communities
      .filter(c => 
        c.name?.toLowerCase().includes(query) || 
        c.title?.toLowerCase().includes(query)
      )
      .slice(0, 5);
    
    return { communities: matchingCommunities, users: users.slice(0, 5) };
  };

  const suggestions = getSuggestions();
  const hasSuggestions = suggestions.communities.length > 0 || suggestions.users.length > 0;

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowSuggestions(false);
      setIsFocused(false);
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    setShowSuggestions(false);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="search-container" ref={searchRef}>
      <form className="search-form" onSubmit={handleSearch}>
        <div className={`search-input-wrapper ${isFocused ? 'focused' : ''}`}>
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search Reddit" 
            aria-label="Search Reddit"
            className="search-input"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => {
              setIsFocused(true);
              if (searchQuery) setShowSuggestions(true);
            }}
          />
          {searchQuery && (
            <button 
              type="button" 
              className="search-clear-btn"
              onClick={handleClear}
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </form>

      {/* Search Suggestions Dropdown */}
      {showSuggestions && searchQuery && (isFocused || hasSuggestions) && (
        <div className="search-suggestions">
          {hasSuggestions ? (
            <>
              {/* Communities */}
              {suggestions.communities.length > 0 && (
                <div className="suggestions-section">
                  <div className="suggestions-header">Communities</div>
                  {suggestions.communities.map(community => (
                    <Link
                      key={community._id || community.name}
                      to={`/r/${community.name}`}
                      className="suggestion-item"
                      onClick={() => {
                        setShowSuggestions(false);
                        setIsFocused(false);
                        setSearchQuery('');
                      }}
                    >
                      <img src={community.iconUrl} alt="" className="suggestion-icon" />
                      <div className="suggestion-info">
                        <div className="suggestion-name">r/{community.name}</div>
                        <div className="suggestion-meta">{community.members || community.memberCount} members</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              
              {/* Users */}
              {suggestions.users.length > 0 && (
                <div className="suggestions-section">
                  <div className="suggestions-header">Users</div>
                  {suggestions.users.map(user => (
                    <Link
                      key={user._id || user.username}
                      to={`/user/${user.username}`}
                      className="suggestion-item"
                      onClick={() => {
                        setShowSuggestions(false);
                        setIsFocused(false);
                        setSearchQuery('');
                      }}
                    >
                      <img src={user.avatar || getDefaultAvatar(user.username)} alt="" className="suggestion-icon" />
                      <div className="suggestion-info">
                        <div className="suggestion-name">{user.displayName || user.username}</div>
                        <div className="suggestion-meta">u/{user.username} · {user.karma} karma</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="no-suggestions">
              <Search size={20} />
              <span>Search for "{searchQuery}"</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const GuestMenu = ({ onLoginClick, isDarkMode, onToggleDarkMode }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="guest-menu-container" ref={menuRef}>
      <button 
        className="btn btn-icon btn-more"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        aria-label="More options"
      >
        <MoreHorizontal size={20} />
      </button>

      {isMenuOpen && (
        <div className="guest-menu-dropdown">
          <button 
            className="guest-menu-item"
            onClick={() => {
              onLoginClick();
              setIsMenuOpen(false);
            }}
          >
            <Smartphone size={20} />
            <span>Log In / Sign Up</span>
          </button>

          <div className="guest-menu-divider"></div>

          {/* Dark Mode Toggle */}
          <div className="guest-menu-item guest-menu-toggle">
            <div className="guest-menu-toggle-left">
              <Moon size={20} />
              <span>Dark Mode</span>
            </div>
            <button 
              className={`toggle-switch ${isDarkMode ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleDarkMode();
              }}
              aria-label={isDarkMode ? "Disable dark mode" : "Enable dark mode"}
            >
              <span className="toggle-slider"></span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Profile dropdown menu for logged-in users (Reddit-style)
const ProfileDropdown = ({ user, onLogout, isDarkMode, onToggleDarkMode }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="profile-dropdown-container" ref={menuRef}>
      <button 
        className="profile-avatar-btn"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        aria-label="User menu"
        aria-expanded={isMenuOpen}
      >
        <img 
          src={user.avatar || getDefaultAvatar(user.username)} 
          alt={user.username}
          className="profile-avatar"
        />
        <span className="profile-online-indicator"></span>
      </button>

      {isMenuOpen && (
        <div className="profile-dropdown">
          {/* View Profile */}
          <button 
            className="profile-dropdown-item profile-dropdown-header"
            onClick={() => {
              navigate(`/user/${user.username}`);
              setIsMenuOpen(false);
            }}
          >
            <img 
              src={user.avatar || getDefaultAvatar(user.username)} 
              alt={user.username}
              className="profile-dropdown-avatar"
            />
            <div className="profile-dropdown-info">
              <span className="profile-dropdown-label">View Profile</span>
              <span className="profile-dropdown-username">u/{user.username}</span>
            </div>
          </button>

          <div className="profile-dropdown-divider"></div>

          {/* Dark Mode Toggle */}
          <div className="profile-dropdown-item profile-dropdown-toggle">
            <div className="profile-dropdown-toggle-left">
              <Moon size={20} />
              <span>Dark Mode</span>
            </div>
            <button 
              className={`toggle-switch ${isDarkMode ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleDarkMode();
              }}
              aria-label={isDarkMode ? "Disable dark mode" : "Enable dark mode"}
            >
              <span className="toggle-slider"></span>
            </button>
          </div>

          <div className="profile-dropdown-divider"></div>

          {/* Log Out */}
          <button 
            className="profile-dropdown-item profile-dropdown-logout"
            onClick={() => {
              onLogout();
              setIsMenuOpen(false);
            }}
          >
            <LogOut size={20} />
            <span>Log Out</span>
          </button>
        </div>
      )}
    </div>
  );
};

const Header = ({ onLoginClick, isDarkMode, onToggleDarkMode }) => {
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const { currentUser, logout, loading } = useAuth();
  const { unreadCount: unreadMessages } = useChat();

  const handleCreatePostClick = () => {
    if (!currentUser) {
      onLoginClick();
    } else {
      setIsCreatePostOpen(true);
    }
  };

  return (
    <header className="header-container">
      {/* Left: Logo */}
      <div className="header-left">
        <Link to="/" className="logo-wrapper" style={{ textDecoration: 'none' }}>
          <LogoIcon />
        </Link>
      </div>

      {/* Center: Search Bar */}
      <div className="header-center">
        <SearchBar />
      </div>

      {/* Right: Actions */}
      <div className="header-right">
        {/* Desktop: Get App button - only show for guests */}
        {!currentUser && (
          <button className="btn btn-get-app desktop-only" aria-label="Get App">
            <Smartphone size={18} />
            Get App
          </button>
        )}

        {/* Create Post button - show for logged-in users on all screens, mobile only for guests */}
        <button 
          className={`btn btn-icon ${currentUser ? '' : 'mobile-only'}`}
          onClick={handleCreatePostClick}
          aria-label="Create Post"
          title="Create Post"
        >
          <Plus size={20} />
        </button>

        {currentUser && (
          <Link to="/chat" className="btn btn-icon btn-with-badge" aria-label="Messages" title="Messages">
            <MessageCircle size={20} />
            {unreadMessages > 0 && (
              <span className="badge">{unreadMessages > 99 ? '99+' : unreadMessages}</span>
            )}
          </Link>
        )}

        {currentUser && <NotificationsDropdown />}
        
        {loading ? (
          <div className="btn btn-secondary" style={{ opacity: 0.5, pointerEvents: 'none' }}>
            <User size={16} style={{ marginRight: '4px' }} />
            ...
          </div>
        ) : currentUser ? (
          /* Profile dropdown for logged-in users */
          <ProfileDropdown 
            user={currentUser}
            onLogout={logout}
            isDarkMode={isDarkMode}
            onToggleDarkMode={onToggleDarkMode}
          />
        ) : (
          <>
            {/* Desktop: Log In button */}
            <button className="btn btn-primary desktop-only" onClick={onLoginClick}>
              Log In
            </button>
            {/* Both: Three dots menu */}
            <GuestMenu 
              onLoginClick={onLoginClick} 
              isDarkMode={isDarkMode}
              onToggleDarkMode={onToggleDarkMode}
            />
          </>
        )}
      </div>

      {currentUser && (
        <CreatePostModal 
          isOpen={isCreatePostOpen}
          onClose={() => setIsCreatePostOpen(false)}
          onPostCreated={() => {
            setIsCreatePostOpen(false);
          }}
        />
      )}
    </header>
  );
};

export default Header;