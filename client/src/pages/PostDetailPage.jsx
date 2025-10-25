import React from 'react';
import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { VoteButtons } from '../components/post/VoteButtons';
import { MessageSquare } from 'lucide-react';
import { SummarizeButton } from '../components/post/SummarizeButton';
import { Button } from '../components/common/Button';
import { CommunityInfoBox } from '../components/community/CommunityInfoBox';
import { timeAgo } from '../utils/formatDate';
import '../styles/pages.css';

export default function PostDetailPage({ postId, ...props }) {
  const post = props.allPosts[postId];

  const postComments = useMemo(() => {
    return Object.values(props.allComments)
      .filter(c => c.postId === postId)
      .sort((a, b) => new Date(b.created) - new Date(a.created));
  }, [props.allComments, postId]);

  const [commentBody, setCommentBody] = useState('');
  const { currentUser } = useAuth();

  if (!post) {
    return <div><h2 className="page-error">Post not found!</h2></div>;
  }
  
  const community = props.allCommunities[post.communityId];
  const author = props.allUsers[post.authorId];
  
  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (!commentBody.trim() || !currentUser) return;
    props.handleCreateComment({
      postId: post.id,
      body: commentBody,
      authorId: currentUser.id
    });
    setCommentBody('');
  };

  return (
    <div className="page-grid">
      <div className="page-main">
        <article className="post-detail">
          <div className="post-detail__votes">
            <VoteButtons votes={post.votes} onVote={(dir) => props.handleVote(post.id, dir)} />
          </div>
          <div className="post-detail__content">
            <div className="post-detail__meta">
              <a href="#" onClick={(e) => { e.preventDefault(); props.setPage({ name: 'community', id: community.id }); }} className="post-detail__community">r/{community.name}</a>
              <span className="post-detail__dot">•</span>
              Posted by <a href="#" onClick={(e) => { e.preventDefault(); props.setPage({ name: 'profile', id: author.id }); }} className="post-detail__author">u/{author.username}</a>
              <span className="post-detail__time">{timeAgo(post.created)}</span>
            </div>
            <h2 className="post-detail__title">{post.title}</h2>
            <p className="post-detail__body">{post.body}</p>

            <div className="post-detail__actions">
              <span className="post-detail__commentsCount"><MessageSquare className="post-detail__icon" />{postComments.length} Comments</span>
              <SummarizeButton postBody={post.body} />
            </div>

            {/* Create Comment Form */}
            {currentUser ? (
              <form onSubmit={handleCommentSubmit} className="post-detail__commentForm">
                <p className="post-detail__commentAs">Comment as <span className="font-semibold">{currentUser.username}</span></p>
                <textarea placeholder="What are your thoughts?" value={commentBody} onChange={(e) => setCommentBody(e.target.value)} rows="4" className="post-detail__textarea"></textarea>
                <div className="post-detail__commentActions"><Button type="submit" variant="primary">Comment</Button></div>
              </form>
            ) : (
              <p className="post-detail__loginHint">Log in to leave a comment.</p>
            )}

            {/* Comments List */}
            <div className="post-detail__comments">
              {postComments.map(comment => {
                const commentAuthor = props.allUsers[comment.authorId];
                return (
                  <div key={comment.id} className="comment-row">
                    <VoteButtons votes={comment.votes} onVote={(dir) => props.handleVote(comment.id, dir, true)} small />
                    <div className="comment-row__body">
                      <div className="comment-row__meta">
                        <a href="#" onClick={(e) => { e.preventDefault(); props.setPage({ name: 'profile', id: commentAuthor.id }); }} className="comment-row__author">{commentAuthor.username}</a>
                        <span className="comment-row__time">{timeAgo(comment.created)}</span>
                      </div>
                      <p className="comment-row__text">{comment.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </article>
      </div>

      <aside className="page-sidebar">
        <CommunityInfoBox community={community} onJoinLeave={props.handleJoinLeave} />
      </aside>
    </div>
  );
};