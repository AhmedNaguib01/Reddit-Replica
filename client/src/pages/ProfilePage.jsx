import React from 'react';
import { useMemo } from 'react';
import { PostList } from '../components/post/PostList';
import { User } from 'lucide-react';
import '../styles/pages.css';

export default function ProfilePage({ userId, ...props }) {
  const user = props.allUsers[userId];
  
  const userPosts = useMemo(() => {
    return Object.values(props.allPosts)
      .filter(p => p.authorId === userId)
      .sort((a, b) => new Date(b.created) - new Date(a.created));
  }, [props.allPosts, userId]);
  
  if (!user) {
    return <div><h2 className="page-error">User not found!</h2></div>;
  }
  
  return (
    <div className="page-grid">
      <div className="page-main">
        <h2 className="profile-title">Posts by u/{user.username}</h2>
        <PostList posts={userPosts} {...props} />
      </div>
      
      <aside className="page-sidebar">
        <div className="profile-card">
          <div className="profile-avatar"><User className="profile-avatar__icon" /></div>
          <h2 className="profile-name">u/{user.username}</h2>
          <p className="profile-joined">Joined {new Date(user.joined).toLocaleDateString()}</p>
        </div>
      </aside>
    </div>
  );
};