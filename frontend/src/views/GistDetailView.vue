<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import CodeHighlight from '@/components/CodeHighlight.vue';
import api from '@/utils/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface Revision {
  id: string;
  message?: string;
  createdAt: string;
}

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const gistId = computed(() => route.params.id as string);

const loading = ref(true);
const gist = ref<any>(null);
const error = ref<string | null>(null);
const activeFileIndex = ref(0);

const revisions = ref<Revision[]>([]);
const comments = ref<any[]>([]);
const newComment = ref('');
const submittingComment = ref(false);

const isOwner = computed(() => {
  if (!gist.value || !authStore.user) return false;
  return gist.value.author.id === authStore.user.id;
});

async function fetchGist() {
  loading.value = true;
  try {
    const response = await api.get(`/gists/${gistId.value}`);
    gist.value = response.data;
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Failed to load gist';
  } finally {
    loading.value = false;
  }
}

async function fetchRevisions() {
  try {
    const response = await api.get(`/gists/${gistId.value}/revisions`);
    revisions.value = response.data;
  } catch {
  }
}

async function fetchComments() {
  try {
    const response = await api.get(`/gists/${gistId.value}/comments`);
    comments.value = response.data.data || response.data;
  } catch {
  }
}

async function handleStar() {
  if (!authStore.isAuthenticated) {
    router.push({ name: 'login' });
    return;
  }

  try {
    if (gist.value.isStarred) {
      await api.delete(`/gists/${gistId.value}/star`);
      gist.value.isStarred = false;
      gist.value.starsCount = Math.max(0, gist.value.starsCount - 1);
    } else {
      await api.post(`/gists/${gistId.value}/star`);
      gist.value.isStarred = true;
      gist.value.starsCount++;
    }
  } catch {
  }
}

async function handleFork() {
  if (!authStore.isAuthenticated) {
    router.push({ name: 'login' });
    return;
  }

  try {
    const response = await api.post(`/gists/${gistId.value}/fork`);
    router.push({ name: 'gist-detail', params: { id: response.data.id } });
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Failed to fork gist';
  }
}

async function handleDelete() {
  if (!confirm('Are you sure you want to delete this gist?')) return;

  try {
    await api.delete(`/gists/${gistId.value}`);
    router.push({ name: 'home' });
  } catch {
  }
}

async function handleSubmitComment() {
  if (!newComment.value.trim()) return;
  if (!authStore.isAuthenticated) {
    router.push({ name: 'login' });
    return;
  }

  submittingComment.value = true;
  try {
    await api.post(`/gists/${gistId.value}/comments`, {
      content: newComment.value,
    });
    newComment.value = '';
    fetchComments();
  } catch {
  } finally {
    submittingComment.value = false;
  }
}

function goToEdit() {
  router.push({ name: 'gist-edit', params: { id: gistId.value } });
}

function goToDiff() {
  if (revisions.value.length >= 2) {
    const from = revisions.value[revisions.value.length - 1].id;
    const to = revisions.value[0].id;
    router.push({
      name: 'gist-diff',
      params: { id: gistId.value },
      query: { from, to },
    });
  }
}

onMounted(() => {
  fetchGist();
  fetchRevisions();
  fetchComments();
});
</script>

<template>
  <div class="gist-detail-view">
    <div v-if="loading" class="loading-state">
      <div class="skeleton-container">
        <div class="skeleton header"></div>
        <div class="skeleton meta"></div>
        <div class="skeleton code"></div>
        <div class="skeleton code"></div>
      </div>
    </div>

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <router-link :to="{ name: 'home' }" class="btn btn-primary">Go back home</router-link>
    </div>

    <div v-else-if="gist" class="gist-container">
      <div class="gist-header">
        <div class="gist-info">
          <router-link
            :to="{ name: 'user-profile', params: { username: gist.author.username } }"
            class="author-link"
          >
            <span class="author-avatar">
              {{ gist.author.displayName.charAt(0).toUpperCase() }}
            </span>
            <span class="author-name">{{ gist.author.username }}</span>
          </router-link>
          <span class="gist-separator">/</span>
          <span class="gist-title">{{ gist.title }}</span>
        </div>

        <div class="gist-actions">
          <button
            class="btn"
            :class="gist.isStarred ? 'btn-primary' : 'btn-secondary'"
            @click="handleStar"
          >
            ⭐ Star ({{ gist.starsCount }})
          </button>
          <button class="btn btn-secondary" @click="handleFork">
            🍴 Fork ({{ gist.forksCount }})
          </button>

          <template v-if="isOwner">
            <button class="btn btn-secondary" @click="goToEdit">
              Edit
            </button>
            <button class="btn btn-danger" @click="handleDelete">
              Delete
            </button>
          </template>
        </div>
      </div>

      <div class="gist-meta-bar">
        <span v-if="gist.visibility !== 'PUBLIC'" class="badge badge-secondary">
          {{ gist.visibility.toLowerCase() }}
        </span>
        <span class="meta-text">Created {{ dayjs(gist.createdAt).format('MMM D, YYYY') }}</span>
        <span class="meta-text">Updated {{ dayjs(gist.updatedAt).fromNow() }}</span>
        <span v-if="gist.parent" class="meta-text">
          Forked from
          <router-link :to="{ name: 'gist-detail', params: { id: gist.parent.id } }">
            {{ gist.parent.author.username }}'s gist
          </router-link>
        </span>
      </div>

      <div v-if="gist.description" class="gist-description">
        {{ gist.description }}
      </div>

      <div v-if="gist.tags && gist.tags.length > 0" class="gist-tags">
        <span v-for="tag in gist.tags" :key="tag.id" class="badge badge-primary">
          #{{ tag.name }}
        </span>
      </div>

      <div class="files-section">
        <div class="file-tabs">
          <button
            v-for="(file, index) in gist.files"
            :key="file.id"
            class="file-tab"
            :class="{ active: activeFileIndex === index }"
            @click="activeFileIndex = index"
          >
            {{ file.filename }}
          </button>
        </div>

        <div class="file-content">
          <CodeHighlight
            v-for="(file, index) in gist.files"
            v-show="activeFileIndex === index"
            :key="file.id"
            :code="file.content"
            :language="file.language"
            :filename="file.filename"
          />
        </div>
      </div>

      <div v-if="revisions.length > 0" class="revisions-section">
        <div class="section-header">
          <h3>Revisions ({{ revisions.length }})</h3>
          <button
            v-if="revisions.length >= 2"
            class="btn btn-secondary btn-sm"
            @click="goToDiff"
          >
            View Diff
          </button>
        </div>
        <div class="revision-list">
          <div v-for="revision in revisions" :key="revision.id" class="revision-item">
            <span class="revision-message">
              {{ revision.message || 'Updated' }}
            </span>
            <span class="revision-date">
              {{ dayjs(revision.createdAt).fromNow() }}
            </span>
          </div>
        </div>
      </div>

      <div class="comments-section">
        <h3>Comments ({{ comments.length }})</h3>

        <div v-if="authStore.isAuthenticated" class="comment-form">
          <textarea
            v-model="newComment"
            class="form-input"
            rows="3"
            placeholder="Leave a comment... (Use @username to mention)"
          />
          <div class="comment-actions">
            <button
              class="btn btn-primary"
              @click="handleSubmitComment"
              :disabled="!newComment.trim() || submittingComment"
            >
              {{ submittingComment ? 'Posting...' : 'Post comment' }}
            </button>
          </div>
        </div>

        <div v-else class="comment-login-prompt">
          <router-link :to="{ name: 'login' }">Sign in</router-link>
          to leave a comment.
        </div>

        <div class="comment-list">
          <div v-for="comment in comments" :key="comment.id" class="comment-item">
            <div class="comment-avatar">
              {{ comment.author.displayName.charAt(0).toUpperCase() }}
            </div>
            <div class="comment-content">
              <div class="comment-header">
                <span class="comment-author">{{ comment.author.displayName }}</span>
                <span class="comment-date">{{ dayjs(comment.createdAt).fromNow() }}</span>
              </div>
              <p class="comment-text">{{ comment.content }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gist-detail-view {
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
}

.skeleton {
  height: 24px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.skeleton.header {
  height: 32px;
  width: 50%;
}

.skeleton.meta {
  height: 16px;
  width: 30%;
}

.skeleton.code {
  height: 200px;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.error-state {
  text-align: center;
  padding: 4rem 2rem;
}

.error-state p {
  color: var(--danger-color);
  margin-bottom: 1rem;
}

.gist-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.gist-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}

.gist-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
}

.author-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  color: var(--primary-color);
}

.author-link:hover {
  text-decoration: underline;
}

.author-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
}

.author-name {
  font-weight: 600;
}

.gist-separator {
  color: var(--text-muted);
}

.gist-title {
  font-weight: 600;
  color: var(--text-primary);
}

.gist-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.gist-meta-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
  font-size: 0.875rem;
  color: var(--text-muted);
  padding: 0.75rem;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}

.meta-text {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.gist-description {
  padding: 1rem;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
}

.gist-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.files-section {
  background: white;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.file-tabs {
  display: flex;
  flex-wrap: wrap;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-color);
}

.file-tab {
  padding: 0.75rem 1rem;
  border: none;
  background: none;
  font-size: 0.875rem;
  color: var(--text-secondary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
}

.file-tab:hover {
  color: var(--text-primary);
}

.file-tab.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
  background: white;
}

.file-content {
  padding: 1rem;
}

.revisions-section,
.comments-section {
  background: white;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 1.5rem;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.section-header h3,
.comments-section h3 {
  font-size: 1.125rem;
  font-weight: 600;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
}

.revision-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.revision-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
}

.revision-message {
  font-size: 0.875rem;
  color: var(--text-primary);
}

.revision-date {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.comment-form {
  margin-bottom: 1.5rem;
}

.comment-form textarea {
  margin-bottom: 0.75rem;
}

.comment-actions {
  display: flex;
  justify-content: flex-end;
}

.comment-login-prompt {
  padding: 1rem;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.comment-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.comment-item {
  display: flex;
  gap: 1rem;
}

.comment-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  flex-shrink: 0;
}

.comment-content {
  flex: 1;
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.comment-author {
  font-weight: 600;
  font-size: 0.875rem;
}

.comment-date {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.comment-text {
  color: var(--text-secondary);
  line-height: 1.5;
}
</style>
