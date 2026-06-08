<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import CodeEditor from '@/components/CodeEditor.vue';
import api from '@/utils/api';
import { VISIBILITY_OPTIONS } from '@/utils/constants';

interface GistFile {
  id: string;
  filename: string;
  language: string;
  content: string;
}

const router = useRouter();

const title = ref('');
const description = ref('');
const visibility = ref('PUBLIC');
const tags = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

const files = ref<GistFile[]>([
  {
    id: 'initial',
    filename: 'gistfile1.js',
    language: 'javascript',
    content: '',
  },
]);

function addFile() {
  const newId = `file-${Date.now()}`;
  files.value.push({
    id: newId,
    filename: `gistfile${files.value.length + 1}.js`,
    language: 'javascript',
    content: '',
  });
}

function removeFile(index: number) {
  if (files.value.length > 1) {
    files.value.splice(index, 1);
  }
}

async function handleSubmit() {
  error.value = null;

  if (!title.value.trim()) {
    error.value = 'Title is required';
    return;
  }

  if (files.value.some(f => !f.filename.trim())) {
    error.value = 'All files must have a filename';
    return;
  }

  loading.value = true;

  try {
    const tagsArray = tags.value
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const response = await api.post('/gists', {
      title: title.value,
      description: description.value || undefined,
      visibility: visibility.value,
      files: files.value.map(f => ({
        filename: f.filename,
        language: f.language,
        content: f.content,
      })),
      tags: tagsArray.length > 0 ? tagsArray : undefined,
    });

    router.push({ name: 'gist-detail', params: { id: response.data.id } });
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Failed to create gist. Please try again.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="gist-create-view">
    <div class="page-header">
      <h1>Create new gist</h1>
    </div>

    <form @submit.prevent="handleSubmit" class="gist-form">
      <div v-if="error" class="alert alert-error">{{ error }}</div>

      <div class="form-section">
        <div class="form-group">
          <label class="form-label" for="title">Gist description</label>
          <input
            id="title"
            v-model="title"
            type="text"
            class="form-input"
            placeholder="Gist description..."
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="description">Extended description (optional)</label>
          <textarea
            id="description"
            v-model="description"
            class="form-input"
            rows="3"
            placeholder="Add more details about this gist..."
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="tags">Tags (comma separated, optional)</label>
          <input
            id="tags"
            v-model="tags"
            type="text"
            class="form-input"
            placeholder="javascript, utility, helpers"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Visibility</label>
          <div class="visibility-options">
            <label
              v-for="option in VISIBILITY_OPTIONS"
              :key="option.value"
              class="visibility-option"
              :class="{ active: visibility === option.value }"
            >
              <input
                type="radio"
                :value="option.value"
                v-model="visibility"
              />
              <div class="option-content">
                <span class="option-label">{{ option.label }}</span>
                <span class="option-desc">{{ option.description }}</span>
              </div>
            </label>
          </div>
        </div>
      </div>

      <div class="files-section">
        <div class="files-header">
          <h2>Files</h2>
          <button type="button" class="btn btn-secondary" @click="addFile">
            + Add file
          </button>
        </div>

        <div
          v-for="(file, index) in files"
          :key="file.id"
          class="file-editor-wrapper"
        >
          <div class="file-header">
            <CodeEditor
              v-model="file.content"
              :model-value:filename="file.filename"
              @update:filename="(val: string) => file.filename = val"
              v-model:language="file.language"
            />
            <button
              v-if="files.length > 1"
              type="button"
              class="btn btn-danger remove-file-btn"
              @click="removeFile(index)"
            >
              Remove
            </button>
          </div>
        </div>
      </div>

      <div class="form-actions">
        <button
          type="submit"
          class="btn btn-primary btn-lg"
          :disabled="loading"
        >
          {{ loading ? 'Creating...' : 'Create public gist' }}
        </button>
        <button
          type="button"
          class="btn btn-secondary"
          @click="router.back()"
        >
          Cancel
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.gist-create-view {
  max-width: 1000px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 1.5rem;
  font-weight: 600;
}

.gist-form {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.form-section,
.files-section {
  background: white;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 1.5rem;
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.visibility-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.visibility-option {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
}

.visibility-option input {
  margin-top: 0.25rem;
}

.visibility-option.active {
  border-color: var(--primary-color);
  background: #f0f7ff;
}

.option-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.option-label {
  font-weight: 500;
  color: var(--text-primary);
}

.option-desc {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.files-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.files-header h2 {
  font-size: 1.125rem;
  font-weight: 600;
}

.file-editor-wrapper {
  margin-bottom: 1.5rem;
}

.file-header {
  position: relative;
}

.remove-file-btn {
  position: absolute;
  top: -3rem;
  right: 0;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.btn-lg {
  padding: 0.75rem 2rem;
  font-size: 1rem;
}
</style>
