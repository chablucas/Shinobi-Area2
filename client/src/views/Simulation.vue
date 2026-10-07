<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { CATEGORY_DEFINITIONS, type CategorySlug, type PlayerBuild } from '../game/gameEngine'
import { fetchAllCards } from '../services/cardApi'
import { simulateFight } from '../services/gameApi'
import { appliedRuleSentence, appliedRuleTone } from '../services/combatRuleDisplay'
import type { Card } from '../types/card'
import type { CombatResult } from '../types/combat'

const cards = ref<Card[]>([])
const loading = ref(true)
const error = ref('')
const result = ref<CombatResult | null>(null)
const search = ref('')
const playerCount = ref<2 | 3>(2)
const activeSelection = ref<{ playerId: 1 | 2 | 3; category: CategorySlug } | null>(null)
const modalQuery = ref('')

function emptySlots(): Record<CategorySlug, Card | null> {
  return Object.fromEntries(CATEGORY_DEFINITIONS.map(([, slug]) => [slug, null])) as Record<CategorySlug, Card | null>
}

const buildOne = ref<PlayerBuild>({ playerId: 1, slots: emptySlots() })
const buildTwo = ref<PlayerBuild>({ playerId: 2, slots: emptySlots() })
const buildThree = ref<PlayerBuild>({ playerId: 3, slots: emptySlots() })

const selectedBuilds = computed(() => {
  if (playerCount.value === 3) return [buildOne.value, buildTwo.value, buildThree.value]
  return [buildOne.value, buildTwo.value]
})

const currentCandidates = computed(() => {
  const query = modalQuery.value.trim().toLowerCase()
  return cards.value.filter((card) => {
    const passesQuery = !query || card.name.toLowerCase().includes(query)
    return passesQuery
  })
})

const simulatorReady = computed(() => {
  return selectedBuilds.value.every((build) => CATEGORY_DEFINITIONS.every(([, slug]) => build.slots[slug]))
})

onMounted(async () => {
  try {
    cards.value = await fetchAllCards()
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'Impossible de charger les cartes.'
  } finally {
    loading.value = false
  }
})

function slotLabel(slug: CategorySlug) {
  return CATEGORY_DEFINITIONS.find(([, candidate]) => candidate === slug)?.[0] ?? slug
}

function openSelection(playerId: 1 | 2 | 3, category: CategorySlug) {
  activeSelection.value = { playerId, category }
  modalQuery.value = ''
}

function assignCard(card: Card) {
  if (!activeSelection.value) return
  const target = selectedBuilds.value.find((build) => build.playerId === activeSelection.value?.playerId)
  if (!target) return
  target.slots[activeSelection.value.category] = card
  activeSelection.value = null
  modalQuery.value = ''
}

function clearSlot(playerId: 1 | 2 | 3, category: CategorySlug) {
  const target = selectedBuilds.value.find((build) => build.playerId === playerId)
  if (!target) return
  target.slots[category] = null
}

function compositionFor(build: PlayerBuild) {
  return {
    slots: Object.fromEntries(
      CATEGORY_DEFINITIONS.map(([, slug]) => [slug, build.slots[slug]?.slug ?? '']),
    ),
  }
}

async function runSimulation() {
  if (!simulatorReady.value) return
  try {
    result.value = await simulateFight(compositionFor(buildOne.value), compositionFor(buildTwo.value), playerCount.value === 3 ? compositionFor(buildThree.value) : undefined)
    error.value = ''
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'La simulation a échoué.'
  }
}

function replay() {
  buildOne.value = { playerId: 1, slots: emptySlots() }
  buildTwo.value = { playerId: 2, slots: emptySlots() }
  buildThree.value = { playerId: 3, slots: emptySlots() }
  result.value = null
  error.value = ''
}
</script>

<template>
  <main class="simulation-page">
    <SocialHeader />
    <section class="page-shell">
      <header class="page-header">
        <div>
          <p class="eyebrow">Simulation</p>
          <h1>Arène de combat</h1>
        </div>
        <div class="mode-toggle" aria-label="Mode de simulation">
          <button type="button" :class="{ active: playerCount === 2 }" @click="playerCount = 2">1v1</button>
          <button type="button" :class="{ active: playerCount === 3 }" @click="playerCount = 3">1v1v1</button>
        </div>
      </header>

      <p v-if="loading" class="state-message">Chargement des cartes...</p>
      <p v-else-if="error" class="error-message">{{ error }}</p>

      <template v-else>
        <div class="builds-grid">
          <article v-for="build in selectedBuilds" :key="build.playerId" class="build-panel">
            <header class="build-header">
              <div>
                <p class="eyebrow">Joueur {{ build.playerId }}</p>
                <h2>{{ build.playerId === 1 ? 'Joueur 1' : build.playerId === 2 ? 'Joueur 2' : 'Joueur 3' }}</h2>
              </div>
              <span class="slot-counter">
                {{ CATEGORY_DEFINITIONS.filter(([, slug]) => build.slots[slug]).length }} / {{ CATEGORY_DEFINITIONS.length }}
              </span>
            </header>

            <div class="category-grid">
              <button
                v-for="[label, slug] in CATEGORY_DEFINITIONS"
                :key="`${build.playerId}-${slug}`"
                type="button"
                class="category-slot"
                :class="{ filled: !!build.slots[slug] }"
                @click="openSelection(build.playerId as 1 | 2 | 3, slug)"
              >
                <span class="slot-label">{{ label }}</span>
                <template v-if="build.slots[slug]">
                  <img v-if="build.slots[slug]?.imageUrl" :src="build.slots[slug]?.imageUrl ?? undefined" :alt="build.slots[slug]?.name" loading="lazy" />
                  <span v-else class="slot-fallback">{{ build.slots[slug]?.name.slice(0, 1) }}</span>
                  <strong>{{ build.slots[slug]?.name }}</strong>
                  <div class="slot-actions">
                    <span>Remplacer</span>
                    <span @click.stop="clearSlot(build.playerId as 1 | 2 | 3, slug)">Supprimer</span>
                  </div>
                </template>
                <template v-else>
                  <span class="slot-empty">Choisir une carte</span>
                </template>
              </button>
            </div>
          </article>
        </div>

        <div class="simulator-actions">
          <button type="button" class="primary-button" :disabled="!simulatorReady" @click="runSimulation">Simuler le combat</button>
          <button type="button" class="secondary-button" @click="replay">Réinitialiser</button>
        </div>

        <section v-if="result" class="result-panel">
          <p class="eyebrow">Résultat</p>
          <h2>{{ result.winner === 'draw' ? 'Égalité' : `Vainqueur : Joueur ${result.winner === 'player1' ? 1 : result.winner === 'player2' ? 2 : 3}` }}</h2>
          <div class="scoreboard">
            <article>
              <h3>Joueur 1</h3>
              <strong>{{ result.scores.player1 }} pt</strong>
              <span>{{ result.player1.validationErrors.length ? 'Erreurs de validation' : 'Score par catégorie' }}</span>
              <div v-if="result.player1.appliedRules.length" class="player-rules">
                <h4>BONUS / MALUS JOUEUR 1</h4>
                <p v-for="rule in result.player1.appliedRules" :key="`${rule.ruleId}-${rule.target}-${rule.after}`" :class="appliedRuleTone(rule)">
                  {{ appliedRuleSentence(rule) }}
                </p>
              </div>
            </article>
            <div class="versus">VS</div>
            <article>
              <h3>Joueur 2</h3>
              <strong>{{ result.scores.player2 }} pt</strong>
              <span>{{ result.player2.validationErrors.length ? 'Erreurs de validation' : 'Score par catégorie' }}</span>
              <div v-if="result.player2.appliedRules.length" class="player-rules">
                <h4>BONUS / MALUS JOUEUR 2</h4>
                <p v-for="rule in result.player2.appliedRules" :key="`${rule.ruleId}-${rule.target}-${rule.after}`" :class="appliedRuleTone(rule)">
                  {{ appliedRuleSentence(rule) }}
                </p>
              </div>
            </article>
            <article v-if="result.player3">
              <h3>Joueur 3</h3>
              <strong>{{ result.scores.player3 ?? 0 }} pt</strong>
              <span>{{ result.player3.validationErrors.length ? 'Erreurs de validation' : 'Score par catégorie' }}</span>
              <div v-if="result.player3.appliedRules.length" class="player-rules">
                <h4>BONUS / MALUS JOUEUR 3</h4>
                <p v-for="rule in result.player3.appliedRules" :key="`${rule.ruleId}-${rule.target}-${rule.after}`" :class="appliedRuleTone(rule)">
                  {{ appliedRuleSentence(rule) }}
                </p>
              </div>
            </article>
          </div>

          <div class="category-results">
            <h3>Résultats par catégorie</h3>
            <article v-for="category in result.categories" :key="category.category">
              <strong>{{ category.category }}</strong>
              <span>J1 : {{ category.player1.card }} · {{ category.player1.value }}</span>
              <span>J2 : {{ category.player2.card }} · {{ category.player2.value }}</span>
              <span v-if="category.player3">J3 : {{ category.player3.card }} · {{ category.player3.value }}</span>
              <b>{{ category.winner === 'draw' ? 'Égalité' : `Gagnant : Joueur ${category.winner === 'player1' ? 1 : category.winner === 'player2' ? 2 : 3}` }}</b>
            </article>
          </div>

        </section>
      </template>
    </section>

    <div v-if="activeSelection" class="selection-modal" role="dialog" aria-modal="true">
      <div class="selection-panel">
        <header>
          <div>
            <p class="eyebrow">Choisir une carte</p>
            <h3>Joueur {{ activeSelection.playerId }} · {{ slotLabel(activeSelection.category) }}</h3>
          </div>
          <button type="button" class="close-button" @click="activeSelection = null">Fermer</button>
        </header>

        <input v-model="modalQuery" class="search-input" type="search" placeholder="Rechercher une carte" />

        <div class="candidate-list">
          <button
            v-for="card in currentCandidates"
            :key="card.id"
            type="button"
            class="candidate-card"
            @click="assignCard(card)"
          >
            <img v-if="card.imageUrl" :src="card.imageUrl" :alt="card.name" />
            <span class="candidate-name">{{ card.name }}</span>
            <small>{{ card.effectiveRarity }}</small>
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped src="./Simulation.css"></style>