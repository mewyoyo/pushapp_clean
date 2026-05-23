import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './Auth.scss';

export default function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) { setError('Fill in all fields'); return; }
    if (mode === 'register') {
      if (!email.trim()) { setError('Enter your email'); return; }
      const result = register(username.trim(), email.trim(), password);
      if (result.error) setError(result.error);
    } else {
      const result = login(username.trim(), password);
      if (result.error) setError(result.error);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-icon">⬆</span>
          <span className="auth-logo-text">PUSH-APP</span>
        </div>
        <p className="auth-tagline">Compete. Push up. Win.</p>

        <div className="auth-tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError(''); }}>Log In</button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setError(''); }}>Sign Up</button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label>Username</label>
            <input type="text" placeholder="username" value={username} onChange={e => setUsername(e.target.value)} />
          </div>
          {mode === 'register' && (
            <div className="auth-field">
              <label>Email</label>
              <input type="email" placeholder="example@gmail.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          )}
          <div className="auth-field">
            <label>Password</label>
            <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" className="btn-orange full">
            {mode === 'login' ? 'Log In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
