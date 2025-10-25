import React from 'react';
import { MessageSquare } from 'lucide-react';
import { VoteButtons } from '../post/VoteButtons';
import { SummarizeButton } from '../post/SummarizeButton';
import { timeAgo } from '../../utils/formatDate';
import '../../styles/components.css';


export const Post = ({ post, community, author, commentCount, setPage, onVote }) => {
  return (
    <article className="post">
      {/* Vote Section */}
      <div className="post__votes">
        <VoteButtons votes={post.votes} onVote={(dir) => onVote(post.id, dir)} />
      </div>

      {/* Content Section */}
      <div className="post__content">
        {/* Post Header */}
        <div className="post__meta">
          <a 
            href="#"
            onClick={(e) => { e.preventDefault(); setPage({ name: 'community', id: community.id }); }}
            className="post__community"
          >
            r/{community.name}
          </a>
          <span className="post__dot">•</span>
          Posted by 
          <a 
            href="#"
            onClick={(e) => { e.preventDefault(); setPage({ name: 'profile', id: author.id }); }}
            className="post__author"
          >
            u/{author.username}
          </a>
          <span className="post__time">{timeAgo(post.created)}</span>
        </div>

        {/* Post Title */}
        <h3 className="post__title">
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); setPage({ name: 'post', id: post.id }); }}
            className="post__titleLink"
          >
            {post.title}
          </a>
        </h3>

        {/* Post Body (Preview) */}
        <p className="post__body">
          {post.body}
        </p>

        {/* Post Footer Actions */}
        <div className="post__actions">
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); setPage({ name: 'post', id: post.id }); }}
            className="post__commentsLink"
          >
            <MessageSquare className="post__icon" />
            {commentCount} Comments
          </a>
          {/* Requirement #11: AI Integration */}
          <SummarizeButton postBody={post.body} />
        </div>
      </div>
    </article>
  );
};