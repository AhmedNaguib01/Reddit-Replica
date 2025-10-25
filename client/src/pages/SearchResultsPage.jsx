import React from 'react';
import { useMemo } from 'react';
import { PostList } from '../components/post/PostList';
import '../styles/pages.css';


export default function SearchResultsPage({ query, ...props }) {
  const lowerQuery = query.toLowerCase();

  const foundPosts = useMemo(() => {
    return Object.values(props.allPosts).filter(
      p => p.title.toLowerCase().includes(lowerQuery) || p.body.toLowerCase().includes(lowerQuery)
    ).sort((a, b) => new Date(b.created) - new Date(a.created));
  }, [props.allPosts, lowerQuery]);

  const foundCommunities = useMemo(() => {
    return Object.values(props.allCommunities).filter(
      c => c.name.toLowerCase().includes(lowerQuery) || c.description.toLowerCase().includes(lowerQuery)
    );
  }, [props.allCommunities, lowerQuery]);

  return (
    <div className="search-page">
      <h2 className="search-page__title">Search results for "{query}"</h2>

      {/* Communities */}
      <section className="search-section">
        <h3 className="search-section__heading">Communities</h3>
        {foundCommunities.length > 0 ? (
          <div className="search-card">
            {foundCommunities.map(c => (
              <div key={c.id} className="search-item">
                <a 
                  href="#"
                  onClick={(e) => { e.preventDefault(); props.setPage({ name: 'community', id: c.id }) }}
                  className="search-item__link"
                >
                  r/{c.name}
                </a>
                <p className="search-item__desc">{c.description}</p>
                <p className="search-item__meta">{c.members.toLocaleString()} members</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="search-empty">No communities found.</p>
        )}
      </section>

      {/* Posts */}
      <section className="search-section">
        <h3 className="search-section__heading">Posts</h3>
        {foundPosts.length > 0 ? (
          <PostList posts={foundPosts} {...props} />
        ) : (
          <p className="search-empty">No posts found.</p>
        )}
      </section>
    </div>
  );
};