import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, ArrowLeft, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Sidebar from '../components/layout/Sidebar';
import { communitiesAPI } from '../services/api';
import '../styles/AllCommunitiesPage.css';
import '../styles/CommunityPage.css';

const AllCommunitiesPage = ({ onAuthAction, isSidebarCollapsed, onToggleSidebar }) => {
  const [communities, setCommunities] = useState([]);
  const [filteredCommunities, setFilteredCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [joiningId, setJoiningId] = useState(null);
  const [joinedIds, setJoinedIds] = useState(new Set());
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const allCommunities = await communitiesAPI.getAll();
        setCommunities(allCommunities);
        setFilteredCommunities(allCommunities);

        if (currentUser) {
          const joined = await communitiesAPI.getJoined();
          setJoinedIds(new Set(joined.map(c => c.id)));
        }
      } catch (error) {
        console.error('Error fetching communities:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

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

  const handleJoinToggle = async (e, communityId, communityName) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!currentUser) {
      onAuthAction();
      return;
    }

    try {
      setJoiningId(communityId);
      const result = await communitiesAPI.join(communityId);
      
      if (result.joined) {
        setJoinedIds(prev => new Set([...prev, communityId]));
        showToast(`Joined r/${communityName}! 🎉`, 'success');
      } else {
        setJoinedIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(communityId);
          return newSet;
        });
        showToast(`Left r/${communityName}`, 'success');
      }
    } catch (error) {
      console.error('Error joining community:', error);
      showToast(`Failed: ${error.message}`, 'error');
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <div className="page-layout">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={onToggleSidebar} />
      
      <div className="page-content-wrapper">
        <div style={{ flex: 1, padding: '20px 24px', maxWidth: '1010px' }}>
          <button onClick={() => navigate(-1)} className="back-btn">
            <ArrowLeft size={16} /> Back
          </button>

          <div className="all-communities-header">
            <Users size={28} />
            <h1>All Communities</h1>
            <span className="total-count">{communities.length} communities</span>
          </div>

          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search communities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="loading-state">Loading communities...</div>
          ) : filteredCommunities.length === 0 ? (
            <div className="no-results">
              <p>No communities found matching "{searchQuery}"</p>
            </div>
          ) : (
            <div className="communities-grid">
              {filteredCommunities.map((community) => (
                <div key={community.id} className="community-card">
                  <Link to={`/r/${community.id}`} className="community-card-link">
                    <div 
                      className="community-banner" 
                      style={{ backgroundImage: `url(${community.bannerUrl})` }}
                    />
                    <div className="community-card-content">
                      <img 
                        src={community.iconUrl} 
                        alt={community.name} 
                        className="community-card-icon"
                      />
                      <h3 className="community-card-name">{community.name}</h3>
                      <p className="community-card-desc">{community.description}</p>
                      <span className="community-card-members">{community.members} members</span>
                      {community.creatorUsername && (
                        <span className="community-card-owner">by u/{community.creatorUsername}</span>
                      )}
                    </div>
                  </Link>
                  <button 
                    className={`btn-join-card ${joinedIds.has(community.id) ? 'joined' : ''}`}
                    onClick={(e) => handleJoinToggle(e, community.id, community.name)}
                    disabled={joiningId === community.id}
                  >
                    {joiningId === community.id ? '...' : joinedIds.has(community.id) ? 'Joined' : 'Join'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AllCommunitiesPage;
