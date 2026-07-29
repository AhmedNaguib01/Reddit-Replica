import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { MessageSquare, Bookmark, Share2, MoreHorizontal, Edit, Trash2, ArrowLeft, Sparkles, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSidebar } from '../context/SidebarContext';
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
import '../styles/Post.css';

const PostDetailPage = ({ onAuthAction, isSidebarCollapsed, onToggleSidebar }) => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

  // When arriving from a feed, the post is already in hand - render it straight
  // away and let the network catch up, instead of showing a skeleton for data
  // the previous page had already loaded.
  const seededPost = location.state?.post?.id === postId ? location.state.post : null;

  const [post, setPost] = useState(seededPost);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(!seededPost);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [summary, setSummary] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const optionsRef = useRef(null);
  const { showToast } = useToast();
  const { addJoinedCommunity, removeJoinedCommunity } = useSidebar();
  
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
    
    // All three requests go out together, but each updates the page as it
    // arrives. Previously the post waited on the slowest of the three, so a
    // busy comment thread delayed the post body itself.
    setCommentsLoading(true);

    postsAPI.getById(postId)
      .then(postData => {
        if (!isMounted) return;
        setPost(postData);

        if (postData.saved !== undefined) {
          setSaved(postData.saved);
        } else if (postData.isSaved !== undefined) {
          setSaved(postData.isSaved);
        }
      })
      .catch(error => console.error('Error fetching post:', error))
      .finally(() => { if (isMounted) setLoading(false); });

    commentsAPI.getByPostId(postId)
      .then(commentsData => { if (isMounted) setComments(commentsData); })
      .catch(error => console.error('Error fetching comments:', error))
      .finally(() => { if (isMounted) setCommentsLoading(false); });

    return () => {
      isMounted = false;
    };
  }, [postId, currentUser]);

  // Membership drives whether the comment box is enabled. It needs the post's
  // community, which may come from the seeded post or from the fetch above.
  useEffect(() => {
    const subreddit = post?.subreddit;
    if (!currentUser || !subreddit) {
      setIsMember(false);
      return;
    }

    let isMounted = true;
    communitiesAPI.getJoinedCached()
      .then(joined => {
        if (!isMounted || !Array.isArray(joined)) return;
        setIsMember(joined.some(c => c.name?.toLowerCase() === subreddit.toLowerCase()));
      })
      .catch(() => {});

    return () => { isMounted = false; };
  }, [currentUser, post?.subreddit]);

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

  const handleSummarize = async () => {
    setIsSummaryModalOpen(true);
    
    // If we already have a summary, don't fetch again
    if (summary) return;
    
    setIsSummarizing(true);
    try {
      const result = await postsAPI.summarize(postId);
      setSummary(result.summary);
    } catch (error) {
      console.error('Summarize error:', error);
      setSummary('Failed to generate summary. Please try again later.');
      showToast('Failed to generate summary', 'error');
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleJoin = async () => {
    if (!currentUser) {
      onAuthAction();
      return;
    }

    // Optimistic update
    const wasJoined = isMember;
    const newJoined = !wasJoined;
    setIsMember(newJoined);
    
    // Update sidebar immediately
    if (newJoined) {
      addJoinedCommunity({ name: post.subreddit, iconUrl: post.subredditIcon });
    } else {
      removeJoinedCommunity(post.subreddit);
    }
    
    showToast(
      newJoined ? `Joined r/${post.subreddit}` : `Left r/${post.subreddit}`,
      'success'
    );

    try {
      const result = await communitiesAPI.join(post.subreddit);
      communitiesAPI.invalidateCache();
      
      // Sync with server response if different
      if (result.joined !== newJoined) {
        setIsMember(result.joined);
        if (result.joined && result.community) {
          addJoinedCommunity(result.community);
        } else if (!result.joined) {
          removeJoinedCommunity(post.subreddit);
        }
      }
    } catch (error) {
      // Rollback on error
      setIsMember(wasJoined);
      if (wasJoined) {
        addJoinedCommunity({ name: post.subreddit, iconUrl: post.subredditIcon });
      } else {
        removeJoinedCommunity(post.subreddit);
      }
      console.error('Join error:', error);
      showToast(`Failed to ${newJoined ? 'join' : 'leave'}: ${error.message}`, 'error');
    }
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
                  <button className={`btn-join-sm ${isMember ? 'joined' : ''}`} onClick={handleJoin}>
                    {isMember ? 'Joined' : 'Join'}
                  </button>
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
                  <button className="action-button btn-ai-detail" onClick={handleSummarize} title="Summarize with AI">
                    <Sparkles size={18} />
                    <span>Summarize</span>
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

            {/* AI Summary Modal */}
            {isSummaryModalOpen && createPortal(
              <div className="summary-overlay" onClick={() => setIsSummaryModalOpen(false)}>
                <div className="summary-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="summary-modal-header">
                    <div className="summary-modal-title">
                      <Sparkles size={20} className="summary-icon" />
                      <span>AI Summary</span>
                    </div>
                    <button 
                      className="summary-modal-close" 
                      onClick={() => setIsSummaryModalOpen(false)}
                      aria-label="Close"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <div className="summary-modal-content">
                    {isSummarizing ? (
                      <div className="summary-loading">
                        <div className="summary-spinner"></div>
                        <span>Generating summary...</span>
                      </div>
                    ) : (
                      <p className="summary-text">{summary}</p>
                    )}
                  </div>
                  <div className="summary-modal-footer">
                    <span className="summary-powered">Powered by Google Gemini</span>
                  </div>
                </div>
              </div>,
              document.body
            )}

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
              {commentsLoading && comments.length === 0 && <CommentListSkeleton count={4} />}
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
