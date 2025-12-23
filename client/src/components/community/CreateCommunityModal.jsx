import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, Users, Link, Upload } from 'lucide-react';
import { communitiesAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import '../../styles/CreateCommunityModal.css';

const COMMUNITY_CATEGORIES = [
  'Entertainment',
  'Gaming',
  'News',
  'Sports',
  'Technology',
  'Q&As & Stories',
  'Art & Design',
  'Music',
  'Science',
  'Education',
  'Lifestyle',
  'Other'
];

// Compress image using canvas
const compressImage = (file, maxWidth, maxHeight, quality = 0.8) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        
        // Calculate new dimensions
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to compressed base64
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

const CreateCommunityModal = ({ isOpen, onClose, onCommunityCreated }) => {
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [iconMode, setIconMode] = useState('url'); // 'url' or 'upload'
  const [bannerMode, setBannerMode] = useState('url'); // 'url' or 'upload'
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Handle file upload for icon (compress to 200x200)
  const handleIconUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('Icon file size must be less than 5MB', 'error');
        return;
      }
      try {
        const compressed = await compressImage(file, 200, 200, 0.8);
        setIconUrl(compressed);
      } catch {
        showToast('Failed to process image', 'error');
      }
    }
  };

  // Handle file upload for banner (compress to 1200x400)
  const handleBannerUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        showToast('Banner file size must be less than 10MB', 'error');
        return;
      }
      try {
        const compressed = await compressImage(file, 1920, 600, 0.92);
        setBannerUrl(compressed);
      } catch {
        showToast('Failed to process image', 'error');
      }
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      showToast('Community name is required', 'error');
      return;
    }

    // Validate name format (alphanumeric and underscores only)
    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
      showToast('Name can only contain letters, numbers, and underscores', 'error');
      return;
    }

    if (!category) {
      showToast('Please select a category', 'error');
      return;
    }

    try {
      setLoading(true);
      const communityData = {
        name: name.trim(),
        title: title.trim() || name.trim(),
        description: description.trim(),
        category: category,
        iconUrl: iconUrl.trim() || `https://placehold.co/100/ff4500/white?text=${name.charAt(0).toUpperCase()}`,
        bannerUrl: bannerUrl.trim() || 'https://placehold.co/1200x200/0079d3/white?text=Community+Banner',
      };

      const communityName = name.trim(); // Save before reset
      const newCommunity = await communitiesAPI.create(communityData);
      showToast(`r/${communityName} created successfully`, 'success');
      
      // Reset form
      setName('');
      setTitle('');
      setDescription('');
      setCategory('');
      setIconUrl('');
      setBannerUrl('');
      setIconMode('url');
      setBannerMode('url');
      
      onClose();
      if (onCommunityCreated) {
        onCommunityCreated(newCommunity);
      }
      
      // Navigate to the newly created community
      navigate(`/r/${communityName}`);
    } catch (error) {
      console.error('Error creating community:', error);
      showToast(`Failed to create community: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="create-community-overlay">
      <div className="create-community-modal">
        <div className="create-community-header">
          <div className="header-icon">
            <Users size={24} />
          </div>
          <h2>Create a Community</h2>
          <button className="create-community-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="create-community-form">
          <div className="form-group">
            <label>Name *</label>
            <div className="input-prefix-wrapper">
              <span className="input-prefix">r/</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="community_name"
                maxLength={21}
                disabled={loading}
              />
            </div>
            <span className="form-hint">Community names cannot be changed later</span>
          </div>

          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Display title for your community"
              maxLength={100}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is your community about?"
              rows={3}
              maxLength={500}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={loading}
              className="category-select"
            >
              <option value="">Select a category</option>
              {COMMUNITY_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Community Icon</label>
            <div className="image-mode-tabs">
              <button
                type="button"
                className={`image-mode-tab ${iconMode === 'url' ? 'active' : ''}`}
                onClick={() => { setIconMode('url'); setIconUrl(''); }}
              >
                <Link size={16} />
                URL
              </button>
              <button
                type="button"
                className={`image-mode-tab ${iconMode === 'upload' ? 'active' : ''}`}
                onClick={() => { setIconMode('upload'); setIconUrl(''); }}
              >
                <Upload size={16} />
                Upload
              </button>
            </div>
            
            {iconMode === 'url' ? (
              <input
                type="url"
                value={iconUrl}
                onChange={(e) => setIconUrl(e.target.value)}
                placeholder="https://example.com/icon.png"
                disabled={loading}
              />
            ) : (
              <div className="file-upload-area">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleIconUpload}
                  className="file-input"
                  id="icon-upload"
                  disabled={loading}
                />
                <label htmlFor="icon-upload" className="file-upload-label">
                  <Upload size={24} />
                  <span>Click to upload icon</span>
                  <span className="file-hint">PNG, JPG, GIF up to 5MB</span>
                </label>
              </div>
            )}
            
            {iconUrl && (
              <div className="image-preview icon-preview">
                <img src={iconUrl} alt="Icon Preview" onError={(e) => e.target.style.display = 'none'} />
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Community Banner</label>
            <div className="image-mode-tabs">
              <button
                type="button"
                className={`image-mode-tab ${bannerMode === 'url' ? 'active' : ''}`}
                onClick={() => { setBannerMode('url'); setBannerUrl(''); }}
              >
                <Link size={16} />
                URL
              </button>
              <button
                type="button"
                className={`image-mode-tab ${bannerMode === 'upload' ? 'active' : ''}`}
                onClick={() => { setBannerMode('upload'); setBannerUrl(''); }}
              >
                <Upload size={16} />
                Upload
              </button>
            </div>
            
            {bannerMode === 'url' ? (
              <input
                type="url"
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                placeholder="https://example.com/banner.png"
                disabled={loading}
              />
            ) : (
              <div className="file-upload-area">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBannerUpload}
                  className="file-input"
                  id="banner-upload"
                  disabled={loading}
                />
                <label htmlFor="banner-upload" className="file-upload-label">
                  <Upload size={24} />
                  <span>Click to upload banner</span>
                  <span className="file-hint">PNG, JPG, GIF up to 10MB</span>
                </label>
              </div>
            )}
            
            {bannerUrl && (
              <div className="image-preview banner-preview">
                <img src={bannerUrl} alt="Banner Preview" onError={(e) => e.target.style.display = 'none'} />
              </div>
            )}
          </div>

          <div className="create-community-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-create" disabled={loading || !name.trim()}>
              {loading ? 'Creating...' : 'Create Community'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default CreateCommunityModal;
