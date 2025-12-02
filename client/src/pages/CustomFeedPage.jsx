import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { LayoutGrid, Plus, Settings } from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import Post from '../components/post/Post';
import AddCommunitiesModal from '../components/feed/AddCommunitiesModal';
import EditCustomFeedModal from '../components/feed/EditCustomFeedModal';
import { customFeedsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSidebar } from '../context/SidebarContext';
import '../styles/CustomFeedPage.css';

const CustomFeedPage = ({ isSidebarCollapsed, onToggleSidebar }) => {
  const { feedId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const { updateCustomFeed, removeCustomFeed } = useSidebar();
  const [feed, setFeed] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    fetchFeedData();
  }, [feedId]);

  const fetchFeedData = async () => {
    try {
      setLoading(true);
      const [feedData, postsData] = await Promise.all([
        customFeedsAPI.getById(feedId),
        customFeedsAPI.getPosts(feedId)
      ]);
      setFeed(feedData);
      setPosts(postsData);
    } catch (error) {
      console.error('Error fetching feed:', error);
      showToast(error.message || 'Failed to load feed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCommunitiesUpdated = (updatedFeed) => {
    setFeed(updatedFeed);
    updateCustomFeed(updatedFeed);
    // Refresh posts
    customFeedsAPI.getPosts(feedId).then(setPosts).catch(console.error);
  };

  const handleFeedUpdated = (updatedFeed) => {
    if (updatedFeed === null) {
      // Feed was deleted
      removeCustomFeed(feedId);
      navigate('/');
    } else {
      setFeed(updatedFeed);
      updateCustomFeed(updatedFeed);
    }
  };

  if (loading) {
    return (
      <div className="custom-feed-page">
        <div className="custom-feed-layout">
          <Sidebar isCollapsed={isSidebarCollapsed} onToggle={onToggleSidebar} />
          <div className="custom-feed-content">
            <div className="loading-state">Loading feed...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!feed) {
    return (
      <div className="custom-feed-page">
        <div className="custom-feed-layout">
          <Sidebar isCollapsed={isSidebarCollapsed} onToggle={onToggleSidebar} />
          <div className="custom-feed-content">
            <div className="error-state">Feed not found</div>
          </div>
        </div>
      </div>
    );
  }

  const isOwner = currentUser && (feed.creator === currentUser.id || feed.creator?._id === currentUser.id || feed.creatorUsername === currentUser.username);

  return (
    <div className="custom-feed-page">
      <div className="custom-feed-layout">
        <Sidebar isCollapsed={isSidebarCollapsed} onToggle={onToggleSidebar} />
        
        <div className="custom-feed-content">
          {/* Feed Header */}
          <div className="feed-header">
            <div className="feed-icon">
              <LayoutGrid size={32} />
            </div>
            <div className="feed-info">
              <h1 className="feed-name">{feed.name}</h1>
              <p className="feed-creator">Created by {feed.creatorUsername}</p>
            </div>
            {isOwner && (
              <button 
                className="btn-edit-feed"
                onClick={() => setIsEditModalOpen(true)}
              >
                <Settings size={18} />
                Edit
              </button>
            )}
          </div>

          {feed.description && (
            <p className="feed-description">{feed.description}</p>
          )}

          {/* Communities in feed */}
          {feed.communities && feed.communities.length > 0 && (
            <div className="feed-communities">
              <h3>Communities ({feed.communities.length})</h3>
              <div className="communities-list">
                {feed.communities.map(community => (
                  <Link 
                    to={`/r/${community.name}`} 
                    key={community._id} 
                    className="feed-community-chip"
                  >
                    <img src={community.iconUrl} alt="" />
                    r/{community.name}
                  </Link>
                ))}
                {isOwner && (
                  <button 
                    className="add-community-chip"
                    onClick={() => setIsAddModalOpen(true)}
                  >
                    <Plus size={16} />
                    Add
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Empty state */}
          {(!feed.communities || feed.communities.length === 0) && (
            <div className="feed-empty-state">
              <h2>This feed doesn't have any communities yet</h2>
              <p>Add some and get this feed started</p>
              {isOwner && (
                <button 
                  className="btn-add-communities"
                  onClick={() => setIsAddModalOpen(true)}
                >
                  Add Communities
                </button>
              )}
            </div>
          )}

          {/* Posts */}
          {posts.length > 0 && (
            <div className="feed-posts">
              {posts.map(post => (
                <Post key={post._id || post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Communities Modal */}
      <AddCommunitiesModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        feed={feed}
        onCommunitiesUpdated={handleCommunitiesUpdated}
      />

      {/* Edit Feed Modal */}
      <EditCustomFeedModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        feed={feed}
        onFeedUpdated={handleFeedUpdated}
      />
    </div>
  );
};

export default CustomFeedPage;
