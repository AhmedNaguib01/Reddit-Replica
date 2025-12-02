import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, ArrowLeft, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Sidebar from '../components/layout/Sidebar';
import { communitiesAPI } from '../services/api';
import '../styles/ManageCommunitiesPage.css';
import '../styles/CommunityPage.css';

const ManageCommunitiesPage = ({ onAuthAction, isSidebarCollapsed, onToggleSidebar }) => {
  const [communities, setCommunities] = useState([]);
  const [filteredCommunities, setFilteredCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [leavingId, setLeavingId] = useState(null);
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      onAuthAction();
      return;
    }

    const fetchCommunities = async () => {
      try {
        setLoading(true);
        const joined = await communitiesAPI.getJoined();
        setCommunities(joined);
        setFilteredCommunities(joined);
      } catch (error) {
        console.error('Error fetching communities:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCommunities();
  }, [currentUser, onAuthAction]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = communities.filter(c => 
        c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCommunities(filtered);
    } else {
      setFilteredCommunities(communities);
    }
  }, [searchQuery, communities]);

  const handleLeaveCommunity = async (e, communityId, communityName) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      setLeavingId(communityId);
      await communitiesAPI.join(communityId);
      setCommunities(prev => prev.filter(c => c.id !== communityId));
      setFilteredCommunities(prev => prev.filter(c => c.id !== communityId));
      showToast(`Left ${communityName}`, 'success');
    } catch (error) {
      console.error('Error leaving community:', error);
      showToast(`Failed to leave: ${error.message}`, 'error');
    } finally {
      setLeavingId(null);
    }
  };

  if (!currentUser) {
    return (
      <div className="page-layout">
        <Sidebar isCollapsed={isSidebarCollapsed} onToggle={onToggleSidebar} />
        <div className="page-content-wrapper">
          <div style={{ flex: 1, padding: '40px', textAlign: 'center' }}>
            <h2>Please log in to manage communities</h2>
            <button onClick={onAuthAction} className="btn-login">Log In</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-layout">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={onToggleSidebar} />
      
      <div className="page-content-wrapper">
        <div style={{ flex: 1, padding: '20px 24px', maxWidth: '1010px' }}>
          <button onClick={() => navigate(-1)} className="back-btn">
            <ArrowLeft size={16} /> Back
          </button>

          <div className="manage-communities-header">
            <Users size={28} />
            <h1>Manage Communities</h1>
            <span className="total-count">{communities.length} communities</span>
          </div>

          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search your communities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="loading-state">Loading your communities...</div>
          ) : communities.length === 0 ? (
            <div className="empty-state">
              <Users size={64} />
              <h2>No communities yet</h2>
              <p>You haven't joined any communities yet</p>
              <Link to="/communities" className="btn-browse">Browse Communities</Link>
            </div>
          ) : filteredCommunities.length === 0 ? (
            <div className="no-results">
              <p>No communities found matching "{searchQuery}"</p>
            </div>
          ) : (
            <div className="communities-grid">
              {filteredCommunities.map((community) => {
                const isCreator = currentUser && (
                  community.creator === currentUser.id || 
                  community.creatorId === currentUser.id ||
                  community.creatorUsername === currentUser.username
                );
                return (
                  <div key={community.id || community._id} className="community-card">
                    <Link to={`/r/${community.name || community.id}`} className="community-card-link">
                      <div 
                        className="community-banner" 
                        style={{ backgroundImage: `url(${community.bannerUrl})` }}
                      />
                      <div className="community-card-content">
                        <img 
                          src={community.iconUrl || `https://placehold.co/56/ff4500/white?text=${community.name?.charAt(0) || 'C'}`} 
                          alt={community.name} 
                          className="community-card-icon"
                        />
                        <h3 className="community-card-name">{community.name || `r/${community.id}`}</h3>
                        <p className="community-card-desc">{community.description || 'No description'}</p>
                        <span className="community-card-members">{community.members || community.memberCount || 0} members</span>
                        {community.creatorUsername && (
                          <span className="community-card-owner">by u/{community.creatorUsername}</span>
                        )}
                      </div>
                    </Link>
                    {isCreator ? (
                      <span className="btn-owner-badge">Owner</span>
                    ) : (
                      <button 
                        className="btn-leave-card"
                        onClick={(e) => handleLeaveCommunity(e, community.name || community.id, community.name || community.id)}
                        disabled={leavingId === community.id}
                      >
                        {leavingId === community.id ? '...' : 'Joined'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageCommunitiesPage;
