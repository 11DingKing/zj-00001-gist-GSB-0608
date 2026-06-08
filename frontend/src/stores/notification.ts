import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/utils/api';

export const useNotificationStore = defineStore('notification', () => {
  const unreadCount = ref(0);

  async function fetchUnreadCount() {
    try {
      const response = await api.get('/notifications/unread-count');
      unreadCount.value = response.data.count;
    } catch {
      unreadCount.value = 0;
    }
    return unreadCount.value;
  }

  async function markAsRead(id: string) {
    try {
      await api.post(`/notifications/${id}/read`);
      if (unreadCount.value > 0) {
        unreadCount.value--;
      }
    } catch {
    }
  }

  async function markAllAsRead() {
    try {
      await api.post('/notifications/read-all');
      unreadCount.value = 0;
    } catch {
    }
  }

  function incrementCount() {
    unreadCount.value++;
  }

  function decrementCount() {
    if (unreadCount.value > 0) {
      unreadCount.value--;
    }
  }

  return {
    unreadCount,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    incrementCount,
    decrementCount,
  };
});
