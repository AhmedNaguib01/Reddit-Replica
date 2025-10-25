import React from 'react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { InputField } from '../components/common/InputField';
import { Button } from '../components/common/Button';
import '../styles/pages.css';

export default function CreateCommunityPage({ handleCreateCommunity }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const { currentUser } = useAuth();
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !description.trim() || !currentUser) {
      alert("Please fill in all fields and be logged in.");
      return;
    }
    handleCreateCommunity({
      name,
      description,
      createdBy: currentUser.id
    });
  };
  
  return (
    <div className="community-card">
      <h2 className="community-card__title">Create a Community</h2>
      <form onSubmit={handleSubmit} className="community-form">
        <InputField label="Community Name (r/)" placeholder="reactjs" value={name} onChange={(e) => setName(e.target.value.replace(/[^a-z0-9_]/gi, ''))} />
        <div>
          <label className="community-form__label">Description</label>
          <textarea placeholder="What is your community about?" value={description} onChange={(e) => setDescription(e.target.value)} rows="4" className="community-form__textarea"></textarea>
        </div>
        <Button type="submit" variant="primary" className="full-width">Create Community</Button>
      </form>
    </div>
  );
};