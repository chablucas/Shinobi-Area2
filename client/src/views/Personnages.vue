<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGameDataStore } from '../stores/gameData'
import { fetchTeamScores, resetTeamScore, saveCardStats, saveTeamScores, type TeamScoreEntry } from '../services/cardAdminApi'
import type { Card, CardModifier } from '../types/card'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const gameData = useGameDataStore()
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
const isAdmin = computed(
  () =>
    auth.user?.role === 'ADMIN' ||
    auth.user?.role === 'SUPER_ADMIN'
)

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

function optimizedCardImage(url: string | null | undefined): string {
  if (!url) return ''

  // Transformation uniquement pour les images Cloudinary
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) {
    return url
  }

  return url.replace(
    '/upload/',
    '/upload/f_auto,q_auto:eco,w_400,c_limit/'
  )
}

function teamCard(entry: TeamScoreEntry): Card | undefined {
  return cards.value.find((card) => card.slug === entry.slug)
}

onMounted(async () => {
  loading.value = true
  error.value = ''

  // 1. CARTES : toujours chargées, indépendamment de l'auth
  try {
    cards.value = await gameData.loadCards()
  } catch (exception) {
    error.value =
      exception instanceof Error
        ? exception.message
        : 'Cartes indisponibles.'
  } finally {
    loading.value = false
  }

  // 2. AUTH : uniquement pour savoir si les boutons ADMIN doivent apparaître
  try {
    await auth.loadCurrentUser()
  } catch (exception) {
    console.warn(
      'Utilisateur non authentifié : affichage public des cartes.',
      exception
    )
  }

  // 3. TEAM : indépendant des cartes classiques
  try {
    await loadTeamScores()
  } catch (exception) {
    teamError.value =
      exception instanceof Error
        ? exception.message
        : 'Notes Team indisponibles.'
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
    <section class="characters-content">
      <section class="cards-hero">

  <h1>CARTES</h1>

  <p class="cards-description">
    Explore les 163 cartes de Shinobi Area. Un même personnage peut exister
    en plusieurs versions, avec des statistiques, raretés, capacités et
    restrictions différentes.
  </p>
</section>

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
                      :src="optimizedCardImage(card.imageUrl)"
                      :alt="card.name"
                      loading="lazy"
                      decoding="async"
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
  <div class="team-header">
    <div>
      <p class="eyebrow">Team Combat</p>
      <h2>Notes Team</h2>
    </div>

    <p class="panel-hint">
      Note utilisée par Team Auction.
      Elle est indépendante des statistiques de Créer ton perso.
    </p>
  </div>

  <div
    v-if="teamError"
    class="state-message error"
  >
    {{ teamError }}
  </div>

  <div
    v-if="teamStatus"
    class="state-message"
  >
    {{ teamStatus }}
  </div>

  <input
    v-model="teamQuery"
    class="auth-input team-search"
    type="search"
    placeholder="Rechercher un personnage"
  />

  <p
    v-if="loading"
    class="state-message"
  >
    Chargement des personnages...
  </p>

  <div
    v-else-if="filteredTeamScores.length"
    class="team-cards-grid"
  >
    <article
      v-for="entry in filteredTeamScores"
      :key="entry.slug"
      class="team-card"
    >
      <div class="team-card-image">
        <img
          v-if="teamCard(entry)?.imageUrl"
          :src="optimizedCardImage(teamCard(entry)?.imageUrl)"
          :alt="entry.name"
          loading="lazy"
          decoding="async"
        />

        <span v-else>
          {{ entry.name.slice(0, 1) }}
        </span>
      </div>

      <div class="team-card-info">
        <strong class="team-card-name">
          {{ entry.name }}
        </strong>

        <div class="team-score-display">
          <span>NOTE TEAM</span>

          <strong>
            {{ entry.score }}
          </strong>
        </div>

        <!-- ADMIN UNIQUEMENT -->
        <div
          v-if="isAdmin"
          class="team-admin-controls"
        >
          <input
            v-model.number="teamEdits[entry.slug]"
            class="auth-input team-score-input"
            type="number"
            min="0"
            max="100"
            step="1"
          />

          <button
            type="button"
            :disabled="
              savingTeamSlug === entry.slug ||
              teamEdits[entry.slug] === entry.score
            "
            @click="saveTeamScore(entry)"
          >
            MODIFIER
          </button>

          <button
            v-if="entry.overridden"
            type="button"
            class="secondary"
            :disabled="savingTeamSlug === entry.slug"
            @click="restoreTeamScore(entry)"
          >
            RÉINITIALISER
          </button>
        </div>
      </div>
    </article>
  </div>

  <p
    v-else
    class="state-message"
  >
    Aucun personnage trouvé.
  </p>
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

<style scoped src="./Personnages.css"></style>