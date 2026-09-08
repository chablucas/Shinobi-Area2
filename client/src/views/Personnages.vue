<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SocialHeader from '../components/SocialHeader.vue'
import { fetchAllCards } from '../services/cardApi'
import { fetchTeamScores, resetTeamScore, saveCardStats, saveTeamScores, type TeamScoreEntry } from '../services/cardAdminApi'
import type { Card, CardModifier } from '../types/card'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const tab = ref<'creator' | 'team'>(route.query.tab === 'team' ? 'team' : 'creator')
const cards = ref<Card[]>([])
const query = ref('')
const rarity = ref('')
const sort = ref<'name' | 'rarity-asc' | 'rarity-desc'>('rarity-asc')
const flipped = ref(new Set<string>())
const error = ref('')
const loading = ref(true)
const isAdmin = computed(() => auth.user?.role === 'ADMIN')

watch(tab, (value) => {
  void router.replace({ query: { ...route.query, tab: value } })
})

const rarityOrder = computed(() =>
  cards.value
    .map((card) => card.rarityMetadata)
    .filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index)
    .sort((a, b) => a.rank - b.rank),
)
const filteredCards = computed(() =>
  cards.value
    .filter(
      (card) =>
        card.name.toLowerCase().includes(query.value.trim().toLowerCase()) &&
        (!rarity.value || card.effectiveRarity === rarity.value),
    )
    .sort((a, b) =>
      sort.value === 'name'
        ? a.name.localeCompare(b.name)
        : sort.value === 'rarity-asc'
          ? a.rarityMetadata.rank - b.rarityMetadata.rank
          : b.rarityMetadata.rank - a.rarityMetadata.rank,
    ),
)
const statLabels: Record<string, string> = {
  chakra: 'Chakra', invocation: 'Invocation', iq: 'IQ', ninjutsuAttack: 'Ninjutsu Attaque', ninjutsuDefense: 'Ninjutsu Défense', genjutsu: 'Genjutsu', taijutsu: 'Taijutsu',
  avatar: 'Avatar', body: 'Body', fuinjutsu: 'Fûinjutsu', senjutsu: 'Senjutsu', kenjutsu: 'Kenjutsu',
  speed: 'Vitesse', kekkeiGenkai: 'Kekkei Genkai', kekkeiMora: 'Kekkei Mōra',
}
const compactStatKeys = ['chakra', 'invocation', 'iq', 'genjutsu', 'taijutsu', 'avatar', 'body', 'fuinjutsu', 'senjutsu', 'kenjutsu', 'speed', 'kekkeiGenkai']

// --- Onglet Créer ton perso : édition admin des statistiques (shinobi-cards-data.json + overrides) ---
const selected = ref<Card | null>(null)
const editStatKeys = ref<string[]>([])
const editValues = ref<Record<string, number>>({})
const adminStatus = ref('')
const adminError = ref('')
const savingCard = ref(false)

const isDirty = computed(() => {
  if (!selected.value) return false
  return editStatKeys.value.some((key) => Number(editValues.value[key] ?? 0) !== Number(selected.value?.effectiveStats[key] ?? 0))
})

function openAdmin(card: Card) {
  if (!isAdmin.value) return
  selected.value = card
  editStatKeys.value = Object.keys(card.effectiveStats)
  editValues.value = Object.fromEntries(editStatKeys.value.map((key) => [key, card.effectiveStats[key] ?? 0]))
  adminStatus.value = ''
  adminError.value = ''
}
function closeAdmin() {
  selected.value = null
}
function syncCard(nextCard: Card) {
  selected.value = nextCard
  editStatKeys.value = Object.keys(nextCard.effectiveStats)
  editValues.value = Object.fromEntries(editStatKeys.value.map((key) => [key, nextCard.effectiveStats[key] ?? 0]))
  const index = cards.value.findIndex((card) => card.slug === nextCard.slug)
  if (index >= 0) cards.value[index] = nextCard
}
async function saveCard() {
  if (!auth.token || !selected.value) return
  savingCard.value = true
  adminStatus.value = ''
  adminError.value = ''
  try {
    const stats = Object.fromEntries(editStatKeys.value.map((key) => [key, Number(editValues.value[key] ?? 0)]))
    syncCard(await saveCardStats(auth.token, selected.value.slug, stats))
    adminStatus.value = 'Personnage enregistré.'
  } catch (exception) {
    adminError.value = exception instanceof Error ? exception.message : 'Enregistrement impossible.'
  } finally {
    savingCard.value = false
  }
}

// --- Onglet Team Combat : note utilisée par Team Auction (team-auction-power.json + override) ---
const teamScores = ref<TeamScoreEntry[]>([])
const teamQuery = ref('')
const teamEdits = ref<Record<string, number>>({})
const teamStatus = ref('')
const teamError = ref('')
const savingTeamSlug = ref<string | null>(null)

const filteredTeamScores = computed(() => {
  const needle = teamQuery.value.trim().toLowerCase()
  if (!needle) return teamScores.value
  return teamScores.value.filter((entry) => entry.name.toLowerCase().includes(needle) || entry.slug.includes(needle))
})

async function loadTeamScores() {
  teamScores.value = await fetchTeamScores(auth.token || undefined)
  teamEdits.value = Object.fromEntries(teamScores.value.map((entry) => [entry.slug, entry.score]))
}

async function saveTeamScore(entry: TeamScoreEntry) {
  if (!auth.token) return
  const nextScore = teamEdits.value[entry.slug]
  if (typeof nextScore !== 'number' || !Number.isInteger(nextScore)) return
  savingTeamSlug.value = entry.slug
  teamStatus.value = ''
  teamError.value = ''
  try {
    teamScores.value = await saveTeamScores(auth.token, [{ slug: entry.slug, score: nextScore }])
    teamEdits.value = Object.fromEntries(teamScores.value.map((item) => [item.slug, item.score]))
    teamStatus.value = `Note Team enregistrée pour ${entry.name}.`
  } catch (exception) {
    teamError.value = exception instanceof Error ? exception.message : 'Enregistrement impossible.'
  } finally {
    savingTeamSlug.value = null
  }
}

async function restoreTeamScore(entry: TeamScoreEntry) {
  if (!auth.token) return
  savingTeamSlug.value = entry.slug
  teamStatus.value = ''
  teamError.value = ''
  try {
    teamScores.value = await resetTeamScore(auth.token, entry.slug)
    teamEdits.value = Object.fromEntries(teamScores.value.map((item) => [item.slug, item.score]))
    teamStatus.value = `Note Team réinitialisée sur la valeur du fichier Team pour ${entry.name}.`
  } catch (exception) {
    teamError.value = exception instanceof Error ? exception.message : 'Réinitialisation impossible.'
  } finally {
    savingTeamSlug.value = null
  }
}

onMounted(async () => {
  try {
    await auth.loadCurrentUser()
    const [allCards] = await Promise.all([fetchAllCards(), loadTeamScores()])
    cards.value = allCards
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'Cartes indisponibles.'
  } finally {
    loading.value = false
  }
})
function toggle(slug: string) {
  const next = new Set(flipped.value)
  next.has(slug) ? next.delete(slug) : next.add(slug)
  flipped.value = next
}
function traitList(value?: string[]) {
  return value?.length ? value.join(', ') : 'Aucun'
}
function compactStats(card: Card) {
  const kekkeiMora = card.traits?.abilities?.kekkeiMora
  return [
    ...compactStatKeys.map((key) => ({ label: statLabels[key] ?? key, value: card.effectiveStats[key] ?? 0 })),
    { label: 'Ninjutsu', value: `ATQ ${card.effectiveStats.ninjutsuAttack ?? 0} · DEF ${card.effectiveStats.ninjutsuDefense ?? 0}` },
    { label: 'Kekkei Mōra', value: kekkeiMora?.length ? kekkeiMora.join(' · ') : '—' },
  ]
}
function modifierText(modifier: CardModifier) {
  return `${modifier.direction === 'BONUS' ? '+' : '-'}${modifier.value}${modifier.operation === 'PERCENT' ? ' %' : ' points'} ${modifier.target}`
}
</script>

<template>
  <main class="characters-page">
    <SocialHeader />
    <section class="characters-content">
      <p class="eyebrow">Collection officielle</p>
      <h1>CARTES</h1>
      <p class="characters-intro">
        Explore les 163 cartes de Shinobi Area. Un même personnage peut exister en plusieurs
        versions, avec des statistiques, raretés, capacités et restrictions différentes.
      </p>

      <nav class="tabs">
        <button type="button" :class="{ active: tab === 'creator' }" @click="tab = 'creator'">Créer ton perso</button>
        <button type="button" :class="{ active: tab === 'team' }" @click="tab = 'team'">Team Combat</button>
      </nav>

      <section v-if="tab === 'creator'">
        <div class="characters-toolbar">
          <input
            v-model="query"
            class="auth-input"
            type="search"
            placeholder="Rechercher un nom"
            aria-label="Rechercher un personnage"
          /><select v-model="rarity" class="auth-input" aria-label="Filtrer par rareté">
            <option value="">Toutes les raretés</option>
            <option v-for="item in rarityOrder" :key="item.id" :value="item.id">
              {{ item.label }}
            </option></select
          ><select v-model="sort" class="auth-input" aria-label="Trier les cartes">
            <option value="rarity-asc">Rareté croissante</option>
            <option value="rarity-desc">Rareté décroissante</option>
            <option value="name">Nom A-Z</option></select
          ><strong
            >{{ filteredCards.length }} résultat{{ filteredCards.length > 1 ? 's' : '' }}</strong
          >
        </div>
        <p v-if="loading" class="state-message">Chargement des shinobis...</p>
        <p v-else-if="error" class="state-message">{{ error }}</p>
        <div v-else-if="filteredCards.length" class="characters-grid">
          <div v-for="card in filteredCards" :key="card.slug" class="character-tile">
            <article
              class="flip-card"
              :class="{ flipped: flipped.has(card.slug) }"
              tabindex="0"
              @click="toggle(card.slug)"
              @keydown.enter="toggle(card.slug)"
            >
              <div class="flip-inner">
                <div class="card-face card-front" :style="{ '--rarity': card.rarityMetadata.colorHex }">
                  <div class="character-image">
                    <img
                      v-if="card.imageUrl"
                      :src="card.imageUrl"
                      :alt="card.name"
                      loading="lazy"
                    /><span v-else>{{ card.name.slice(0, 1) }}</span>
                  </div>
                  <p class="rarity-label">{{ card.rarityMetadata.label }}</p>
                  <h2>{{ card.name }}</h2>
                  <span class="card-slug">{{ card.slug }}</span>
                </div>
                <div class="card-face card-back">
                  <div class="card-back-header">
                    <p class="rarity-label">{{ card.rarityMetadata.label }}</p>
                    <div class="card-back-name">{{ card.name }}</div>
                  </div>
                  <div class="card-facts">
                    <div class="stats-section">
                      <span class="card-fact-label">Stats</span>
                      <div class="stats-grid">
                        <span v-for="stat in compactStats(card)" :key="stat.label"><span>{{ stat.label }}</span><strong>{{ stat.value }}</strong></span>
                      </div>
                    </div>
                    <div class="card-fact-row"><span class="card-fact-label">{{ (card.clans?.length ?? 0) > 1 ? 'Clans' : 'Clan' }}</span><span>{{ traitList(card.clans) }}</span></div>
                    <div v-if="card.traits?.powerUps?.length" class="card-fact-row"><span class="card-fact-label">Power Ups</span><span>{{ traitList(card.traits?.powerUps) }}</span></div>
                    <div v-if="[...(card.traits?.abilities?.ninjutsu ?? []), ...(card.traits?.abilities?.genjutsu ?? []), ...(card.traits?.abilities?.kekkeiGenkai ?? [])].length" class="card-fact-row"><span class="card-fact-label">Abilities</span><span>{{ traitList([...(card.traits?.abilities?.ninjutsu ?? []), ...(card.traits?.abilities?.genjutsu ?? []), ...(card.traits?.abilities?.kekkeiGenkai ?? [])]) }}</span></div>
                    <div v-if="card.traits?.dojutsu?.length" class="card-fact-row"><span class="card-fact-label">Dojutsu</span><span>{{ traitList(card.traits?.dojutsu) }}</span></div>
                    <div v-if="card.traits?.avatars?.length" class="card-fact-row"><span class="card-fact-label">Avatars</span><span>{{ traitList(card.traits?.avatars.map((avatar) => avatar.id)) }}</span></div>
                    <div v-if="[...(card.traits?.requirements?.ninjutsu ?? []), ...(card.traits?.requirements?.genjutsu ?? []), ...(card.traits?.requirements?.avatar ?? [])].length" class="card-fact-row"><span class="card-fact-label">Restrictions</span><span>{{ traitList([...(card.traits?.requirements?.ninjutsu ?? []), ...(card.traits?.requirements?.genjutsu ?? []), ...(card.traits?.requirements?.avatar ?? [])]) }}</span></div>
                    <div v-if="card.modifiers.some((modifier) => modifier.active)" class="card-fact-row"><span class="card-fact-label">Modificateurs</span><span>{{ card.modifiers.filter((modifier) => modifier.active).map(modifierText).join(' · ') }}</span></div>
                  </div>
                </div>
              </div>
            </article>
            <button v-if="isAdmin" type="button" class="edit-button" @click.stop="openAdmin(card)">MODIFIER</button>
          </div>
        </div>
        <p v-else class="state-message">Aucun shinobi ne correspond à ces critères.</p>
      </section>

      <section v-else class="panel team-tab">
        <p class="panel-hint">Note du personnage utilisée par Team Auction (team-auction-power.json). Indépendante des statistiques « Créer ton perso ».</p>
        <div v-if="teamError" class="state-message error">{{ teamError }}</div>
        <div v-if="teamStatus" class="state-message">{{ teamStatus }}</div>
        <input v-model="teamQuery" class="auth-input" type="search" placeholder="Rechercher un personnage" />
        <div class="team-list">
          <article v-for="entry in filteredTeamScores" :key="entry.slug" class="team-row">
            <div class="meta">
              <strong>{{ entry.name }}</strong>
              <small>{{ entry.slug }} · note fichier : {{ entry.baseScore }}</small>
            </div>
            <template v-if="isAdmin">
              <input v-model.number="teamEdits[entry.slug]" class="auth-input score" type="number" min="0" max="100" step="1" />
              <button type="button" :disabled="savingTeamSlug === entry.slug || teamEdits[entry.slug] === entry.score" @click="saveTeamScore(entry)">SAUVEGARDER</button>
              <button v-if="entry.overridden" type="button" class="secondary" :disabled="savingTeamSlug === entry.slug" @click="restoreTeamScore(entry)">RÉINITIALISER</button>
            </template>
            <strong v-else class="score-readonly">{{ entry.score }}</strong>
          </article>
        </div>
      </section>
    </section>

    <div v-if="selected" class="admin-overlay" @click.self="closeAdmin">
      <section class="admin-panel" role="dialog" aria-modal="true">
        <button class="close-button" type="button" aria-label="Fermer" @click="closeAdmin">×</button>
        <p class="eyebrow">Cartes · Créer ton perso</p>
        <h2>{{ selected.name }}</h2>
        <div v-if="adminError" class="state-message error">{{ adminError }}</div>
        <div v-if="adminStatus" class="state-message">{{ adminStatus }}</div>
        <p class="panel-hint">Champs générés à partir de la structure actuelle du fichier de données du mode.</p>
        <div class="admin-stats">
          <label v-for="key in editStatKeys" :key="key">
            {{ statLabels[key] ?? key }}
            <input v-model.number="editValues[key]" type="number" min="0" max="100" step="1" />
          </label>
        </div>
        <div class="save-bar">
          <button type="button" :disabled="savingCard || !isDirty" @click="saveCard">SAUVEGARDER</button>
          <span v-if="isDirty" class="dirty-hint">Modifications non enregistrées</span>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.characters-page {
  min-height: 100vh;
  background: var(--bg-main);
}
.characters-content {
  max-width: 1320px;
  margin: 0 auto;
  padding: 64px 20px 100px;
}
.characters-content h1 {
  margin: 12px 0;
  font-size: clamp(2.6rem, 7vw, 6rem);
  color: var(--accent-orange);
}
.characters-intro {
  max-width: 760px;
  color: var(--text-muted);
  line-height: 1.7;
}
.characters-toolbar {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr auto;
  align-items: center;
  gap: 10px;
  margin: 38px 0 24px;
}
.characters-toolbar strong {
  color: var(--accent-gold);
  font-size: 0.7rem;
}
.tabs {
  display: flex;
  gap: 8px;
  margin: 28px 0 24px;
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
.team-list {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}
.team-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 110px auto auto;
  align-items: center;
  gap: 14px;
  padding: 10px 12px;
  border: 1px solid var(--border-light);
  background: rgba(255, 255, 255, 0.02);
}
.team-row .meta {
  display: grid;
  min-width: 0;
}
.team-row .meta small {
  color: var(--text-muted);
}
.team-row .score {
  width: 110px;
}
.score-readonly {
  color: var(--accent-gold);
  font-size: 1.1rem;
}
.team-row button.secondary {
  background: transparent;
  color: var(--text-main);
}
.save-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin: 18px 0 8px;
}
.dirty-hint {
  color: var(--accent-gold);
  font-size: 0.8rem;
}
.characters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}
.flip-card {
  min-height: 330px;
  perspective: 1000px;
  cursor: pointer;
}
.flip-inner {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 330px;
  transition: transform 0.65s ease;
  transform-style: preserve-3d;
}
.flip-card.flipped .flip-inner {
  transform: rotateY(180deg);
}
.card-face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  padding: 12px;
  border: 2px solid var(--rarity, var(--border-strong));
  background: var(--bg-panel);
}
.card-front {
  display: flex;
  flex-direction: column;
}
.character-image {
  height: 210px;
  display: grid;
  place-items: center;
  background: var(--bg-panel-strong);
  overflow: hidden;
  color: var(--accent-orange);
  font:
    700 3rem 'Syne',
    sans-serif;
}
.character-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.rarity-label {
  color: var(--rarity, var(--accent-gold));
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
.card-front h2,
.card-back h2 {
  margin: 8px 0 2px;
  font-family: 'Syne', sans-serif;
  font-weight: 700;
  font-size: clamp(0.75rem, 1.7vw, 1.12rem);
  line-height: 1.15;
  text-transform: uppercase;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.card-slug {
  color: var(--text-muted);
  font-size: 0.55rem;
}
.card-back {
  transform: rotateY(180deg);
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
}
.card-back-header {
  display: grid;
  gap: 6px;
}
.card-back-name {
  margin: 0;
  color: var(--text-main);
  font-size: 0.82rem;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.03em;
  text-transform: uppercase;
}
.card-facts {
  display: grid;
  gap: 8px;
  min-width: 0;
  margin-top: 10px;
  color: var(--text-muted);
  font-size: 9px;
  line-height: 1.35;
  word-break: break-word;
}
.card-fact-row,
.card-facts > span {
  display: grid;
  gap: 4px;
  min-width: 0;
  overflow: hidden;
}
.card-fact-label {
  display: block;
  color: var(--text-soft);
  text-transform: uppercase;
  font-size: 8px;
  letter-spacing: 0.08em;
}
.stats-section {
  display: grid;
  gap: 5px;
}
.stats-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 4px 10px;
  padding: 8px 0;
  border-top: 1px solid var(--border-light);
  border-bottom: 1px solid var(--border-light);
}
.stats-grid > span {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: var(--text-muted);
  font-size: 9px;
  line-height: 1.25;
  white-space: nowrap;
}
.stats-grid > span > span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.stats-grid strong {
  flex: 0 0 auto;
  color: var(--text-main);
  font-size: 9px;
  font-weight: 700;
  white-space: nowrap;
  text-align: right;
}
.edit-button,
.admin-panel button {
  border: 1px solid var(--border-strong);
  padding: 8px;
  background: var(--accent-orange);
  color: #2b2113;
  font-size: 0.58rem;
  font-weight: 700;
  cursor: pointer;
}
.admin-panel button:disabled,
.team-row button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.edit-button {
  margin-top: 12px;
}
.state-message {
  color: var(--accent-gold);
}
.state-message.error {
  color: #ffb7b7;
}
.admin-overlay {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(10, 11, 12, 0.8);
}
.admin-panel {
  position: relative;
  width: min(760px, 100%);
  max-height: 92vh;
  overflow: auto;
  padding: 28px;
  background: var(--bg-panel);
  border: 1px solid var(--border-strong);
}
.admin-panel h2 {
  margin: 8px 0 22px;
  color: var(--accent-orange);
}
.admin-panel h3 {
  margin: 26px 0 12px;
  color: var(--accent-gold);
  font-size: 0.75rem;
}
.close-button {
  position: absolute;
  top: 10px;
  right: 10px;
}
.admin-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.admin-stats label {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 5px;
  color: var(--text-soft);
  font-size: 0.6rem;
}
.admin-stats label span {
  grid-column: 1 / -1;
  color: var(--text-muted);
  font-size: 0.5rem;
}
.admin-stats input {
  min-width: 0;
  background: var(--bg-panel-strong);
  color: var(--text-main);
  border: 1px solid var(--border-light);
}
.modifier-list {
  display: grid;
  gap: 8px;
  padding: 0;
  list-style: none;
  color: var(--text-muted);
  font-size: 0.6rem;
}
.modifier-list li {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
}
.modifier-form {
  display: grid;
  gap: 8px;
}
.auth-input {
  min-height: 40px;
}
@media (max-width: 700px) {
  .characters-content {
    padding: 32px 14px 60px;
  }
  .characters-toolbar {
    grid-template-columns: 1fr;
  }
  .characters-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 5px;
  }
  .character-image {
    height: 160px;
  }
  .flip-card {
    min-height: 270px;
  }
  .admin-stats {
    grid-template-columns: 1fr;
  }
  .team-row {
    grid-template-columns: 1fr;
  }
  .team-row .score {
    width: 100%;
  }
}

@media (max-width: 380px) {
  .characters-grid {
    grid-template-columns: 1fr;
  }
}
</style>
