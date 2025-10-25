import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import '../../styles/components.css';

export const CommunityInfoBox = ({ community, onJoinLeave }) => {
  const { currentUser } = useAuth();
  // In a real app, this would be a list of user IDs in the community.
  // We'll just fake it for the demo.
  const isMember = currentUser ? community.members % 2 === 0 : false; 

  return (
    <div className="community-info">
      <div className="community-info__banner" />
      <div className="community-info__body">
        <h2 className="community-info__title">r/{community.name}</h2>
        <p className="community-info__desc">{community.description}</p>
        <div className="community-info__stats">
          <div>
            <p className="community-info__members">{community.members.toLocaleString()}</p>
            <p className="community-info__label">Members</p>
          </div>
        </div>
        <hr className="community-info__divider" />
        {currentUser && (
          <Button 
            variant={isMember ? 'outline' : 'primary'}
            className="full-width"
            onClick={() => onJoinLeave(community.id)}
          >
            {isMember ? 'Leave' : 'Join'}
          </Button>
        )}
      </div>
    </div>
  );
};