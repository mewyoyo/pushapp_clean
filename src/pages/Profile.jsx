import React, { useState, useRef, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { apiGetFollowers, apiGetFollowing } from '../api';
import './Profile.scss';

function StatCard({ label, value, onClick }) {
  return (
    <div className="stat-card" onClick={onClick} style={onClick ? { cursor: 'pointer' } : {}}>
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={onClick ? { color: 'var(--orange)' } : {}}>{value}</div>
    </div>
  );
}

// Точно такой же как в Feed — переиспользуем логику
function UserProfileView({ username, userId, onBack }) {
  const { currentUser, getUserProfile, toggleFollow, setFollowingLocal, isFollowing } = useAuth();
  const [profile, setProfile] = useState(null);
  const [following, setFollowing] = useState(isFollowing(userId));
  const isMe = String(userId) === String(currentUser?.id);

  useEffect(() => {
    if (username) getUserProfile(username).then(p => p && setProfile(p));
  }, [username]);

  async function handleFollow() {
    await toggleFollow(userId);
    const next = !following;
    setFollowing(next);
    setFollowingLocal(userId, next);
  }

  if (!profile) return (
    <div className="profile-view">
      <div className="profile-topbar"><button className="back-btn" onClick={onBack}>← Back</button></div>
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>Loading...</div>
    </div>
  );

  return (
    <div className="profile-view">
      <div className="profile-topbar">
        <button className="back-btn" onClick={onBack}>← Back</button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0 8px' }}>
        <div className="profile-avatar-big">
          {profile.profile_image_url
            ? <img src={profile.profile_image_url} alt="avatar" />
            : <span>{profile.username[0].toUpperCase()}</span>}
        </div>
      </div>
      <div className="profile-name-block">
        <h2>{profile.username}</h2>
        <div className="profile-follow-counts">
          <span><b>{profile.following_count || 0}</b> following</span>
          <span><b>{profile.followers_count || 0}</b> followers</span>
        </div>
      </div>
      {!isMe && (
        <div style={{ padding: '0 16px 16px' }}>
          <button className={`btn-orange full${following ? ' outline' : ''}`} onClick={handleFollow}>
            {following ? 'Unfollow' : 'Follow'}
          </button>
        </div>
      )}
      <div className="profile-section" style={{ padding: '0 16px' }}>
        <div className="section-title">Stats</div>
        <div className="section-subtitle">All time</div>
        <div className="stat-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginBottom: 8 }}>
          <StatCard label="Push-ups" value={profile.total_pushups || 0} />
          <StatCard label="Best set" value={profile.best_single_workout || 0} />
          <StatCard label="Likes" value={profile.total_likes_received || 0} />
        </div>
        <div className="stat-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <StatCard label="Streak" value={profile.current_streak || 0} />
          <StatCard label="Followers" value={profile.followers_count || 0} />
          <StatCard label="Following" value={profile.following_count || 0} />
        </div>
      </div>
    </div>
  );
}

// Модалка со списком followers/following
function UserListModal({ title, fetchFn, onClose, onViewUser }) {
  const { isFollowing, toggleFollow, setFollowingLocal, currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

  useEffect(() => {
    fetchFn()
      .then(data => setUsers(data || []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  const visible = users.slice(0, page * PAGE_SIZE);
  const hasMore = visible.length < users.length;

  async function handleToggle(e, user) {
    e.stopPropagation();
    const userId = user.id || user.user_id;
    const nowFollowing = !isFollowing(userId);
    await toggleFollow(userId);
    setFollowingLocal(userId, nowFollowing);
    // force re-render
    setUsers(prev => [...prev]);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', color: 'var(--text2)', fontSize: 20 }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading && <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 24 }}>Loading...</div>}
          {!loading && users.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 24 }}>Nobody here yet.</div>
          )}
          {visible.map(u => {
            const userId = u.id || u.user_id;
            const isMe = String(userId) === String(currentUser?.id);
            const following = isFollowing(userId);
            return (
              <div key={userId} className="user-row" onClick={() => { onClose(); onViewUser(u); }}>
                <div className="user-row-avatar">
                  {u.profile_image_url
                    ? <img src={u.profile_image_url} alt="" />
                    : (u.username || '?')[0].toUpperCase()}
                </div>
                <div className="user-row-info">
                  <span className="user-row-name">{u.username}</span>
                  <span className="user-row-sub">{u.total_pushups || 0} push-ups</span>
                </div>
                {!isMe && (
                  <button
                    className={`btn-orange small${following ? ' outline' : ''}`}
                    onClick={e => handleToggle(e, u)}
                  >
                    {following ? 'Unfollow' : 'Follow'}
                  </button>
                )}
              </div>
            );
          })}
          {hasMore && (
            <button className="load-more-btn" onClick={() => setPage(p => p + 1)}>
              Show more ↓
            </button>
          )}
        </div>
      </div>
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
  const [modal, setModal] = useState(null); // 'followers' | 'following' | null
  const [viewUser, setViewUser] = useState(null); // { username, userId }
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

  // Если открыт профиль другого юзера
  if (viewUser) {
    return (
      <div className="profile-page">
        <UserProfileView
          username={viewUser.username}
          userId={viewUser.userId}
          onBack={() => setViewUser(null)}
        />
      </div>
    );
  }

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

  function handleViewUser(u) {
    setViewUser({ username: u.username, userId: u.id || u.user_id });
  }

  return (
    <div className="profile-page">
      {/* Модалка followers */}
      {modal === 'followers' && (
        <UserListModal
          title={`Followers (${currentUser.followers_count || 0})`}
          fetchFn={() => apiGetFollowers()}
          onClose={() => setModal(null)}
          onViewUser={handleViewUser}
        />
      )}
      {/* Модалка following */}
      {modal === 'following' && (
        <UserListModal
          title={`Following (${currentUser.following_count || 0})`}
          fetchFn={() => apiGetFollowing()}
          onClose={() => setModal(null)}
          onViewUser={handleViewUser}
        />
      )}

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
              <StatCard
                label="Followers"
                value={currentUser.followers_count || 0}
                onClick={() => setModal('followers')}
              />
              <StatCard
                label="Following"
                value={currentUser.following_count || 0}
                onClick={() => setModal('following')}
              />
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
