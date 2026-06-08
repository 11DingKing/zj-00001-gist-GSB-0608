<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '@/utils/api';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('python', python);

const route = useRoute();
const router = useRouter();

const gistId = computed(() => route.params.id as string);
const fromRevisionId = computed(() => route.query.from as string);
const toRevisionId = computed(() => route.query.to as string);

const loading = ref(true);
const diffData = ref<any>(null);
const error = ref<string | null>(null);

interface DiffChange {
  value: string;
  added?: boolean;
  removed?: boolean;
}

async function fetchDiff() {
  if (!fromRevisionId.value || !toRevisionId.value) {
    error.value = 'Missing revision parameters';
    loading.value = false;
    return;
  }

  loading.value = true;
  try {
    const response = await api.get(`/gists/${gistId.value}/diff`, {
      params: {
        from: fromRevisionId.value,
        to: toRevisionId.value,
      },
    });
    diffData.value = response.data;
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Failed to load diff';
  } finally {
    loading.value = false;
  }
}

function getDiffClass(change: DiffChange): string {
  if (change.added) return 'diff-added';
  if (change.removed) return 'diff-removed';
  return 'diff-unchanged';
}

onMounted(() => {
  fetchDiff();
});
</script>

<template>
  <div class="gist-diff-view">
    <div class="page-header">
      <button class="btn btn-secondary" @click="router.back()">
        ← Back to gist
      </button>
      <h1>Diff View</h1>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="skeleton-container">
        <div class="skeleton header"></div>
        <div class="skeleton diff"></div>
        <div class="skeleton diff"></div>
      </div>
    </div>

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button class="btn btn-primary" @click="router.back()">Go back</button>
    </div>

    <div v-else-if="diffData" class="diff-container">
      <div class="diff-summary">
        <div class="revision-info">
          <span class="label">From:</span>
          <span class="revision">{{ diffData.from?.message || 'Revision A' }}</span>
        </div>
        <span class="diff-arrow">→</span>
        <div class="revision-info">
          <span class="label">To:</span>
          <span class="revision">{{ diffData.to?.message || 'Revision B' }}</span>
        </div>
      </div>

      <div class="file-diffs">
        <div
          v-for="(fileDiff, index) in diffData.fileDiffs"
          :key="index"
          class="file-diff-section"
        >
          <div class="file-header">
            <span class="filename">{{ fileDiff.filename }}</span>
            <span v-if="fileDiff.added" class="badge badge-added">Added</span>
            <span v-else-if="fileDiff.deleted" class="badge badge-deleted">Deleted</span>
            <span v-else class="badge badge-modified">Modified</span>
          </div>

          <div class="diff-content">
            <pre class="diff-block">
              <code>
                <template v-for="(change, cIndex) in fileDiff.changes" :key="cIndex">
                  <template v-for="(line, lIndex) in change.value.split('\n')" :key="lIndex">
                    <span :class="getDiffClass(change)" :data-change-index="cIndex">
                      <span v-if="change.added" class="diff-marker">+</span>
                      <span v-else-if="change.removed" class="diff-marker">-</span>
                      <span v-else class="diff-marker"> </span>
                      {{ line }}
                    </span>
                    <br v-if="lIndex < change.value.split('\n').length - 1" />
                  </template>
                </template>
              </code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gist-diff-view {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 1.5rem;
  font-weight: 600;
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
  height: 40px;
  width: 50%;
}

.skeleton.diff {
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

.diff-container {
  background: white;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.diff-summary {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-color);
}

.revision-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.label {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.revision {
  font-weight: 500;
}

.diff-arrow {
  font-size: 1.5rem;
  color: var(--text-muted);
}

.file-diffs {
  display: flex;
  flex-direction: column;
}

.file-diff-section {
  border-bottom: 1px solid var(--border-color);
}

.file-diff-section:last-child {
  border-bottom: none;
}

.file-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1.5rem;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.filename {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.875rem;
  font-weight: 500;
}

.badge-added {
  background: #dcfce7;
  color: #166534;
}

.badge-deleted {
  background: #fee2e2;
  color: #991b1b;
}

.badge-modified {
  background: #fef3c7;
  color: #92400e;
}

.diff-content {
  overflow-x: auto;
}

.diff-block {
  margin: 0;
  padding: 1rem;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.875rem;
  line-height: 1.5;
}

.diff-block code {
  display: block;
  white-space: pre;
}

.diff-marker {
  display: inline-block;
  width: 1.5rem;
  text-align: center;
  font-weight: bold;
}

.diff-unchanged {
  color: var(--text-primary);
  background: transparent;
}

.diff-added {
  background: #dcfce7;
  color: #166534;
  display: block;
}

.diff-removed {
  background: #fee2e2;
  color: #991b1b;
  display: block;
}
</style>
