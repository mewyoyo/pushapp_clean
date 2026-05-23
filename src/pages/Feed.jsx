import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './Feed.scss';

const PUSHUP_GIF = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 60'%3E%3Crect width='100' height='60' fill='%23141414'/%3E%3Ctext x='50' y='35' text-anchor='middle' font-size='28'%3E🤸%3C/text%3E%3C/svg%3E";

function WorkoutCard({ workout, onLike, onViewProfile }) {
  const { currentUser, sendFriendRequest } = useAuth();
  const isOld = Date.now() - workout.timestamp > 24 * 3600 * 1000;
  const showVideo = workout.isPublic && workout.videoUrl && !isOld;
  const isLiked = workout.likedBy?.includes(currentUser?.id);
  const isFriend = currentUser?.friends?.includes(workout.userId);
  const isMe = workout.userId === currentUser?.id;
  const requested = currentUser?.friendRequests?.sent?.includes(workout.userId);
  const dt = new Date(workout.timestamp);
  const timeStr = dt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) + ' · ' + dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

  return (
    <div className="feed-card">
      <div className="feed-card-header" onClick={() => onViewProfile(workout.userId)}>
        <div className="feed-avatar">
          {workout.avatar
            ? <img src={workout.avatar} alt="" />
            : <span>{(workout.username || '?')[0].toUpperCase()}</span>
          }
        </div>
        <div className="feed-user-info">
          <span className="feed-username">{workout.username}</span>
          <span className="feed-workout-type">Push-Ups · {timeStr}</span>
        </div>
      </div>

      <div className="feed-media">
        {showVideo
          ? <video src={workout.videoUrl} controls className="feed-video" />
          : <div className="feed-placeholder">
              <span className="feed-placeholder-emoji">🤸</span>
              {isOld && <span className="feed-expired-badge">Видео устарело (24ч+)</span>}
              {!workout.isPublic && <span className="feed-private-badge">🔒 Приватное</span>}
            </div>
        }
      </div>

      <div className="feed-stats-row">
        <div className="feed-streak">
          <span className="feed-streak-num">{workout.pushups}</span>
          <span className="feed-streak-label">ОТЖИМАНИЙ</span>
        </div>
        <div className="feed-verified">
          <span className="check-icon">✓</span>
          <span>AI verified</span>
        </div>
      </div>

      <div className="feed-actions">
        <button className={`feed-action-btn${isLiked ? ' liked' : ''}`} onClick={() => onLike(workout.id)}>
          <span>{isLiked ? '❤️' : '🤍'}</span>
          <span>{workout.likes || 0}</span>
        </button>
        {!isMe && !isFriend && (
          <button
            className={`feed-action-btn${requested ? ' disabled' : ''}`}
            onClick={() => !requested && sendFriendRequest(workout.userId)}
          >
            <span>👥</span>
            <span>{requested ? 'Запрос отправлен' : 'Добавить'}</span>
          </button>
        )}
        {isFriend && <span className="badge-friend small">✓ Друг</span>}
      </div>
    </div>
  );
}

export default function FeedPage() {
  const { getGlobalFeed, getFriendsFeed, likeWorkout, getAllUsers } = useAuth();
  const [tab, setTab] = useState('for_you');
  const [feed, setFeed] = useState([]);
  const [viewUserId, setViewUserId] = useState(null);

  useEffect(() => {
    refresh();
  }, [tab]);

  function refresh() {
    const raw = tab === 'for_you' ? getGlobalFeed() : getFriendsFeed();
    setFeed(raw);
  }

  function handleLike(id) {
    likeWorkout(id);
    refresh();
  }

  const viewUser = viewUserId ? getAllUsers().find(u => u.id === viewUserId) : null;

  if (viewUser) {
    return (
      <div className="feed-page">
        <div className="profile-topbar" style={{ padding: '14px 16px' }}>
          <button className="back-btn" style={{ background: 'none', color: 'var(--orange)', fontSize: 15, fontWeight: 600 }} onClick={() => setViewUserId(null)}>← Назад</button>
        </div>
        <MiniProfile user={viewUser} />
      </div>
    );
  }

  return (
    <div className="feed-page">
      <div className="feed-header">
        <div className="feed-title">ЛЕНТА</div>
        <div className="feed-title-sub">Verified counts from AI vision</div>
      </div>

      <div className="feed-tabs">
        <button className={tab === 'for_you' ? 'active' : ''} onClick={() => setTab('for_you')}>Для вас</button>
        <button className={tab === 'following' ? 'active' : ''} onClick={() => setTab('following')}>Друзья</button>
      </div>

      <div className="feed-list">
        {feed.length === 0 && (
          <div className="feed-empty">
            <div className="feed-empty-icon">🏋️</div>
            <div>Пока нет тренировок.</div>
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>Запиши свою первую!</div>
          </div>
        )}
        {feed.map(w => (
          <WorkoutCard
            key={w.id}
            workout={w}
            onLike={handleLike}
            onViewProfile={id => setViewUserId(id)}
          />
        ))}
      </div>
    </div>
  );
}

function MiniProfile({ user }) {
  const { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } = require('recharts');
  const workoutData = (user.workouts || []).map(d => ({ ...d, name: d.date.slice(0, 5) }));

  return (
    <div style={{ padding: '0 16px 60px' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--bg3)', border: '3px solid var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 700, overflow: 'hidden' }}>
          {user.avatar ? <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : user.username[0].toUpperCase()}
        </div>
      </div>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 28 }}>{user.username}</div>
        <div style={{ color: 'var(--text2)', fontSize: 13 }}>@{user.username}</div>
      </div>
      <div className="section-title" style={{ marginBottom: 4 }}>Статистика</div>
      <div className="section-subtitle">За всё время</div>
      <div className="stat-grid" style={{ marginBottom: 20 }}>
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
        <>
          <div className="section-title" style={{ marginBottom: 8 }}>Активность</div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={workoutData}>
                <defs>
                  <linearGradient id="gradFeed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e85d26" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#e85d26" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="count" stroke="#e85d26" strokeWidth={2} fill="url(#gradFeed)" dot={{ fill: '#e85d26', r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
