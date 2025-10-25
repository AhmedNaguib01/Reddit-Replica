import React from 'react';
import { X } from 'lucide-react'; // Import the icon
import '../../styles/components.css';

export const Modal = ({ children, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="modal-close">
          <X className="modal-close__icon" />
        </button>
        {children}
      </div>
    </div>
  );
};