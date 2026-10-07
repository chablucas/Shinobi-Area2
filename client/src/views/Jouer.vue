<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()

const modes = [
  { title: '1 VS ORDI', description: 'Construis ton personnage contre l’ordinateur.', href: '/solo', className: 'mode-solo' },
  { title: '1 VS 1', description: 'Construisez chacun votre personnage sur le même appareil.', href: '/partie', className: 'mode-duel' },
  { title: '1 VS 1 VS 1', description: 'Trois joueurs construisent chacun leur personnage.', href: '/3-joueurs', className: 'mode-triple' },
]

onMounted(() => auth.loadCurrentUser())
</script>

<template>
  <main class="mode-page">
    <SocialHeader />
    <section class="mode-content" aria-labelledby="mode-title">
      <header class="mode-heading"><p class="eyebrow">Sélection de mission</p><h1 id="mode-title">Crée ton perso</h1><p>Choisis ton terrain avant d’entrer dans l’arène.</p></header>
      <div class="mode-choice-grid">
        <article v-for="mode in modes" :key="mode.href" class="mode-choice" :class="mode.className"><p class="mode-number">0{{ modes.indexOf(mode) + 1 }}</p><h2>{{ mode.title }}</h2><p>{{ mode.description }}</p><a class="mode-play" :href="mode.href">Jouer <span>→</span></a></article>
      </div>
    </section>
  </main>
</template>

<style scoped src="./Jouer.css"></style>