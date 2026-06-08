import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/gists/new',
      name: 'gist-create',
      component: () => import('@/views/GistCreateView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/gists/:id',
      name: 'gist-detail',
      component: () => import('@/views/GistDetailView.vue'),
    },
    {
      path: '/gists/:id/edit',
      name: 'gist-edit',
      component: () => import('@/views/GistEditView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/gists/:id/diff',
      name: 'gist-diff',
      component: () => import('@/views/GistDiffView.vue'),
    },
    {
      path: '/@:username',
      name: 'user-profile',
      component: () => import('@/views/UserProfileView.vue'),
    },
    {
      path: '/notifications',
      name: 'notifications',
      component: () => import('@/views/NotificationsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/search',
      name: 'search',
      component: () => import('@/views/SearchView.vue'),
    },
  ],
});

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore();

  if (!authStore.isInitialized) {
    await authStore.initialize();
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } });
    return;
  }

  if (to.meta.guestOnly && authStore.isAuthenticated) {
    next({ name: 'home' });
    return;
  }

  next();
});

export default router;
