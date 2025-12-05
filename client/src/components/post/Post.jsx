import { useNavigate, Link } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowBigUp, ArrowBigDown, MessageSquare, Share2, Sparkles, MoreHorizontal, Edit, Trash2, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useSidebar } from '../../context/SidebarContext';
import ShareModal from './ShareModal';
import EditPostModal from './EditPostModal';
import ConfirmModal from '../common/ConfirmModal';
import { postsAPI, communitiesAPI } from '../../services/api';
import '../../styles/Post.css';

const Post = ({ post, onAuthRequired, onVoteUpdate, onPostDeleted, onPostUpdated, initialJoined }) => {
  const navigate = useNavigate();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [summary, setSummary] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [voteState, setVoteState] = useState(post.userVote || null);
  const [localVoteCount, setLocalVoteCount] = useState(
    post.voteCount ?? (post.upvotes - (post.downvotes || 0)) ?? post.votes ?? 0
  );
  const [localPost, setLocalPost] = useState(post);
  const [joined, setJoined] = useState(initialJoined || false);
  const [isDeleting, setIsDeleting] = useState(false);
  const optionsRef = useRef(null);
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const { addJoinedCommunity, removeJoinedCommunity } = useSidebar();
  
  const isOwner = currentUser && currentUser.username === post.author;

  // Update local post data when post prop changes (but not vote state - that's managed locally)
  useEffect(() => {
    setLocalPost(post);
  }, [post.title, post.content, post.type, post.editedAt]);

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
  
  // Handle voting
  const handleVote = async (e, voteType) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!currentUser) {
      onAuthRequired();
      return;
    }

    // Save previous state for rollback
    const prevVoteState = voteState;
    const prevVoteCount = localVoteCount;

    // Optimistic update
    let newVoteState = voteType;
    let newVoteCount = localVoteCount;

    if (prevVoteState === voteType) {
      // Clicking same vote removes it
      newVoteState = null;
      newVoteCount = voteType === 'up' ? localVoteCount - 1 : localVoteCount + 1;
    } else if (prevVoteState === null) {
      // No previous vote
      newVoteCount = voteType === 'up' ? localVoteCount + 1 : localVoteCount - 1;
    } else {
      // Switching vote
      newVoteCount = voteType === 'up' ? localVoteCount + 2 : localVoteCount - 2;
    }

    setVoteState(newVoteState);
    setLocalVoteCount(newVoteCount);

    try {
      const postId = post._id || post.id;
      const result = await postsAPI.vote(postId, voteType);
      // Only sync vote count from server, keep our calculated vote state
      setLocalVoteCount(result.voteCount);
      if (onVoteUpdate) {
        onVoteUpdate(postId, result.voteCount);
      }
    } catch (error) {
      // Rollback on error
      setVoteState(prevVoteState);
      setLocalVoteCount(prevVoteCount);
      console.error('Vote error:', error);
    }
  };

  // Update joined state when initialJoined prop changes
  useEffect(() => {
    if (initialJoined !== undefined) {
      setJoined(initialJoined);
    }
  }, [initialJoined]);

  // Handle join
  const handleJoin = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!currentUser) {
      onAuthRequired();
      return;
    }

    try {
      const result = await communitiesAPI.join(post.subreddit);
      setJoined(result.joined);
      
      // Update sidebar immediately
      if (result.joined && result.community) {
        addJoinedCommunity(result.community);
      } else if (!result.joined) {
        removeJoinedCommunity(post.subreddit);
      }
      
      showToast(
        result.joined ? `Joined r/${post.subreddit}` : `Left r/${post.subreddit}`,
        'success'
      );
    } catch (error) {
      console.error('Join error:', error);
      showToast(`Failed to join: ${error.message}`, 'error');
    }
  };

  // Navigate to post detail
  const handlePostClick = () => {
    navigate(`/post/${post.id}`);
  };

  // Handle share button click
  const handleShareClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsShareModalOpen(true);
  };

  // Handle options menu toggle
  const handleOptionsClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOptionsOpen(!isOptionsOpen);
  };

  // Handle edit
  const handleEditClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOptionsOpen(false);
    setIsEditModalOpen(true);
  };

  // Handle delete
  const handleDeleteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOptionsOpen(false);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      setIsDeleting(true);
      const postId = post._id || post.id;
      await postsAPI.delete(postId);
      showToast('Post deleted successfully', 'success');
      if (onPostDeleted) {
        onPostDeleted(postId);
      }
    } catch (error) {
      console.error('Delete error:', error);
      showToast(`Failed to delete: ${error.message}`, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle post update
  const handlePostUpdated = (updatedPost) => {
    setLocalPost(updatedPost);
    if (onPostUpdated) {
      onPostUpdated(updatedPost);
    }
  };

  // Handle AI summarize
  const handleSummarize = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsSummaryModalOpen(true);
    
    // If we already have a summary, don't fetch again
    if (summary) return;
    
    setIsSummarizing(true);
    try {
      const postId = post._id || post.id;
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

  if (isDeleting) {
    return null; // Hide the post while deleting
  }

  return (
    <article className="post-card" onClick={handlePostClick}>
      {/* 1. Header: Subreddit, User, Time */}
      <div className="post-header-row">
        {post.subredditIcon && <img src={post.subredditIcon} alt="" className="post-sub-icon" />}
        
        <div className="post-meta-text">
          <Link 
            to={`/r/${post.subreddit}`} 
            className="post-subreddit-link"
            onClick={(e) => e.stopPropagation()}
          >
            r/{post.subreddit}
          </Link>
          <span className="separator">•</span>
          <span className="post-time">{post.timeAgo}</span>
          <span className="separator">•</span>
          <Link 
            to={`/user/${post.author}`} 
            className="post-user-link"
            onClick={(e) => e.stopPropagation()}
          >
            {post.author}
          </Link>
        </div>
        
        <button className={`btn-join-sm ${joined ? 'joined' : ''}`} onClick={handleJoin}>
          {joined ? 'Joined' : 'Join'}
        </button>
        <div className="post-options-wrapper" ref={optionsRef}>
          <button className="btn-options" onClick={handleOptionsClick}>
            <MoreHorizontal size={18} />
          </button>
          {isOptionsOpen && (
            <div className="post-options-menu">
              {isOwner ? (
                <>
                  <button className="options-item" onClick={handleEditClick}>
                    <Edit size={16} />
                    <span>Edit Post</span>
                  </button>
                  <button className="options-item options-item-danger" onClick={handleDeleteClick}>
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

      {/* 2. Title */}
      <h3 className="post-title-new">
        {localPost.title}
        {localPost.editedAt && <span className="edited-badge">(edited)</span>}
      </h3>

      {/* 3. Content (Image or Text) */}
      <div className="post-content-new">
        {localPost.type === 'image' && (
           <div className="media-container">
             <img 
               src={localPost.content} 
               alt={localPost.title} 
               loading="lazy"
               decoding="async"
             />
           </div>
        )}
        {localPost.type === 'text' && (
           <p className="text-preview">{localPost.content}</p>
        )}
      </div>

      {/* 4. Footer Actions (Pills) */}
      <div className="post-footer-new">
        
        {/* Vote Pill */}
        <div className="action-pill vote-pill">
          <button 
            className={`icon-btn up ${voteState === 'up' ? 'active' : ''}`}
            onClick={(e) => handleVote(e, 'up')}
          >
            <ArrowBigUp size={20} />
          </button>
          <span className="vote-count-text">{localVoteCount}</span>
          <button 
            className={`icon-btn down ${voteState === 'down' ? 'active' : ''}`}
            onClick={(e) => handleVote(e, 'down')}
          >
            <ArrowBigDown size={20} />
          </button>
        </div>

        {/* Comment Pill */}
        <div className="action-pill">
          <MessageSquare size={18} />
          <span className="action-text">{post.commentCount || post.comments || 0}</span>
        </div>

        {/* Share Pill */}
        <button className="action-pill btn-share" onClick={handleShareClick}>
          <Share2 size={18} />
          <span>Share</span>
        </button>
        
        {/* AI Summarize Pill */}
        <button 
          className="action-pill btn-ai" 
          onClick={handleSummarize}
          title="Summarize with AI"
        >
          <Sparkles size={18} />
        </button>
      </div>

      <ShareModal 
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        postId={post.id}
        postTitle={localPost.title}
      />

      <EditPostModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        post={localPost}
        onPostUpdated={handlePostUpdated}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />

      {/* AI Summary Modal - rendered via portal to escape post layout */}
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
    </article>
  );
};

export default Post;