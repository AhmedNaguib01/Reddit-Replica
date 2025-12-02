import { Link, useNavigate } from 'react-router-dom';
import { Moon, Sun, Search, X, Plus, LogOut, User, MoreHorizontal, Smartphone, QrCode, MessageCircle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { communitiesAPI, usersAPI } from '../../services/api';
import NotificationsDropdown from './NotificationsDropdown';
import CreatePostModal from '../post/CreatePostModal';
import '../../styles/Header.css';

const LogoIcon = () => <span className="logo-text">reddit</span>;

const SearchBar = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [communities, setCommunities] = useState([]);
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();
  const searchRef = useRef(null);

  // Fetch communities for search suggestions
  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        const data = await communitiesAPI.getAll();
        setCommunities(data);
      } catch (error) {
        console.error('Error fetching communities:', error);
      }
    };
    fetchCommunities();
  }, []);

  // Search users when query changes
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        setUsers([]);
        return;
      }
      try {
        const data = await usersAPI.search(searchQuery);
        setUsers(data);
      } catch (error) {
        console.error('Error searching users:', error);
        setUsers([]);
      }
    };
    
    const debounce = setTimeout(searchUsers, 300);
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
    <>
      <button className="btn btn-get-app">
        <QrCode size={18} />
        Get App
      </button>
      
      <button className="btn btn-primary" onClick={onLoginClick}>
        Log In
      </button>

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
    </>
  );
};

const Header = ({ onLoginClick, isDarkMode, onToggleDarkMode }) => {
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const { currentUser, logout, loading } = useAuth();

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
        <button 
          className="btn btn-icon" 
          onClick={handleCreatePostClick}
          aria-label="Create Post"
          title="Create Post"
        >
          <Plus size={20} />
        </button>

        {currentUser && (
          <Link to="/chat" className="btn btn-icon" aria-label="Messages" title="Messages">
            <MessageCircle size={20} />
          </Link>
        )}

        {currentUser && <NotificationsDropdown />}

        <button 
          className="btn btn-icon" 
          onClick={onToggleDarkMode}
          aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          title={isDarkMode ? "Light mode" : "Dark mode"}
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        
        {loading ? (
          <div className="btn btn-secondary" style={{ opacity: 0.5, pointerEvents: 'none' }}>
            <User size={16} style={{ marginRight: '4px' }} />
            ...
          </div>
        ) : currentUser ? (
          <>
            <Link to={`/user/${currentUser.username}`} className="btn btn-secondary" style={{ textDecoration: 'none' }}>
              <User size={16} style={{ marginRight: '4px' }} />
              {currentUser.username}
            </Link>
            <button className="btn btn-icon" onClick={logout} aria-label="Logout" title="Logout">
              <LogOut size={20} />
            </button>
          </>
        ) : (
          <GuestMenu onLoginClick={onLoginClick} />
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