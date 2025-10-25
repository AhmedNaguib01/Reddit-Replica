import React from 'react';
import '../../styles/components.css';

export const InputField = ({ type = 'text', placeholder, value, onChange, label }) => (
  <div className="input-field">
    {label && <label className="input-field__label">{label}</label>}
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="input-field__control"
    />
  </div>
);