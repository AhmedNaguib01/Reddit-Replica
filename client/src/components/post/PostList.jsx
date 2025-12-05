import { useState, useEffect, useMemo, useRef } from 'react';
import Post from './Post';
import { PostListSkeleton } from '../common/LoadingSkeleton';
import { postsAPI, communitiesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// Simple cache for communities to avoid refetching
let communitiesCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const PostList = ({ filterBySubreddit, filterByAuthor, sortBy, onAuthRequired }) => {
  const [posts, setPosts] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [joinedCommunities, setJoinedCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser, loading: authLoading } = useAuth();
  const hasFetched = useRef(false);

  // Fetch posts and communities immediately (don't wait for auth)
  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      try {
        // Only show loading skeleton on first fetch
        if (!hasFetched.current) {
          setLoading(true);
        }
        
        // Fetch posts and communities in parallel - don't wait for auth
        const postsPromise = postsAPI.getAll(filterBySubreddit);
        
        // Use cached communities if available and not expired
        let communitiesPromise;
        const now = Date.now();
        if (communitiesCache && (now - cacheTimestamp) < CACHE_DURATION) {
          communitiesPromise = Promise.resolve(communitiesCache);
        } else {
          communitiesPromise = communitiesAPI.getAll().then(data => {
            communitiesCache = data;
            cacheTimestamp = now;
            return data;
          });
        }
        
        const [postsData, communitiesData] = await Promise.all([
          postsPromise,
          communitiesPromise
        ]);
        
        if (isMounted) {
          setPosts(postsData);
          setCommunities(communitiesData);
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

  // Sort
  if (sortBy === 'new') {
    displayPosts.sort((a, b) => b.timestamp - a.timestamp);
  } else if (sortBy === 'top') {
    displayPosts.sort((a, b) => b.voteCount - a.voteCount);
  }

  // Attach community icons and join status
  const postsWithIcons = displayPosts.map(post => {
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
    </div>
  );
};

export default PostList;
