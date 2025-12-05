import { Link, useNavigate } from 'react-router-dom';
import { Moon, Sun, Search, X, Plus, LogOut, User, MoreHorizontal, Smartphone, MessageCircle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { communitiesAPI, usersAPI } from '../../services/api';
import NotificationsDropdown from './NotificationsDropdown';
import CreatePostModal from '../post/CreatePostModal';
import '../../styles/Header.css';

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
const SEARCH_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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
                      <img src={user.avatar} alt="" className="suggestion-icon" />
                      <div className="suggestion-info">
                        <div className="suggestion-name">u/{user.username}</div>
                        <div className="suggestion-meta">{user.karma} karma</div>
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

const GuestMenu = ({ onLoginClick }) => {
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
        </div>
      )}
    </div>
  );
};

// Mobile user menu for logged-in users
const UserMenu = ({ username, onLogout }) => {
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
    <div className="user-menu-container" ref={menuRef}>
      <button 
        className="btn btn-icon btn-more"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        aria-label="User menu"
      >
        <MoreHorizontal size={20} />
      </button>

      {isMenuOpen && (
        <div className="user-menu-dropdown">
          <button 
            className="user-menu-item"
            onClick={() => {
              navigate(`/user/${username}`);
              setIsMenuOpen(false);
            }}
          >
            <User size={20} />
            <span>My Profile</span>
          </button>
          <button 
            className="user-menu-item user-menu-item-danger"
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
        {/* Dark/Light mode toggle */}
        <button 
          className="btn btn-icon" 
          onClick={onToggleDarkMode}
          aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          title={isDarkMode ? "Light mode" : "Dark mode"}
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Desktop: Get App button */}
        <button className="btn btn-get-app desktop-only" aria-label="Get App">
          <Smartphone size={18} />
          Get App
        </button>

        {/* Mobile only: Create Post button */}
        <button 
          className="btn btn-icon mobile-only" 
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
          <>
            {/* Desktop: Show username and logout button */}
            <Link to={`/user/${currentUser.username}`} className="btn btn-secondary desktop-only" style={{ textDecoration: 'none' }}>
              <User size={16} style={{ marginRight: '4px' }} />
              {currentUser.username}
            </Link>
            <button className="btn btn-icon desktop-only" onClick={logout} aria-label="Logout" title="Logout">
              <LogOut size={20} />
            </button>
            {/* Mobile: Show dropdown menu */}
            <div className="mobile-only">
              <UserMenu username={currentUser.username} onLogout={logout} />
            </div>
          </>
        ) : (
          <>
            {/* Desktop: Log In button */}
            <button className="btn btn-primary desktop-only" onClick={onLoginClick}>
              Log In
            </button>
            {/* Both: Three dots menu */}
            <GuestMenu onLoginClick={onLoginClick} />
          </>
        )}
      </div>

      {currentUser && (
        <CreatePostModal 
          isOpen={isCreatePostOpen}
          onClose={() => setIsCreatePostOpen(false)}
          onPostCreated={() => {
            setIsCreatePostOpen(false);
            window.location.reload();
          }}
        />
      )}
    </header>
  );
};

export default Header;