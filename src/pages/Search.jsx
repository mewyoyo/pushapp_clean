import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import './Search.scss';

function MiniProfileModal({ user, onClose }) {
  const { currentUser, getUserProfile, toggleFollow, setFollowingLocal, isFollowing } = useAuth();
  const [profile, setProfile] = useState(null);
  const [following, setFollowing] = useState(isFollowing(user.id));
  const isMe = String(user.id) === String(currentUser?.id);

  useEffect(() => {
    getUserProfile(user.username).then(p => p && setProfile(p));
  }, [user.username]);

  async function handleFollow() {
    await toggleFollow(user.id);
    const next = !following;
    setFollowing(next);
    setFollowingLocal(user.id, next);
  }

  const p = profile;
  return (
    <div className="search-modal-overlay" onClick={onClose}>
      <div className="search-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        {!p
          ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>Loading...</div>
          : <>
              <div className="smodal-avatar">
                {p.profile_image_url ? <img src={p.profile_image_url} alt="" /> : <span>{p.username[0].toUpperCase()}</span>}
              </div>
              <div className="smodal-name">{p.username}</div>
              <div className="smodal-follow-counts">
                <span><b>{p.following_count || 0}</b> following</span>
                <span><b>{p.followers_count || 0}</b> followers</span>
              </div>
              {!isMe && (
                <button className={`btn-orange${following ? ' outline' : ''}`} style={{ width: '100%', marginBottom: 16 }} onClick={handleFollow}>
                  {following ? 'Unfollow' : 'Follow'}
                </button>
              )}
              <div className="stat-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginBottom: 8 }}>
                {[
                  { label: 'Push-ups', value: p.total_pushups || 0 },
                  { label: 'Best set', value: p.best_single_workout || 0 },
                  { label: 'Likes', value: p.total_likes_received || 0 },
                ].map(s => (
                  <div key={s.label} className="stat-card">
                    <div className="stat-label">{s.label}</div>
                    <div className="stat-value">{s.value}</div>
                  </div>
                ))}
              </div>
              <div className="stat-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                {[
                  { label: 'Streak', value: p.current_streak || 0 },
                  { label: 'Followers', value: p.followers_count || 0 },
                  { label: 'Following', value: p.following_count || 0 },
                ].map(s => (
                  <div key={s.label} className="stat-card">
                    <div className="stat-label">{s.label}</div>
                    <div className="stat-value">{s.value}</div>
                  </div>
                ))}
              </div>
            </>
        }
      </div>
    </div>
  );
}

export default function SearchPage() {
  const { getLeaderboard } = useAuth();
  const [query, setQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    getLeaderboard().then(setLeaderboard);
  }, []);

  useEffect(() => {
    if (!query.trim()) { setSearchResults([]); return; }
    setSearching(true);
    const q = query.toLowerCase();
    // Client-side filter from leaderboard
    const results = leaderboard.filter(u => u.username.toLowerCase().includes(q));
    setSearchResults(results);
    setSearching(false);
  }, [query, leaderboard]);

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3, 9);

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
                Loading leaderboard...
              </div>
            )}
          </div>
        </>
      )}

      {selectedUser && <MiniProfileModal user={selectedUser} onClose={() => setSelectedUser(null)} />}
    </div>
  );
}
