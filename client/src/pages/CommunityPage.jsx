import React, { useMemo } from 'react';
import { PostList } from '../components/post/PostList';
import { CreatePostForm } from '../components/post/CreatePostForm';
import { CommunityInfoBox } from '../components/community/CommunityInfoBox';
import { Button } from '../components/common/Button';
import '../styles/pages.css';

export default function CommunityPage({ communityId, ...props }) {
  const community = props.allCommunities[communityId];
  
  const communityPosts = useMemo(() => {
    return Object.values(props.allPosts)
      .filter(p => p.communityId === communityId)
      .sort((a, b) => new Date(b.created) - new Date(a.created));
  }, [props.allPosts, communityId]);

  if (!community) {
    return (
      <div>
        <h2 className="page-error">Community not found!</h2>
        <Button onClick={() => props.setPage({ name: 'home' })}>Go Home</Button>
      </div>
    );
  }

  return (
    <div className="page-grid">
      <div className="page-main">
        <CreatePostForm {...props} />
        <PostList posts={communityPosts} {...props} />
      </div>
      <aside className="page-sidebar">
        <CommunityInfoBox community={community} onJoinLeave={props.handleJoinLeave} />
      </aside>
    </div>
  );
};