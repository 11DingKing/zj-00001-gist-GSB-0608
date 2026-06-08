<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useNotificationStore } from '@/stores/notification';

const authStore = useAuthStore();
const notificationStore = useNotificationStore();
const router = useRouter();

const searchQuery = ref('');
const mobileMenuOpen = ref(false);

onMounted(() => {
  if (authStore.isAuthenticated) {
    notificationStore.fetchUnreadCount();
  }
});

function handleSearch() {
  if (searchQuery.value.trim()) {
    router.push({ name: 'search', query: { q: searchQuery.value.trim() } });
    searchQuery.value = '';
    mobileMenuOpen.value = false;
  }
}

function handleLogout() {
  authStore.logout();
  router.push({ name: 'home' });
  mobileMenuOpen.value = false;
}

function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value;
}
</script>

<template>
  <header class="app-header">
    <div class="container header-content">
      <router-link :to="{ name: 'home' }" class="logo">
        <span class="logo-icon">Gist</span>
      </router-link>

      <div class="search-bar">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search gists..."
          class="form-input search-input"
          @keyup.enter="handleSearch"
        />
      </div>

      <nav class="desktop-nav">
        <router-link
          v-if="authStore.isAuthenticated"
          :to="{ name: 'gist-create' }"
          class="btn btn-primary"
        >
          + New Gist
        </router-link>

        <template v-if="authStore.isAuthenticated && authStore.user">
          <router-link
            :to="{ name: 'notifications' }"
            class="nav-link notification-link"
          >
            <span class="notification-icon">🔔</span>
            <span v-if="notificationStore.unreadCount > 0" class="notification-badge">
              {{ notificationStore.unreadCount > 99 ? '99+' : notificationStore.unreadCount }}
            </span>
          </router-link>

          <div class="user-menu">
            <router-link
              :to="{ name: 'user-profile', params: { username: authStore.user.username } }"
              class="user-avatar"
            >
              <span class="avatar-text">{{ authStore.user.username.charAt(0).toUpperCase() }}</span>
            </router-link>

            <div class="dropdown-menu">
              <router-link
                :to="{ name: 'user-profile', params: { username: authStore.user.username } }"
                class="dropdown-item"
              >
                Profile
              </router-link>
              <button @click="handleLogout" class="dropdown-item text-danger">
                Logout
              </button>
            </div>
          </div>
        </template>

        <template v-else>
          <router-link :to="{ name: 'login' }" class="nav-link">Login</router-link>
          <router-link :to="{ name: 'register' }" class="btn btn-primary">Sign Up</router-link>
        </template>
      </nav>

      <button class="mobile-menu-btn" @click="toggleMobileMenu">
        <span class="menu-icon">☰</span>
      </button>
    </div>

    <div v-if="mobileMenuOpen" class="mobile-menu">
      <div class="search-bar mobile-search">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search gists..."
          class="form-input search-input"
          @keyup.enter="handleSearch"
        />
      </div>

      <nav class="mobile-nav">
        <router-link
          v-if="authStore.isAuthenticated"
          :to="{ name: 'gist-create' }"
          class="btn btn-primary"
          @click="mobileMenuOpen = false"
        >
          + New Gist
        </router-link>

        <template v-if="authStore.isAuthenticated && authStore.user">
          <router-link
            :to="{ name: 'notifications' }"
            class="nav-link"
            @click="mobileMenuOpen = false"
          >
            🔔 Notifications
            <span v-if="notificationStore.unreadCount > 0" class="notification-badge">
              {{ notificationStore.unreadCount }}
            </span>
          </router-link>

          <router-link
            :to="{ name: 'user-profile', params: { username: authStore.user.username } }"
            class="nav-link"
            @click="mobileMenuOpen = false"
          >
            Profile
          </router-link>

          <button @click="handleLogout" class="nav-link text-danger">
            Logout
          </button>
        </template>

        <template v-else>
          <router-link
            :to="{ name: 'login' }"
            class="nav-link"
            @click="mobileMenuOpen = false"
          >
            Login
          </router-link>
          <router-link
            :to="{ name: 'register' }"
            class="btn btn-primary"
            @click="mobileMenuOpen = false"
          >
            Sign Up
          </router-link>
        </template>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  background: white;
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: var(--shadow-sm);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  max-width: 1400px;
  margin: 0 auto;
}

.logo {
  font-weight: 700;
  font-size: 1.25rem;
  color: var(--text-primary);
  text-decoration: none;
}

.logo:hover {
  text-decoration: none;
}

.logo-icon {
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.search-bar {
  flex: 0 0 300px;
  margin: 0 2rem;
}

.search-input {
  background: var(--bg-tertiary);
}

.desktop-nav {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.nav-link {
  color: var(--text-secondary);
  text-decoration: none;
  font-weight: 500;
  padding: 0.5rem;
  border-radius: var(--radius-sm);
  transition: background-color 0.2s ease;
}

.nav-link:hover {
  background-color: var(--bg-tertiary);
  text-decoration: none;
}

.text-danger {
  color: var(--danger-color);
}

.notification-link {
  position: relative;
}

.notification-icon {
  font-size: 1.25rem;
}

.notification-badge {
  position: absolute;
  top: 0;
  right: 0;
  background: var(--danger-color);
  color: white;
  font-size: 0.625rem;
  padding: 0.125rem 0.375rem;
  border-radius: 9999px;
  min-width: 1.25rem;
  text-align: center;
}

.user-menu {
  position: relative;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
}

.avatar-text {
  font-size: 0.875rem;
}

.user-menu:hover .dropdown-menu {
  display: block;
}

.dropdown-menu {
  display: none;
  position: absolute;
  right: 0;
  top: 100%;
  margin-top: 0.5rem;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  min-width: 160px;
  z-index: 101;
}

.dropdown-item {
  display: block;
  padding: 0.75rem 1rem;
  color: var(--text-primary);
  text-decoration: none;
  font-size: 0.875rem;
  background: none;
  border: none;
  width: 100%;
  text-align: left;
  cursor: pointer;
}

.dropdown-item:hover {
  background: var(--bg-tertiary);
  text-decoration: none;
}

.mobile-menu-btn {
  display: none;
  background: none;
  border: none;
  padding: 0.5rem;
  font-size: 1.25rem;
  cursor: pointer;
}

.mobile-menu {
  display: none;
  padding: 1rem;
  border-top: 1px solid var(--border-color);
  background: white;
}

.mobile-search {
  margin: 0 0 1rem 0;
  flex: none;
}

.mobile-nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

@media (max-width: 768px) {
  .search-bar {
    display: none;
  }

  .desktop-nav {
    display: none;
  }

  .mobile-menu-btn {
    display: block;
  }

  .mobile-menu {
    display: block;
  }
}
</style>
