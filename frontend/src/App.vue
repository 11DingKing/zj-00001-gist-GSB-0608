<script setup lang="ts">
import { RouterView } from 'vue-router';
import AppHeader from './components/AppHeader.vue';
import AppFooter from './components/AppFooter.vue';
</script>

<template>
  <div class="app-container">
    <AppHeader />
    <main class="main-content">
      <RouterView v-slot="{ Component }">
        <Suspense>
          <template #default>
            <component :is="Component" />
          </template>
          <template #fallback>
            <div class="skeleton-container">
              <div class="skeleton skeleton-header"></div>
              <div class="skeleton skeleton-text"></div>
              <div class="skeleton skeleton-text"></div>
              <div class="skeleton skeleton-text"></div>
            </div>
          </template>
        </Suspense>
      </RouterView>
    </main>
    <AppFooter />
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

.skeleton-container {
  padding: 1.5rem;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.skeleton-header {
  height: 24px;
  width: 50%;
}

.skeleton-text {
  height: 16px;
  width: 100%;
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
</style>
