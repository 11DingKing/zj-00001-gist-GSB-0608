<script setup lang="ts">
import { useRouter } from 'vue-router';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface GistFile {
  id: string;
  filename: string;
  language: string;
  content: string;
  order: number;
}

interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

interface Tag {
  id: string;
  name: string;
}

interface Gist {
  id: string;
  title: string;
  description?: string;
  visibility: string;
  starsCount: number;
  forksCount: number;
  createdAt: string;
  updatedAt: string;
  author: User;
  files: GistFile[];
  tags: Tag[];
  _count?: {
    stars: number;
    forks: number;
    comments: number;
  };
}

defineProps<{
  gist: Gist;
}>();

const router = useRouter();

function formatDate(dateStr: string) {
  return dayjs(dateStr).fromNow();
}

function goToGist(id: string) {
  router.push({ name: 'gist-detail', params: { id } });
}

function goToUser(username: string, event: Event) {
  event.stopPropagation();
  router.push({ name: 'user-profile', params: { username } });
}
</script>

<template>
  <article class="gist-card card" @click="goToGist(gist.id)">
    <div class="card-header">
      <div class="author-info" @click="goToUser(gist.author.username, $event)">
        <div class="author-avatar">
          {{ gist.author.displayName.charAt(0).toUpperCase() }}
        </div>
        <div class="author-meta">
          <span class="author-name">{{ gist.author.displayName }}</span>
          <span class="author-username">@{{ gist.author.username }}</span>
        </div>
      </div>
      <div class="gist-badges">
        <span v-if="gist.visibility !== 'PUBLIC'" class="badge badge-secondary">
          {{ gist.visibility.toLowerCase() }}
        </span>
      </div>
    </div>

    <div class="card-body">
      <h3 class="gist-title">{{ gist.title }}</h3>
      <p v-if="gist.description" class="gist-description">{{ gist.description }}</p>
    </div>

    <div class="card-footer">
      <div class="gist-files">
        <span v-for="file in gist.files.slice(0, 3)" :key="file.id" class="file-badge">
          {{ file.filename }}
        </span>
        <span v-if="gist.files.length > 3" class="file-more">
          +{{ gist.files.length - 3 }} more
        </span>
      </div>

      <div class="gist-meta">
        <span class="meta-item">⭐ {{ gist.starsCount || gist._count?.stars || 0 }}</span>
        <span class="meta-item">🍴 {{ gist.forksCount || gist._count?.forks || 0 }}</span>
        <span class="meta-item">💬 {{ gist._count?.comments || 0 }}</span>
        <span class="meta-date">Updated {{ formatDate(gist.updatedAt) }}</span>
      </div>
    </div>

    <div v-if="gist.tags.length > 0" class="card-tags">
      <span v-for="tag in gist.tags" :key="tag.id" class="badge badge-primary">
        #{{ tag.name }}
      </span>
    </div>
  </article>
</template>

<style scoped>
.gist-card {
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  padding: 1rem;
}

.gist-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.author-avatar {
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
}

.author-meta {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.author-name {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--text-primary);
}

.author-username {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.gist-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.gist-description {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
  line-height: 1.4;
}

.card-footer {
  margin-top: 0.75rem;
}

.gist-files {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.file-badge {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
}

.file-more {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.gist-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.meta-date {
  margin-left: auto;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color);
}
</style>
