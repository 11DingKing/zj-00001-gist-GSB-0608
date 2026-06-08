import axios from 'axios';
import { useAuthStore } from '@/stores/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:13001';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const authStore = useAuthStore();
  if (authStore.token) {
    config.headers.Authorization = `Bearer ${authStore.token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const response = await axios.post(
          `${API_BASE_URL}/api/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const { accessToken, user } = response.data;
        const authStore = useAuthStore();
        authStore.setToken(accessToken);
        authStore.setUser(user);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        const authStore = useAuthStore();
        authStore.logout();
        throw refreshError;
      }
    }

    throw error;
  }
);

export default api;
