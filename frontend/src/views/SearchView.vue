<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import GistCard from '@/components/GistCard.vue';
import api from '@/utils/api';

const route = useRoute();

const query = computed(() => (route.query.q as string) || '');

const loading = ref(false);
const gists = ref<any[]>([]);
const nextCursor = ref<string | null>(null);
const hasMore = ref(false);
const searched = ref(false);

const hasSearched = computed(() => searched.value && gists.value.length === 0 && !loading.value);

async function executeSearch() {
  if (!query.value.trim()) {
    gists.value = [];
    searched.value = true;
    return;
  }

  loading.value = true;
  try {
    const response = await api.get('/gists/search', {
      params: { query: query.value, limit: 20 },
    });
    const { data, nextCursor: cursor, hasMore: more } = response.data;
    gists.value = data;
    nextCursor.value = cursor;
    hasMore.value = more;
  } catch {
    gists.value = [];
  } finally {
    loading.value = false;
    searched.value = true;
  }
}

async function loadMore() {
  if (!hasMore.value || loading.value || !nextCursor.value) return;

  loading.value = true;
  try {
    const response = await api.get('/gists/search', {
      params: {
        query: query.value,
        limit: 20,
        cursor: nextCursor.value,
      },
    });
    const { data, nextCursor: cursor, hasMore: more } = response.data;
    gists.value = [...gists.value, ...data];
    nextCursor.value = cursor;
    hasMore.value = more;
  } catch {
  } finally {
    loading.value = false;
  }
}

watch(query, () => {
  gists.value = [];
  nextCursor.value = null;
  hasMore.value = false;
  searched.value = false;
  executeSearch();
});

onMounted(() => {
  if (query.value) {
    executeSearch();
  } else {
    searched.value = true;
  }
});
</script>

<template>
  <div class="search-view">
    <div class="page-header">
      <h1>Search</h1>
      <p v-if="query">Results for: <strong>{{ query }}</strong></p>
    </div>

    <div v-if="!query" class="empty-search">
      <p>Enter a search query to find gists</p>
    </div>

    <div v-else-if="loading && gists.length === 0" class="loading-state">
      <div class="skeleton-list">
        <div v-for="i in 5" :key="i" class="skeleton-card">
          <div class="skeleton avatar"></div>
          <div class="skeleton content">
            <div class="skeleton line title"></div>
            <div class="skeleton line desc"></div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="hasSearched" class="no-results">
      <p>No gists found for "{{ query }}"</p>
      <p class="hint">Try different keywords or check your spelling</p>
    </div>

    <div v-else class="search-results">
      <p class="results-count">{{ gists.length }} gists found</p>

      <div class="gist-list">
        <GistCard v-for="gist in gists" :key="gist.id" :gist="gist" />
      </div>

      <div v-if="hasMore" class="load-more-section">
        <button
          class="btn btn-secondary"
          @click="loadMore"
          :disabled="loading"
        >
          {{ loading ? 'Loading...' : 'Load more' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-view {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.page-header p {
  color: var(--text-secondary);
}

.empty-search,
.no-results {
  text-align: center;
  padding: 4rem 2rem;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}

.empty-search p,
.no-results p {
  color: var(--text-muted);
  font-size: 1.125rem;
}

.no-results .hint {
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.loading-state {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.skeleton-card {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
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
  border-radius: 4px;
  background: var(--bg-tertiary);
  animation: shimmer 1.5s infinite;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
}

.skeleton.line.title {
  width: 60%;
}

.skeleton.line.desc {
  width: 100%;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.search-results {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.results-count {
  color: var(--text-muted);
  font-size: 0.875rem;
}

.gist-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1rem;
}

.load-more-section {
  text-align: center;
  padding-top: 1rem;
}

@media (max-width: 768px) {
  .gist-list {
    grid-template-columns: 1fr;
  }
}
</style>
