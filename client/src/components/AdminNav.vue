<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const links = [
  { path: '/admin', label: 'Dashboard' },
  { path: '/admin/cards', label: 'Cartes' },
  { path: '/admin/rules', label: 'Règles' },
]

function isActive(path: string) {
  return path === '/admin' ? route.path === '/admin' : route.path.startsWith(path)
}
</script>

<template>
  <nav class="admin-nav">
    <button
      v-for="link in links"
      :key="link.path"
      type="button"
      :class="{ active: isActive(link.path) }"
      @click="router.push(link.path)"
    >
      {{ link.label }}
    </button>
  </nav>
</template>

<style scoped>
.admin-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 24px;
}
.admin-nav button {
  border: 1px solid var(--border-strong);
  background: transparent;
  color: var(--text-main);
  font-weight: 700;
  min-height: 38px;
  padding: 0 18px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  cursor: pointer;
}
.admin-nav button.active {
  background: var(--accent-orange);
  color: #241b12;
}
</style>
