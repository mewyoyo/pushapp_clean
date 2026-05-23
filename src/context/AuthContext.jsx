import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem('pushapp_theme') || 'dark');

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);
  useEffect(() => {
    const saved = localStorage.getItem('pushapp_current_user');
    if (saved) setCurrentUser(JSON.parse(saved));
    setLoading(false);
  }, []);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('pushapp_theme', next);
  }

  function getUsers() { return JSON.parse(localStorage.getItem('pushapp_users') || '[]'); }
  function saveUsers(users) { localStorage.setItem('pushapp_users', JSON.stringify(users)); }

  function register(username, email, password) {
    const users = getUsers();
    if (users.find(u => u.username.toLowerCase() === username.toLowerCase()))
      return { error: 'Username already taken' };
    if (users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase()))
      return { error: 'Email already registered' };
    const newUser = {
      id: Date.now().toString(), username, email, password, avatar: null,
      stats: { totalPushups: 0, maxPushups: 0, longestStreak: 0, currentStreak: 0, likes: 0 },
      workouts: [], followers: [], following: [], showStats: true,
    };
    users.push(newUser);
    saveUsers(users);
    setCurrentUser(newUser);
    localStorage.setItem('pushapp_current_user', JSON.stringify(newUser));
    return { success: true };
  }

  function login(username, password) {
    const users = getUsers();
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) return { error: 'Incorrect username or password' };
    setCurrentUser(user);
    localStorage.setItem('pushapp_current_user', JSON.stringify(user));
    return { success: true };
  }

  function logout() { setCurrentUser(null); localStorage.removeItem('pushapp_current_user'); }

  function updateUser(updates) {
    const users = getUsers();
    const idx = users.findIndex(u => u.id === currentUser.id);
    if (idx === -1) return;
    const updated = { ...users[idx], ...updates };
    users[idx] = updated;
    saveUsers(users);
    setCurrentUser(updated);
    localStorage.setItem('pushapp_current_user', JSON.stringify(updated));
    return updated;
  }

  function getUserById(id) { return getUsers().find(u => u.id === id) || null; }
  function getAllUsers() { return getUsers(); }

  function follow(toUserId) {
    const users = getUsers();
    const meIdx = users.findIndex(u => u.id === currentUser.id);
    const toIdx = users.findIndex(u => u.id === toUserId);
    if (meIdx === -1 || toIdx === -1) return;
    if (!users[meIdx].following.includes(toUserId))
      users[meIdx] = { ...users[meIdx], following: [...users[meIdx].following, toUserId] };
    if (!users[toIdx].followers.includes(currentUser.id))
      users[toIdx] = { ...users[toIdx], followers: [...users[toIdx].followers, currentUser.id] };
    saveUsers(users);
    updateUser(users[meIdx]);
  }

  function unfollow(toUserId) {
    const users = getUsers();
    const meIdx = users.findIndex(u => u.id === currentUser.id);
    const toIdx = users.findIndex(u => u.id === toUserId);
    if (meIdx === -1 || toIdx === -1) return;
    users[meIdx] = { ...users[meIdx], following: users[meIdx].following.filter(id => id !== toUserId) };
    users[toIdx] = { ...users[toIdx], followers: users[toIdx].followers.filter(id => id !== currentUser.id) };
    saveUsers(users);
    updateUser(users[meIdx]);
  }

  function isFollowing(userId) { return (currentUser?.following || []).includes(userId); }

  function addWorkout(pushupCount, videoUrl, isPublic) {
    const users = getUsers();
    const meIdx = users.findIndex(u => u.id === currentUser.id);
    const userStats = users[meIdx]?.stats || {};
    const allWorkouts = JSON.parse(localStorage.getItem('pushapp_workouts') || '[]');
    const fmt = d => { const x = new Date(d); return `${String(x.getDate()).padStart(2,'0')}.${String(x.getMonth()+1).padStart(2,'0')}.${x.getFullYear()}`; };
    const today = fmt(Date.now());
    const yesterday = fmt(Date.now() - 86400000);
    const myWorkouts = allWorkouts.filter(w => w.userId === currentUser.id);
    const workedToday = myWorkouts.some(w => fmt(w.timestamp) === today);
    const workedYesterday = myWorkouts.some(w => fmt(w.timestamp) === yesterday);
    let currentStreak = userStats.currentStreak || 0;
    if (!workedToday) currentStreak = workedYesterday ? currentStreak + 1 : 1;
    const longestStreak = Math.max(userStats.longestStreak || 0, currentStreak);
    const newTotal = (userStats.totalPushups || 0) + pushupCount;
    const maxPushups = Math.max(userStats.maxPushups || 0, pushupCount);

    const workout = {
      id: Date.now().toString(), userId: currentUser.id, username: currentUser.username,
      avatar: currentUser.avatar, pushups: pushupCount, videoUrl, isPublic,
      timestamp: Date.now(), likes: 0, likedBy: [], streak: currentStreak,
    };
    allWorkouts.unshift(workout);
    localStorage.setItem('pushapp_workouts', JSON.stringify(allWorkouts));

    const dayData = currentUser.workouts || [];
    const existing = dayData.find(d => d.date === today);
    const newDayData = existing
      ? dayData.map(d => d.date === today ? { ...d, count: d.count + pushupCount } : d)
      : [...dayData, { date: today, count: pushupCount }].slice(-30);

    updateUser({ stats: { ...userStats, totalPushups: newTotal, maxPushups, currentStreak, longestStreak }, workouts: newDayData });
    return workout;
  }

  function getGlobalFeed() { return JSON.parse(localStorage.getItem('pushapp_workouts') || '[]'); }

  function getFollowingFeed() {
    const all = JSON.parse(localStorage.getItem('pushapp_workouts') || '[]');
    const allowed = [...(currentUser?.following || []), currentUser?.id];
    return all.filter(w => allowed.includes(w.userId));
  }

  function likeWorkout(workoutId) {
    const workouts = JSON.parse(localStorage.getItem('pushapp_workouts') || '[]');
    const idx = workouts.findIndex(w => w.id === workoutId);
    if (idx === -1) return;
    const w = workouts[idx];
    const liked = w.likedBy.includes(currentUser.id);
    workouts[idx] = liked
      ? { ...w, likes: w.likes - 1, likedBy: w.likedBy.filter(id => id !== currentUser.id) }
      : { ...w, likes: w.likes + 1, likedBy: [...w.likedBy, currentUser.id] };
    localStorage.setItem('pushapp_workouts', JSON.stringify(workouts));
    const users = getUsers();
    const ownerIdx = users.findIndex(u => u.id === w.userId);
    if (ownerIdx !== -1) {
      const delta = liked ? -1 : 1;
      users[ownerIdx] = { ...users[ownerIdx], stats: { ...users[ownerIdx].stats, likes: Math.max(0, (users[ownerIdx].stats?.likes || 0) + delta) } };
      saveUsers(users);
      if (w.userId === currentUser.id) {
        const upd = { ...currentUser, stats: { ...currentUser.stats, likes: Math.max(0, (currentUser.stats?.likes || 0) + delta) } };
        setCurrentUser(upd);
        localStorage.setItem('pushapp_current_user', JSON.stringify(upd));
      }
    }
    return workouts[idx];
  }

  function getLeaderboard() {
    return [...getUsers()].sort((a, b) => (b.stats?.maxPushups || 0) - (a.stats?.maxPushups || 0));
  }

  return (
    <AuthContext.Provider value={{
      currentUser, loading, theme, toggleTheme,
      register, login, logout, updateUser, getUserById, getAllUsers,
      addWorkout, getGlobalFeed, getFollowingFeed, likeWorkout,
      follow, unfollow, isFollowing, getLeaderboard,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
