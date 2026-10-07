<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppFooter from './components/AppFooter.vue'
import './App.css'
</script>

<template>
  <div class="app-layout">
    <main class="app-content">
      <RouterView />
    </main>

    <AppFooter />
  </div>
</template>