import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/layout/Sidebar';
import Post from '../components/post/Post';
import { PostListSkeleton } from '../components/common/LoadingSkeleton';
import { postsAPI, communitiesAPI } from '../services/api';
import { Bookmark } from 'lucide-react';
import '../styles/SavedPostsPage.css';
import '../styles/CommunityPage.css';

const SavedPostsPage = ({ onAuthAction, isSidebarCollapsed, onToggleSidebar }) => {
  const [savedPosts, setSavedPosts] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        const [posts, communitiesData] = await Promise.all([
          postsAPI.getSaved(),
          communitiesAPI.getAll()
        ]);
        setSavedPosts(posts);
        setCommunities(communitiesData);
      } catch (error) {
        console.error('Error fetching saved posts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="page-layout">
        <Sidebar isCollapsed={isSidebarCollapsed} onToggle={onToggleSidebar} />
        <div className="page-content-wrapper">
          <div style={{ flex: 1, padding: '20px 24px', textAlign: 'center' }}>
            <h2>Please log in to view saved posts</h2>
            <button onClick={onAuthAction} className="btn-browse">Log In</button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-layout">
        <Sidebar isCollapsed={isSidebarCollapsed} onToggle={onToggleSidebar} />
        <div className="page-content-wrapper">
          <div style={{ flex: 1, padding: '20px 24px' }}>
            <div className="saved-header">
              <div className="saved-title-section">
                <Bookmark size={28} />
                <h1>Saved Posts</h1>
              </div>
            </div>
            <PostListSkeleton count={4} />
          </div>
        </div>
      </div>
    );
  }

  const postsWithIcons = savedPosts.map(post => {
    const community = communities.find(c => c.name === `r/${post.subreddit}`);
    return {
      ...post,
      subredditIcon: community ? community.iconUrl : 'https://placehold.co/20/grey/white?text=r/',
      votes: post.voteCount || post.votes,
      comments: post.commentCount || post.comments,
    };
  });

  return (
    <div className="page-layout">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={onToggleSidebar} />
      
      <div className="page-content-wrapper">
        <div style={{ flex: 1, padding: '20px 24px', maxWidth: '1010px' }}>
          <div className="saved-header">
            <div className="saved-title-section">
              <Bookmark size={28} />
              <h1>Saved Posts</h1>
            </div>
            <p className="saved-count">{savedPosts.length} saved posts</p>
          </div>

          {savedPosts.length === 0 ? (
            <div className="no-saved-posts">
              <Bookmark size={64} />
              <h2>No saved posts yet</h2>
              <p>Posts you save will appear here</p>
              <Link to="/" className="btn-browse">
                Browse Posts
              </Link>
            </div>
          ) : (
            <div className="saved-posts-list">
              {postsWithIcons.map(post => (
                <Post key={post.id} post={post} onAuthRequired={onAuthAction} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SavedPostsPage;
