import React from 'react';
import '../../styles/components.css';

export const Button = ({ children, onClick, variant = 'primary', className = '' }) => {
  const cls = `btn btn--${variant} ${className}`.trim();
  return (
    <button onClick={onClick} className={cls}>
      {children}
    </button>
  );
};