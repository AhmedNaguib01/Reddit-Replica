import { useState, useEffect } from 'react';
import { X, FileText, Image, Link, Upload } from 'lucide-react';
import { postsAPI, communitiesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import JoinPromptModal from '../community/JoinPromptModal';
import '../../styles/CreatePostModal.css';

const CreatePostModal = ({ isOpen, onClose, subreddit, onPostCreated }) => {
  const [postType, setPostType] = useState('text');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedCommunity, setSelectedCommunity] = useState(subreddit || '');
  const [communities, setCommunities] = useState([]);
  const [joinedCommunities, setJoinedCommunities] = useState([]);
  const [imageMode, setImageMode] = useState('url'); // 'url' or 'upload'
  const [loading, setLoading] = useState(false);
  const [showJoinPrompt, setShowJoinPrompt] = useState(false);
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  // Fetch only joined communities when modal opens
  useEffect(() => {
    if (isOpen && currentUser) {
      const fetchData = async () => {
        try {
          const joined = await communitiesAPI.getJoined();
          setCommunities(joined || []);
          setJoinedCommunities((joined || []).map(c => c.name));
        } catch (error) {
          console.error('Error fetching communities:', error);
          showToast('Failed to load communities', 'error');
        }
      };
      fetchData();
    }
  }, [isOpen, currentUser, showToast]);

  // Update selected community when subreddit prop changes
  useEffect(() => {
    if (subreddit) {
      setSelectedCommunity(subreddit);
    }
  }, [subreddit]);

  // Handle file upload - increased to 10MB
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        showToast('File size must be less than 10MB', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setContent(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Check if user is member of selected community
  const isUserMember = (communityName) => {
    return joinedCommunities.includes(communityName);
  };

  // Handle join and post
  const handleJoinAndPost = async () => {
    try {
      const result = await communitiesAPI.join(selectedCommunity);
      if (result.joined) {
        setJoinedCommunities(prev => [...prev, selectedCommunity]);
        setShowJoinPrompt(false);
        showToast(`Joined r/${selectedCommunity}! 🎉`, 'success');
        // Now submit the post
        await submitPost();
      }
    } catch (error) {
      console.error('Error joining community:', error);
      showToast(`Failed to join: ${error.message}`, 'error');
    }
  };

  const submitPost = async () => {
    try {
      setLoading(true);
      const targetCommunity = subreddit || selectedCommunity;
      const postData = {
        title: title.trim(),
        content: content.trim(),
        type: postType,
        subreddit: targetCommunity,
      };

      await postsAPI.create(postData);
      showToast('Post created successfully! 🎉', 'success');
      
      // Reset form
      setTitle('');
      setContent('');
      setPostType('text');
      setSelectedCommunity('');
      setImageMode('url');
      
      // Close modal and refresh
      onClose();
      if (onPostCreated) {
        onPostCreated();
      }
    } catch (error) {
      console.error('Error creating post:', error);
      showToast(`Failed to create post: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const targetCommunity = subreddit || selectedCommunity;
    
    if (!targetCommunity) {
      showToast('Please select a community', 'error');
      return;
    }

    if (!title.trim()) {
      showToast('Please enter a title', 'error');
      return;
    }

    if (postType === 'text' && !content.trim()) {
      showToast('Please enter some content', 'error');
      return;
    }

    if (postType === 'image' && !content.trim()) {
      showToast('Please provide an image', 'error');
      return;
    }

    await submitPost();
  };

  return (
    <div className="create-post-overlay">
      <div className="create-post-modal">
        <div className="create-post-header">
          <h2>{subreddit ? `Create a post in r/${subreddit}` : 'Create a post'}</h2>
          <button className="create-post-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="post-type-tabs">
          <button 
            className={`post-type-tab ${postType === 'text' ? 'active' : ''}`}
            onClick={() => setPostType('text')}
          >
            <FileText size={18} />
            <span>Text</span>
          </button>
          <button 
            className={`post-type-tab ${postType === 'image' ? 'active' : ''}`}
            onClick={() => setPostType('image')}
          >
            <Image size={18} />
            <span>Image</span>
          </button>
          <button 
            className={`post-type-tab ${postType === 'link' ? 'active' : ''}`}
            onClick={() => setPostType('link')}
          >
            <Link size={18} />
            <span>Link</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="create-post-form">
          {/* Community selector - only show when not in a specific community */}
          {!subreddit && (
            <div className="form-group">
              <select
                value={selectedCommunity}
                onChange={(e) => setSelectedCommunity(e.target.value)}
                className="community-select"
                disabled={loading}
              >
                <option value="">Choose a community *</option>
                {communities.length === 0 ? (
                  <option value="" disabled>Join a community first to post</option>
                ) : (
                  communities.map(community => (
                    <option key={community._id || community.name} value={community.name}>
                      r/{community.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          <div className="form-group">
            <input
              type="text"
              placeholder="Title *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="post-title-input"
              maxLength={300}
              disabled={loading}
            />
            <span className="char-count">{title.length}/300</span>
          </div>

          {postType === 'text' && (
            <div className="form-group">
              <textarea
                placeholder="Text (optional)"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="post-content-textarea"
                rows={8}
                disabled={loading}
              />
            </div>
          )}

          {postType === 'image' && (
            <div className="form-group">
              <div className="image-mode-tabs">
                <button
                  type="button"
                  className={`image-mode-tab ${imageMode === 'url' ? 'active' : ''}`}
                  onClick={() => { setImageMode('url'); setContent(''); }}
                >
                  <Link size={16} />
                  URL
                </button>
                <button
                  type="button"
                  className={`image-mode-tab ${imageMode === 'upload' ? 'active' : ''}`}
                  onClick={() => { setImageMode('upload'); setContent(''); }}
                >
                  <Upload size={16} />
                  Upload
                </button>
              </div>
              
              {imageMode === 'url' ? (
                <input
                  type="url"
                  placeholder="Image URL *"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="post-url-input"
                  disabled={loading}
                />
              ) : (
                <div className="file-upload-area">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="file-input"
                    id="image-upload"
                    disabled={loading}
                  />
                  <label htmlFor="image-upload" className="file-upload-label">
                    <Upload size={24} />
                    <span>Click to upload or drag and drop</span>
                    <span className="file-hint">PNG, JPG, GIF up to 10MB</span>
                  </label>
                </div>
              )}
              
              {content && (
                <div className="image-preview">
                  <img src={content} alt="Preview" onError={(e) => e.target.style.display = 'none'} />
                </div>
              )}
            </div>
          )}

          {postType === 'link' && (
            <div className="form-group">
              <input
                type="url"
                placeholder="URL *"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="post-url-input"
                disabled={loading}
              />
            </div>
          )}

          <div className="create-post-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-post" disabled={loading || !title.trim()}>
              {loading ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>

        {/* Join Prompt Modal */}
        <JoinPromptModal
          isOpen={showJoinPrompt}
          onClose={() => setShowJoinPrompt(false)}
          communityName={selectedCommunity}
          onJoin={handleJoinAndPost}
        />
      </div>
    </div>
  );
};

export default CreatePostModal;
