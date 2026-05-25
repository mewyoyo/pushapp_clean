const BASE = process.env.REACT_APP_API_URL || 'https://pushup-counter-rseg.onrender.com';

export function getToken() {
  return localStorage.getItem('pushapp_token') || '';
}

async function req(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const d = await res.json();
      msg = d.detail || JSON.stringify(d);
    } catch {}
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const apiRegister = (username, email, password) =>
  req('POST', '/auth/register', { username, email, password });

export const apiLogin = async (username, password) => {
  const res = await fetch(BASE + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const d = await res.json();
      msg = d.detail || JSON.stringify(d);
    } catch {}
    throw new Error(msg);
  }

  const text = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }

  let token;
  if (typeof parsed === 'string') {
    token = parsed;
  } else if (parsed && typeof parsed === 'object') {
    token = parsed.token || parsed.access_token || parsed.key || parsed.auth_token || '';
  }

  if (!token) {
    console.error('apiLogin: не удалось извлечь токен из ответа:', parsed);
    throw new Error('Сервер не вернул токен авторизации');
  }

  return token;
};

export const apiLogout = () => req('POST', '/auth/logout');

// user_id — число (из OpenAPI: ?user_id=int). Без аргумента — свой профиль.
export const apiGetProfile = (userId) =>
  req('GET', userId != null
    ? `/users/profile?user_id=${userId}`
    : '/users/profile'
  );

export const apiUploadAvatar = async (file) => {
  const token = getToken();
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(BASE + '/users/profile/avatar', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text().then(t => t ? JSON.parse(t) : null);
};

export const apiToggleFollow = (targetId) =>
  req('POST', `/social/follow/${targetId}`);

export const apiSubmitWorkout = (total_pushups, duration_seconds) =>
  req('POST', '/workouts/', { total_pushups, duration_seconds });

export const apiGetMyWorkouts = () => req('GET', '/workouts/');

export const apiToggleLike = (workoutId) =>
  req('POST', `/workouts/${workoutId}/like`);

export const apiGlobalFeed = () => req('GET', '/feed/global');

export const apiLeaderboardGlobal = () => req('GET', '/leaderboard/global');

export const apiLeaderboardFriends = () => req('GET', '/leaderboard/friends');

export const apiGetFollowers = (userId) =>
  req('GET', userId != null ? `/users/followers?user_id=${userId}` : '/users/followers');

export const apiGetFollowing = (userId) =>
  req('GET', userId != null ? `/users/following?user_id=${userId}` : '/users/following');
