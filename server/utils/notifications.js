const Notification = require('../models/Notification');

/**
 * Create a notification for a user
 * @param {Object} options - Notification options
 * @param {string} options.userId - The user to notify
 * @param {string} options.type - Type: 'upvote', 'comment', 'reply', 'follow', 'mention'
 * @param {string} options.message - Notification message
 * @param {string} options.link - Link to navigate to
 * @param {string} options.fromUserId - User who triggered the notification
 * @param {string} options.fromUsername - Username who triggered the notification
 * @param {string} [options.relatedPostId] - Related post ID
 * @param {string} [options.relatedCommentId] - Related comment ID
 */
const createNotification = async (options) => {
  try {
    const {
      userId,
      type,
      message,
      link,
      fromUserId,
      fromUsername,
      relatedPostId,
      relatedCommentId
    } = options;

    // Don't notify yourself
    if (userId.toString() === fromUserId.toString()) {
      return null;
    }

    const notification = await Notification.create({
      user: userId,
      type,
      message,
      link,
      fromUser: fromUserId,
      fromUsername,
      relatedPost: relatedPostId || null,
      relatedComment: relatedCommentId || null,
      read: false
    });

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

/**
 * Create notification when someone comments on a post
 */
const notifyPostComment = async (post, commenter) => {
  return createNotification({
    userId: post.author,
    type: 'comment',
    message: `${commenter.username} commented on your post "${post.title.substring(0, 50)}${post.title.length > 50 ? '...' : ''}"`,
    link: `/post/${post._id}`,
    fromUserId: commenter.id,
    fromUsername: commenter.username,
    relatedPostId: post._id
  });
};

/**
 * Create notification when someone replies to a comment
 */
const notifyCommentReply = async (parentComment, post, replier) => {
  return createNotification({
    userId: parentComment.author,
    type: 'reply',
    message: `${replier.username} replied to your comment`,
    link: `/post/${post._id}`,
    fromUserId: replier.id,
    fromUsername: replier.username,
    relatedPostId: post._id,
    relatedCommentId: parentComment._id
  });
};

/**
 * Create notification when someone upvotes a post
 */
const notifyPostUpvote = async (post, voter) => {
  return createNotification({
    userId: post.author,
    type: 'upvote',
    message: `${voter.username} upvoted your post "${post.title.substring(0, 50)}${post.title.length > 50 ? '...' : ''}"`,
    link: `/post/${post._id}`,
    fromUserId: voter.id,
    fromUsername: voter.username,
    relatedPostId: post._id
  });
};

/**
 * Create notification when someone follows a user
 */
const notifyFollow = async (followedUserId, follower) => {
  return createNotification({
    userId: followedUserId,
    type: 'follow',
    message: `${follower.username} started following you`,
    link: `/user/${follower.username}`,
    fromUserId: follower.id,
    fromUsername: follower.username
  });
};

module.exports = {
  createNotification,
  notifyPostComment,
  notifyCommentReply,
  notifyPostUpvote,
  notifyFollow
};
