const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthToken = () => localStorage.getItem('authToken');

const apiRequest = async (endpoint, options = {}) => {
  const token = getAuthToken();
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
};

// Posts API
export const postsAPI = {
  getAll: (subreddit) => {
    const query = subreddit ? `?subreddit=${subreddit}` : '';
    return apiRequest(`/posts${query}`);
  },
  
  getById: (id) => apiRequest(`/posts/${id}`),
  
  create: (postData) => apiRequest('/posts', {
    method: 'POST',
    body: JSON.stringify(postData),
  }),
  
  update: (postId, postData) => apiRequest(`/posts/${postId}`, {
    method: 'PUT',
    body: JSON.stringify(postData),
  }),
  
  delete: (postId) => apiRequest(`/posts/${postId}`, {
    method: 'DELETE',
  }),
  
  vote: (postId, voteType) => apiRequest(`/posts/${postId}/vote`, {
    method: 'POST',
    body: JSON.stringify({ vote: voteType }),
  }),
  
  save: (postId) => apiRequest(`/posts/${postId}/save`, {
    method: 'POST',
  }),
  
  getSaved: () => apiRequest('/posts/user/saved'),
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

// Communities API
export const communitiesAPI = {
  getAll: () => apiRequest('/communities'),
  
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
};

// Users API
export const usersAPI = {
  getByUsername: (username) => apiRequest(`/users/${username}`),
  
  search: (query) => apiRequest(`/users/search?q=${encodeURIComponent(query)}`),
  
  follow: (username) => apiRequest(`/users/${username}/follow`, {
    method: 'POST',
  }),
  
  getFollowers: (username) => apiRequest(`/users/${username}/followers`),
  
  getFollowing: (username) => apiRequest(`/users/${username}/following`),
  
  isFollowing: (username) => apiRequest(`/users/${username}/is-following`),
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

// Custom Feeds API
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
