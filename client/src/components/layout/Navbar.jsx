import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import { Search, User, LogOut, Plus } from 'lucide-react'; // Import icons
import '../../styles/components.css';

export const Navbar = ({ setPage, allCommunities, handleSearch }) => {
  const { currentUser, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const onSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    handleSearch(searchQuery);
  };

  return (
    <nav className="navbar">
      <div className="navbar__inner">
        {/* Logo */}
        <a 
          href="#"
          onClick={(e) => { e.preventDefault(); setPage({ name: 'home' }); }}
          className="navbar__brand"
        >
          <div className="navbar__logo">R</div>
          <span className="navbar__title">reddit</span>
        </a>

        {/* Search - Requirement #10 */}
        <form className="navbar__search" onSubmit={onSearchSubmit}>
          <div className="navbar__searchInner">
            <div className="navbar__searchIcon"><Search /></div>
            <input 
              type="text"
              placeholder="Search Reddit"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="navbar__searchInput"
            />
          </div>
        </form>

        {/* Actions */}
        <div className="navbar__actions">
          {currentUser ? (
            <>
              <Button 
                variant="outline" 
                className="navbar__createBtn"
                onClick={() => setPage({ name: 'create-post' })}
              >
                <Plus />
                Create Post
              </Button>
              {/* Profile Menu */}
              <div className="navbar__profile">
                <button 
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="navbar__profileBtn"
                >
                  <User />
                </button>
                {/* Profile Dropdown */}
                {isProfileMenuOpen && (
                  <div className="navbar__dropdown">
                    <div className="navbar__dropdownInner">
                      <span className="navbar__greeting">Hello, <span className="navbar__username">{currentUser.username}</span></span>
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setPage({ name: 'profile', id: currentUser.id });
                          setIsProfileMenuOpen(false);
                        }}
                        className="navbar__dropdownItem"
                      >
                        <User />
                        My Profile
                      </a>
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setPage({ name: 'create-community' });
                          setIsProfileMenuOpen(false);
                        }}
                        className="navbar__dropdownItem"
                      >
                        <Plus />
                        Create Community
                      </a>
                      <hr className="navbar__divider" />
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          logout();
                          setIsProfileMenuOpen(false);
                          setPage({ name: 'home' });
                        }}
                        className="navbar__dropdownItem"
                      >
                        <LogOut />
                        Log Out
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Button 
                variant="outline"
                onClick={() => setPage({ name: 'login', register: false })}
              >
                Log In
              </Button>
              <Button 
                variant="primary"
                onClick={() => setPage({ name: 'login', register: true })}
              >
                Sign Up
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};