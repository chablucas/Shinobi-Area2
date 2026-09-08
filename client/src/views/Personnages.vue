<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import SocialHeader from '../components/SocialHeader.vue'
import { fetchAllCards } from '../services/cardApi'
import type { Card, CardModifier } from '../types/card'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const cards = ref<Card[]>([])
const query = ref('')
const rarity = ref('')
const sort = ref<'name' | 'rarity-asc' | 'rarity-desc'>('rarity-asc')
const flipped = ref(new Set<string>())
const error = ref('')
const loading = ref(true)
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
const statKeys = [
  'chakra',
  'invocation',
  'iq',
  'ninjutsuAttack',
  'ninjutsuDefense',
  'genjutsu',
  'taijutsu',
  'avatar',
  'body',
  'fuinjutsu',
  'senjutsu',
  'kenjutsu',
  'speed',
  'kekkeiGenkai',
]
const statLabels: Record<string, string> = {
  chakra: 'Chakra', invocation: 'Invocation', iq: 'IQ', genjutsu: 'Genjutsu', taijutsu: 'Taijutsu',
  avatar: 'Avatar', body: 'Body', fuinjutsu: 'Fûinjutsu', senjutsu: 'Senjutsu', kenjutsu: 'Kenjutsu',
  speed: 'Vitesse', kekkeiGenkai: 'Kekkei Genkai',
}
onMounted(async () => {
  try {
    cards.value = await fetchAllCards()
    await auth.loadCurrentUser()
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
    ...Object.entries(statLabels).map(([key, label]) => ({ label, value: card.effectiveStats[key as keyof Card['effectiveStats']] ?? 0 })),
    { label: 'Ninjutsu', value: `ATQ ${card.effectiveStats.ninjutsuAttack ?? 0} · DEF ${card.effectiveStats.ninjutsuDefense ?? 0}` },
    { label: 'Kekkei Mōra', value: kekkeiMora?.length ? kekkeiMora.join(' · ') : '—' },
  ]
}
async function openAdmin(card: Card) {
  if (!auth.token || auth.user?.role !== 'ADMIN') return
  await router.push(`/admin/cards/${encodeURIComponent(card.slug)}`)
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
      <h1>LES SHINOBIS</h1>
      <p class="characters-intro">
        Explore les 163 cartes de Shinobi Area. Un même personnage peut exister en plusieurs
        versions, avec des statistiques, raretés, capacités et restrictions différentes.
      </p>
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
        <button v-if="auth.user?.role === 'ADMIN'" type="button" class="edit-button" @click.stop="openAdmin(card)">MODIFIER</button>
        </div>
      </div>
      <p v-else class="state-message">Aucun shinobi ne correspond à ces critères.</p>
    </section>
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
}
.edit-button {
  margin-top: 12px;
}
.state-message {
  color: var(--accent-gold);
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
}

@media (max-width: 380px) {
  .characters-grid {
    grid-template-columns: 1fr;
  }
}
</style>
