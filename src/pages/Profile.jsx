import React, { useState, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useAuth } from '../context/AuthContext';
import './Profile.scss';

function StatCard({ label, value, delta }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {delta !== undefined && <div className="stat-delta">+{delta}</div>}
    </div>
  );
}

function UserProfileView({ user, onBack }) {
  const { currentUser, sendFriendRequest } = useAuth();
  const workoutData = (user.workouts || []).map(d => ({ ...d, name: d.date.slice(0, 5) }));
  const isFriend = currentUser?.friends?.includes(user.id);
  const requested = currentUser?.friendRequests?.sent?.includes(user.id);

  return (
    <div className="profile-view">
      <div className="profile-topbar">
        <button className="back-btn" onClick={onBack}>← Назад</button>
      </div>
      <div className="profile-avatar-wrap mini">
        {user.avatar
          ? <img src={user.avatar} alt="avatar" className="profile-avatar" />
          : <div className="profile-avatar placeholder">{user.username[0].toUpperCase()}</div>
        }
      </div>
      <div className="profile-name-block">
        <h2>{user.username}</h2>
        <span className="profile-handle">@{user.username}</span>
      </div>
      {!isFriend && (
        <button
          className={`btn-orange${requested ? ' disabled' : ''}`}
          style={{ margin: '0 16px 16px', display: 'block' }}
          onClick={() => !requested && sendFriendRequest(user.id)}
        >
          {isFriend ? 'Друзья ✓' : requested ? 'Запрос отправлен' : 'Добавить в друзья'}
        </button>
      )}
      <div className="profile-section" style={{ padding: '0 16px' }}>
        <div className="section-title">Статистика</div>
        <div className="section-subtitle">За всё время</div>
        <div className="stat-grid">
          <StatCard label="Отжимания" value={user.stats?.totalPushups || 0} />
          <StatCard label="Рекорд серии" value={user.stats?.longestStreak || 0} />
          <StatCard label="Лайки" value={user.stats?.likes || 0} />
          <StatCard label="Друзья" value={(user.friends || []).length} />
        </div>
      </div>
      {workoutData.length > 0 && (
        <div className="profile-section" style={{ padding: '0 16px' }}>
          <div className="section-title">Активность</div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={workoutData}>
                <defs>
                  <linearGradient id="grad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e85d26" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#e85d26" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="count" stroke="#e85d26" strokeWidth={2} fill="url(#grad2)" dot={{ fill: '#e85d26', r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { currentUser, updateUser, acceptFriendRequest, getAllUsers } = useAuth();
  const [tab, setTab] = useState('followers');
  const [viewUser, setViewUser] = useState(null);
  const fileRef = useRef();
  const [showSettings, setShowSettings] = useState(false);

  if (!currentUser) return null;

  if (viewUser) return <UserProfileView user={viewUser} onBack={() => setViewUser(null)} />;

  const allUsers = getAllUsers();
  const sentReqs = (currentUser.friendRequests?.sent || []).map(id => allUsers.find(u => u.id === id)).filter(Boolean);
  const receivedReqs = (currentUser.friendRequests?.received || []).map(id => allUsers.find(u => u.id === id)).filter(Boolean);
  const friends = (currentUser.friends || []).map(id => allUsers.find(u => u.id === id)).filter(Boolean);

  const workoutData = (currentUser.workouts || []).map(d => ({ ...d, name: d.date.slice(0, 5) }));

  function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => updateUser({ avatar: ev.target.result });
    reader.readAsDataURL(file);
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
          <span className="profile-handle">@{currentUser.username}</span>
        </div>
        <button className="btn-orange" onClick={() => setShowSettings(true)}>Редактировать</button>
      </div>

      <div className="profile-tabs">
        <button className={tab === 'followers' ? 'active' : ''} onClick={() => setTab('followers')}>Друзья</button>
        <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>Настройки</button>
      </div>

      {tab === 'followers' && (
        <div className="friends-section">
          {receivedReqs.length > 0 && (
            <div className="friends-group">
              <div className="friends-group-title">Входящие запросы</div>
              {receivedReqs.map(u => (
                <div key={u.id} className="user-row" onClick={() => setViewUser(u)}>
                  <div className="user-row-avatar">{u.avatar ? <img src={u.avatar} alt="" /> : u.username[0].toUpperCase()}</div>
                  <div className="user-row-info">
                    <span className="user-row-name">{u.username}</span>
                    <span className="user-row-handle">@{u.username}</span>
                  </div>
                  <button className="btn-orange small" onClick={e => { e.stopPropagation(); acceptFriendRequest(u.id); }}>
                    Принять
                  </button>
                </div>
              ))}
            </div>
          )}

          {sentReqs.length > 0 && (
            <div className="friends-group">
              <div className="friends-group-title">Исходящие запросы</div>
              {sentReqs.map(u => (
                <div key={u.id} className="user-row" onClick={() => setViewUser(u)}>
                  <div className="user-row-avatar">{u.avatar ? <img src={u.avatar} alt="" /> : u.username[0].toUpperCase()}</div>
                  <div className="user-row-info">
                    <span className="user-row-name">{u.username}</span>
                    <span className="user-row-handle">@{u.username}</span>
                  </div>
                  <span className="badge-pending">Ожидание</span>
                </div>
              ))}
            </div>
          )}

          <div className="friends-group">
            <div className="friends-group-title">Друзья ({friends.length})</div>
            {friends.length === 0 && <div className="empty-hint">Ещё нет друзей. Найди кого-нибудь в поиске!</div>}
            {friends.map(u => (
              <div key={u.id} className="user-row" onClick={() => setViewUser(u)}>
                <div className="user-row-avatar">{u.avatar ? <img src={u.avatar} alt="" /> : u.username[0].toUpperCase()}</div>
                <div className="user-row-info">
                  <span className="user-row-name">{u.username}</span>
                  <span className="user-row-sub">{u.stats?.totalPushups || 0} отжиманий</span>
                </div>
                <span className="badge-friend">✓ Друг</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <div className="settings-section">
          <div className="settings-item">
            <span>🔔 Уведомления</span>
            <div className="toggle active" />
          </div>
          <div className="settings-item">
            <span>🔒 Приватный аккаунт</span>
            <div className="toggle" />
          </div>
          <div className="settings-item">
            <span>🌙 Тёмная тема</span>
            <div className="toggle active" />
          </div>
          <div className="settings-item">
            <span>📊 Показывать статистику</span>
            <div className="toggle active" />
          </div>
          <div className="settings-divider" />
          <div className="settings-item danger">
            <span>🗑 Удалить аккаунт</span>
          </div>
        </div>
      )}

      <div className="profile-section">
        <div className="section-title">Статистика</div>
        <div className="section-subtitle">Последние 30 дней</div>
        <div className="stat-grid">
          <StatCard label="Отжимания" value={currentUser.stats?.totalPushups || 0} delta={12} />
          <StatCard label="Лайки" value={currentUser.stats?.likes || 0} delta={7} />
          <StatCard label="Рекорд серии" value={currentUser.stats?.longestStreak || 0} delta={4} />
          <StatCard label="Друзья" value={friends.length} delta={friends.length} />
        </div>
      </div>

      <div className="profile-section">
        <div className="section-title" style={{ marginBottom: 8 }}>Активность</div>
        <div className="chart-wrap">
          {workoutData.length === 0
            ? <div className="empty-hint" style={{ textAlign: 'center', padding: '24px 0' }}>Сделай первую тренировку!</div>
            : (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={workoutData}>
                  <defs>
                    <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e85d26" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#e85d26" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip
                    contentStyle={{ background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#888' }}
                    itemStyle={{ color: '#e85d26' }}
                  />
                  <Area type="monotone" dataKey="count" name="Отжимания" stroke="#e85d26" strokeWidth={2} fill="url(#grad1)" dot={{ fill: '#e85d26', r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            )
          }
        </div>
      </div>

      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>Редактировать профиль</h3>
            <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 8 }}>
              Нажми на аватар в профиле, чтобы сменить фото. Имя пользователя задаётся при регистрации.
            </p>
            <button className="btn-orange full" style={{ marginTop: 20 }} onClick={() => setShowSettings(false)}>Закрыть</button>
          </div>
        </div>
      )}
    </div>
  );
}
