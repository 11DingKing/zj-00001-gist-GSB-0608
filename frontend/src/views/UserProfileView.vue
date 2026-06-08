<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import GistCard from '@/components/GistCard.vue';
import api from '@/utils/api';
import dayjs from 'dayjs';

const route = useRoute();
const authStore = useAuthStore();

const username = computed(() => route.params.username as string);

const loading = ref(true);
const user = ref<any>(null);
const gists = ref<any[]>([]);
const error = ref<string | null>(null);

const isOwnProfile = computed(() => {
  if (!user.value || !authStore.user) return false;
  return user.value.username === authStore.user.username;
});

async function fetchUser() {
  loading.value = true;
  try {
    const response = await api.get(`/users/${username.value}`);
    user.value = response.data;
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Failed to load user';
  } finally {
    loading.value = false;
  }
}

async function fetchGists() {
  try {
    const response = await api.get(`/users/${username.value}/gists`);
    gists.value = response.data;
  } catch {
  }
}

watch(username, () => {
  fetchUser();
  fetchGists();
});

onMounted(() => {
  fetchUser();
  fetchGists();
});
</script>

<template>
  <div class="user-profile-view">
    <div v-if="loading" class="loading-state">
      <div class="skeleton-container">
        <div class="skeleton avatar"></div>
        <div class="skeleton name"></div>
        <div class="skeleton bio"></div>
      </div>
    </div>

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
    </div>

    <div v-else-if="user" class="profile-container">
      <div class="profile-header card">
        <div class="profile-avatar">
          {{ user.displayName.charAt(0).toUpperCase() }}
        </div>

        <div class="profile-info">
          <h1 class="profile-name">{{ user.displayName }}</h1>
          <p class="profile-username">@{{ user.username }}</p>
          <p v-if="user.bio" class="profile-bio">{{ user.bio }}</p>

          <div class="profile-stats">
            <div class="stat">
              <span class="stat-value">{{ user._count?.gists || 0 }}</span>
              <span class="stat-label">Gists</span>
            </div>
            <div class="stat">
              <span class="stat-value">{{ user._count?.stars || 0 }}</span>
              <span class="stat-label">Stars</span>
            </div>
          </div>

          <div class="profile-meta">
            <span class="meta-item">
              Joined {{ dayjs(user.createdAt).format('MMM D, YYYY') }}
            </span>
          </div>

          <div v-if="isOwnProfile" class="profile-actions">
            <router-link :to="{ name: 'gist-create' }" class="btn btn-primary">
              + New Gist
            </router-link>
          </div>
        </div>
      </div>

      <div class="profile-content">
        <div class="content-header">
          <h2>Gists</h2>
          <span class="gist-count">{{ gists.length }} gists</span>
        </div>

        <div v-if="gists.length === 0" class="empty-state">
          <p v-if="isOwnProfile">
            You haven't created any gists yet.
            <router-link :to="{ name: 'gist-create' }">Create your first gist</router-link>
          </p>
          <p v-else>This user hasn't created any gists yet.</p>
        </div>

        <div v-else class="gist-grid">
          <GistCard v-for="gist in gists" :key="gist.id" :gist="gist" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.user-profile-view {
  max-width: 1200px;
  margin: 0 auto;
}

.loading-state {
  padding: 2rem;
}

.skeleton-container {
  background: white;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.skeleton {
  height: 24px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}

.skeleton.avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
}

.skeleton.name {
  width: 200px;
  height: 32px;
}

.skeleton.bio {
  width: 300px;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.error-state {
  text-align: center;
  padding: 4rem 2rem;
  color: var(--text-muted);
}

.profile-container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.profile-header {
  display: flex;
  gap: 2rem;
  padding: 2rem;
  align-items: flex-start;
}

.profile-avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 3rem;
  font-weight: 600;
  flex-shrink: 0;
}

.profile-info {
  flex: 1;
}

.profile-name {
  font-size: 1.75rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.profile-username {
  color: var(--text-muted);
  font-size: 1rem;
  margin-bottom: 1rem;
}

.profile-bio {
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
  line-height: 1.5;
}

.profile-stats {
  display: flex;
  gap: 2rem;
  margin-bottom: 1.5rem;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 600;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--text-muted);
}

.profile-meta {
  font-size: 0.875rem;
  color: var(--text-muted);
  margin-bottom: 1.5rem;
}

.profile-actions {
  display: flex;
  gap: 0.75rem;
}

.content-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.content-header h2 {
  font-size: 1.25rem;
  font-weight: 600;
}

.gist-count {
  color: var(--text-muted);
  font-size: 0.875rem;
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-muted);
}

.empty-state a {
  color: var(--primary-color);
}

.gist-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1rem;
}

@media (max-width: 768px) {
  .profile-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .profile-stats {
    justify-content: center;
  }

  .profile-actions {
    justify-content: center;
  }

  .gist-grid {
    grid-template-columns: 1fr;
  }
}
</style>
