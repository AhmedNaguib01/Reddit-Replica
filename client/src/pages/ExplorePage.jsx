import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import { communitiesAPI } from '../services/api';
import '../styles/ExplorePage.css';

const communityCategories = ['All', 'Entertainment', 'Gaming', 'News', 'Sports', 'Technology', 'Q&As & Stories', 'Art & Design', 'Music', 'Science', 'Education', 'Lifestyle', 'Other'];

const ExplorePage = ({ isSidebarCollapsed, onToggleSidebar }) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        setLoading(true);
        const data = await communitiesAPI.getAll();
        setCommunities(data);
      } catch (error) {
        console.error('Error fetching communities:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCommunities();
  }, []);

  const filteredCommunities = selectedCategory === 'All' 
    ? communities 
    : communities.filter(c => c.category === selectedCategory);

  return (
    <div style={{ display: 'flex', backgroundColor: 'var(--color-bg-page)', minHeight: '100vh' }}>
      <div style={{ display: 'flex', width: '100%', maxWidth: '1280px', margin: '0 auto' }}>
        <Sidebar isCollapsed={isSidebarCollapsed} onToggle={onToggleSidebar} />
        
        <div style={{ flex: 1, padding: '20px 24px' }}>
          <h1 className="explore-title">Explore Communities</h1>
          
          {/* Category Filters */}
          <div className="category-filters">
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
                      <img src={community.iconUrl} alt={community.displayName || community.name} className="community-card-icon" />
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
