import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/utils/api';

interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export const useAuthStore = defineStore(
  'auth',
  () => {
    const token = ref<string | null>(null);
    const user = ref<User | null>(null);
    const isInitialized = ref(false);

    const isAuthenticated = computed(() => !!token.value && !!user.value);

    async function initialize() {
      if (token.value && user.value) {
        try {
          await api.get('/auth/me');
        } catch {
          logout();
        }
      }
      isInitialized.value = true;
    }

    async function login(email: string, password: string) {
      const response = await api.post('/auth/login', { email, password });
      const { accessToken, user: userData } = response.data;
      token.value = accessToken;
      user.value = userData;
      return userData;
    }

    async function register(email: string, username: string, password: string, displayName?: string) {
      const response = await api.post('/auth/register', {
        email,
        username,
        password,
        displayName,
      });
      const { accessToken, user: userData } = response.data;
      token.value = accessToken;
      user.value = userData;
      return userData;
    }

    async function logout() {
      try {
        await api.post('/auth/logout');
      } catch {
      } finally {
        token.value = null;
        user.value = null;
      }
    }

    async function refreshUser() {
      const response = await api.get('/auth/me');
      user.value = response.data;
      return response.data;
    }

    function setToken(newToken: string) {
      token.value = newToken;
    }

    function setUser(newUser: User) {
      user.value = newUser;
    }

    return {
      token,
      user,
      isInitialized,
      isAuthenticated,
      initialize,
      login,
      register,
      logout,
      refreshUser,
      setToken,
      setUser,
    };
  },
  {
    persist: {
      key: 'auth',
      paths: ['token', 'user'],
    },
  }
);
