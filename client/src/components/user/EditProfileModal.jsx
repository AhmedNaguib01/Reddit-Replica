import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, User, Upload, Link, Image } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import '../../styles/EditProfileModal.css';

const getDefaultAvatar = (username) => `https://placehold.co/100/ff4500/white?text=${username?.charAt(0).toUpperCase() || 'U'}`;

const BANNER_PRESETS = [
  { name: 'Purple', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { name: 'Ocean', value: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)' },
  { name: 'Sunset', value: 'linear-gradient(135deg, #ffa500 0%, #ff6347 100%)' },
  { name: 'Forest', value: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
  { name: 'Night', value: 'linear-gradient(135deg, #4b6cb7 0%, #182848 100%)' },
  { name: 'Rose', value: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' },
  { name: 'Midnight', value: 'linear-gradient(135deg, #232526 0%, #414345 100%)' },
  { name: 'Fire', value: 'linear-gradient(135deg, #f12711 0%, #f5af19 100%)' },
];

// Compress image using canvas
const compressImage = (file, maxWidth, maxHeight, quality = 0.8) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

const EditProfileModal = ({ isOpen, onClose, user, onProfileUpdated }) => {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');
  const [avatarMode, setAvatarMode] = useState('current');
  const [bannerColor, setBannerColor] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [bannerMode, setBannerMode] = useState('color');
  const [loading, setLoading] = useState(false);
  const { updateUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Reset form when modal opens/closes or user changes
  useEffect(() => {
    if (isOpen && user) {
      setUsername(user.username || '');
      setDisplayName(user.displayName || user.username || '');
      setBio(user.bio || '');
      setAvatar(user.avatar || '');
      setAvatarMode('current');
      setBannerColor(user.bannerColor || BANNER_PRESETS[0].value);
      setBannerUrl(user.bannerUrl || '');
      setBannerMode(user.bannerUrl ? 'url' : 'color');
    }
  }, [isOpen, user]);

  // Handle avatar image upload
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('Avatar file size must be less than 5MB', 'error');
        return;
      }
      try {
        const compressed = await compressImage(file, 400, 400, 0.9);
        setAvatar(compressed);
        setAvatarMode('upload');
      } catch {
        showToast('Failed to process image', 'error');
      }
    }
  };

  // Handle banner image upload
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

  // Handle cancel - reset form and close
  const handleCancel = () => {
    setUsername('');
    setDisplayName('');
    setBio('');
    setAvatar('');
    setAvatarMode('current');
    setBannerColor('');
    setBannerUrl('');
    setBannerMode('color');
    onClose();
  };

  if (!isOpen || !user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedUsername = username.trim();
    
    if (!trimmedUsername) {
      showToast('Username is required', 'error');
      return;
    }
    
    if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
      showToast('Username must be between 3 and 20 characters', 'error');
      return;
    }
    
    if (!/^[a-z0-9_]+$/.test(trimmedUsername)) {
      showToast('Username can only contain lowercase letters, numbers, and underscores', 'error');
      return;
    }

    try {
      setLoading(true);
      
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const requestBody = {
        username: username.trim().toLowerCase(),
        displayName: displayName.trim() || username.trim().toLowerCase(),
        bio: bio.trim(),
        bannerColor: bannerMode === 'color' ? bannerColor : '',
        bannerUrl: bannerMode !== 'color' ? bannerUrl : '',
      };
      
      // Only include avatar if it was changed (url or upload mode)
      if (avatarMode === 'url' || avatarMode === 'upload') {
        requestBody.avatar = avatar;
      }

      const response = await fetch(`${API_URL}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile');
      }

      // Update local auth context
      updateUser(data);
      
      const usernameChanged = user.username !== data.username;
      
      showToast('Profile updated successfully', 'success');
      handleCancel(); // Reset and close
      
      if (onProfileUpdated) {
        onProfileUpdated(data);
      }

      // Navigate to new profile URL if username changed
      if (usernameChanged) {
        navigate(`/user/${data.username}`, { replace: true });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      showToast(`Failed to update: ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="edit-profile-overlay">
      <div className="edit-profile-modal">
        <div className="edit-profile-header">
          <div className="header-icon">
            <User size={24} />
          </div>
          <h2>Edit Profile</h2>
          <button className="edit-profile-close" onClick={handleCancel}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="edit-profile-form">
          {/* Banner Preview */}
          <div 
            className="banner-preview" 
            style={{ 
              background: bannerMode !== 'color' && bannerUrl ? `url(${bannerUrl}) center/cover` : bannerColor 
            }}
          >
            <img src={avatar || user.avatar || getDefaultAvatar(user.username)} alt="Avatar" className="avatar-preview" />
          </div>

          {/* Avatar Section */}
          <div className="form-group">
            <label>Profile Picture</label>
            <div className="image-mode-tabs">
              <button
                type="button"
                className={`image-mode-tab ${avatarMode === 'current' ? 'active' : ''}`}
                onClick={() => { setAvatarMode('current'); setAvatar(user.avatar || ''); }}
              >
                <User size={16} />
                Current
              </button>
              <button
                type="button"
                className={`image-mode-tab ${avatarMode === 'url' ? 'active' : ''}`}
                onClick={() => setAvatarMode('url')}
              >
                <Link size={16} />
                URL
              </button>
              <button
                type="button"
                className={`image-mode-tab ${avatarMode === 'upload' ? 'active' : ''}`}
                onClick={() => setAvatarMode('upload')}
              >
                <Upload size={16} />
                Upload
              </button>
            </div>
            
            {avatarMode === 'url' && (
              <input
                type="url"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="https://example.com/avatar.png"
                disabled={loading}
              />
            )}
            
            {avatarMode === 'upload' && (
              <div className="file-upload-area">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="file-input"
                  id="avatar-upload"
                  disabled={loading}
                />
                <label htmlFor="avatar-upload" className="file-upload-label">
                  <Upload size={24} />
                  <span>Click to upload avatar</span>
                  <span className="file-hint">PNG, JPG, GIF up to 5MB</span>
                </label>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="Lowercase letters, numbers, underscores only"
              maxLength={20}
              disabled={loading}
            />
            <span className="field-hint">Permanent identifier (lowercase only)</span>
          </div>

          <div className="form-group">
            <label>Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How your name appears to others"
              maxLength={30}
              disabled={loading}
            />
            <span className="char-count">{displayName.length}/30</span>
          </div>

          <div className="form-group">
            <label>Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              rows={3}
              maxLength={200}
              disabled={loading}
            />
            <span className="char-count">{bio.length}/200</span>
          </div>

          <div className="form-group">
            <label>Profile Banner</label>
            <div className="image-mode-tabs">
              <button
                type="button"
                className={`image-mode-tab ${bannerMode === 'color' ? 'active' : ''}`}
                onClick={() => { setBannerMode('color'); setBannerUrl(''); }}
              >
                <Image size={16} />
                Color
              </button>
              <button
                type="button"
                className={`image-mode-tab ${bannerMode === 'url' ? 'active' : ''}`}
                onClick={() => setBannerMode('url')}
              >
                <Link size={16} />
                URL
              </button>
              <button
                type="button"
                className={`image-mode-tab ${bannerMode === 'upload' ? 'active' : ''}`}
                onClick={() => setBannerMode('upload')}
              >
                <Upload size={16} />
                Upload
              </button>
            </div>
            
            {bannerMode === 'color' && (
              <div className="banner-presets">
                {BANNER_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    className={`banner-preset ${bannerColor === preset.value ? 'selected' : ''}`}
                    style={{ background: preset.value }}
                    onClick={() => setBannerColor(preset.value)}
                    title={preset.name}
                    disabled={loading}
                  />
                ))}
              </div>
            )}
            
            {bannerMode === 'url' && (
              <input
                type="url"
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                placeholder="https://example.com/banner.png"
                disabled={loading}
              />
            )}
            
            {bannerMode === 'upload' && (
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
          </div>

          <div className="edit-profile-actions">
            <button type="button" className="btn-cancel" onClick={handleCancel} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-save" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default EditProfileModal;
