import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Check } from 'lucide-react';
import { communitiesAPI, customFeedsAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import '../../styles/AddCommunitiesModal.css';

const AddCommunitiesModal = ({ isOpen, onClose, feed, onCommunitiesUpdated }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [allCommunities, setAllCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchCommunities();
    }
  }, [isOpen]);

  const fetchCommunities = async () => {
    try {
      setLoading(true);
      const data = await communitiesAPI.getAll();
      setAllCommunities(data);
    } catch (error) {
      console.error('Error fetching communities:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const feedCommunityIds = feed?.communities?.map(c => c._id || c) || [];

  const filteredCommunities = allCommunities.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleCommunity = async (community) => {
    const isInFeed = feedCommunityIds.includes(community._id);
    setAddingId(community._id);

    try {
      let updatedFeed;
      if (isInFeed) {
        updatedFeed = await customFeedsAPI.removeCommunity(feed._id, community._id);
        showToast(`Removed r/${community.name} from feed`, 'success');
      } else {
        updatedFeed = await customFeedsAPI.addCommunity(feed._id, community._id);
        showToast(`Added r/${community.name} to feed`, 'success');
      }
      if (onCommunitiesUpdated) onCommunitiesUpdated(updatedFeed);
    } catch (error) {
      showToast(error.message || 'Failed to update feed', 'error');
    } finally {
      setAddingId(null);
    }
  };

  return createPortal(
    <div className="add-communities-overlay" onClick={onClose}>
      <div className="add-communities-modal" onClick={(e) => e.stopPropagation()}>
        <div className="add-communities-header">
          <h2>Communities</h2>
          <button className="add-communities-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="add-communities-search">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search communities"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="add-communities-list">
          {loading ? (
            <div className="communities-loading">Loading...</div>
          ) : filteredCommunities.length === 0 ? (
            <div className="no-communities-found">No communities found</div>
          ) : (
            filteredCommunities.map(community => {
              const isInFeed = feedCommunityIds.includes(community._id);
              const isAdding = addingId === community._id;
              
              return (
                <div
                  key={community._id}
                  className={`community-item ${isInFeed ? 'in-feed' : ''}`}
                  onClick={() => !isAdding && handleToggleCommunity(community)}
                >
                  <img src={community.iconUrl} alt="" className="community-icon" />
                  <div className="community-info">
                    <span className="community-name">r/{community.name}</span>
                    <span className="community-members">{community.members || community.memberCount} members</span>
                  </div>
                  <div className={`community-check ${isInFeed ? 'checked' : ''}`}>
                    {isAdding ? (
                      <div className="mini-spinner" />
                    ) : isInFeed ? (
                      <Check size={16} />
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AddCommunitiesModal;
