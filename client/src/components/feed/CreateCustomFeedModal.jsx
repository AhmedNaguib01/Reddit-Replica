import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, LayoutGrid } from 'lucide-react';
import { customFeedsAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import '../../styles/CreateCustomFeedModal.css';

const CreateCustomFeedModal = ({ isOpen, onClose, onFeedCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [showOnProfile, setShowOnProfile] = useState(true);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      showToast('Feed name is required', 'error');
      return;
    }

    try {
      setLoading(true);
      const newFeed = await customFeedsAPI.create({
        name: name.trim(),
        description: description.trim(),
        isPrivate,
        showOnProfile
      });
      
      showToast(`Custom feed "${name}" created! 🎉`, 'success');
      setName('');
      setDescription('');
      setIsPrivate(false);
      setShowOnProfile(true);
      onClose();
      if (onFeedCreated) onFeedCreated(newFeed);
    } catch (error) {
      showToast(error.message || 'Failed to create feed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="custom-feed-modal-overlay" onClick={onClose}>
      <div className="custom-feed-modal" onClick={(e) => e.stopPropagation()}>
        <div className="custom-feed-modal-header">
          <h2>Create custom feed</h2>
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

          <div className="custom-feed-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={loading || !name.trim()}>
              {loading ? 'Creating...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default CreateCustomFeedModal;
