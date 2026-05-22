import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../context/AuthContext';
import './Search.scss';

function MiniProfileModal({ user, onClose, currentUser, onSendRequest }) {
  const workoutData = (user.workouts || []).map(d => ({ ...d, name: d.date.slice(0, 5) }));
  const isFriend = currentUser?.friends?.includes(user.id);
  const requested = currentUser?.friendRequests?.sent?.includes(user.id);
  const isMe = user.id === currentUser?.id;

  return (
    <div className="search-modal-overlay" onClick={onClose}>
      <div className="search-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="smodal-avatar">
          {user.avatar
            ? <img src={user.avatar} alt="" />
            : <span>{user.username[0].toUpperCase()}</span>
          }
        </div>
        <div className="smodal-name">{user.username}</div>
        <div className="smodal-handle">@{user.username}</div>

        {!isMe && !isFriend && (
          <button
            className={`btn-orange${requested ? ' disabled-btn' : ''}`}
            style={{ width: '100%', marginBottom: 20 }}
            onClick={() => !requested && onSendRequest(user.id)}
          >
            {requested ? 'Запрос отправлен' : 'Добавить в друзья'}
          </button>
        )}
        {isFriend && <div className="badge-friend" style={{ marginBottom: 20, display: 'inline-block' }}>✓ Друзья</div>}

        <div className="stat-grid" style={{ marginBottom: 16 }}>
          {[
            { label: 'Отжимания', value: user.stats?.totalPushups || 0 },
            { label: 'Рекорд', value: user.stats?.longestStreak || 0 },
            { label: 'Лайки', value: user.stats?.likes || 0 },
            { label: 'Друзья', value: (user.friends || []).length },
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
                <XAxis dataKey="name" tick={{ fill: '#555', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 11 }} />
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
  const { getAllUsers, currentUser, sendFriendRequest } = useAuth();
  const [query, setQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const allUsers = getAllUsers();

  const sorted = useMemo(() =>
    [...allUsers].sort((a, b) => (b.stats?.totalPushups || 0) - (a.stats?.totalPushups || 0)),
    [allUsers]
  );

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allUsers.filter(u => u.username.toLowerCase().includes(q));
  }, [query, allUsers]);

  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3, 9);

  return (
    <div className="search-page">
      <div className="search-header">
        <div className="search-page-title">ПОИСК</div>
      </div>

      <div className="search-box-wrap">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Поиск людей..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && <button className="search-clear" onClick={() => setQuery('')}>✕</button>}
        </div>
        <div className="search-hint">Попробуй: "@user1", "john"</div>
      </div>

      {query && (
        <div className="search-results">
          {searchResults.length === 0
            ? <div className="search-no-results">Никого не найдено</div>
            : searchResults.map(u => (
              <div key={u.id} className="user-row" onClick={() => setSelectedUser(u)} style={{ margin: '0 12px 6px' }}>
                <div className="user-row-avatar">{u.avatar ? <img src={u.avatar} alt="" /> : u.username[0].toUpperCase()}</div>
                <div className="user-row-info">
                  <span className="user-row-name">{u.username}</span>
                  <span className="user-row-sub">{u.stats?.totalPushups || 0} отжиманий</span>
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
            <span className="top-users-title">Топ пользователи</span>
          </div>

          <div className="top3-podium">
            {top3.length > 1 && (
              <div className="podium-item second" onClick={() => setSelectedUser(top3[1])}>
                <div className="podium-avatar">
                  {top3[1].avatar ? <img src={top3[1].avatar} alt="" /> : top3[1].username[0].toUpperCase()}
                </div>
                <div className="podium-name">{top3[1].username}</div>
                <div className="podium-handle">@{top3[1].username}</div>
                <div className="podium-bar second-bar">
                  <span className="podium-rank">TOP 2</span>
                </div>
              </div>
            )}
            {top3.length > 0 && (
              <div className="podium-item first" onClick={() => setSelectedUser(top3[0])}>
                <div className="podium-crown">👑</div>
                <div className="podium-avatar">
                  {top3[0].avatar ? <img src={top3[0].avatar} alt="" /> : top3[0].username[0].toUpperCase()}
                </div>
                <div className="podium-name">{top3[0].username}</div>
                <div className="podium-handle">@{top3[0].username}</div>
                <div className="podium-bar first-bar">
                  <span className="podium-rank">TOP 1</span>
                </div>
              </div>
            )}
            {top3.length > 2 && (
              <div className="podium-item third" onClick={() => setSelectedUser(top3[2])}>
                <div className="podium-avatar">
                  {top3[2].avatar ? <img src={top3[2].avatar} alt="" /> : top3[2].username[0].toUpperCase()}
                </div>
                <div className="podium-name">{top3[2].username}</div>
                <div className="podium-handle">@{top3[2].username}</div>
                <div className="podium-bar third-bar">
                  <span className="podium-rank">TOP 3</span>
                </div>
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
                  <span className="lb-handle">@{u.username}</span>
                </div>
                <div className="lb-score">
                  <span className="lb-score-label">ОТЖИМАНИЯ</span>
                  <span className="lb-score-val">{u.stats?.totalPushups || 0}</span>
                </div>
              </div>
            ))}
            {allUsers.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text3)', padding: '32px 0', fontSize: 14 }}>
                Зарегистрируйтесь, чтобы попасть в топ!
              </div>
            )}
          </div>
        </>
      )}

      {selectedUser && (
        <MiniProfileModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          currentUser={currentUser}
          onSendRequest={id => { sendFriendRequest(id); setSelectedUser(null); }}
        />
      )}
    </div>
  );
}
