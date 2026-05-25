import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  apiRegister, apiLogin, apiLogout,
  apiGetProfile, apiUploadAvatar,
  apiToggleFollow,
  apiSubmitWorkout, apiGetMyWorkouts, apiToggleLike,
  apiGlobalFeed,
  apiLeaderboardGlobal, apiLeaderboardFriends,
} from '../api';

const AuthContext = createContext(null);

function saveSession(token, user) {
  localStorage.setItem('pushapp_token', token);
  localStorage.setItem('pushapp_user', JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem('pushapp_token');
  localStorage.removeItem('pushapp_user');
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(
    () => localStorage.getItem('pushapp_theme') || 'dark'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // При старте — если есть токен, восстанавливаем сессию
  useEffect(() => {
    const token = localStorage.getItem('pushapp_token');
    const cached = localStorage.getItem('pushapp_user');

    if (!token) {
      setLoading(false);
      return;
    }

    // Сразу показываем из кеша, не ждём сервер
    if (cached) {
      try {
        setCurrentUser(JSON.parse(cached));
      } catch {}
    }

    // Фоновое обновление профиля
    apiGetProfile()
      .then(p => {
        const base = cached ? JSON.parse(cached) : {};
        const merged = { ...base, ...p };
        setCurrentUser(merged);
        localStorage.setItem('pushapp_user', JSON.stringify(merged));
      })
      .catch(err => {
        // 401 — токен протух, разлогиниваем
        if (err.status === 401 || (err.message && err.message.includes('401'))) {
          clearSession();
          setCurrentUser(null);
        }
        // другие ошибки (сеть и т.д.) — оставляем кеш
      })
      .finally(() => setLoading(false));
  }, []);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('pushapp_theme', next);
  }

  // ── Auth ────────────────────────────────────────────────────────────────────
  async function register(username, email, password) {
    try {
      await apiRegister(username, email, password);
      // После регистрации сразу логинимся
      return await login(username, password);
    } catch (e) {
      return { error: e.message };
    }
  }

  async function login(username, password) {
    try {
      // apiLogin теперь возвращает строку токена напрямую
      const token = await apiLogin(username, password);

      // ВАЖНО: сначала сохраняем токен, потом делаем запрос профиля
      localStorage.setItem('pushapp_token', token);

      const profile = await apiGetProfile();
      const user = { ...profile };
      saveSession(token, user);
      setCurrentUser(user);
      return { success: true };
    } catch (e) {
      // Если что-то пошло не так — очищаем незаконченную сессию
      clearSession();
      return { error: e.message };
    }
  }

  async function logout() {
    try { await apiLogout(); } catch {}
    clearSession();
    setCurrentUser(null);
  }

  // ── Profile ─────────────────────────────────────────────────────────────────
  async function refreshMyProfile() {
    try {
      const p = await apiGetProfile();
      const updated = { ...currentUser, ...p };
      setCurrentUser(updated);
      localStorage.setItem('pushapp_user', JSON.stringify(updated));
      return updated;
    } catch (e) {
      return currentUser;
    }
  }

  async function uploadAvatar(file) {
    try {
      await apiUploadAvatar(file);
      return await refreshMyProfile();
    } catch (e) {
      return { error: e.message };
    }
  }

  async function getUserProfile(userId) {
    try {
      return await apiGetProfile(userId);
    } catch (e) {
      return null;
    }
  }

  // ── Social ──────────────────────────────────────────────────────────────────
  async function toggleFollow(targetId) {
    try {
      const result = await apiToggleFollow(targetId);
      await refreshMyProfile();
      return result;
    } catch (e) {
      console.error('toggleFollow error:', e);
    }
  }

  function follow(targetId) { return toggleFollow(targetId); }
  function unfollow(targetId) { return toggleFollow(targetId); }

  function isFollowing(userId) {
    const ids = JSON.parse(localStorage.getItem('pushapp_following') || '[]');
    return ids.includes(String(userId));
  }

  function setFollowingLocal(targetId, val) {
    const ids = JSON.parse(localStorage.getItem('pushapp_following') || '[]');
    const sid = String(targetId);
    const next = val
      ? [...new Set([...ids, sid])]
      : ids.filter(i => i !== sid);
    localStorage.setItem('pushapp_following', JSON.stringify(next));
  }

  // ── Workouts ────────────────────────────────────────────────────────────────
  async function addWorkout(pushupCount, videoUrl, isPublic, durationSeconds) {
    try {
      const data = await apiSubmitWorkout(pushupCount, durationSeconds || 60);
      const localWorkouts = JSON.parse(
        localStorage.getItem('pushapp_local_workouts') || '[]'
      );
      localWorkouts.unshift({
        serverId: data.id,
        videoUrl: isPublic ? videoUrl : null,
        isPublic,
        timestamp: Date.now(),
      });
      localStorage.setItem(
        'pushapp_local_workouts',
        JSON.stringify(localWorkouts.slice(0, 50))
      );
      await refreshMyProfile();
      return data;
    } catch (e) {
      return { error: e.message };
    }
  }

  async function likeWorkout(workoutId) {
    if (workoutId == null) {
      console.warn('likeWorkout: workoutId is undefined, skipping');
      return;
    }
    try {
      return await apiToggleLike(Number(workoutId));
    } catch (e) {
      console.error('likeWorkout error:', e.message || e);
    }
  }

  async function getMyWorkouts() {
    try {
      return await apiGetMyWorkouts();
    } catch {
      return [];
    }
  }

  // ── Feed ────────────────────────────────────────────────────────────────────
  async function getGlobalFeed() {
    try {
      const items = await apiGlobalFeed();
      const local = JSON.parse(
        localStorage.getItem('pushapp_local_workouts') || '[]'
      );
      return (items || []).map(w => {
        const id = w.id ?? w.workout_id ?? null;
        const loc = local.find(l => l.serverId === id);
        return {
          ...w,
          id,
          userId: w.user_id,
          username: w.username || `user_${w.user_id}`,
          avatar: w.profile_image_url || null,
          pushups: w.total_pushups,
          likes: w.likes_count,
          likedBy: w.liked_by || [],
          timestamp: w.created_at ? new Date(w.created_at).getTime() : Date.now(),
          streak: w.current_streak || 0,
          videoUrl: loc?.videoUrl || null,
          isPublic: loc ? loc.isPublic : false,
        };
      });
    } catch {
      return [];
    }
  }

  async function getFollowingFeed() {
    const all = await getGlobalFeed();
    const ids = JSON.parse(localStorage.getItem('pushapp_following') || '[]');
    const allowed = [...ids, String(currentUser?.id)];
    return all.filter(w => allowed.includes(String(w.user_id)));
  }

  // ── Leaderboard ─────────────────────────────────────────────────────────────
  async function getLeaderboard() {
    try {
      const data = await apiLeaderboardGlobal();
      return (data || []).map(u => ({
        id: u.user_id,
        username: u.username,
        stats: {
          totalPushups: u.total_pushups,
          maxPushups: u.best_single_workout,
        },
        avatar: null,
        following: [],
        followers: [],
        workouts: [],
      }));
    } catch {
      return [];
    }
  }

  async function getAllUsers() {
    return await getLeaderboard();
  }

  return (
    <AuthContext.Provider value={{
      currentUser, loading, theme, toggleTheme,
      register, login, logout,
      refreshMyProfile, uploadAvatar, getUserProfile,
      follow, unfollow, isFollowing, toggleFollow, setFollowingLocal,
      addWorkout, likeWorkout, getMyWorkouts,
      getGlobalFeed, getFollowingFeed,
      getLeaderboard, getAllUsers,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
