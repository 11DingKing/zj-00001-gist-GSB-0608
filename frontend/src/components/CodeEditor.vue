<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import * as monaco from 'monaco-editor';
import { LANGUAGES } from '@/utils/constants';

const props = defineProps<{
  modelValue: string;
  language?: string;
  readOnly?: boolean;
  filename?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'update:filename', value: string): void;
  (e: 'language-change', value: string): void;
}>();

const editorContainer = ref<HTMLDivElement | null>(null);
let editor: monaco.editor.IStandaloneCodeEditor | null = null;
const selectedLanguage = ref(props.language || 'javascript');

watch(() => props.language, (newLang) => {
  if (newLang) {
    selectedLanguage.value = newLang;
    if (editor) {
      monaco.editor.setModelLanguage(editor.getModel()!, newLang);
    }
  }
});

watch(() => props.modelValue, (newValue) => {
  if (editor && editor.getValue() !== newValue) {
    editor.setValue(newValue);
  }
});

watch(selectedLanguage, (newLang) => {
  emit('language-change', newLang);
  if (editor) {
    monaco.editor.setModelLanguage(editor.getModel()!, newLang);
  }
});

function handleLanguageChange(event: Event) {
  const target = event.target as HTMLSelectElement;
  selectedLanguage.value = target.value;
}

onMounted(() => {
  if (editorContainer.value) {
    editor = monaco.editor.create(editorContainer.value, {
      value: props.modelValue,
      language: props.language || 'javascript',
      readOnly: props.readOnly || false,
      theme: 'vs',
      minimap: { enabled: false },
      automaticLayout: true,
      fontSize: 14,
      lineNumbers: 'on',
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      wrappingStrategy: 'advanced',
    });

    editor.onDidChangeModelContent(() => {
      if (editor) {
        emit('update:modelValue', editor.getValue());
      }
    });
  }
});

onUnmounted(() => {
  if (editor) {
    editor.dispose();
  }
});
</script>

<template>
  <div class="code-editor">
    <div class="editor-header">
      <input
        v-if="filename !== undefined"
        type="text"
        class="filename-input"
        :value="filename"
        placeholder="filename.js"
        @input="$emit('update:filename', ($event.target as HTMLInputElement).value)"
      />
      <span v-else class="filename">{{ filename }}</span>

      <select
        v-if="!readOnly"
        class="language-select"
        :value="selectedLanguage"
        @change="handleLanguageChange"
      >
        <option v-for="lang in LANGUAGES" :key="lang.value" :value="lang.value">
          {{ lang.label }}
        </option>
      </select>
      <span v-else class="language-badge">{{ selectedLanguage }}</span>
    </div>
    <div ref="editorContainer" class="editor-content"></div>
  </div>
</template>

<style scoped>
.code-editor {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: white;
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-color);
}

.filename {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
}

.filename-input {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.875rem;
  font-weight: 500;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: white;
  color: var(--text-primary);
}

.filename-input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.language-select {
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  background: white;
  color: var(--text-primary);
}

.language-badge {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
}

.editor-content {
  height: 300px;
}
</style>
