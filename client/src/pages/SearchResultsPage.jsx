import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Post from '../components/post/Post';
import { postsAPI, communitiesAPI, usersAPI } from '../services/api';
import '../styles/SearchResultsPage.css';
import '../styles/CommunityPage.css';

const SearchResultsPage = ({ onAuthAction, isSidebarCollapsed, onToggleSidebar }) => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [posts, setPosts] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      if (!query.trim()) {
        setPosts([]);
        setCommunities([]);
        setUsers([]);
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        // Use search endpoint for posts - server-side filtering is more efficient
        const [postsData, communitiesData, usersData] = await Promise.all([
          postsAPI.search(query),
          communitiesAPI.getAll(),
          usersAPI.search(query)
        ]);
        
        if (isMounted) {
          setPosts(postsData);
          setCommunities(communitiesData);
          setUsers(usersData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    fetchData();
    
    return () => {
      isMounted = false;
    };
  }, [query]);

  // Posts are already filtered server-side
  const matchingPosts = posts;

  // Search in communities
  const matchingCommunities = communities.filter(community =>
    community.name?.toLowerCase().includes(query.toLowerCase()) ||
    community.title?.toLowerCase().includes(query.toLowerCase()) ||
    community.description?.toLowerCase().includes(query.toLowerCase())
  );

  const totalResults = matchingPosts.length + matchingCommunities.length + users.length;

  if (loading) {
    return (
      <div className="page-layout">
        <Sidebar isCollapsed={isSidebarCollapsed} onToggle={onToggleSidebar} />
        <div className="page-content-wrapper">
          <div style={{ flex: 1, padding: '20px 24px', textAlign: 'center' }}>
            Loading...
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
          <div className="search-header">
            <h1 className="search-title">Search results for "{query}"</h1>
            <p className="search-count">{totalResults} results found</p>
          </div>

          {totalResults === 0 && (
            <div className="no-results">
              <h2>No results found</h2>
              <p>Try different keywords or check your spelling</p>
            </div>
          )}

          {/* Users Results */}
          {users.length > 0 && (
            <div className="search-section">
              <h2 className="section-title">Users ({users.length})</h2>
              <div className="communities-results">
                {users.map(user => (
                  <Link to={`/user/${user.username}`} key={user._id || user.username} className="community-result">
                    <img src={user.avatar} alt={user.username} className="community-result-icon" />
                    <div className="community-result-info">
                      <h3>u/{user.username}</h3>
                      <p>{user.bio || 'No bio'}</p>
                      <span className="community-members">{user.karma} karma</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Communities Results */}
          {matchingCommunities.length > 0 && (
            <div className="search-section">
              <h2 className="section-title">Communities ({matchingCommunities.length})</h2>
              <div className="communities-results">
                {matchingCommunities.map(community => (
                  <Link to={`/r/${community.name}`} key={community._id || community.name} className="community-result">
                    <img src={community.iconUrl} alt={community.displayName || community.name} className="community-result-icon" />
                    <div className="community-result-info">
                      <h3>r/{community.name}</h3>
                      <p>{community.description}</p>
                      <span className="community-members">{community.members || community.memberCount} members</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Posts Results */}
          {matchingPosts.length > 0 && (
            <div className="search-section">
              <h2 className="section-title">Posts ({matchingPosts.length})</h2>
              <div className="posts-results">
                {matchingPosts.map(post => {
                  const community = communities.find(c => 
                    c.name === post.subreddit || 
                    c.name === post.communityName
                  );
                  const postWithIcon = {
                    ...post,
                    subredditIcon: community ? community.iconUrl : 'https://placehold.co/20/grey/white?text=r/'
                  };
                  return (
                    <Post key={post._id || post.id} post={postWithIcon} onAuthRequired={onAuthAction} />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchResultsPage;
