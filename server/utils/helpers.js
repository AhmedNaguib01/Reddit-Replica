const getTimeAgo = (date) => {
  const seconds = Math.floor((Date.now() - date) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)} weeks ago`;
  return `${Math.floor(seconds / 2592000)} months ago`;
};

const formatCount = (num) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return String(num);
};

const getDefaultAvatar = (username) => {
  const letter = username?.charAt(0).toUpperCase() || 'U';
  return `https://placehold.co/100/ff4500/white?text=${letter}`;
};

const ensureAvatar = (user) => {
  if (!user) return user;
  if (!user.avatar) {
    user.avatar = getDefaultAvatar(user.username);
  }
  return user;
};

const ensureAvatars = (users) => users?.map(ensureAvatar) || [];

const formatPost = (post) => ({
  ...post,
  id: post._id,
  voteCount: post.upvotes - post.downvotes,
  timeAgo: getTimeAgo(post.createdAt),
  subreddit: post.communityName,
  author: post.authorUsername
});

const formatPosts = (posts) => posts.map(formatPost);

const formatComment = (comment) => ({
  ...comment,
  id: comment._id,
  voteCount: comment.upvotes - comment.downvotes,
  timeAgo: getTimeAgo(comment.createdAt),
  author: comment.authorUsername,
  postId: comment.post,
  parentId: comment.parentComment
});

const formatComments = (comments) => comments.map(formatComment);

const formatCommunity = (community) => ({
  ...community,
  id: community.name,
  members: formatCount(community.memberCount),
  online: String(Math.max(Math.floor(community.memberCount * 0.003), 1)),
  created: new Date(community.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  creatorId: community.creator?.toString()
});

const formatCommunities = (communities) => communities.map(formatCommunity);

const formatNotification = (notification) => ({
  ...notification,
  id: notification._id,
  time: getTimeAgo(notification.createdAt)
});

const formatNotifications = (notifications) => notifications.map(formatNotification);

const formatCustomFeed = (feed) => ({
  ...feed,
  id: feed._id,
  communityCount: feed.communities?.length || 0
});

const formatCustomFeeds = (feeds) => feeds.map(formatCustomFeed);

const formatUser = (user) => {
  if (!user) return user;
  const formatted = { ...user };
  delete formatted.password;
  delete formatted.googleId;
  delete formatted.resetPasswordToken;
  delete formatted.resetPasswordExpires;
  
  if (!formatted.avatar) {
    formatted.avatar = getDefaultAvatar(formatted.username);
  }
  
  const karma = formatted.karma || 0;
  if (karma >= 1000000) formatted.karma = `${(karma / 1000000).toFixed(1)}M`;
  else if (karma >= 1000) formatted.karma = `${(karma / 1000).toFixed(1)}k`;
  else formatted.karma = String(karma);
  
  if (formatted.cakeDay) {
    formatted.cakeDay = new Date(formatted.cakeDay).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  
  return formatted;
};

module.exports = { 
  getTimeAgo, 
  formatCount,
  getDefaultAvatar,
  ensureAvatar,
  ensureAvatars,
  formatPost,
  formatPosts,
  formatComment,
  formatComments,
  formatCommunity,
  formatCommunities,
  formatNotification,
  formatNotifications,
  formatCustomFeed,
  formatCustomFeeds,
  formatUser
};
