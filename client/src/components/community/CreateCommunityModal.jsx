import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { InputField } from '../common/InputField';
import { Button } from '../common/Button';
import '../../styles/components.css';

export const CreateCommunityModal = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !description.trim()) return;
    onCreate({ name, description });
    setName('');
    setDescription('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="cc-modal__title">Create Community</h2>
      <form className="cc-modal__form" onSubmit={handleSubmit}>
        <InputField label="Community Name (r/)" placeholder="reactjs" value={name} onChange={(e) => setName(e.target.value.replace(/[^a-z0-9_]/gi, ''))} />
        <label className="cc-modal__label">Description</label>
        <textarea rows="4" className="cc-modal__textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this community about?"></textarea>
        <div className="cc-modal__actions">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">Create</Button>
        </div>
      </form>
    </Modal>
  );
};
