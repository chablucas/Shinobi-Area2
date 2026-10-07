<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

const displayName = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true

  try {
    await auth.register(
      email.value,
      password.value,
      displayName.value,
    )

    await router.push('/profil')
  } catch (exception) {
    error.value =
      exception instanceof Error
        ? exception.message
        : 'Inscription impossible.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="auth-page">
    <nav class="auth-nav">
      <a
        class="brand"
        href="/"
      >
        <img
          class="brand-logo"
          src="/logo.png"
          alt="Shinobi Area"
        />
      </a>

      <a
        class="profile-link"
        href="/connexion"
      >
        Se connecter
      </a>
    </nav>

    <form
      class="auth-panel"
      @submit.prevent="submit"
    >
      <p class="eyebrow">
        Nouveau shinobi
      </p>

      <h1>Inscription</h1>

      <label for="register-name">
        Nom / pseudo
      </label>

      <input
        id="register-name"
        v-model.trim="displayName"
        class="auth-input"
        type="text"
        autocomplete="nickname"
        required
      />

      <label for="register-email">
        Email
      </label>

      <input
        id="register-email"
        v-model.trim="email"
        class="auth-input"
        type="email"
        autocomplete="email"
        required
      />

      <label for="register-password">
        Mot de passe
      </label>

      <input
        id="register-password"
        v-model="password"
        class="auth-input"
        type="password"
        autocomplete="new-password"
        minlength="6"
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
        {{ loading ? 'Création...' : 'Créer mon compte' }}
      </button>

      <p class="auth-switch">
        Déjà un compte ?
        <a href="/connexion">
          Se connecter
        </a>
      </p>
    </form>
  </main>
</template>

<style scoped src="./Inscription.css"></style>