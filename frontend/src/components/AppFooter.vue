<script setup lang="ts">
</script>

<template>
  <footer class="app-footer">
    <div class="container footer-content">
      <p class="footer-text">
        Gist Platform &copy; {{ new Date().getFullYear() }}. All rights reserved.
      </p>
    </div>
  </footer>
</template>

<style scoped>
.app-footer {
  background: white;
  border-top: 1px solid var(--border-color);
  padding: 1.5rem 1rem;
  margin-top: 2rem;
}

.footer-content {
  max-width: 1400px;
  margin: 0 auto;
  text-align: center;
}

.footer-text {
  color: var(--text-muted);
  font-size: 0.875rem;
}
</style>
