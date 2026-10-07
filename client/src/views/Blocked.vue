<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import './Blocked.css'

const router = useRouter()
const auth = useAuthStore()

async function logout() {
  auth.logout()
  await router.push('/')
}
</script>

<template>
  <main class="access-page">
    <section class="access-card">
      <h1>Accès désactivé</h1>

      <p>
        Désolé. Votre accès à Shinobi Area a été désactivé.
      </p>

      <button
        class="access-logout"
        type="button"
        @click="logout"
      >
        Se déconnecter
      </button>
    </section>
  </main>
</template>