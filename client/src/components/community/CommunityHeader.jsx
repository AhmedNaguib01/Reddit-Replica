import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useSidebar } from '../../context/SidebarContext';
import { communitiesAPI } from '../../services/api';
import EditCommunityModal from './EditCommunityModal';
import ConfirmModal from '../common/ConfirmModal';
import '../../styles/CommunityHeader.css';

const CommunityHeader = ({ 
  bannerUrl, 
  iconUrl, 
  name, 
  title, 
  onAuthRequired,
  communityId,
  communityData,
  onCommunityUpdated
}) => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const { addJoinedCommunity, removeJoinedCommunity, joinedCommunities } = useSidebar();
  const navigate = useNavigate();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check if user is owner - compare by string ID
  const isOwner = currentUser && communityData && 
    (currentUser.id === communityData.creator || 
     currentUser.id === communityData.creatorId ||
     currentUser._id === communityData.creator);

  // Derive joined status directly from context (no local state to avoid flickering)
  const joined = currentUser && joinedCommunities.some(c => 
    c.name === communityId || c.name === name
  );

  const handleJoinClick = async () => {
    if (!currentUser && onAuthRequired) {
      onAuthRequired();
      return;
    }

    try {
      setLoading(true);
      const result = await communitiesAPI.join(communityId);
      
      showToast(
        result.joined ? `Joined r/${name}` : `Left r/${name}`,
        'success'
      );
      
      // Simple refresh after join/leave
      window.location.reload();
    } catch (error) {
      console.error('Join error:', error);
      showToast(`Failed to join: ${error.message}`, 'error');
      setLoading(false);
    }
  };

  const handleEditClick = () => {
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = () => {
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await communitiesAPI.delete(communityId);
      showToast('Community deleted successfully', 'success');
      navigate('/');
    } catch (error) {
      console.error('Error deleting community:', error);
      showToast(`Failed to delete: ${error.message}`, 'error');
    }
  };

  return (
    <div className="community-header-container">
      {/* 1. Top Banner */}
      <div 
        className="community-banner" 
        style={{ backgroundImage: `url(${bannerUrl})`, backgroundColor: '#33a8ff' }}
      >
      </div>

      {/* 2. White Bar with Info */}
      <div className="community-header-content">
        <div className="content-wrapper">
          
          {/* Icon (Overlaps Banner) */}
          <div className="community-icon-container">
            {iconUrl ? (
              <img src={iconUrl} alt={name} className="community-main-icon" />
            ) : (
              <div className="community-default-icon">r/</div>
            )}
          </div>

          {/* Text Info & Buttons */}
          <div className="community-text-info">
            <h1 className="community-title">
              {title}
              <span className="community-name-small">{name}</span>
            </h1>
            
            <div className="community-actions">
              {isOwner ? (
                <div className="owner-actions">
                  <button className="btn-edit" onClick={handleEditClick}>
                    Edit Community
                  </button>
                  <button className="btn-delete" onClick={handleDeleteClick}>
                    Delete Community
                  </button>
                </div>
              ) : (
                <button 
                  className={`btn-join ${joined ? 'joined' : ''}`} 
                  onClick={handleJoinClick}
                  disabled={loading}
                >
                  {loading ? '...' : (joined ? 'Joined' : 'Join')}
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="community-tabs-bar">
        <div className="content-wrapper">
            <div className="tab-list">
                <a href="#" className="tab-link active">Posts</a>
            </div>
        </div>
      </div>

      {/* Edit Community Modal */}
      <EditCommunityModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        community={communityData}
        onCommunityUpdated={onCommunityUpdated}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Community"
        message={`Are you sure you want to delete r/${name}? This will permanently delete all posts, comments, and data. This action cannot be undone.`}
        confirmText="Delete Community"
        type="danger"
      />
    </div>
  );
};

export default CommunityHeader;