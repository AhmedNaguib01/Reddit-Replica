import React from 'react';
import { Post } from './Post';
import '../../styles/components.css';

export const PostList = ({ posts, ...props }) => {
  return (
    <div className="post-list">
      {posts.map(post => {
        const community = props.allCommunities[post.communityId];
        const author = props.allUsers[post.authorId];
        const commentCount = Object.values(props.allComments).filter(c => c.postId === post.id).length;
        
        return (
          <Post 
            key={post.id}
            post={post}
            community={community}
            author={author}
            commentCount={commentCount}
            setPage={props.setPage}
            onVote={props.handleVote}
          />
        );
      })}
    </div>
  );
};