import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../context/AuthContext';
import './Search.scss';

function MiniProfileModal({ user, onClose }) {
  const { currentUser, follow, unfollow, isFollowing, getAllUsers } = useAuth();
  const [following, setFollowing] = useState(isFollowing(user.id));
  const allUsers = getAllUsers();
  const freshUser = allUsers.find(u => u.id === user.id) || user;
  const workoutData = (freshUser.workouts || []).map(d => ({ ...d, name: d.date.slice(0, 5) }));
  const isMe = user.id === currentUser?.id;

  function handleFollow() {
    if (following) { unfollow(user.id); setFollowing(false); }
    else { follow(user.id); setFollowing(true); }
  }

  return (
    <div className="search-modal-overlay" onClick={onClose}>
      <div className="search-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="smodal-avatar">
          {freshUser.avatar ? <img src={freshUser.avatar} alt="" /> : <span>{freshUser.username[0].toUpperCase()}</span>}
        </div>
        <div className="smodal-name">{freshUser.username}</div>
        <div className="smodal-follow-counts">
          <span><b>{(freshUser.following || []).length}</b> following</span>
          <span><b>{(freshUser.followers || []).length}</b> followers</span>
        </div>
        {!isMe && (
          <button className={`btn-orange${following ? ' outline' : ''}`} style={{ width: '100%', marginBottom: 16 }} onClick={handleFollow}>
            {following ? 'Unfollow' : 'Follow'}
          </button>
        )}
        <div className="stat-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginBottom: 8 }}>
          {[
            { label: 'Push-ups', value: freshUser.stats?.totalPushups || 0 },
            { label: 'Best set', value: freshUser.stats?.maxPushups || 0 },
            { label: 'Likes', value: freshUser.stats?.likes || 0 },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
            </div>
          ))}
        </div>
        <div className="stat-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginBottom: 16 }}>
          {[
            { label: 'Streak', value: freshUser.stats?.currentStreak || 0 },
            { label: 'Best streak', value: freshUser.stats?.longestStreak || 0 },
            { label: 'Followers', value: (freshUser.followers || []).length },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
            </div>
          ))}
        </div>
        {workoutData.length > 0 && (
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={workoutData}>
                <defs>
                  <linearGradient id="gradSearch" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e85d26" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#e85d26" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }} />
                <Area type="monotone" dataKey="count" stroke="#e85d26" strokeWidth={2} fill="url(#gradSearch)" dot={{ fill: '#e85d26', r: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  const { getAllUsers, getLeaderboard } = useAuth();
  const [query, setQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  const leaderboard = useMemo(() => getLeaderboard(), [getAllUsers()]);
  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3, 9);

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().replace(/^@/, '');
    return getAllUsers().filter(u => u.username.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="search-page">
      <div className="search-header">
        <div className="search-page-title">SEARCH</div>
      </div>

      <div className="search-box-wrap">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search people..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && <button className="search-clear" onClick={() => setQuery('')}>✕</button>}
        </div>
        <div className="search-hint">Try: "user1", "John"</div>
      </div>

      {query && (
        <div className="search-results">
          {searchResults.length === 0
            ? <div className="search-no-results">No one found</div>
            : searchResults.map(u => (
              <div key={u.id} className="user-row" onClick={() => setSelectedUser(u)} style={{ margin: '0 12px 6px' }}>
                <div className="user-row-avatar">{u.avatar ? <img src={u.avatar} alt="" /> : u.username[0].toUpperCase()}</div>
                <div className="user-row-info">
                  <span className="user-row-name">{u.username}</span>
                  <span className="user-row-sub">{u.stats?.totalPushups || 0} push-ups</span>
                </div>
                <span className="user-row-chevron">→</span>
              </div>
            ))
          }
        </div>
      )}

      {!query && (
        <>
          <div className="top-users-header">
            <span className="top-users-title">Top by best single set</span>
          </div>

          <div className="top3-podium">
            {top3.length > 1 && (
              <div className="podium-item second" onClick={() => setSelectedUser(top3[1])}>
                <div className="podium-avatar">{top3[1].avatar ? <img src={top3[1].avatar} alt="" /> : top3[1].username[0].toUpperCase()}</div>
                <div className="podium-name">{top3[1].username}</div>
                <div className="podium-score">{top3[1].stats?.maxPushups || 0}</div>
                <div className="podium-bar second-bar"><span className="podium-rank">TOP 2</span></div>
              </div>
            )}
            {top3.length > 0 && (
              <div className="podium-item first" onClick={() => setSelectedUser(top3[0])}>
                <div className="podium-crown">👑</div>
                <div className="podium-avatar">{top3[0].avatar ? <img src={top3[0].avatar} alt="" /> : top3[0].username[0].toUpperCase()}</div>
                <div className="podium-name">{top3[0].username}</div>
                <div className="podium-score">{top3[0].stats?.maxPushups || 0}</div>
                <div className="podium-bar first-bar"><span className="podium-rank">TOP 1</span></div>
              </div>
            )}
            {top3.length > 2 && (
              <div className="podium-item third" onClick={() => setSelectedUser(top3[2])}>
                <div className="podium-avatar">{top3[2].avatar ? <img src={top3[2].avatar} alt="" /> : top3[2].username[0].toUpperCase()}</div>
                <div className="podium-name">{top3[2].username}</div>
                <div className="podium-score">{top3[2].stats?.maxPushups || 0}</div>
                <div className="podium-bar third-bar"><span className="podium-rank">TOP 3</span></div>
              </div>
            )}
          </div>

          <div className="leaderboard-rest">
            {rest.map((u, i) => (
              <div key={u.id} className="lb-row" onClick={() => setSelectedUser(u)}>
                <span className="lb-rank">{i + 4}</span>
                <div className="lb-avatar">{u.avatar ? <img src={u.avatar} alt="" /> : u.username[0].toUpperCase()}</div>
                <div className="lb-info">
                  <span className="lb-name">{u.username}</span>
                  <span className="lb-handle">{u.stats?.totalPushups || 0} push-ups total</span>
                </div>
                <div className="lb-score">
                  <span className="lb-score-label">BEST SET</span>
                  <span className="lb-score-val">{u.stats?.maxPushups || 0}</span>
                </div>
              </div>
            ))}
            {leaderboard.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text3)', padding: '32px 0', fontSize: 14 }}>
                Sign up to make the leaderboard!
              </div>
            )}
          </div>
        </>
      )}

      {selectedUser && <MiniProfileModal user={selectedUser} onClose={() => setSelectedUser(null)} />}
    </div>
  );
}
