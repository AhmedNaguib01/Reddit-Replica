import { useState, useEffect, useMemo, useRef } from 'react';
import Post from './Post';
import { PostListSkeleton } from '../common/LoadingSkeleton';
import { postsAPI, communitiesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// How many posts are put on screen at once. Rendering the whole feed meant
// every post's image and community icon was requested up front, most of them
// far below the fold. Sorting still runs over the full set, so only how much is
// displayed changes.
const INITIAL_VISIBLE = 10;
const LOAD_MORE_STEP = 10;

const PostList = ({ filterBySubreddit, filterByAuthor, sortBy, onAuthRequired }) => {
  const [posts, setPosts] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [joinedCommunities, setJoinedCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const { currentUser, loading: authLoading } = useAuth();
  const hasFetched = useRef(false);
  const sentinelRef = useRef(null);

  // Fetch posts and communities immediately (don't wait for auth)
  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      try {
        // Only show loading skeleton on first fetch
        if (!hasFetched.current) {
          setLoading(true);
        }
        
        // Both in parallel, without waiting for auth. communitiesAPI.getAll
        // caches internally, so no second cache is needed here.
        const [postsData, communitiesData] = await Promise.all([
          postsAPI.getAll(filterBySubreddit),
          communitiesAPI.getAll()
        ]);

        if (isMounted) {
          setPosts(postsData);
          setCommunities(communitiesData);
          setVisibleCount(INITIAL_VISIBLE);
          setError(null);
          setLoading(false);
          hasFetched.current = true;
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    fetchData();
    
    return () => {
      isMounted = false;
    };
  }, [filterBySubreddit]);

  // Fetch joined communities separately after auth is ready (non-blocking)
  useEffect(() => {
    if (authLoading || !currentUser) {
      setJoinedCommunities([]);
      return;
    }
    
    let isMounted = true;
    
    communitiesAPI.getJoinedCached()
      .then(data => {
        if (isMounted) {
          setJoinedCommunities(data);
        }
      })
      .catch(() => {
        if (isMounted) {
          setJoinedCommunities([]);
        }
      });
    
    return () => {
      isMounted = false;
    };
  }, [currentUser, authLoading]);
  
  // Create a Set of joined community names for O(1) lookup
  const joinedCommunityNames = useMemo(() => {
    return new Set(joinedCommunities.map(c => c.name));
  }, [joinedCommunities]);

  // Reveal the next batch as the end of the list comes into view. The button
  // inside the sentinel stays as the fallback for browsers without
  // IntersectionObserver and for keyboard users.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setVisibleCount(current => current + LOAD_MORE_STEP);
        }
      },
      { rootMargin: '600px' } // start loading before the user reaches the end
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, posts.length, loading]);

  const handleVoteUpdate = (postId, newVoteCount) => {
    setPosts(prevPosts =>
      prevPosts.map(post =>
        (post.id === postId || post._id === postId) ? { ...post, voteCount: newVoteCount } : post
      )
    );
  };

  const handlePostDeleted = (postId) => {
    setPosts(prevPosts => prevPosts.filter(post => post.id !== postId && post._id !== postId));
  };

  const handlePostUpdated = (updatedPost) => {
    setPosts(prevPosts =>
      prevPosts.map(post =>
        (post.id === updatedPost.id || post._id === updatedPost._id) ? { ...post, ...updatedPost } : post
      )
    );
  };

  if (loading) {
    return <PostListSkeleton count={5} />;
  }

  if (error) {
    return <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>Error: {error}</div>;
  }

  // Filter by author if needed
  let displayPosts = [...posts];
  if (filterByAuthor) {
    displayPosts = displayPosts.filter(p => p.author === filterByAuthor);
  }

  // Sort. `new` previously compared a `timestamp` field the API does not
  // return, so every comparison was NaN and the order never actually changed.
  if (sortBy === 'new') {
    displayPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else if (sortBy === 'top') {
    displayPosts.sort((a, b) => b.voteCount - a.voteCount);
  }

  const totalCount = displayPosts.length;
  const hasMore = visibleCount < totalCount;

  // Attach community icons and join status, for the visible slice only
  const postsWithIcons = displayPosts.slice(0, visibleCount).map(post => {
    const community = communities.find(c => 
      c.name === post.subreddit || 
      c.name === post.communityName ||
      c.name === `r/${post.subreddit}`
    );
    const isJoined = joinedCommunityNames.has(post.subreddit) || 
                     joinedCommunityNames.has(post.communityName);
    return {
      ...post,
      subredditIcon: community ? community.iconUrl : 'https://placehold.co/20/grey/white?text=r/',
      votes: post.voteCount || post.votes,
      comments: post.commentCount || post.comments,
      isJoined, // Pass join status to avoid API calls in Post component
    };
  });

  if (postsWithIcons.length === 0) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>No posts found</div>;
  }

  return (
    <div className="post-list">
      {postsWithIcons.map((post) => (
        <Post
          key={post.id}
          post={post}
          onAuthRequired={onAuthRequired}
          onVoteUpdate={handleVoteUpdate}
          onPostDeleted={handlePostDeleted}
          onPostUpdated={handlePostUpdated}
          initialJoined={post.isJoined}
        />
      ))}

      {hasMore && (
        <div ref={sentinelRef} className="post-list-sentinel">
          <button
            type="button"
            className="btn-load-more"
            onClick={() => setVisibleCount(c => c + LOAD_MORE_STEP)}
          >
            Load more posts
          </button>
        </div>
      )}
    </div>
  );
};

export default PostList;
