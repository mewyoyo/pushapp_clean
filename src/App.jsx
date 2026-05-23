import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/Auth';
import FeedPage from './pages/Feed';
import WorkoutPage from './pages/Workout';
import SearchPage from './pages/Search';
import ProfilePage from './pages/Profile';
import './styles/globals.scss';

function NavIcon({ path, icon, label }) {
  const navigate = useNavigate();
  const loc = useLocation();
  const active = loc.pathname === path;
  return (
    <button className={`nav-item${active ? ' active' : ''}`} onClick={() => navigate(path)}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9,22 9,12 15,12 15,22" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function AppShell() {
  const { currentUser, loading, logout } = useAuth();
  const navigate = useNavigate();

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0a' }}>
      <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 32, color: '#e85d26', letterSpacing: 3 }}>PUSH-APP</div>
    </div>
  );

  if (!currentUser) return <AuthPage />;

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="topbar-btn" onClick={logout}>✕</button>
        <span className="topbar-title">Push-App</span>
        <button className="topbar-btn primary" onClick={() => navigate('/workout')}>↑</button>
      </header>

      <main className="page-content">
        <Routes>
          <Route path="/" element={<FeedPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/workout" element={<WorkoutPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </main>

      <nav className="bottom-nav">
        <NavIcon path="/" icon={<HomeIcon />} label="Лента" />
        <NavIcon path="/search" icon={<SearchIcon />} label="Поиск" />
        <NavIcon path="/workout" icon={<CameraIcon />} label="Запись" />
        <NavIcon path="/profile" icon={<ProfileIcon />} label="Профиль" />
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  );
}
