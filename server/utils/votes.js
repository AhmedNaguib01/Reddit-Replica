const Vote = require('../models/Vote');
const UserActivity = require('../models/UserActivity');

// Builds a { targetId: 'up' | 'down' } map for one user over a set of targets.
const buildVoteMap = async (userId, targetIds, targetType) => {
  if (!targetIds.length) return {};

  const votes = await Vote.find({
    user: userId,
    target: { $in: targetIds },
    targetType
  }).select('target voteType').lean();

  const voteMap = {};
  votes.forEach(v => {
    voteMap[v.target.toString()] = v.voteType === 1 ? 'up' : 'down';
  });
  return voteMap;
};

// Returns copies of `posts` annotated with the current user's vote and saved
// state. The inputs are never mutated - several callers pass cached arrays that
// are shared between requests, and annotating them in place would leak one
// user's votes to everybody else served from that cache.
const attachPostVoteInfo = async (posts, userId) => {
  if (!userId || !posts.length) return posts;

  const postIds = posts.map(p => p._id);

  const [voteMap, activity] = await Promise.all([
    buildVoteMap(userId, postIds, 'post'),
    UserActivity.findOne({ user: userId }).select('savedPosts').lean()
  ]);

  const savedPostIds = new Set(activity?.savedPosts?.map(id => id.toString()) || []);

  return posts.map(post => {
    const id = post._id.toString();
    return {
      ...post,
      userVote: voteMap[id] || null,
      saved: savedPostIds.has(id)
    };
  });
};

// Same idea for a nested comment tree. Comment trees are built per request, so
// annotating them in place is safe and avoids rebuilding the whole structure.
const attachCommentVoteInfo = async (tree, userId) => {
  if (!userId || !tree.length) return tree;

  const commentIds = [];
  const collectIds = (comments) => {
    comments.forEach(c => {
      commentIds.push(c._id || c.id);
      if (c.replies?.length) collectIds(c.replies);
    });
  };
  collectIds(tree);

  const voteMap = await buildVoteMap(userId, commentIds, 'comment');

  const applyVotes = (comments) => {
    comments.forEach(c => {
      c.userVote = voteMap[(c._id || c.id).toString()] || null;
      if (c.replies?.length) applyVotes(c.replies);
    });
  };
  applyVotes(tree);

  return tree;
};

module.exports = { buildVoteMap, attachPostVoteInfo, attachCommentVoteInfo };
