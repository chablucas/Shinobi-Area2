<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SocialHeader from '../components/SocialHeader.vue'
import { useAuthStore } from '../stores/auth'
import { fetchAdminCard, fetchCreatorStatKeys, resetCardStats, saveCardStats } from '../services/cardAdminApi'
import type { Card } from '../types/card'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const card = ref<Card | null>(null)
const editValues = ref<Record<string, number>>({})
const statKeys = ref<string[]>([])
const status = ref('')
const error = ref('')
const loading = ref(true)
const saving = ref(false)

const statLabels: Record<string, string> = {
  chakra: 'Chakra',
  invocation: 'Invocation',
  iq: 'IQ',
  ninjutsuAttack: 'Ninjutsu Attaque',
  ninjutsuDefense: 'Ninjutsu Défense',
  genjutsu: 'Genjutsu',
  taijutsu: 'Taijutsu',
  avatar: 'Avatar',
  body: 'Body',
  fuinjutsu: 'Fūinjutsu',
  senjutsu: 'Senjutsu',
  kenjutsu: 'Kenjutsu',
  speed: 'Vitesse',
  kekkeiGenkai: 'Kekkei Genkai',
  kekkeiMora: 'Kekkei Mōra',
}

const powerCatalog = computed(() => card.value?.catalog?.powerCatalog ?? {})
const physicalTraitCatalog = computed(() => card.value?.catalog?.physicalTraitCatalog ?? {})
const transformationCatalog = computed(() => card.value?.catalog?.transformationCatalog ?? {})

const isDirty = computed(() => {
  if (!card.value) return false
  return statKeys.value.some((key) => Number(editValues.value[key] ?? 0) !== Number(card.value?.effectiveStats[key] ?? 0))
})

function getCatalogLabel(catalog: Record<string, { label: string }>, id: string) {
  return catalog[id]?.label ?? id
}

function syncFromCard(nextCard: Card) {
  card.value = nextCard
  editValues.value = Object.fromEntries(statKeys.value.map((key) => [key, nextCard.effectiveStats[key] ?? 0]))
}

onMounted(async () => {
  await auth.loadCurrentUser()
  if (!auth.token || auth.user?.role !== 'ADMIN') {
    await router.replace('/personnages')
    return
  }

  const slug = String(route.params.slug ?? '')
  try {
    const [keys, nextCard] = await Promise.all([
      fetchCreatorStatKeys(auth.token),
      fetchAdminCard(auth.token, decodeURIComponent(slug)),
    ])
    statKeys.value = keys
    syncFromCard(nextCard)
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'Carte introuvable.'
  } finally {
    loading.value = false
  }
})

async function saveCard() {
  if (!auth.token || !card.value) return
  saving.value = true
  status.value = ''
  error.value = ''
  try {
    const stats = Object.fromEntries(statKeys.value.map((key) => [key, Number(editValues.value[key] ?? 0)]))
    syncFromCard(await saveCardStats(auth.token, card.value.slug, stats))
    status.value = 'Personnage enregistré.'
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'Enregistrement impossible.'
  } finally {
    saving.value = false
  }
}

async function resetStats() {
  if (!auth.token || !card.value) return
  saving.value = true
  status.value = ''
  error.value = ''
  try {
    syncFromCard(await resetCardStats(auth.token, card.value.slug))
    status.value = 'Statistiques réinitialisées sur le fichier « Créer ton perso ».'
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'Réinitialisation impossible.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <main class="admin-card-page">
    <SocialHeader />
    <section class="page-shell">
      <nav class="breadcrumb">
        <button type="button" class="secondary" @click="router.push('/admin/cards')">← Retour aux cartes</button>
      </nav>

      <div v-if="loading" class="state-message">Chargement de la carte...</div>
      <div v-else-if="!card" class="state-message error">{{ error || 'Carte introuvable.' }}</div>
      <template v-else>
        <header class="card-header">
          <div class="card-identity">
            <p class="eyebrow">Cartes · Créer ton perso</p>
            <h1>{{ card.name }}</h1>
            <p class="slug">{{ card.slug }}</p>
          </div>
          <img v-if="card.imageUrl" :src="card.imageUrl" :alt="card.name" class="card-image" />
        </header>

        <div v-if="error" class="state-message error">{{ error }}</div>
        <div v-if="status" class="state-message">{{ status }}</div>

        <div class="save-bar">
          <button type="button" :disabled="saving || !isDirty" @click="saveCard">SAUVEGARDER</button>
          <button type="button" class="secondary" :disabled="saving" @click="resetStats">Réinitialiser les statistiques</button>
          <span v-if="isDirty" class="dirty-hint">Modifications non enregistrées</span>
        </div>

        <div class="admin-grid">
          <section class="panel panel-wide">
            <h2>Statistiques « Créer ton perso »</h2>
            <p class="panel-hint">Champs générés à partir de la structure actuelle du fichier de données du mode.</p>
            <div class="stats-grid">
              <label v-for="statKey in statKeys" :key="statKey" class="stat-row">
                <span>{{ statLabels[statKey] ?? statKey }}</span>
                <input v-model.number="editValues[statKey]" type="number" min="0" max="100" step="1" />
              </label>
            </div>
          </section>

          <section class="panel">
            <h2>Clans</h2>
            <div class="badge-list">
              <span v-for="clan in card.clans ?? []" :key="clan" class="badge">{{ clan }}</span>
              <span v-if="!(card.clans?.length)" class="empty-state">Aucun clan</span>
            </div>
          </section>

          <section class="panel">
            <h2>Pouvoirs</h2>
            <div class="badge-list">
              <span v-for="powerId in card.powerIds ?? []" :key="powerId" class="badge">{{ getCatalogLabel(powerCatalog, powerId) }}</span>
              <span v-if="!(card.powerIds?.length)" class="empty-state">Aucun pouvoir</span>
            </div>
          </section>

          <section class="panel">
            <h2>Traits physiques</h2>
            <div class="badge-list">
              <span v-for="traitId in card.physicalTraitIds ?? []" :key="traitId" class="badge">{{ getCatalogLabel(physicalTraitCatalog, traitId) }}</span>
              <span v-if="!(card.physicalTraitIds?.length)" class="empty-state">Aucun trait physique</span>
            </div>
          </section>

          <section class="panel">
            <h2>Transformations</h2>
            <div class="badge-list">
              <span v-for="transformationId in card.transformationIds ?? []" :key="transformationId" class="badge">{{ getCatalogLabel(transformationCatalog, transformationId) }}</span>
              <span v-if="!(card.transformationIds?.length)" class="empty-state">Aucune transformation</span>
            </div>
          </section>

          <section class="panel">
            <h2>Avatars</h2>
            <div class="badge-list">
              <span v-for="avatar in card.avatars ?? []" :key="avatar.id" class="badge">{{ avatar.name }}</span>
              <span v-if="!(card.avatars?.length)" class="empty-state">Aucun avatar</span>
            </div>
          </section>
        </div>

        <p class="footnote">Les règles de combat sont administrées depuis la page « Règles ».</p>
      </template>
    </section>
  </main>
</template>

<style scoped>
.admin-card-page {
  min-height: 100vh;
  background: var(--bg-main);
  color: var(--text-main);
}
.page-shell {
  max-width: 1180px;
  margin: 0 auto;
  padding: 32px 18px 80px;
}
.breadcrumb {
  margin-bottom: 18px;
}
button {
  border: 1px solid var(--border-strong);
  background: linear-gradient(180deg, #ffb142, #e08814);
  color: #1c130b;
  font-weight: 700;
  min-height: 40px;
  padding: 0 18px;
  border-radius: 10px;
  cursor: pointer;
}
button.secondary {
  background: transparent;
  color: var(--text-main);
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
  padding: 24px;
  background: var(--bg-panel);
  border: 1px solid rgba(242, 161, 67, 0.5);
  border-radius: 16px;
}
.card-identity h1 {
  margin: 6px 0 4px;
  color: var(--accent-orange);
  font-size: clamp(1.8rem, 3vw, 2.6rem);
}
.eyebrow {
  margin: 0;
  color: var(--accent-gold);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.7rem;
}
.slug {
  margin: 0;
  color: var(--text-muted);
}
.card-image {
  width: 120px;
  border-radius: 12px;
}
.save-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}
.dirty-hint {
  color: var(--accent-gold);
  font-size: 0.8rem;
}
.admin-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}
.panel {
  background: var(--bg-panel);
  border: 1px solid var(--border-strong);
  border-radius: 14px;
  padding: 18px;
}
.panel-wide {
  grid-column: 1 / -1;
}
.panel h2 {
  margin-top: 0;
  color: var(--accent-orange);
  font-size: 1.1rem;
}
.panel-hint {
  margin-top: 0;
  color: var(--text-muted);
  font-size: 0.8rem;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}
.stat-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 96px;
  align-items: center;
  gap: 10px;
}
.stat-row span {
  color: var(--text-muted);
}
input,
select {
  min-height: 38px;
  width: 100%;
  background: var(--bg-panel-strong);
  color: var(--text-main);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  padding: 0 10px;
}
.badge-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.badge {
  border: 1px solid var(--border-light);
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.78rem;
}
.empty-state {
  color: var(--text-muted);
  font-size: 0.8rem;
}
.state-message {
  color: var(--accent-gold);
  margin-bottom: 12px;
}
.state-message.error {
  color: #ffb7b7;
}
.footnote {
  margin-top: 24px;
  color: var(--text-muted);
  font-size: 0.8rem;
}
@media (max-width: 640px) {
  .card-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
