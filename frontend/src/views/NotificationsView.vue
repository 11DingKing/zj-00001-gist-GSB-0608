<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useNotificationStore } from '@/stores/notification';
import api from '@/utils/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const notificationStore = useNotificationStore();
const router = useRouter();

const loading = ref(true);
const notifications = ref<any[]>([]);
const nextCursor = ref<string | null>(null);
const hasMore = ref(false);
const filter = ref<'all' | 'unread'>('all');

let observer: IntersectionObserver | null = null;
const loadMoreRef = ref<HTMLDivElement | null>(null);

async function fetchNotifications(append = false) {
  if (loading.value && append) return;

  loading.value = true;
  try {
    const params: Record<string, any> = { limit: 20 };
    if (filter.value === 'unread') {
      params.read = 'false';
    }
    if (append && nextCursor.value) {
      params.cursor = nextCursor.value;
    }

    const response = await api.get('/notifications', { params });
    const { data, nextCursor: cursor, hasMore: more } = response.data;

    if (append) {
      notifications.value = [...notifications.value, ...data];
    } else {
      notifications.value = data;
    }

    nextCursor.value = cursor;
    hasMore.value = more;
  } catch {
  } finally {
    loading.value = false;
  }
}

async function handleMarkAsRead(notification: any) {
  if (notification.read) return;
  await notificationStore.markAsRead(notification.id);
  notification.read = true;
}

async function handleMarkAllAsRead() {
  await notificationStore.markAllAsRead();
  notifications.value.forEach((n: any) => {
    n.read = true;
  });
}

function handleNotificationClick(notification: any) {
  if (!notification.read) {
    handleMarkAsRead(notification);
  }

  if (notification.gistId) {
    router.push({ name: 'gist-detail', params: { id: notification.gistId } });
  }
}

function getNotificationText(notification: any): string {
  switch (notification.type) {
    case 'STAR':
      return 'starred your gist';
    case 'COMMENT':
      return 'commented on your gist';
    case 'MENTION':
      return 'mentioned you in a comment';
    case 'FORK':
      return 'forked your gist';
    default:
      return 'interacted with your gist';
  }
}

function handleLoadMore() {
  if (hasMore.value && !loading.value) {
    fetchNotifications(true);
  }
}

function setupIntersectionObserver() {
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        handleLoadMore();
      }
    },
    { threshold: 0.1 }
  );

  if (loadMoreRef.value) {
    observer.observe(loadMoreRef.value);
  }
}

onMounted(() => {
  fetchNotifications();
  notificationStore.fetchUnreadCount();
  setupIntersectionObserver();
});

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
  }
});
</script>

<template>
  <div class="notifications-view">
    <div class="page-header">
      <h1>Notifications</h1>
      <div class="header-actions">
        <div class="filter-tabs">
          <button
            class="filter-btn"
            :class="{ active: filter === 'all' }"
            @click="filter = 'all'; fetchNotifications()"
          >
            All
          </button>
          <button
            class="filter-btn"
            :class="{ active: filter === 'unread' }"
            @click="filter = 'unread'; fetchNotifications()"
          >
            Unread
            <span v-if="notificationStore.unreadCount > 0" class="badge-count">
              {{ notificationStore.unreadCount }}
            </span>
          </button>
        </div>
        <button
          v-if="notificationStore.unreadCount > 0"
          class="btn btn-secondary"
          @click="handleMarkAllAsRead"
        >
          Mark all as read
        </button>
      </div>
    </div>

    <div class="notifications-list card">
      <div v-if="loading && notifications.length === 0" class="loading-state">
        <div v-for="i in 5" :key="i" class="skeleton-item">
          <div class="skeleton avatar"></div>
          <div class="skeleton content">
            <div class="skeleton line"></div>
            <div class="skeleton line small"></div>
          </div>
        </div>
      </div>

      <div v-else-if="notifications.length === 0" class="empty-state">
        <p v-if="filter === 'unread'">No unread notifications</p>
        <p v-else>No notifications yet</p>
      </div>

      <div v-else class="notification-items">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          class="notification-item"
          :class="{ unread: !notification.read }"
          @click="handleNotificationClick(notification)"
        >
          <div class="notification-avatar">
            {{ notification.actorId ? 'U' : 'S' }}
          </div>
          <div class="notification-content">
            <p class="notification-text">
              <span class="actor">Someone</span>
              {{ getNotificationText(notification) }}
            </p>
            <span class="notification-time">
              {{ dayjs(notification.createdAt).fromNow() }}
            </span>
          </div>
          <div v-if="!notification.read" class="unread-indicator"></div>
        </div>
      </div>

      <div ref="loadMoreRef" v-if="hasMore" class="load-more">
        <div v-if="loading" class="loading-spinner">Loading more...</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.notifications-view {
  max-width: 800px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.page-header h1 {
  font-size: 1.5rem;
  font-weight: 600;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.filter-tabs {
  display: flex;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  padding: 0.25rem;
}

.filter-btn {
  padding: 0.5rem 1rem;
  border: none;
  background: none;
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-btn.active {
  background: white;
  color: var(--text-primary);
  font-weight: 500;
  box-shadow: var(--shadow-sm);
}

.badge-count {
  background: var(--primary-color);
  color: white;
  font-size: 0.625rem;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
}

.notifications-list {
  overflow: hidden;
}

.loading-state {
  padding: 1rem;
}

.skeleton-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.skeleton.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  animation: shimmer 1.5s infinite;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
}

.skeleton.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.skeleton.line {
  height: 16px;
  width: 80%;
  background: var(--bg-tertiary);
  animation: shimmer 1.5s infinite;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  border-radius: 4px;
}

.skeleton.line.small {
  width: 40%;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: var(--text-muted);
}

.notification-items {
  display: flex;
  flex-direction: column;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;
  transition: background-color 0.2s ease;
  position: relative;
}

.notification-item:hover {
  background: var(--bg-secondary);
}

.notification-item.unread {
  background: #f0f7ff;
}

.notification-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 0.875rem;
  flex-shrink: 0;
}

.notification-content {
  flex: 1;
}

.notification-text {
  font-size: 0.875rem;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.actor {
  font-weight: 600;
}

.notification-time {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.unread-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--primary-color);
  margin-left: 0.5rem;
  flex-shrink: 0;
}

.load-more {
  text-align: center;
  padding: 1.5rem;
  color: var(--text-muted);
}
</style>
