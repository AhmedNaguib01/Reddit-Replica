import React from 'react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { InputField } from '../components/common/InputField';
import { Button } from '../components/common/Button';
import '../styles/pages.css';

export default function LoginPage({ isRegister, setPage }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, register } = useAuth();

  const title = isRegister ? 'Sign Up' : 'Log In';
  
  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    const action = isRegister ? register : login;
    const success = action(username, password);
    
    if (success) {
      setPage({ name: 'home' }); // Navigate home on success
    } else {
      setError(isRegister ? 'Username already taken.' : 'Invalid username or password.');
    }
  };

  return (
    <div className="auth-card">
      <h2 className="auth-card__title">{title}</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <InputField label="Username" placeholder="username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <InputField label="Password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="auth-error">{error}</p>}
        <Button type="submit" variant="primary" className="full-width">{title}</Button>
      </form>
      <div className="auth-form__foot">
        {isRegister ? (
          <p>Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); setPage({ name: 'login', register: false }); }} className="auth-link">Log In</a></p>
        ) : (
          <p>New to Reddit? <a href="#" onClick={(e) => { e.preventDefault(); setPage({ name: 'login', register: true }); }} className="auth-link">Sign Up</a></p>
        )}
      </div>
    </div>
  );
};