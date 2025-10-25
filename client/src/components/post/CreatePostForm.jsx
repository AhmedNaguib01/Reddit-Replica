import React from 'react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { InputField } from '../common/InputField';
import { Button } from '../common/Button';
import '../../styles/components.css';

export const CreatePostForm = ({ allCommunities, handleCreatePost }) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [communityId, setCommunityId] = useState(Object.values(allCommunities)[0]?.id || '');

  const { currentUser } = useAuth();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim() || !communityId || !currentUser) {
      alert("Please fill in all fields and make sure you are logged in.");
      return;
    }
    handleCreatePost({
      title,
      body,
      communityId,
      authorId: currentUser.id
    });
  };
  
  if (!currentUser) {
    return (
      <div className="create-post__loggedout">
        <p>Please log in to create a post.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="create-post">
      <h2 className="create-post__title">Create a Post</h2>
      <div className="create-post__row">
        <select 
          value={communityId} 
          onChange={(e) => setCommunityId(e.target.value)}
          className="create-post__select"
        >
          {Object.values(allCommunities).map(c => (
            <option key={c.id} value={c.id}>r/{c.name}</option>
          ))}
        </select>
      </div>
      <div className="create-post__row">
        <InputField 
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="create-post__row">
        <textarea
          placeholder="What's on your mind?"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows="5"
          className="create-post__textarea"
        ></textarea>
      </div>
      <div className="create-post__actions">
        <Button type="submit" variant="primary">Post</Button>
      </div>
    </form>
  );
};