import React, { useState, useRef } from 'react';
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

function ExpandableList({ title, users, emptyText, renderAction, onViewUser }) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const visible = users.slice(0, page * PAGE_SIZE);
  const hasMore = visible.length < users.length;

  return (
    <div className="expandable-list">
      <button className="expandable-header" onClick={() => setOpen(v => !v)}>
        <span className="expandable-arrow">{open ? '▼' : '▶'}</span>
        <span className="expandable-title">{title} ({users.length})</span>
      </button>
      {open && (
        <div className="expandable-body">
          {users.length === 0 && <div className="empty-hint">{emptyText}</div>}
          {visible.map(u => (
            <div key={u.id} className="user-row" onClick={() => onViewUser(u)}>
              <div className="user-row-avatar">{u.avatar ? <img src={u.avatar} alt="" /> : u.username[0].toUpperCase()}</div>
              <div className="user-row-info">
                <span className="user-row-name">{u.username}</span>
                <span className="user-row-sub">{u.stats?.totalPushups || 0} push-ups</span>
              </div>
              {renderAction(u)}
            </div>
          ))}
          {hasMore && (
            <button className="load-more-btn" onClick={e => { e.stopPropagation(); setPage(p => p + 1); }}>
              Load more ↓
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { currentUser, updateUser, getAllUsers, follow, unfollow, isFollowing, theme, toggleTheme } = useAuth();
  const [tab, setTab] = useState('social');
  const [viewUser, setViewUser] = useState(null);
  const fileRef = useRef();

  if (!currentUser) return null;

  const allUsers = getAllUsers();
  const followingUsers = (currentUser.following || []).map(id => allUsers.find(u => u.id === id)).filter(Boolean);
  const followerUsers = (currentUser.followers || []).map(id => allUsers.find(u => u.id === id)).filter(Boolean);
  const workoutData = (currentUser.workouts || []).map(d => ({ ...d, name: d.date.slice(0, 5) }));

  function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => updateUser({ avatar: ev.target.result });
    reader.readAsDataURL(file);
  }

  function handleFollowToggle(userId) {
    if (isFollowing(userId)) unfollow(userId);
    else follow(userId);
  }

  if (viewUser) {
    const fresh = allUsers.find(u => u.id === viewUser.id) || viewUser;
    const isMe = fresh.id === currentUser.id;
    const followingThem = isFollowing(fresh.id);
    const theirWorkoutData = (fresh.workouts || []).map(d => ({ ...d, name: d.date.slice(0, 5) }));

    return (
      <div className="profile-page">
        <div className="profile-topbar">
          <button className="back-btn" onClick={() => setViewUser(null)}>← Back</button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0 8px' }}>
          <div className="profile-avatar-big">
            {fresh.avatar ? <img src={fresh.avatar} alt="" /> : <span>{fresh.username[0].toUpperCase()}</span>}
          </div>
        </div>
        <div className="profile-name-block-center">
          <h2>{fresh.username}</h2>
          <div className="profile-follow-counts">
            <span><b>{(fresh.following || []).length}</b> following</span>
            <span><b>{(fresh.followers || []).length}</b> followers</span>
          </div>
        </div>
        {!isMe && (
          <div style={{ padding: '0 16px 16px' }}>
            <button
              className={`btn-orange full${followingThem ? ' outline' : ''}`}
              onClick={() => { handleFollowToggle(fresh.id); setViewUser({ ...fresh }); }}
            >
              {followingThem ? 'Unfollow' : 'Follow'}
            </button>
          </div>
        )}
        <div className="profile-section" style={{ padding: '0 16px' }}>
          <div className="section-title">Stats</div>
          <div className="stat-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginBottom: 8 }}>
            <StatCard label="Push-ups" value={fresh.stats?.totalPushups || 0} />
            <StatCard label="Best set" value={fresh.stats?.maxPushups || 0} />
            <StatCard label="Likes" value={fresh.stats?.likes || 0} />
          </div>
          <div className="stat-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
            <StatCard label="Streak" value={fresh.stats?.currentStreak || 0} />
            <StatCard label="Best streak" value={fresh.stats?.longestStreak || 0} />
            <StatCard label="Followers" value={(fresh.followers || []).length} />
          </div>
        </div>
        {theirWorkoutData.length > 0 && (
          <div className="profile-section" style={{ padding: '0 16px' }}>
            <div className="section-title">Activity</div>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={theirWorkoutData}>
                  <defs>
                    <linearGradient id="gradOther" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e85d26" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#e85d26" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" tickCount={5} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="count" stroke="#e85d26" strokeWidth={2} fill="url(#gradOther)" dot={{ fill: '#e85d26', r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-avatar-wrap" onClick={() => fileRef.current.click()}>
          {currentUser.avatar
            ? <img src={currentUser.avatar} alt="avatar" className="profile-avatar" />
            : <div className="profile-avatar placeholder">{currentUser.username[0].toUpperCase()}</div>
          }
          <div className="avatar-edit-overlay">📷</div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
        </div>
      </div>

      <div className="profile-info-card">
        <div className="profile-info-left">
          <h2 className="profile-username">{currentUser.username}</h2>
          <div className="profile-follow-counts-row">
            <span><b>{followingUsers.length}</b> following</span>
            <span><b>{followerUsers.length}</b> followers</span>
          </div>
        </div>
      </div>

      <div className="profile-tabs">
        <button className={tab === 'social' ? 'active' : ''} onClick={() => setTab('social')}>Social</button>
        <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>Settings</button>
      </div>

      {tab === 'social' && (
        <div className="social-section">
          <ExpandableList
            title="Following"
            users={followingUsers}
            emptyText="You're not following anyone yet. Find someone in Search!"
            onViewUser={setViewUser}
            renderAction={u => (
              <button className="btn-orange small outline" onClick={e => { e.stopPropagation(); unfollow(u.id); }}>
                Unfollow
              </button>
            )}
          />
          <ExpandableList
            title="Followers"
            users={followerUsers}
            emptyText="No followers yet."
            onViewUser={setViewUser}
            renderAction={u => {
              const f = isFollowing(u.id);
              return (
                <button className={`btn-orange small${f ? ' outline' : ''}`} onClick={e => { e.stopPropagation(); handleFollowToggle(u.id); }}>
                  {f ? 'Unfollow' : 'Follow'}
                </button>
              );
            }}
          />
        </div>
      )}

      {tab === 'settings' && (
        <div className="settings-section">
          <div className="settings-item" onClick={toggleTheme} style={{ cursor: 'pointer' }}>
            <span>{theme === 'dark' ? '🌙 Dark mode' : '☀️ Light mode'}</span>
            <div className={`toggle${theme === 'dark' ? ' active' : ''}`} onClick={e => { e.stopPropagation(); toggleTheme(); }} />
          </div>
          <div className="settings-item" onClick={() => updateUser({ showStats: !currentUser.showStats })} style={{ cursor: 'pointer' }}>
            <span>📊 Show statistics</span>
            <div className={`toggle${currentUser.showStats !== false ? ' active' : ''}`} />
          </div>
          <div className="settings-divider" />
          <div className="settings-item danger" style={{ cursor: 'pointer' }}>
            <span>🗑 Delete account</span>
          </div>
        </div>
      )}

      <div className="profile-section" style={{ padding: '0 16px' }}>
        <div className="section-title">Stats</div>
        <div className="section-subtitle">All time</div>
        <div className="stat-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginBottom: 8 }}>
          <StatCard label="Push-ups" value={currentUser.stats?.totalPushups || 0} />
          <StatCard label="Best set" value={currentUser.stats?.maxPushups || 0} />
          <StatCard label="Likes" value={currentUser.stats?.likes || 0} />
        </div>
        <div className="stat-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <StatCard label="Streak" value={currentUser.stats?.currentStreak || 0} />
          <StatCard label="Best streak" value={currentUser.stats?.longestStreak || 0} />
          <StatCard label="Followers" value={followerUsers.length} />
        </div>
      </div>

      <div className="profile-section" style={{ padding: '0 16px' }}>
        <div className="section-title" style={{ marginBottom: 8 }}>Activity</div>
        <div className="chart-wrap">
          {workoutData.length === 0
            ? <div className="empty-hint" style={{ textAlign: 'center', padding: '24px 0' }}>Record your first workout!</div>
            : (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={workoutData}>
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
    </div>
  );
}
