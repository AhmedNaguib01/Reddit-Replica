import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { customFeedsAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ConfirmModal from '../common/ConfirmModal';
import '../../styles/CreateCustomFeedModal.css';

const EditCustomFeedModal = ({ isOpen, onClose, feed, onFeedUpdated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [showOnProfile, setShowOnProfile] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (feed && isOpen) {
      setName(feed.name || '');
      setDescription(feed.description || '');
      setIsPrivate(feed.isPrivate || false);
      setShowOnProfile(feed.showOnProfile !== false);
    }
  }, [feed, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      showToast('Feed name is required', 'error');
      return;
    }

    try {
      setLoading(true);
      const updatedFeed = await customFeedsAPI.update(feed._id, {
        name: name.trim(),
        description: description.trim(),
        isPrivate,
        showOnProfile
      });
      
      showToast('Feed updated successfully!', 'success');
      onClose();
      window.location.reload();
    } catch (error) {
      showToast(error.message || 'Failed to update feed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      setLoading(true);
      await customFeedsAPI.delete(feed._id);
      showToast('Feed deleted', 'success');
      setShowDeleteConfirm(false);
      onClose();
      window.location.href = '/';
    } catch (error) {
      showToast(error.message || 'Failed to delete feed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="custom-feed-modal-overlay" onClick={onClose}>
      <div className="custom-feed-modal" onClick={(e) => e.stopPropagation()}>
        <div className="custom-feed-modal-header">
          <h2>Edit custom feed</h2>
          <button className="custom-feed-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="custom-feed-form">
          <div className="form-group">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name*"
              maxLength={50}
              disabled={loading}
              className="custom-feed-input"
            />
            <span className="char-count">{name.length}/50</span>
          </div>

          <div className="form-group">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              maxLength={500}
              disabled={loading}
              className="custom-feed-textarea"
              rows={3}
            />
            <span className="char-count">{description.length}/500</span>
          </div>

          <div className="toggle-group">
            <div className="toggle-info">
              <span className="toggle-label">Make private</span>
              <span className="toggle-description">Only viewable by you</span>
            </div>
            <button
              type="button"
              className={`toggle-btn ${isPrivate ? 'active' : ''}`}
              onClick={() => setIsPrivate(!isPrivate)}
              disabled={loading}
            >
              <span className="toggle-knob" />
            </button>
          </div>

          <div className="toggle-group">
            <div className="toggle-info">
              <span className="toggle-label">Show on profile</span>
              <span className="toggle-description">Display this feed on your profile so others can find it</span>
            </div>
            <button
              type="button"
              className={`toggle-btn ${showOnProfile ? 'active' : ''}`}
              onClick={() => setShowOnProfile(!showOnProfile)}
              disabled={loading}
            >
              <span className="toggle-knob" />
            </button>
          </div>

          <div className="custom-feed-actions with-delete">
            <button 
              type="button" 
              className="btn-delete" 
              onClick={handleDeleteClick} 
              disabled={loading}
            >
              Delete Feed
            </button>
            <div className="actions-right">
              <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn-submit" disabled={loading || !name.trim()}>
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </form>

        <ConfirmModal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDeleteConfirm}
          title="Delete Custom Feed"
          message={`Are you sure you want to delete "${feed?.name}"? This action cannot be undone.`}
          confirmText="Delete"
          type="danger"
        />
      </div>
    </div>,
    document.body
  );
};

export default EditCustomFeedModal;
