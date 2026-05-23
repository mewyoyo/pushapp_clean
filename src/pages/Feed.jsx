import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../context/AuthContext';
import './Feed.scss';

const PUSHUP_GIF = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 120'%3E%3Crect width='200' height='120' fill='%23141414'/%3E%3Ctext x='100' y='65' text-anchor='middle' font-size='52'%3E🤸%3C/text%3E%3C/svg%3E";

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

function UserProfileView({ user, onBack }) {
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
    <div className="profile-view">
      <div className="profile-topbar">
        <button className="back-btn" onClick={onBack}>← Back</button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0 8px' }}>
        <div className="profile-avatar-big">
          {freshUser.avatar ? <img src={freshUser.avatar} alt="avatar" /> : <span>{freshUser.username[0].toUpperCase()}</span>}
        </div>
      </div>
      <div className="profile-name-block">
        <h2>{freshUser.username}</h2>
        <div className="profile-follow-counts">
          <span><b>{(freshUser.following || []).length}</b> following</span>
          <span><b>{(freshUser.followers || []).length}</b> followers</span>
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
          <StatCard label="Push-ups" value={freshUser.stats?.totalPushups || 0} />
          <StatCard label="Best set" value={freshUser.stats?.maxPushups || 0} />
          <StatCard label="Likes" value={freshUser.stats?.likes || 0} />
        </div>
        <div className="stat-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <StatCard label="Streak" value={freshUser.stats?.currentStreak || 0} />
          <StatCard label="Best streak" value={freshUser.stats?.longestStreak || 0} />
          <StatCard label="Followers" value={(freshUser.followers || []).length} />
        </div>
      </div>
      {workoutData.length > 0 && (
        <div className="profile-section" style={{ padding: '0 16px' }}>
          <div className="section-title">Activity</div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={workoutData}>
                <defs>
                  <linearGradient id="gradFeedProfile" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e85d26" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#e85d26" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" tickCount={5} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="count" stroke="#e85d26" strokeWidth={2} fill="url(#gradFeedProfile)" dot={{ fill: '#e85d26', r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function WorkoutCard({ workout, onLike, onViewProfile }) {
  const { currentUser, follow, unfollow, isFollowing } = useAuth();
  const [following, setFollowing] = useState(isFollowing(workout.userId));
  const isOld = Date.now() - workout.timestamp > 24 * 3600 * 1000;
  const showVideo = workout.isPublic && workout.videoUrl && !isOld;
  const isLiked = workout.likedBy?.includes(currentUser?.id);
  const isMe = workout.userId === currentUser?.id;
  const dt = new Date(workout.timestamp);
  const timeStr = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ' · ' + dt.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  const streakNum = workout.streak || 0;

  function handleFollow(e) {
    e.stopPropagation();
    if (following) { unfollow(workout.userId); setFollowing(false); }
    else { follow(workout.userId); setFollowing(true); }
  }

  return (
    <div className="feed-card">
      <div className="feed-card-header" onClick={() => onViewProfile(workout.userId)}>
        <div className="feed-avatar">
          {workout.avatar ? <img src={workout.avatar} alt="" /> : <span>{(workout.username || '?')[0].toUpperCase()}</span>}
        </div>
        <div className="feed-user-info">
          <div className="feed-username-row">
            <span className="feed-username">{workout.username}</span>
            {streakNum > 0 && <span className="feed-streak-badge">🔥 {streakNum}</span>}
          </div>
          <span className="feed-workout-type">Push-Ups · {timeStr}</span>
        </div>
        {!isMe && (
          <button className={`feed-follow-btn${following ? ' following' : ''}`} onClick={handleFollow}>
            {following ? '✓' : '+'}
          </button>
        )}
      </div>

      <div className="feed-media">
        {showVideo
          ? <video src={workout.videoUrl} controls className="feed-video" />
          : <div className="feed-placeholder">
              <img src={PUSHUP_GIF} alt="pushup" className="feed-placeholder-gif" />
              {isOld && <span className="feed-expired-badge">Video expired (24h+)</span>}
              {!workout.isPublic && <span className="feed-private-badge">🔒 Private</span>}
            </div>
        }
      </div>

      <div className="feed-stats-row">
        <div className="feed-pushup-count">
          <span className="feed-streak-num">{workout.pushups}</span>
          <span className="feed-streak-label">push-ups</span>
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
      </div>
    </div>
  );
}

export default function FeedPage() {
  const { getGlobalFeed, getFollowingFeed, likeWorkout, getAllUsers } = useAuth();
  const [tab, setTab] = useState('for_you');
  const [feed, setFeed] = useState([]);
  const [viewUserId, setViewUserId] = useState(null);

  useEffect(() => { refresh(); }, [tab]);

  function refresh() {
    setFeed(tab === 'for_you' ? getGlobalFeed() : getFollowingFeed());
  }

  function handleLike(id) { likeWorkout(id); refresh(); }

  const allUsers = getAllUsers();
  const viewUser = viewUserId ? allUsers.find(u => u.id === viewUserId) : null;

  if (viewUser) {
    return (
      <div className="feed-page">
        <UserProfileView user={viewUser} onBack={() => setViewUserId(null)} />
      </div>
    );
  }

  return (
    <div className="feed-page">
      <div className="feed-header">
        <div className="feed-title">FEED</div>
        <div className="feed-title-sub">Verified counts from AI vision</div>
      </div>

      <div className="feed-tabs">
        <button className={tab === 'for_you' ? 'active' : ''} onClick={() => setTab('for_you')}>For You</button>
        <button className={tab === 'following' ? 'active' : ''} onClick={() => setTab('following')}>Following</button>
      </div>

      <div className="feed-list">
        {feed.length === 0 && (
          <div className="feed-empty">
            <div className="feed-empty-icon">🏋️</div>
            <div>{tab === 'following' ? 'Follow someone to see their workouts!' : 'No workouts yet.'}</div>
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>Record your first one!</div>
          </div>
        )}
        {feed.map(w => (
          <WorkoutCard key={w.id} workout={w} onLike={handleLike} onViewProfile={id => setViewUserId(id)} />
        ))}
      </div>
    </div>
  );
}
