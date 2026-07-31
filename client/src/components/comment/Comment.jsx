import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { commentsAPI } from '../../services/api';
import ConfirmModal from '../common/ConfirmModal';
import '../../styles/Comment.css';

const UpArrow = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 4l-8 8h5v8h6v-8h5z"/>
  </svg>
);

const DownArrow = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 20l8-8h-5v-8h-6v8h-5z"/>
  </svg>
);

const Comment = ({ comment, onAuthRequired, onReplyAdded, onCommentUpdated, onCommentDeleted, isMember, communityName, depth = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [voteState, setVoteState] = useState(comment.userVote || null);
  const [voteCount, setVoteCount] = useState(comment.voteCount ?? (comment.upvotes - (comment.downvotes || 0)) ?? 0);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [localContent, setLocalContent] = useState(comment.content);
  const [isDeleted, setIsDeleted] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const optionsRef = useRef(null);
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  
  const isOwner = currentUser && currentUser.username === comment.author;

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

  const [isVoting, setIsVoting] = useState(false);

  const handleVote = async (type) => {
    if (!currentUser) {
      onAuthRequired();
      return;
    }

    if (isVoting) return;

    // Optimistic update
    const previousVote = voteState;
    const previousCount = voteCount;
    
    let newVote = type;
    let newCount = voteCount;
    
    if (previousVote === type) {
      newVote = null;
      newCount = type === 'up' ? voteCount - 1 : voteCount + 1;
    } else if (previousVote === null) {
      newCount = type === 'up' ? voteCount + 1 : voteCount - 1;
    } else {
      newCount = type === 'up' ? voteCount + 2 : voteCount - 2;
    }
    
    setVoteState(newVote);
    setVoteCount(newCount);
    setIsVoting(true);

    try {
      const commentId = comment._id || comment.id;
      const result = await commentsAPI.vote(commentId, type);
      setVoteCount(result.voteCount);
      setVoteState(result.userVote);
    } catch (error) {
      console.error('Vote error:', error);
      setVoteState(previousVote);
      setVoteCount(previousCount);
      showToast('Failed to vote', 'error');
    } finally {
      setIsVoting(false);
    }
  };

  const handleReply = () => {
    if (!currentUser) {
      onAuthRequired();
    } else if (!isMember) {
      showToast(`Join r/${communityName} to reply`, 'error');
    } else {
      setShowReplyForm(!showReplyForm);
    }
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    try {
      setSubmittingReply(true);
      const newReply = await commentsAPI.create({
        postId: comment.postId,
        content: replyText.trim(),
        parentId: comment.id
      });
      
      if (onReplyAdded) {
        onReplyAdded(comment.id, newReply);
      }
      
      setReplyText('');
      setShowReplyForm(false);
    } catch (error) {
      console.error('Error submitting reply:', error);
      alert(`Failed to submit reply: ${error.message}`);
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleShare = () => {
    if (!currentUser) {
      onAuthRequired();
    } else {
      // Copy link to clipboard
      navigator.clipboard.writeText(`${window.location.origin}/post/${comment.postId}#comment-${comment.id}`);
      showToast('Link copied to clipboard!', 'success');
    }
  };

  const handleOptionsClick = () => {
    setIsOptionsOpen(!isOptionsOpen);
  };

  const handleEditClick = () => {
    setIsOptionsOpen(false);
    setEditText(localContent);
    setIsEditing(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editText.trim()) return;

    try {
      const updatedComment = await commentsAPI.update(comment.id, editText.trim());
      setLocalContent(updatedComment.content);
      setIsEditing(false);
      showToast('Comment updated', 'success');
      if (onCommentUpdated) {
        onCommentUpdated(comment.id, updatedComment);
      }
    } catch (error) {
      console.error('Error updating comment:', error);
      showToast(`Failed to update: ${error.message}`, 'error');
    }
  };

  const handleDeleteClick = () => {
    setIsOptionsOpen(false);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      const commentId = comment._id || comment.id;
      await commentsAPI.delete(commentId);
      setIsDeleted(true);
      showToast('Comment deleted', 'success');
      if (onCommentDeleted) {
        onCommentDeleted(commentId);
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      showToast(`Failed to delete: ${error.message}`, 'error');
    }
  };

  const formatCount = (num) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num;
  };

  if (isDeleted) {
    return null;
  }

  return (
    <div className="comment-container" style={{ marginLeft: depth > 0 ? '24px' : '0' }}>
      <div className="comment-thread-line" onClick={() => setIsExpanded(!isExpanded)} />
      
      <div className="comment-content">
        <div className="comment-header">
          <Link to={`/user/${comment.author}`} className="comment-author">
            u/{comment.author}
          </Link>
          <span className="comment-time">{comment.timeAgo}</span>
          {comment.editedAt && <span className="comment-edited">(edited)</span>}
        </div>

        {isExpanded && (
          <>
            {isEditing ? (
              <form onSubmit={handleEditSubmit} className="edit-comment-form">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows="3"
                  autoFocus
                />
                <div className="edit-comment-actions">
                  <button type="button" onClick={() => setIsEditing(false)}>Cancel</button>
                  <button type="submit" disabled={!editText.trim()}>Save</button>
                </div>
              </form>
            ) : (
              <div className="comment-body">
                <p>{localContent}</p>
              </div>
            )}

            <div className="comment-actions">
              <button 
                className={`comment-vote-btn ${voteState === 'up' ? 'active-up' : ''}`}
                onClick={() => handleVote('up')}
                disabled={isVoting}
              >
                <UpArrow />
              </button>
              <span className={`comment-vote-count ${voteState === 'up' ? 'upvoted' : ''} ${voteState === 'down' ? 'downvoted' : ''}`}>
                {formatCount(voteCount)}
              </span>
              <button 
                className={`comment-vote-btn ${voteState === 'down' ? 'active-down' : ''}`}
                onClick={() => handleVote('down')}
                disabled={isVoting}
              >
                <DownArrow />
              </button>
              <button className="comment-action-btn" onClick={handleReply}>
                Reply
              </button>
              <button className="comment-action-btn" onClick={handleShare}>
                Share
              </button>
              <div className="comment-options-wrapper" ref={optionsRef}>
                <button className="comment-action-btn" onClick={handleOptionsClick}>
                  <MoreHorizontal size={16} />
                </button>
                {isOptionsOpen && (
                  <div className="comment-options-menu">
                    {isOwner ? (
                      <>
                        <button className="comment-option-item" onClick={handleEditClick}>
                          <Edit size={14} />
                          <span>Edit</span>
                        </button>
                        <button className="comment-option-item comment-option-danger" onClick={handleDeleteClick}>
                          <Trash2 size={14} />
                          <span>Delete</span>
                        </button>
                      </>
                    ) : (
                      <div className="comment-option-item comment-option-disabled">
                        <span>No actions available</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Reply Form */}
            {showReplyForm && (
              <form onSubmit={handleReplySubmit} className="reply-form">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply..."
                  rows="3"
                  disabled={submittingReply}
                />
                <div className="reply-actions">
                  <button type="button" onClick={() => setShowReplyForm(false)} disabled={submittingReply}>
                    Cancel
                  </button>
                  <button type="submit" disabled={submittingReply || !replyText.trim()}>
                    {submittingReply ? 'Replying...' : 'Reply'}
                  </button>
                </div>
              </form>
            )}

            {/* Nested Replies */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="comment-replies">
                {comment.replies.map((reply) => (
                  <Comment
                    key={reply.id}
                    comment={reply}
                    onAuthRequired={onAuthRequired}
                    onReplyAdded={onReplyAdded}
                    onCommentUpdated={onCommentUpdated}
                    onCommentDeleted={onCommentDeleted}
                    isMember={isMember}
                    communityName={communityName}
                    depth={depth + 1}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {!isExpanded && (
          <button 
            className="expand-comment-btn"
            onClick={() => setIsExpanded(true)}
          >
            [+] Show comment
          </button>
        )}
      </div>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Comment"
        message="Are you sure you want to delete this comment? This will also delete all replies."
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
};

export default Comment;
