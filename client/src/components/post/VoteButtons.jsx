import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import '../../styles/components.css';

export const VoteButtons = ({ votes, onVote, small = false }) => {
  const sizeClass = small ? 'vb--small' : 'vb--large';
  return (
    <div className={`vote-buttons ${small ? 'vote-buttons--row' : 'vote-buttons--col'}`}>
      <button onClick={() => onVote('up')} className="vote-buttons__btn" aria-label="Upvote">
        <ArrowUp className={sizeClass} />
      </button>
      <span className="vote-buttons__count">{votes}</span>
      <button onClick={() => onVote('down')} className="vote-buttons__btn" aria-label="Downvote">
        <ArrowDown className={sizeClass} />
      </button>
    </div>
  );
};