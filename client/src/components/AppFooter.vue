<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

import cartesIcon from '../assets/footer/Logo_Carte.png'
import homeIcon from '../assets/footer/Logo_Home.png'
import reglesIcon from '../assets/footer/Logo_Admin.png'

import './AppFooter.css'

const router = useRouter()
const route = useRoute()

function goTo(path: string) {
  if (route.path !== path) {
    router.push(path)
  }
}
</script>

<template>
  <nav class="app-footer">

    <!-- CARTES -->
    <button
      type="button"
      class="footer-button"
      :class="{ active: route.path === '/personnages' }"
      aria-label="Cartes"
      @click="goTo('/personnages')"
    >
      <img
        :src="cartesIcon"
        alt=""
        class="footer-button-image"
      />
    </button>

    <!-- HOME -->
    <button
      type="button"
      class="footer-button"
      :class="{ active: route.path === '/' }"
      aria-label="Accueil"
      @click="goTo('/')"
    >
      <img
        :src="homeIcon"
        alt=""
        class="footer-button-image"
      />
    </button>

    <!-- RÈGLES -->
    <button
      type="button"
      class="footer-button"
      :class="{ active: route.path === '/regles' }"
      aria-label="Règles"
      @click="goTo('/regles')"
    >
      <img
        :src="reglesIcon"
        alt=""
        class="footer-button-image"
      />
    </button>

  </nav>
</template>