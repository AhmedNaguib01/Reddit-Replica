import { useState } from 'react';
import { 
  Home, TrendingUp, Compass, ChevronRight, ChevronLeft, 
  Clock, Plus, Settings, HelpCircle, Briefcase, FileText, Users, ChevronDown, ChevronUp, LayoutGrid, Star
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';
import CreateCommunityModal from '../community/CreateCommunityModal';
import CreateCustomFeedModal from '../feed/CreateCustomFeedModal';
import '../../styles/Sidebar.css';

const Sidebar = ({ isCollapsed, onToggle }) => {
  const { currentUser } = useAuth();
  const { 
    recentCommunities, 
    joinedCommunities, 
    customFeeds, 
    addCustomFeed, 
    addJoinedCommunity,
    toggleFeedFavorite 
  } = useSidebar();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateFeedModalOpen, setIsCreateFeedModalOpen] = useState(false);
  const [isFeedsExpanded, setIsFeedsExpanded] = useState(true);

  const handleCommunityCreated = (newCommunity) => {
    addJoinedCommunity(newCommunity);
  };

  const handleFeedCreated = (newFeed) => {
    addCustomFeed(newFeed);
  };

  const handleToggleFavorite = async (e, feedId) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFeedFavorite(feedId);
  };

  return (
    <aside className={`sidebar-container ${isCollapsed ? 'collapsed' : ''}`}>
      
      {/* Toggle Button */}
      <button 
        className="sidebar-toggle-btn" 
        onClick={onToggle}
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>

      <nav className="sidebar-nav">
        
        {/* Main Navigation */}
        <div className="sidebar-section">
          <Link to="/" className="sidebar-link" data-tooltip="Home">
            <Home size={20} className="sidebar-icon" />
            {!isCollapsed && <span className="sidebar-text">Home</span>}
          </Link>
          <Link to="/r/popular" className="sidebar-link" data-tooltip="Popular">
            <TrendingUp size={20} className="sidebar-icon" />
            {!isCollapsed && <span className="sidebar-text">Popular</span>}
          </Link>
          <Link to="/explore" className="sidebar-link" data-tooltip="Explore">
            <Compass size={20} className="sidebar-icon" />
            {!isCollapsed && <span className="sidebar-text">Explore</span>}
          </Link>
          
          {/* Start Community - Only for logged in users */}
          {currentUser && (
            <button 
              className="sidebar-link sidebar-btn" 
              data-tooltip="Start Community"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus size={20} className="sidebar-icon" />
              {!isCollapsed && <span className="sidebar-text">Start Community</span>}
            </button>
          )}
        </div>

        {!isCollapsed && <hr className="sidebar-divider" />}

        {/* Recent Section - Only show if user is logged in */}
        {!isCollapsed && currentUser && recentCommunities.length > 0 && (
          <>
            <div className="sidebar-section">
              <h3 className="sidebar-title">RECENT</h3>
              {recentCommunities.slice(0, 3).map((community) => (
                <Link 
                  to={`/r/${community.name || community.id}`} 
                  key={community._id || community.id || community.name} 
                  className="sidebar-link community-link"
                  data-tooltip={`r/${community.name}`}
                >
                  <Clock size={18} className="sidebar-icon" />
                  <span className="sidebar-text">r/{community.name}</span>
                </Link>
              ))}
            </div>
            <hr className="sidebar-divider" />
          </>
        )}

        {/* Communities Section - Only show if user is logged in */}
        {!isCollapsed && currentUser && (
          <>
            <div className="sidebar-section">
              <h3 className="sidebar-title">COMMUNITIES</h3>
              
              {/* Manage Communities - Only for logged in users */}
              <Link to="/manage-communities" className="sidebar-link">
                <Settings size={18} className="sidebar-icon" />
                <span className="sidebar-text">Manage Communities</span>
                {joinedCommunities.length > 0 && (
                  <span className="sidebar-badge">{joinedCommunities.length}</span>
                )}
              </Link>
              
              {/* All Communities Link */}
              <Link to="/communities" className="sidebar-link">
                <Users size={18} className="sidebar-icon" />
                <span className="sidebar-text">Communities</span>
              </Link>
            </div>
            <hr className="sidebar-divider" />
          </>
        )}

        {/* Custom Feeds Section - Only show if user is logged in */}
        {!isCollapsed && currentUser && (
          <>
            <div className="sidebar-section">
              <button 
                className="sidebar-section-header"
                onClick={() => setIsFeedsExpanded(!isFeedsExpanded)}
              >
                <h3 className="sidebar-title">CUSTOM FEEDS</h3>
                {isFeedsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              
              {isFeedsExpanded && (
                <>
                  <button 
                    className="sidebar-link sidebar-btn"
                    onClick={() => setIsCreateFeedModalOpen(true)}
                  >
                    <Plus size={18} className="sidebar-icon" />
                    <span className="sidebar-text">Create Custom Feed</span>
                  </button>
                  
                  {customFeeds.map((feed) => (
                    <Link 
                      to={`/feed/${feed._id}`} 
                      key={feed._id} 
                      className="sidebar-link feed-link"
                    >
                      <div className="feed-icon-small">
                        <LayoutGrid size={14} />
                      </div>
                      <span className="sidebar-text">{feed.name}</span>
                      <button 
                        className={`favorite-btn ${feed.isFavorite ? 'active' : ''}`}
                        onClick={(e) => handleToggleFavorite(e, feed._id)}
                      >
                        <Star size={14} fill={feed.isFavorite ? 'currentColor' : 'none'} />
                      </button>
                    </Link>
                  ))}
                </>
              )}
            </div>
            <hr className="sidebar-divider" />
          </>
        )}

        {/* Resources Section */}
        {!isCollapsed && (
          <>
            <div className="sidebar-section">
              <h3 className="sidebar-title">RESOURCES</h3>
              <Link to="/about" className="sidebar-link">
                <FileText size={18} className="sidebar-icon" />
                <span className="sidebar-text">About Reddit</span>
              </Link>
              <Link to="/help" className="sidebar-link">
                <HelpCircle size={18} className="sidebar-icon" />
                <span className="sidebar-text">Help</span>
              </Link>
              <Link to="/blog" className="sidebar-link">
                <FileText size={18} className="sidebar-icon" />
                <span className="sidebar-text">Blog</span>
              </Link>
              <Link to="/careers" className="sidebar-link">
                <Briefcase size={18} className="sidebar-icon" />
                <span className="sidebar-text">Careers</span>
              </Link>
            </div>
            <hr className="sidebar-divider" />
          </>
        )}

        {/* Footer */}
        {!isCollapsed && (
          <div className="sidebar-footer">
            <p>Reddit, Inc. © 2025. All rights reserved.</p>
          </div>
        )}

      </nav>

      {/* Create Community Modal */}
      <CreateCommunityModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCommunityCreated={handleCommunityCreated}
      />

      {/* Create Custom Feed Modal */}
      <CreateCustomFeedModal
        isOpen={isCreateFeedModalOpen}
        onClose={() => setIsCreateFeedModalOpen(false)}
        onFeedCreated={handleFeedCreated}
      />
    </aside>
  );
};

export default Sidebar;
