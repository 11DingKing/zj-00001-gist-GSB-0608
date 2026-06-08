<script setup lang="ts">
import { computed } from 'vue';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import sql from 'highlight.js/lib/languages/sql';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import markdown from 'highlight.js/lib/languages/markdown';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import java from 'highlight.js/lib/languages/java';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import php from 'highlight.js/lib/languages/php';
import ruby from 'highlight.js/lib/languages/ruby';
import swift from 'highlight.js/lib/languages/swift';
import kotlin from 'highlight.js/lib/languages/kotlin';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('json', json);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('css', css);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('go', go);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('java', java);
hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('csharp', csharp);
hljs.registerLanguage('php', php);
hljs.registerLanguage('ruby', ruby);
hljs.registerLanguage('swift', swift);
hljs.registerLanguage('kotlin', kotlin);

const props = defineProps<{
  code: string;
  language?: string;
  filename?: string;
}>();

const highlightedCode = computed(() => {
  const lang = props.language || 'plaintext';
  try {
    if (hljs.getLanguage(lang)) {
      return hljs.highlight(props.code, { language: lang }).value;
    }
  } catch {
  }
  return hljs.highlightAuto(props.code).value;
});
</script>

<template>
  <div class="code-highlight">
    <div v-if="filename" class="code-header">
      <span class="filename">{{ filename }}</span>
      <span v-if="language" class="language-badge">{{ language }}</span>
    </div>
    <pre class="code-block"><code v-html="highlightedCode"></code></pre>
  </div>
</template>

<style scoped>
@import 'highlight.js/styles/github.css';

.code-highlight {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: white;
}

.code-header {
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

.language-badge {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
}

.code-block {
  margin: 0;
  padding: 1rem;
  overflow-x: auto;
  font-size: 0.875rem;
  line-height: 1.6;
  background: #fafafa;
}

.code-block :deep(code) {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  background: none;
  padding: 0;
}
</style>
