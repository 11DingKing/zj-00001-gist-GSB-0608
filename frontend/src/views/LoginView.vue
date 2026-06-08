<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

async function handleSubmit() {
  error.value = null;
  loading.value = true;

  try {
    await authStore.login(email.value, password.value);
    const redirect = (route.query.redirect as string) || '/';
    router.push(redirect);
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Failed to login. Please try again.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card card">
      <div class="auth-header">
        <h1>Welcome back</h1>
        <p>Sign in to your account</p>
      </div>

      <form @submit.prevent="handleSubmit" class="auth-form">
        <div v-if="error" class="alert alert-error">{{ error }}</div>

        <div class="form-group">
          <label class="form-label" for="email">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            class="form-input"
            placeholder="you@example.com"
            required
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="password">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            class="form-input"
            placeholder="••••••••"
            required
          />
        </div>

        <button type="submit" class="btn btn-primary btn-full" :disabled="loading">
          {{ loading ? 'Signing in...' : 'Sign in' }}
        </button>
      </form>

      <div class="auth-footer">
        <p>
          Don't have an account?
          <router-link to="/register">Sign up</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: calc(100vh - 200px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.auth-card {
  width: 100%;
  max-width: 400px;
  padding: 2rem;
}

.auth-header {
  text-align: center;
  margin-bottom: 2rem;
}

.auth-header h1 {
  font-size: 1.75rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.auth-header p {
  color: var(--text-secondary);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.btn-full {
  width: 100%;
  padding: 0.875rem;
  font-size: 1rem;
}

.auth-footer {
  text-align: center;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color);
  color: var(--text-secondary);
}

.auth-footer a {
  font-weight: 500;
}
</style>
