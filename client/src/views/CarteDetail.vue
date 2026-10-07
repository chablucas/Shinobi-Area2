<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { fetchCard } from '../services/cardApi'
import type { Card } from '../types/card'

const route = useRoute()
const card = ref<Card | null>(null)
const error = ref('')
onMounted(async () => { try { card.value = await fetchCard(String(route.params.slug)) } catch (exception) { error.value = exception instanceof Error ? exception.message : 'Carte introuvable.' } })
</script>

<template><main class="card-detail-page"><SocialHeader /><section class="card-detail-content"><p v-if="error" class="card-error">{{ error }}</p><article v-else-if="card" class="card-detail"><div class="card-detail-image"><img v-if="card.imageUrl" :src="card.imageUrl" :alt="card.name" /></div><div><p class="eyebrow">Shinobi</p><h1>{{ card.name }}</h1><div class="stat-list"><span v-for="(value, key) in card.stats" :key="key"><b>{{ key }}</b><i>{{ value ?? 0 }}</i></span></div></div></article></section></main></template>

<style scoped src="./CarteDetail.css"></style>
