<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import GistCard from '@/components/GistCard.vue';
import api from '@/utils/api';
import { LANGUAGES } from '@/utils/constants';

interface Gist {
  id: string;
  title: string;
  description?: string;
  visibility: string;
  starsCount: number;
  forksCount: number;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  files: Array<{
    id: string;
    filename: string;
    language: string;
    content: string;
    order: number;
  }>;
  tags: Array<{
    id: string;
    name: string;
  }>;
}

const route = useRoute();
const router = useRouter();

const gists = ref<Gist[]>([]);
const popularTags = ref<Array<{ name: string; count: number }>>([]);
const nextCursor = ref<string | null>(null);
const hasMore = ref(false);
const loading = ref(false);
const initialLoading = ref(true);
const selectedLanguage = ref<string | null>(null);

const searchQuery = computed(() => (route.query.q as string) || '');
const isSearchMode = computed(() => !!searchQuery.value.trim());

let observer: IntersectionObserver | null = null;
const loadMoreRef = ref<HTMLDivElement | null>(null);

const filteredLanguages = computed(() => {
  const languages = ['All', ...LANGUAGES.map(l => l.value)];
  return languages;
});

async function fetchGists(append = false) {
  if (loading.value) return;

  loading.value = true;

  try {
    const params: Record<string, any> = { limit: 20 };
    if (selectedLanguage.value && selectedLanguage.value !== 'All') {
      params.language = selectedLanguage.value;
    }
    if (append && nextCursor.value) {
      params.cursor = nextCursor.value;
    }

    const response = await api.get('/gists', { params });
    const { data, nextCursor: cursor, hasMore: more } = response.data;

    if (append) {
      gists.value = [...gists.value, ...data];
    } else {
      gists.value = data;
    }

    nextCursor.value = cursor;
    hasMore.value = more;
  } catch (error) {
    console.error('Failed to fetch gists:', error);
  } finally {
    loading.value = false;
    initialLoading.value = false;
  }
}

async function searchGists(append = false) {
  if (loading.value) return;

  loading.value = true;

  try {
    const params: Record<string, any> = {
      query: searchQuery.value.trim(),
      limit: 20,
    };
    if (append && nextCursor.value) {
      params.cursor = nextCursor.value;
    }

    const response = await api.get('/gists/search', { params });
    const { data, nextCursor: cursor, hasMore: more } = response.data;

    if (append) {
      gists.value = [...gists.value, ...data];
    } else {
      gists.value = data;
    }

    nextCursor.value = cursor;
    hasMore.value = more;
  } catch (error) {
    console.error('Failed to search gists:', error);
    if (!append) {
      gists.value = [];
    }
  } finally {
    loading.value = false;
    initialLoading.value = false;
  }
}

async function fetchPopularTags() {
  try {
    const response = await api.get('/gists/tags/popular');
    popularTags.value = response.data;
  } catch (error) {
    console.error('Failed to fetch tags:', error);
  }
}

function resetListState() {
  gists.value = [];
  nextCursor.value = null;
  hasMore.value = false;
}

function handleLanguageChange(language: string) {
  selectedLanguage.value = language === 'All' ? null : language;
  resetListState();
  if (isSearchMode.value) {
    searchGists();
  } else {
    fetchGists();
  }
}

function handleLoadMore() {
  if (hasMore.value && !loading.value) {
    if (isSearchMode.value) {
      searchGists(true);
    } else {
      fetchGists(true);
    }
  }
}

function handleClearSearch() {
  router.push({ name: 'home' });
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

watch(searchQuery, (newVal, oldVal) => {
  if (newVal === oldVal) return;
  resetListState();
  if (newVal.trim()) {
    searchGists();
  } else {
    fetchGists();
  }
});

onMounted(() => {
  if (isSearchMode.value) {
    searchGists();
  } else {
    fetchGists();
  }
  fetchPopularTags();
  setupIntersectionObserver();
});

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
  }
});
</script>

<template>
  <div class="home-view">
    <div class="home-grid">
      <aside class="sidebar">
        <div class="card sidebar-card">
          <h3 class="sidebar-title">Popular Tags</h3>
          <div class="tags-list">
            <button
              v-for="tag in popularTags"
              :key="tag.name"
              class="tag-btn"
              @click="handleLanguageChange(tag.name)"
              :class="{ active: selectedLanguage === tag.name }"
            >
              #{{ tag.name }}
              <span class="tag-count">({{ tag.count }})</span>
            </button>
          </div>
        </div>

        <div class="card sidebar-card">
          <h3 class="sidebar-title">Languages</h3>
          <div class="language-list">
            <button
              v-for="lang in filteredLanguages"
              :key="lang"
              class="language-btn"
              @click="handleLanguageChange(lang)"
              :class="{ active: (lang === 'All' && !selectedLanguage) || selectedLanguage === lang }"
            >
              {{ lang === 'All' ? 'All Languages' : lang }}
            </button>
          </div>
        </div>
      </aside>

      <main class="main-feed">
        <div class="feed-header">
          <h1 v-if="isSearchMode">Search Results</h1>
          <h1 v-else>Latest Gists</h1>
          <p v-if="isSearchMode">
            Results for: <strong>{{ searchQuery }}</strong>
            <button class="btn-clear-search" @click="handleClearSearch">✕ Clear</button>
          </p>
          <p v-else-if="selectedLanguage">Filtered by: {{ selectedLanguage }}</p>
        </div>

        <div v-if="initialLoading" class="loading-state">
          <div class="skeleton-list">
            <div v-for="i in 5" :key="i" class="skeleton-card">
              <div class="skeleton avatar"></div>
              <div class="skeleton content">
                <div class="skeleton line title"></div>
                <div class="skeleton line desc"></div>
                <div class="skeleton line meta"></div>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="gists.length === 0 && isSearchMode" class="empty-state">
          <p>No gists found for "{{ searchQuery }}"</p>
          <p class="empty-hint">Try different keywords or check your spelling</p>
        </div>

        <div v-else-if="gists.length === 0" class="empty-state">
          <p>No gists found</p>
        </div>

        <div v-else class="gist-list">
          <GistCard v-for="gist in gists" :key="gist.id" :gist="gist" />
        </div>

        <div ref="loadMoreRef" v-if="hasMore" class="load-more">
          <div v-if="loading" class="loading-spinner">Loading...</div>
        </div>

        <div v-if="!hasMore && gists.length > 0 && !loading" class="end-of-feed">
          You've reached the end!
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.home-view {
  max-width: 1400px;
  margin: 0 auto;
}

.home-grid {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 1.5rem;
}

.sidebar {
  position: sticky;
  top: 80px;
  align-self: flex-start;
}

.sidebar-card {
  padding: 1rem;
  margin-bottom: 1rem;
}

.sidebar-title {
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: var(--text-primary);
}

.tags-list,
.language-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.tag-btn,
.language-btn {
  text-align: left;
  padding: 0.5rem 0.75rem;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background-color 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tag-btn:hover,
.language-btn:hover {
  background: var(--bg-tertiary);
}

.tag-btn.active,
.language-btn.active {
  background: #dbeafe;
  color: #1d4ed8;
  font-weight: 500;
}

.tag-count {
  color: var(--text-muted);
  font-size: 0.75rem;
}

.main-feed {
  min-height: 400px;
}

.feed-header {
  margin-bottom: 1.5rem;
}

.feed-header h1 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.feed-header p {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.btn-clear-search {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 0.8rem;
  margin-left: 0.5rem;
  padding: 0.125rem 0.375rem;
  border-radius: var(--radius-sm);
  transition: background-color 0.2s ease;
}

.btn-clear-search:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.empty-hint {
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.gist-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1rem;
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

.skeleton.line.meta {
  width: 40%;
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: var(--text-muted);
}

.load-more {
  text-align: center;
  padding: 2rem;
  color: var(--text-muted);
}

.end-of-feed {
  text-align: center;
  padding: 2rem;
  color: var(--text-muted);
  font-size: 0.875rem;
}

@media (max-width: 1024px) {
  .home-grid {
    grid-template-columns: 1fr;
  }

  .sidebar {
    position: static;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .sidebar-card {
    margin-bottom: 0;
  }
}

@media (max-width: 768px) {
  .sidebar {
    grid-template-columns: 1fr;
  }

  .gist-list {
    grid-template-columns: 1fr;
  }
}
</style>
