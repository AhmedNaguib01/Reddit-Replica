import React, { useMemo } from 'react';
import { PostList } from '../components/post/PostList';
import { CreatePostForm } from '../components/post/CreatePostForm';
import { Button } from '../components/common/Button';
import '../styles/pages.css';

export default function HomePage(props) {
  const sortedPosts = useMemo(() => {
    return Object.values(props.allPosts).sort((a, b) => new Date(b.created) - new Date(a.created));
  }, [props.allPosts]);
  
  const topCommunities = useMemo(() => {
    return Object.values(props.allCommunities).sort((a, b) => b.members - a.members).slice(0, 5);
  }, [props.allCommunities]);

  return (
    <div className="page-grid">
      {/* Main Feed */}
      <div className="page-main">
        <CreatePostForm {...props} />
        <PostList posts={sortedPosts} {...props} />
      </div>

      {/* Sidebar */}
      <aside className="page-sidebar">
        <div className="sidebar-card">
          <h3 className="sidebar-title">Top Communities</h3>
          <ul className="sidebar-list">
            {topCommunities.map((c, index) => (
              <li key={c.id} className="sidebar-item">
                <span className="sidebar-rank">{index + 1}</span>
                <div className="sidebar-avatar">{c.name.charAt(0)}</div>
                <a 
                  href="#"
                  onClick={(e) => { e.preventDefault(); props.setPage({ name: 'community', id: c.id }) }}
                  className="sidebar-link"
                >
                  r/{c.name}
                </a>
              </li>
            ))}
          </ul>
          <Button variant="primary" className="full-width mt-4" onClick={() => props.setPage({ name: 'create-community' })}>Create Community</Button>
        </div>
      </aside>
    </div>
  );
};