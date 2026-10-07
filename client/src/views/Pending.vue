<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import './Pending.css'

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
      <h1>Demande en attente</h1>

      <p>
        Votre demande d'accès à Shinobi Area a bien été enregistrée.
      </p>

      <p class="access-secondary">
        Un administrateur doit maintenant valider votre compte.
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