import React, { useState, useRef, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../context/AuthContext';
import './Profile.scss';

const PAGE_SIZE = 5;

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

function ExpandableSection({ title, count, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="expandable-list">
      <button className="expandable-header" onClick={() => setOpen(v => !v)}>
        <span className="expandable-arrow">{open ? '▼' : '▶'}</span>
        <span className="expandable-title">{title} ({count})</span>
      </button>
      {open && <div className="expandable-body">{children}</div>}
    </div>
  );
}

export default function ProfilePage() {
  const {
    currentUser, refreshMyProfile, uploadAvatar,
    theme, toggleTheme,
    getMyWorkouts,
  } = useAuth();
  const [tab, setTab] = useState('stats');
  const [workouts, setWorkouts] = useState([]);
  const [loadingWorkouts, setLoadingWorkouts] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    if (tab === 'stats') {
      setLoadingWorkouts(true);
      getMyWorkouts().then(data => {
        setWorkouts(data || []);
        setLoadingWorkouts(false);
      });
    }
  }, [tab]);

  if (!currentUser) return null;

  // Build chart data from workouts grouped by date
  const chartData = (() => {
    const map = {};
    (workouts || []).forEach(w => {
      const d = new Date(w.created_at);
      const key = `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}`;
      map[key] = (map[key] || 0) + w.total_pushups;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count })).slice(-30);
  })();

  async function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    await uploadAvatar(file);
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-avatar-wrap" onClick={() => fileRef.current.click()}>
          {currentUser.profile_image_url
            ? <img src={currentUser.profile_image_url} alt="avatar" className="profile-avatar" />
            : <div className="profile-avatar placeholder">{(currentUser.username || '?')[0].toUpperCase()}</div>
          }
          <div className="avatar-edit-overlay">📷</div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
        </div>
      </div>

      <div className="profile-info-card">
        <div className="profile-info-left">
          <h2 className="profile-username">{currentUser.username}</h2>
          <div className="profile-follow-counts-row">
            <span><b>{currentUser.following_count || 0}</b> following</span>
            <span><b>{currentUser.followers_count || 0}</b> followers</span>
          </div>
        </div>
      </div>

      <div className="profile-tabs">
        <button className={tab === 'stats' ? 'active' : ''} onClick={() => setTab('stats')}>Stats</button>
        <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>Settings</button>
      </div>

      {tab === 'stats' && (
        <>
          <div className="profile-section" style={{ padding: '0 16px' }}>
            <div className="section-title">Stats</div>
            <div className="section-subtitle">All time</div>
            <div className="stat-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginBottom: 8 }}>
              <StatCard label="Push-ups" value={currentUser.total_pushups || 0} />
              <StatCard label="Best set" value={currentUser.best_single_workout || 0} />
              <StatCard label="Likes" value={currentUser.total_likes_received || 0} />
            </div>
            <div className="stat-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              <StatCard label="Streak" value={currentUser.current_streak || 0} />
              <StatCard label="Followers" value={currentUser.followers_count || 0} />
              <StatCard label="Following" value={currentUser.following_count || 0} />
            </div>
          </div>

          <div className="profile-section" style={{ padding: '0 16px' }}>
            <div className="section-title" style={{ marginBottom: 8 }}>Activity</div>
            <div className="chart-wrap">
              {loadingWorkouts
                ? <div className="empty-hint" style={{ textAlign: 'center', padding: '24px 0' }}>Loading...</div>
                : chartData.length === 0
                  ? <div className="empty-hint" style={{ textAlign: 'center', padding: '24px 0' }}>Record your first workout!</div>
                  : (
                    <ResponsiveContainer width="100%" height={160}>
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#e85d26" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#e85d26" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" tickCount={5} />
                        <YAxis tick={{ fill: '#888', fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                        <Tooltip
                          contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                          labelStyle={{ color: '#888' }}
                          itemStyle={{ color: '#e85d26' }}
                        />
                        <Area type="monotone" dataKey="count" name="Push-ups" stroke="#e85d26" strokeWidth={2} fill="url(#grad1)" dot={{ fill: '#e85d26', r: 3 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )
              }
            </div>
          </div>
        </>
      )}

      {tab === 'settings' && (
        <div className="settings-section">
          <div className="settings-item" onClick={toggleTheme} style={{ cursor: 'pointer' }}>
            <span>{theme === 'dark' ? '🌙 Dark mode' : '☀️ Light mode'}</span>
            <div className={`toggle${theme === 'dark' ? ' active' : ''}`} onClick={e => { e.stopPropagation(); toggleTheme(); }} />
          </div>
          <div className="settings-divider" />
          <div className="settings-item danger" style={{ cursor: 'pointer' }}>
            <span>🗑 Delete account</span>
          </div>
        </div>
      )}
    </div>
  );
}
