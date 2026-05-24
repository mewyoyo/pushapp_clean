import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import './Feed.scss';

const PUSHUP_GIF = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 120'%3E%3Crect width='200' height='120' fill='%23141414'/%3E%3Ctext x='100' y='65' text-anchor='middle' font-size='52'%3E🤸%3C/text%3E%3C/svg%3E";

// ── Хранение лайков в localStorage ──────────────────────────────────────────
// Структура: { [workoutId]: { liked: bool, count: likes_count_после_действия } }
// При загрузке сверяем count с сервером — если разошлись, кто-то ещё лайкнул/снял,
// и наше локальное состояние уже неактуально → сбрасываем.
function getLikedMap() {
  try { return JSON.parse(localStorage.getItem('pushapp_liked_map') || '{}'); }
  catch { return {}; }
}
function saveLikedMap(map) {
  localStorage.setItem('pushapp_liked_map', JSON.stringify(map));
}
// Возвращает true только если лайк стоит И серверный count совпадает с сохранённым
function isLikedLocally(workoutId, serverCount) {
  const entry = getLikedMap()[workoutId];
  if (!entry || !entry.liked) return false;
  return entry.count === serverCount;
}
function setLikedLocally(workoutId, liked, countAfter) {
  const map = getLikedMap();
  if (liked) {
    map[workoutId] = { liked: true, count: countAfter };
  } else {
    delete map[workoutId];
  }
  saveLikedMap(map);
}

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

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

function WorkoutCard({ workout, onLike, onViewProfile }) {
  const { currentUser, isFollowing, toggleFollow, setFollowingLocal } = useAuth();
  const [following, setFollowing] = useState(isFollowing(workout.user_id));

  const serverCount = workout.likes_count || 0;

  // Сверяем локальное состояние с серверным count — если разошлись, доверяем серверу
  const [liked, setLiked] = useState(() => isLikedLocally(workout.id, serverCount));
  const [likesCount, setLikesCount] = useState(serverCount);

  const workoutId = workout.id;
  const isOld = Date.now() - workout.timestamp > 24 * 3600 * 1000;
  const showVideo = workout.isPublic && workout.videoUrl && !isOld;
  const isMe = String(workout.user_id) === String(currentUser?.id);

  const dt = new Date(workout.timestamp);
  const timeStr = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    + ' · ' + dt.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

  async function handleFollow(e) {
    e.stopPropagation();
    await toggleFollow(workout.user_id);
    const next = !following;
    setFollowing(next);
    setFollowingLocal(workout.user_id, next);
  }

  async function handleLike() {
    if (!workoutId) return;
    const nowLiked = !liked;
    const newCount = nowLiked ? likesCount + 1 : likesCount - 1;
    // Обновляем UI оптимистично
    setLiked(nowLiked);
    setLikesCount(newCount);
    // Сохраняем в localStorage вместе с новым count для верификации
    setLikedLocally(workoutId, nowLiked, newCount);
    onLike(workoutId);
  }

  return (
    <div className="feed-card">
      <div className="feed-card-header" onClick={() => onViewProfile(workout.user_id, workout.username)}>
        <div className="feed-card-header-left">
          <div className="feed-avatar">
            {workout.avatar
              ? <img src={workout.avatar} alt="" />
              : <span>{(workout.username || '?')[0].toUpperCase()}</span>}
          </div>
          <div className="feed-user-info">
            <div className="feed-username-row">
              <span className="feed-username">{workout.username}</span>
              {workout.streak > 0 && <span className="feed-streak-badge">🔥 {workout.streak}</span>}
            </div>
            <span className="feed-workout-type">Push-Ups · {timeStr}</span>
          </div>
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
              {isOld && workout.videoUrl && <span className="feed-expired-badge">Video expired (24h+)</span>}
              {!workout.isPublic && <span className="feed-private-badge">🔒 Private</span>}
            </div>
        }
      </div>

      <div className="feed-stats-row">
        <div className="feed-pushup-count">
          <span className="feed-streak-num">{workout.total_pushups}</span>
          <span className="feed-streak-label">push-ups</span>
        </div>
        <div className="feed-verified">
          <span className="check-icon">✓</span>
          <span>AI verified</span>
        </div>
      </div>

      <div className="feed-actions">
        <button className={`feed-action-btn${liked ? ' liked' : ''}`} onClick={handleLike}>
          <span>{liked ? '❤️' : '🤍'}</span>
          <span>{likesCount}</span>
        </button>
      </div>
    </div>
  );
}

export default function FeedPage() {
  const { getGlobalFeed, getFollowingFeed, likeWorkout } = useAuth();
  const [tab, setTab] = useState('for_you');
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewProfile, setViewProfile] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = tab === 'for_you' ? await getGlobalFeed() : await getFollowingFeed();
    const valid = (data || []).filter(w => w.id != null);
    setFeed(valid);
    setLoading(false);
  }, [tab]);

  useEffect(() => { refresh(); }, [tab]);

  if (viewProfile) {
    return (
      <div className="feed-page">
        <UserProfileView
          username={viewProfile.username}
          userId={viewProfile.userId}
          onBack={() => setViewProfile(null)}
        />
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
        {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>Loading...</div>}
        {!loading && feed.length === 0 && (
          <div className="feed-empty">
            <div className="feed-empty-icon">🏋️</div>
            <div>{tab === 'following' ? 'Follow someone to see their workouts!' : 'No workouts yet.'}</div>
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>Record your first one!</div>
          </div>
        )}
        {feed.map((w, idx) => (
          <WorkoutCard
            key={w.id ?? `workout-${idx}`}
            workout={w}
            onLike={likeWorkout}
            onViewProfile={(userId, username) => setViewProfile({ userId, username })}
          />
        ))}
      </div>
    </div>
  );
}
