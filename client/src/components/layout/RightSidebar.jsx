import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { communitiesAPI } from '../../services/api';
import '../../styles/RightSidebar.css';

const RightSidebar = ({ communityData, onCreatePost }) => {
  const [showAll, setShowAll] = useState(false);
  const [communities, setCommunities] = useState([]);
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        const data = await communitiesAPI.getAll();
        setCommunities(data);
      } catch (error) {
        console.error('Error fetching communities:', error);
      }
    };
    if (!communityData) {
      fetchCommunities();
    }
  }, [communityData]);
  
  // Sort communities by member count
  const parseMembers = (memberStr) => {
    if (!memberStr) return 0;
    const num = parseFloat(memberStr);
    if (String(memberStr).includes('M')) return num * 1000000;
    if (String(memberStr).includes('k')) return num * 1000;
    return num;
  };

  const sortedCommunities = [...communities].sort((a, b) => 
    parseMembers(b.members || b.memberCount) - parseMembers(a.members || a.memberCount)
  );

  const displayedCommunities = showAll ? sortedCommunities : sortedCommunities.slice(0, 5);
  
  // CASE 1: Community Page (About Widget)
  if (communityData) {
    return (
      <aside className="right-sidebar">
        <div className="widget-container">
          <div className="widget-header" style={{ backgroundColor: '#0079d3', color: 'white' }}>
            <h3 style={{ color: 'white' }}>About Community</h3>
          </div>
          <div style={{ padding: '12px', fontSize: '14px', lineHeight: '1.5' }}>
            
            <div style={{ marginBottom: '12px' }}>
               {communityData.description}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', color: '#7c7c7c', marginBottom: '12px' }}>
               <span style={{ marginRight: '8px' }}>🎂</span>
               Created {communityData.created}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '16px 0' }} />
            
            <div style={{ display: 'flex', gap: '24px' }}>
              <div>
                 <div style={{ fontWeight: '700', fontSize: '16px' }}>{communityData.members}</div>
                 <div style={{ fontSize: '12px', color: '#7c7c7c' }}>Members</div>
              </div>
              <div>
                 <div style={{ fontWeight: '700', fontSize: '16px', display: 'flex', alignItems: 'center' }}>
                    <span style={{ width: '8px', height: '8px', backgroundColor: '#46d160', borderRadius: '50%', marginRight: '4px' }}></span>
                    {communityData.online}
                 </div>
                 <div style={{ fontSize: '12px', color: '#7c7c7c' }}>Online</div>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '16px 0' }} />

            {communityData.creatorUsername && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: '#7c7c7c', marginBottom: '4px' }}>Created by</div>
                <Link 
                  to={`/user/${communityData.creatorUsername}`} 
                  style={{ 
                    color: 'var(--color-blue)', 
                    textDecoration: 'none', 
                    fontWeight: '500',
                    fontSize: '14px'
                  }}
                >
                  u/{communityData.creatorUsername}
                </Link>
              </div>
            )}

            <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '16px 0' }} />

            {/* Hide Create Post button - use header Plus button instead */}
          </div>
        </div>
        
        <div className="right-sidebar-footer">
           <p>r/{communityData.title} Rules</p>
        </div>
      </aside>
    );
  }

  // CASE 2: Home Page (Popular Communities Widget)
  return (
    <aside className="right-sidebar">
      {/* Only show Popular Communities for logged-out users */}
      {!currentUser && (
        <div className="widget-container">
          <div className="widget-header">
            <h3>POPULAR COMMUNITIES</h3>
          </div>
          <ul className="community-list">
            {displayedCommunities.map((community, index) => (
              <li key={community._id || community.id || community.name} className="community-item">
                <div className="community-rank">{index + 1}</div>
                <img src={community.iconUrl} alt="" className="community-icon" />
                <div className="community-info">
                  <Link to={`/r/${community.name}`} className="community-name">
                    r/{community.name}
                  </Link>
                  <span className="community-members">{community.members || community.memberCount} members</span>
                </div>
              </li>
            ))}
          </ul>
          <button 
            className="btn-see-more" 
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? 'Show less' : 'See more'}
          </button>
        </div>
      )}
      
      <div className={`right-sidebar-footer${currentUser ? ' sticky' : ''}`}>
        <div className="footer-links">
          <Link to="/rules" className="footer-link">Reddit Rules</Link>
          <Link to="/privacy" className="footer-link">Privacy Policy</Link>
          <Link to="/user-agreement" className="footer-link">User Agreement</Link>
        </div>
        <p className="copyright">Reddit, Inc. © 2025. All rights reserved.</p>
      </div>
    </aside>
  );
};

export default RightSidebar;