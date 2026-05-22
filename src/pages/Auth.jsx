import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './Auth.scss';

export default function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('Заполни все поля');
      return;
    }
    const result = mode === 'login' ? login(username, password) : register(username, password);
    if (result.error) setError(result.error);
  }

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-icon">⬆</span>
          <span className="auth-logo-text">PUSH-APP</span>
        </div>
        <p className="auth-tagline">Соревнуйся. Отжимайся. Побеждай.</p>

        <div className="auth-tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError(''); }}>Войти</button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setError(''); }}>Регистрация</button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label>Имя пользователя</label>
            <input
              type="text"
              placeholder="@username"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </div>
          <div className="auth-field">
            <label>Пароль</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" className="btn-orange full">
            {mode === 'login' ? 'Войти' : 'Создать аккаунт'}
          </button>
        </form>
      </div>
    </div>
  );
}
