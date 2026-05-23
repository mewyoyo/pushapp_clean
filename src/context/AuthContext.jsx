import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('pushapp_current_user');
    if (saved) setCurrentUser(JSON.parse(saved));
    setLoading(false);
  }, []);

  function getUsers() {
    return JSON.parse(localStorage.getItem('pushapp_users') || '[]');
  }

  function saveUsers(users) {
    localStorage.setItem('pushapp_users', JSON.stringify(users));
  }

  function register(username, password) {
    const users = getUsers();
    if (users.find(u => u.username === username)) {
      return { error: 'Пользователь уже существует' };
    }
    const newUser = {
      id: Date.now().toString(),
      username,
      password,
      avatar: null,
      stats: { totalPushups: 0, longestStreak: 0, likes: 0, followers: 0 },
      workouts: [],
      followers: [],
      following: [],
      friendRequests: { sent: [], received: [] },
      friends: [],
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
    if (!user) return { error: 'Неверный логин или пароль' };
    setCurrentUser(user);
    localStorage.setItem('pushapp_current_user', JSON.stringify(user));
    return { success: true };
  }

  function logout() {
    setCurrentUser(null);
    localStorage.removeItem('pushapp_current_user');
  }

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

  function getUserById(id) {
    const users = getUsers();
    return users.find(u => u.id === id) || null;
  }

  function getAllUsers() {
    return getUsers();
  }

  function addWorkout(pushupCount, videoUrl, isPublic) {
    const workout = {
      id: Date.now().toString(),
      userId: currentUser.id,
      username: currentUser.username,
      avatar: currentUser.avatar,
      pushups: pushupCount,
      videoUrl,
      isPublic,
      timestamp: Date.now(),
      likes: 0,
      likedBy: [],
    };
    const workouts = JSON.parse(localStorage.getItem('pushapp_workouts') || '[]');
    workouts.unshift(workout);
    localStorage.setItem('pushapp_workouts', JSON.stringify(workouts));

    const newTotal = (currentUser.stats?.totalPushups || 0) + pushupCount;
    const todayWorkouts = workouts.filter(w => {
      const d = new Date(w.timestamp);
      const now = new Date();
      return w.userId === currentUser.id &&
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth();
    });

    const dayData = currentUser.workouts || [];
    const today = new Date().toLocaleDateString('ru-RU');
    const existing = dayData.find(d => d.date === today);
    let newDayData;
    if (existing) {
      newDayData = dayData.map(d => d.date === today ? { ...d, count: d.count + pushupCount } : d);
    } else {
      newDayData = [...dayData, { date: today, count: pushupCount }].slice(-30);
    }

    updateUser({
      stats: {
        ...currentUser.stats,
        totalPushups: newTotal,
      },
      workouts: newDayData,
    });
    return workout;
  }

  function getGlobalFeed() {
    return JSON.parse(localStorage.getItem('pushapp_workouts') || '[]');
  }

  function getFriendsFeed() {
    const all = JSON.parse(localStorage.getItem('pushapp_workouts') || '[]');
    const myFriends = currentUser?.friends || [];
    const myFollowing = currentUser?.following || [];
    const allowed = [...myFriends, ...myFollowing, currentUser?.id];
    return all.filter(w => allowed.includes(w.userId));
  }

  function likeWorkout(workoutId) {
    const workouts = JSON.parse(localStorage.getItem('pushapp_workouts') || '[]');
    const idx = workouts.findIndex(w => w.id === workoutId);
    if (idx === -1) return;
    const w = workouts[idx];
    if (w.likedBy.includes(currentUser.id)) {
      workouts[idx] = { ...w, likes: w.likes - 1, likedBy: w.likedBy.filter(id => id !== currentUser.id) };
    } else {
      workouts[idx] = { ...w, likes: w.likes + 1, likedBy: [...w.likedBy, currentUser.id] };
    }
    localStorage.setItem('pushapp_workouts', JSON.stringify(workouts));
    return workouts[idx];
  }

  function sendFriendRequest(toUserId) {
    const users = getUsers();
    const toIdx = users.findIndex(u => u.id === toUserId);
    const fromIdx = users.findIndex(u => u.id === currentUser.id);
    if (toIdx === -1 || fromIdx === -1) return;

    users[toIdx] = {
      ...users[toIdx],
      friendRequests: {
        ...users[toIdx].friendRequests,
        received: [...(users[toIdx].friendRequests?.received || []), currentUser.id]
      }
    };
    users[fromIdx] = {
      ...users[fromIdx],
      friendRequests: {
        ...users[fromIdx].friendRequests,
        sent: [...(users[fromIdx].friendRequests?.sent || []), toUserId]
      }
    };
    saveUsers(users);
    updateUser(users[fromIdx]);
  }

  function acceptFriendRequest(fromUserId) {
    const users = getUsers();
    const meIdx = users.findIndex(u => u.id === currentUser.id);
    const fromIdx = users.findIndex(u => u.id === fromUserId);
    if (meIdx === -1 || fromIdx === -1) return;

    users[meIdx] = {
      ...users[meIdx],
      friends: [...(users[meIdx].friends || []), fromUserId],
      friendRequests: {
        ...users[meIdx].friendRequests,
        received: (users[meIdx].friendRequests?.received || []).filter(id => id !== fromUserId)
      }
    };
    users[fromIdx] = {
      ...users[fromIdx],
      friends: [...(users[fromIdx].friends || []), currentUser.id],
      friendRequests: {
        ...users[fromIdx].friendRequests,
        sent: (users[fromIdx].friendRequests?.sent || []).filter(id => id !== currentUser.id)
      }
    };
    saveUsers(users);
    updateUser(users[meIdx]);
  }

  return (
    <AuthContext.Provider value={{
      currentUser, loading,
      register, login, logout,
      updateUser, getUserById, getAllUsers,
      addWorkout, getGlobalFeed, getFriendsFeed, likeWorkout,
      sendFriendRequest, acceptFriendRequest,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
