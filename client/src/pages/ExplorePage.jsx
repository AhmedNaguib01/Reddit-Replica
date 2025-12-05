import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import { communitiesAPI } from '../services/api';
import '../styles/ExplorePage.css';
import '../styles/CommunityPage.css';

const communityCategories = ['All', 'Entertainment', 'Gaming', 'News', 'Sports', 'Technology', 'Q&As & Stories', 'Art & Design', 'Music', 'Science', 'Education', 'Lifestyle', 'Other'];

const ExplorePage = ({ isSidebarCollapsed, onToggleSidebar }) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    const fetchCommunities = async () => {
      try {
        setLoading(true);
        const data = await communitiesAPI.getAll();
        if (isMounted) {
          setCommunities(data);
        }
      } catch (error) {
        console.error('Error fetching communities:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    fetchCommunities();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredCommunities = selectedCategory === 'All' 
    ? communities 
    : communities.filter(c => c.category === selectedCategory);

  return (
    <div className="page-layout">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={onToggleSidebar} />
      
      <div className="page-content-wrapper">
        <div style={{ flex: 1, padding: '20px 24px', maxWidth: '1010px' }}>
          <h1 className="explore-title">Explore Communities</h1>
          
          {/* Category Filters - Desktop */}
          <div className="category-filters desktop-filters">
            {communityCategories.map((category) => (
              <button
                key={category}
                className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Category Dropdown - Mobile */}
          <div className="category-dropdown-container mobile-dropdown" ref={dropdownRef}>
            <button 
              className="category-dropdown-trigger"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <span>{selectedCategory}</span>
              <ChevronDown size={18} className={isDropdownOpen ? 'rotated' : ''} />
            </button>
            {isDropdownOpen && (
              <div className="category-dropdown-menu">
                {communityCategories.map((category) => (
                  <button
                    key={category}
                    className={`category-dropdown-item ${selectedCategory === category ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedCategory(category);
                      setIsDropdownOpen(false);
                    }}
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}
          </div>

          {loading ? (
            <div className="loading-state">Loading communities...</div>
          ) : (
            <>
              {/* Communities Grid */}
              <div className="communities-grid">
                {filteredCommunities.map((community) => (
                  <Link 
                    to={`/r/${community.name}`} 
                    key={community._id || community.name} 
                    className="community-card"
                  >
                    <div className="community-card-banner" style={{ backgroundImage: `url(${community.bannerUrl})` }} />
                    <div className="community-card-content">
                      <img src={community.iconUrl} alt={community.displayName || community.name} className="community-card-icon" loading="lazy" />
                      <h3 className="community-card-name">r/{community.name}</h3>
                      <p className="community-card-description">{community.description}</p>
                      <div className="community-card-stats">
                        <span className="community-stat">{community.members || community.memberCount} members</span>
                        <span className="community-stat-dot">•</span>
                        <span className="community-stat">{community.online || '1'} online</span>
                      </div>
                      {community.category && <span className="community-category-tag">{community.category}</span>}
                    </div>
                  </Link>
                ))}
              </div>

              {filteredCommunities.length === 0 && (
                <div className="no-communities">
                  <p>No communities found in this category</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExplorePage;
