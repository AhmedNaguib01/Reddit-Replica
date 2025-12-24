const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthToken = () => localStorage.getItem('authToken');

// Cache for posts
let allPostsCache = null;
let allPostsCacheTimestamp = 0;
const ALL_POSTS_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

// Function to invalidate posts cache
const invalidatePostsCache = () => {
  allPostsCache = null;
  allPostsCacheTimestamp = 0;
};

// Request deduplication - prevents multiple simultaneous calls to the same endpoint
const pendingRequests = new Map();

const apiRequest = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const method = options.method || 'GET';
  
  // Only deduplicate GET requests
  const requestKey = method === 'GET' ? `${method}:${endpoint}:${token || 'anon'}` : null;
  
  // If there's already a pending request for this endpoint, return that promise
  if (requestKey && pendingRequests.has(requestKey)) {
    return pendingRequests.get(requestKey);
  }
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  };

  const requestPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }

      return data;
    } finally {
      // Clean up pending request after completion
      if (requestKey) {
        pendingRequests.delete(requestKey);
      }
    }
  })();

  // Store the promise for deduplication
  if (requestKey) {
    pendingRequests.set(requestKey, requestPromise);
  }

  return requestPromise;
};

// Posts API
export const postsAPI = {
  getAll: async (subreddit) => {
    // Only cache when fetching all posts (no subreddit filter)
    if (!subreddit) {
      const now = Date.now();
      if (allPostsCache && (now - allPostsCacheTimestamp) < ALL_POSTS_CACHE_DURATION) {
        return allPostsCache;
      }
      const data = await apiRequest('/posts'); // Calls http://localhost:5000/api/posts
      allPostsCache = data;
      allPostsCacheTimestamp = now;
      return data;
    }
    const query = `?subreddit=${subreddit}`;
    return apiRequest(`/posts${query}`);
  },
  
  invalidateCache: invalidatePostsCache,
  
  search: (query) => {
    if (!query || query.trim().length < 2) return Promise.resolve([]);
    return apiRequest(`/posts/search?q=${encodeURIComponent(query.trim())}`);
  },
  
  getById: (id) => apiRequest(`/posts/${id}`),
  
  create: async (postData) => {
    const result = await apiRequest('/posts', {
      method: 'POST',
      body: JSON.stringify(postData),
    });
    invalidatePostsCache();
    return result;
  },
  
  update: async (postId, postData) => {
    const result = await apiRequest(`/posts/${postId}`, {
      method: 'PUT',
      body: JSON.stringify(postData),
    });
    invalidatePostsCache();
    return result;
  },
  
  delete: async (postId) => {
    const result = await apiRequest(`/posts/${postId}`, {
      method: 'DELETE',
    });
    invalidatePostsCache();
    return result;
  },
  
  vote: (postId, voteType) => apiRequest(`/posts/${postId}/vote`, {
    method: 'POST',
    body: JSON.stringify({ vote: voteType }),
  }),
  
  save: (postId) => apiRequest(`/posts/${postId}/save`, {
    method: 'POST',
  }),
  
  getSaved: () => apiRequest('/posts/user/saved'),
  
  getByUser: (username) => apiRequest(`/posts/by-user/${username}`),
  
  summarize: (postId) => apiRequest(`/posts/${postId}/summarize`, {
    method: 'POST',
  }),
};

// Comments API
export const commentsAPI = {
  getByPostId: (postId) => apiRequest(`/comments?postId=${postId}`),
  
  getByUser: (username) => apiRequest(`/comments/user/${username}`),
  
  create: (commentData) => apiRequest('/comments', {
    method: 'POST',
    body: JSON.stringify(commentData),
  }),
  
  update: (commentId, content) => apiRequest(`/comments/${commentId}`, {
    method: 'PUT',
    body: JSON.stringify({ content }),
  }),
  
  delete: (commentId) => apiRequest(`/comments/${commentId}`, {
    method: 'DELETE',
  }),
  
  vote: (commentId, voteType) => apiRequest(`/comments/${commentId}/vote`, {
    method: 'POST',
    body: JSON.stringify({ vote: voteType }),
  }),
};

// Cache for all communities (used by multiple components)
let allCommunitiesCache = null;
let allCommunitiesCacheTimestamp = 0;
const ALL_COMMUNITIES_CACHE_DURATION = 30 * 1000; // 30 seconds

// Function to invalidate communities cache
const invalidateCommunitiesCache = () => {
  allCommunitiesCache = null;
  allCommunitiesCacheTimestamp = 0;
};

// Communities API - NO caching for user-specific data to ensure freshness
export const communitiesAPI = {
  getAll: async () => {
    const now = Date.now();
    if (allCommunitiesCache && (now - allCommunitiesCacheTimestamp) < ALL_COMMUNITIES_CACHE_DURATION) {
      return allCommunitiesCache;
    }
    const data = await apiRequest('/communities');
    allCommunitiesCache = data;
    allCommunitiesCacheTimestamp = now;
    return data;
  },
  
  invalidateCache: invalidateCommunitiesCache,
  
  getById: (id) => apiRequest(`/communities/${id}`),
  
  create: (communityData) => apiRequest('/communities', {
    method: 'POST',
    body: JSON.stringify(communityData),
  }),
  
  update: (communityId, communityData) => apiRequest(`/communities/${communityId}`, {
    method: 'PUT',
    body: JSON.stringify(communityData),
  }),
  
  delete: (communityId) => apiRequest(`/communities/${communityId}`, {
    method: 'DELETE',
  }),
  
  join: (communityId) => apiRequest(`/communities/${communityId}/join`, {
    method: 'POST',
  }),
  
  getRecent: () => apiRequest('/communities/user/recent'),
  
  getJoined: () => apiRequest('/communities/user/joined'),
  
  // Alias for backward compatibility
  getJoinedCached: () => apiRequest('/communities/user/joined'),
};

// Users API
export const usersAPI = {
  // Get complete user profile data in a single request (optimized)
  getFullProfile: (username) => apiRequest(`/users/${username}/profile`),
  
  search: (query) => apiRequest(`/users/search?q=${encodeURIComponent(query)}`),
  
  follow: (username) => apiRequest(`/users/${username}/follow`, {
    method: 'POST',
  }),
  
  getFollowers: (username) => apiRequest(`/users/${username}/followers`),
};

// Notifications API
export const notificationsAPI = {
  getAll: () => apiRequest('/notifications'),
  
  getUnreadCount: () => apiRequest('/notifications/unread-count'),
  
  markAsRead: (id) => apiRequest(`/notifications/${id}/read`, {
    method: 'PUT',
  }),
  
  markAllAsRead: () => apiRequest('/notifications/read-all', {
    method: 'PUT',
  }),
};

// Custom Feeds API - NO caching to ensure freshness
export const customFeedsAPI = {
  getAll: () => apiRequest('/custom-feeds'),
  
  getByUsername: (username) => apiRequest(`/custom-feeds/user/${username}`),
  
  getById: (id) => apiRequest(`/custom-feeds/${id}`),
  
  getPosts: (id) => apiRequest(`/custom-feeds/${id}/posts`),
  
  create: (feedData) => apiRequest('/custom-feeds', {
    method: 'POST',
    body: JSON.stringify(feedData),
  }),
  
  update: (id, feedData) => apiRequest(`/custom-feeds/${id}`, {
    method: 'PUT',
    body: JSON.stringify(feedData),
  }),
  
  delete: (id) => apiRequest(`/custom-feeds/${id}`, {
    method: 'DELETE',
  }),
  
  toggleFavorite: (id) => apiRequest(`/custom-feeds/${id}/favorite`, {
    method: 'PUT',
  }),
  
  addCommunity: (feedId, communityId) => apiRequest(`/custom-feeds/${feedId}/communities`, {
    method: 'POST',
    body: JSON.stringify({ communityId }),
  }),
  
  removeCommunity: (feedId, communityId) => apiRequest(`/custom-feeds/${feedId}/communities/${communityId}`, {
    method: 'DELETE',
  }),
};

// Chats API
export const chatsAPI = {
  getAll: () => apiRequest('/chats'),
  
  getUnreadCount: () => apiRequest('/chats/unread-count'),
  
  create: (username) => apiRequest('/chats', {
    method: 'POST',
    body: JSON.stringify({ username }),
  }),
  
  getById: (chatId) => apiRequest(`/chats/${chatId}`),
  
  getMessages: (chatId) => apiRequest(`/chats/${chatId}/messages`),
  
  sendMessage: (chatId, content, replyToId = null) => apiRequest(`/chats/${chatId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content, replyToId }),
  }),
  
  deleteMessage: (chatId, messageId) => apiRequest(`/chats/${chatId}/messages/${messageId}`, {
    method: 'DELETE',
  }),
  
  delete: (chatId) => apiRequest(`/chats/${chatId}`, {
    method: 'DELETE',
  }),
};
