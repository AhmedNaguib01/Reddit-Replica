const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthToken = () => localStorage.getItem('authToken');

const CACHE_DURATION = 30 * 1000;

// One small cache used by the endpoints that are re-requested constantly while
// navigating (the feed and the community list). Replaces two hand-rolled
// timestamp/value pairs that had drifted apart.
const createCache = (ttlMs = CACHE_DURATION) => {
  let value = null;
  let timestamp = 0;

  return {
    get() {
      if (value && Date.now() - timestamp < ttlMs) return value;
      return null;
    },
    set(next) {
      value = next;
      timestamp = Date.now();
      return next;
    },
    invalidate() {
      value = null;
      timestamp = 0;
    }
  };
};

const postsCache = createCache();
const communitiesCache = createCache();

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
    // Only the unfiltered feed is cached; community feeds go straight through
    if (subreddit) {
      return apiRequest(`/posts?subreddit=${encodeURIComponent(subreddit)}`);
    }

    const cached = postsCache.get();
    if (cached) return cached;

    return postsCache.set(await apiRequest('/posts'));
  },

  invalidateCache: () => postsCache.invalidate(),
  
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
    postsCache.invalidate();
    return result;
  },
  
  update: async (postId, postData) => {
    const result = await apiRequest(`/posts/${postId}`, {
      method: 'PUT',
      body: JSON.stringify(postData),
    });
    postsCache.invalidate();
    return result;
  },
  
  delete: async (postId) => {
    const result = await apiRequest(`/posts/${postId}`, {
      method: 'DELETE',
    });
    postsCache.invalidate();
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

// Communities API - NO caching for user-specific data to ensure freshness
export const communitiesAPI = {
  getAll: async () => {
    const cached = communitiesCache.get();
    if (cached) return cached;

    return communitiesCache.set(await apiRequest('/communities'));
  },

  invalidateCache: () => communitiesCache.invalidate(),
  
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
