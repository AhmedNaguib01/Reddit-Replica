import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MessageSquare, Bookmark, Share2, MoreHorizontal, Edit, Trash2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Sidebar from '../components/layout/Sidebar';
import RightSidebar from '../components/layout/RightSidebar';
import CommentList from '../components/comment/CommentList';
import VoteButtons from '../components/post/VoteButtons';
import ShareModal from '../components/post/ShareModal';
import EditPostModal from '../components/post/EditPostModal';
import ConfirmModal from '../components/common/ConfirmModal';
import { PostSkeleton, CommentListSkeleton } from '../components/common/LoadingSkeleton';
import { postsAPI, commentsAPI, communitiesAPI } from '../services/api';
import usePageTitle from '../hooks/usePageTitle';
import '../styles/PostDetailPage.css';

const PostDetailPage = ({ onAuthAction, isSidebarCollapsed, onToggleSidebar }) => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const optionsRef = useRef(null);
  const { showToast } = useToast();
  
  const isOwner = currentUser && post && currentUser.username === post.author;
  
  usePageTitle(post?.title);

  // Close options menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (optionsRef.current && !optionsRef.current.contains(event.target)) {
        setIsOptionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch post, comments, and membership in parallel for faster loading
        const fetchPromises = [
          postsAPI.getById(postId),
          commentsAPI.getByPostId(postId)
        ];
        
        // Only fetch joined communities if user is logged in
        if (currentUser) {
          fetchPromises.push(communitiesAPI.getJoinedCached().catch(() => []));
        }
        
        const results = await Promise.all(fetchPromises);
        const [postData, commentsData, joinedCommunities] = results;
        
        if (!isMounted) return;
        
        setPost(postData);
        setComments(commentsData);
        
        // Set saved state from post data
        if (postData.saved !== undefined) {
          setSaved(postData.saved);
        } else if (postData.isSaved !== undefined) {
          setSaved(postData.isSaved);
        }
        
        // Check membership from already-fetched data
        if (currentUser && postData.subreddit && joinedCommunities) {
          const memberOfCommunity = joinedCommunities.some(
            c => c.name.toLowerCase() === postData.subreddit.toLowerCase()
          );
          setIsMember(memberOfCommunity);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();
    
    return () => {
      isMounted = false;
    };
  }, [postId, currentUser]);

  const handleSavePost = async () => {
    if (!currentUser) {
      onAuthAction();
      return;
    }
    
    // Optimistic update - update UI immediately
    const wasSaved = saved;
    setSaved(!wasSaved);
    showToast(!wasSaved ? 'Post saved!' : 'Post unsaved', 'success');
    
    try {
      const result = await postsAPI.save(postId);
      // Sync with server response (in case of mismatch)
      setSaved(result.saved);
    } catch (error) {
      // Revert on error
      setSaved(wasSaved);
      console.error('Error saving post:', error);
      showToast('Failed to save post', 'error');
    }
  };

  const handleDeletePost = () => {
    setIsDeleteModalOpen(true);
  };

  const confirmDeletePost = async () => {
    try {
      await postsAPI.delete(postId);
      showToast('Post deleted successfully', 'success');
      navigate('/');
    } catch (error) {
      console.error('Error deleting post:', error);
      showToast(`Failed to delete: ${error.message}`, 'error');
    }
  };

  const handlePostUpdated = (updatedPost) => {
    setPost(prev => ({ ...prev, ...updatedPost }));
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
      onAuthAction();
      return;
    }

    if (!commentText.trim()) return;

    try {
      setSubmitting(true);
      const commentData = {
        postId: postId,
        content: commentText.trim()
      };
      // Only add parentId if it exists
      // Don't send null as it fails validation
      
      const newComment = await commentsAPI.create(commentData);
      
      setComments(prev => [...prev, newComment]);
      setCommentText('');
      
      // Update post comment count
      setPost(prev => ({
        ...prev,
        commentCount: (prev.commentCount || 0) + 1
      }));
    } catch (error) {
      console.error('Error submitting comment:', error);
      alert(`Failed to submit comment: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-layout">
        <Sidebar isCollapsed={isSidebarCollapsed} onToggle={onToggleSidebar} />
        <div className="page-content-wrapper">
          <div className="page-content">
            <div className="page-main-area">
              <main className="page-main-content">
                <div className="skeleton" style={{ width: '60px', height: '32px', marginBottom: '16px', borderRadius: '4px' }} />
                <PostSkeleton />
                <div style={{ marginTop: '16px' }}>
                  <CommentListSkeleton count={4} />
                </div>
              </main>
              <div className="desktop-only page-right-sidebar">
                <RightSidebar />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Post not found</h2>
        <button onClick={() => navigate('/')} style={{ marginTop: '20px' }}>
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="page-layout">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={onToggleSidebar} />
      
      <div className="page-content-wrapper">
        <div className="page-content">
          <div className="page-main-area">
            <main className="page-main-content">
              {/* Back Button */}
            <button 
              onClick={() => navigate(-1)} 
              className="back-button"
            >
              <ArrowLeft size={16} /> Back
            </button>

            {/* Post Detail Card */}
            <article className="post-detail-card">
              
              {/* Vote Section */}
              <div className="post-vote-section">
                <VoteButtons 
                  postId={post._id || post.id}
                  initialCount={post.voteCount ?? (post.upvotes - (post.downvotes || 0)) ?? 0}
                  initialVote={post.userVote}
                  onVote={onAuthAction}
                  onVoteUpdate={(newCount, newVote) => {
                    setPost(prev => ({ ...prev, voteCount: newCount, userVote: newVote }));
                  }}
                />
              </div>

              {/* Content Section */}
              <div className="post-content-section">
                
                {/* Header */}
                <div className="post-detail-header">
                  <div className="post-meta">
                    <Link to={`/r/${post.subreddit}`} className="subreddit-link">
                      r/{post.subreddit}
                    </Link>
                    <span className="separator">•</span>
                    <span className="post-time">Posted by</span>
                    <Link to={`/u/${post.author}`} className="author-link">
                      u/{post.author}
                    </Link>
                    <span className="separator">•</span>
                    <span className="post-time">{post.timeAgo}</span>
                  </div>
                </div>

                {/* Title */}
                <h1 className="post-detail-title">{post.title}</h1>

                {/* Content */}
                <div className="post-detail-content">
                  {post.type === 'image' && (
                    <div className="post-image-container">
                      <img 
                        src={post.content} 
                        alt={post.title}
                        loading="eager"
                        decoding="async"
                        fetchpriority="high"
                      />
                    </div>
                  )}
                  {post.type === 'text' && (
                    <p className="post-text-content">{post.content}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="post-detail-actions">
                  <button className="action-button">
                    <MessageSquare size={18} />
                    <span>{post.commentCount || 0} Comments</span>
                  </button>
                  <button className="action-button" onClick={handleSavePost}>
                    <Bookmark size={18} fill={saved ? 'currentColor' : 'none'} />
                    <span>{saved ? 'Saved' : 'Save'}</span>
                  </button>
                  <button className="action-button" onClick={() => setIsShareModalOpen(true)}>
                    <Share2 size={18} />
                    <span>Share</span>
                  </button>
                  <div className="post-options-wrapper" ref={optionsRef}>
                    <button className="action-button" onClick={() => setIsOptionsOpen(!isOptionsOpen)}>
                      <MoreHorizontal size={18} />
                    </button>
                    {isOptionsOpen && (
                      <div className="post-detail-options-menu">
                        {isOwner ? (
                          <>
                            <button className="options-item" onClick={() => { setIsOptionsOpen(false); setIsEditModalOpen(true); }}>
                              <Edit size={16} />
                              <span>Edit Post</span>
                            </button>
                            <button className="options-item options-item-danger" onClick={() => { setIsOptionsOpen(false); handleDeletePost(); }}>
                              <Trash2 size={16} />
                              <span>Delete Post</span>
                            </button>
                          </>
                        ) : (
                          <div className="options-item options-item-disabled">
                            <span>No actions available</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {post.editedAt && <span className="post-edited-badge">(edited)</span>}
              </div>
            </article>

            {/* Share Modal */}
            <ShareModal
              isOpen={isShareModalOpen}
              onClose={() => setIsShareModalOpen(false)}
              postId={post.id}
              postTitle={post.title}
            />

            {/* Edit Post Modal */}
            <EditPostModal
              isOpen={isEditModalOpen}
              onClose={() => setIsEditModalOpen(false)}
              post={post}
              onPostUpdated={handlePostUpdated}
            />

            {/* Delete Confirmation Modal */}
            <ConfirmModal
              isOpen={isDeleteModalOpen}
              onClose={() => setIsDeleteModalOpen(false)}
              onConfirm={confirmDeletePost}
              title="Delete Post"
              message="Are you sure you want to delete this post? This action cannot be undone."
              confirmText="Delete"
              type="danger"
            />

            {/* Comment Input */}
            <div className="comment-input-card">
              {!currentUser ? (
                <p className="comment-login-prompt">
                  <button onClick={onAuthAction} className="login-link">Log in</button> to comment
                </p>
              ) : !isMember ? (
                <p className="comment-join-prompt">
                  Join r/{post.subreddit} to comment on this post
                </p>
              ) : (
                <>
                  <p className="comment-as">
                    Comment as <Link to={`/u/${currentUser.username}`}>
                      u/{currentUser.username}
                    </Link>
                  </p>
                  <form onSubmit={handleCommentSubmit}>
                    <textarea
                      className="comment-textarea"
                      placeholder="What are your thoughts?"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      rows="4"
                      disabled={submitting}
                    />
                    <div className="comment-actions">
                      <button type="submit" className="btn-comment-submit" disabled={submitting || !commentText.trim()}>
                        {submitting ? 'Posting...' : 'Comment'}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>

            {/* Comments Section */}
            <div className="comments-section">
              <CommentList 
                comments={comments} 
                onAuthRequired={onAuthAction}
                isMember={isMember}
                communityName={post.subreddit}
                onReplyAdded={(parentId, newReply) => {
                  // Add reply to the comments tree
                  setComments(prev => {
                    const addReplyToComment = (commentsList) => {
                      return commentsList.map(comment => {
                        if (comment.id === parentId) {
                          return {
                            ...comment,
                            replies: [...(comment.replies || []), newReply]
                          };
                        } else if (comment.replies) {
                          return {
                            ...comment,
                            replies: addReplyToComment(comment.replies)
                          };
                        }
                        return comment;
                      });
                    };
                    return addReplyToComment(prev);
                  });
                  
                  // Update post comment count
                  setPost(prev => ({
                    ...prev,
                    commentCount: (prev.commentCount || 0) + 1
                  }));
                }}
              />
            </div>
            </main>

            {/* Right Sidebar */}
            <div className="desktop-only page-right-sidebar">
              <RightSidebar />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostDetailPage;
