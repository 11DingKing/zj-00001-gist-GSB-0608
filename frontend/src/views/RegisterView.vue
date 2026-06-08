<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const router = useRouter();

const email = ref('');
const username = ref('');
const password = ref('');
const displayName = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

async function handleSubmit() {
  error.value = null;
  loading.value = true;

  try {
    await authStore.register(email.value, username.value, password.value, displayName.value || undefined);
    router.push('/');
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Failed to register. Please try again.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card card">
      <div class="auth-header">
        <h1>Create account</h1>
        <p>Start sharing your code snippets</p>
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
          <label class="form-label" for="username">Username</label>
          <input
            id="username"
            v-model="username"
            type="text"
            class="form-input"
            placeholder="johndoe"
            required
            minlength="3"
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="displayName">Display Name (optional)</label>
          <input
            id="displayName"
            v-model="displayName"
            type="text"
            class="form-input"
            placeholder="John Doe"
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
            minlength="6"
          />
        </div>

        <button type="submit" class="btn btn-primary btn-full" :disabled="loading">
          {{ loading ? 'Creating account...' : 'Create account' }}
        </button>
      </form>

      <div class="auth-footer">
        <p>
          Already have an account?
          <router-link to="/login">Sign in</router-link>
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
