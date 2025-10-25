import React from 'react';
import { CreatePostForm } from '../components/post/CreatePostForm';
import '../styles/pages.css';

export default function CreatePostPage(props) {
  return (
    <div className="create-post-page">
      <CreatePostForm {...props} />
    </div>
  );
}