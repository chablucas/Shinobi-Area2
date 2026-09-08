<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SocialHeader from '../components/SocialHeader.vue'
import AdminNav from '../components/AdminNav.vue'
import { useAuthStore } from '../stores/auth'
import { fetchAdminCards, type AdminCardSummary } from '../services/adminApi'
import { fetchTeamScores, resetTeamScore, saveTeamScores, type TeamScoreEntry } from '../services/cardAdminApi'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const tab = ref<'creator' | 'team'>(route.query.tab === 'team' ? 'team' : 'creator')
const loading = ref(true)
const error = ref('')
const status = ref('')
const saving = ref(false)

const cards = ref<AdminCardSummary[]>([])
const query = ref('')

const teamScores = ref<TeamScoreEntry[]>([])
const teamQuery = ref('')
const teamEdits = ref<Record<string, number>>({})

const filteredTeamScores = computed(() => {
  const needle = teamQuery.value.trim().toLowerCase()
  if (!needle) return teamScores.value
  return teamScores.value.filter((entry) => entry.name.toLowerCase().includes(needle) || entry.slug.includes(needle))
})

const dirtyTeamScores = computed<Array<{ slug: string; score: number }>>(() => {
  const changed: Array<{ slug: string; score: number }> = []
  for (const entry of teamScores.value) {
    const score = teamEdits.value[entry.slug]
    if (typeof score === 'number' && Number.isInteger(score) && score !== entry.score) changed.push({ slug: entry.slug, score })
  }
  return changed
})

watch(tab, (value) => {
  void router.replace({ query: { ...route.query, tab: value } })
})

async function loadCards() {
  if (!auth.token) return
  cards.value = await fetchAdminCards(auth.token, query.value, '')
}

async function loadTeamScores() {
  if (!auth.token) return
  teamScores.value = await fetchTeamScores(auth.token)
  teamEdits.value = Object.fromEntries(teamScores.value.map((entry) => [entry.slug, entry.score]))
}

onMounted(async () => {
  await auth.loadCurrentUser()
  if (!auth.token || auth.user?.role !== 'ADMIN') {
    await router.replace('/personnages')
    return
  }
  try {
    await Promise.all([loadCards(), loadTeamScores()])
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'Chargement impossible.'
  } finally {
    loading.value = false
  }
})

async function refreshCards() {
  try {
    await loadCards()
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'Recherche impossible.'
  }
}

function openCard(card: AdminCardSummary) {
  void router.push(`/admin/cards/${encodeURIComponent(card.slug)}`)
}

async function saveTeam() {
  if (!auth.token || !dirtyTeamScores.value.length) return
  saving.value = true
  status.value = ''
  error.value = ''
  try {
    teamScores.value = await saveTeamScores(auth.token, dirtyTeamScores.value)
    teamEdits.value = Object.fromEntries(teamScores.value.map((entry) => [entry.slug, entry.score]))
    status.value = 'Notes Team enregistrées.'
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'Enregistrement impossible.'
  } finally {
    saving.value = false
  }
}

async function restoreTeamScore(slug: string) {
  if (!auth.token) return
  saving.value = true
  try {
    teamScores.value = await resetTeamScore(auth.token, slug)
    teamEdits.value = Object.fromEntries(teamScores.value.map((entry) => [entry.slug, entry.score]))
    status.value = 'Note Team réinitialisée sur la valeur du fichier Team.'
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'Réinitialisation impossible.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <main class="admin-page">
    <SocialHeader />
    <section class="admin-shell">
      <header class="admin-header">
        <p class="eyebrow">Administration</p>
        <h1>Cartes</h1>
      </header>

      <AdminNav />

      <nav class="tabs">
        <button type="button" :class="{ active: tab === 'creator' }" @click="tab = 'creator'">Créer ton perso</button>
        <button type="button" :class="{ active: tab === 'team' }" @click="tab = 'team'">Team</button>
      </nav>

      <div v-if="loading" class="state-message">Chargement des cartes...</div>
      <template v-else>
        <div v-if="error" class="state-message error">{{ error }}</div>
        <div v-if="status" class="state-message">{{ status }}</div>

        <section v-if="tab === 'creator'" class="panel">
          <p class="panel-hint">Statistiques complètes du personnage, issues du fichier « Créer ton perso » (shinobi-cards-data.json).</p>
          <input v-model="query" class="auth-input" type="search" placeholder="Rechercher un personnage" @input="refreshCards" />
          <div class="card-list">
            <article v-for="card in cards" :key="card.slug" class="admin-card-row">
              <div class="mini-card">
                <img v-if="card.imageUrl" :src="card.imageUrl" :alt="card.name" />
                <span v-else>{{ card.name.slice(0, 1) }}</span>
              </div>
              <div class="meta">
                <strong>{{ card.name }}</strong>
                <small>{{ card.rarity }}</small>
              </div>
              <button type="button" @click="openCard(card)">MODIFIER</button>
            </article>
          </div>
        </section>

        <section v-else class="panel">
          <p class="panel-hint">Note du personnage utilisée par Team Auction (fichier team-auction-power.json). Indépendante des statistiques « Créer ton perso ».</p>
          <div class="team-toolbar">
            <input v-model="teamQuery" class="auth-input" type="search" placeholder="Rechercher un personnage" />
            <button type="button" :disabled="saving || !dirtyTeamScores.length" @click="saveTeam">
              SAUVEGARDER ({{ dirtyTeamScores.length }})
            </button>
          </div>
          <div class="card-list">
            <article v-for="entry in filteredTeamScores" :key="entry.slug" class="team-row">
              <div class="meta">
                <strong>{{ entry.name }}</strong>
                <small>{{ entry.slug }} · note fichier : {{ entry.baseScore }}</small>
              </div>
              <input v-model.number="teamEdits[entry.slug]" class="auth-input score" type="number" min="0" max="100" step="1" />
              <button v-if="entry.overridden" type="button" class="secondary" :disabled="saving" @click="restoreTeamScore(entry.slug)">RÉINITIALISER</button>
            </article>
          </div>
        </section>
      </template>
    </section>
  </main>
</template>

<style scoped>
.admin-page {
  min-height: 100vh;
  background: var(--bg-main);
  color: var(--text-main);
}
.admin-shell {
  max-width: 1100px;
  margin: 0 auto;
  padding: 48px 20px 90px;
}
.admin-header h1 {
  margin: 8px 0 0;
  font-size: clamp(2.2rem, 5vw, 4rem);
  color: var(--accent-orange);
}
.eyebrow {
  margin: 0;
  color: var(--accent-gold);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.7rem;
}
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 18px;
}
.tabs button {
  border: 1px solid var(--border-strong);
  background: transparent;
  color: var(--text-main);
  font-weight: 700;
  min-height: 40px;
  padding: 0 18px;
  cursor: pointer;
}
.tabs button.active {
  background: var(--accent-gold);
  color: #241b12;
}
.panel {
  background: var(--bg-panel);
  border: 1px solid var(--border-strong);
  padding: 18px;
}
.panel-hint {
  margin-top: 0;
  color: var(--text-muted);
}
.auth-input {
  min-height: 42px;
  width: 100%;
}
.team-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  margin-bottom: 16px;
}
.card-list {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}
.admin-card-row {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 10px 12px;
  border: 1px solid var(--border-light);
  background: rgba(255, 255, 255, 0.02);
}
.team-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 110px auto;
  align-items: center;
  gap: 14px;
  padding: 10px 12px;
  border: 1px solid var(--border-light);
  background: rgba(255, 255, 255, 0.02);
}
.team-row .score {
  width: 110px;
}
.mini-card {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-panel-strong);
  display: grid;
  place-items: center;
  color: var(--accent-orange);
  font-weight: 700;
}
.mini-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.meta {
  display: grid;
  min-width: 0;
}
.meta strong {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.meta small {
  color: var(--text-muted);
}
button {
  border: 1px solid var(--border-strong);
  background: var(--accent-orange);
  color: #241b12;
  font-weight: 700;
  min-height: 38px;
  padding: 0 16px;
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
.state-message {
  color: var(--accent-gold);
  margin-bottom: 12px;
}
.state-message.error {
  color: #ffb7b7;
}
@media (max-width: 720px) {
  .team-toolbar,
  .team-row,
  .admin-card-row {
    grid-template-columns: 1fr;
  }
  .team-row .score {
    width: 100%;
  }
}
</style>
