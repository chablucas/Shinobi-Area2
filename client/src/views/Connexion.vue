<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true

  try {
    await auth.login(email.value, password.value)
    await router.push('/')
  } catch (exception) {
    error.value =
      exception instanceof Error
        ? exception.message
        : 'Connexion impossible.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="auth-page">
    <nav class="auth-nav">
      <a class="brand" href="/">
        <img
          class="brand-logo"
          src="/logo.png"
          alt="Shinobi Area"
        />
      </a>

      <a
        class="profile-link"
        href="/inscription"
      >
        Créer un compte
      </a>
    </nav>

    <form
      class="auth-panel"
      @submit.prevent="submit"
    >
      <p class="eyebrow">
        Accès shinobi
      </p>

      <h1>Connexion</h1>

      <label for="login-email">
        Email
      </label>

      <input
        id="login-email"
        v-model.trim="email"
        class="auth-input"
        type="email"
        autocomplete="email"
        required
      />

      <label for="login-password">
        Mot de passe
      </label>

      <input
        id="login-password"
        v-model="password"
        class="auth-input"
        type="password"
        autocomplete="current-password"
        required
      />

      <p
        v-if="error"
        class="auth-error"
      >
        {{ error }}
      </p>

      <button
        class="auth-submit"
        type="submit"
        :disabled="loading"
      >
        {{ loading ? 'Connexion...' : 'Se connecter' }}
      </button>

      <p class="auth-switch">
        Pas encore de compte ?
        <a href="/inscription">
          S'inscrire
        </a>
      </p>
    </form>
  </main>
</template>

<style scoped src="./Connexion.css"></style>