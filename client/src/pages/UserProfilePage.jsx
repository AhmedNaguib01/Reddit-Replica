import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Sidebar from '../components/layout/Sidebar';
import { UserProfileSkeleton, PostListSkeleton } from '../components/common/LoadingSkeleton';
import EditProfileModal from '../components/user/EditProfileModal';
import { postsAPI, usersAPI, commentsAPI, customFeedsAPI } from '../services/api';
import { MessageSquare, Cake, Award, Bookmark, Settings, LayoutGrid } from 'lucide-react';
import '../styles/UserProfilePage.css';

const UserProfilePage = ({ onAuthAction, isSidebarCollapsed, onToggleSidebar }) => {
  const { username } = useParams();
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [user, setUser] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [userComments, setUserComments] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [savedPosts, setSavedPosts] = useState([]);
  const [customFeeds, setCustomFeeds] = useState([]);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const isOwnProfile = currentUser && currentUser.username === username;

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const [userData, allPosts, userCommentsData, followersData, followingData] = await Promise.all([
          usersAPI.getByUsername(username),
          postsAPI.getAll(),
          commentsAPI.getByUser(username),
          usersAPI.getFollowers(username),
          usersAPI.getFollowing(username)
        ]);
        
        setUser(userData);
        // Filter posts by this user
        const posts = allPosts.filter(p => p.author === username);
        setUserPosts(posts);
        setUserComments(userCommentsData);
        setFollowers(followersData);
        setFollowingList(followingData);
        
        // Check if current user is following this user
        if (currentUser && currentUser.username !== username) {
          try {
            const isFollowingResult = await usersAPI.isFollowing(username);
            setFollowing(isFollowingResult.following);
          } catch (err) {
            console.error('Error checking follow status:', err);
          }
        }
        
        // Fetch saved posts if viewing own profile
        if (currentUser && currentUser.username === username) {
          try {
            const saved = await postsAPI.getSaved();
            setSavedPosts(saved);
          } catch (err) {
            console.error('Error fetching saved posts:', err);
          }
        }

        // Fetch custom feeds for this user's profile
        try {
          const feeds = await customFeedsAPI.getByUsername(username);
          setCustomFeeds(feeds);
        } catch (err) {
          console.error('Error fetching custom feeds:', err);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [username, currentUser]);

  const handleFollow = async () => {
    if (!currentUser) {
      onAuthAction();
      return;
    }

    // Optimistic update - update UI immediately
    const wasFollowing = following;
    const newFollowing = !wasFollowing;
    setFollowing(newFollowing);
    setUser(prev => ({
      ...prev,
      followerCount: newFollowing 
        ? (prev.followerCount || 0) + 1 
        : Math.max((prev.followerCount || 0) - 1, 0)
    }));

    try {
      await usersAPI.follow(username);
      // Refresh followers list in background (don't update following state again)
      usersAPI.getFollowers(username).then(setFollowers).catch(() => {});
      // Show toast
      showToast(
        newFollowing ? `You're now following u/${username}! 🎉` : `Unfollowed u/${username}`,
        'success'
      );
    } catch (error) {
      // Revert on error
      setFollowing(wasFollowing);
      setUser(prev => ({
        ...prev,
        followerCount: wasFollowing 
          ? (prev.followerCount || 0) + 1 
          : Math.max((prev.followerCount || 0) - 1, 0)
      }));
      console.error('Error following user:', error);
      showToast(`Failed to follow: ${error.message}`, 'error');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', backgroundColor: 'var(--color-bg-page)', minHeight: '100vh' }}>
        <div style={{ display: 'flex', width: '100%', maxWidth: '1280px', margin: '0 auto' }}>
          <Sidebar isCollapsed={isSidebarCollapsed} onToggle={onToggleSidebar} />
          <div style={{ flex: 1, padding: '20px 24px' }}>
            <UserProfileSkeleton />
            <div className="skeleton" style={{ height: '48px', marginBottom: '16px', borderRadius: '8px' }} />
            <PostListSkeleton count={3} />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>User not found</h2>
        <p>u/{username} doesn't exist</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', backgroundColor: 'var(--color-bg-page)', minHeight: '100vh' }}>
      <div style={{ display: 'flex', width: '100%', maxWidth: '1280px', margin: '0 auto' }}>
        <Sidebar isCollapsed={isSidebarCollapsed} onToggle={onToggleSidebar} />
        
        <div style={{ flex: 1, padding: '20px 24px' }}>
          
          {/* Profile Header */}
          <div className="profile-header">
            <div className="profile-banner" style={{ background: user.bannerColor || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }} />
            
            <div className="profile-info-container">
              <div className="profile-avatar-section">
                <img src={user.avatar} alt={user.username} className="profile-avatar-large" />
              </div>
              
              <div className="profile-details">
                <h1 className="profile-username">u/{user.username}</h1>
                <div className="profile-meta">
                  <span className="profile-meta-item">
                    <Cake size={16} />
                    Cake day: {user.cakeDay}
                  </span>
                  <span className="profile-meta-item">
                    <Award size={16} />
                    {user.karma} karma
                  </span>
                </div>
                {user.bio && <p className="profile-bio">{user.bio}</p>}
                <div className="profile-stats">
                  <button className="profile-stat-btn" onClick={() => setActiveTab('followers')}>
                    {user.followerCount || 0} followers
                  </button>
                  <button className="profile-stat-btn" onClick={() => setActiveTab('following')}>
                    {user.followingCount || 0} following
                  </button>
                </div>
              </div>

              <div className="profile-actions">
                {currentUser && currentUser.username !== username && (
                  <button className="btn-profile-action btn-primary" onClick={handleFollow}>
                    {following ? 'Unfollow' : 'Follow'}
                  </button>
                )}
                {isOwnProfile ? (
                  <button className="btn-profile-action btn-secondary" onClick={() => setIsEditModalOpen(true)}>
                    <Settings size={16} />
                    Edit
                  </button>
                ) : (
                  <button className="btn-profile-action btn-secondary">
                    Chat
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="profile-tabs">
            <button 
              className={`profile-tab ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button 
              className={`profile-tab ${activeTab === 'posts' ? 'active' : ''}`}
              onClick={() => setActiveTab('posts')}
            >
              Posts ({userPosts.length})
            </button>
            <button 
              className={`profile-tab ${activeTab === 'comments' ? 'active' : ''}`}
              onClick={() => setActiveTab('comments')}
            >
              Comments ({userComments.length})
            </button>
            <button 
              className={`profile-tab ${activeTab === 'followers' ? 'active' : ''}`}
              onClick={() => setActiveTab('followers')}
            >
              Followers ({followers.length})
            </button>
            <button 
              className={`profile-tab ${activeTab === 'following' ? 'active' : ''}`}
              onClick={() => setActiveTab('following')}
            >
              Following ({followingList.length})
            </button>
            {isOwnProfile && (
              <button 
                className={`profile-tab ${activeTab === 'saved' ? 'active' : ''}`}
                onClick={() => setActiveTab('saved')}
              >
                Saved ({savedPosts.length})
              </button>
            )}
            {customFeeds.length > 0 && (
              <button 
                className={`profile-tab ${activeTab === 'feeds' ? 'active' : ''}`}
                onClick={() => setActiveTab('feeds')}
              >
                Custom Feeds ({customFeeds.length})
              </button>
            )}
          </div>

          {/* Content */}
          <div className="profile-content">
            
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="profile-overview">
                <div className="overview-section">
                  <h3>Recent Posts</h3>
                  {userPosts.slice(0, 3).map(post => (
                    <Link to={`/post/${post.id}`} key={post.id} className="overview-item">
                      <div className="overview-item-header">
                        <span className="overview-subreddit">r/{post.subreddit}</span>
                        <span className="overview-time">{post.timeAgo}</span>
                      </div>
                      <h4 className="overview-title">{post.title}</h4>
                      <div className="overview-stats">
                        <span>{post.voteCount} upvotes</span>
                        <span>{post.commentCount} comments</span>
                      </div>
                    </Link>
                  ))}
                  {userPosts.length === 0 && <p className="empty-state">No posts yet</p>}
                </div>
              </div>
            )}

            {/* Posts Tab */}
            {activeTab === 'posts' && (
              <div className="profile-posts">
                {userPosts.map(post => (
                  <Link to={`/post/${post.id}`} key={post.id} className="user-post-card">
                    <div className="post-card-header">
                      <span className="post-subreddit">r/{post.subreddit}</span>
                      <span className="post-time">{post.timeAgo}</span>
                    </div>
                    <h3 className="post-card-title">{post.title}</h3>
                    {post.type === 'text' && post.content && (
                      <p className="post-card-preview">{post.content.substring(0, 200)}...</p>
                    )}
                    {post.type === 'image' && (
                      <div className="post-card-image">
                        <img src={post.content} alt={post.title} />
                      </div>
                    )}
                    <div className="post-card-footer">
                      <span className="post-stat">{post.voteCount} upvotes</span>
                      <span className="post-stat">
                        <MessageSquare size={16} />
                        {post.commentCount} comments
                      </span>
                    </div>
                  </Link>
                ))}
                {userPosts.length === 0 && (
                  <div className="empty-state-large">
                    <p>u/{user.username} hasn't posted anything yet</p>
                  </div>
                )}
              </div>
            )}

            {/* Comments Tab */}
            {activeTab === 'comments' && (
              <div className="profile-comments">
                {userComments.map(comment => (
                  <div key={comment.id} className="user-comment-card">
                    <div className="comment-card-header">
                      <span className="comment-time">{comment.timeAgo}</span>
                      <span className="comment-votes">{comment.voteCount} points</span>
                    </div>
                    <p className="comment-card-content">{comment.content}</p>
                    <div className="comment-card-footer">
                      <Link to={`/post/${comment.postId}`} className="comment-post-link">
                        View Post
                      </Link>
                    </div>
                  </div>
                ))}
                {userComments.length === 0 && (
                  <div className="empty-state-large">
                    <p>u/{user.username} hasn't commented yet</p>
                  </div>
                )}
              </div>
            )}

            {/* Followers Tab */}
            {activeTab === 'followers' && (
              <div className="profile-users-list">
                {followers.map(follower => (
                  <Link to={`/user/${follower.username}`} key={follower.id} className="user-list-card">
                    <img src={follower.avatar} alt={follower.username} className="user-list-avatar" />
                    <div className="user-list-info">
                      <span className="user-list-name">u/{follower.username}</span>
                      <span className="user-list-karma">{follower.karma} karma</span>
                    </div>
                  </Link>
                ))}
                {followers.length === 0 && (
                  <div className="empty-state-large">
                    <p>u/{user.username} has no followers yet</p>
                  </div>
                )}
              </div>
            )}

            {/* Following Tab */}
            {activeTab === 'following' && (
              <div className="profile-users-list">
                {followingList.map(followedUser => (
                  <Link to={`/user/${followedUser.username}`} key={followedUser.id} className="user-list-card">
                    <img src={followedUser.avatar} alt={followedUser.username} className="user-list-avatar" />
                    <div className="user-list-info">
                      <span className="user-list-name">u/{followedUser.username}</span>
                      <span className="user-list-karma">{followedUser.karma} karma</span>
                    </div>
                  </Link>
                ))}
                {followingList.length === 0 && (
                  <div className="empty-state-large">
                    <p>u/{user.username} isn't following anyone yet</p>
                  </div>
                )}
              </div>
            )}

            {/* Saved Tab - Only visible on own profile */}
            {activeTab === 'saved' && isOwnProfile && (
              <div className="profile-posts">
                {savedPosts.map(post => (
                  <Link to={`/post/${post.id}`} key={post.id} className="user-post-card">
                    <div className="post-card-header">
                      <span className="post-subreddit">r/{post.subreddit}</span>
                      <span className="post-time">{post.timeAgo}</span>
                    </div>
                    <h3 className="post-card-title">{post.title}</h3>
                    {post.type === 'text' && post.content && (
                      <p className="post-card-preview">{post.content.substring(0, 200)}...</p>
                    )}
                    {post.type === 'image' && (
                      <div className="post-card-image">
                        <img src={post.content} alt={post.title} />
                      </div>
                    )}
                    <div className="post-card-footer">
                      <span className="post-stat">{post.voteCount} upvotes</span>
                      <span className="post-stat">
                        <MessageSquare size={16} />
                        {post.commentCount} comments
                      </span>
                    </div>
                  </Link>
                ))}
                {savedPosts.length === 0 && (
                  <div className="empty-state-large">
                    <Bookmark size={48} className="empty-icon" />
                    <p>You haven't saved any posts yet</p>
                    <span className="empty-hint">Posts you save will appear here</span>
                  </div>
                )}
              </div>
            )}

            {/* Custom Feeds Tab */}
            {activeTab === 'feeds' && (
              <div className="profile-feeds-list">
                {customFeeds.map(feed => (
                  <Link to={`/feed/${feed._id}`} key={feed._id} className="feed-list-card">
                    <div className="feed-list-icon">
                      <LayoutGrid size={24} />
                    </div>
                    <div className="feed-list-info">
                      <span className="feed-list-name">{feed.name}</span>
                      <span className="feed-list-meta">{feed.communityCount || feed.communities?.length || 0} communities</span>
                    </div>
                  </Link>
                ))}
                {customFeeds.length === 0 && (
                  <div className="empty-state-large">
                    <LayoutGrid size={48} className="empty-icon" />
                    <p>No custom feeds to show</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Edit Profile Modal */}
          <EditProfileModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            user={user}
            onProfileUpdated={(updatedUser) => {
              setUser(prev => ({ ...prev, ...updatedUser }));
              // Reload page if username changed
              if (updatedUser.username !== username) {
                window.location.href = `/user/${updatedUser.username}`;
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;
