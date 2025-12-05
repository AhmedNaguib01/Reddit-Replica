import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { X, ArrowLeft } from 'lucide-react';
import '../../styles/LoginModal.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const LoginModal = ({ isOpen, onClose }) => {
  const [mode, setMode] = useState('login'); // 'login', 'signup-email', 'signup-details', 'forgot-password', 'forgot-success'
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login } = useAuth();

  const resetForm = () => {
    setEmail('');
    setUsername('');
    setPassword('');
    setError('');
    setLoading(false);
    setGoogleLoading(false);
  };

  const handleClose = () => {
    resetForm();
    setMode('login');
    onClose();
  };

  // Handle Google Sign-In response
  const handleGoogleResponse = useCallback(async (response) => {
    if (!response.credential) {
      setError('Google sign-in failed. Please try again.');
      return;
    }

    setGoogleLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });

      const data = await res.json();

      if (res.ok) {
        login(data.user, data.token);
        handleClose();
      } else {
        setError(data.message || 'Google authentication failed');
      }
    } catch (err) {
      console.error('Google auth error:', err);
      setError('Network error. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  }, [login]);

  // Initialize Google Sign-In
  useEffect(() => {
    if (!isOpen || !GOOGLE_CLIENT_ID || !window.google) return;

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
        });

        // Render button for login mode
        const loginBtn = document.getElementById('google-signin-btn-login');
        if (loginBtn) {
          window.google.accounts.id.renderButton(loginBtn, {
            theme: 'outline',
            size: 'large',
            width: '100%',
            text: 'continue_with',
          });
        }

        // Render button for signup mode
        const signupBtn = document.getElementById('google-signin-btn-signup');
        if (signupBtn) {
          window.google.accounts.id.renderButton(signupBtn, {
            theme: 'outline',
            size: 'large',
            width: '100%',
            text: 'continue_with',
          });
        }
      } catch (err) {
        console.error('Google Sign-In initialization error:', err);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isOpen, mode, handleGoogleResponse]);

  // Check if email is available and continue to next step
  const handleEmailContinue = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email.trim()) {
      setError('Please enter your email');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Invalid email');
        return;
      }

      if (!data.available) {
        setError('Email already in use');
        return;
      }

      // Email is available, proceed to next step
      setMode('signup-details');
    } catch (error) {
      console.error('Email check error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle signup with email, username, and password
  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        login(data.user, data.token);
        handleClose();
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Signup error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        login(data.user, data.token);
        handleClose();
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle forgot password
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email.trim()) {
      setError('Please enter your email');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMode('forgot-success');
      } else {
        setError(data.message || 'Failed to send reset email');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const switchToSignup = () => {
    resetForm();
    setMode('signup-email');
  };

  const switchToLogin = () => {
    resetForm();
    setMode('login');
  };

  const goBack = () => {
    setError('');
    if (mode === 'signup-details') {
      setMode('signup-email');
    } else if (mode === 'forgot-password' || mode === 'forgot-success') {
      setMode('login');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="modal-close-btn" onClick={handleClose}>
          <X size={20} />
        </button>

        {(mode === 'signup-details' || mode === 'forgot-password' || mode === 'forgot-success') && (
          <button className="modal-back-btn" onClick={goBack}>
            <ArrowLeft size={20} />
          </button>
        )}

        {/* LOGIN MODE */}
        {mode === 'login' && (
          <>
            <div className="modal-header">
              <h2>Log In</h2>
              <p className="legal-text">
                By continuing, you agree to our <Link to="/user-agreement" onClick={handleClose}>User Agreement</Link> and acknowledge that you understand the <Link to="/privacy" onClick={handleClose}>Privacy Policy</Link>.
              </p>
            </div>

            {GOOGLE_CLIENT_ID && (
              <>
                <div className="auth-buttons">
                  <div id="google-signin-btn-login" className="google-btn-container"></div>
                  {googleLoading && <p className="google-loading">Signing in with Google...</p>}
                </div>
                <div className="divider"><span>OR</span></div>
              </>
            )}

            <form className="login-form" onSubmit={handleLogin}>
              {error && <div className="error-message">{error}</div>}
              
              <div className="input-group">
                <input 
                  type="text" 
                  placeholder="Username *" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              
              <div className="input-group">
                <input 
                  type="password" 
                  placeholder="Password *" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-footer">
                <p>Forgot your <a href="#" onClick={(e) => { e.preventDefault(); setMode('forgot-password'); setError(''); }}>password</a>?</p>
              </div>

              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? 'Please wait...' : 'Log In'}
              </button>
            </form>

            <div className="modal-footer">
              New to Reddit? <a href="#" onClick={(e) => { e.preventDefault(); switchToSignup(); }}>Sign Up</a>
            </div>
          </>
        )}

        {/* SIGNUP - EMAIL STEP */}
        {mode === 'signup-email' && (
          <>
            <div className="modal-header">
              <h2>Sign Up</h2>
              <p className="legal-text">
                By continuing, you agree to our <Link to="/user-agreement" onClick={handleClose}>User Agreement</Link> and acknowledge that you understand the <Link to="/privacy" onClick={handleClose}>Privacy Policy</Link>.
              </p>
            </div>

            {GOOGLE_CLIENT_ID && (
              <>
                <div className="auth-buttons">
                  <div id="google-signin-btn-signup" className="google-btn-container"></div>
                  {googleLoading && <p className="google-loading">Signing in with Google...</p>}
                </div>
                <div className="divider"><span>OR</span></div>
              </>
            )}

            <form className="login-form" onSubmit={handleEmailContinue}>
              {error && <div className="error-message">{error}</div>}
              
              <div className="input-group">
                <input 
                  type="email" 
                  placeholder="Email *" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? 'Please wait...' : 'Continue'}
              </button>
            </form>

            <div className="modal-footer">
              Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); switchToLogin(); }}>Log In</a>
            </div>
          </>
        )}

        {/* SIGNUP - USERNAME & PASSWORD STEP */}
        {mode === 'signup-details' && (
          <>
            <div className="modal-header">
              <h2>Create your username and password</h2>
              <p className="legal-text">
                Reddit is anonymous, so your username is what you'll go by here. Choose wisely, because once you get a name, you can't change it.
              </p>
            </div>

            <form className="login-form" onSubmit={handleSignup}>
              {error && <div className="error-message">{error}</div>}
              
              <div className="input-group">
                <input 
                  type="text" 
                  placeholder="Username *" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              
              <div className="input-group">
                <input 
                  type="password" 
                  placeholder="Password *" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? 'Please wait...' : 'Sign Up'}
              </button>
            </form>
          </>
        )}

        {/* FORGOT PASSWORD */}
        {mode === 'forgot-password' && (
          <>
            <div className="modal-header">
              <h2>Reset your password</h2>
              <p className="legal-text">
                Enter the email associated with your account and we'll send you a link to reset your password.
              </p>
            </div>

            <form className="login-form" onSubmit={handleForgotPassword}>
              {error && <div className="error-message">{error}</div>}
              
              <div className="input-group">
                <input 
                  type="email" 
                  placeholder="Email *" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? 'Please wait...' : 'Send Reset Link'}
              </button>
            </form>
          </>
        )}

        {/* FORGOT PASSWORD SUCCESS */}
        {mode === 'forgot-success' && (
          <>
            <div className="modal-header">
              <h2>Check your email</h2>
              <p className="legal-text">
                If an account exists for <strong>{email}</strong>, you'll receive a password reset link shortly.
              </p>
            </div>

            <button className="btn-submit" onClick={switchToLogin}>
              Back to Log In
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default LoginModal;
