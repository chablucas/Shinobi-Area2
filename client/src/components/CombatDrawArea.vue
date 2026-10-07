<script setup lang="ts">
import { computed } from 'vue'
import type { Card } from '../types/card'

type DrawCardLike = Pick<
  Card,
  'name' | 'imageUrl' | 'clans' | 'traits'
> & {
  stats?: Record<string, number | null>
}

const props = withDefaults(
  defineProps<{
    card: DrawCardLike | null
    title?: string
    buttonLabel?: string
    buttonDisabled?: boolean
    showButton?: boolean
    stats?: Array<{
      label: string
      value: string | number
    }>
    bonuses?: Array<{
      label: string
      value: string
    }>
    emptyText?: string
    waitingText?: string
  }>(),
  {
    title: 'Carte piochée',
    buttonLabel: 'PIOCHER',
    buttonDisabled: false,
    showButton: false,
    stats: () => [],
    bonuses: () => [],
    emptyText: 'Aucune carte en main.',
    waitingText: 'EN ATTENTE',
  },
)

const emit = defineEmits<{
  draw: []
}>()

const statRows = computed(() => props.stats ?? [])
const bonusRows = computed(() => props.bonuses ?? [])
</script>

<template>
  <div class="combat-draw-area">
    <!-- CARTE PIOCHÉE -->
    <div class="draw-card-panel">
      <template v-if="card">
        <div class="draw-card-art">
          <img
            v-if="card.imageUrl"
            :src="card.imageUrl"
            :alt="card.name"
          />

          <span v-else>
            {{ card.name.slice(0, 1) }}
          </span>
        </div>

        <div class="draw-card-copy">
          <span class="eyebrow">
            {{ title }}
          </span>

          <strong>
            {{ card.name }}
          </strong>
        </div>
      </template>

      <template v-else>
        <div class="draw-card-placeholder">
          <span>{{ waitingText }}</span>
        </div>
      </template>
    </div>

    <div class="draw-info-column">
      <!-- STATS -->
      <div class="draw-stats-panel">
        <div class="panel-header">
          <span class="eyebrow">
            Stats
          </span>
        </div>

        <dl
          v-if="statRows.length"
          class="draw-stat-list"
        >
          <div
            v-for="stat in statRows"
            :key="stat.label"
            class="draw-stat-row"
          >
            <dt>
              {{ stat.label }}
            </dt>

            <dd>
              {{ stat.value }}
            </dd>
          </div>
        </dl>

        <p
          v-else
          class="muted-copy"
        >
          {{ emptyText }}
        </p>
      </div>

      <!-- BONUS -->
      <div class="draw-bonus-panel">
        <div class="panel-header">
          <span class="eyebrow">
            Bonus
          </span>
        </div>

        <ul
          v-if="bonusRows.length"
          class="draw-bonus-list"
        >
          <li
            v-for="bonus in bonusRows"
            :key="bonus.label"
          >
            <strong>
              {{ bonus.label }}
            </strong>

            <span>
              {{ bonus.value }}
            </span>
          </li>
        </ul>

        <p
          v-else
          class="muted-copy"
        >
          Aucun bonus utile
        </p>
      </div>

    </div>

    <!-- PIOCHER -->
    <button
      v-if="showButton"
      type="button"
      class="draw-button"
      :disabled="buttonDisabled"
      @click="emit('draw')"
    >
      {{ buttonLabel }}
    </button>
  </div>
</template>

<style scoped src="./CombatDrawArea.css"></style>